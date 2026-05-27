const express = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const { Resend } = require('resend');
const router   = express.Router();
const { pool, auditLog } = require('../database');
const { decrypt } = require('../lib/crypto');

// Lazy init — avoids crash if RESEND_API_KEY is not set at startup
function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

// ── helper: send verification email ──────────────────────────────────────────
async function sendVerificationEmail(email, companyName, verifyToken, req) {
  const appUrl    = process.env.APP_URL || process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
  const verifyUrl = `${appUrl}/verify-email?token=${verifyToken}`;

  if (!process.env.RESEND_API_KEY) {
    console.log(`[verify-email] No RESEND_API_KEY set. Verify URL: ${verifyUrl}`);
    return;
  }

  const resend = getResend();
  if (!resend) {
    console.log(`[verify-email] No RESEND_API_KEY. Verify URL: ${verifyUrl}`);
    return;
  }
  console.log(`[verify-email] Sending to: ${email}`);
  const { data, error } = await resend.emails.send({
    from:    'PayLeef <support@dinmind.com>',
    to:      email,
    subject: 'Verify your PayLeef account',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f9fafb;border-radius:12px;">
        <div style="text-align:center;margin-bottom:24px;">
          <span style="font-size:28px;font-weight:900;color:#0f172a;">Pay</span><span style="font-size:28px;font-weight:900;color:#1A7A4A;">Leef</span>
        </div>
        <h2 style="color:#0f172a;margin-bottom:8px;">Verify your email address</h2>
        <p style="color:#475569;margin-bottom:24px;">
          Hi${companyName ? ' ' + companyName : ''},<br/>
          Thanks for signing up! Click the button below to verify your email and activate your account.
        </p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${verifyUrl}" style="display:inline-block;background:#ea580c;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:700;font-size:16px;">
            ✓ Verify My Email
          </a>
        </div>
        <p style="color:#94a3b8;font-size:13px;margin-top:24px;">
          This link expires in <strong>24 hours</strong>. If you didn't create this account, ignore this email.
        </p>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
        <p style="color:#94a3b8;font-size:12px;">Or copy this link:<br/><a href="${verifyUrl}" style="color:#ea580c;">${verifyUrl}</a></p>
      </div>`,
  });
  if (error) {
    console.error('[verify-email] Resend error:', JSON.stringify(error));
  } else {
    console.log('[verify-email] Sent OK, id:', data?.id);
  }
}

// ── Notify Dinesh of every new trial signup ───────────────────────────────────
async function notifyNewTrialSignup({ email, company_name, admin_id, ip }) {
  const resend = getResend();
  if (!resend) return;
  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
  await resend.emails.send({
    from:    'PayLeef Alerts <payroll@dinmind.com>',
    to:      ['dinesh@dinmind.in'],
    subject: `🎉 New Trial Signup — ${company_name}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;">
        <div style="background:#1A7A4A;padding:20px 28px;border-radius:10px 10px 0 0;">
          <div style="font-size:20px;font-weight:900;color:#fff;letter-spacing:-.04em;">Pay<span style="color:#4ADE80;">Leef</span></div>
          <div style="color:rgba(255,255,255,.6);font-size:12px;margin-top:2px;">New Trial Alert</div>
        </div>
        <div style="background:#fff;padding:28px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;">
          <p style="font-size:16px;font-weight:700;color:#0f172a;margin:0 0 20px;">🎉 Someone just started a free trial!</p>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:8px 12px;background:#f8fafc;border-radius:6px;font-size:12px;font-weight:600;color:#64748b;width:40%">Company</td><td style="padding:8px 12px;background:#f8fafc;border-radius:6px;font-size:14px;font-weight:700;color:#0f172a;">${company_name}</td></tr>
            <tr><td style="padding:8px 12px;font-size:12px;font-weight:600;color:#64748b;">Email</td><td style="padding:8px 12px;font-size:14px;color:#0f172a;">${email}</td></tr>
            <tr><td style="padding:8px 12px;background:#f8fafc;border-radius:6px;font-size:12px;font-weight:600;color:#64748b;">Admin ID</td><td style="padding:8px 12px;background:#f8fafc;border-radius:6px;font-size:13px;color:#64748b;">#${admin_id}</td></tr>
            <tr><td style="padding:8px 12px;font-size:12px;font-weight:600;color:#64748b;">Signed up</td><td style="padding:8px 12px;font-size:13px;color:#64748b;">${now} IST</td></tr>
            <tr><td style="padding:8px 12px;background:#f8fafc;border-radius:6px;font-size:12px;font-weight:600;color:#64748b;">IP</td><td style="padding:8px 12px;background:#f8fafc;border-radius:6px;font-size:13px;color:#64748b;">${ip || 'unknown'}</td></tr>
          </table>
          <div style="margin-top:24px;padding:14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;">
            <p style="font-size:12px;color:#166534;margin:0;">Trial expires in <strong>30 days</strong>. Consider reaching out to welcome them and offer a demo call.</p>
          </div>
        </div>
      </div>`,
  });
}

// ── ADMIN SIGNUP ──────────────────────────────────────────────────────────────
router.post('/admin-signup', async (req, res) => {
  try {
    const { email, password, company_name, terms_accepted } = req.body;
    if (!email || !password || !company_name)
      return res.status(400).json({ error: 'All fields required' });

    if (!terms_accepted)
      return res.status(400).json({ error: 'You must accept the Terms of Service and Privacy Policy to create an account.' });

    if (password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const existing = await pool.query('SELECT id FROM admins WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0)
      return res.status(400).json({ error: 'An account with this email already exists' });

    const hash        = await bcrypt.hash(password, 12);
    const now         = new Date();
    const trialEnd    = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExp   = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const result = await pool.query(`
      INSERT INTO admins
        (email, password, company_name, onboarding_completed, plan, status,
         company_industry, company_size, last_active,
         trial_start_date, trial_end_date, trial_days, created_at,
         email_verified, email_verify_token, email_verify_expires,
         terms_accepted, terms_accepted_at)
      VALUES ($1,$2,$3,false,'starter','active','','',$4,$5,$6,30,$7,false,$8,$9,true,$10)
      RETURNING id, email, company_name
    `, [email.toLowerCase(), hash, company_name, now, now, trialEnd, now, verifyToken, verifyExp, now]);

    const admin = result.rows[0];

    // Send verification email — non-blocking, don't fail signup if email fails
    sendVerificationEmail(email.toLowerCase(), company_name, verifyToken, req)
      .catch(err => console.error('[verify-email] Send failed:', err.message));

    // Notify Dinesh of every new trial signup
    notifyNewTrialSignup({ email: email.toLowerCase(), company_name, admin_id: admin.id, ip: req.ip })
      .catch(err => console.error('[trial-notify] Failed:', err.message));

    await auditLog(admin.id, 'admin_signup', 'admins', admin.id, { company_name }, req.ip);

    res.json({
      needs_verification: true,
      email: email.toLowerCase(),
      message: 'Account created! Please check your email to verify your account.',
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ── VERIFY EMAIL ──────────────────────────────────────────────────────────────
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Verification token missing' });

    const result = await pool.query(
      'SELECT id, email, email_verified FROM admins WHERE email_verify_token = $1 AND email_verify_expires > NOW()',
      [token]
    );
    const admin = result.rows[0];

    if (!admin) return res.status(400).json({ error: 'Verification link is invalid or has expired. Please request a new one.' });
    if (admin.email_verified) return res.json({ message: 'Email already verified. You can log in.' });

    await pool.query(
      'UPDATE admins SET email_verified = true, email_verify_token = NULL, email_verify_expires = NULL WHERE id = $1',
      [admin.id]
    );
    await auditLog(admin.id, 'email_verified', 'admins', admin.id, null, req.ip);
    res.json({ message: 'Email verified successfully! You can now log in.' });
  } catch (err) {
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// ── RESEND VERIFICATION ───────────────────────────────────────────────────────
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const result = await pool.query(
      'SELECT id, company_name, email_verified FROM admins WHERE email = $1',
      [email.toLowerCase()]
    );
    const admin = result.rows[0];

    // Always return success to prevent enumeration
    if (!admin || admin.email_verified) {
      return res.json({ message: 'If this email exists and is unverified, a new link has been sent.' });
    }

    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyExp   = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await pool.query(
      'UPDATE admins SET email_verify_token = $1, email_verify_expires = $2 WHERE id = $3',
      [verifyToken, verifyExp, admin.id]
    );

    sendVerificationEmail(email.toLowerCase(), admin.company_name, verifyToken, req)
      .catch(err => console.error('[resend-verify] Send failed:', err.message));

    res.json({ message: 'Verification email sent! Please check your inbox.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resend. Please try again.' });
  }
});

// ── ADMIN LOGIN ───────────────────────────────────────────────────────────────
// Also handles sub-user login — checks admin_users table if not found in admins
router.post('/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });

    const emailLc = email.toLowerCase().trim();

    // 1. Try main admin table first
    const adminRes = await pool.query('SELECT * FROM admins WHERE email = $1', [emailLc]);
    const admin    = adminRes.rows[0];

    if (admin) {
      // ── Admin login path ──────────────────────────────────────────────────
      if (admin.status === 'disabled')
        return res.status(403).json({ error: 'Account disabled. Contact support.' });

      const match = await bcrypt.compare(password, admin.password);
      if (!match) return res.status(401).json({ error: 'Invalid email or password' });

      if (admin.email_verified === false) {
        return res.status(403).json({
          error: 'Please verify your email before logging in.',
          needs_verification: true,
          email: admin.email,
        });
      }

      await pool.query('UPDATE admins SET last_active = NOW() WHERE id = $1', [admin.id]);

      const token = jwt.sign(
        { admin_id: admin.id, email: admin.email, role: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );

      await auditLog(admin.id, 'admin_login', 'admins', admin.id, null, req.ip);
      return res.json({
        token,
        role:                 'employer',
        is_sub_user:          false,
        company_name:         admin.company_name,
        employee_name:        admin.company_name,
        onboarding_completed: admin.onboarding_completed || false,
      });
    }

    // 2. Try sub-user (admin_users) table
    const subRes = await pool.query(
      `SELECT u.*, a.company_name, a.onboarding_completed
       FROM admin_users u
       JOIN admins a ON a.id = u.admin_id
       WHERE u.email = $1 AND u.status = 'active'`,
      [emailLc]
    );
    const subUser = subRes.rows[0];

    if (subUser) {
      const match = await bcrypt.compare(password, subUser.password);
      if (!match) return res.status(401).json({ error: 'Invalid email or password' });

      const token = jwt.sign(
        {
          admin_id:    subUser.admin_id,
          sub_user_id: subUser.id,
          role:        subUser.role,
          name:        subUser.name,
          email:       subUser.email,
          permissions: subUser.permissions || {},
        },
        process.env.JWT_SECRET,
        { expiresIn: '8h' }
      );

      return res.json({
        token,
        role:                 'employer',
        is_sub_user:          true,
        sub_user_name:        subUser.name,
        permissions:          subUser.permissions || {},
        company_name:         subUser.company_name,
        employee_name:        subUser.name,
        onboarding_completed: subUser.onboarding_completed || false,
      });
    }

    // Not found in either table
    return res.status(401).json({ error: 'Invalid email or password' });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ── EMPLOYEE LOGIN ────────────────────────────────────────────────────────────
// Accepts: employee_id + email + password (password optional for legacy accounts)
router.post('/employee-login', async (req, res) => {
  try {
    const { employee_id, email, password } = req.body;
    if (!employee_id || !email)
      return res.status(400).json({ error: 'Employee ID and email are required' });

    const result = await pool.query(
      'SELECT * FROM employees WHERE UPPER(employee_id) = $1 AND LOWER(email) = $2',
      [employee_id.toUpperCase().trim(), email.toLowerCase().trim()]
    );
    const employee = result.rows[0];

    if (!employee) return res.status(401).json({ error: 'Invalid credentials' });

    // Portal access check — only enforce if portal_access_enabled is explicitly set
    // (allows backwards compatibility for accounts created before portal feature)
    if (employee.portal_access_enabled === false) {
      return res.status(403).json({ error: 'Portal access is not enabled for your account. Please contact your HR admin.' });
    }

    // Password check:
    // 1. If employee has a hashed password, verify with bcrypt
    // 2. If no password (legacy) and no password sent — allow (backwards compat)
    // 3. If no password and password sent, treat employee_id as default password
    if (password) {
      let match = false;
      if (employee.password) {
        match = await bcrypt.compare(password, employee.password);
      } else {
        // Legacy: no password in DB, accept employee_id as password
        match = (password === employee.employee_id);
      }
      if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    } else if (employee.password) {
      // Password field in DB but nothing sent — require password
      return res.status(400).json({ error: 'Password is required' });
    }

    const token = jwt.sign(
      { employee_id: employee.id, admin_id: employee.admin_id },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    await pool.query('UPDATE employees SET is_temp_password = COALESCE(is_temp_password, true) WHERE id = $1', [employee.id]);
    await auditLog(employee.admin_id, 'employee_login', 'employees', employee.id, null, req.ip);

    res.json({
      token,
      role:                     'employee',
      employee_name:            employee.employee_name,
      requires_password_change: employee.is_temp_password === true,
    });
  } catch (err) {
    console.error('Employee login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ── EMPLOYEE SET PASSWORD — after first login or forced reset ─────────────────
router.post('/employee-set-password', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorised' });
    const token  = authHeader.split(' ')[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    const { new_password } = req.body;
    if (!new_password || new_password.length < 8)
      return res.status(400).json({ error: 'Password must be at least 8 characters' });

    // Fetch employee + company name before updating (for notification email)
    const empRes = await pool.query(
      `SELECT e.*, a.company_name FROM employees e
       JOIN admins a ON a.id = e.admin_id
       WHERE e.id = $1 AND e.admin_id = $2`,
      [payload.employee_id, payload.admin_id]
    );
    const emp = empRes.rows[0];

    const hash = await bcrypt.hash(new_password, 12);
    await pool.query(
      'UPDATE employees SET password = $1, is_temp_password = false WHERE id = $2 AND admin_id = $3',
      [hash, payload.employee_id, payload.admin_id]
    );

    // Send password-changed security alert (only if employee has an email and it's NOT a first-time set)
    if (emp && emp.email && !emp.is_temp_password) {
      const appUrl  = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const resend  = getResend();
      if (resend) {
        resend.emails.send({
          from:    `${emp.company_name} Payroll <payroll@dinmind.com>`,
          to:      [emp.email],
          subject: `Your payroll portal password was changed — ${emp.company_name}`,
          html: `
            <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;">
              <div style="background:#1A7A4A;padding:24px 28px;border-radius:10px 10px 0 0;">
                <div style="font-size:20px;font-weight:900;color:#fff;letter-spacing:-.04em;">Pay<span style="color:#4ADE80;">Leef</span></div>
                <div style="color:rgba(255,255,255,.6);font-size:12px;margin-top:2px;">${emp.company_name}</div>
              </div>
              <div style="background:#fff;padding:28px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;">
                <p style="font-size:15px;font-weight:700;color:#0f172a;margin:0 0 12px;">Hi ${emp.employee_name},</p>
                <p style="color:#334155;font-size:14px;margin:0 0 16px;">
                  Your payroll portal password was just changed successfully.
                </p>
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin-bottom:16px;">
                  <p style="font-size:13px;color:#166534;margin:0;">
                    ✅ Password changed on ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST
                  </p>
                </div>
                <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin-bottom:16px;">
                  <p style="font-size:13px;font-weight:700;color:#dc2626;margin:0 0 4px;">⚠ Didn't do this yourself?</p>
                  <p style="font-size:13px;color:#7f1d1d;margin:0;">
                    Contact your HR admin immediately. Someone else may have access to your account.
                  </p>
                </div>
                <p style="color:#64748b;font-size:12px;margin:0;">
                  Log in at <a href="${appUrl}/login" style="color:#1A7A4A;">${appUrl}/login</a>
                </p>
              </div>
            </div>`,
        }).catch(() => {});
      }
    }

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    if (err.name === 'JsonWebTokenError') return res.status(401).json({ error: 'Session expired. Please log in again.' });
    res.status(500).json({ error: 'Failed to update password.' });
  }
});

// ── EMPLOYEE FORGOT PASSWORD ──────────────────────────────────────────────────
router.post('/employee-forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const result = await pool.query(
      `SELECT e.*, a.company_name FROM employees e
       JOIN admins a ON a.id = e.admin_id
       WHERE LOWER(e.email) = $1 LIMIT 1`,
      [email.toLowerCase().trim()]
    );
    const employee = result.rows[0];

    // Always return success to prevent account enumeration
    if (!employee || !employee.portal_access_enabled) {
      return res.json({ message: 'If this email has portal access, a reset link has been sent.' });
    }

    const token   = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      'UPDATE employees SET portal_reset_token = $1, portal_reset_expires = $2 WHERE id = $3',
      [token, expires, employee.id]
    );

    const appUrl   = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const resetUrl = `${appUrl}/employee/reset-password?token=${token}`;

    const resend = getResend();
    if (resend) {
      await resend.emails.send({
        from:    `${employee.company_name} Payroll <payroll@dinmind.com>`,
        to:      employee.email,
        subject: `Reset your ${employee.company_name} Payroll Portal password`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f9fafb;border-radius:12px;">
            <div style="text-align:center;margin-bottom:24px;">
              <span style="font-size:28px;font-weight:900;color:#0f172a;">Pay</span><span style="font-size:28px;font-weight:900;color:#1A7A4A;">Leef</span>
            </div>
            <h2 style="color:#0f172a;margin-bottom:8px;">Reset your payroll portal password</h2>
            <p style="color:#475569;margin-bottom:8px;">Hi ${employee.employee_name},</p>
            <p style="color:#475569;margin-bottom:24px;">
              We received a request to reset your password for the <strong>${employee.company_name}</strong> payroll portal.
              Click the button below to set a new password.
            </p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${resetUrl}" style="display:inline-block;background:#1A7A4A;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:700;font-size:16px;">
                Reset My Password
              </a>
            </div>
            <p style="color:#94a3b8;font-size:13px;">This link expires in <strong>1 hour</strong>. If you didn't request this, ignore this email.</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>
            <p style="color:#94a3b8;font-size:12px;">Or copy: <a href="${resetUrl}" style="color:#1A7A4A;">${resetUrl}</a></p>
          </div>`,
      });
    }

    res.json({ message: 'If this email has portal access, a reset link has been sent.' });
  } catch (err) {
    console.error('Employee forgot password error:', err);
    res.status(500).json({ error: 'Failed to process request.' });
  }
});

