// users.js — Sub-user management for PayLeef
// Admin can add staff members with specific module permissions
const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const router   = express.Router();
const { pool } = require('../database');
const authCheck = require('../middleware/auth');

// All routes except /login require admin auth
router.use((req, res, next) => {
  if (req.path === '/login') return next();
  authCheck(req, res, next);
});

// ── GET /api/users — list all sub-users ──────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, permissions, status, created_at
       FROM admin_users WHERE admin_id = $1 ORDER BY name ASC`,
      [req.admin_id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/users — create sub-user ────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { name, email, password, role = 'staff', permissions = {} } = req.body;

    if (!name || !name.trim())
      return res.status(400).json({ error: 'Name is required' });
    if (!email || !email.trim())
      return res.status(400).json({ error: 'Email is required' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return res.status(400).json({ error: 'Invalid email format' });
    if (!password || password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    // Check duplicate email in admin_users (scoped to this admin)
    const exists = await pool.query(
      'SELECT id FROM admin_users WHERE admin_id = $1 AND email = $2',
      [req.admin_id, email.trim().toLowerCase()]
    );
    if (exists.rows.length > 0)
      return res.status(409).json({ error: 'A user with this email already exists' });

    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO admin_users (admin_id, name, email, password, role, permissions)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, email, role, permissions, status, created_at`,
      [req.admin_id, name.trim(), email.trim().toLowerCase(), hashed, role, JSON.stringify(permissions)]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PUT /api/users/:id — update sub-user ─────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, permissions, status } = req.body;

    // Verify ownership
    const check = await pool.query(
      'SELECT id FROM admin_users WHERE id = $1 AND admin_id = $2',
      [id, req.admin_id]
    );
    if (!check.rows.length) return res.status(404).json({ error: 'User not found' });

    const fields = [], values = [];
    let idx = 1;

    if (name        !== undefined) { fields.push(`name = $${idx++}`);        values.push(name.trim()); }
    if (email       !== undefined) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
        return res.status(400).json({ error: 'Invalid email format' });
      fields.push(`email = $${idx++}`); values.push(email.trim().toLowerCase());
    }
    if (role        !== undefined) { fields.push(`role = $${idx++}`);        values.push(role); }
    if (permissions !== undefined) { fields.push(`permissions = $${idx++}`); values.push(JSON.stringify(permissions)); }
    if (status      !== undefined) { fields.push(`status = $${idx++}`);      values.push(status); }
    if (password    !== undefined && password) {
      if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
      const hashed = await bcrypt.hash(password, 10);
      fields.push(`password = $${idx++}`); values.push(hashed);
    }

    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });
    values.push(id);

    await pool.query(
      `UPDATE admin_users SET ${fields.join(', ')} WHERE id = $${idx}`,
      values
    );
    const updated = await pool.query(
      'SELECT id, name, email, role, permissions, status, created_at FROM admin_users WHERE id = $1',
      [id]
    );
    res.json(updated.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE /api/users/:id — remove sub-user ───────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'DELETE FROM admin_users WHERE id = $1 AND admin_id = $2 RETURNING id, name',
      [id, req.admin_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, deleted: result.rows[0] });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /api/users/login — sub-user login ────────────────────────────────────
// This is also called from the main /api/auth/login endpoint
// But exposing it here for direct access
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    // Find sub-user by email (across all admin accounts)
    const result = await pool.query(
      `SELECT u.*, a.company_name, a.id AS admin_id
       FROM admin_users u
       JOIN admins a ON a.id = u.admin_id
       WHERE u.email = $1 AND u.status = 'active'`,
      [email.trim().toLowerCase()]
    );
    if (!result.rows.length)
      return res.status(401).json({ error: 'Invalid email or password' });

    const user = result.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ error: 'Invalid email or password' });

    const token = jwt.sign(
      {
        admin_id:    user.admin_id,
        sub_user_id: user.id,
        role:        user.role,
        name:        user.name,
        email:       user.email,
        permissions: user.permissions || {},
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      role:         user.role,
      name:         user.name,
      email:        user.email,
      company_name: user.company_name,
      permissions:  user.permissions || {},
      is_sub_user:  true,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
