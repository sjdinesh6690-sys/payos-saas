const express    = require('express');
const router     = express.Router();
const jwt        = require('jsonwebtoken');
const { Resend } = require('resend');
const { pool }   = require('../database');

// ── OTP store (in-memory, 5-minute TTL) ───────────────────────────────────
const otpStore = new Map(); // email → { otp, expiresAt }

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6-digit
}

function getResend() {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

async function sendOtpEmail(email, otp) {
  const resend = getResend();
  if (!resend) {
    console.log(`[super-admin 2FA] No RESEND_API_KEY. OTP for ${email}: ${otp}`);
    return;
  }
  await resend.emails.send({
    from: 'PayLeef Security <payroll@dinmind.com>',
    to:   email,
    subject: `${otp} — Your PayLeef Super Admin OTP`,
    html: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:480px;margin:0 auto;background:#f8fafc;padding:32px 24px;border-radius:16px;">
        <div style="text-align:center;margin-bottom:24px;">
          <span style="font-size:22px;font-weight:900;color:#0f172a">Pay</span><span style="font-size:22px;font-weight:900;color:#1A7A4A">Leef</span>
          <p style="font-size:11px;color:#94a3b8;letter-spacing:.08em;margin:2px 0 0">MASTER CONTROL PANEL</p>
        </div>
        <div style="background:#fff;border-radius:12px;padding:28px 24px;border:1px solid #e2e8f0;text-align:center;">
          <div style="width:48px;height:48px;background:#0f172a;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
            <span style="font-size:24px;">🔐</span>
          </div>
          <h2 style="font-size:18px;font-weight:700;color:#0f172a;margin:0 0 8px">Two-Factor Verification</h2>
          <p style="font-size:13px;color:#64748b;margin:0 0 24px">Use the code below to complete your Super Admin login. This code expires in <strong>5 minutes</strong>.</p>
          <div style="background:#0f172a;border-radius:10px;padding:20px;margin-bottom:24px;">
            <p style="font-size:36px;font-weight:900;color:#4ADE80;letter-spacing:.2em;margin:0;font-family:monospace;">${otp}</p>
          </div>
          <p style="font-size:11px;color:#94a3b8;">If you didn't request this, please secure your Super Admin credentials immediately.</p>
        </div>
        <p style="text-align:center;font-size:10px;color:#cbd5e1;margin-top:16px;">PayLeef Master Control © ${new Date().getFullYear()}</p>
      </div>
    `,
  });
}

// ── Super admin auth middleware ────────────────────────────────────────────
const superAuthCheck = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Super admin login required' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== 'super_admin') return res.status(403).json({ error: 'Access denied' });
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ── POST /login — Step 1: verify credentials, send OTP ───────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const SA_EMAIL    = process.env.SUPER_ADMIN_EMAIL    || 'admin@payos.com';
    const SA_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || 'PayLeef@Master2025';

    if (email !== SA_EMAIL || password !== SA_PASSWORD) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate and store OTP (5 min TTL)
    const otp = generateOtp();
    otpStore.set(email, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });

    // Send OTP email (fire-and-forget; if email fails, log OTP so access is never locked out)
    try { await sendOtpEmail(email, otp); } catch (e) {
      console.error('[super-admin 2FA] Email send failed:', e.message);
      console.log(`[super-admin 2FA] OTP for ${email}: ${otp}`);
    }

    // Mask email for display
    const [local, domain] = email.split('@');
    const masked = `${local.slice(0, 2)}***@${domain}`;

    res.json({ requires_otp: true, masked_email: masked });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST /verify-otp — Step 2: verify OTP, issue token ───────────────────
router.post('/verify-otp', (req, res) => {
  try {
    const { email, otp } = req.body;
    const SA_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'admin@payos.com';

    if (email !== SA_EMAIL) return res.status(401).json({ error: 'Invalid request' });

    const record = otpStore.get(email);
    if (!record) return res.status(401).json({ error: 'OTP expired or not requested. Please log in again.' });
    if (Date.now() > record.expiresAt) {
      otpStore.delete(email);
      return res.status(401).json({ error: 'OTP has expired. Please log in again.' });
    }
    if (record.otp !== String(otp).trim()) {
      return res.status(401).json({ error: 'Incorrect OTP. Please check your email.' });
    }

    // OTP verified — issue JWT
    otpStore.delete(email);
    const token = jwt.sign({ role: 'super_admin', email }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, role: 'super_admin' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /clients — all registered companies with subscription + payment data ──
router.get('/clients', superAuthCheck, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        a.id, a.company_name, a.email, a.plan, a.status,
        a.onboarding_completed, a.company_industry, a.company_size,
        a.last_active, a.created_at, a.trial_start_date, a.trial_end_date,
        a.company_phone, a.free_access_until, a.free_access_note,
        COUNT(DISTINCT e.id)::int                                                              AS employee_count,
        COUNT(DISTINCT ps.id)::int                                                             AS payslip_count,
        MAX(ps.created_at)                                                                     AS last_payslip,
        GREATEST(0, CEIL(EXTRACT(EPOCH FROM (
          COALESCE(a.trial_end_date, a.created_at + INTERVAL '30 days') - NOW()
        )) / 86400))::int                                                                      AS trial_days_remaining,
        (NOW() < COALESCE(a.trial_end_date, a.created_at + INTERVAL '30 days'))               AS trial_active,
        -- Subscription info
        sub.status                                                                             AS sub_status,
        sub.paid_until                                                                         AS sub_paid_until,
        sub.employee_limit                                                                     AS sub_employee_limit,
        -- Payment totals for this client
        COALESCE(pay_agg.total_paid, 0)::numeric                                              AS total_paid,
        COALESCE(pay_agg.payment_count, 0)::int                                               AS payment_count,
        pay_agg.last_payment_at                                                                AS last_payment_at
      FROM admins a
      LEFT JOIN employees e ON e.admin_id = a.id
      LEFT JOIN payslips  ps ON ps.admin_id = a.id
      LEFT JOIN subscriptions sub ON sub.admin_id = a.id
      LEFT JOIN (
        SELECT admin_id,
               SUM(total_amount) FILTER (WHERE status = 'success')  AS total_paid,
               COUNT(*)          FILTER (WHERE status = 'success')   AS payment_count,
               MAX(created_at)   FILTER (WHERE status = 'success')   AS last_payment_at
        FROM payments
        GROUP BY admin_id
      ) pay_agg ON pay_agg.admin_id = a.id
      GROUP BY a.id, sub.status, sub.paid_until, sub.employee_limit, pay_agg.total_paid, pay_agg.payment_count, pay_agg.last_payment_at
      ORDER BY a.created_at DESC
    `);

    const now = new Date();
    const clients = result.rows.map(a => {
      const subActive    = a.sub_status === 'active' && a.sub_paid_until && new Date(a.sub_paid_until) > now;
      const trialEnd     = a.trial_end_date || new Date(new Date(a.created_at).getTime() + 30*24*60*60*1000);
      const trialActive  = new Date(trialEnd) > now;
      const freeActive   = a.free_access_until && new Date(a.free_access_until) > now;
      const freeDaysLeft = freeActive
        ? Math.max(0, Math.ceil((new Date(a.free_access_until) - now) / (1000*60*60*24)))
        : 0;

      let accountType = 'expired';
      if (subActive)       accountType = 'paid';
      else if (freeActive) accountType = 'free';
      else if (trialActive) accountType = 'trial';

      return {
        id:                   a.id,
        company_name:         a.company_name || '—',
        email:                a.email,
        company_phone:        a.company_phone || '—',
        plan:                 a.plan         || 'starter',
        status:               a.status       || 'active',
        onboarding_completed: a.onboarding_completed || false,
        company_industry:     a.company_industry     || '—',
        company_size:         a.company_size         || '—',
        employee_count:       a.employee_count,
        payslip_count:        a.payslip_count,
        last_active:          a.last_active,
        last_payslip:         a.last_payslip,
        created_at:           a.created_at,
        trial_start_date:     a.trial_start_date,
        trial_end_date:       trialEnd,
        trial_days_remaining: a.trial_days_remaining,
        trial_active:         trialActive,
        // Free / complimentary access
        free_access_until:    a.free_access_until || null,
        free_access_note:     a.free_access_note  || null,
        free_active:          !!freeActive,
        free_days_left:       freeDaysLeft,
        // Subscription
        sub_status:           a.sub_status || 'inactive',
        sub_paid_until:       a.sub_paid_until,
        sub_employee_limit:   a.sub_employee_limit || 5,
        sub_active:           !!subActive,
        // Payment summary
        total_paid:           parseFloat(a.total_paid) || 0,
        payment_count:        a.payment_count || 0,
        last_payment_at:      a.last_payment_at,
        // Derived
        account_type:         accountType,   // 'paid' | 'free' | 'trial' | 'expired'
      };
    });

    res.json({ clients });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /clients/:id/stats — detailed stats for one client ─────────────────
router.get('/clients/:id/stats', superAuthCheck, async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const adminResult = await pool.query('SELECT * FROM admins WHERE id = $1', [id]);
    if (!adminResult.rows.length) return res.status(404).json({ error: 'Client not found' });
    const admin = adminResult.rows[0];

    const [empResult, slipResult, monthlyResult] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS total FROM employees WHERE admin_id = $1', [id]),
      pool.query('SELECT COUNT(*)::int AS total, COALESCE(SUM(net_salary), 0)::numeric AS total_net FROM payslips WHERE admin_id = $1', [id]),
      pool.query(`
        SELECT year, month, COUNT(*)::int AS count
        FROM payslips WHERE admin_id = $1
        GROUP BY year, month
        ORDER BY year DESC, month DESC
        LIMIT 12
      `, [id]),
    ]);

    const monthlyCounts = {};
    monthlyResult.rows.forEach(r => {
      const key = `${r.year}-${String(r.month).padStart(2, '0')}`;
      monthlyCounts[key] = r.count;
    });

    const { password: _pw, ...safeAdmin } = admin;

    res.json({
      admin: {
        ...safeAdmin,
        company_name: admin.company_name || '—',
      },
      stats: {
        employee_count:         empResult.rows[0].total,
        payslip_count:          slipResult.rows[0].total,
        total_salary_disbursed: parseFloat(slipResult.rows[0].total_net) || 0,
        monthly_counts:         monthlyCounts,
      },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PUT /clients/:id/status — enable / disable / change plan ──────────────
router.put('/clients/:id/status', superAuthCheck, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, plan } = req.body;

    const check = await pool.query('SELECT id FROM admins WHERE id = $1', [id]);
    if (!check.rows.length) return res.status(404).json({ error: 'Client not found' });

    const fields = [];
    const values = [];
    let idx = 1;
    if (status) { fields.push(`status = $${idx++}`); values.push(status); }
    if (plan)   { fields.push(`plan   = $${idx++}`); values.push(plan);   }
    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

    values.push(id);
    await pool.query(`UPDATE admins SET ${fields.join(', ')} WHERE id = $${idx}`, values);
    res.json({ message: 'Client updated successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PUT /clients/:id/trial — extend / activate / expire trial ────────────
router.put('/clients/:id/trial', superAuthCheck, async (req, res) => {
  try {
    const id   = parseInt(req.params.id);
    const { action, days } = req.body;  // action: 'extend' | 'activate' | 'expire'

    const check = await pool.query('SELECT * FROM admins WHERE id = $1', [id]);
    if (!check.rows.length) return res.status(404).json({ error: 'Client not found' });
    const admin = check.rows[0];

    const now       = new Date();
    const extraDays = parseInt(days) || 30;
    let updates = {};

    if (action === 'extend') {
      const currentEnd = new Date(admin.trial_end_date || now);
      const base       = currentEnd > now ? currentEnd : now;
      updates.trial_end_date = new Date(base.getTime() + extraDays * 24 * 60 * 60 * 1000);
    } else if (action === 'activate') {
      updates.trial_start_date = now;
      updates.trial_end_date   = new Date(now.getTime() + extraDays * 24 * 60 * 60 * 1000);
      updates.trial_days       = extraDays;
    } else if (action === 'expire') {
      updates.trial_end_date = new Date(now.getTime() - 1000);
    } else {
      return res.status(400).json({ error: 'Invalid action. Use extend | activate | expire' });
    }

    const fields = Object.keys(updates).map((k, i) => `${k} = $${i + 1}`);
    const values = [...Object.values(updates), id];
    await pool.query(`UPDATE admins SET ${fields.join(', ')} WHERE id = $${fields.length + 1}`, values);

    res.json({ message: 'Trial updated successfully', updates });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /stats — platform-wide overview + revenue ────────────────────────────
router.get('/stats', superAuthCheck, async (req, res) => {
  try {
    const now   = new Date();
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();

    const [clients, employees, payslips, thisMonth, signups, revenue, subStats, expiring] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)::int                                                AS total,
          COUNT(*) FILTER (WHERE status = 'active')::int              AS active,
          COUNT(*) FILTER (WHERE status = 'suspended')::int           AS suspended
        FROM admins
      `),
      pool.query('SELECT COUNT(*)::int AS total FROM employees WHERE status = \'active\' OR status IS NULL'),
      pool.query(`
        SELECT
          COUNT(*)::int                            AS total,
          COALESCE(SUM(net_salary), 0)::numeric    AS total_disbursed
        FROM payslips
      `),
      pool.query(
        'SELECT COUNT(*)::int AS total FROM payslips WHERE month = $1 AND year = $2',
        [month, year]
      ),
      pool.query(`
        SELECT
          TO_CHAR(created_at, 'YYYY-MM') AS month_key,
          COUNT(*)::int                  AS count
        FROM admins
        WHERE created_at >= NOW() - INTERVAL '6 months'
        GROUP BY month_key
        ORDER BY month_key
      `),
      // Revenue: total collected via Razorpay (success payments)
      pool.query(`
        SELECT
          COALESCE(SUM(total_amount) FILTER (WHERE status = 'success'), 0)::numeric AS total_revenue,
          COALESCE(SUM(total_amount) FILTER (WHERE status = 'success' AND created_at >= DATE_TRUNC('month', NOW())), 0)::numeric AS revenue_this_month,
          COALESCE(SUM(total_amount) FILTER (WHERE status = 'success' AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
                                                                       AND created_at <  DATE_TRUNC('month', NOW())), 0)::numeric AS revenue_last_month,
          COUNT(*) FILTER (WHERE status = 'success')::int AS successful_payments
        FROM payments
      `),
      // Subscription health
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE s.status = 'active' AND s.paid_until > NOW())::int  AS paid_clients,
          COUNT(*) FILTER (WHERE s.status != 'active' OR s.paid_until <= NOW())::int AS lapsed_clients
        FROM subscriptions s
      `),
      // Subscriptions expiring in next 7 days
      pool.query(`
        SELECT a.id, a.company_name, a.email, sub.paid_until, sub.employee_limit
        FROM subscriptions sub
        JOIN admins a ON a.id = sub.admin_id
        WHERE sub.status = 'active'
          AND sub.paid_until BETWEEN NOW() AND NOW() + INTERVAL '7 days'
        ORDER BY sub.paid_until ASC
        LIMIT 10
      `),
    ]);

    const signupsByMonth = {};
    signups.rows.forEach(r => { signupsByMonth[r.month_key] = r.count; });

    // Client breakdown by account type
    const allAdmins = await pool.query(`
      SELECT
        a.id, a.trial_end_date, a.created_at,
        sub.status AS sub_status, sub.paid_until
      FROM admins a
      LEFT JOIN subscriptions sub ON sub.admin_id = a.id
    `);
    let paidCount = 0, trialCount = 0, expiredCount = 0;
    for (const a of allAdmins.rows) {
      const subActive = a.sub_status === 'active' && a.paid_until && new Date(a.paid_until) > now;
      const trialEnd  = a.trial_end_date || new Date(new Date(a.created_at).getTime() + 30*24*60*60*1000);
      if (subActive)              paidCount++;
      else if (new Date(trialEnd) > now) trialCount++;
      else                        expiredCount++;
    }

    res.json({
      total_clients:       clients.rows[0].total,
      active_clients:      clients.rows[0].active,
      suspended_clients:   clients.rows[0].suspended,
      paid_clients:        paidCount,
      trial_clients:       trialCount,
      expired_clients:     expiredCount,
      total_employees:     employees.rows[0].total,
      total_payslips:      payslips.rows[0].total,
      payslips_this_month: thisMonth.rows[0].total,
      total_disbursed:     parseFloat(payslips.rows[0].total_disbursed) || 0,
      signups_by_month:    signupsByMonth,
      // Revenue
      total_revenue:       parseFloat(revenue.rows[0].total_revenue) || 0,
      revenue_this_month:  parseFloat(revenue.rows[0].revenue_this_month) || 0,
      revenue_last_month:  parseFloat(revenue.rows[0].revenue_last_month) || 0,
      successful_payments: revenue.rows[0].successful_payments,
      // Subscriptions expiring soon
      expiring_soon:       expiring.rows,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET /payments — all platform payments ────────────────────────────────────
router.get('/payments', superAuthCheck, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        pay.id, pay.admin_id, pay.payment_type, pay.employee_slots,
        pay.base_amount, pay.gst_amount, pay.total_amount, pay.status,
        pay.razorpay_payment_id, pay.razorpay_order_id, pay.notes, pay.created_at,
        a.company_name, a.email
      FROM payments pay
      JOIN admins a ON a.id = pay.admin_id
      ORDER BY pay.created_at DESC
      LIMIT 200
    `);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PUT /clients/:id/subscription — grant or extend paid subscription ─────────
router.put('/clients/:id/subscription', superAuthCheck, async (req, res) => {
  try {
    const id     = parseInt(req.params.id);
    const { months = 1, employee_limit = 5 } = req.body;

    const check = await pool.query('SELECT id FROM admins WHERE id = $1', [id]);
    if (!check.rows.length) return res.status(404).json({ error: 'Client not found' });

    const now = new Date();
    const existing = await pool.query('SELECT * FROM subscriptions WHERE admin_id = $1', [id]);

    if (existing.rows.length) {
      const cur    = existing.rows[0];
      const base   = cur.status === 'active' && new Date(cur.paid_until) > now ? new Date(cur.paid_until) : now;
      const newEnd = new Date(base);
      newEnd.setMonth(newEnd.getMonth() + parseInt(months));

      await pool.query(
        `UPDATE subscriptions
         SET status = 'active', paid_until = $1,
             employee_limit = GREATEST(employee_limit, $2), updated_at = NOW()
         WHERE admin_id = $3`,
        [newEnd, employee_limit, id]
      );
    } else {
      const newEnd = new Date(now);
      newEnd.setMonth(newEnd.getMonth() + parseInt(months));
      await pool.query(
        `INSERT INTO subscriptions (admin_id, employee_limit, paid_until, status)
         VALUES ($1, $2, $3, 'active')`,
        [id, employee_limit, newEnd]
      );
    }

    res.json({ success: true, message: `Subscription granted for ${months} month(s)` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PUT /clients/:id/free-access — grant complimentary access for a period ───
router.put('/clients/:id/free-access', superAuthCheck, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { months = 1, note = '' } = req.body;   // months: 1 | 3 | 6 | 12 | 24

    const check = await pool.query('SELECT id FROM admins WHERE id = $1', [id]);
    if (!check.rows.length) return res.status(404).json({ error: 'Client not found' });

    const now    = new Date();
    const newEnd = new Date(now);
    newEnd.setMonth(newEnd.getMonth() + parseInt(months));

    await pool.query(
      `UPDATE admins
       SET free_access_until = $1,
           free_access_note  = $2
       WHERE id = $3`,
      [newEnd, note.trim() || null, id]
    );

    res.json({
      success: true,
      message: `Complimentary access granted until ${newEnd.toDateString()}`,
      free_access_until: newEnd,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE /clients/:id/free-access — revoke complimentary access ─────────────
router.delete('/clients/:id/free-access', superAuthCheck, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await pool.query(
      `UPDATE admins SET free_access_until = NULL, free_access_note = NULL WHERE id = $1`,
      [id]
    );
    res.json({ success: true, message: 'Complimentary access revoked' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
