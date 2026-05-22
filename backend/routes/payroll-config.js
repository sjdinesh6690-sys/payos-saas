const express    = require('express');
const router     = express.Router();
const PDFDocument = require('pdfkit');
const { pool }   = require('../database');
const authCheck  = require('../middleware/auth');
const { getDefaultConfig, calculatePayslip } = require('../lib/payrollEngine');
const { renderPayslipPDF } = require('../lib/pdfTemplates');

router.use(authCheck);

function getDefaultBranding() {
  return {
    template:                    'modern',
    company_name:                '',
    company_address:             '',
    company_phone:               '',
    company_email:               '',
    company_website:             '',
    company_gstin:               '',
    logo_base64:                 '',
    primary_color:               '#E85C2F',
    show_employer_contributions: true,
    show_signature_line:         true,
    custom_footer_text:          'This is a computer-generated payslip and does not require a signature.',
  };
}

// ── GET payroll config ────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT config FROM payroll_configs WHERE admin_id = $1', [req.admin_id]
    );
    if (!result.rows.length)
      return res.json({ config: getDefaultConfig(), is_default: true });
    res.json({ config: result.rows[0].config, is_default: false });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PUT payroll config ────────────────────────────────────────────────────────
router.put('/', async (req, res) => {
  try {
    const { earnings, deductions } = req.body;
    if (!earnings || !deductions)
      return res.status(400).json({ error: 'earnings and deductions are required' });

    await pool.query(`
      INSERT INTO payroll_configs (admin_id, config, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (admin_id) DO UPDATE SET config = $2, updated_at = NOW()
    `, [req.admin_id, JSON.stringify({ earnings, deductions })]);

    res.json({ message: 'Payroll configuration saved successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GET branding ──────────────────────────────────────────────────────────────
router.get('/branding', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT branding FROM payroll_configs WHERE admin_id = $1', [req.admin_id]
    );
    const branding = (result.rows.length && result.rows[0].branding)
      ? result.rows[0].branding
      : getDefaultBranding();
    res.json({ branding });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PUT branding ──────────────────────────────────────────────────────────────
router.put('/branding', async (req, res) => {
  try {
    const branding = req.body;
    if (!branding) return res.status(400).json({ error: 'Branding data required' });

    const validTemplates = ['classic', 'modern', 'corporate', 'minimal', 'premium'];
    if (branding.template && !validTemplates.includes(branding.template))
      return res.status(400).json({ error: 'Invalid template name' });

    if (branding.logo_base64 && branding.logo_base64.length > 3_000_000)
      return res.status(400).json({ error: 'Logo too large. Use an image under 2MB.' });

    await pool.query(`
      INSERT INTO payroll_configs (admin_id, branding, config, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (admin_id) DO UPDATE SET branding = $2, updated_at = NOW()
    `, [req.admin_id, JSON.stringify(branding), JSON.stringify(getDefaultConfig())]);

    res.json({ message: 'Branding saved successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── POST preview-pdf — download sample PDF with given branding (not saved) ───
router.post('/preview-pdf', async (req, res) => {
  try {
    const branding = req.body || {};

    // Build a realistic sample payslip
    const cfg = getDefaultConfig();
    const sampleEmp = { salary: 65000 };
    const calc = calculatePayslip(sampleEmp, cfg, { working_days: 26 });

    const samplePayslip = {
      employee_name:          'Sample Employee',
      employee_id:            'EMP001',
      department:             'Engineering',
      designation:            'Software Engineer',
      month:                  new Date().getMonth() + 1,
      year:                   new Date().getFullYear(),
      salary:                 65000,
      gross_salary:           calc.gross_salary,
      net_salary:             calc.net_salary,
      total_earnings:         calc.total_earnings,
      total_deductions:       calc.total_deductions,
      earnings:               calc.earnings,
      deductions:             calc.deductions,
      employer_contributions: calc.employer_contributions,
      working_days:           26,
      present_days:           26,
      lop_days:               0,
      config_snapshot:        cfg,
    };

    const adminResult = await pool.query('SELECT * FROM admins WHERE id = $1', [req.admin_id]);
    const admin = adminResult.rows[0] || {};

    const isPremium = (branding.template || 'modern') === 'premium';
    const doc = new PDFDocument({ size: 'A4', margin: isPremium ? 0 : 40 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="PayLeef_Sample_Payslip.pdf"');
    doc.pipe(res);
    renderPayslipPDF(doc, samplePayslip, branding, admin);
    doc.end();
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// ── POST preview — live payroll calculation ───────────────────────────────────
router.post('/preview', async (req, res) => {
  try {
    const { salary, adjustments, config } = req.body;
    if (!salary) return res.status(400).json({ error: 'salary required' });

    let cfg = config;
    if (!cfg) {
      const result = await pool.query(
        'SELECT config FROM payroll_configs WHERE admin_id = $1', [req.admin_id]
      );
      cfg = result.rows.length ? result.rows[0].config : getDefaultConfig();
    }

    const result = calculatePayslip({ salary }, cfg, adjustments || {});
    const earningLabels   = {};
    const deductionLabels = {};
    (cfg.earnings   || []).forEach(c => { earningLabels[c.key]   = c.label; });
    (cfg.deductions || []).forEach(c => { deductionLabels[c.key] = c.label; });

    res.json({ ...result, earningLabels, deductionLabels });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
