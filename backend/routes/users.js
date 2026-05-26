// users.js — Sub-user management for PayLeef
// Admin can add staff members with specific module permissions
const express  = require('express');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const { Resend } = require('resend');
const router   = express.Router();
const { pool } = require('../database');
const authCheck = require('../middleware/auth');

// Lazy Resend init
function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

// Generate a readable 10-char temp password (no ambiguous chars)
function generateTempPassword() {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pwd = '';
  const bytes = crypto.randomBytes(10);
  for (let i = 0; i < 10; i++) pwd += charset[bytes[i] % charset.length];
  return pwd;
}

// ── Email helpers ─────────────────────────────────────────────────────────────

// Send account-change notification to sub-user
async function sendSubUserChangeEmail({ toEmail, name, changedFields, companyName, newPassword }) {
  const resend = getResend();
  if (!resend || !toEmail) return;
  const LABELS = {
    name: 'Name', email: 'Email Address', role: 'Role',
    permissions: 'Module Permissions', status: 'Account Status', password: 'Password',
  };
  const changeList = changedFields.map(f => LABELS[f] || f).join(', ');
  const appUrl = process.env.APP_URL || 'https://payos-saas.onrender.com';
  try {
    await resend.emails.send({
      from:    `${companyName} Payroll <payroll@dinmind.com>`,
      to:      [toEmail],
      subject: `Your PayLeef account was updated — ${companyName}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;">
          <div style="background:#1A7A4A;padding:24px 28px;border-radius:10px 10px 0 0;">
            <div style="font-size:20px;font-weight:900;color:#fff;letter-spacing:-.04em;">Pay<span style="color:#4ADE80;">Leef</span></div>
            <div style="color:rgba(255,255,255,.6);font-size:12px;margin-top:2px;">${companyName}</div>
          </div>
          <div style="background:#fff;padding:28px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;">
            <p style="font-size:15px;font-weight:700;color:#0f172a;margin:0 0 12px;">Hi ${name},</p>
            <p style="color:#334155;font-size:14px;margin:0 0 16px;">
              Your administrator has updated your PayLeef team account. The following was changed:
            </p>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 18px;margin-bottom:16px;">
              <p style="font-size:13px;font-weight:700;color:#166534;margin:0;">Updated: ${changeList}</p>
            </div>
            ${newPassword ? `
            <div style="background:#fefce8;border:1px solid #fde047;border-radius:8px;padding:14px 18px;margin-bottom:16px;">
              <p style="font-size:13px;font-weight:700;color:#92400e;margin:0 0 4px;">New Temporary Password</p>
              <p style="font-size:20px;font-weight:900;color:#1A7A4A;letter-spacing:.08em;margin:0;">${newPassword}</p>
              <p style="font-size:11px;color:#92400e;margin:6px 0 0;">Please log in and change this immediately.</p>
            </div>` : ''}
            <p style="color:#64748b;font-size:12px;margin:0;">
              If you did not expect this change, contact your HR admin.<br/>
              Log in at <a href="${appUrl}/login" style="color:#1A7A4A;">${appUrl}/login</a>
            </p>
          </div>
        </div>`,
    });
  } catch (e) { console.warn('[sub-user-change-email] Failed:', e.message); }
}

// Send removal notification to sub-user
async function sendSubUserRemovedEmail({ toEmail, name, companyName }) {
  const resend = getResend();
  if (!resend || !toEmail) return;
  try {
    await resend.emails.send({
      from:    `${companyName} Payroll <payroll@dinmind.com>`,
      to:      [toEmail],
      subject: `Your PayLeef account has been removed — ${companyName}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;">
          <div style="background:#dc2626;padding:24px 28px;border-radius:10px 10px 0 0;">
            <div style="font-size:20px;font-weight:900;color:#fff;letter-spacing:-.04em;">Pay<span style="color:#fca5a5;">Leef</span></div>
            <div style="color:rgba(255,255,255,.6);font-size:12px;margin-top:2px;">${companyName}</div>
          </div>
          <div style="background:#fff;padding:28px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;">
            <p style="font-size:15px;font-weight:700;color:#0f172a;margin:0 0 12px;">Hi ${name},</p>
            <p style="color:#334155;font-size:14px;margin:0 0 16px;">
              Your PayLeef team account at <strong>${companyName}</strong> has been removed by an administrator.
              You will no longer be able to log in.
            </p>
            <p style="color:#64748b;font-size:12px;margin:0;">
              If you believe this is an error, please contact your HR admin directly.
            </p>
          </div>
        </div>`,
    });
  } catch (e) { console.warn('[sub-user-removed-email] Failed:', e.message); }
}