// ── EMPLOYEE RESET PASSWORD — via token ───────────────────────────────────────
router.post('/employee-reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

    const result = await pool.query(
      'SELECT * FROM employees WHERE portal_reset_token = $1 AND portal_reset_expires > NOW()',
      [token]
    );
    const employee = result.rows[0];
    if (!employee) return res.status(400).json({ error: 'Reset link is invalid or has expired. Request a new one.' });

    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      'UPDATE employees SET password = $1, is_temp_password = false, portal_reset_token = NULL, portal_reset_expires = NULL WHERE id = $2',
      [hash, employee.id]
    );

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// ── EMPLOYEE VERIFY RESET TOKEN ───────────────────────────────────────────────
router.get('/employee-verify-reset-token', async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) return res.json({ valid: false });
    const result = await pool.query(
      'SELECT id FROM employees WHERE portal_reset_token = $1 AND portal_reset_expires > NOW()',
      [token]
    );
    res.json({ valid: result.rows.length > 0 });
  } catch (err) {
    res.json({ valid: false });
  }
});

// ── FORGOT PASSWORD ───────────────────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const result = await pool.query(
      'SELECT id, email, company_name FROM admins WHERE email = $1',
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

    // Build reset URL
    const appUrl   = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const resetUrl = `${appUrl}/reset-password?token=${token}`;

    const resend = getResend();
    if (!resend) {
      console.log(`[forgot-password] No RESEND_API_KEY set. Reset URL: ${resetUrl}`);
      return res.json({ message: 'If this email exists, a reset link has been sent.' });
    }

    await resend.emails.send({
      from:    'PayLeef <support@dinmind.com>',
      to:      admin.email,
      subject: 'Reset your PayLeef password',
      html: `
        <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #f9fafb; border-radius: 12px;">
          <div style="text-align:center;margin-bottom:24px;">
            <span style="font-size:28px;font-weight:900;color:#0f172a;">Pay</span><span style="font-size:28px;font-weight:900;color:#1A7A4A;">Leef</span>
          </div>
          <h2 style="color: #0f172a; margin-bottom: 8px;">Reset your password</h2>
          <p style="color: #475569; margin-bottom: 24px;">
            Hi${admin.company_name ? ' ' + admin.company_name : ''},<br/>
            We received a request to reset your PayLeef password. Click the button below to set a new password.
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${resetUrl}" style="display:inline-block;background:#ea580c;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:15px;">
              Reset Password
            </a>
          </div>
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
