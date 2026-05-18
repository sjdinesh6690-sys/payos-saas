const express = require('express');
const { db }  = require('../config/db');
const { authMiddleware, employeeOnly } = require('../middleware/auth');
const { getPayslipBuffer } = require('../utils/pdfGenerator');

const router = express.Router();
router.use(authMiddleware, employeeOnly);

// Payslip availability helper
const isAvailable = (month) => {
  const [y, m] = month.split('-').map(Number);
  const availFrom = new Date(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 1);
  return new Date() >= availFrom;
};

// GET /api/employee/payslips  — own payslips only
router.get('/payslips', async (req, res) => {
  try {
    const empId = req.user.employee_id;
    const all   = await db.payslips.find(p => p.employee_id === empId);
    const list  = all
      .filter(p => isAvailable(p.month))
      .sort((a, b) => b.month.localeCompare(a.month));
    res.json(list);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load payslips.' });
  }
});

// GET /api/employee/payslips/:id/download
router.get('/payslips/:id/download', async (req, res) => {
  try {
    const empId   = req.user.employee_id;
    const payslip = await db.payslips.findOne(p =>
      p.id === parseInt(req.params.id) && p.employee_id === empId
    );
    if (!payslip) return res.status(404).json({ error: 'Payslip not found.' });
    if (!isAvailable(payslip.month)) return res.status(403).json({ error: 'Payslip not yet available.' });
    const buffer = await getPayslipBuffer(payslip);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Payslip_${payslip.month}.pdf"`);
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate PDF.' });
  }
});

// GET /api/employee/profile
router.get('/profile', async (req, res) => {
  try {
    const emp = await db.employees.findOne(e => e.employee_id === req.user.employee_id);
    if (!emp) return res.status(404).json({ error: 'Profile not found.' });
    res.json(emp);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load profile.' });
  }
});

module.exports = router;
