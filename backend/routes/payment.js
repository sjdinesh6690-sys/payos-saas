/**
 * payment.js — Secure PayLeef subscription payment workflow
 *
 * Endpoints:
 *   POST /create-order      — capture customer details + create Razorpay order
 *   POST /verify            — frontend HMAC verification → activate subscription
 *   POST /webhook           — Razorpay webhook (independent double-verification)
 *   GET  /gst-lookup/:gstin — validate GSTIN + state + optional company fetch
 *   GET  /invoice/:orderId  — download tax invoice PDF
 *   GET  /invoices          — list all invoices for this admin
 *   GET  /status/:orderId   — payment + subscription status
 */

const express  = require('express');
const crypto   = require('crypto');
const https    = require('https');
const router   = express.Router();
const { pool } = require('../database');
const { generateInvoicePDF, getFYYear } = require('../lib/invoicePDF');
const authCheck = require('../middleware/auth');

// ── Pricing ──────────────────────────────────────────────────────────────────
const BASE_PLAN_PRICE    = 999;     // ₹ before GST
const BASE_PLAN_SLOTS    = 5;
const GST_RATE           = 0.18;
const SELLER_STATE_CODE  = '33';   // Tamil Nadu (Dinmind Infotech Pvt Ltd)

// ── Indian state code map ────────────────────────────────────────────────────
const STATE_CODES = {
  '01': 'Jammu & Kashmir',     '02': 'Himachal Pradesh',
  '03': 'Punjab',               '04': 'Chandigarh',
  '05': 'Uttarakhand',          '06': 'Haryana',
  '07': 'Delhi',                '08': 'Rajasthan',
  '09': 'Uttar Pradesh',        '10': 'Bihar',
  '11': 'Sikkim',               '12': 'Arunachal Pradesh',
  '13': 'Nagaland',             '14': 'Manipur',
  '15': 'Mizoram',              '16': 'Tripura',
  '17': 'Meghalaya',            '18': 'Assam',
  '19': 'West Bengal',          '20': 'Jharkhand',
  '21': 'Odisha',               '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',       '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu',
  '27': 'Maharashtra',          '28': 'Andhra Pradesh',
  '29': 'Karnataka',            '30': 'Goa',
  '31': 'Lakshadweep',          '32': 'Kerala',
  '33': 'Tamil Nadu',           '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands', '36': 'Telangana',
  '37': 'Andhra Pradesh',       '38': 'Ladakh',
  '97': 'Other Territory',
};

// ── Helper: validate GSTIN format ────────────────────────────────────────────
function validateGSTIN(gstin) {
  if (!gstin) return { valid: false, error: 'GSTIN is required' };
  const clean = gstin.trim().toUpperCase();
  // 2-digit state + 5-letter PAN prefix + 4 digits + 1 alpha + 1 entity + Z + 1 checksum
  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!gstinRegex.test(clean)) {
    return { valid: false, error: 'Invalid GSTIN format. Expected: 2-digit state + PAN-based 12 chars.' };
  }
  return { valid: true, gstin: clean, stateCode: clean.substring(0, 2) };
}

// ── Helper: calculate GST split ──────────────────────────────────────────────
// TN customer → CGST 9% + SGST 9%; cross-state → IGST 18%
function calcTax(baseAmount, customerStateCode) {
  const gst    = Math.round(baseAmount * GST_RATE * 100) / 100;
  const half   = Math.round((gst / 2) * 100) / 100;
  const isSame = customerStateCode === SELLER_STATE_CODE;

  return {
    base_amount:  baseAmount,
    cgst_amount:  isSame ? half : 0,
    sgst_amount:  isSame ? (gst - half) : 0, // handles ₹0.01 rounding
    igst_amount:  isSame ? 0 : gst,
    gst_amount:   gst,
    total_amount: Math.round((baseAmount + gst) * 100) / 100,
    tax_type:     isSame ? 'CGST+SGST' : 'IGST',
  };
}

