const express     = require('express');
const PDFDocument = require('pdfkit');
const router      = express.Router();
const { pool, auditLog } = require('../database');
const authCheck   = require('../middleware/auth');
const { getDefaultConfig, calculatePayslip } = require('../lib/payrollEngine');
const { renderPayslipPDF } = require('../lib/pdfTemplates');

router.use(authCheck);

const INR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

// ── GET payslips ──────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { month, year } = req.query;
    let query  = 'SELECT * FROM payslips WHERE admin_id = $1';
    const vals = [req.admin_id];
    let idx = 2;

    if (month) { query += ` AND month = $${idx++}`;  vals.push(parseInt(month)); }
    if (year)  { query += ` AND year  = $${idx++}`;  vals.push(parseInt(year));  }
    query += ' ORDER BY year DESC, month DESC, employee_name ASC';

    const result = await pool.query(query, vals);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET months that have payslips ─────────────────────────────────────────────
router.get('/months', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT year, month FROM payslips WHERE admin_id = $1
       ORDER BY year DESC, month DESC`,
      [req.admin_id]
    );
    const months = result.rows.map(r => `${r.year}-${String(r.month).padStart(2, '0')}`);
    res.json(months);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST generate payslips ────────────────────────────────────────────────────
router.post('/generate', async (req, res) => {
  try {
    const { month, year, adjustments = {}, working_days, employee_ids, salary_overrides = {} } = req.body;
    if (!month || !year) return res.status(400).json({ error: 'month and year required' });

    // Block future month generation (more than 1 month ahead)
    const now = new Date();
    const genDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const maxFuture = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    if (genDate > maxFuture)
      return res.status(400).json({ error: 'Cannot generate payslips for future months' });

    // Build employee query — only active, optionally filtered by selected IDs
    let empQuery = `SELECT * FROM employees WHERE admin_id = $1 AND (status = 'active' OR status IS NULL)`;
    const empParams = [req.admin_id];
    if (Array.isArray(employee_ids) && employee_ids.length > 0) {
      empQuery += ` AND employee_id = ANY($2::text[])`;
      empParams.push(employee_ids);
    }
    empQuery += ' ORDER BY employee_name ASC';

    const empResult = await pool.query(empQuery, empParams);
    if (!empResult.rows.length)
      return res.status(404).json({ error: 'No employees found. Add employees first.' });

    // Load payroll config
    const cfgResult = await pool.query(
      'SELECT config FROM payroll_configs WHERE admin_id = $1',
      [req.admin_id]
    );
    const config = cfgResult.rows.length ? cfgResult.rows[0].config : getDefaultConfig();

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete existing payslips for the selected employees this month/year
      if (Array.isArray(employee_ids) && employee_ids.length > 0) {
        await client.query(
          'DELETE FROM payslips WHERE admin_id = $1 AND month = $2 AND year = $3 AND employee_id = ANY($4::text[])',
          [req.admin_id, parseInt(month), parseInt(year), employee_ids]
        );
      } else {
        await client.query(
          'DELETE FROM payslips WHERE admin_id = $1 AND month = $2 AND year = $3',
          [req.admin_id, parseInt(month), parseInt(year)]
        );
      }

      // Generate one payslip per employee
      for (const emp of empResult.rows) {
        // Use salary override if provided (for retroactive payslips with different pay)
        const overrideSalary = salary_overrides[emp.employee_id];
        const empData = overrideSalary ? { ...emp, salary: Number(overrideSalary) } : emp;

        const empAdj = {
          working_days: working_days || 26,
          ...(adjustments[emp.employee_id] || {}),
        };
        const calc = calculatePayslip(empData, config, empAdj);

        await client.query(`
          INSERT INTO payslips
            (admin_id, employee_id, employee_name, department, designation, salary,
             gross_salary, net_salary, month, year,
             working_days, present_days, lop_days,
             earnings, deductions, total_earnings, total_deductions,
             employer_contributions, config_snapshot)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
        `, [
          req.admin_id,
          emp.employee_id,
          emp.employee_name,
          emp.department || '',
          emp.designation || '',
          overrideSalary ? Number(overrideSalary) : emp.salary,
          calc.gross_salary,
          calc.net_salary,
          parseInt(month),
          parseInt(year),
          calc.working_days,
          calc.present_days,
          calc.lop_days,
          JSON.stringify(calc.earnings),
          JSON.stringify(calc.deductions),
          calc.total_earnings,
          calc.total_deductions,
          JSON.stringify(calc.employer_contributions),
          JSON.stringify(config),
        ]);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    await auditLog(req.admin_id, 'payslips_generated', 'payslips', null,
      { month, year, count: empResult.rows.length }, req.ip);

    res.json({
      message: `${empResult.rows.length} payslips generated for ${month}/${year}`,
      count: empResult.rows.length,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET employee's own payslips ───────────────────────────────────────────────
router.get('/employee-payslips', async (req, res) => {
  try {
    if (!req.employee_db_id) return res.status(403).json({ error: 'Employee access only' });

    const empResult = await pool.query(
      'SELECT employee_id FROM employees WHERE id = $1 AND admin_id = $2',
      [req.employee_db_id, req.admin_id]
    );
    if (!empResult.rows.length) return res.status(404).json({ error: 'Employee not found' });

    const result = await pool.query(
      `SELECT * FROM payslips
       WHERE admin_id = $1 AND employee_id = $2
       ORDER BY year DESC, month DESC`,
      [req.admin_id, empResult.rows[0].employee_id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET download single payslip as PDF ────────────────────────────────────────
router.get('/:id/download', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Allow both admin and employee access
    let psResult;
    if (req.admin_id && !req.employee_db_id) {
      psResult = await pool.query(
        'SELECT * FROM payslips WHERE id = $1 AND admin_id = $2',
        [id, req.admin_id]
      );
    } else {
      const emp = await pool.query('SELECT employee_id FROM employees WHERE id = $1', [req.employee_db_id]);
      if (!emp.rows.length) return res.status(404).json({ error: 'Employee not found' });
      psResult = await pool.query(
        'SELECT * FROM payslips WHERE id = $1 AND admin_id = $2 AND employee_id = $3',
        [id, req.admin_id, emp.rows[0].employee_id]
      );
    }

    if (!psResult.rows.length) return res.status(404).json({ error: 'Payslip not found' });
    const p = psResult.rows[0];

    const adminResult = await pool.query('SELECT * FROM admins WHERE id = $1', [req.admin_id]);
    const admin = adminResult.rows[0];

    const cfgResult = await pool.query('SELECT branding FROM payroll_configs WHERE admin_id = $1', [req.admin_id]);
    const branding  = cfgResult.rows.length ? (cfgResult.rows[0].branding || {}) : {};

    const isPremium = (branding.template || 'modern') === 'premium';
    const doc = new PDFDocument({ size: 'A4', margin: isPremium ? 0 : 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      `attachment; filename="Payslip_${p.employee_id}_${p.year}-${String(p.month).padStart(2, '0')}.pdf"`);
    doc.pipe(res);
    renderPayslipPDF(doc, p, branding, admin);
    doc.end();
  } catch (err) { if (!res.headersSent) res.status(500).json({ error: err.message }); }
});

// ── PUT edit payslip earnings/deductions ─────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { earnings, deductions } = req.body;

    if (!earnings || typeof earnings !== 'object')
      return res.status(400).json({ error: 'earnings object required' });

    const totalEarnings   = Object.values(earnings).reduce((s, v) => s + (Number(v) || 0), 0);
    const totalDeductions = deductions ? Object.values(deductions).reduce((s, v) => s + (Number(v) || 0), 0) : 0;
    const netSalary       = totalEarnings - totalDeductions;

    const result = await pool.query(`
      UPDATE payslips
      SET earnings = $1, deductions = $2,
          total_earnings = $3, total_deductions = $4,
          net_salary = $5, gross_salary = $3
      WHERE id = $6 AND admin_id = $7
      RETURNING id
    `, [
      JSON.stringify(earnings),
      JSON.stringify(deductions || {}),
      totalEarnings,
      totalDeductions,
      netSalary,
      id,
      req.admin_id,
    ]);

    if (!result.rows.length) return res.status(404).json({ error: 'Payslip not found' });
    await auditLog(req.admin_id, 'payslip_edited', 'payslips', id, { totalEarnings, totalDeductions, netSalary }, req.ip);
    res.json({ message: 'Payslip updated', net_salary: netSalary });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── DELETE single payslip ─────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await pool.query(
      'DELETE FROM payslips WHERE id = $1 AND admin_id = $2 RETURNING id',
      [id, req.admin_id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Payslip not found' });
    await auditLog(req.admin_id, 'payslip_deleted', 'payslips', id, null, req.ip);
    res.json({ message: 'Deleted!' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST bulk delete ──────────────────────────────────────────────────────────
router.post('/bulk-delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: 'No IDs provided' });
    await pool.query(
      'DELETE FROM payslips WHERE admin_id = $1 AND id = ANY($2::int[])',
      [req.admin_id, ids.map(Number)]
    );
    await auditLog(req.admin_id, 'payslips_bulk_deleted', 'payslips', null, { count: ids.length }, req.ip);
    res.json({ message: `${ids.length} payslips deleted` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST bulk mark-emailed (flag only — actual email sent via /api/email) ─────
router.post('/bulk-email', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) return res.status(400).json({ error: 'No IDs provided' });
    await pool.query(
      'UPDATE payslips SET emailed = true WHERE admin_id = $1 AND id = ANY($2::int[])',
      [req.admin_id, ids.map(Number)]
    );
    res.json({ message: `${ids.length} payslips marked as emailed`, count: ids.length });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST upload payslips from CSV ─────────────────────────────────────────────
router.post('/upload', async (req, res) => {
  try {
    const rows = Array.isArray(req.body) ? req.body : req.body.payslips;
    if (!rows || !rows.length) return res.status(400).json({ error: 'No payslip data provided' });

    const client = await pool.connect();
    let inserted = 0, skipped = 0, skippedReasons = [];

    try {
      await client.query('BEGIN');
      for (const row of rows) {
        const {
          employee_id, month, year,
          gross_salary, salary,
          basic_pay, hra, conveyance, special_allowance, other_allowance, bonus, overtime_pay,
          lop_days,
          pf_deduction, esi_deduction, pt_deduction, tds_deduction, other_deductions,
          net_pay,
        } = row;

        if (!employee_id || !month || !year) {
          skipped++; skippedReasons.push({ employee_id, reason: 'Missing employee_id, month or year' }); continue;
        }

        const empResult = await client.query(
          'SELECT employee_id, employee_name, department, designation, salary AS emp_salary FROM employees WHERE admin_id = $1 AND employee_id = $2',
          [req.admin_id, employee_id.toUpperCase()]
        );
        if (!empResult.rows.length) {
          skipped++; skippedReasons.push({ employee_id, reason: 'Employee not found' }); continue;
        }
        const emp = empResult.rows[0];

        // Delete existing payslip for same month/year
        await client.query(
          `DELETE FROM payslips WHERE admin_id = $1 AND employee_id = $2 AND month = $3 AND year = $4`,
          [req.admin_id, emp.employee_id, parseInt(month), parseInt(year)]
        );

        // Determine if detailed breakup was provided
        const hasBreakup = basic_pay || hra || pf_deduction || net_pay;
        const grossSal = parseFloat(gross_salary || salary || emp.emp_salary || 0);

        let earnings, deductions, totalEarnings, totalDeductions, netSalary;

        if (hasBreakup) {
          // ── Detailed mode: use provided values directly ─────────────────────
          const bp   = parseFloat(basic_pay        || 0);
          const hraV = parseFloat(hra              || 0);
          const conv = parseFloat(conveyance       || 0);
          const sa   = parseFloat(special_allowance|| 0);
          const oa   = parseFloat(other_allowance  || 0);
          const bonV = parseFloat(bonus            || 0);
          const otV  = parseFloat(overtime_pay     || 0);

          const pfD  = parseFloat(pf_deduction     || 0);
          const esiD = parseFloat(esi_deduction    || 0);
          const ptD  = parseFloat(pt_deduction     || 0);
          const tdsD = parseFloat(tds_deduction    || 0);
          const othD = parseFloat(other_deductions || 0);

          earnings = {
            'Basic Pay': bp,
            ...(hraV ? { 'HRA': hraV } : {}),
            ...(conv  ? { 'Conveyance Allowance': conv } : {}),
            ...(sa    ? { 'Special Allowance': sa } : {}),
            ...(oa    ? { 'Other Allowance': oa } : {}),
            ...(bonV  ? { 'Bonus': bonV } : {}),
            ...(otV   ? { 'Overtime': otV } : {}),
          };

          deductions = {
            ...(pfD  ? { 'Provident Fund': pfD } : {}),
            ...(esiD ? { 'ESI': esiD } : {}),
            ...(ptD  ? { 'Professional Tax': ptD } : {}),
            ...(tdsD ? { 'TDS': tdsD } : {}),
            ...(othD ? { 'Other Deductions': othD } : {}),
          };

          totalEarnings   = Object.values(earnings).reduce((a, b) => a + b, 0);
          totalDeductions = Object.values(deductions).reduce((a, b) => a + b, 0);
          netSalary = parseFloat(net_pay || 0) || (totalEarnings - totalDeductions);

        } else {
          // ── Auto mode: just store gross salary; generate step will calculate ─
          earnings   = {};
          deductions = {};
          totalEarnings   = grossSal;
          totalDeductions = 0;
          netSalary       = grossSal;
        }

        await client.query(`
          INSERT INTO payslips (
            admin_id, employee_id, employee_name, department, designation,
            salary, gross_salary, net_salary,
            earnings, deductions, total_earnings, total_deductions,
            lop_days, month, year
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
        `, [
          req.admin_id,
          emp.employee_id,
          emp.employee_name,
          emp.department || '',
          emp.designation || '',
          grossSal,
          hasBreakup ? totalEarnings : grossSal,
          netSalary,
          JSON.stringify(earnings),
          JSON.stringify(deductions),
          totalEarnings,
          totalDeductions,
          parseInt(lop_days || 0),
          parseInt(month),
          parseInt(year),
        ]);
        inserted++;
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    await auditLog(req.admin_id, 'payslips_bulk_upload', 'payslips', null, { inserted, skipped }, req.ip);
    res.json({ message: `${inserted} payslips uploaded, ${skipped} skipped`, inserted, skipped, skippedReasons });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
