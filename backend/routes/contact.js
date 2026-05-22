// contact.js — handles website enquiry form → email to dinesh@dinmind.in

const express    = require('express');
const { Resend } = require('resend');
const router     = express.Router();

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

// POST /api/contact — landing page enquiry form (demo request OR customisation)
router.post('/', async (req, res) => {
  const { name, phone, email, company, employees, industry, problem, requirements, type } = req.body;

  if (!name || !phone || !company) {
    return res.status(400).json({ error: 'Name, phone, and company are required.' });
  }

  const isCustom = type === 'customisation';
  const resend   = getResend();
  if (!resend) {
    console.log('[contact] No RESEND_API_KEY — enquiry not emailed:', req.body);
    return res.json({ success: true });
  }

  const now = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
  const waNum = (phone || '').replace(/[^0-9]/g, '');

  const subjectIcon  = isCustom ? '🛠️' : '🔔';
  const subjectLabel = isCustom ? 'Customisation Request' : 'New Demo Request';
  const headerLabel  = isCustom ? 'Customisation Request' : 'New Website Enquiry';
  const headerColor  = isCustom ? '#7c3aed' : '#1A7A4A';

  const rows = [
    { label: 'Name',        value: name },
    { label: 'Phone',       value: `<a href="tel:${phone}" style="color:${headerColor};text-decoration:none">${phone}</a>` },
    email ? { label: 'Email', value: `<a href="mailto:${email}" style="color:${headerColor};text-decoration:none">${email}</a>` } : null,
    { label: 'Company',     value: company },
    employees ? { label: 'Employees',  value: employees } : null,
    industry  ? { label: 'Industry',   value: industry }  : null,
    isCustom && requirements
      ? { label: 'Custom Requirements', value: requirements }
      : !isCustom && problem
      ? { label: 'Main Challenge', value: problem }
      : null,
  ].filter(Boolean);

  const rowsHtml = rows.map(r => `
    <tr style="border-bottom:1px solid #f1f5f9">
      <td style="padding:10px 0;font-size:13px;color:#64748b;font-weight:600;width:160px;vertical-align:top">${r.label}</td>
      <td style="padding:10px 0;font-size:14px;font-weight:700;color:#0f172a">${r.value}</td>
    </tr>`).join('');

  try {
    await resend.emails.send({
      from:    'PayLeef Enquiries <support@dinmind.com>',
      to:      ['dinesh@dinmind.in'],
      subject: `${subjectIcon} ${subjectLabel} — ${company} (${employees || '?'} employees)`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#f8fafc;padding:32px;border-radius:16px">
          <div style="background:linear-gradient(135deg,#0F172A,#1E293B);border-radius:12px;padding:28px;margin-bottom:24px;text-align:center">
            <div style="font-size:28px;font-weight:900;letter-spacing:-.04em">
              <span style="color:#fff">Pay</span><span style="color:#4ADE80">Leef</span>
            </div>
            <div style="color:rgba(255,255,255,.5);font-size:13px;margin-top:4px">${headerLabel}</div>
          </div>
          <div style="background:#fff;border-radius:12px;padding:24px;border:1px solid #e2e8f0;margin-bottom:16px">
            <h2 style="font-size:18px;font-weight:800;color:#0f172a;margin:0 0 20px">📋 Enquiry Details</h2>
            <table style="width:100%;border-collapse:collapse">${rowsHtml}</table>
          </div>
          <div style="background:rgba(26,122,74,.07);border:1px solid rgba(26,122,74,.2);border-radius:10px;padding:16px;text-align:center;margin-bottom:20px">
            <div style="font-size:13px;color:#1A7A4A;font-weight:700">⏰ Received at ${now} IST</div>
            <div style="font-size:12px;color:#64748b;margin-top:4px">Reply within 10 minutes for best conversion</div>
          </div>
          ${waNum ? `
          <div style="text-align:center">
            <a href="https://wa.me/91${waNum}?text=Hi%20${encodeURIComponent(name.split(' ')[0])}%2C%20thank%20you%20for%20reaching%20out%20to%20PayLeef!%20I%20am%20Dinesh%2C%20let%20me%20understand%20your%20requirements."
               style="display:inline-block;background:#25D366;color:#fff;font-size:14px;font-weight:700;padding:13px 32px;border-radius:10px;text-decoration:none">
              💬 WhatsApp ${name.split(' ')[0]} Now
            </a>
          </div>` : ''}
          <div style="margin-top:20px;text-align:center;font-size:12px;color:#94a3b8">
            PayLeef · payleef.com
          </div>
        </div>
      `,
    });

    console.log(`[contact] ${isCustom ? 'Customisation' : 'Demo'} enquiry sent — ${name} / ${company}`);
    res.json({ success: true });
  } catch (err) {
    console.error('[contact] Resend error:', err.message);
    res.json({ success: true });
  }
});

module.exports = router;