// ── Helper: log payment event ────────────────────────────────────────────────
async function logPaymentEvent(adminId, orderId, eventType, rzpOrderId, rzpPaymentId, status, details) {
  try {
    await pool.query(
      `INSERT INTO payment_logs
         (admin_id, order_id, event_type, razorpay_order_id,
          razorpay_payment_id, status, details)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [adminId, orderId, eventType, rzpOrderId, rzpPaymentId,
       status, JSON.stringify(details || {})]
    );
  } catch (e) {
    console.error('logPaymentEvent error:', e.message);
  }
}

// ── Helper: FY-based invoice serial (atomic, row-level locked) ───────────────
async function getNextInvoiceNumber(client) {
  const fyYear = getFYYear();
  const res = await client.query(
    `INSERT INTO invoice_serials (fy_year, last_serial)
     VALUES ($1, 1)
     ON CONFLICT (fy_year) DO UPDATE
       SET last_serial = invoice_serials.last_serial + 1
     RETURNING last_serial`,
    [fyYear]
  );
  const serial = res.rows[0].last_serial;
  return {
    invoice_number: `PL-${fyYear}${String(serial).padStart(4, '0')}`,
    fy_year:        fyYear,
    serial_number:  serial,
  };
}

// ── Helper: activate or extend subscription (within a transaction) ────────────
async function activateSubscription(client, adminId, employeeSlots, planMonths = 1) {
  const subRes = await client.query(
    'SELECT * FROM subscriptions WHERE admin_id = $1 FOR UPDATE',
    [adminId]
  );
  const existing    = subRes.rows[0];
  const now         = new Date();

  if (existing) {
    // Extend from current expiry if still active, else from today
    const base = (existing.status === 'active' && new Date(existing.paid_until) > now)
      ? new Date(existing.paid_until)
      : new Date(now);
    const newPaidUntil = new Date(base);
    newPaidUntil.setMonth(newPaidUntil.getMonth() + planMonths);

    await client.query(
      `UPDATE subscriptions
       SET employee_limit = GREATEST(employee_limit, $1),
           paid_until     = $2,
           status         = 'active',
           updated_at     = NOW()
       WHERE admin_id = $3`,
      [employeeSlots, newPaidUntil, adminId]
    );
    return newPaidUntil;
  } else {
    const newPaidUntil = new Date(now);
    newPaidUntil.setMonth(newPaidUntil.getMonth() + planMonths);
    await client.query(
      `INSERT INTO subscriptions (admin_id, employee_limit, paid_until, status)
       VALUES ($1, $2, $3, 'active')`,
      [adminId, employeeSlots, newPaidUntil]
    );
    return newPaidUntil;
  }
}

// ── Helper: queue failed email for retry ─────────────────────────────────────
async function queueEmailRetry(invoiceId, emailType, toEmail, subject, errMsg) {
  try {
    await pool.query(
      `INSERT INTO email_retry_queue
         (invoice_id, email_type, to_email, subject, last_error, next_retry_at)
       VALUES ($1,$2,$3,$4,$5, NOW() + INTERVAL '5 minutes')`,
      [invoiceId, emailType, toEmail, subject, errMsg]
    );
  } catch (e) {
    console.error('queueEmailRetry error:', e.message);
  }
}

// ── Helper: send payment confirmation emails ──────────────────────────────────
async function sendPaymentEmails(invoiceId, invoice, pdfBuffer) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set — skipping payment emails');
    return;
  }

  try {
    const { Resend } = require('resend');
    const resend     = new Resend(process.env.RESEND_API_KEY);

    const INR = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n || 0);
    const planName  = invoice.plan_name || 'PayLeef Subscription';
    const invoiceNo = invoice.invoice_number;
    const amount    = INR(invoice.total_amount);
    const pdfB64    = pdfBuffer.toString('base64');

    const htmlBody = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;border-radius:10px;overflow:hidden;">
  <div style="background:#1A7A4A;padding:24px 28px;">
    <h1 style="color:white;margin:0;font-size:22px;">PayLeef by Dinmind</h1>
    <p style="color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:14px;">Payment Confirmation &amp; Tax Invoice</p>
  </div>
  <div style="background:white;padding:28px;">
    <p style="color:#0F172A;font-size:16px;margin-top:0;">Dear <strong>${invoice.customer_name}</strong>,</p>
    <p style="color:#475569;line-height:1.6;">Your payment for <strong>${planName}</strong> has been received and your account is now active.</p>

    <div style="background:#F1F5F9;border-radius:8px;padding:18px;margin:20px 0;">
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr>
          <td style="color:#64748B;padding:7px 0;">Invoice No.</td>
          <td style="color:#0F172A;font-weight:bold;text-align:right;">${invoiceNo}</td>
        </tr>
        <tr>
          <td style="color:#64748B;padding:7px 0;">Plan</td>
          <td style="color:#0F172A;text-align:right;">${planName}</td>
        </tr>
        <tr>
          <td style="color:#64748B;padding:7px 0;font-weight:bold;">Amount Paid</td>
          <td style="color:#1A7A4A;font-weight:bold;font-size:20px;text-align:right;">${amount}</td>
        </tr>
      </table>
    </div>

    <p style="color:#475569;">Your GST-compliant tax invoice is attached to this email.</p>
    <p style="color:#475569;">Access your PayLeef dashboard: <a href="https://payos-saas.onrender.com" style="color:#1A7A4A;font-weight:bold;">payos-saas.onrender.com</a></p>

    <hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0;" />
    <p style="color:#94A3B8;font-size:11px;margin:0;">
      Dinmind Infotech Pvt Ltd · Chennai, Tamil Nadu<br/>
      dinesh@dinmind.in · +91-9500-168-031 · www.dinmind.com
    </p>
  </div>
</div>`;

    // Recipients: customer + accounts email (if different)
    const toAddresses = [invoice.customer_email];
    if (invoice.accounts_email && invoice.accounts_email !== invoice.customer_email) {
      toAddresses.push(invoice.accounts_email);
    }

    // Send to customer
    await resend.emails.send({
      from:        'PayLeef <payroll@dinmind.com>',
      to:          toAddresses,
      subject:     `Payment Confirmed — Invoice ${invoiceNo} | ${planName}`,
      html:        htmlBody,
      attachments: [{ filename: `Invoice-${invoiceNo}.pdf`, content: pdfB64 }],
    });

    // Internal copy to Dinesh
    await resend.emails.send({
      from:        'PayLeef <payroll@dinmind.com>',
      to:          ['dinesh@dinmind.in'],
      subject:     `[New Payment] ${invoiceNo} — ${invoice.customer_name} (${amount})`,
      html: `<p>New subscription payment received.</p>
<ul style="font-family:Arial;font-size:14px;line-height:2;">
  <li><b>Customer:</b> ${invoice.customer_name}</li>
  <li><b>Company:</b>  ${invoice.company_name}</li>
  <li><b>Email:</b>    ${invoice.customer_email}</li>
  <li><b>Plan:</b>     ${planName}</li>
  <li><b>Amount:</b>   ${amount}</li>
  <li><b>Invoice:</b>  ${invoiceNo}</li>
  <li><b>GSTIN:</b>    ${invoice.gst_number || 'Not provided'}</li>
</ul>`,
      attachments: [{ filename: `Invoice-${invoiceNo}.pdf`, content: pdfB64 }],
    });

    // Mark email sent
    await pool.query('UPDATE invoices SET email_sent = TRUE WHERE id = $1', [invoiceId]);

  } catch (e) {
    console.error('sendPaymentEmails error:', e.message);
    await queueEmailRetry(
      invoiceId, 'invoice', invoice.customer_email,
      `Payment Confirmation — ${invoice.invoice_number}`, e.message
    );
  }
}

// ── Core: process a verified payment (idempotent) ────────────────────────────
// Called by both /verify (frontend) and /webhook
async function processVerifiedPayment(rzpOrderId, rzpPaymentId, rzpSignature, verifiedVia) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch order with row lock (includes customer details via JOIN)
    const orderRes = await client.query(
      `SELECT po.*,
              pc.full_name, pc.company_name, pc.mobile, pc.email,
              pc.accounts_email, pc.has_gst, pc.gst_number,
              pc.billing_name, pc.billing_address, pc.state, pc.pincode
       FROM payment_orders po
       JOIN payment_customers pc ON pc.id = po.customer_id
       WHERE po.razorpay_order_id = $1
       FOR UPDATE`,
      [rzpOrderId]
    );

    if (!orderRes.rows.length) {
      await client.query('ROLLBACK');
      return { error: 'Order not found' };
    }

    const order = orderRes.rows[0];

    // ── Idempotency — already processed ──────────────────────────────────────
    if (order.status === 'paid') {
      await client.query('ROLLBACK');
      const existInv = await pool.query(
        'SELECT invoice_number FROM invoices WHERE order_id = $1', [order.id]
      );
      return {
        already_done:   true,
        invoice_number: existInv.rows[0]?.invoice_number || null,
        order_id:       order.id,
      };
    }

    // ── Mark order as paid ────────────────────────────────────────────────────
    await client.query(
      `UPDATE payment_orders
       SET status              = 'paid',
           razorpay_payment_id = $1,
           razorpay_signature  = $2,
           verified_via        = $3,
           verified_at         = NOW(),
           updated_at          = NOW()
       WHERE id = $4`,
      [rzpPaymentId, rzpSignature, verifiedVia, order.id]
    );

    // ── Tax split based on customer GSTIN ─────────────────────────────────────
    const customerStateCode = order.gst_number ? order.gst_number.substring(0, 2) : null;
    const tax = calcTax(Number(order.base_amount), customerStateCode);

    // ── Generate invoice number (atomic FY serial) ────────────────────────────
    const { invoice_number, fy_year, serial_number } = await getNextInvoiceNumber(client);

    // ── Create invoice record ─────────────────────────────────────────────────
    const invRes = await client.query(
      `INSERT INTO invoices
         (admin_id, order_id, invoice_number, fy_year, serial_number,
          plan_name, base_amount, cgst_amount, sgst_amount, igst_amount, total_amount,
          customer_name, customer_email, customer_mobile, company_name,
          gst_number, billing_address, state)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       ON CONFLICT (invoice_number) DO NOTHING
       RETURNING *`,
      [
        order.admin_id, order.id, invoice_number, fy_year, serial_number,
        order.plan_name, tax.base_amount, tax.cgst_amount, tax.sgst_amount, tax.igst_amount, tax.total_amount,
        order.full_name, order.email, order.mobile, order.company_name,
        order.gst_number || null, order.billing_address || null, order.state || null,
      ]
    );

    let invoiceId, invoiceRow;
    if (invRes.rows.length) {
      invoiceId  = invRes.rows[0].id;
      invoiceRow = invRes.rows[0];
    } else {
      // Conflict — invoice was already created (race condition guard)
      const existing = await client.query(
        'SELECT * FROM invoices WHERE order_id = $1', [order.id]
      );
      invoiceId  = existing.rows[0].id;
      invoiceRow = existing.rows[0];
    }

    // ── Activate subscription ─────────────────────────────────────────────────
    await activateSubscription(client, order.admin_id, order.employee_slots || BASE_PLAN_SLOTS, order.plan_months || 1);

    await client.query('COMMIT');

    // ── Generate PDF + send emails (outside transaction) ─────────────────────
    setImmediate(async () => {
      try {
        const pdfBuffer = await generateInvoicePDF(
          { ...invoiceRow, accounts_email: order.accounts_email },
          order
        );
        await pool.query('UPDATE invoices SET pdf_generated = TRUE WHERE id = $1', [invoiceId]);
        await sendPaymentEmails(
          invoiceId,
          { ...invoiceRow, accounts_email: order.accounts_email },
          pdfBuffer
        );
      } catch (postTxErr) {
        console.error('Post-transaction email/PDF error:', postTxErr.message);
        await queueEmailRetry(
          invoiceId, 'invoice', invoiceRow.customer_email,
          `Payment Confirmation — ${invoice_number}`, postTxErr.message
        );
      }
    });

    return {
      success:        true,
      invoice_number,
      invoice_id:     invoiceId,
      order_id:       order.id,
      admin_id:       order.admin_id,
    };

  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC ROUTES (no auth)
// ═══════════════════════════════════════════════════════════════════════════════

// ── GET /gst-lookup/:gstin ───────────────────────────────────────────────────
router.get('/gst-lookup/:gstin', async (req, res) => {
  const { gstin } = req.params;
  const validation = validateGSTIN(gstin);

  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const { stateCode } = validation;
  const stateName  = STATE_CODES[stateCode] || 'Unknown State';
  const isSameState = stateCode === SELLER_STATE_CODE;
  const tax = calcTax(BASE_PLAN_PRICE, stateCode);

  const result = {
    gstin:        validation.gstin,
    state_code:   stateCode,
    state_name:   stateName,
    tax_type:     isSameState ? 'CGST+SGST (9%+9%)' : 'IGST (18%)',
    is_same_state: isSameState,
    company_name: null,
    trade_name:   null,
    address:      null,
    api_source:   null,
    // Handy: tax preview for UI
    tax_preview: {
      base_amount:  tax.base_amount,
      cgst_amount:  tax.cgst_amount,
      sgst_amount:  tax.sgst_amount,
      igst_amount:  tax.igst_amount,
      total_amount: tax.total_amount,
    },
  };

  // Optional: call free GST check API if key is configured
  if (process.env.GSTIN_API_KEY) {
    try {
      const apiData = await new Promise((resolve, reject) => {
        const url = `https://sheet.gstincheck.co.in/check/${process.env.GSTIN_API_KEY}/${validation.gstin}`;
        const req2 = https.get(url, { timeout: 3000 }, (apiRes) => {
          let raw = '';
          apiRes.on('data', d => { raw += d; });
          apiRes.on('end', () => {
            try { resolve(JSON.parse(raw)); }
            catch { resolve(null); }
          });
        });
        req2.on('error', reject);
        req2.on('timeout', () => { req2.destroy(); reject(new Error('timeout')); });
      });

      if (apiData?.data) {
        result.company_name = apiData.data.lgnm  || apiData.data.tradeNam || null;
        result.trade_name   = apiData.data.tradeNam || null;
        result.address      = apiData.data.pradr?.addr?.bnm || null;
        result.api_source   = 'gstin_check';
      }
    } catch (apiErr) {
      console.warn('GST API lookup failed:', apiErr.message);
    }
  }

  res.json(result);
});

// ── POST /webhook — Razorpay webhook (raw body required) ─────────────────────
// server.js registers: app.use(express.json({ verify: (req,res,buf) => { req.rawBody = buf; } }))
router.post('/webhook', async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature     = req.headers['x-razorpay-signature'];
    const rawBody       = req.rawBody || Buffer.from(JSON.stringify(req.body));

    // Verify webhook signature
    if (webhookSecret) {
      if (!signature) {
        console.warn('Webhook received without signature');
        return res.status(400).json({ error: 'Missing webhook signature' });
      }
      const expected = crypto
        .createHmac('sha256', webhookSecret)
        .update(rawBody)
        .digest('hex');

      if (expected !== signature) {
        console.warn('Webhook signature mismatch');
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }
    }

    // Parse event
    const event     = req.body;
    const eventType = event?.event;
    console.log(`[Webhook] ${eventType}`);

    if (eventType === 'payment.captured') {
      const payment = event.payload?.payment?.entity;
      const orderId   = payment?.order_id;
      const paymentId = payment?.id;

      if (!orderId) return res.json({ received: true });

      // Log receipt
      await logPaymentEvent(null, null, 'webhook_received', orderId, paymentId, 'captured', {
        amount: payment?.amount,
        method: payment?.method,
      });

      // Look up order
      const orderRes = await pool.query(
        'SELECT id, admin_id, status FROM payment_orders WHERE razorpay_order_id = $1',
        [orderId]
      );

      if (!orderRes.rows.length) {
        console.warn(`[Webhook] Order not found: ${orderId}`);
        return res.json({ received: true });
      }

      const dbOrder = orderRes.rows[0];

      // Mark webhook received
      await pool.query(
        `UPDATE payment_orders SET webhook_received = TRUE, updated_at = NOW()
         WHERE razorpay_order_id = $1`,
        [orderId]
      );

      // Process only if not already paid (idempotency handled inside)
      if (dbOrder.status !== 'paid') {
        processVerifiedPayment(orderId, paymentId, 'webhook_verified', 'webhook')
          .then(result => {
            if (result.error) console.error('[Webhook] processVerifiedPayment:', result.error);
            else console.log(`[Webhook] Activated: ${result.invoice_number}`);
          })
          .catch(e => console.error('[Webhook] processVerifiedPayment error:', e.message));
      }
    }

    if (eventType === 'payment.failed') {
      const payment = event.payload?.payment?.entity;
      const orderId = payment?.order_id;
      if (orderId) {
        await pool.query(
          `UPDATE payment_orders SET status = 'failed', updated_at = NOW()
           WHERE razorpay_order_id = $1`,
          [orderId]
        );
        await logPaymentEvent(null, null, 'payment_failed', orderId, payment?.id, 'failed', {
          reason: payment?.error_description,
          code:   payment?.error_code,
        });
      }
    }

    // Always acknowledge promptly
    res.json({ received: true });

  } catch (err) {
    console.error('[Webhook] Error:', err.message);
    // Still return 200 to prevent Razorpay retries on our internal errors
    res.json({ received: true, warning: 'Internal processing error' });
  }
});


