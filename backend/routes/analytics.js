const express     = require('express');
const PDFDocument = require('pdfkit');
const router      = express.Router();
const { pool }    = require('../database');
const authCheck   = require('../middleware/auth');

router.use(authCheck);

// ── Helpers ─────────────────────────────────────────────────────────────────

// Derive statutory deductions from gross salary
const derive = (salary) => {
  const gross = salary || 0;
  const basic = gross * 0.5;
  const pf    = Math.round(basic * 0.12);
  const pfEmp = Math.round(basic * 0.12);
  const esi   = gross <= 21000 ? Math.round(gross * 0.0075) : 0;
  const esiEmp = gross <= 21000 ? Math.round(gross * 0.0325) : 0;
  const pt    = gross >= 15000 ? 200 : gross >= 10000 ? 150 : 0;
  const tds   = gross > 50000 ? Math.round(gross * 0.1) : 0;
  const net   = gross - pf - esi - pt - tds;
  return { gross, pf, pfEmp, esi, esiEmp, pt, tds, net };
};

// PDF boilerplate
const startPDF = (res, title, subtitle, filename) => {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  doc.rect(0, 0, doc.page.width, 80).fill('#1B4F8A');
  doc.fillColor('white').fontSize(18).text(title, 50, 20, { width: doc.page.width - 100, align: 'center' });
  doc.fontSize(10).text(subtitle, 50, 48, { width: doc.page.width - 100, align: 'center' });
  doc.fillColor('#333').moveDown(2);
  return doc;
};

const line = (doc) => doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#cccccc').moveDown(0.5);

const row = (doc, label, value) => {
  doc.fontSize(10).text(label, 55, doc.y, { continued: true, width: 300 });
  doc.text(value, { align: 'right' });
};

// Fetch payslips for current month
const getThisMonth = async (admin_id) => {
  const now   = new Date();
  const month = now.getMonth() + 1;
  const year  = now.getFullYear();
  const result = await pool.query(
    'SELECT * FROM payslips WHERE admin_id = $1 AND month = $2 AND year = $3',
    [admin_id, month, year]
  );
  return result.rows;
};

// ── Routes ───────────────────────────────────────────────────────────────────

// GET /api/analytics/salary-cost-analysis
router.get('/salary-cost-analysis', async (req, res) => {
  try {
    const records = await getThisMonth(req.admin_id);
    const now     = new Date();
    const doc     = startPDF(res, 'SALARY COST ANALYSIS', 'Total Cost to Company Report', 'salary_cost_analysis.pdf');

    if (!records.length) {
      doc.text('No payslips found for the current month.'); doc.end(); return;
    }

    let totGross = 0, totPF = 0, totPFEmp = 0, totESI = 0, totESIEmp = 0, totPT = 0, totTDS = 0;
    records.forEach(p => {
      const d = derive(p.salary);
      totGross += d.gross; totPF += d.pf; totPFEmp += d.pfEmp;
      totESI += d.esi; totESIEmp += d.esiEmp; totPT += d.pt; totTDS += d.tds;
    });
    const totalCTC  = totGross + totPFEmp + totESIEmp;
    const fmt       = (n) => `₹${n.toLocaleString('en-IN')}`;
    const monthName = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });

    doc.fontSize(12).fillColor('#1B4F8A').text(`Period: ${monthName}    Employees: ${records.length}`).moveDown(0.5);
    line(doc);

    doc.fontSize(11).fillColor('#333').text('EMPLOYEE SALARY', { underline: true }).moveDown(0.3);
    row(doc, 'Total Gross Salary Paid', fmt(totGross));
    row(doc, 'Employee PF (12% of Basic)', fmt(totPF));
    row(doc, 'Employee ESI (0.75%)', fmt(totESI));
    row(doc, 'Professional Tax (PT)', fmt(totPT));
    row(doc, 'TDS Deducted', fmt(totTDS));
    line(doc);

    doc.fontSize(11).text('EMPLOYER CONTRIBUTIONS', { underline: true }).moveDown(0.3);
    row(doc, 'Employer PF (12% of Basic)', fmt(totPFEmp));
    row(doc, 'Employer ESI (3.25%)', fmt(totESIEmp));
    line(doc);

    doc.fontSize(12).fillColor('#1B4F8A').text('TOTAL COST TO COMPANY (CTC)', { underline: true }).moveDown(0.3);
    row(doc, 'Gross Salaries', fmt(totGross));
    row(doc, '+ Employer PF', fmt(totPFEmp));
    row(doc, '+ Employer ESI', fmt(totESIEmp));
    line(doc);
    doc.fontSize(12).fillColor('#cc3300');
    row(doc, 'TOTAL CTC THIS MONTH', fmt(totalCTC));
    doc.fillColor('#333');
    row(doc, 'Cost per Employee (avg)', fmt(Math.round(totalCTC / records.length)));
    row(doc, 'Overhead % above salary', `${(((totalCTC - totGross) / totGross) * 100).toFixed(1)}%`);

    doc.end();
  } catch (err) { if (!res.headersSent) res.status(500).json({ error: err.message }); }
});

