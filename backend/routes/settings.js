const express  = require('express');
const router   = express.Router();
const { pool } = require('../database');
const authCheck = require('../middleware/auth');
const { encrypt, decrypt } = require('../lib/crypto');

router.use(authCheck);

// GET /api/settings — load all admin settings
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT company_name, company_email, company_phone, company_address,
              smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from,
              email_subject, email_body, logo_url, brand_color,
              plan, status, onboarding_completed, company_industry, company_size,
              pan_number, tan_number, epfo_code, esic_code, pt_reg_number, state
       FROM admins WHERE id = $1`,
      [req.admin_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Admin not found' });
    const row = result.rows[0];
    // Decrypt SMTP password for internal use, then mask it before sending to frontend
    if (row.smtp_pass) {
      row.smtp_pass = '••••••••'; // Never send raw/decrypted password to frontend
    }
    res.json({ settings: row });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings — save all admin settings
router.put('/', async (req, res) => {
  try {
    const {
      company_name, company_email, company_phone, company_address,
      smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from,
      email_subject, email_body, logo_url, brand_color,
      company_industry, company_size,
      pan_number, tan_number, epfo_code, esic_code, pt_reg_number, state,
    } = req.body;

    // Strip spaces from app password (Gmail shows it with spaces — users often copy them)
    const cleanPass = smtp_pass && smtp_pass !== '••••••••'
      ? smtp_pass.replace(/\s/g, '')
      : null;

    // Encrypt the password before storing
    const encryptedPass = cleanPass ? encrypt(cleanPass) : null;

    // Only update smtp_pass if a real value (not the mask) was sent
    const passSql = encryptedPass ? `, smtp_pass = $19` : '';

    const params = [
      company_name, company_email, company_phone, company_address,
      smtp_host, smtp_port ? parseInt(smtp_port) : 587, smtp_user, smtp_from,
      email_subject, email_body, logo_url, brand_color,
      company_industry, company_size,
      pan_number || null, tan_number || null, epfo_code || null, esic_code || null,
      req.admin_id,
    ];

    if (encryptedPass) params.splice(18, 0, encryptedPass);

    // pt_reg_number and state handled separately to keep param count manageable
    await pool.query(
      `UPDATE admins SET
         company_name     = $1,
         company_email    = $2,
         company_phone    = $3,
         company_address  = $4,
         smtp_host        = $5,
         smtp_port        = $6,
         smtp_user        = $7,
         smtp_from        = $8,
         email_subject    = $9,
         email_body       = $10,
         logo_url         = $11,
         brand_color      = $12,
         company_industry = $13,
         company_size     = $14,
         pan_number       = $15,
         tan_number       = $16,
         epfo_code        = $17,
         esic_code        = $18
         ${passSql}
       WHERE id = $${passSql ? 20 : 19}`,
      params
    );

    // Save remaining statutory fields
    await pool.query(
      'UPDATE admins SET pt_reg_number = $1, state = $2 WHERE id = $3',
      [pt_reg_number || null, state || null, req.admin_id]
    );

    res.json({ message: 'Settings saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/test-email — send a test email via Resend (SMTP is blocked on Render)
router.post('/test-email', async (req, res) => {
  try {
    const { test_to } = req.body;
    if (!test_to) return res.status(400).json({ error: 'Please enter an email address to send the test to.' });

    const { Resend } = require('resend');
    if (!process.env.RESEND_API_KEY) {
      return res.status(503).json({ error: 'Email service not configured. Please contact PayLeef support.' });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);
    const adminResult = await pool.query('SELECT company_name, brand_color FROM admins WHERE id = $1', [req.admin_id]);
    const admin = adminResult.rows[0] || {};
    const companyName = admin.company_name || 'Your Company';
    const brandColor  = admin.brand_color || '#1A7A4A';

    await resend.emails.send({
      from:    `${companyName} Payroll <payroll@dinmind.com>`,
      to:      [test_to],
      subject: '✅ PayLeef Email Test — Working!',
      html:    `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px;">
          <div style="background:${brandColor};padding:20px 24px;border-radius:8px;margin-bottom:20px;">
            <div style="font-size:22px;font-weight:900;color:#fff;">Pay<span style="color:#4ADE80;">Leef</span></div>
          </div>
          <h2 style="color:#16a34a;margin:0 0 12px;">✅ Email delivery is working perfectly!</h2>
          <p style="color:#334155;">Payslips for <strong>${companyName}</strong> will be sent reliably to your employees.</p>
          <p style="color:#64748b;font-size:13px;margin-top:16px;">Powered by PayLeef · dinmind.com</p>
        </div>
      `,
    });

    res.json({ message: `Test email sent to ${test_to} — check your inbox!` });
  } catch (err) {
    console.error('[settings/test-email]', err.message);
    res.status(500).json({ error: 'Failed to send test email. Please try again or contact support.' });
  }
});

module.exports = router;
