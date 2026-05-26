// audit.js — Audit log retrieval routes
const express = require('express');
const router  = express.Router();
const { pool } = require('../database');
const authCheck = require('../middleware/auth');

router.use(authCheck);

// ── GET audit logs (admin only) ───────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { action, entity, limit = 200, offset = 0 } = req.query;
    let query = `SELECT * FROM audit_logs WHERE admin_id = $1`;
    const vals = [req.admin_id];
    let idx = 2;

    if (action) { query += ` AND action ILIKE $${idx++}`; vals.push(`%${action}%`); }
    if (entity) { query += ` AND entity = $${idx++}`;     vals.push(entity); }

    query += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`;
    vals.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, vals);

    // Count total
    let countQ = `SELECT COUNT(*) FROM audit_logs WHERE admin_id = $1`;
    const countV = [req.admin_id];
    let ci = 2;
    if (action) { countQ += ` AND action ILIKE $${ci++}`; countV.push(`%${action}%`); }
    if (entity) { countQ += ` AND entity = $${ci++}`;     countV.push(entity); }
    const countRes = await pool.query(countQ, countV);

    res.json({ logs: result.rows, total: parseInt(countRes.rows[0].count) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET distinct actions for filter dropdown ──────────────────────────────────
router.get('/actions', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT action FROM audit_logs WHERE admin_id = $1 ORDER BY action`,
      [req.admin_id]
    );
    res.json(result.rows.map(r => r.action));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