// GET /api/analytics/department-performance
router.get('/department-performance', async (req, res) => {
  try {
    const records = await getThisMonth(req.admin_id);
    const doc     = startPDF(res, 'DEPARTMENT PERFORMANCE', 'Department-wise Salary & Cost Analysis', 'department_performance.pdf');

    if (!records.length) { doc.text('No payslips for current month.'); doc.end(); return; }

    const depts = {};
    records.forEach(p => {
      const dept = p.department || 'General';
      if (!depts[dept]) depts[dept] = { count: 0, totalGross: 0, totalCTC: 0 };
      const d = derive(p.salary);
      depts[dept].count++;
      depts[dept].totalGross += d.gross;
      depts[dept].totalCTC  += d.gross + d.pfEmp + d.esiEmp;
    });

    const fmt = (n) => `₹${n.toLocaleString('en-IN')}`;

    doc.fontSize(12).fillColor('#1B4F8A').text('DEPARTMENT BREAKDOWN').moveDown(0.5);

    Object.entries(depts).sort((a, b) => b[1].totalGross - a[1].totalGross).forEach(([dept, data]) => {
      line(doc);
      doc.fontSize(11).fillColor('#1B4F8A').text(dept, { underline: true }).fillColor('#333');
      row(doc, 'Employees', String(data.count));
      row(doc, 'Total Gross Salary', fmt(data.totalGross));
      row(doc, 'Total CTC (with benefits)', fmt(data.totalCTC));
      row(doc, 'Avg Cost per Employee', fmt(Math.round(data.totalCTC / data.count)));
      doc.moveDown(0.3);
    });

    doc.end();
  } catch (err) { if (!res.headersSent) res.status(500).json({ error: err.message }); }
});

// GET /api/analytics/top-earners
router.get('/top-earners', async (req, res) => {
  try {
    const records = await getThisMonth(req.admin_id);
    const doc     = startPDF(res, 'TOP EARNERS REPORT', 'Top 10 Highest Paid Employees', 'top_earners.pdf');

    if (!records.length) { doc.text('No payslips for current month.'); doc.end(); return; }

    const sorted  = [...records].sort((a, b) => (b.salary || 0) - (a.salary || 0)).slice(0, 10);
    const totAll  = records.reduce((s, p) => s + (p.salary || 0), 0);
    const totTop  = sorted.reduce((s, p)  => s + (p.salary || 0), 0);
    const fmt     = (n) => `₹${n.toLocaleString('en-IN')}`;

    doc.fontSize(9).fillColor('#1B4F8A');
    doc.text('RANK', 55, doc.y, { width: 35, continued: true });
    doc.text('EMPLOYEE ID', { width: 90, continued: true });
    doc.text('NAME', { width: 180, continued: true });
    doc.text('GROSS SALARY', { align: 'right' });
    doc.fillColor('#333');
    line(doc);

    sorted.forEach((p, i) => {
      doc.fontSize(10);
      doc.text(String(i + 1).padStart(2, '0'), 55, doc.y, { width: 35, continued: true });
      doc.text(p.employee_id || '—', { width: 90, continued: true });
      doc.text((p.employee_name || '—').substring(0, 25), { width: 180, continued: true });
      doc.text(fmt(p.salary || 0), { align: 'right' });
    });

    line(doc);
    doc.fontSize(11);
    row(doc, 'Total Salary (Top 10)', fmt(totTop));
    row(doc, 'Total Payroll (All)', fmt(totAll));
    row(doc, 'Top 10 share of payroll', `${((totTop / totAll) * 100).toFixed(1)}%`);

    doc.end();
  } catch (err) { if (!res.headersSent) res.status(500).json({ error: err.message }); }
});

