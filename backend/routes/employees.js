const express    = require('express');
const bcrypt     = require('bcryptjs');
const crypto     = require('crypto');
const { Resend } = require('resend');
const router     = express.Router();
const { pool, auditLog } = require('../database');
const authCheck  = require('../middleware/auth');

router.use(authCheck);

// ── Helpers ───────────────────────────────────────────────────────────────────
function generateTempPassword() {
  // 10-char readable random password (no ambiguous chars like 0/O, 1/I/l)
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

async function sendPortalWelcomeEmail(employee, tempPassword, companyName, req) {
  if (!process.env.RESEND_API_KEY) {
    console.log(`[portal-invite] No RESEND_API_KEY. Temp password for ${employee.employee_id}: ${tempPassword}`);
    return;
  }
  const resend  = new Resend(process.env.RESEND_API_KEY);
  const appUrl  = process.env.APP_URL || process.env.FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
  const loginUrl = `${appUrl}/login`;

  await resend.emails.send({
    from:    `${companyName} Payroll <payroll@dinmind.com>`,
    to:      employee.email,
    subject: `Your ${companyName} Payroll Portal access is ready`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:0;background:#f9fafb;border-radius:12px;overflow:hidden;">
        <div style="background:#1A7A4A;padding:28px 32px;text-align:center;">
          <span style="font-size:26px;font-weight:900;color:#fff;">Pay</span><span style="font-size:26px;font-weight:900;color:#4ADE80;">Leef</span>
          <p style="color:rgba(255,255,255,0.8);font-size:13px;margin:6px 0 0;">${companyName} Payroll Portal</p>
        </div>
        <div style="padding:32px;">
          <h2 style="color:#0f172a;margin:0 0 8px;">Welcome, ${employee.employee_name}!</h2>
          <p style="color:#475569;font-size:14px;margin:0 0 24px;">
            Your payroll portal access has been set up. You can now view and download your salary slips anytime.
          </p>
          <div style="background:#fff;border:1.5px solid #e2e8f0;border-radius:10px;padding:20px;margin-bottom:24px;">
            <p style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 12px;">Your Login Details</p>
            <table style="width:100%;border-collapse:collapse;">
              <tr>
                <td style="padding:8px 0;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9;">Portal URL</td>
                <td style="padding:8px 0;font-size:13px;font-weight:600;color:#1A7A4A;text-align:right;border-bottom:1px solid #f1f5f9;"><a href="${loginUrl}" style="color:#1A7A4A;">${loginUrl}</a></td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9;">Employee ID</td>
                <td style="padding:8px 0;font-size:13px;font-weight:700;color:#0f172a;text-align:right;border-bottom:1px solid #f1f5f9;">${employee.employee_id}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;font-size:13px;color:#64748b;border-bottom:1px solid #f1f5f9;">Email</td>
                <td style="padding:8px 0;font-size:13px;font-weight:600;color:#0f172a;text-align:right;border-bottom:1px solid #f1f5f9;">${employee.email}</td>
              </tr>
              <tr>
                <td style="padding:12px 0 8px;font-size:13px;color:#64748b;">Temporary Password</td>
                <td style="padding:12px 0 8px;font-size:16px;font-weight:900;color:#1A7A4A;text-align:right;letter-spacing:0.1em;">${tempPassword}</td>
              </tr>
            </table>
          </div>
          <div style="background:#FEF9C3;border:1px solid #FDE047;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
            <p style="font-size:13px;color:#92400e;margin:0;">⚠️ <strong>You will be asked to set your own password</strong> when you log in for the first time. Please keep your credentials safe.</p>
          </div>
          <div style="text-align:center;">
            <a href="${loginUrl}" style="display:inline-block;background:#1A7A4A;color:#fff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:700;font-size:15px;">
              Log In to Payroll Portal
            </a>
          </div>
        </div>
        <div style="background:#f1f5f9;padding:16px 32px;text-align:center;">
          <p style="font-size:12px;color:#94a3b8;margin:0;">This email was sent by ${companyName} via PayLeef. Do not reply.</p>
        </div>
      </div>`,
  });
}

// ── GET all employees (with last payslip info) ────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const statusFilter = req.query.status; // 'active' | 'inactive' | omit for all
    let whereClause = 'e.admin_id = $1';
    const params = [req.admin_id];

    // as_of_month / as_of_year — return employees who were employed during that month
    // (active employees + inactive employees whose exit date is on or after the 1st of that month)
    if (req.query.as_of_month && req.query.as_of_year) {
      const m  = String(parseInt(req.query.as_of_month)).padStart(2, '0');
      const y  = parseInt(req.query.as_of_year);
      const dt = `${y}-${m}-01`;
      whereClause += ` AND ((e.status = 'active' OR e.status IS NULL) OR (e.status = 'inactive' AND (e.date_of_exit IS NULL OR e.date_of_exit >= $2)))`;
      params.push(dt);
    } else {
      if (statusFilter === 'active')   { whereClause += ` AND (e.status = 'active' OR e.status IS NULL)`; }
      if (statusFilter === 'inactive') { whereClause += ` AND e.status = 'inactive'`; }
    }

    const result = await pool.query(`
      SELECT e.*,
        p.month        AS last_payslip_month,
        p.year         AS last_payslip_year,
        p.net_salary   AS last_net_salary,
        p.created_at   AS last_payslip_date
      FROM employees e
      LEFT JOIN LATERAL (
        SELECT month, year, net_salary, created_at
        FROM payslips
        WHERE admin_id = e.admin_id AND employee_id = e.employee_id
        ORDER BY year DESC, month DESC
        LIMIT 1
      ) p ON TRUE
      WHERE ${whereClause}
      ORDER BY e.employee_name ASC
    `, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST add employee ─────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const {
      employee_id, employee_name, email, salary, yearly_ctc, net_salary_monthly,
      department, designation, phone, date_of_joining, password, location,
      pan_number, uan_number, bank_name, bank_account_number, ifsc_code,
      portal_access_enabled,
    } = req.body;

    if (!employee_id || !employee_id.toString().trim())
      return res.status(400).json({ error: 'Employee ID is required' });
    if (!employee_name || !employee_name.toString().trim())
      return res.status(400).json({ error: 'Employee name is required' });
    if (email && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return res.status(400).json({ error: 'Invalid email format' });
    if (pan_number && pan_number.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(pan_number.trim()))
      return res.status(400).json({ error: 'Invalid PAN format. Example: ABCDE1234F' });
    if (ifsc_code && ifsc_code.trim() && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(ifsc_code.trim()))
      return res.status(400).json({ error: 'Invalid IFSC format. Example: SBIN0001234' });

    // Resolve gross monthly from whichever field was provided
    let grossMonthly = parseFloat(salary) || 0;
    if (!grossMonthly && yearly_ctc) grossMonthly = parseFloat(yearly_ctc) / 12;
    if (isNaN(grossMonthly) || grossMonthly < 0)
      return res.status(400).json({ error: 'Salary must be a non-negative number' });

    const empId = employee_id.toString().trim().toUpperCase();

    // Check uniqueness
    const exists = await pool.query(
      'SELECT id FROM employees WHERE admin_id = $1 AND employee_id = $2',
      [req.admin_id, empId]
    );
    if (exists.rows.length > 0)
      return res.status(400).json({ error: 'Employee ID already exists' });

    // Generate temp password if portal access is being enabled, else use provided or employee_id default
    const enablePortal = portal_access_enabled === true || portal_access_enabled === 'true';
    let tempPasswordPlain = null;
    let rawPwd;
    if (enablePortal && email) {
      tempPasswordPlain = generateTempPassword();
      rawPwd = tempPasswordPlain;
    } else {
      rawPwd = password || empId;
    }
    const hashedPwd = await bcrypt.hash(rawPwd, 10);

    const ctc      = yearly_ctc        ? parseFloat(yearly_ctc)         : grossMonthly * 12;
    const netMthly = net_salary_monthly ? parseFloat(net_salary_monthly) : null;

    const result = await pool.query(`
      INSERT INTO employees
        (admin_id, employee_id, employee_name, email, salary, yearly_ctc, net_salary_monthly,
         department, designation, phone, date_of_joining, password,
         location, pan_number, uan_number, bank_name, bank_account_number, ifsc_code,
         portal_access_enabled, is_temp_password)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      RETURNING *
    `, [
      req.admin_id, empId, employee_name.trim(),
      email ? email.trim().toLowerCase() : '',
      grossMonthly, ctc, netMthly,
      department || '', designation || '', phone || '', date_of_joining || '',
      hashedPwd,
      location || null,
      pan_number ? pan_number.trim().toUpperCase() : null,
      uan_number ? uan_number.trim() : null,
      bank_name  ? bank_name.trim()  : null,
      bank_account_number ? bank_account_number.trim() : null,
      ifsc_code  ? ifsc_code.trim().toUpperCase() : null,
      enablePortal,
      true, // is_temp_password always true on create
    ]);

    // Send portal welcome email if portal access enabled and email exists
    if (enablePortal && tempPasswordPlain && email) {
      const adminRes = await pool.query('SELECT company_name FROM admins WHERE id = $1', [req.admin_id]);
      const companyName = adminRes.rows[0]?.company_name || 'Your Company';
      sendPortalWelcomeEmail(result.rows[0], tempPasswordPlain, companyName, req)
        .catch(err => console.error('[portal-invite] Email failed:', err.message));
    }

    await auditLog(req.admin_id, 'employee_created', 'employees', result.rows[0].id, { employee_id: empId }, req.ip);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST bulk upload employees ────────────────────────────────────────────────
router.post('/upload', async (req, res) => {
  try {
    const rows = Array.isArray(req.body) ? req.body : req.body.employees;
    if (!rows || !rows.length)
      return res.status(400).json({ error: 'No employee data provided' });

    const client = await pool.connect();
    let inserted = 0, skipped = 0, skippedReasons = [];

    try {
      await client.query('BEGIN');
      for (const row of rows) {
        const { employee_id, employee_name, email, department, designation, phone, date_of_joining } = row;
        // Accept multiple salary column names
        const rawGross = row.salary || row.gross_salary || row.gross || row.ctc || 0;
        const rawCtc   = row.yearly_ctc || row.annual_ctc || row.ctc_per_annum || 0;
        const rawNet   = row.net_salary_monthly || row.net_salary || row.net_pay || row.take_home || 0;
        // Resolve gross: from gross field, or derive from yearly CTC
        let salary = parseFloat(rawGross) || 0;
        if (!salary && rawCtc) salary = parseFloat(rawCtc) / 12;
        const ctcVal = rawCtc ? parseFloat(rawCtc) : salary * 12;
        const netVal = rawNet ? parseFloat(rawNet) : null;
        if (!employee_id || !employee_name) {
          skipped++;
          skippedReasons.push({ employee_id: employee_id || '?', reason: 'Missing required fields (employee_id, employee_name)' });
          continue;
        }
        const empId = employee_id.toString().trim().toUpperCase();
        const exists = await client.query(
          'SELECT id FROM employees WHERE admin_id = $1 AND employee_id = $2',
          [req.admin_id, empId]
        );
        if (exists.rows.length > 0) {
          skipped++;
          skippedReasons.push({ employee_id: empId, reason: 'Already exists — use Employees page to edit' });
          continue;
        }
        const hashedPwd = await bcrypt.hash(empId, 10); // Default password = employee_id
        const emailVal = email ? email.toString().trim().toLowerCase() : '';
        await client.query(`
          INSERT INTO employees
            (admin_id, employee_id, employee_name, email, salary, yearly_ctc, net_salary_monthly,
             department, designation, phone, date_of_joining, password)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        `, [req.admin_id, empId, employee_name.trim(), emailVal,
            salary, ctcVal, netVal,
            (department||'').trim(), (designation||'').trim(), (phone||'').trim(), (date_of_joining||'').trim(), hashedPwd]);
        inserted++;
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    await auditLog(req.admin_id, 'employees_bulk_upload', 'employees', null, { inserted, skipped }, req.ip);
    res.json({ message: `${inserted} employees added, ${skipped} skipped`, inserted, skipped, skippedReasons });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PUT update employee ───────────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Verify ownership
    const check = await pool.query(
      'SELECT id FROM employees WHERE id = $1 AND admin_id = $2',
      [id, req.admin_id]
    );
    if (!check.rows.length) return res.status(404).json({ error: 'Employee not found' });

    const {
      employee_name, email, salary, yearly_ctc, net_salary_monthly,
      department, designation, phone, date_of_joining, location,
      pan_number, uan_number, bank_name, bank_account_number, ifsc_code,
      portal_access_enabled,
    } = req.body;

    if (salary !== undefined && salary !== '' && (isNaN(parseFloat(salary)) || parseFloat(salary) < 0))
      return res.status(400).json({ error: 'Salary must be a non-negative number' });
    if (email !== undefined && email && email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return res.status(400).json({ error: 'Invalid email format' });
    if (pan_number !== undefined && pan_number && pan_number.trim() && !/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(pan_number.trim()))
      return res.status(400).json({ error: 'Invalid PAN format. Example: ABCDE1234F' });
    if (ifsc_code !== undefined && ifsc_code && ifsc_code.trim() && !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(ifsc_code.trim()))
      return res.status(400).json({ error: 'Invalid IFSC format. Example: SBIN0001234' });

    const fields = [];
    const values = [];
    let idx = 1;

    // Resolve gross monthly — from salary field or derived from CTC
    let resolvedGross = (salary !== undefined && salary !== '') ? parseFloat(salary) : undefined;
    if (resolvedGross === undefined && yearly_ctc !== undefined && yearly_ctc !== '')
      resolvedGross = parseFloat(yearly_ctc) / 12;

    if (employee_name   !== undefined) { fields.push(`employee_name = $${idx++}`);  values.push(employee_name ? employee_name.trim() : employee_name); }
    if (email           !== undefined) { fields.push(`email = $${idx++}`);           values.push(email ? email.trim().toLowerCase() : email); }
    if (resolvedGross   !== undefined) { fields.push(`salary = $${idx++}`);          values.push(resolvedGross); }
    if (department      !== undefined) { fields.push(`department = $${idx++}`);      values.push(department); }
    if (designation     !== undefined) { fields.push(`designation = $${idx++}`);     values.push(designation); }
    if (phone           !== undefined) { fields.push(`phone = $${idx++}`);           values.push(phone); }
    if (date_of_joining !== undefined) { fields.push(`date_of_joining = $${idx++}`); values.push(date_of_joining); }
    if (location        !== undefined) { fields.push(`location = $${idx++}`);        values.push(location || null); }
    if (pan_number          !== undefined) { fields.push(`pan_number = $${idx++}`);          values.push(pan_number ? pan_number.trim().toUpperCase() : null); }
    if (uan_number          !== undefined) { fields.push(`uan_number = $${idx++}`);          values.push(uan_number || null); }
    if (bank_name           !== undefined) { fields.push(`bank_name = $${idx++}`);           values.push(bank_name || null); }
    if (bank_account_number !== undefined) { fields.push(`bank_account_number = $${idx++}`); values.push(bank_account_number || null); }
    if (ifsc_code           !== undefined) { fields.push(`ifsc_code = $${idx++}`);           values.push(ifsc_code ? ifsc_code.trim().toUpperCase() : null); }
    if (portal_access_enabled !== undefined) { fields.push(`portal_access_enabled = $${idx++}`); values.push(portal_access_enabled === true || portal_access_enabled === 'true'); }

    // Sync CTC whenever gross changes, or save explicit CTC value
    if (yearly_ctc !== undefined) {
      const ctcVal = yearly_ctc !== '' ? parseFloat(yearly_ctc) : (resolvedGross ? resolvedGross * 12 : null);
      fields.push(`yearly_ctc = $${idx++}`); values.push(ctcVal);
    } else if (resolvedGross !== undefined) {
      fields.push(`yearly_ctc = $${idx++}`); values.push(resolvedGross * 12);
    }
    if (net_salary_monthly !== undefined) {
      fields.push(`net_salary_monthly = $${idx++}`);
      values.push(net_salary_monthly !== '' ? parseFloat(net_salary_monthly) : null);
    }

    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

    values.push(id);
    await pool.query(`UPDATE employees SET ${fields.join(', ')} WHERE id = $${idx}`, values);

    await auditLog(req.admin_id, 'employee_updated', 'employees', id, { fields: fields.map(f => f.split(' ')[0]) }, req.ip);
    res.json({ message: 'Employee updated!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST reset employee portal password — admin action ────────────────────────
router.post('/:id/reset-portal-password', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const empResult = await pool.query(
      'SELECT * FROM employees WHERE id = $1 AND admin_id = $2',
      [id, req.admin_id]
    );
    const employee = empResult.rows[0];
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    if (!employee.email) return res.status(400).json({ error: 'Employee has no email address. Add an email first.' });

    const tempPassword = generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, 12);

    await pool.query(
      'UPDATE employees SET password = $1, is_temp_password = true, portal_access_enabled = true WHERE id = $2',
      [hash, id]
    );

    const adminRes = await pool.query('SELECT company_name FROM admins WHERE id = $1', [req.admin_id]);
    const companyName = adminRes.rows[0]?.company_name || 'Your Company';
    await sendPortalWelcomeEmail(employee, tempPassword, companyName, req);

    await auditLog(req.admin_id, 'employee_portal_reset', 'employees', id, { employee_id: employee.employee_id }, req.ip);
    res.json({ message: `Portal password reset. Welcome email sent to ${employee.email}` });
  } catch (err) {
    console.error('[reset-portal-password]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── PUT toggle portal access on/off ──────────────────────────────────────────
router.put('/:id/portal-access', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { enabled } = req.body;
    const empResult = await pool.query(
      'SELECT * FROM employees WHERE id = $1 AND admin_id = $2',
      [id, req.admin_id]
    );
    const employee = empResult.rows[0];
    if (!employee) return res.status(404).json({ error: 'Employee not found' });

    if (enabled && !employee.email)
      return res.status(400).json({ error: 'Employee must have an email address to enable portal access.' });

    // If enabling for first time and no password set, generate temp password and send email
    let tempPassword = null;
    if (enabled && !employee.portal_access_enabled) {
      tempPassword = generateTempPassword();
      const hash = await bcrypt.hash(tempPassword, 12);
      await pool.query(
        'UPDATE employees SET portal_access_enabled = true, password = $1, is_temp_password = true WHERE id = $2',
        [hash, id]
      );
      const adminRes = await pool.query('SELECT company_name FROM admins WHERE id = $1', [req.admin_id]);
      const companyName = adminRes.rows[0]?.company_name || 'Your Company';
      sendPortalWelcomeEmail(employee, tempPassword, companyName, req)
        .catch(err => console.error('[portal-toggle] Email failed:', err.message));
    } else {
      await pool.query('UPDATE employees SET portal_access_enabled = $1 WHERE id = $2', [!!enabled, id]);
    }

    res.json({ message: enabled ? `Portal access enabled. Welcome email sent to ${employee.email}` : 'Portal access disabled.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT mark employee as left (inactive) ─────────────────────────────────────
router.put('/:id/deactivate', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { date_of_exit, exit_reason } = req.body;
    const check = await pool.query('SELECT id, employee_id FROM employees WHERE id = $1 AND admin_id = $2', [id, req.admin_id]);
    if (!check.rows.length) return res.status(404).json({ error: 'Employee not found' });
    await pool.query(
      `UPDATE employees SET status = 'inactive', date_of_exit = $1, exit_reason = $2 WHERE id = $3`,
      [date_of_exit || new Date().toISOString().slice(0,10), exit_reason || '', id]
    );
    await auditLog(req.admin_id, 'employee_deactivated', 'employees', id, { employee_id: check.rows[0].employee_id, date_of_exit }, req.ip);
    res.json({ message: 'Employee marked as left. All their payslip history is preserved.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PUT reactivate employee ───────────────────────────────────────────────────
router.put('/:id/reactivate', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const check = await pool.query('SELECT id, employee_id FROM employees WHERE id = $1 AND admin_id = $2', [id, req.admin_id]);
    if (!check.rows.length) return res.status(404).json({ error: 'Employee not found' });
    await pool.query(`UPDATE employees SET status = 'active', date_of_exit = NULL, exit_reason = NULL WHERE id = $1`, [id]);
    await auditLog(req.admin_id, 'employee_reactivated', 'employees', id, { employee_id: check.rows[0].employee_id }, req.ip);
    res.json({ message: 'Employee reactivated successfully.' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE employee ───────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await pool.query(
      'DELETE FROM employees WHERE id = $1 AND admin_id = $2 RETURNING employee_id',
      [id, req.admin_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Employee not found' });

    await auditLog(req.admin_id, 'employee_deleted', 'employees', id, { employee_id: result.rows[0].employee_id }, req.ip);
    res.json({ message: 'Employee deleted!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST bulk delete ──────────────────────────────────────────────────────────
router.post('/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: 'No IDs provided' });
    const numIds = ids.map(Number);
    await pool.query(
      'DELETE FROM employees WHERE admin_id = $1 AND id = ANY($2::int[])',
      [req.admin_id, numIds]
    );
    await auditLog(req.admin_id, 'employees_bulk_deleted', 'employees', null, { count: ids.length }, req.ip);
    res.json({ message: `${ids.length} employees deleted` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
