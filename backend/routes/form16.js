/**
 * PayLeef — Form 16 Part B Routes
 * GET  /api/form16?fy=2024-25            List employees + their form16 status
 * POST /api/form16/declarations          Save tax declarations for one employee
 * GET  /api/form16/settings             Get/set admin TAN + company PAN
 * POST /api/form16/settings             Save admin TAN + company PAN
 * GET  /api/form16/download/:employee_id?fy=2024-25   Download PDF
 * GET  /api/form16/download-all?fy=2024-25            Bulk ZIP
 */
const express   = require('express');
const router    = express.Router();
const PDFDoc    = require('pdfkit');
const archiver  = require('archiver');
const { pool }  = require('../database');
const authCheck = require('../middleware/auth');
const { buildForm16Data, renderForm16PDF } = require('../lib/form16PDF');

router.use(authCheck);

// ── DB table init (called once) ────────────────────────────────────────────
async function ensureTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS form16_declarations (
      id             SERIAL PRIMARY KEY,
      admin_id       INTEGER NOT NULL,
      employee_id    TEXT    NOT NULL,
      financial_year TEXT    NOT NULL,
      tax_regime     TEXT    NOT NULL DEFAULT 'new',
      hra_exemption      NUMERIC DEFAULT 0,
      other_section10    NUMERIC DEFAULT 0,
      investment_80c     NUMERIC DEFAULT 0,
      mediclaim_80d      NUMERIC DEFAULT 0,
      other_deductions   NUMERIC DEFAULT 0,
      tds_override       NUMERIC DEFAULT 0,
      tan                TEXT DEFAULT '',
      company_pan        TEXT DEFAULT '',
      updated_at         TIMESTAMP DEFAULT NOW(),
      UNIQUE (admin_id, employee_id, financial_year)
    )
  `);
}
ensureTables().catch(e => console.error('[form16] table init:', e.message));

// ── Helpers ────────────────────────────────────────────────────────────────

/** Get all (month, year) pairs for a financial year string "2024-25" */
function getFYMonths(fy) {
  const startYear = parseInt(fy.split('-')[0]);
  const pairs = [];
  for (let m = 4; m <= 12; m++) pairs.push({ month: m, year: startYear });
  for (let m = 1; m <= 3;  m++) pairs.push({ month: m, year: startYear + 1 });
  return pairs;
}

/** Fetch all payslips for an employee in a given FY */
async function getEmployeePayslips(adminId, employeeId, fy) {
  const pairs  = getFYMonths(fy);
  const values = [adminId, employeeId];
  const placeholders = pairs
    .map((_, i) => `($${i * 2 + 3}, $${i * 2 + 4})`)
    .join(',');
  pairs.forEach(p => { values.push(p.month); values.push(p.year); });

  const { rows } = await pool.query(
    `SELECT month, year, total_earnings, total_deductions, net_salary,
            earnings, deductions, employer_contributions,
            working_days, present_days, lop_days, config_snapshot
     FROM payslips
     WHERE admin_id = $1 AND employee_id = $2
       AND (month, year) IN (${placeholders})
     ORDER BY year, month`,
    values
  );
  return rows;
}

/** Valid FY format check */
function isValidFY(fy) {
  return /^\d{4}-\d{2}$/.test(fy);
}

// ── GET /api/form16?fy=2024-25 ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { fy } = req.query;
    if (!fy || !isValidFY(fy)) return res.status(400).json({ error: 'Valid fy required (e.g. 2024-25)' });

    // All active employees
    const empResult = await pool.query(
      `SELECT employee_id, employee_name, department, designation, pan_number
       FROM employees
       WHERE admin_id = $1 AND (status IS NULL OR status = 'active')
       ORDER BY employee_name`,
      [req.admin_id]
    );

    // Existing declarations for this FY
    const declResult = await pool.query(
      `SELECT employee_id, tax_regime, hra_exemption, other_section10,
              investment_80c, mediclaim_80d, other_deductions, tds_override,
              tan, company_pan
       FROM form16_declarations
       WHERE admin_id = $1 AND financial_year = $2`,
      [req.admin_id, fy]
    );
    const declMap = {};
    declResult.rows.forEach(r => { declMap[r.employee_id] = r; });

    // Payslip counts per employee for this FY
    const pairs = getFYMonths(fy);
    const values = [req.admin_id];
    const ph = pairs.map((_, i) => `($${i * 2 + 2}, $${i * 2 + 3})`).join(',');
    pairs.forEach(p => { values.push(p.month); values.push(p.year); });

    const slipCounts = await pool.query(
      `SELECT employee_id, COUNT(*) as cnt,
              SUM(COALESCE((deductions->>'tds')::numeric, 0)) as tds_total
       FROM payslips
       WHERE admin_id = $1 AND (month, year) IN (${ph})
       GROUP BY employee_id`,
      values
    );
    const slipMap = {};
    slipCounts.rows.forEach(r => { slipMap[r.employee_id] = { cnt: parseInt(r.cnt), tds_total: parseFloat(r.tds_total) || 0 }; });

    const employees = empResult.rows.map(emp => ({
      ...emp,
      payslip_count:   slipMap[emp.employee_id]?.cnt       || 0,
      tds_from_slips:  slipMap[emp.employee_id]?.tds_total || 0,
      declarations:    declMap[emp.employee_id] || null,
      has_declaration: !!declMap[emp.employee_id],
      can_generate:    (slipMap[emp.employee_id]?.cnt || 0) > 0,
    }));

    res.json({ employees, fy });
  } catch (err) {
    console.error('[form16/get]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/form16/declarations — save declarations ──────────────────────
router.post('/declarations', async (req, res) => {
  try {
    const {
      employee_id, financial_year,
      tax_regime = 'new',
      hra_exemption = 0, other_section10 = 0,
      investment_80c = 0, mediclaim_80d = 0, other_deductions = 0,
      tds_override = 0,
      tan = '', company_pan = '',
    } = req.body;

    if (!employee_id || !financial_year) {
      return res.status(400).json({ error: 'employee_id and financial_year required' });
    }

    await pool.query(
      `INSERT INTO form16_declarations
         (admin_id, employee_id, financial_year, tax_regime,
          hra_exemption, other_section10, investment_80c, mediclaim_80d,
          other_deductions, tds_override, tan, company_pan, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
       ON CONFLICT (admin_id, employee_id, financial_year) DO UPDATE SET
         tax_regime        = $4,
         hra_exemption     = $5,
         other_section10   = $6,
         investment_80c    = $7,
         mediclaim_80d     = $8,
         other_deductions  = $9,
         tds_override      = $10,
         tan               = $11,
         company_pan       = $12,
         updated_at        = NOW()`,
      [req.admin_id, employee_id, financial_year, tax_regime,
       Number(hra_exemption)  || 0,
       Number(other_section10) || 0,
       Number(investment_80c) || 0,
       Number(mediclaim_80d)  || 0,
       Number(other_deductions) || 0,
       Number(tds_override)   || 0,
       tan.slice(0, 20),
       company_pan.slice(0, 20)]
    );

    res.json({ message: 'Declarations saved' });
  } catch (err) {
    console.error('[form16/declarations]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/form16/download/:employee_id?fy=2024-25 ─────────────────────
router.get('/download/:employee_id', async (req, res) => {
  try {
    const { employee_id } = req.params;
    const { fy } = req.query;
    if (!fy || !isValidFY(fy)) return res.status(400).json({ error: 'Valid fy required' });

    // Get employee
    const empResult = await pool.query(
      `SELECT employee_id, employee_name, department, designation, pan_number
       FROM employees WHERE admin_id = $1 AND employee_id = $2`,
      [req.admin_id, employee_id]
    );
    if (!empResult.rows.length) return res.status(404).json({ error: 'Employee not found' });
    const employee = empResult.rows[0];

    // Get payslips
    const payslips = await getEmployeePayslips(req.admin_id, employee_id, fy);
    if (!payslips.length) return res.status(400).json({ error: 'No payslips found for this employee in the selected financial year' });

    // Get declarations
    const declResult = await pool.query(
      `SELECT * FROM form16_declarations WHERE admin_id = $1 AND employee_id = $2 AND financial_year = $3`,
      [req.admin_id, employee_id, fy]
    );
    const declarations = declResult.rows[0] || {};

    // Get branding + admin info
    const cfgResult = await pool.query(
      `SELECT branding FROM payroll_configs WHERE admin_id = $1`, [req.admin_id]
    );
    const branding = cfgResult.rows[0]?.branding || {};

    const adminResult = await pool.query(
      `SELECT company_name, company_address FROM admins WHERE id = $1`, [req.admin_id]
    );
    const admin = adminResult.rows[0] || {};

    // Build data + render PDF
    const data = buildForm16Data(employee, payslips, declarations, branding, admin, fy);

    const doc = new PDFDoc({ size: 'A4', margin: 0 });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => {
      const buf = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition',
        `attachment; filename="Form16_PartB_${employee_id}_FY${fy}.pdf"`);
      res.send(buf);
    });

    renderForm16PDF(doc, data);
    doc.end();
  } catch (err) {
    console.error('[form16/download]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/form16/download-all?fy=2024-25 — bulk ZIP ───────────────────
router.get('/download-all', async (req, res) => {
  try {
    const { fy } = req.query;
    if (!fy || !isValidFY(fy)) return res.status(400).json({ error: 'Valid fy required' });

    // All active employees
    const empResult = await pool.query(
      `SELECT employee_id, employee_name, department, designation, pan_number
       FROM employees
       WHERE admin_id = $1 AND (status IS NULL OR status = 'active')
       ORDER BY employee_name`,
      [req.admin_id]
    );

    // Get branding + admin
    const cfgResult = await pool.query(
      `SELECT branding FROM payroll_configs WHERE admin_id = $1`, [req.admin_id]
    );
    const branding = cfgResult.rows[0]?.branding || {};
    const adminResult = await pool.query(
      `SELECT company_name, company_address FROM admins WHERE id = $1`, [req.admin_id]
    );
    const admin = adminResult.rows[0] || {};

    // Get all declarations for this FY
    const declResult = await pool.query(
      `SELECT * FROM form16_declarations WHERE admin_id = $1 AND financial_year = $2`,
      [req.admin_id, fy]
    );
    const declMap = {};
    declResult.rows.forEach(r => { declMap[r.employee_id] = r; });

    // Start ZIP
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="Form16_PartB_FY${fy}.zip"`);

    const archive = archiver('zip', { zlib: { level: 6 } });
    archive.pipe(res);

    let count = 0;
    for (const employee of empResult.rows) {
      const payslips = await getEmployeePayslips(req.admin_id, employee.employee_id, fy);
      if (!payslips.length) continue;

      const declarations = declMap[employee.employee_id] || {};
      const data = buildForm16Data(employee, payslips, declarations, branding, admin, fy);

      // Generate PDF buffer
      await new Promise((resolve, reject) => {
        const doc = new PDFDoc({ size: 'A4', margin: 0 });
        const chunks = [];
        doc.on('data', c => chunks.push(c));
        doc.on('end', () => {
          const buf = Buffer.concat(chunks);
          archive.append(buf, { name: `Form16_PartB_${employee.employee_id}_FY${fy}.pdf` });
          count++;
          resolve();
        });
        doc.on('error', reject);
        renderForm16PDF(doc, data);
        doc.end();
      });
    }

    if (count === 0) {
      archive.abort();
      return res.status(400).json({ error: 'No payslips found for any employee in this financial year' });
    }

    await archive.finalize();
  } catch (err) {
    console.error('[form16/download-all]', err.message);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

module.exports = router;
