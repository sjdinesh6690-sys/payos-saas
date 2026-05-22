// attendance.js — monthly attendance tracking per employee
// Supports CL / SL / EL leave types with automatic LOP calculation
const express   = require('express');
const router    = express.Router();
const { pool }  = require('../database');
const authCheck = require('../middleware/auth');

router.use(authCheck);

// Helper: get leave policy for admin (returns defaults if none set)
async function getLeavePolicy(adminId) {
  const { rows } = await pool.query(
    'SELECT * FROM leave_policies WHERE admin_id = $1', [adminId]
  );
  return rows[0] || {
    casual_leave_days: 12, sick_leave_days: 12, earned_leave_days: 15,
    working_days_per_month: 26, leave_year_start_month: 4,
  };
}

// Helper: get YTD leave usage for all employees (before the given month)
async function getYtdUsage(adminId, month, year, leaveYearStartMonth) {
  // Build the leave year month range UP TO (but not including) the current month
  const pairs = [];
  let m = leaveYearStartMonth;
  const startYear = (month >= leaveYearStartMonth) ? year : year - 1;
  let y = startYear;

  for (let i = 0; i < 12; i++) {
    // Stop when we reach the current month
    if (y === parseInt(year) && m === parseInt(month)) break;
    if (y > parseInt(year)) break;
    pairs.push({ month: m, year: y });
    m++;
    if (m > 12) { m = 1; y++; }
  }

  if (pairs.length === 0) return {};

  const values = [adminId];
  const placeholders = pairs.map((_, i) => `($${i * 2 + 2}, $${i * 2 + 3})`).join(',');
  pairs.forEach(p => { values.push(p.month); values.push(p.year); });

  const { rows } = await pool.query(
    `SELECT employee_id,
            SUM(COALESCE(casual_leave, 0)) AS cl_used,
            SUM(COALESCE(sick_leave,   0)) AS sl_used,
            SUM(COALESCE(earned_leave, 0)) AS el_used
     FROM attendance
     WHERE admin_id = $1
       AND (month, year) IN (${placeholders})
     GROUP BY employee_id`,
    values
  );

  const map = {};
  rows.forEach(r => {
    map[r.employee_id] = {
      cl_used: parseInt(r.cl_used) || 0,
      sl_used: parseInt(r.sl_used) || 0,
      el_used: parseInt(r.el_used) || 0,
    };
  });
  return map;
}

