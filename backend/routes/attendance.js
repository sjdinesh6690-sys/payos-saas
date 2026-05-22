// attendance.js — monthly attendance tracking per employee
const express   = require('express');
const router    = express.Router();
const { pool }  = require('../database');
const authCheck = require('../middleware/auth');

router.use(authCheck);

// GET /api/attendance?month=5&year=2026
// Returns attendance records for all employees for the given month
router.get('/', async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) return res.status(400).json({ error: 'month and year required' });

    // Get all active employees
    const empResult = await pool.query(
      `SELECT employee_id, employee_name, department, location
         FROM employees
        WHERE admin_id = $1 AND (status IS NULL OR status = 'active')
        ORDER BY employee_name`,
      [req.admin_id]
    );

    // Get existing attendance records for this month
    const attResult = await pool.query(
      `SELECT employee_id, working_days, present_days, lop_days, notes
         FROM attendance
        WHERE admin_id = $1 AND month = $2 AND year = $3`,
      [req.admin_id, parseInt(month), parseInt(year)]
    );

    // Map attendance by employee_id for fast lookup
    const attMap = {};
    attResult.rows.forEach(r => { attMap[r.employee_id] = r; });

    // Merge — if no record exists, default to full attendance
    const records = empResult.rows.map(emp => ({
      employee_id:   emp.employee_id,
      employee_name: emp.employee_name,
      department:    emp.department || '',
      location:      emp.location   || '',
      working_days:  attMap[emp.employee_id]?.working_days ?? 26,
      present_days:  attMap[emp.employee_id]?.present_days ?? 26,
      lop_days:      attMap[emp.employee_id]?.lop_days     ?? 0,
      notes:         attMap[emp.employee_id]?.notes        || '',
      saved:         !!attMap[emp.employee_id],
    }));

    res.json({ records, month: parseInt(month), year: parseInt(year) });
  } catch (err) {
    console.error('[attendance/get]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/attendance — bulk save attendance for a month
// Body: { month, year, records: [{ employee_id, working_days, present_days, lop_days, notes }] }
router.post('/', async (req, res) => {
  try {
    const { month, year, records } = req.body;
    if (!month || !year || !Array.isArray(records)) {
      return res.status(400).json({ error: 'month, year and records[] required' });
    }

    let saved = 0;
    for (const r of records) {
      const { employee_id, working_days = 26, present_days, lop_days = 0, notes = '' } = r;
      if (!employee_id) continue;

      // Calculate lop_days from present_days if not explicitly set
      const wd  = parseInt(working_days)  || 26;
      const pd  = parseInt(present_days)  ?? wd;
      const lop = parseInt(lop_days)      || Math.max(0, wd - pd);

      await pool.query(
        `INSERT INTO attendance (admin_id, employee_id, month, year, working_days, present_days, lop_days, notes, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
         ON CONFLICT (admin_id, employee_id, month, year)
         DO UPDATE SET working_days = $5, present_days = $6, lop_days = $7, notes = $8, updated_at = NOW()`,
        [req.admin_id, employee_id, parseInt(month), parseInt(year), wd, pd, lop, notes.slice(0, 255)]
      );
      saved++;
    }

    res.json({ message: `Attendance saved for ${saved} employees`, saved });
  } catch (err) {
    console.error('[attendance/post]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attendance/for-employee/:employee_id — get attendance for one employee (last 12 months)
router.get('/for-employee/:employee_id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT month, year, working_days, present_days, lop_days
         FROM attendance
        WHERE admin_id = $1 AND employee_id = $2
        ORDER BY year DESC, month DESC
        LIMIT 12`,
      [req.admin_id, req.params.employee_id]
    );
    res.json({ records: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attendance/month-summary?month=5&year=2026 — quick summary for send page
router.get('/month-summary', async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) return res.status(400).json({ records: [] });

    const result = await pool.query(
      `SELECT employee_id, working_days, present_days, lop_days
         FROM attendance
        WHERE admin_id = $1 AND month = $2 AND year = $3`,
      [req.admin_id, parseInt(month), parseInt(year)]
    );

    // Return as a map for easy lookup
    const map = {};
    result.rows.forEach(r => { map[r.employee_id] = r; });
    res.json({ attendance: map, count: result.rows.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
