// locations.js — Branch / Office location management for PayLeef
const express   = require('express');
const router    = express.Router();
const { pool }  = require('../database');
const authCheck = require('../middleware/auth');

router.use(authCheck);

// ── GET /api/locations ────────────────────────────────────────────────────────
// Returns all locations for the logged-in admin, with employee count per location
router.get('/', async (req, res) => {
  try {
    const adminId = req.admin_id;
    const result = await pool.query(
      `SELECT l.id, l.name, l.city, l.state, l.created_at,
              COUNT(e.id) FILTER (WHERE e.status = 'active' OR e.status IS NULL) AS employee_count
       FROM locations l
       LEFT JOIN employees e ON e.admin_id = l.admin_id AND e.location = l.name
       WHERE l.admin_id = $1
       GROUP BY l.id
       ORDER BY l.name ASC`,
      [adminId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /locations error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/locations ───────────────────────────────────────────────────────
// Body: { name, city, state }
router.post('/', async (req, res) => {
  try {
    const adminId = req.admin_id;
    const { name, city, state } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Location name is required' });
    }

    const result = await pool.query(
      `INSERT INTO locations (admin_id, name, city, state)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, city, state, created_at`,
      [adminId, name.trim(), (city || '').trim() || null, (state || '').trim() || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A location with this name already exists' });
    }
    console.error('POST /locations error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT /api/locations/:id ────────────────────────────────────────────────────
// Body: { name, city, state }
// Also updates location field on all employees who had the old name
router.put('/:id', async (req, res) => {
  try {
    const adminId = req.admin_id;
    const locId   = parseInt(req.params.id);
    const { name, city, state } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Location name is required' });
    }

    // Get old name first
    const oldRes = await pool.query(
      'SELECT name FROM locations WHERE id = $1 AND admin_id = $2',
      [locId, adminId]
    );
    if (!oldRes.rows.length) {
      return res.status(404).json({ error: 'Location not found' });
    }
    const oldName = oldRes.rows[0].name;

    // Update location record
    const result = await pool.query(
      `UPDATE locations SET name = $1, city = $2, state = $3
       WHERE id = $4 AND admin_id = $5
       RETURNING id, name, city, state`,
      [name.trim(), (city || '').trim() || null, (state || '').trim() || null, locId, adminId]
    );

    // Cascade rename to employees
    if (oldName !== name.trim()) {
      await pool.query(
        `UPDATE employees SET location = $1
         WHERE admin_id = $2 AND location = $3`,
        [name.trim(), adminId, oldName]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'A location with this name already exists' });
    }
    console.error('PUT /locations/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/locations/:id ─────────────────────────────────────────────────
// Removes the location; employees retain their location text but it's no longer
// in the dropdown (admin should reassign them)
router.delete('/:id', async (req, res) => {
  try {
    const adminId = req.admin_id;
    const locId   = parseInt(req.params.id);

    const result = await pool.query(
      'DELETE FROM locations WHERE id = $1 AND admin_id = $2 RETURNING id, name',
      [locId, adminId]
    );
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Location not found' });
    }
    res.json({ success: true, deleted: result.rows[0] });
  } catch (err) {
    console.error('DELETE /locations/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
