const express    = require('express');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const router     = express.Router();
const { pool, auditLog } = require('../database');

// ── ADMIN SIGNUP ──────────────────────────────────────────────────────────────
router.post('/admin-signup', async (req, res) => {
  try {
    const { email, password, company_name } = req.body;
    if (!email || !password || !company_name)
      return res.status(400).json({ error: 'All fields required' });

    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const existing = await pool.query('SELECT id FROM admins WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0)
      return res.status(400).json({ error: 'An account with this email already exists' });

    const hash = await bcrypt.hash(password, 12);
    const now  = new Date();
    const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const result = await pool.query(`
      INSERT INTO admins
        (email, password, company_name, onboarding_completed, plan, status,
         company_industry, company_size, last_active, trial_start_date, trial_end_date, trial_days, created_at)
      VALUES ($1,$2,$3,false,'starter','active','','',$4,$5,$6,30,$7)
      RETURNING id, email, company_name, onboarding_completed
    `, [email.toLowerCase(), hash, company_name, now, now, trialEnd, now]);

    const admin = result.rows[0];
    const token = jwt.sign(
      { admin_id: admin.id, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    await auditLog(admin.id, 'admin_signup', 'admins', admin.id, { company_name }, req.ip);
    res.json({ token, message: 'Account created!', onboarding_completed: false });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ── ADMIN LOGIN ───────────────────────────────────────────────────────────────
router.post('/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });

    const result = await pool.query('SELECT * FROM admins WHERE email = $1', [email.toLowerCase()]);
    const admin  = result.rows[0];

    // Generic error — prevents account enumeration
    if (!admin) return res.status(401).json({ error: 'Invalid email or password' });
    if (admin.status === 'disabled') return res.status(403).json({ error: 'Account disabled. Contact support.' });

    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.status(401).json({ error: 'Invalid email or password' });

    // Update last_active
    await pool.query('UPDATE admins SET last_active = NOW() WHERE id = $1', [admin.id]);

    const token = jwt.sign(
      { admin_id: admin.id, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    await auditLog(admin.id, 'admin_login', 'admins', admin.id, null, req.ip);
    res.json({
      token,
      role: 'employer',
      company_name:         admin.company_name,
      employee_name:        admin.company_name,
      onboarding_completed: admin.onboarding_completed || false,
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ── EMPLOYEE LOGIN — now requires password ────────────────────────────────────
router.post('/employee-login', async (req, res) => {
  try {
    const { employee_id, email, password } = req.body;
    if (!employee_id || !email || !password)
      return res.status(400).json({ error: 'Employee ID, email and password required' });

    const result = await pool.query(
      'SELECT * FROM employees WHERE UPPER(employee_id) = $1 AND LOWER(email) = $2',
      [employee_id.toUpperCase(), email.toLowerCase()]
    );
    const employee = result.rows[0];

    // Generic error to prevent enumeration
    if (!employee) return res.status(401).json({ error: 'Invalid credentials' });

    // If no password set yet, use employee_id as default (backwards compatibility)
    const storedPassword = employee.password || employee.employee_id;
    const match = employee.password
      ? await bcrypt.compare(password, employee.password)
      : password === employee.employee_id; // Default: password = employee_id

    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { employee_id: employee.id, admin_id: employee.admin_id },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    await auditLog(employee.admin_id, 'employee_login', 'employees', employee.id, null, req.ip);
    res.json({ token, role: 'employee', employee_name: employee.employee_name });
  } catch (err) {
    console.error('Employee login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

module.exports = router;
