const express  = require('express');
const multer   = require('multer');
const archiver = require('archiver');
const { parse } = require('csv-parse/sync');
const { db }   = require('../config/db');
const { authMiddleware, employerOnly } = require('../middleware/auth');
const { getPayslipBuffer } = require('../utils/pdfGenerator');

const router  = express.Router();
const upload  = multer({ storage: multer.memoryStorage() });

// Apply auth to all employer routes
router.use(authMiddleware, employerOnly);

// ── Dashboard Stats ─────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const employees = await db.employees.findAll();
    const payslips  = await db.payslips.findAll();
    const uploads   = await db.upload_history.findAll();
    res.json({
      totalEmployees: employees.length,
      totalPayslips:  payslips.length,
      totalUploads:   uploads.length,
      recentUploads:  uploads.sort((a, b) => b.id - a.id).slice(0, 5),
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load stats.' });
  }
});

// ── Employees ────────────────────────────────────────────────────────────────
router.get('/employees', async (req, res) => {
  try {
    const rows = await db.employees.findAll();
    res.json(rows.sort((a, b) => a.employee_id.localeCompare(b.employee_id)));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load employees.' });
  }
});

router.post('/employees', async (req, res) => {
  try {
    const { employee_id, employee_name, department } = req.body;
    if (!employee_id || !employee_name) return res.status(400).json({ error: 'ID and name required.' });
    const id = employee_id.toUpperCase().trim();
    const existing = await db.employees.findOne(e => e.employee_id === id);
    if (existing) return res.status(409).json({ error: 'Employee ID already exists.' });
    const emp = await db.employees.insert({ employee_id: id, employee_name: employee_name.trim(), department: department || '' });
    res.json(emp);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add employee.' });
  }
});

router.put('/employees/:id', async (req, res) => {
  try {
    const { employee_name, department } = req.body;
    await db.employees.update(e => e.id === parseInt(req.params.id), { employee_name, department });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update employee.' });
  }
});

router.delete('/employees/:id', async (req, res) => {
  try {
    await db.employees.deleteWhere(e => e.id === parseInt(req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete employee.' });
  }
});

// ── Upload CSV & Generate Payslips ───────────────────────────────────────────
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    const { month } = req.body;
    if (!month) return res.status(400).json({ error: 'Month is required (YYYY-MM).' });

    // Parse CSV
    const text = req.file.buffer.toString('utf-8');
    const rows = parse(text, { columns: true, skip_empty_lines: true, trim: true });

    if (!rows.length) return res.status(400).json({ error: 'CSV file is empty.' });

    // Validate headers
    const required = ['employee_id', 'employee_name', 'basic_salary'];
    const headers  = Object.keys(rows[0]).map(h => h.toLowerCase());
    for (const h of required) {
      if (!headers.includes(h)) return res.status(400).json({ error: `Missing column: ${h}` });
    }

    // Delete existing payslips for this month before re-uploading
    await db.payslips.deleteWhere(p => p.month === month);

    let count = 0;
    for (const row of rows) {
      const employee_id   = (row.employee_id || row.Employee_ID || '').toString().toUpperCase().trim();
      const employee_name = (row.employee_name || row.Employee_Name || '').toString().trim();
      const basic_salary  = parseFloat(row.basic_salary || row.Basic_Salary || 0);
      const hra           = parseFloat(row.hra || row.HRA || 0);
      const food_allowance = parseFloat(row.food_allowance || row.Food_Allowance || 0);
      const department    = (row.department || row.Department || '').toString().trim();
      const total_salary  = basic_salary + hra + food_allowance;

      if (!employee_id || !employee_name || isNaN(basic_salary)) continue;

      // Upsert employee record
      const existing = await db.employees.findOne(e => e.employee_id === employee_id);
      if (!existing) {
        await db.employees.insert({ employee_id, employee_name, department });
      }

      await db.payslips.insert({
        employee_id, employee_name, department, month,
        basic_salary, hra, food_allowance, total_salary,
      });
      count++;
    }

    await db.upload_history.insert({
      month, filename: req.file.originalname, total_employees: count,
    });

    res.json({ success: true, count, month });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed: ' + err.message });
  }
});

// ── Payslips ────────────────────────────────────────────────────────────────
router.get('/payslips', async (req, res) => {
  try {
    const { month } = req.query;
    const all = await db.payslips.findAll();
    const list = month ? all.filter(p => p.month === month) : all;
    res.json(list.sort((a, b) => a.employee_id.localeCompare(b.employee_id)));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load payslips.' });
  }
});

router.get('/payslips/months', async (req, res) => {
  try {
    const all = await db.payslips.findAll();
    const months = [...new Set(all.map(p => p.month))].sort().reverse();
    res.json(months);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load months.' });
  }
});

// Single PDF download
router.get('/payslips/:id/download', async (req, res) => {
  try {
    const payslip = await db.payslips.findOne(p => p.id === parseInt(req.params.id));
    if (!payslip) return res.status(404).json({ error: 'Payslip not found.' });
    const buffer = await getPayslipBuffer(payslip);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Payslip_${payslip.employee_id}_${payslip.month}.pdf"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate PDF.' });
  }
});

// ZIP download — all payslips for a month
router.get('/payslips/download-all', async (req, res) => {
  try {
    const { month } = req.query;
    if (!month) return res.status(400).json({ error: 'Month required.' });
    const list = await db.payslips.find(p => p.month === month);
    if (!list.length) return res.status(404).json({ error: 'No payslips for this month.' });
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="Payslips_${month}.zip"`);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.pipe(res);
    for (const p of list) {
      const buffer = await getPayslipBuffer(p);
      archive.append(buffer, { name: `Payslip_${p.employee_id}_${p.month}.pdf` });
    }
    archive.finalize();
  } catch (err) {
    res.status(500).json({ error: 'Failed to create ZIP.' });
  }
});

router.delete('/payslips/:id', async (req, res) => {
  try {
    await db.payslips.deleteWhere(p => p.id === parseInt(req.params.id));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete payslip.' });
  }
});

// Upload history
router.get('/uploads', async (req, res) => {
  try {
    const all = await db.upload_history.findAll();
    res.json(all.sort((a, b) => b.id - a.id));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load upload history.' });
  }
});

module.exports = router;