// GET /api/analytics/deduction-analytics
router.get('/deduction-analytics', async (req, res) => {
  try {
    const records = await getThisMonth(req.admin_id);
    const doc     = startPDF(res, 'DEDUCTION ANALYTICS', 'Where Employee Salary Goes — Full Breakdown', 'deduction_analytics.pdf');

    if (!records.length) { doc.text('No payslips for current month.'); doc.end(); return; }

    let totGross = 0, totPF = 0, totESI = 0, totPT = 0, totTDS = 0, totNet = 0;
    records.forEach(p => {
      const d = derive(p.salary);
      totGross += d.gross; totPF += d.pf; totESI += d.esi;
      totPT += d.pt; totTDS += d.tds; totNet += d.net;
    });
    const totDed = totPF + totESI + totPT + totTDS;
    const fmt    = (n) => `₹${n.toLocaleString('en-IN')}`;
    const pct    = (n) => `${((n / totGross) * 100).toFixed(1)}% of gross`;

    doc.fontSize(12).fillColor('#1B4F8A').text('DEDUCTION SUMMARY').moveDown(0.5);
    line(doc);
    row(doc, 'Total Gross Salary', fmt(totGross));
    doc.moveDown(0.3);
    doc.fontSize(11).fillColor('#333');
    row(doc, 'PF (Employee 12%)    — ' + pct(totPF), fmt(totPF));
    row(doc, 'ESI (Employee 0.75%) — ' + pct(totESI), fmt(totESI));
    row(doc, 'Professional Tax (PT) — ' + pct(totPT), fmt(totPT));
    row(doc, 'TDS (Income Tax) — ' + pct(totTDS), fmt(totTDS));
    line(doc);
    doc.fillColor('#cc3300');
    row(doc, 'TOTAL DEDUCTIONS', fmt(totDed));
    doc.fillColor('#006600');
    row(doc, 'NET SALARY PAID OUT', fmt(totNet));
    doc.fillColor('#333').moveDown(0.5);

    doc.fontSize(10).text(`Note: ESI applies only to employees earning ≤ ₹21,000/month (${
      records.filter(p => (p.salary || 0) <= 21000).length} of ${records.length} employees).`);

    doc.end();
  } catch (err) { if (!res.headersSent) res.status(500).json({ error: err.message }); }
});

