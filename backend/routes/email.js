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
      pool.query('SELECT * FROM admins WHERE id = $1', [req.admin_id]),
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

    const smtpConfigured = !!(
      process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    );

    let transporter = null;
    if (smtpConfigured) {
      transporter = nodemailer.createTransporter({
        host:   process.env.SMTP_HOST,
        port:   parseInt(process.env.SMTP_PORT) || 587,
        secure: parseInt(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    }

    const adminName  = admin.company_name || 'Your Company';
    const fromAddr   = process.env.SMTP_FROM || process.env.SMTP_USER || 'payroll@company.com';
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

        if (smtpConfigured) {
          await transporter.sendMail({
            from:    `"${adminName} Payroll" <${fromAddr}>`,
            to:      toEmail,
            subject: `Your Payslip for ${monthLabel} — ${adminName}`,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                <h2 style="color:#1B4F8A;">Payslip for ${monthLabel}</h2>
                <p>Dear ${slip.employee_name},</p>
                <p>Please find attached your salary slip for <strong>${monthLabel}</strong>.</p>
                <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                  <tr><td style="padding:8px;color:#64748b;">Net Salary</td>
                      <td style="padding:8px;font-weight:bold;">₹${(slip.net_salary || slip.salary || 0).toLocaleString('en-IN')}</td></tr>
                  <tr><td style="padding:8px;color:#64748b;">Employee ID</td>
                      <td style="padding:8px;">${slip.employee_id}</td></tr>
                </table>
                <p style="color:#64748b;font-size:12px;">This is a computer-generated payslip. Please do not reply to this email.</p>
              </div>
            `,
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
