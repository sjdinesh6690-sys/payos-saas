const express    = require('express');
const router     = express.Router();
const { Resend } = require('resend');
const { pool, auditLog } = require('../database');
const authCheck  = require('../middleware/auth');

router.use(authCheck);

// ── Send profile-update confirmation to admin ─────────────────────────────────
async function sendAdminProfileUpdateEmail({ toEmail, companyName, changedFields }) {
  if (!process.env.RESEND_API_KEY || !toEmail) return;
  const LABELS = {
    company_name: 'Company Name', company_address: 'Address', company_phone: 'Phone',
    company_email: 'Company Email', company_website: 'Website', company_gstin: 'GSTIN',
    company_industry: 'Industry', company_size: 'Company Size',
    pan_number: 'PAN Number', tan_number: 'TAN Number',
    epfo_code: 'EPFO Code', esic_code: 'ESIC Code', pt_reg_number: 'PT Reg Number',
    state: 'State',
  };
  const changeList = changedFields.map(f => LABELS[f] || f).join(', ');
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from:    `PayLeef <payroll@dinmind.com>`,
      to:      [toEmail],
      subject: `Company profile updated — ${companyName}`,
      html: `
        <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;margin:0 auto;">
          <div style="background:#1A7A4A;padding:24px 28px;border-radius:10px 10px 0 0;">
            <div style="font-size:20px;font-weight:900;color:#fff;letter-spacing:-.04em;">Pay<span style="color:#4ADE80;">Leef</span></div>
            <div style="color:rgba(255,255,255,.6);font-size:12px;margin-top:2px;">${companyName}</div>
          </div>
          <div style="background:#fff;padding:28px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;">
            <p style="font-size:15px;font-weight:700;color:#0f172a;margin:0 0 12px;">Company profile updated</p>
            <p style="color:#334155;font-size:14px;margin:0 0 16px;">
              Your PayLeef company profile was just updated. The following fields were changed:
            </p>
            <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 18px;margin-bottom:16px;">
              <p style="font-size:13px;font-weight:700;color:#166534;margin:0;">Updated: ${changeList}</p>
            </div>
            <p style="color:#64748b;font-size:12px;margin:0;">
              If you did not make this change, please secure your account immediately.
            </p>
          </div>
        </div>`,
    });
  } catch (e) { console.warn('[admin-profile-email] Failed:', e.message); }
}

// ── GET /profile ──────────────────────────────────────────────────────────────
router.get('/profile', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM admins WHERE id = $1', [req.admin_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Admin not found' });
    const { password, ...safe } = result.rows[0];
    res.json({ admin: safe });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PUT /profile ──────────────────────────────────────────────────────────────
router.put('/profile', async (req, res) => {
  try {
    const allowed = [
      'company_name','company_address','company_phone','company_email',
      'company_website','company_gstin','company_industry','company_size',
      'pan_number','tan_number','epfo_code','esic_code','pt_reg_number','state',
    ];
    const fields = [];
    const values = [];
    let idx = 1;

    allowed.forEach(k => {
      if (req.body[k] !== undefined) {
        fields.push(`${k} = $${idx++}`);
        values.push(req.body[k]);
      }
    });
    fields.push(`last_active = $${idx++}`);
    values.push(new Date());
    values.push(req.admin_id);

    await pool.query(
      `UPDATE admins SET ${fields.join(', ')} WHERE id = $${idx}`,
      values
    );
    await auditLog(req.admin_id, 'profile_updated', 'admins', req.admin_id, null, req.ip);

    // Send confirmation email to admin's login address (async — don't block response)
    const adminRow = await pool.query('SELECT email, company_name FROM admins WHERE id = $1', [req.admin_id]);
    const admin = adminRow.rows[0] || {};
    sendAdminProfileUpdateEmail({
      toEmail:      admin.email,
      companyName:  req.body.company_name || admin.company_name || 'Your Company',
      changedFields: allowed.filter(k => req.body[k] !== undefined),
    }).catch(() => {});

    res.json({ message: 'Profile updated successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /trial ────────────────────────────────────────────────────────────────
router.get('/trial', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT trial_end_date, trial_start_date, trial_days, plan, status,
              free_access_until, free_access_note
       FROM admins WHERE id = $1`,
      [req.admin_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Admin not found' });
    const admin = result.rows[0];

    const now         = new Date();
    const trialEnd    = new Date(admin.trial_end_date || now);
    const trialActive = now < trialEnd && (admin.status || 'active') === 'active';
    const freeActive  = admin.free_access_until
                        && now < new Date(admin.free_access_until)
                        && (admin.status || 'active') === 'active';
    const isPaid      = admin.plan && admin.plan !== 'starter';

    // days_remaining shows whichever active window is longest
    let daysLeft = 0;
    if (freeActive) {
      daysLeft = Math.max(0, Math.ceil((new Date(admin.free_access_until) - now) / (1000*60*60*24)));
    } else if (trialActive) {
      daysLeft = Math.max(0, Math.ceil((trialEnd - now) / (1000*60*60*24)));
    }

    const isReadOnly = !trialActive && !isPaid && !freeActive;

    res.json({
      trial_active:      trialActive,
      days_remaining:    daysLeft,
      trial_start_date:  admin.trial_start_date || null,
      trial_end_date:    admin.trial_end_date   || null,
      trial_days:        admin.trial_days        || 30,
      plan:              admin.plan              || 'starter',
      status:            admin.status            || 'active',
      is_paid:           isPaid,
      is_read_only:      isReadOnly,
      // Free / complimentary access (set by super admin)
      is_free_access:    !!freeActive,
      free_access_until: admin.free_access_until || null,
      free_access_note:  admin.free_access_note  || null,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /onboarding ───────────────────────────────────────────────────────────
router.get('/onboarding', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT onboarding_completed, company_name, company_industry, company_size FROM admins WHERE id = $1',
      [req.admin_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Admin not found' });
    const admin = result.rows[0];
    res.json({
      onboarding_completed: admin.onboarding_completed || false,
      company_name:         admin.company_name || '',
      company_industry:     admin.company_industry || '',
      company_size:         admin.company_size || '',
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PUT /onboarding/complete ──────────────────────────────────────────────────
router.put('/onboarding/complete', async (req, res) => {
  try {
    await pool.query(
      'UPDATE admins SET onboarding_completed = true, last_active = NOW() WHERE id = $1',
      [req.admin_id]
    );
    await auditLog(req.admin_id, 'onboarding_completed', 'admins', req.admin_id, null, req.ip);
    res.json({ message: 'Onboarding completed' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PUT /onboarding/step ──────────────────────────────────────────────────────
router.put('/onboarding/step', async (req, res) => {
  try {
    const allowed = [
      'company_name','company_address','company_phone','company_email',
      'company_website','company_gstin','company_industry','company_size',
    ];
    const fields = [];
    const values = [];
    let idx = 1;

    allowed.forEach(k => {
      if (req.body[k] !== undefined) {
        fields.push(`${k} = $${idx++}`);
        values.push(req.body[k]);
      }
    });

    if (fields.length) {
      values.push(req.admin_id);
      await pool.query(`UPDATE admins SET ${fields.join(', ')} WHERE id = $${idx}`, values);
    }
    res.json({ message: 'Step saved' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