// GET /api/analytics/cash-flow-forecast
router.get('/cash-flow-forecast', async (req, res) => {
  try {
    const records = await getThisMonth(req.admin_id);
    const doc     = startPDF(res, 'CASH FLOW FORECAST', 'Payment Schedule & Upcoming Liabilities', 'cash_flow_forecast.pdf');

    if (!records.length) { doc.text('No payslips for current month.'); doc.end(); return; }

    let totGross = 0, totPFEmp = 0, totESIEmp = 0, totPT = 0, totTDS = 0;
    records.forEach(p => {
      const d = derive(p.salary);
      totGross += d.gross; totPFEmp += d.pfEmp; totESIEmp += d.esiEmp; totPT += d.pt; totTDS += d.tds;
    });
    const totPF      = records.reduce((s, p) => s + derive(p.salary).pf,  0);
    const totPFTotal = totPF + totPFEmp;
    const totESI     = records.reduce((s, p) => s + derive(p.salary).esi, 0);
    const totESITotal = totESI + totESIEmp;

    const fmt          = (n) => `₹${n.toLocaleString('en-IN')}`;
    const nextMonthName = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1)
      .toLocaleString('en-IN', { month: 'long', year: 'numeric' });

    doc.fontSize(12).fillColor('#1B4F8A').text(`Payments Due — ${nextMonthName}`).moveDown(0.5);
    line(doc);

    const schedule = [
      { name: 'Employee Salaries',           amount: totGross,    due: 'Last working day of month' },
      { name: 'PF to EPFO (Emp + Employer)', amount: totPFTotal,  due: '15th of next month' },
      { name: 'ESI to ESIC (Emp + Employer)',amount: totESITotal, due: '21st of next month' },
      { name: 'Professional Tax (PT)',        amount: totPT,       due: 'Varies by state (usually 15th)' },
      { name: 'TDS to Income Tax Dept',      amount: totTDS,      due: '7th of next month' },
    ];

    let totalOut = 0;
    schedule.forEach(s => {
      doc.fontSize(11).fillColor('#333').text(s.name, 55, doc.y, { continued: true, width: 260 });
      doc.text(fmt(s.amount), { align: 'right' });
      doc.fontSize(9).fillColor('#666').text(`  Due: ${s.due}`).fillColor('#333');
      doc.moveDown(0.4);
      totalOut += s.amount;
    });

    line(doc);
    doc.fontSize(12).fillColor('#cc3300');
    row(doc, 'TOTAL CASH OUTFLOW', fmt(totalOut));
    doc.fillColor('#333').moveDown(1);

    doc.fontSize(10).text('CASH FLOW TIPS:', { underline: true }).moveDown(0.3);
    const tips = [
      'Keep 2 months of payroll as reserve for smooth operations',
      'PF & ESI payments attract penalty if delayed — pay on time',
      'TDS must be deposited by 7th of next month to avoid interest',
      'Plan salary disbursal 2–3 days before month end for banking delays',
    ];
    tips.forEach(t => doc.text(`• ${t}`));

    doc.end();
  } catch (err) { if (!res.headersSent) res.status(500).json({ error: err.message }); }
});

// GET /api/analytics/tax-planning
router.get('/tax-planning', async (req, res) => {
  try {
    const records = await getThisMonth(req.admin_id);
    const doc     = startPDF(res, 'TAX PLANNING REPORT', 'Tax Liability Analysis & Saving Opportunities', 'tax_planning.pdf');

    if (!records.length) { doc.text('No payslips for current month.'); doc.end(); return; }

    let totPF = 0, totPFEmp = 0, totESI = 0, totESIEmp = 0, totPT = 0, totTDS = 0, totGross = 0;
    records.forEach(p => {
      const d = derive(p.salary);
      totGross += d.gross; totPF += d.pf; totPFEmp += d.pfEmp;
      totESI += d.esi; totESIEmp += d.esiEmp; totPT += d.pt; totTDS += d.tds;
    });
    const totTax = totPF + totPFEmp + totESI + totESIEmp + totPT + totTDS;
    const fmt    = (n) => `₹${n.toLocaleString('en-IN')}`;

    doc.fontSize(12).fillColor('#1B4F8A').text('MONTHLY TAX LIABILITY').moveDown(0.5);
    line(doc);
    doc.fillColor('#333').fontSize(11);
    row(doc, 'PF (Employee 12%)', fmt(totPF));
    row(doc, 'PF (Employer 12%)', fmt(totPFEmp));
    row(doc, 'ESI (Employee 0.75%)', fmt(totESI));
    row(doc, 'ESI (Employer 3.25%)', fmt(totESIEmp));
    row(doc, 'Professional Tax (PT)', fmt(totPT));
    row(doc, 'TDS', fmt(totTDS));
    line(doc);
    doc.fontSize(12).fillColor('#cc3300');
    row(doc, 'TOTAL THIS MONTH', fmt(totTax));
    row(doc, 'ANNUAL PROJECTION', fmt(totTax * 12));
    doc.fillColor('#333').moveDown(1);

    doc.fontSize(11).text('TAX PLANNING RECOMMENDATIONS', { underline: true }).moveDown(0.5);
    const recs = [
      ['PF Optimisation', 'PF is 12% of basic (usually 50% of gross). Review basic structure if eligible for EPFO exemption.'],
      ['ESI Boundary', `${records.filter(p => (p.salary||0) <= 21000).length} employee(s) below ₹21,000 threshold. Plan increments carefully to avoid sudden ESI liability change.`],
      ['Professional Tax', 'PT is state-specific. Confirm correct state slab is applied for each employee location.'],
      ['TDS / Form 16', 'Deduct TDS accurately and issue Form 16 by June 15 each year. Late issuance attracts penalty.'],
    ];
    recs.forEach(([title, text]) => {
      doc.fontSize(10).fillColor('#1B4F8A').text(`▸ ${title}:`, { continued: false });
      doc.fillColor('#333').text(`  ${text}`).moveDown(0.4);
    });

    doc.end();
  } catch (err) { if (!res.headersSent) res.status(500).json({ error: err.message }); }
});

