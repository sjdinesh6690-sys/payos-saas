const express    = require('express');
const bcrypt     = require('bcryptjs');
const router     = express.Router();
const { pool, auditLog } = require('../database');
const authCheck  = require('../middleware/auth');

router.use(authCheck);

// ── GET all employees ─────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM employees WHERE admin_id = $1 ORDER BY employee_name ASC',
      [req.admin_id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST add employee ─────────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { employee_id, employee_name, email, salary, department, designation, phone, date_of_joining, password } = req.body;
    if (!employee_id || !employee_name)
      return res.status(400).json({ error: 'employee_id and employee_name are required' });

    if (isNaN(parseFloat(salary)) || parseFloat(salary) < 0)
      return res.status(400).json({ error: 'Salary must be a non-negative number' });

    const empId = employee_id.toUpperCase();

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

    const result = await pool.query(`
      INSERT INTO employees
        (admin_id, employee_id, employee_name, email, salary, department, designation, phone, date_of_joining, password)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
    `, [
      req.admin_id, empId, employee_name, email,
      parseFloat(salary) || 0,
      department || '', designation || '', phone || '', date_of_joining || '',
      hashedPwd,
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
        // Accept both 'salary' and 'gross_salary' column names
        const salary = row.salary || row.gross_salary || row.ctc || 0;
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
            (admin_id, employee_id, employee_name, email, salary, department, designation, phone, date_of_joining, password)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        `, [req.admin_id, empId, employee_name.trim(), emailVal, parseFloat(salary)||0, (department||'').trim(), (designation||'').trim(), (phone||'').trim(), (date_of_joining||'').trim(), hashedPwd]);
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

    const { employee_name, email, salary, department, designation, phone, date_of_joining } = req.body;

    if (salary !== undefined && (isNaN(parseFloat(salary)) || parseFloat(salary) < 0))
      return res.status(400).json({ error: 'Salary must be a non-negative number' });

    const fields = [];
    const values = [];
    let idx = 1;

    if (employee_name  !== undefined) { fields.push(`employee_name = $${idx++}`);  values.push(employee_name); }
    if (email          !== undefined) { fields.push(`email = $${idx++}`);           values.push(email); }
    if (salary         !== undefined) { fields.push(`salary = $${idx++}`);          values.push(parseFloat(salary)); }
    if (department     !== undefined) { fields.push(`department = $${idx++}`);      values.push(department); }
    if (designation    !== undefined) { fields.push(`designation = $${idx++}`);     values.push(designation); }
    if (phone          !== undefined) { fields.push(`phone = $${idx++}`);           values.push(phone); }
    if (date_of_joining !== undefined) { fields.push(`date_of_joining = $${idx++}`); values.push(date_of_joining); }

    if (!fields.length) return res.status(400).json({ error: 'Nothing to update' });

    values.push(id);
    await pool.query(`UPDATE employees SET ${fields.join(', ')} WHERE id = $${idx}`, values);

    await auditLog(req.admin_id, 'employee_updated', 'employees', id, { fields: fields.map(f => f.split(' ')[0]) }, req.ip);
    res.json({ message: 'Employee updated!' });
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
