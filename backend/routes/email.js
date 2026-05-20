const express     = require('express');
const PDFDocument = require('pdfkit');
const nodemailer  = require('nodemailer');
const router      = express.Router();
const { pool }    = require('../database');
const authCheck   = require('../middleware/auth');
const { getDefaultConfig } = require('../lib/payrollEngine');
const { renderPayslipPDF } = require('../lib/pdfTemplates');

router.use(authCheck);

const INR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

// Build a PDF buffer for a single payslip
function buildPayslipPDFBuffer(p, branding, admin) {
  return new Promise((resolve, reject) => {
    try {
      const isPremium = (branding?.template || 'modern') === 'premium';
      const doc    = new PDFDocument({ size: 'A4', margin: isPremium ? 0 : 40 });
      const chunks = [];
      doc.on('data',  chunk => chunks.push(chunk));
      doc.on('end',   ()    => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      renderPayslipPDF(doc, p, branding || {}, admin || {});
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// POST /api/email/send
router.post('/send', async (req, res) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) return res.status(400).json({ error: 'month and year required' });

    const [adminResult, cfgResult, slipsResult] = await Promise.all([
      pool.query('SELECT *, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, email_subject, email_body FROM admins WHERE id = $1', [req.admin_id]),
      pool.query('SELECT branding FROM payroll_configs WHERE admin_id = $1', [req.admin_id]),
      pool.query(
        'SELECT p.*, e.email AS employee_email FROM payslips p LEFT JOIN employees e ON e.employee_id = p.employee_id AND e.admin_id = p.admin_id WHERE p.admin_id = $1 AND p.month = $2 AND p.year = $3 AND p.emailed = false',
        [req.admin_id, parseInt(month), parseInt(year)]
      ),
    ]);

    const admin    = adminResult.rows[0] || {};
    const branding = cfgResult.rows.length ? (cfgResult.rows[0].branding || {}) : {};
    const slips    = slipsResult.rows;

    if (slips.length === 0) {
      return res.json({ message: 'No pending payslips to email (all already sent or none generated)', sent: 0, failed: 0 });
    }

    // Use admin's own SMTP settings first, fall back to env vars
    const smtpHost = admin.smtp_host || process.env.SMTP_HOST;
    const smtpPort = admin.smtp_port || process.env.SMTP_PORT;
    const smtpUser = admin.smtp_user || process.env.SMTP_USER;
    const smtpPass = admin.smtp_pass || process.env.SMTP_PASS;

    const smtpConfigured = !!(smtpHost && smtpUser && smtpPass);

    let transporter = null;
    if (smtpConfigured) {
      transporter = nodemailer.createTransporter({
        host:   smtpHost,
        port:   parseInt(smtpPort) || 587,
        secure: parseInt(smtpPort) === 465,
        auth:   { user: smtpUser, pass: smtpPass },
        tls:    { rejectUnauthorized: false },
      });
    }

    const adminName  = admin.company_name || 'Your Company';
    const fromAddr   = admin.smtp_from || process.env.SMTP_FROM || smtpUser || 'payroll@company.com';
    const monthLabel = new Date(parseInt(year), parseInt(month) - 1)
      .toLocaleString('en-IN', { month: 'long', year: 'numeric' });

    let sent = 0, failed = 0;

    for (const slip of slips) {
      try {
        const toEmail = slip.employee_email;

        if (!toEmail) {
          console.log(`[email] No email found for ${slip.employee_id}, skipping`);
          failed++;
          continue;
        }

        const pdfBuffer = await buildPayslipPDFBuffer(slip, branding, admin);

        // Build subject — replace placeholders
        const subjectTemplate = admin.email_subject || 'Your Payslip for {month} — {company}';
        const emailSubject = subjectTemplate
          .replace('{month}', monthLabel)
          .replace('{company}', adminName)
          .replace('{employee}', slip.employee_name);

        // Build body — use custom template or default
        const brandColor = admin.brand_color || '#1B4F8A';
        const defaultBody = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;border-top:4px solid ${brandColor};">
          <h2 style="color:${brandColor};">Payslip for ${monthLabel}</h2>
          <p>Dear <strong>${slip.employee_name}</strong>,</p>
          <p>Please find attached your salary slip for <strong>${monthLabel}</strong>.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f8fafc;border-radius:8px;">
            <tr><td style="padding:12px 16px;color:#64748b;border-bottom:1px solid #e2e8f0;">Employee ID</td>
                <td style="padding:12px 16px;font-weight:600;border-bottom:1px solid #e2e8f0;">${slip.employee_id}</td></tr>
            <tr><td style="padding:12px 16px;color:#64748b;border-bottom:1px solid #e2e8f0;">Period</td>
                <td style="padding:12px 16px;font-weight:600;border-bottom:1px solid #e2e8f0;">${monthLabel}</td></tr>
            <tr><td style="padding:12px 16px;color:#64748b;">Net Salary</td>
                <td style="padding:12px 16px;font-weight:700;font-size:18px;color:${brandColor};">₹${(slip.net_salary || slip.salary || 0).toLocaleString('en-IN')}</td></tr>
          </table>
          <p style="color:#64748b;font-size:12px;margin-top:24px;border-top:1px solid #e2e8f0;padding-top:12px;">
            This is a system-generated email from ${adminName}. Please do not reply.
          </p>
        </div>`;

        const customBody = admin.email_body
          ? admin.email_body
              .replace(/{month}/g, monthLabel)
              .replace(/{company}/g, adminName)
              .replace(/{employee}/g, slip.employee_name)
              .replace(/{employee_id}/g, slip.employee_id)
              .replace(/{net_salary}/g, `₹${(slip.net_salary || slip.salary || 0).toLocaleString('en-IN')}`)
          : null;

        const emailHtml = customBody || defaultBody;

        if (smtpConfigured) {
          await transporter.sendMail({
            from:    `"${adminName} Payroll" <${fromAddr}>`,
            to:      toEmail,
            subject: emailSubject,
            html:    emailHtml,
            attachments: [{
              filename:    `Payslip_${slip.employee_id}_${slip.year}-${String(slip.month).padStart(2, '0')}.pdf`,
              content:     pdfBuffer,
              contentType: 'application/pdf',
            }],
          });
        } else {
          console.log(`[email simulate] To: ${toEmail} | ${slip.employee_name} | ${monthLabel} | Net: ${slip.net_salary || slip.salary}`);
        }

        // Mark as emailed
        await pool.query(
          'UPDATE payslips SET emailed = true, emailed_at = NOW() WHERE id = $1 AND admin_id = $2',
          [slip.id, req.admin_id]
        );
        sent++;
      } catch (err) {
        console.error(`[email] Failed for ${slip.employee_id}:`, err.message);
        failed++;
      }
    }

    res.json({
      message:   `${sent} email${sent !== 1 ? 's' : ''} sent${smtpConfigured ? '' : ' (simulated — SMTP not configured)'}`,
      sent,
      failed,
      simulated: !smtpConfigured,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