// GET /api/analytics/salary-distribution
router.get('/salary-distribution', async (req, res) => {
  try {
    const records  = await getThisMonth(req.admin_id);
    const doc      = startPDF(res, 'SALARY DISTRIBUTION', 'Salary Range Analysis', 'salary_distribution.pdf');

    if (!records.length) { doc.text('No payslips for current month.'); doc.end(); return; }

    const salaries = records.map(p => p.salary || 0);
    const buckets  = [
      { label: 'Below ₹15,000',         min: 0,      max: 14999    },
      { label: '₹15,000 – ₹25,000',     min: 15000,  max: 25000    },
      { label: '₹25,001 – ₹50,000',     min: 25001,  max: 50000    },
      { label: '₹50,001 – ₹1,00,000',   min: 50001,  max: 100000   },
      { label: 'Above ₹1,00,000',        min: 100001, max: Infinity },
    ];
    const fmt = (n) => `₹${n.toLocaleString('en-IN')}`;

    doc.fontSize(12).fillColor('#1B4F8A').text('SALARY DISTRIBUTION BREAKDOWN').moveDown(0.5);
    line(doc);
    doc.fillColor('#333').fontSize(10);

    buckets.forEach(b => {
      const group = records.filter(p => (p.salary || 0) >= b.min && (p.salary || 0) <= b.max);
      const count  = group.length;
      const pct    = ((count / records.length) * 100).toFixed(1);
      const bar    = '█'.repeat(Math.round(count / records.length * 30));
      doc.text(`${b.label.padEnd(28)} ${String(count).padStart(3)} (${pct}%)  ${bar}`);
    });

    line(doc);
    const sorted = [...salaries].sort((a, b) => a - b);
    const mid    = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    const avg    = salaries.reduce((s, n) => s + n, 0) / salaries.length;

    doc.moveDown(0.5).fontSize(11);
    row(doc, 'Lowest Salary',   fmt(Math.min(...salaries)));
    row(doc, 'Highest Salary',  fmt(Math.max(...salaries)));
    row(doc, 'Average Salary',  fmt(Math.round(avg)));
    row(doc, 'Median Salary',   fmt(median));
    row(doc, 'Total Employees', String(records.length));

    doc.end();
  } catch (err) { if (!res.headersSent) res.status(500).json({ error: err.message }); }
});

// GET /api/analytics/employee-turnover
router.get('/employee-turnover', async (req, res) => {
  try {
    const allResult = await pool.query(
      'SELECT year, month, COUNT(DISTINCT employee_id)::int AS count FROM payslips WHERE admin_id = $1 GROUP BY year, month ORDER BY year DESC, month DESC LIMIT 6',
      [req.admin_id]
    );
    const rows = allResult.rows.reverse(); // oldest first
    const doc  = startPDF(res, 'EMPLOYEE TURNOVER REPORT', 'Headcount Trends & Retention Metrics', 'employee_turnover.pdf');

    if (!rows.length) { doc.text('No payslip history found.'); doc.end(); return; }

    doc.fontSize(12).fillColor('#1B4F8A').text('HEADCOUNT TREND (Last 6 Months)').moveDown(0.5);
    line(doc);

    let prev = 0;
    rows.forEach(r => {
      const count  = r.count;
      const change = prev ? count - prev : 0;
      const arrow  = change > 0 ? '▲' : change < 0 ? '▼' : '—';
      const label  = new Date(r.year, r.month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });
      doc.fillColor('#333').fontSize(10)
         .text(`${label.padEnd(20)} ${String(count).padStart(4)} employees  ${arrow} ${change !== 0 ? Math.abs(change) : ''}`);
      prev = count;
    });

    const firstCount = rows[0].count;
    const lastCount  = rows[rows.length - 1].count;
    const netChange  = lastCount - firstCount;

    line(doc);
    doc.fontSize(11).fillColor('#1B4F8A');
    row(doc, 'Net headcount change (period)', `${netChange >= 0 ? '+' : ''}${netChange}`);
    doc.fillColor('#333');
    row(doc, 'Retention indicator', netChange >= 0 ? '✅ Growing / Stable' : '⚠️ Declining headcount');

    doc.end();
  } catch (err) { if (!res.headersSent) res.status(500).json({ error: err.message }); }
});

