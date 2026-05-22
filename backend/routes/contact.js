// contact.js — handles website enquiry form → email to dinesh@dinmind.in

const express    = require('express');
const { Resend } = require('resend');
const router     = express.Router();

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

// POST /api/contact  — landing page demo request form
router.post('/', async (req, res) => {
  const { name, phone, company, employees, problem } = req.body;

  // Basic validation
  if (!name || !phone || !company) {
    return res.status(400).json({ error: 'Name, phone, and company are required.' });
  }

  const resend = getResend();
  if (!resend) {
    console.log('[contact] No RESEND_API_KEY — enquiry not emailed:', req.body);
    // Still return success so user isn't blocked
    return res.json({ success: true });
  }

  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

  try {
    await resend.emails.send({
      from: 'PayLeef Enquiries <support@dinmind.com>',
      to:   ['dinesh@dinmind.in'],
      reply_to: phone ? undefined : undefined,
      subject: `🔔 New Demo Request — ${company} (${employees || 'unknown'} employees)`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#f8fafc;padding:32px;border-radius:16px">

          <div style="background:linear-gradient(135deg,#0F172A,#1E293B);border-radius:12px;padding:28px;margin-bottom:24px;text-align:center">
            <div style="font-size:28px;font-weight:900;letter-spacing:-.04em">
              <span style="color:#fff">Pay</span><span style="color:#4ADE80">Leef</span>
            </div>
            <div style="color:rgba(255,255,255,.5);font-size:13px;margin-top:4px">New Website Enquiry</div>
          </div>

          <div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #e2e8f0;margin-bottom:16px">
            <h2 style="font-size:18px;font-weight:800;color:#0f172a;margin:0 0 20px">📋 Enquiry Details</h2>

            <table style="width:100%;border-collapse:collapse">
              <tr style="border-bottom:1px solid #f1f5f9">
                <td style="padding:10px 0;font-size:13px;color:#64748b;font-weight:600;width:140px">Name</td>
                <td style="padding:10px 0;font-size:14px;font-weight:700;color:#0f172a">${name}</td>
              </tr>
              <tr style="border-bottom:1px solid #f1f5f9">
                <td style="padding:10px 0;font-size:13px;color:#64748b;font-weight:600">Phone</td>
                <td style="padding:10px 0;font-size:14px;font-weight:700;color:#0f172a">
                  <a href="tel:${phone}" style="color:#1A7A4A;text-decoration:none">${phone}</a>
                </td>
              </tr>
              <tr style="border-bottom:1px solid #f1f5f9">
                <td style="padding:10px 0;font-size:13px;color:#64748b;font-weight:600">Company</td>
                <td style="padding:10px 0;font-size:14px;font-weight:700;color:#0f172a">${company}</td>
              </tr>
              <tr style="border-bottom:1px solid #f1f5f9">
                <td style="padding:10px 0;font-size:13px;color:#64748b;font-weight:600">Employees</td>
                <td style="padding:10px 0;font-size:14px;font-weight:700;color:#0f172a">${employees || 'Not specified'}</td>
              </tr>
              <tr>
                <td style="padding:10px 0;font-size:13px;color:#64748b;font-weight:600">Main Problem</td>
                <td style="padding:10px 0;font-size:14px;font-weight:700;color:#0f172a">${problem || 'Not specified'}</td>
              </tr>
            </table>
          </div>

          <div style="background:rgba(26,122,74,.07);border:1px solid rgba(26,122,74,.2);border-radius:10px;padding:16px;text-align:center;margin-bottom:16px">
            <div style="font-size:13px;color:#1A7A4A;font-weight:700">⏰ Received at ${now} IST</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px">Reply within 10 minutes for best conversion</div>
          </div>

          <div style="text-align:center">
            <a href="https://wa.me/${phone ? phone.replace(/[^0-9]/g,'') : ''}"
               style="display:inline-block;background:#25D366;color:#fff;font-size:14px;font-weight:700;padding:12px 28px;border-radius:10px;text-decoration:none">
              💬 WhatsApp ${name.split(' ')[0]} Now
            </a>
          </div>

          <div style="margin-top:20px;text-align:center;font-size:12px;color:#94a3b8">
            PayLeef · payleef.com · dinmind.com
          </div>
        </div>
      `,
    });

    console.log(`[contact] Enquiry email sent for ${name} / ${company}`);
    res.json({ success: true });
  } catch (err) {
    console.error('[contact] Resend error:', err.message);
    // Still return success — don't block the user
    res.json({ success: true });
  }
});

module.exports = router;
