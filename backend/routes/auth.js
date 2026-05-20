const express    = require('express');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const crypto     = require('crypto');
const nodemailer = require('nodemailer');
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

// ── FORGOT PASSWORD ───────────────────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const result = await pool.query(
      'SELECT id, email, company_name, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from FROM admins WHERE email = $1',
      [email.toLowerCase()]
    );
    const admin = result.rows[0];

    // Always return success to prevent account enumeration
    if (!admin) {
      return res.json({ message: 'If this email exists, a reset link has been sent.' });
    }

    // Generate a secure token (hex, 64 chars)
    const token   = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      'UPDATE admins SET reset_token = $1, reset_token_expires = $2 WHERE id = $3',
      [token, expires, admin.id]
    );

    // Build reset URL — use APP_URL env var if set, else derive from request
    const appUrl  = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    // Send email using admin's own SMTP if configured, else fallback to system SMTP
    const smtpHost = admin.smtp_host || process.env.SMTP_HOST;
    const smtpPort = parseInt(admin.smtp_port || process.env.SMTP_PORT || 587);
    const smtpUser = admin.smtp_user || process.env.SMTP_USER;
    const smtpPass = admin.smtp_pass || process.env.SMTP_PASS;
    const smtpFrom = admin.smtp_from || smtpUser;

    if (!smtpHost || !smtpUser || !smtpPass) {
      // No SMTP configured — still succeed but log the token for dev
      console.log(`[forgot-password] No SMTP configured. Reset URL: ${resetUrl}`);
      return res.json({ message: 'If this email exists, a reset link has been sent.' });
    }

    const transporter = nodemailer.createTransporter({
      host:               smtpHost,
      port:               smtpPort,
      secure:             smtpPort === 465,
      requireTLS:         smtpPort !== 465,
      auth:               { user: smtpUser, pass: smtpPass.replace(/\s/g, '') },
      tls:                { rejectUnauthorized: false },
      connectionTimeout:  10000,
    });

    await transporter.sendMail({
      from:    `"PayOS" <${smtpFrom}>`,
      to:      admin.email,
      subject: 'Reset your PayOS password',
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f9fafb; border-radius: 12px;">
          <h2 style="color: #0f172a; margin-bottom: 8px;">Reset your password</h2>
          <p style="color: #475569; margin-bottom: 24px;">
            Hi${admin.company_name ? ' ' + admin.company_name : ''},<br/>
            We received a request to reset your PayOS password. Click the button below to set a new password.
          </p>
          <a href="${resetUrl}" style="display:inline-block;background:#ea580c;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">
            Reset Password
          </a>
          <p style="color:#94a3b8;font-size:13px;margin-top:24px;">
            This link expires in <strong>1 hour</strong>. If you did not request this, you can safely ignore this email.
          </p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
          <p style="color:#94a3b8;font-size:12px;">Or copy this link: <a href="${resetUrl}" style="color:#ea580c;">${resetUrl}</a></p>
        </div>
      `,
    });

    await auditLog(admin.id, 'forgot_password', 'admins', admin.id, { email: admin.email }, req.ip);
    res.json({ message: 'If this email exists, a reset link has been sent.' });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process request. Please try again.' });
  }
});

// ── RESET PASSWORD ────────────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password)
      return res.status(400).json({ error: 'Token and new password are required' });

    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const result = await pool.query(
      'SELECT id, email FROM admins WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [token]
    );
    const admin = result.rows[0];

    if (!admin)
      return res.status(400).json({ error: 'This reset link is invalid or has expired. Please request a new one.' });

    const hash = await bcrypt.hash(password, 12);

    // Update password and clear the token
    await pool.query(
      'UPDATE admins SET password = $1, reset_token = NULL, reset_token_expires = NULL WHERE id = $2',
      [hash, admin.id]
    );

    await auditLog(admin.id, 'password_reset', 'admins', admin.id, null, req.ip);
    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password. Please try again.' });
  }
});

// ── VERIFY RESET TOKEN ────────────────────────────────────────────────────────
router.get('/verify-reset-token', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ valid: false });

    const result = await pool.query(
      'SELECT id FROM admins WHERE reset_token = $1 AND reset_token_expires > NOW()',
      [token]
    );
    res.json({ valid: result.rows.length > 0 });
  } catch (err) {
    res.status(500).json({ valid: false });
  }
});

module.exports = router;