// ── GET /api/attendance?month=5&year=2026 ────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) return res.status(400).json({ error: 'month and year required' });

    const policy = await getLeavePolicy(req.admin_id);
    const ytd    = await getYtdUsage(req.admin_id, month, year, policy.leave_year_start_month);

    // All active employees
    const empResult = await pool.query(
      `SELECT employee_id, employee_name, department, location
       FROM employees
       WHERE admin_id = $1 AND (status IS NULL OR status = 'active')
       ORDER BY employee_name`,
      [req.admin_id]
    );

    // Existing attendance records for this month
    const attResult = await pool.query(
      `SELECT employee_id, working_days, present_days, lop_days,
              COALESCE(casual_leave, 0) AS casual_leave,
              COALESCE(sick_leave,   0) AS sick_leave,
              COALESCE(earned_leave, 0) AS earned_leave,
              notes
       FROM attendance
       WHERE admin_id = $1 AND month = $2 AND year = $3`,
      [req.admin_id, parseInt(month), parseInt(year)]
    );

    const attMap = {};
    attResult.rows.forEach(r => { attMap[r.employee_id] = r; });

    const defaultWD = policy.working_days_per_month || 26;

    const records = empResult.rows.map(emp => {
      const att     = attMap[emp.employee_id];
      const ytdEmp  = ytd[emp.employee_id] || { cl_used: 0, sl_used: 0, el_used: 0 };

      // This month's leave usage (already saved or default 0)
      const cl_this = att ? parseInt(att.casual_leave) || 0 : 0;
      const sl_this = att ? parseInt(att.sick_leave)   || 0 : 0;
      const el_this = att ? parseInt(att.earned_leave) || 0 : 0;

      // Remaining balance AFTER this month's usage
      const cl_balance = policy.casual_leave_days  - ytdEmp.cl_used - cl_this;
      const sl_balance = policy.sick_leave_days    - ytdEmp.sl_used - sl_this;
      const el_balance = policy.earned_leave_days  - ytdEmp.el_used - el_this;

      const wd  = att ? parseInt(att.working_days) || defaultWD : defaultWD;
      const pd  = att ? parseInt(att.present_days) ?? wd : wd;
      const lop = att ? parseInt(att.lop_days) || 0 : 0;

      return {
        employee_id:    emp.employee_id,
        employee_name:  emp.employee_name,
        department:     emp.department || '',
        location:       emp.location   || '',
        working_days:   wd,
        present_days:   pd,
        casual_leave:   cl_this,
        sick_leave:     sl_this,
        earned_leave:   el_this,
        lop_days:       lop,
        notes:          att?.notes || '',
        saved:          !!att,
        // YTD balances (before this month — for reference)
        cl_used_ytd:    ytdEmp.cl_used,
        sl_used_ytd:    ytdEmp.sl_used,
        el_used_ytd:    ytdEmp.el_used,
        // Remaining after this month
        cl_balance,
        sl_balance,
        el_balance,
      };
    });

    res.json({
      records,
      month:  parseInt(month),
      year:   parseInt(year),
      policy,
    });
  } catch (err) {
    console.error('[attendance/get]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/attendance — bulk save ─────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { month, year, records } = req.body;
    if (!month || !year || !Array.isArray(records)) {
      return res.status(400).json({ error: 'month, year and records[] required' });
    }

    let saved = 0;
    for (const r of records) {
      const {
        employee_id,
        working_days = 26,
        present_days,
        casual_leave  = 0,
        sick_leave    = 0,
        earned_leave  = 0,
        lop_days,
        notes = '',
      } = r;
      if (!employee_id) continue;

      const wd  = parseInt(working_days)  || 26;
      const pd  = parseInt(present_days)  ?? wd;
      const cl  = Math.max(0, parseInt(casual_leave)  || 0);
      const sl  = Math.max(0, parseInt(sick_leave)    || 0);
      const el  = Math.max(0, parseInt(earned_leave)  || 0);

      // LOP = absent days minus paid leaves, minimum 0
      const absent  = Math.max(0, wd - pd);
      const leavesUsed = cl + sl + el;
      const lop = lop_days !== undefined
        ? Math.max(0, parseInt(lop_days) || 0)
        : Math.max(0, absent - leavesUsed);

      await pool.query(
        `INSERT INTO attendance
           (admin_id, employee_id, month, year, working_days, present_days,
            casual_leave, sick_leave, earned_leave, lop_days, notes, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
         ON CONFLICT (admin_id, employee_id, month, year) DO UPDATE SET
           working_days  = $5,
           present_days  = $6,
           casual_leave  = $7,
           sick_leave    = $8,
           earned_leave  = $9,
           lop_days      = $10,
           notes         = $11,
           updated_at    = NOW()`,
        [req.admin_id, employee_id, parseInt(month), parseInt(year),
         wd, pd, cl, sl, el, lop, notes.slice(0, 255)]
      );
      saved++;
    }

    res.json({ message: `Attendance saved for ${saved} employees`, saved });
  } catch (err) {
    console.error('[attendance/post]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/attendance/parse-csv — parse CSV and return preview ─────────────
// Accepts CSV text in body: { csv: "...", month, year, working_days }
// Supports two formats:
//   Format A: Employee ID, Present Days, Leave Days, Notes
//   Format B: Employee ID, Present Days, CL, SL, EL, Notes
router.post('/parse-csv', async (req, res) => {
  try {
    const { csv, month, year, working_days = 26 } = req.body;
    if (!csv || !month || !year) return res.status(400).json({ error: 'csv, month and year required' });

    const wd = parseInt(working_days) || 26;

    // Simple CSV parser — handles quoted fields
    function parseCSV(text) {
      const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
      return lines.map(line => {
        const cols = [];
        let cur = '', inQ = false;
        for (const ch of line) {
          if (ch === '"') { inQ = !inQ; }
          else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
          else { cur += ch; }
        }
        cols.push(cur.trim());
        return cols;
      }).filter(r => r.some(c => c !== ''));
    }

    const rows = parseCSV(csv);
    if (rows.length < 2) return res.status(400).json({ error: 'CSV must have a header row and at least one data row' });

    // Detect format from header
    const header = rows[0].map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
    const isFormatB = header.some(h => h === 'cl' || h === 'sl' || h === 'el' || h.includes('casual') || h.includes('sick') || h.includes('earned'));
    const data = rows.slice(1);

    // Load all employees for this admin to match Employee IDs
    const empResult = await pool.query(
      `SELECT employee_id, employee_name, department, location
       FROM employees WHERE admin_id = $1 AND (status IS NULL OR status = 'active')`,
      [req.admin_id]
    );
    const empMap = {};
    empResult.rows.forEach(e => { empMap[e.employee_id.toUpperCase()] = e; });

    const matched   = [];
    const unmatched = [];

    for (const row of data) {
      if (!row[0]) continue;
      const rawId = row[0].trim();
      const emp   = empMap[rawId.toUpperCase()];

      let pd, cl, sl, el, notes;
      if (isFormatB) {
        pd    = parseInt(row[1]) ?? wd;
        cl    = Math.max(0, parseInt(row[2]) || 0);
        sl    = Math.max(0, parseInt(row[3]) || 0);
        el    = Math.max(0, parseInt(row[4]) || 0);
        notes = (row[5] || '').slice(0, 255);
      } else {
        pd    = parseInt(row[1]) ?? wd;
        cl    = Math.max(0, parseInt(row[2]) || 0);
        sl    = 0;
        el    = 0;
        notes = (row[3] || '').slice(0, 255);
      }

      // Validate
      if (isNaN(pd) || pd < 0) pd = wd;
      if (pd > wd) pd = wd;

      const absent  = Math.max(0, wd - pd);
      const leaves  = cl + sl + el;
      const lop     = Math.max(0, absent - leaves);

      const record = {
        employee_id:   rawId,
        present_days:  pd,
        casual_leave:  cl,
        sick_leave:    sl,
        earned_leave:  el,
        lop_days:      lop,
        working_days:  wd,
        notes,
      };

      if (emp) {
        matched.push({ ...record, employee_name: emp.employee_name, department: emp.department || '', location: emp.location || '', found: true });
      } else {
        unmatched.push({ ...record, employee_name: 'Unknown', found: false });
      }
    }

    // Also list employees NOT in CSV (will default to full attendance)
    const csvIds = new Set([...matched, ...unmatched].map(r => r.employee_id.toUpperCase()));
    const notInCsv = empResult.rows
      .filter(e => !csvIds.has(e.employee_id.toUpperCase()))
      .map(e => ({
        employee_id:   e.employee_id,
        employee_name: e.employee_name,
        department:    e.department || '',
        location:      e.location   || '',
        present_days:  wd,
        casual_leave:  0,
        sick_leave:    0,
        earned_leave:  0,
        lop_days:      0,
        working_days:  wd,
        notes:         '',
        found:         true,
        not_in_csv:    true,
      }));

    res.json({
      matched,
      unmatched,
      not_in_csv:   notInCsv,
      total_employees: empResult.rows.length,
      matched_count:   matched.length,
      working_days:    wd,
      month: parseInt(month),
      year:  parseInt(year),
    });
  } catch (err) {
    console.error('[attendance/parse-csv]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/attendance/template-csv — download blank CSV template ────────────
router.get('/template-csv', async (req, res) => {
  try {
    const empResult = await pool.query(
      `SELECT employee_id, employee_name, department FROM employees
       WHERE admin_id = $1 AND (status IS NULL OR status = 'active')
       ORDER BY employee_name`,
      [req.admin_id]
    );

    let csv = 'Employee ID,Employee Name,Present Days,Leave Days,Notes\n';
    empResult.rows.forEach(e => {
      csv += `${e.employee_id},"${e.employee_name}",26,0,\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="PayLeef_Attendance_Template.csv"');
    res.send(csv);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /api/attendance/for-employee/:id ─────────────────────────────────────
router.get('/for-employee/:employee_id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT month, year, working_days, present_days,
              COALESCE(casual_leave,0) AS casual_leave,
              COALESCE(sick_leave,0)   AS sick_leave,
              COALESCE(earned_leave,0) AS earned_leave,
              lop_days
       FROM attendance
       WHERE admin_id = $1 AND employee_id = $2
       ORDER BY year DESC, month DESC LIMIT 12`,
      [req.admin_id, req.params.employee_id]
    );
    res.json({ records: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/attendance/month-summary ────────────────────────────────────────
router.get('/month-summary', async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) return res.status(400).json({ records: [] });

    const result = await pool.query(
      `SELECT employee_id, working_days, present_days, lop_days,
              COALESCE(casual_leave,0) AS casual_leave,
              COALESCE(sick_leave,0)   AS sick_leave,
              COALESCE(earned_leave,0) AS earned_leave
       FROM attendance
       WHERE admin_id = $1 AND month = $2 AND year = $3`,
      [req.admin_id, parseInt(month), parseInt(year)]
    );

    const map = {};
    result.rows.forEach(r => { map[r.employee_id] = r; });
    res.json({ attendance: map, count: result.rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