// GET /api/analytics/departmental-comparison
router.get('/departmental-comparison', async (req, res) => {
  try {
    const records = await getThisMonth(req.admin_id);
    const doc     = startPDF(res, 'DEPARTMENTAL COMPARISON', 'Headcount, Salary & Cost by Department', 'departmental_comparison.pdf');

    if (!records.length) { doc.text('No payslips for current month.'); doc.end(); return; }

    const depts = {};
    records.forEach(p => {
      const dept = p.department || 'General';
      if (!depts[dept]) depts[dept] = { count: 0, totalGross: 0, totalCTC: 0 };
      const d = derive(p.salary);
      depts[dept].count++;
      depts[dept].totalGross += d.gross;
      depts[dept].totalCTC  += d.gross + d.pfEmp + d.esiEmp;
    });

    const totGross = Object.values(depts).reduce((s, d) => s + d.totalGross, 0);
    const fmt      = (n) => `₹${n.toLocaleString('en-IN')}`;

    doc.fontSize(12).fillColor('#1B4F8A').text('DEPARTMENT COMPARISON TABLE').moveDown(0.5);
    line(doc);

    doc.fontSize(9).fillColor('#1B4F8A');
    doc.text('DEPARTMENT', 55, doc.y, { width: 130, continued: true });
    doc.text('EMP',          { width: 40,  continued: true, align: 'right' });
    doc.text('TOTAL SALARY', { width: 130, continued: true, align: 'right' });
    doc.text('TOTAL CTC',    { width: 130, continued: true, align: 'right' });
    doc.text('% PAYROLL',    { align: 'right' });
    doc.fillColor('#333');

    Object.entries(depts).sort((a, b) => b[1].totalGross - a[1].totalGross).forEach(([dept, d]) => {
      doc.fontSize(10)
         .text(dept.substring(0, 18), 55, doc.y, { width: 130, continued: true })
         .text(String(d.count),       { width: 40,  continued: true, align: 'right' })
         .text(fmt(d.totalGross),     { width: 130, continued: true, align: 'right' })
         .text(fmt(d.totalCTC),       { width: 130, continued: true, align: 'right' })
         .text(`${((d.totalGross / totGross) * 100).toFixed(1)}%`, { align: 'right' });
    });

    doc.end();
  } catch (err) { if (!res.headersSent) res.status(500).json({ error: err.message }); }
});