// Send welcome email to new team member
async function sendTeamMemberWelcomeEmail({ toEmail, name, tempPassword, companyName, adminEmail }) {
  const resend = getResend();
  if (!resend) {
    console.warn('[users] Resend not configured — skipping welcome email');
    return;
  }
  const loginUrl = process.env.APP_URL || 'https://payos-saas.onrender.com';
  const brandColor = '#1A7A4A';

  await resend.emails.send({
    from:     `${companyName} Payroll <payroll@dinmind.com>`,
    to:       [toEmail],
    reply_to: adminEmail || undefined,
    subject:  `Welcome to PayLeef — Your Team Account is Ready`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:0;">
        <div style="background:${brandColor};padding:28px 32px;border-radius:12px 12px 0 0;">
          <div style="font-size:24px;font-weight:900;color:#fff;letter-spacing:-.04em;">
            Pay<span style="color:#4ADE80;">Leef</span>
          </div>
          <div style="color:rgba(255,255,255,.6);font-size:13px;margin-top:4px;">${companyName}</div>
        </div>

        <div style="background:#ffffff;padding:32px;border:1px solid #e2e8f0;border-top:none;">
          <h2 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 8px;">
            Welcome to the Team, ${name}! 👋
          </h2>
          <p style="color:#64748b;font-size:15px;margin:0 0 24px;">
            Your PayLeef account has been created by <strong style="color:#0f172a;">${companyName}</strong>.
            Use the credentials below to log in and access your assigned modules.
          </p>

          <div style="background:#f8fafc;border-radius:10px;padding:20px;border:1px solid #e2e8f0;margin-bottom:24px;">
            <p style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 12px;">Your Login Details</p>
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:8px 0;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9;">Login URL</td>
                <td style="padding:8px 0;font-size:13px;font-weight:600;color:#0f172a;text-align:right;border-bottom:1px solid #f1f5f9;">
                  <a href="${loginUrl}/login" style="color:${brandColor};">${loginUrl}/login</a>
                </td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9;">Email</td>
                <td style="padding:8px 0;font-size:13px;font-weight:600;color:#0f172a;text-align:right;border-bottom:1px solid #f1f5f9;">${toEmail}</td>
              </tr>
              <tr>
                <td style="padding:10px 0 6px;font-size:13px;color:#64748b;font-weight:600;">Temporary Password</td>
                <td style="padding:10px 0 6px;font-size:18px;font-weight:900;color:${brandColor};text-align:right;letter-spacing:0.04em;">${tempPassword}</td>
              </tr>
            </table>
          </div>

          <div style="background:#FEF9C3;border:1.5px solid #FDE047;border-radius:8px;padding:12px 14px;margin-bottom:20px;">
            <p style="font-size:12.5px;color:#92400e;margin:0;">
              ⚠ <strong>Please log in and change your password immediately.</strong> Do not share this email with anyone.
            </p>
          </div>

          <p style="color:#64748b;font-size:13px;margin:0;">
            If you have any questions, contact your administrator at <strong>${companyName}</strong>.
          </p>
        </div>

        <div style="background:#f8fafc;padding:20px 32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none;text-align:center;">
          <p style="margin:0;font-size:12px;color:#94a3b8;">
            This is an automated email from ${companyName} via PayLeef.<br/>
            Please do not reply to this email.
          </p>
        </div>
      </div>
    `,
  });
}

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
    if (password && password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters' });

    // Check duplicate email in admin_users (scoped to this admin)
    const exists = await pool.query(
      'SELECT id FROM admin_users WHERE admin_id = $1 AND email = $2',
      [req.admin_id, email.trim().toLowerCase()]
    );
    if (exists.rows.length > 0)
      return res.status(409).json({ error: 'A user with this email already exists' });

    // Auto-generate password if not provided
    const plainPassword = password && password.trim() ? password.trim() : generateTempPassword();
    const hashed = await bcrypt.hash(plainPassword, 10);

    const result = await pool.query(
      `INSERT INTO admin_users (admin_id, name, email, password, role, permissions)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, email, role, permissions, status, created_at`,
      [req.admin_id, name.trim(), email.trim().toLowerCase(), hashed, role, JSON.stringify(permissions)]
    );

    // Get admin info for the welcome email
    try {
      const adminResult = await pool.query(
        'SELECT company_name, company_email FROM admins WHERE id = $1',
        [req.admin_id]
      );
      const admin = adminResult.rows[0] || {};
      await sendTeamMemberWelcomeEmail({
        toEmail:     email.trim().toLowerCase(),
        name:        name.trim(),
        tempPassword: plainPassword,
        companyName: admin.company_name || 'Your Company',
        adminEmail:  admin.company_email || undefined,
      });
    } catch (emailErr) {
      console.error('[users] Welcome email failed:', emailErr.message);
      // Don't fail the whole request if email fails
    }

    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PUT /api/users/:id — update sub-user ─────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, permissions, status } = req.body;

    // Fetch before-state for email notification
    const check = await pool.query(
      'SELECT * FROM admin_users WHERE id = $1 AND admin_id = $2',
      [id, req.admin_id]
    );
    if (!check.rows.length) return res.status(404).json({ error: 'User not found' });
    const userBefore = check.rows[0];

    const fields = [], values = [];
    let idx = 1;
    const changedFields = [];
    let plainNewPassword = null;

    if (name !== undefined && name.trim() !== userBefore.name) {
      fields.push(`name = $${idx++}`); values.push(name.trim()); changedFields.push('name');
    }
    if (email !== undefined) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
        return res.status(400).json({ error: 'Invalid email format' });
      if (email.trim().toLowerCase() !== userBefore.email) {
        fields.push(`email = $${idx++}`); values.push(email.trim().toLowerCase()); changedFields.push('email');
      }
    }
    if (role !== undefined && role !== userBefore.role) {
      fields.push(`role = $${idx++}`); values.push(role); changedFields.push('role');
    }
    if (permissions !== undefined) {
      fields.push(`permissions = $${idx++}`); values.push(JSON.stringify(permissions)); changedFields.push('permissions');
    }
    if (status !== undefined && status !== userBefore.status) {
      fields.push(`status = $${idx++}`); values.push(status); changedFields.push('status');
    }
    if (password !== undefined && password) {
      if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
      const hashed = await bcrypt.hash(password, 10);
      fields.push(`password = $${idx++}`); values.push(hashed); changedFields.push('password');
      plainNewPassword = password; // include in email
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

    // Notify the sub-user by email (async — don't block response)
    if (changedFields.length > 0) {
      const adminRes = await pool.query('SELECT company_name FROM admins WHERE id = $1', [req.admin_id]);
      const companyName = adminRes.rows[0]?.company_name || 'Your Company';
      const notifyEmail = email ? email.trim().toLowerCase() : userBefore.email;
      const notifyName  = name  ? name.trim()                : userBefore.name;
      sendSubUserChangeEmail({
        toEmail: notifyEmail, name: notifyName,
        changedFields, companyName,
        newPassword: plainNewPassword,
      }).catch(() => {});
    }

    res.json(updated.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE /api/users/:id — remove sub-user ───────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // Fetch before deleting so we can send the notification
    const userRes = await pool.query(
      'SELECT name, email FROM admin_users WHERE id = $1 AND admin_id = $2',
      [id, req.admin_id]
    );
    if (!userRes.rows.length) return res.status(404).json({ error: 'User not found' });
    const userToDelete = userRes.rows[0];

    await pool.query('DELETE FROM admin_users WHERE id = $1 AND admin_id = $2', [id, req.admin_id]);

    // Send removal notification asynchronously
    const adminRes = await pool.query('SELECT company_name FROM admins WHERE id = $1', [req.admin_id]);
    const companyName = adminRes.rows[0]?.company_name || 'Your Company';
    sendSubUserRemovedEmail({
      toEmail: userToDelete.email,
      name:    userToDelete.name,
      companyName,
    }).catch(() => {});

    res.json({ success: true, deleted: { id, name: userToDelete.name } });
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
