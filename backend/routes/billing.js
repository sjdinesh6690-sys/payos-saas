// billing.js — Razorpay payment + subscription management for PayLeef
// Pricing:
//   Base plan  : ₹999 + 18% GST = ₹1,179 / month  → 5 employee slots
//   Top-up     : ₹75/slot + 18% GST, minimum 10 slots = ₹885 per pack

const express   = require('express');
const crypto    = require('crypto');
const router    = express.Router();
const { pool }  = require('../database');
const authCheck = require('../middleware/auth');

router.use(authCheck);

// ── Pricing constants ────────────────────────────────────────────────────────
const GST_RATE           = 0.18;
const BASE_PLAN_PRICE    = 999;   // ₹ before GST
const BASE_PLAN_SLOTS    = 5;
const TOPUP_PRICE_PER_SLOT = 75;  // ₹ per slot before GST
const MIN_TOPUP_SLOTS    = 10;

function calcAmounts(base) {
  const gst   = Math.round(base * GST_RATE * 100) / 100;
  const total = Math.round((base + gst) * 100) / 100;
  return { base_amount: base, gst_amount: gst, total_amount: total,
           razorpay_paise: Math.round(total * 100) };
}

// ── GET /api/billing/status ───────────────────────────────────────────────────
// Returns current plan status, employee count, trial info — clean and accurate
router.get('/status', async (req, res) => {
  try {
    const adminId = req.admin_id;
    const now     = new Date();

    // Admin info
    const adminRes = await pool.query(
      `SELECT created_at, trial_start_date, trial_end_date, trial_days, company_name
       FROM admins WHERE id = $1`,
      [adminId]
    );
    const admin = adminRes.rows[0] || {};

    // Trial: end date = trial_end_date (set on signup) OR created_at + 30 days fallback
    const trialEnd = admin.trial_end_date
      ? new Date(admin.trial_end_date)
      : new Date(new Date(admin.created_at).getTime() + 30 * 24 * 60 * 60 * 1000);

    const trialDaysLeft  = Math.max(0, Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24)));
    const trialActive    = trialDaysLeft > 0;

    // Trial start = trial_start_date or created_at
    const trialStart = admin.trial_start_date
      ? new Date(admin.trial_start_date)
      : new Date(admin.created_at);

    // Subscription info (paid plan)
    const subRes = await pool.query(
      'SELECT * FROM subscriptions WHERE admin_id = $1',
      [adminId]
    );
    const sub       = subRes.rows[0];
    const subActive = sub && sub.status === 'active' && new Date(sub.paid_until) > now;

    // Active employee count
    const empRes = await pool.query(
      `SELECT COUNT(*) AS cnt FROM employees
       WHERE admin_id = $1 AND (status = 'active' OR status IS NULL)`,
      [adminId]
    );
    const employeeCount = parseInt(empRes.rows[0].cnt);

    // ── Determine what to show ────────────────────────────────────────────────
    // Priority: paid subscription > free trial > expired
    let planLabel    = 'Trial Ended';
    let paidUntil    = null;
    let daysLeft     = 0;
    let isFreeTrial  = false;

    if (subActive) {
      // Paid plan — show subscription expiry, ignore trial countdown
      planLabel   = 'PayLeef Pro';
      paidUntil   = sub.paid_until;
      const subDays = Math.max(0, Math.ceil((new Date(sub.paid_until) - now) / (1000 * 60 * 60 * 24)));
      daysLeft    = subDays;
      isFreeTrial = false;
    } else if (trialActive) {
      // Free trial — show trial countdown
      planLabel   = 'Free Trial';
      paidUntil   = trialEnd.toISOString();
      daysLeft    = trialDaysLeft;
      isFreeTrial = true;
    }

    res.json({
      plan_label:           planLabel,
      sub_active:           !!subActive,
      trial_active:         !!trialActive,
      is_free_trial:        isFreeTrial,
      trial_days_left:      trialDaysLeft,
      days_left:            daysLeft,          // unified days left (trial or subscription)
      employee_count:       employeeCount,
      employee_limit:       subActive ? sub.employee_limit : 0,  // 0 = unlimited (trial)
      can_generate:         subActive || trialActive,            // no slot restriction
      paid_until:           paidUntil,
      trial_started_on:     trialStart.toISOString(),
      trial_ends_on:        trialEnd.toISOString(),
      // Pricing info for UI
      base_plan_price:      BASE_PLAN_PRICE,
      base_plan_slots:      BASE_PLAN_SLOTS,
      topup_price_per_slot: TOPUP_PRICE_PER_SLOT,
      gst_rate:             GST_RATE,
    });
  } catch (err) {
    console.error('billing/status error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/billing/create-order ───────────────────────────────────────────
// Body: { type: 'base_plan' | 'topup', slots: 10 }
// Returns Razorpay order details for the frontend checkout
router.post('/create-order', async (req, res) => {
  try {
    const { type, slots } = req.body;
    const adminId = req.admin_id;

    if (!type) return res.status(400).json({ error: 'type is required (base_plan or topup)' });

    let amounts, description, employeeSlots;

    if (type === 'base_plan') {
      amounts       = calcAmounts(BASE_PLAN_PRICE);
      description   = `PayLeef Pro — ${BASE_PLAN_SLOTS} Employee Slots (1 Month)`;
      employeeSlots = BASE_PLAN_SLOTS;
    } else if (type === 'topup') {
      const n = parseInt(slots) || MIN_TOPUP_SLOTS;
      if (n < MIN_TOPUP_SLOTS)
        return res.status(400).json({ error: `Minimum top-up is ${MIN_TOPUP_SLOTS} employee slots` });
      amounts       = calcAmounts(n * TOPUP_PRICE_PER_SLOT);
      description   = `PayLeef — ${n} Additional Employee Slots`;
      employeeSlots = n;
    } else {
      return res.status(400).json({ error: 'Invalid type. Use base_plan or topup' });
    }

    // Check if Razorpay keys are configured
    const keyId     = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || keyId === 'rzp_test_placeholder') {
      // Return a mock order for testing before live keys are added
      const mockOrderId = `order_mock_${Date.now()}`;
      await pool.query(
        `INSERT INTO payments
           (admin_id, razorpay_order_id, payment_type, employee_slots,
            base_amount, gst_amount, total_amount, status, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,'pending',$8)`,
        [adminId, mockOrderId, type, employeeSlots,
         amounts.base_amount, amounts.gst_amount, amounts.total_amount,
         'Mock order — Razorpay keys not yet configured']
      );
      return res.json({
        mock: true,
        order_id:    mockOrderId,
        amount:      amounts.razorpay_paise,
        currency:    'INR',
        key:         'rzp_test_placeholder',
        description,
        employee_slots: employeeSlots,
        amounts,
        message: 'Razorpay keys not yet configured. Payment is simulated.',
      });
    }

    // Create real Razorpay order
    const Razorpay = require('razorpay');
    const rzp = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const order = await rzp.orders.create({
      amount:   amounts.razorpay_paise,
      currency: 'INR',
      receipt:  `rcpt_${adminId}_${Date.now()}`,
      notes: { admin_id: String(adminId), type, slots: String(employeeSlots) },
    });

    // Save pending payment record
    await pool.query(
      `INSERT INTO payments
         (admin_id, razorpay_order_id, payment_type, employee_slots,
          base_amount, gst_amount, total_amount, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'pending')`,
      [adminId, order.id, type, employeeSlots,
       amounts.base_amount, amounts.gst_amount, amounts.total_amount]
    );

    res.json({
      order_id:    order.id,
      amount:      amounts.razorpay_paise,
      currency:    'INR',
      key:         keyId,
      description,
      employee_slots: employeeSlots,
      amounts,
    });
  } catch (err) {
    console.error('create-order error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/billing/verify-payment ─────────────────────────────────────────
// Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature, type, slots }
// Verifies Razorpay signature → activates subscription
router.post('/verify-payment', async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      type,
      slots,
      mock,
    } = req.body;
    const adminId = req.admin_id;
    const now     = new Date();

    // Mock payment (no real keys yet)
    if (mock === true) {
      await activateSubscription(adminId, type, parseInt(slots) || BASE_PLAN_SLOTS, now,
        razorpay_order_id, 'mock_payment_' + Date.now());
      const sub = await getSubscription(adminId);
      return res.json({ success: true, mock: true, subscription: sub });
    }

    // Verify HMAC signature
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) return res.status(400).json({ error: 'Razorpay keys not configured' });

    const expected = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
    }

    await activateSubscription(adminId, type, parseInt(slots) || BASE_PLAN_SLOTS, now,
      razorpay_order_id, razorpay_payment_id);

    const sub = await getSubscription(adminId);
    res.json({ success: true, subscription: sub });
  } catch (err) {
    console.error('verify-payment error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/billing/history ──────────────────────────────────────────────────
router.get('/history', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, payment_type, employee_slots, base_amount, gst_amount,
              total_amount, status, razorpay_payment_id, notes, created_at
       FROM payments
       WHERE admin_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [req.admin_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

async function activateSubscription(adminId, type, slots, now, orderId, paymentId) {
  // Get current subscription (if any)
  const subRes = await pool.query(
    'SELECT * FROM subscriptions WHERE admin_id = $1',
    [adminId]
  );
  const existing = subRes.rows[0];

  if (type === 'base_plan') {
    if (existing) {
      // If renewing an already-active plan, extend from paid_until; otherwise extend from now
      const baseDate = existing.status === 'active' && new Date(existing.paid_until) > now
        ? new Date(existing.paid_until)
        : new Date(now);
      // Create a NEW date object to avoid mutation bugs
      const newPaidUntil = new Date(baseDate);
      newPaidUntil.setMonth(newPaidUntil.getMonth() + 1);

      await pool.query(
        `UPDATE subscriptions
         SET employee_limit = GREATEST(employee_limit, $1),
             paid_until     = $2,
             status         = 'active',
             updated_at     = NOW()
         WHERE admin_id = $3`,
        [BASE_PLAN_SLOTS, newPaidUntil, adminId]
      );
    } else {
      // New subscription — 1 month from now
      const newPaidUntil = new Date(now);
      newPaidUntil.setMonth(newPaidUntil.getMonth() + 1);
      await pool.query(
        `INSERT INTO subscriptions
           (admin_id, employee_limit, paid_until, status)
         VALUES ($1, $2, $3, 'active')`,
        [adminId, BASE_PLAN_SLOTS, newPaidUntil]
      );
    }
  } else if (type === 'topup') {
    // Top-up: add slots to existing subscription
    if (!existing) {
      return; // Can't top up without a base plan — UI should prevent this
    }
    await pool.query(
      `UPDATE subscriptions
       SET employee_limit = employee_limit + $1,
           updated_at     = NOW()
       WHERE admin_id = $2`,
      [slots, adminId]
    );
  }

  // Mark payment as success
  await pool.query(
    `UPDATE payments
     SET status = 'success', razorpay_payment_id = $1
     WHERE admin_id = $2 AND razorpay_order_id = $3`,
    [paymentId, adminId, orderId]
  );
}

async function getSubscription(adminId) {
  const res = await pool.query(
    'SELECT employee_limit, paid_until, status FROM subscriptions WHERE admin_id = $1',
    [adminId]
  );
  return res.rows[0] || null;
}

module.exports = router;