// ═══════════════════════════════════════════════════════════════════════════════
// AUTHENTICATED ROUTES (require valid admin JWT)
// ═══════════════════════════════════════════════════════════════════════════════
router.use(authCheck);

// ── POST /create-order ───────────────────────────────────────────────────────
router.post('/create-order', async (req, res) => {
  try {
    const adminId = req.admin_id;
    const {
      full_name, company_name, mobile, email,
      accounts_email,
      has_gst, gst_number,
      billing_name, billing_address, state, pincode,
      plan_name   = 'PayLeef Pro',
      plan_months = 1,
    } = req.body;

    // ── Validate mandatory fields ─────────────────────────────────────────────
    if (!full_name?.trim())    return res.status(400).json({ error: 'Full name is required.' });
    if (!company_name?.trim()) return res.status(400).json({ error: 'Company name is required.' });
    if (!mobile?.trim())       return res.status(400).json({ error: 'Mobile number is required.' });
    if (!email?.trim())        return res.status(400).json({ error: 'Email address is required.' });

    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Invalid email address format.' });
    }
    const cleanMobile = mobile.replace(/[\s\-+() ]/g, '');
    const mobile10 = cleanMobile.startsWith('91') && cleanMobile.length === 12
      ? cleanMobile.slice(2) : cleanMobile;
    if (!/^[6-9]\d{9}$/.test(mobile10)) {
      return res.status(400).json({ error: 'Invalid Indian mobile number. Enter 10-digit number starting with 6–9.' });
    }

    // ── Validate GSTIN if provided ────────────────────────────────────────────
    let gstStateCode = null;
    let cleanGST     = null;
    if (has_gst) {
      if (!gst_number?.trim()) {
        return res.status(400).json({ error: 'GSTIN is required when GST is enabled.' });
      }
      const gstVal = validateGSTIN(gst_number);
      if (!gstVal.valid) {
        return res.status(400).json({ error: `GSTIN: ${gstVal.error}` });
      }
      gstStateCode = gstVal.stateCode;
      cleanGST     = gstVal.gstin;
    }

    // ── Calculate amounts ─────────────────────────────────────────────────────
    const baseAmount = BASE_PLAN_PRICE * plan_months;
    const tax        = calcTax(baseAmount, gstStateCode);

    // ── Razorpay order creation ───────────────────────────────────────────────
    const keyId     = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return res.status(500).json({ error: 'Payment gateway not configured. Please contact support.' });
    }

    const Razorpay = require('razorpay');
    const rzp      = new Razorpay({ key_id: keyId, key_secret: keySecret });

    const rzpOrder = await rzp.orders.create({
      amount:   Math.round(tax.total_amount * 100), // paise
      currency: 'INR',
      receipt:  `pl_${adminId}_${Date.now()}`,
      notes: {
        admin_id:    String(adminId),
        plan_name,
        plan_months: String(plan_months),
        customer:    full_name.trim(),
      },
    });

    // ── Save customer record ──────────────────────────────────────────────────
    const custRes = await pool.query(
      `INSERT INTO payment_customers
         (admin_id, full_name, company_name, mobile, email,
          accounts_email, has_gst, gst_number,
          billing_name, billing_address, state, pincode)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING id`,
      [
        adminId,
        full_name.trim(), company_name.trim(),
        mobile10, email.trim().toLowerCase(),
        accounts_email?.trim() || null,
        !!has_gst, cleanGST,
        billing_name?.trim() || null,
        billing_address?.trim() || null,
        state?.trim() || null,
        pincode?.trim() || null,
      ]
    );
    const customerId = custRes.rows[0].id;

    // ── Save payment order record ─────────────────────────────────────────────
    const orderRes = await pool.query(
      `INSERT INTO payment_orders
         (admin_id, customer_id, razorpay_order_id,
          plan_name, plan_months, employee_slots,
          base_amount, gst_amount, total_amount, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending')
       RETURNING id`,
      [
        adminId, customerId, rzpOrder.id,
        plan_name, plan_months, BASE_PLAN_SLOTS,
        tax.base_amount, tax.gst_amount, tax.total_amount,
      ]
    );

    // ── Log event ─────────────────────────────────────────────────────────────
    await logPaymentEvent(adminId, orderRes.rows[0].id, 'order_created', rzpOrder.id, null, 'pending', {
      plan_name, plan_months, customer: full_name.trim(), tax_type: tax.tax_type,
    });

    res.json({
      order_id:      rzpOrder.id,
      amount:        Math.round(tax.total_amount * 100), // paise for Razorpay
      currency:      'INR',
      key:           keyId,
      plan_name,
      plan_months,
      employee_slots: BASE_PLAN_SLOTS,
      amounts:       tax,
      customer_name: full_name.trim(),
    });

  } catch (err) {
    console.error('payment/create-order error:', err.message);
    res.status(500).json({ error: 'Failed to create payment order. Please try again.' });
  }
});


