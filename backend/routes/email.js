// email.js — sends payslips via Resend HTTP API (SMTP is blocked on Render)
const express    = require('express');
const { Resend } = require('resend');
const router     = express.Router();
const PDFDocument = require('pdfkit');
const { pool }   = require('../database');
const authCheck  = require('../middleware/auth');
const { renderPayslipPDF } = require('../lib/pdfTemplates');

router.use(authCheck);

// Lazy Resend init (same pattern as auth.js)
function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

// Build PDF buffer in memory — never writes to disk
function buildPayslipPDFBuffer(p, branding, admin) {
  return new Promise((resolve, reject) => {
    try {
      const doc    = new PDFDocument({ size: 'A4', margin: 40 });
      const chunks = [];
      doc.on('data',  c => chunks.push(c));
      doc.on('end',   ()  => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
      renderPayslipPDF(doc, p, branding || {}, admin || {});
      doc.end();
    } catch (err) { reject(err); }
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
        `SELECT p.*, e.email AS employee_email
           FROM payslips p
           LEFT JOIN employees e ON e.employee_id = p.employee_id AND e.admin_id = p.admin_id
          WHERE p.admin_id = $1 AND p.month = $2 AND p.year = $3 AND p.emailed = false`,
        [req.admin_id, parseInt(month), parseInt(year)]
      ),
    ]);

    const admin    = adminResult.rows[0] || {};
    const branding = cfgResult.rows[0]?.branding || {};
    const slips    = slipsResult.rows;

    if (slips.length === 0) {
      return res.json({ message: 'No pending payslips (all already sent or none generated)', sent: 0, failed: 0 });
    }

    const resend = getResend();
    if (!resend) {
      return res.status(503).json({
        error: 'Email service not configured. Please contact PayLeef support.',
      });
    }

    const companyName = admin.company_name || 'Your Company';
    const replyTo     = admin.company_email || undefined;
    const brandColor  = admin.brand_color || '#1A7A4A';
    const monthLabel  = new Date(parseInt(year), parseInt(month) - 1)
      .toLocaleString('en-IN', { month: 'long', year: 'numeric' });

    // Subject template (customisable per admin)
    const subjectTpl = admin.email_subject || 'Your Salary Slip for {month} — {company}';

    let sent = 0, failed = 0, noEmail = 0;

    for (const slip of slips) {
      const toEmail = slip.employee_email;

      if (!toEmail) {
        console.log(`[email] No email for ${slip.employee_id} — skipping`);
        noEmail++;
        failed++;
        continue;
      }

      try {
        const pdfBuffer = await buildPayslipPDFBuffer(slip, branding, admin);

        const subject = subjectTpl
          .replace(/{month}/g,    monthLabel)
          .replace(/{company}/g,  companyName)
          .replace(/{employee}/g, slip.employee_name);

        // Custom body template or default
        const customBody = admin.email_body
          ? admin.email_body
              .replace(/{month}/g,       monthLabel)
              .replace(/{company}/g,     companyName)
              .replace(/{employee}/g,    slip.employee_name)
              .replace(/{employee_id}/g, slip.employee_id)
              .replace(/{net_salary}/g,  `₹${(slip.net_salary || slip.salary || 0).toLocaleString('en-IN')}`)
          : null;

        const htmlBody = customBody || `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:0;">
            <div style="background:${brandColor};padding:28px 32px;border-radius:12px 12px 0 0;">
              <div style="font-size:24px;font-weight:900;color:#fff;letter-spacing:-.04em;">
                Pay<span style="color:#4ADE80;">Leef</span>
              </div>
              <div style="color:rgba(255,255,255,.6);font-size:13px;margin-top:4px;">${companyName}</div>
            </div>

            <div style="background:#ffffff;padding:32px;border:1px solid #e2e8f0;border-top:none;">
              <h2 style="font-size:20px;font-weight:800;color:#0f172a;margin:0 0 8px;">
                Your Salary Slip — ${monthLabel}
              </h2>
              <p style="color:#64748b;font-size:15px;margin:0 0 24px;">
                Dear <strong style="color:#0f172a;">${slip.employee_name}</strong>, your salary slip for
                <strong>${monthLabel}</strong> is attached to this email.
              </p>

              <div style="background:#f8fafc;border-radius:10px;padding:20px;border:1px solid #e2e8f0;margin-bottom:24px;">
                <table style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td style="padding:8px 0;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9;">Employee ID</td>
                    <td style="padding:8px 0;font-size:13px;font-weight:600;color:#0f172a;text-align:right;border-bottom:1px solid #f1f5f9;">${slip.employee_id}</td>
                  </tr>
                  <tr>
                    <td style="padding:8px 0;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9;">Pay Period</td>
                    <td style="padding:8px 0;font-size:13px;font-weight:600;color:#0f172a;text-align:right;border-bottom:1px solid #f1f5f9;">${monthLabel}</td>
                  </tr>
                  <tr>
                    <td style="padding:12px 0 8px;font-size:13px;color:#64748b;font-weight:600;">Net Salary</td>
                    <td style="padding:12px 0 8px;font-size:22px;font-weight:900;color:${brandColor};text-align:right;">
                      ₹${(slip.net_salary || slip.salary || 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                </table>
              </div>

              <p style="color:#64748b;font-size:13px;margin:0;">
                Your complete salary breakdown is in the attached PDF. You can also log in to the
                employee portal to view all your payslips anytime.
              </p>
            </div>

            <div style="background:#f8fafc;padding:20px 32px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:none;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;">
                This is an automated email from ${companyName} via PayLeef.<br/>
                Please do not reply to this email.
              </p>
            </div>
          </div>
        `;

        await resend.emails.send({
          from:        `${companyName} Payroll <payroll@dinmind.com>`,
          to:          [toEmail],
          reply_to:    replyTo,
          subject:     subject,
          html:        htmlBody,
          attachments: [{
            filename:    `Payslip_${slip.employee_id}_${slip.year}-${String(slip.month).padStart(2,'0')}.pdf`,
            content:     pdfBuffer.toString('base64'),
          }],
        });

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

    const parts = [`${sent} payslip${sent !== 1 ? 's' : ''} sent successfully`];
    if (noEmail)  parts.push(`${noEmail} skipped (no email address)`);
    if (failed - noEmail > 0) parts.push(`${failed - noEmail} failed`);

    res.json({ message: parts.join(' · '), sent, failed });
  } catch (err) {
    console.error('[email/send]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/email/test — send a test email via Resend (replaces broken SMTP test)
router.post('/test', async (req, res) => {
  try {
    const { to } = req.body;
    if (!to) return res.status(400).json({ error: 'Please provide a test email address.' });

    const resend = getResend();
    if (!resend) {
      return res.status(503).json({ error: 'Email service not configured. Please contact PayLeef support.' });
    }

    const adminResult = await pool.query('SELECT company_name, brand_color FROM admins WHERE id = $1', [req.admin_id]);
    const admin = adminResult.rows[0] || {};
    const companyName = admin.company_name || 'Your Company';
    const brandColor  = admin.brand_color || '#1A7A4A';

    await resend.emails.send({
      from:    `${companyName} Payroll <payroll@dinmind.com>`,
      to:      [to],
      subject: '✅ PayLeef Email Test — Working!',
      html:    `
        <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px;">
          <div style="background:${brandColor};padding:20px 24px;border-radius:8px;margin-bottom:20px;">
            <div style="font-size:22px;font-weight:900;color:#fff;">Pay<span style="color:#4ADE80;">Leef</span></div>
          </div>
          <h2 style="color:#16a34a;margin:0 0 12px;">✅ Email delivery is working!</h2>
          <p style="color:#334155;margin:0 0 8px;">Your payslip emails will be delivered reliably via PayLeef's email system.</p>
          <p style="color:#64748b;font-size:13px;margin:0;">Company: <strong>${companyName}</strong></p>
        </div>
      `,
    });

    res.json({ message: `Test email sent to ${to} — check your inbox!` });
  } catch (err) {
    console.error('[email/test]', err.message);
    res.status(500).json({ error: 'Failed to send test email. Please try again.' });
  }
});

module.exports = router;
