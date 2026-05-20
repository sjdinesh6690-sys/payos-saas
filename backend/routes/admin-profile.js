const express    = require('express');
const router     = express.Router();
const { pool, auditLog } = require('../database');
const authCheck  = require('../middleware/auth');

router.use(authCheck);

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
    res.json({ message: 'Profile updated successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /trial ────────────────────────────────────────────────────────────────
router.get('/trial', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT trial_end_date, trial_start_date, trial_days, plan, status FROM admins WHERE id = $1',
      [req.admin_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Admin not found' });
    const admin = result.rows[0];

    const now         = new Date();
    const trialEnd    = new Date(admin.trial_end_date || now);
    const daysLeft    = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
    const trialActive = now < trialEnd && (admin.status || 'active') === 'active';
    const isPaid      = admin.plan && admin.plan !== 'starter';
    const isReadOnly  = !trialActive && !isPaid;

    res.json({
      trial_active:     trialActive,
      days_remaining:   daysLeft,
      trial_start_date: admin.trial_start_date || null,
      trial_end_date:   admin.trial_end_date   || null,
      trial_days:       admin.trial_days        || 30,
      plan:             admin.plan              || 'starter',
      status:           admin.status            || 'active',
      is_paid:          isPaid,
      is_read_only:     isReadOnly,
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