// ── POST /verify — frontend payment verification ─────────────────────────────
router.post('/verify', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification fields.' });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) return res.status(500).json({ error: 'Payment gateway not configured.' });

    // ── Verify HMAC signature ─────────────────────────────────────────────────
    const expected = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expected !== razorpay_signature) {
      await logPaymentEvent(req.admin_id, null, 'signature_mismatch',
        razorpay_order_id, razorpay_payment_id, 'failed', {});
      return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
    }

    await logPaymentEvent(req.admin_id, null, 'frontend_verify',
      razorpay_order_id, razorpay_payment_id, 'verified', {});

    // ── Process (idempotent) ──────────────────────────────────────────────────
    const result = await processVerifiedPayment(
      razorpay_order_id, razorpay_payment_id, razorpay_signature, 'frontend'
    );

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    res.json({
      success:        true,
      already_done:   !!result.already_done,
      invoice_number: result.invoice_number,
      message:        result.already_done
        ? 'Payment already processed. Your subscription is active.'
        : 'Payment verified. Your subscription is now active!',
    });

  } catch (err) {
    console.error('payment/verify error:', err.message);
    res.status(500).json({ error: 'Payment verification failed. Please contact support.' });
  }
});


// ── GET /status/:orderId — payment + subscription status ─────────────────────
router.get('/status/:orderId', async (req, res) => {
  try {
    const adminId  = req.admin_id;
    const { orderId } = req.params;

    const orderRes = await pool.query(
      `SELECT po.*, i.invoice_number, i.id AS invoice_id, i.email_sent
       FROM payment_orders po
       LEFT JOIN invoices i ON i.order_id = po.id
       WHERE po.razorpay_order_id = $1 AND po.admin_id = $2`,
      [orderId, adminId]
    );

    if (!orderRes.rows.length) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const order = orderRes.rows[0];

    // Current subscription state
    const subRes = await pool.query(
      'SELECT employee_limit, paid_until, status FROM subscriptions WHERE admin_id = $1',
      [adminId]
    );
    const sub       = subRes.rows[0];
    const now       = new Date();
    const subActive = sub && sub.status === 'active' && new Date(sub.paid_until) > now;

    res.json({
      order_id:        order.razorpay_order_id,
      payment_status:  order.status,
      plan_name:       order.plan_name,
      plan_months:     order.plan_months,
      total_amount:    order.total_amount,
      invoice_number:  order.invoice_number  || null,
      invoice_id:      order.invoice_id      || null,
      email_sent:      order.email_sent      || false,
      webhook_received: order.webhook_received,
      verified_via:    order.verified_via,
      verified_at:     order.verified_at,
      subscription: subActive ? {
        active:         true,
        employee_limit: sub.employee_limit,
        paid_until:     sub.paid_until,
        days_left:      Math.max(0, Math.ceil((new Date(sub.paid_until) - now) / 86400000)),
      } : { active: false },
    });
  } catch (err) {
    console.error('payment/status error:', err.message);
    res.status(500).json({ error: 'Failed to fetch payment status.' });
  }
});


