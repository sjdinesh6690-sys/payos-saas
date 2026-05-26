// salary-revisions.js — Track every salary change per employee
const express   = require('express');
const router    = express.Router();
const { pool, auditLog } = require('../database');
const authCheck = require('../middleware/auth');

router.use(authCheck);

// ── GET salary revision history for an employee ───────────────────────────────
router.get('/:employee_id', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM salary_revisions
       WHERE admin_id = $1 AND employee_id = $2
       ORDER BY created_at DESC`,
      [req.admin_id, req.params.employee_id.toUpperCase()]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET all revisions (latest only, one per employee) ─────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (employee_id) *
       FROM salary_revisions
       WHERE admin_id = $1
       ORDER BY employee_id, created_at DESC`,
      [req.admin_id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST manually add a revision note ────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { employee_id, old_salary, new_salary, effective_date, reason } = req.body;
    if (!employee_id || !new_salary) return res.status(400).json({ error: 'employee_id and new_salary required' });

    const result = await pool.query(
      `INSERT INTO salary_revisions (admin_id, employee_id, old_salary, new_salary, effective_date, reason, changed_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'Admin')
       RETURNING *`,
      [req.admin_id, employee_id.toUpperCase(), old_salary || 0, new_salary, effective_date || null, reason || null]
    );
    await auditLog(req.admin_id, 'salary_revision_added', 'employees', null,
      { employee_id, old_salary, new_salary, reason }, req.ip);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
