const express    = require('express');
const bcrypt     = require('bcryptjs');
const router     = express.Router();
const { pool, auditLog } = require('../database');
const authCheck  = require('../middleware/auth');

router.use(authCheck);

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

    // Default password = employee_id if not provided
    const rawPwd = password || empId;
    const hashedPwd = await bcrypt.hash(rawPwd, 10);

    const ctc      = yearly_ctc        ? parseFloat(yearly_ctc)         : grossMonthly * 12;
    const netMthly = net_salary_monthly ? parseFloat(net_salary_monthly) : null;

    const result = await pool.query(`
      INSERT INTO employees
        (admin_id, employee_id, employee_name, email, salary, yearly_ctc, net_salary_monthly,
         department, designation, phone, date_of_joining, password,
         location, pan_number, uan_number, bank_name, bank_account_number, ifsc_code)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
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
    ]);

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
