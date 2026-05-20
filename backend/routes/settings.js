const express  = require('express');
const router   = express.Router();
const { pool } = require('../database');
const authCheck = require('../middleware/auth');
const nodemailer = require('nodemailer');
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

// POST /api/settings/test-smtp — send a test email
router.post('/test-smtp', async (req, res) => {
  try {
    const { smtp_host, smtp_user, smtp_from, test_to } = req.body;
    let { smtp_port, smtp_pass } = req.body;

    if (!smtp_host || !smtp_user || !smtp_pass) {
      return res.status(400).json({ error: 'SMTP host, user and password are required' });
    }

    // Strip spaces — Gmail app passwords are displayed with spaces
    // Also support when user is re-testing with a freshly-typed password (not encrypted yet)
    smtp_pass = smtp_pass.replace(/\s/g, '');
    smtp_port = parseInt(smtp_port) || 587;

<<<<<<< Updated upstream
    const transporter = nodemailer.createTransporter({
=======
    const transporter = nodemailer.createTransport({
>>>>>>> Stashed changes
      host:       smtp_host,
      port:       smtp_port,
      secure:     smtp_port === 465,
      requireTLS: smtp_port !== 465,    // Force STARTTLS on 587/other ports
      auth:       { user: smtp_user, pass: smtp_pass },
      tls:        { rejectUnauthorized: false },
      connectionTimeout: 10000,
      greetingTimeout:   10000,
    });

    await transporter.verify();

    const toAddr = test_to || smtp_user;
    await transporter.sendMail({
      from:    `"PayOS Test" <${smtp_from || smtp_user}>`,
      to:      toAddr,
      subject: 'PayOS SMTP Test — Connection Successful',
      html:    `<div style="font-family:sans-serif;padding:20px;">
                  <h2 style="color:#16a34a;">✅ SMTP Connected Successfully!</h2>
                  <p>Your email settings are working correctly.</p>
                  <p>Payslips will be delivered from <strong>${smtp_from || smtp_user}</strong></p>
                </div>`,
    });

    res.json({ message: `Test email sent to ${toAddr}` });
  } catch (err) {
    // Provide user-friendly error messages for common failures
    let message = err.message || 'Connection failed';
    if (/Invalid login|Username and Password not accepted|535/i.test(message)) {
      message = 'Login failed — wrong password. For Gmail: make sure you used an App Password (not your normal Gmail password). Remove any spaces from the app password before pasting.';
    } else if (/ECONNREFUSED|ECONNRESET|ETIMEDOUT|connect/i.test(message)) {
      message = 'Could not connect to the mail server — check your SMTP host and port.';
    } else if (/EAUTH|authentication/i.test(message)) {
      message = 'Authentication failed — check your email and password. For Gmail, you must use an App Password (not your normal login password).';
    }
    res.status(400).json({ error: message });
  }
});

module.exports = router;
