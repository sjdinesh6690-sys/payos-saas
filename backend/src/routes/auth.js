const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { db }  = require('../config/db');
const router  = express.Router();

// POST /api/auth/login  (employer uses email, employee uses employee_id)
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) return res.status(400).json({ error: 'Identifier and password required.' });

    const user = await db.users.findOne(u =>
      u.email === identifier || u.employee_id === identifier
    );
    if (!user) return res.status(401).json({ error: 'Invalid credentials.' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials.' });

    const token = jwt.sign(
      { id: user.id, role: user.role, employee_id: user.employee_id },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );
    res.json({ token, role: user.role });
  } catch (err) {
    res.status(500).json({ error: 'Login failed.' });
  }
});

// POST /api/auth/setup-admin  — run once to create the admin account
router.post('/setup-admin', async (req, res) => {
  try {
    const { email, password, secret } = req.body;
    if (secret !== process.env.JWT_SECRET) return res.status(403).json({ error: 'Wrong secret.' });
    const existing = await db.users.findOne(u => u.role === 'employer');
    if (existing) return res.status(409).json({ error: 'Admin already exists.' });
    const hash = await bcrypt.hash(password, 10);
    await db.users.insert({ email, employee_id: null, role: 'employer', password_hash: hash });
    res.json({ success: true, message: 'Admin account created.' });
  } catch (err) {
    res.status(500).json({ error: 'Setup failed.' });
  }
});

// POST /api/auth/create-employee-account  — employee sets their own password
router.post('/create-employee-account', async (req, res) => {
  try {
    const { employee_id, password } = req.body;
    if (!employee_id || !password) return res.status(400).json({ error: 'Employee ID and password required.' });

    const emp = await db.employees.findOne(e => e.employee_id === employee_id.toUpperCase());
    if (!emp) return res.status(404).json({ error: 'Employee not found.' });

    const hash = await bcrypt.hash(password, 10);
    const existingUser = emp.user_id
      ? await db.users.findOne(u => u.id === emp.user_id)
      : null;

    if (existingUser) {
      await db.users.update(u => u.id === existingUser.id, { password_hash: hash });
    } else {
      const newUser = await db.users.insert({
        email: null,
        employee_id: emp.employee_id,
        role: 'employee',
        password_hash: hash,
      });
      await db.employees.update(e => e.employee_id === emp.employee_id, { user_id: newUser.id });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Account creation failed.' });
  }
});

module.exports = router;
