const express = require('express');
const router  = express.Router();
const jwt     = require('jsonwebtoken');
const { pool } = require('../database');

// ── Super admin auth middleware ────────────────────────────────────────────
const superAuthCheck = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Super admin login required' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'super_admin') return res.status(403).json({ error: 'Access denied' });
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ── POST /login ───────────────────────────────────────────────────────────
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const SA_EMAIL    = process.env.SUPER_ADMIN_EMAIL    || 'admin@payos.com';
    const SA_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'PayOS@Master2025';

    // Generic error to prevent credential enumeration
    if (email !== SA_EMAIL || password !== SA_PASSWORD) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ role: 'super_admin', email }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, role: 'super_admin' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /clients — all registered companies ────────────────────────────────
router.get('/clients', superAuthCheck, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        a.id, a.company_name, a.email, a.plan, a.status,
        a.onboarding_completed, a.company_industry, a.company_size,
        a.last_active, a.created_at, a.trial_start_date, a.trial_end_date,
        COUNT(DISTINCT e.id)::int                                                    AS employee_count,
        COUNT(DISTINCT p.id)::int                                                    AS payslip_count,
        MAX(p.created_at)                                                            AS last_payslip,
        GREATEST(0, CEIL(EXTRACT(EPOCH FROM (a.trial_end_date - NOW())) / 86400))::int AS trial_days_remaining,
        (NOW() < a.trial_end_date)                                                   AS trial_active
      FROM admins a
      LEFT JOIN employees e ON e.admin_id = a.id
      LEFT JOIN payslips  p ON p.admin_id = a.id
      GROUP BY a.id
      ORDER BY a.created_at DESC
    `);

    const clients = result.rows.map(a => ({
      id:                   a.id,
      company_name:         a.company_name || '—',
      email:                a.email,
      plan:                 a.plan         || 'starter',
      status:               a.status       || 'active',
      onboarding_completed: a.onboarding_completed || false,
      company_industry:     a.company_industry     || '—',
      company_size:         a.company_size         || '—',
      employee_count:       a.employee_count,
      payslip_count:        a.payslip_count,
      last_active:          a.last_active,
      last_payslip:         a.last_payslip,
      created_at:           a.created_at,
      trial_start_date:     a.trial_start_date,
      trial_end_date:       a.trial_end_date,
      trial_days_remaining: a.trial_days_remaining,
      trial_active:         a.trial_active,
    }));

    res.json({ clients });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /clients/:id/stats — detailed stats for one client ─────────────────
router.get('/clients/:id/stats', superAuthCheck, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const adminResult = await pool.query('SELECT * FROM admins WHERE id = $1', [id]);
    if (!adminResult.rows.length) return res.status(404).json({ error: 'Client not found' });
    const admin = adminResult.rows[0];

    const [empResult, slipResult, monthlyResult] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS total FROM employees WHERE admin_id = $1', [id]),
      pool.query('SELECT COUNT(*)::int AS total, COALESCE(SUM(net_salary), 0)::numeric AS total_net FROM payslips WHERE admin_id = $1', [id]),
      pool.query(`
        SELECT year, month, COUNT(*)::int AS count
        FROM payslips WHERE admin_id = $1
        GROUP BY year, month
        ORDER BY year DESC, month DESC
        LIMIT 12
      `, [id]),
    ]);

    const monthlyCounts = {};
    monthlyResult.rows.forEach(r => {
      const key = `${r.year}-${String(r.month).padStart(2, '0')}`;
      monthlyCounts[key] = r.count;
    });

    const { password: _pw, ...safeAdmin } = admin;

    res.json({
      admin: {
        ...safeAdmin,
        company_name: admin.company_name || '—',
      },
      stats: {
        employee_count:         empResult.rows[0].total,
        payslip_count:          slipResult.rows[0].total,
        total_salary_disbursed: parseFloat(slipResult.rows[0].total_net) || 0,
        monthly_counts:         monthlyCounts,
      },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PUT /clients/:id/status — enable / disable / change plan ──────────────
router.put('/clients/:id/status', superAuthCheck, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, plan } = req.body;

    const check = await pool.query('SELECT id FROM admins WHERE id = $1', [id]);
    if (!check.rows.length) return res.status(404).json({ error: 'Client not found' });

    const fields = [];
    const values = [];
    let idx = 1;
    if (status) { fields.push(`status = $${idx++}`); values.push(status); }
    if (plan)   { fields.push(`plan   = $${idx++}`); values.push(plan);   }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

    values.push(id);
    await pool.query(`UPDATE admins SET ${fields.join(', ')} WHERE id = $${idx}`, values);
    res.json({ message: 'Client updated successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PUT /clients/:id/trial — extend / activate / expire trial ────────────
router.put('/clients/:id/trial', superAuthCheck, async (req, res) => {
  try {
    const id   = parseInt(req.params.id);
    const { action, days } = req.body;  // action: 'extend' | 'activate' | 'expire'

    const check = await pool.query('SELECT * FROM admins WHERE id = $1', [id]);
    if (!check.rows.length) return res.status(404).json({ error: 'Client not found' });
    const admin = check.rows[0];

    const now       = new Date();
    const extraDays = parseInt(days) || 30;
    let updates = {};

    if (action === 'extend') {
      const currentEnd = new Date(admin.trial_end_date || now);
      const base       = currentEnd > now ? currentEnd : now;
      updates.trial_end_date = new Date(base.getTime() + extraDays * 24 * 60 * 60 * 1000);
    } else if (action === 'activate') {
      updates.trial_start_date = now;
      updates.trial_end_date   = new Date(now.getTime() + extraDays * 24 * 60 * 60 * 1000);
      updates.trial_days       = extraDays;
    } else if (action === 'expire') {
      updates.trial_end_date = new Date(now.getTime() - 1000);
    } else {
      return res.status(400).json({ error: 'Invalid action. Use extend | activate | expire' });
    }

    const fields = Object.keys(updates).map((k, i) => `${k} = $${i + 1}`);
    const values = [...Object.values(updates), id];
    await pool.query(`UPDATE admins SET ${fields.join(', ')} WHERE id = $${fields.length + 1}`, values);

    res.json({ message: 'Trial updated successfully', updates });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /stats — platform-wide overview ───────────────────────────────────
router.get('/stats', superAuthCheck, async (req, res) => {
  try {
    const now   = new Date();
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();

    const [clients, employees, payslips, thisMonth, signups] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int                                                AS total,
          COUNT(*) FILTER (WHERE status = 'active')::int              AS active
        FROM admins
      `),
      pool.query('SELECT COUNT(*)::int AS total FROM employees'),
      pool.query(`
        SELECT
          COUNT(*)::int                            AS total,
          COALESCE(SUM(net_salary), 0)::numeric    AS total_disbursed
        FROM payslips
      `),
      pool.query(
        'SELECT COUNT(*)::int AS total FROM payslips WHERE month = $1 AND year = $2',
        [month, year]
      ),
      pool.query(`
        SELECT
          TO_CHAR(created_at, 'YYYY-MM') AS month_key,
          COUNT(*)::int                  AS count
        FROM admins
        WHERE created_at >= NOW() - INTERVAL '6 months'
        GROUP BY month_key
        ORDER BY month_key
      `),
    ]);

    const signupsByMonth = {};
    signups.rows.forEach(r => { signupsByMonth[r.month_key] = r.count; });

    res.json({
      total_clients:       clients.rows[0].total,
      active_clients:      clients.rows[0].active,
      total_employees:     employees.rows[0].total,
      total_payslips:      payslips.rows[0].total,
      payslips_this_month: thisMonth.rows[0].total,
      total_disbursed:     parseFloat(payslips.rows[0].total_disbursed) || 0,
      signups_by_month:    signupsByMonth,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
