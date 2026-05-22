// leave-policy.js — Company leave policy configuration
// Manages CL / SL / EL entitlements per year and working days per month

const express   = require('express');
const router    = express.Router();
const { pool }  = require('../database');
const authCheck = require('../middleware/auth');

router.use(authCheck);

const DEFAULTS = {
  casual_leave_days:      12,
  sick_leave_days:        12,
  earned_leave_days:      15,
  working_days_per_month: 26,
  leave_year_start_month: 4,   // April — Indian financial year
};

// ── GET /api/leave-policy ────────────────────────────────────────────────────
// Returns policy for this admin (defaults if not yet configured)
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM leave_policies WHERE admin_id = $1',
      [req.admin_id]
    );
    res.json(rows.length ? rows[0] : { ...DEFAULTS, admin_id: req.admin_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/leave-policy ───────────────────────────────────────────────────
// Create or update leave policy
router.post('/', async (req, res) => {
  try {
    const {
      casual_leave_days      = DEFAULTS.casual_leave_days,
      sick_leave_days        = DEFAULTS.sick_leave_days,
      earned_leave_days      = DEFAULTS.earned_leave_days,
      working_days_per_month = DEFAULTS.working_days_per_month,
      leave_year_start_month = DEFAULTS.leave_year_start_month,
    } = req.body;

    await pool.query(
      `INSERT INTO leave_policies
         (admin_id, casual_leave_days, sick_leave_days, earned_leave_days,
          working_days_per_month, leave_year_start_month)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (admin_id) DO UPDATE SET
         casual_leave_days      = $2,
         sick_leave_days        = $3,
         earned_leave_days      = $4,
         working_days_per_month = $5,
         leave_year_start_month = $6,
         updated_at             = NOW()`,
      [req.admin_id, casual_leave_days, sick_leave_days, earned_leave_days,
       working_days_per_month, leave_year_start_month]
    );

    res.json({ success: true, message: 'Leave policy saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/leave-policy/balances ───────────────────────────────────────────
// Returns YTD leave balances for all employees for the current leave year
router.get('/balances', async (req, res) => {
  try {
    const { year } = req.query;
    const adminId  = req.admin_id;

    // Load policy
    const policyRes = await pool.query(
      'SELECT * FROM leave_policies WHERE admin_id = $1', [adminId]
    );
    const policy = policyRes.rows[0] || DEFAULTS;
    const startMonth = parseInt(policy.leave_year_start_month) || 4;

    // Determine the leave year range
    // If startMonth = 4 (April): FY 2025-26 = April 2025 → March 2026
    const targetYear = parseInt(year) || new Date().getFullYear();
    const now = new Date();
    const currentMonth = now.getMonth() + 1;

    // Which leave year are we in?
    const leaveYearStart = currentMonth >= startMonth ? now.getFullYear() : now.getFullYear() - 1;
    const leaveYearEnd   = leaveYearStart + 1;

    // Build month/year pairs for the leave year
    const pairs = [];
    let m = startMonth, y = leaveYearStart;
    for (let i = 0; i < 12; i++) {
      pairs.push({ month: m, year: y });
      m++;
      if (m > 12) { m = 1; y++; }
    }

    // Fetch all attendance in this leave year
    const yearMonths = pairs.map((_, i) => i);
    const placeholders = pairs.map((_, i) => `($${i * 2 + 2}, $${i * 2 + 3})`).join(',');
    const values = [adminId];
    pairs.forEach(p => { values.push(p.month); values.push(p.year); });

    const attRes = await pool.query(
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

    // Build balance map
    const balances = {};
    attRes.rows.forEach(r => {
      balances[r.employee_id] = {
        cl_used:    parseInt(r.cl_used) || 0,
        sl_used:    parseInt(r.sl_used) || 0,
        el_used:    parseInt(r.el_used) || 0,
        cl_balance: policy.casual_leave_days  - (parseInt(r.cl_used) || 0),
        sl_balance: policy.sick_leave_days    - (parseInt(r.sl_used) || 0),
        el_balance: policy.earned_leave_days  - (parseInt(r.el_used) || 0),
      };
    });

    res.json({
      policy,
      balances,
      leave_year: `${leaveYearStart}-${String(leaveYearEnd).slice(-2)}`,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