// ── GET /invoice/:orderId — download invoice PDF ─────────────────────────────
router.get('/invoice/:orderId', async (req, res) => {
  try {
    const adminId     = req.admin_id;
    const { orderId } = req.params;

    // Support both numeric invoice id and Razorpay order id
    const invRes = await pool.query(
      `SELECT i.*, po.razorpay_order_id, po.razorpay_payment_id,
              pc.accounts_email
       FROM invoices i
       JOIN payment_orders po ON po.id = i.order_id
       JOIN payment_customers pc ON pc.id = po.customer_id
       WHERE (i.id = $1 OR po.razorpay_order_id = $2)
         AND i.admin_id = $3`,
      [parseInt(orderId) || 0, orderId, adminId]
    );

    if (!invRes.rows.length) {
      return res.status(404).json({ error: 'Invoice not found.' });
    }

    const invoice = invRes.rows[0];
    const orderRes = await pool.query('SELECT * FROM payment_orders WHERE id = $1', [invoice.order_id]);
    const order    = orderRes.rows[0] || {};

    const pdfBuffer = await generateInvoicePDF(invoice, order);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename="PayLeef-Invoice-${invoice.invoice_number}.pdf"`);
    res.send(pdfBuffer);

  } catch (err) {
    console.error('invoice download error:', err.message);
    res.status(500).json({ error: 'Failed to generate invoice. Please try again.' });
  }
});


// ── GET /invoices — list all invoices for this admin ─────────────────────────
router.get('/invoices', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT i.id, i.invoice_number, i.plan_name,
              i.base_amount, i.cgst_amount, i.sgst_amount, i.igst_amount, i.total_amount,
              i.customer_name, i.company_name, i.gst_number,
              i.email_sent, i.pdf_generated, i.created_at,
              po.status AS payment_status, po.razorpay_order_id, po.razorpay_payment_id
       FROM invoices i
       JOIN payment_orders po ON po.id = i.order_id
       WHERE i.admin_id = $1
       ORDER BY i.created_at DESC
       LIMIT 50`,
      [req.admin_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