// GET /api/analytics/month-comparison
router.get('/month-comparison', async (req, res) => {
  try {
    const now = new Date();
    const cm  = now.getMonth() + 1;
    const cy  = now.getFullYear();
    const lm  = cm === 1 ? 12 : cm - 1;
    const ly  = cm === 1 ? cy - 1 : cy;

    const [thisResult, lastResult] = await Promise.all([
      pool.query('SELECT * FROM payslips WHERE admin_id = $1 AND month = $2 AND year = $3', [req.admin_id, cm, cy]),
      pool.query('SELECT * FROM payslips WHERE admin_id = $1 AND month = $2 AND year = $3', [req.admin_id, lm, ly]),
    ]);

    const thisM = thisResult.rows;
    const lastM = lastResult.rows;
    const doc   = startPDF(res, 'MONTH vs MONTH', 'This Month vs Last Month Comparison', 'month_comparison.pdf');

    const stats = (list) => {
      let gross = 0, pf = 0, esi = 0, pt = 0, tds = 0;
      list.forEach(p => { const d = derive(p.salary); gross += d.gross; pf += d.pf; esi += d.esi; pt += d.pt; tds += d.tds; });
      return { employees: list.length, gross, pf, esi, pt, tds };
    };

    const T    = stats(thisM);
    const L    = stats(lastM);
    const fmt  = (n) => `₹${n.toLocaleString('en-IN')}`;
    const pct  = (a, b) => b === 0 ? 'N/A' : `${a >= b ? '▲' : '▼'} ${Math.abs(((a - b) / b) * 100).toFixed(1)}%`;

    const thisName = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
    const lastName = new Date(ly, lm - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

    doc.fontSize(10).fillColor('#333');
    doc.text(`${lastName.padEnd(30)} →  ${thisName}`, 55, doc.y, { align: 'center' }).moveDown(0.5);
    line(doc);

    doc.fontSize(9).fillColor('#1B4F8A');
    doc.text('METRIC', 55, doc.y, { width: 160, continued: true });
    doc.text(lastName, { width: 130, continued: true, align: 'right' });
    doc.text(thisName, { width: 130, continued: true, align: 'right' });
    doc.text('CHANGE',  { align: 'right' });
    doc.fillColor('#333');
    line(doc);

    const compare = (label, tVal, lVal, isMoney = true) => {
      doc.fontSize(10)
         .text(label, 55, doc.y, { width: 160, continued: true })
         .text(isMoney ? fmt(lVal) : String(lVal), { width: 130, continued: true, align: 'right' })
         .text(isMoney ? fmt(tVal) : String(tVal), { width: 130, continued: true, align: 'right' })
         .text(pct(tVal, lVal), { align: 'right' });
    };

    compare('Employees',        T.employees, L.employees, false);
    compare('Gross Salary',     T.gross,     L.gross);
    compare('PF Deductions',    T.pf,        L.pf);
    compare('ESI Deductions',   T.esi,       L.esi);
    compare('Professional Tax', T.pt,        L.pt);
    compare('TDS',              T.tds,       L.tds);

    doc.end();
  } catch (err) { if (!res.headersSent) res.status(500).json({ error: err.message }); }
});

// GET /api/analytics/quarter-comparison
router.get('/quarter-comparison', async (req, res) => {
  try {
    const now  = new Date();
    const cm   = now.getMonth() + 1;
    const cy   = now.getFullYear();
    const qNow = Math.ceil(cm / 3);
    const qMonths  = [1, 2, 3].map(i => ((qNow - 1) * 3) + i);
    const pq       = qNow === 1 ? 4 : qNow - 1;
    const py       = qNow === 1 ? cy - 1 : cy;
    const pqMonths = [1, 2, 3].map(i => ((pq - 1) * 3) + i);

    const [thisResult, lastResult] = await Promise.all([
      pool.query('SELECT * FROM payslips WHERE admin_id = $1 AND year = $2 AND month = ANY($3::int[])', [req.admin_id, cy, qMonths]),
      pool.query('SELECT * FROM payslips WHERE admin_id = $1 AND year = $2 AND month = ANY($3::int[])', [req.admin_id, py, pqMonths]),
    ]);

    const doc = startPDF(res, 'QUARTER vs QUARTER', `Q${qNow} ${cy} vs Q${pq} ${py}`, 'quarter_comparison.pdf');

    const stats = (list) => {
      let gross = 0, pf = 0, esi = 0, pt = 0, tds = 0;
      list.forEach(p => { const d = derive(p.salary); gross += d.gross; pf += d.pf; esi += d.esi; pt += d.pt; tds += d.tds; });
      return { employees: [...new Set(list.map(p => p.employee_id))].length, gross, pf, esi, pt, tds };
    };

    const T   = stats(thisResult.rows);
    const L   = stats(lastResult.rows);
    const fmt  = (n) => `₹${n.toLocaleString('en-IN')}`;
    const pct  = (a, b) => b === 0 ? 'N/A' : `${a >= b ? '▲' : '▼'} ${Math.abs(((a - b) / b) * 100).toFixed(1)}%`;

    doc.fontSize(9).fillColor('#1B4F8A');
    doc.text('METRIC', 55, doc.y, { width: 160, continued: true });
    doc.text(`Q${pq} ${py}`,  { width: 130, continued: true, align: 'right' });
    doc.text(`Q${qNow} ${cy}`,{ width: 130, continued: true, align: 'right' });
    doc.text('CHANGE', { align: 'right' });
    doc.fillColor('#333');
    line(doc);

    const compare = (label, tVal, lVal, isMoney = true) => {
      doc.fontSize(10)
         .text(label, 55, doc.y, { width: 160, continued: true })
         .text(isMoney ? fmt(lVal) : String(lVal), { width: 130, continued: true, align: 'right' })
         .text(isMoney ? fmt(tVal) : String(tVal), { width: 130, continued: true, align: 'right' })
         .text(pct(tVal, lVal), { align: 'right' });
    };

    compare('Unique Employees', T.employees, L.employees, false);
    compare('Gross Salary',     T.gross,     L.gross);
    compare('PF Deductions',    T.pf,        L.pf);
    compare('ESI Deductions',   T.esi,       L.esi);
    compare('Professional Tax', T.pt,        L.pt);
    compare('TDS',              T.tds,       L.tds);

    doc.end();
  } catch (err) { if (!res.headersSent) res.status(500).json({ error: err.message }); }
});

// GET /api/analytics/year-comparison
router.get('/year-comparison', async (req, res) => {
  try {
    const cy = new Date().getFullYear();
    const py = cy - 1;

    const [thisResult, lastResult] = await Promise.all([
      pool.query('SELECT * FROM payslips WHERE admin_id = $1 AND year = $2', [req.admin_id, cy]),
      pool.query('SELECT * FROM payslips WHERE admin_id = $1 AND year = $2', [req.admin_id, py]),
    ]);

    const doc = startPDF(res, 'YEAR vs YEAR', `${cy} vs ${py} Annual Comparison`, 'year_comparison.pdf');

    const stats = (list) => {
      let gross = 0, pf = 0, esi = 0, pt = 0, tds = 0;
      list.forEach(p => { const d = derive(p.salary); gross += d.gross; pf += d.pf; esi += d.esi; pt += d.pt; tds += d.tds; });
      return { employees: [...new Set(list.map(p => p.employee_id))].length, gross, pf, esi, pt, tds };
    };

    const T   = stats(thisResult.rows);
    const L   = stats(lastResult.rows);
    const fmt  = (n) => `₹${n.toLocaleString('en-IN')}`;
    const pct  = (a, b) => b === 0 ? 'N/A' : `${a >= b ? '▲' : '▼'} ${Math.abs(((a - b) / b) * 100).toFixed(1)}%`;

    doc.fontSize(9).fillColor('#1B4F8A');
    doc.text('METRIC', 55, doc.y, { width: 160, continued: true });
    doc.text(String(py), { width: 130, continued: true, align: 'right' });
    doc.text(String(cy), { width: 130, continued: true, align: 'right' });
    doc.text('CHANGE', { align: 'right' });
    doc.fillColor('#333');
    line(doc);

    const compare = (label, tVal, lVal, isMoney = true) => {
      doc.fontSize(10)
         .text(label, 55, doc.y, { width: 160, continued: true })
         .text(isMoney ? fmt(lVal) : String(lVal), { width: 130, continued: true, align: 'right' })
         .text(isMoney ? fmt(tVal) : String(tVal), { width: 130, continued: true, align: 'right' })
         .text(pct(tVal, lVal), { align: 'right' });
    };

    compare('Unique Employees', T.employees, L.employees, false);
    compare('Total Gross Paid', T.gross,     L.gross);
    compare('Total PF',         T.pf,        L.pf);
    compare('Total ESI',        T.esi,       L.esi);
    compare('Professional Tax', T.pt,        L.pt);
    compare('Total TDS',        T.tds,       L.tds);

    doc.end();
  } catch (err) { if (!res.headersSent) res.status(500).json({ error: err.message }); }
});

module.exports = router;
