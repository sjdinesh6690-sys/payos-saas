// routes/errors.js — Self-hosted error monitoring
// Two endpoints:
//   POST /api/errors/log   — frontend sends JS errors here (no auth required)
//   GET  /api/errors       — super admin reads all error logs
//   PUT  /api/errors/:id/resolve — mark error as resolved

const express   = require('express');
const router    = express.Router();
const { pool }  = require('../database');

// ── POST /api/errors/log ──────────────────────────────────────────────────────
// Called by the frontend error reporter. No auth — errors must always get through.
// Rate-limited by the global limiter in server.js.
router.post('/log', async (req, res) => {
  try {
    const {
      source     = 'frontend',
      severity   = 'error',
      message    = 'Unknown error',
      stack,
      url,
      user_agent,
      admin_id,
      context,   // e.g. { component: 'PayslipsPage', action: 'download' }
    } = req.body;

    // Truncate huge stacks so the DB row stays small
    const safeStack = stack ? String(stack).slice(0, 4000) : null;
    const safeMsg   = String(message).slice(0, 1000);
    const safeUrl   = url  ? String(url).slice(0, 500) : null;
    const safeUA    = user_agent ? String(user_agent).slice(0, 300) : null;

    await pool.query(
      `INSERT INTO error_logs (source, severity, message, stack, url, user_agent, admin_id, context)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [source, severity, safeMsg, safeStack, safeUrl, safeUA,
       admin_id || null, context ? JSON.stringify(context) : null]
    );

    // Send alert email if SMTP is configured (only for 'error' severity)
    if (severity === 'error' && process.env.SMTP_HOST && process.env.SMTP_USER) {
      sendAlertEmail(safeMsg, safeStack, safeUrl, source).catch(() => {});
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error log insert failed:', err.message);
    res.status(500).json({ error: 'Failed to log error' });
  }
});

// ── GET /api/errors ───────────────────────────────────────────────────────────
// Super admin only — protected by super-admin auth middleware in server.js
router.get('/', async (req, res) => {
  try {
    const { source, severity, resolved, limit = 100, offset = 0 } = req.query;

    const conditions = [];
    const params     = [];

    if (source)   { params.push(source);   conditions.push(`source = $${params.length}`); }
    if (severity) { params.push(severity); conditions.push(`severity = $${params.length}`); }
    if (resolved !== undefined) {
      params.push(resolved === 'true');
      conditions.push(`resolved = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(Number(limit), Number(offset));

    const { rows } = await pool.query(
      `SELECT el.*, a.company_name, a.email as admin_email
       FROM error_logs el
       LEFT JOIN admins a ON a.id = el.admin_id
       ${where}
       ORDER BY el.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    // Summary counts for the dashboard
    const { rows: counts } = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE severity = 'error'   AND resolved = false) AS open_errors,
        COUNT(*) FILTER (WHERE severity = 'warning' AND resolved = false) AS open_warnings,
        COUNT(*) FILTER (WHERE source = 'frontend')  AS frontend_total,
        COUNT(*) FILTER (WHERE source = 'backend')   AS backend_total,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS last_24h
      FROM error_logs
    `);

    res.json({ errors: rows, summary: counts[0] });
  } catch (err) {
    console.error('Error log fetch failed:', err.message);
    res.status(500).json({ error: 'Failed to fetch errors' });
  }
});

// ── PUT /api/errors/:id/resolve ───────────────────────────────────────────────
router.put('/:id/resolve', async (req, res) => {
  try {
    await pool.query(
      'UPDATE error_logs SET resolved = TRUE WHERE id = $1',
      [req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to resolve error' });
  }
});

// ── DELETE /api/errors/clear-resolved ─────────────────────────────────────────
router.delete('/clear-resolved', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM error_logs WHERE resolved = TRUE');
    res.json({ ok: true, deleted: rowCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear resolved errors' });
  }
});

// ── Internal: send email alert for critical errors ────────────────────────────
async function sendAlertEmail(message, stack, url, source) {
  const nodemailer = require('nodemailer');

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_PORT === '465',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const alertTo = process.env.ERROR_ALERT_EMAIL || process.env.SMTP_USER;

  await transporter.sendMail({
    from: `"PayLeef Monitor" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to:   alertTo,
    subject: `🚨 PayLeef Error — ${source.toUpperCase()}: ${message.slice(0, 80)}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#DC2626;color:white;padding:16px 20px;border-radius:8px 8px 0 0">
          <strong>🚨 PayLeef Error Alert</strong>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 8px 8px">
          <p><strong>Source:</strong> ${source}</p>
          <p><strong>Message:</strong><br/><code style="background:#f3f4f6;padding:4px 8px;border-radius:4px;display:block;margin-top:4px">${message}</code></p>
          ${url ? `<p><strong>URL/Route:</strong> ${url}</p>` : ''}
          ${stack ? `<details><summary><strong>Stack Trace</strong></summary><pre style="background:#f3f4f6;padding:12px;border-radius:4px;font-size:12px;overflow:auto">${stack}</pre></details>` : ''}
          <hr style="margin:16px 0;border:none;border-top:1px solid #e5e7eb"/>
          <p style="color:#6b7280;font-size:12px">
            View all errors in the <a href="${process.env.APP_URL || ''}/super-admin/errors" style="color:#1A7A4A">PayLeef Super Admin Panel</a>
          </p>
        </div>
      </div>
    `,
  });
}

module.exports = router;
