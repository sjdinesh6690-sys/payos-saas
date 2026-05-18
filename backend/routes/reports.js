const express     = require('express');
const PDFDocument = require('pdfkit');
const router      = express.Router();
const { pool }    = require('../database');
const authCheck   = require('../middleware/auth');

router.use(authCheck);

const INR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ── PDF helpers ───────────────────────────────────────────────────────────────

function startDoc(res, filename) {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);
  return doc;
}

const ACCENT = '#E85C2F';
const DARK   = '#1E293B';
const LGRY   = '#F8FAFC';
const MGRY   = '#E2E8F0';

function drawHeader(doc, title, subtitle) {
  const W = doc.page.width - 80;
  doc.rect(0, 0, doc.page.width, 70).fill(ACCENT);
  doc.fillColor('white').fontSize(16).font('Helvetica-Bold')
     .text(title, 40, 18, { width: W });
  doc.fontSize(9).font('Helvetica')
     .text(subtitle, 40, 42, { width: W });
  return 90; // starting y after header
}

function drawTableHeader(doc, y, cols, rowH = 20) {
  const W = doc.page.width - 80;
  doc.rect(40, y, W, rowH).fill(DARK);
  doc.fillColor('white').fontSize(8).font('Helvetica-Bold');
  let x = 44;
  cols.forEach(col => {
    doc.text(col.label, x, y + 6, { width: col.w - 4, align: col.align || 'left' });
    x += col.w;
  });
  return y + rowH;
}

function drawTableRow(doc, y, cols, values, rowIndex, rowH = 18) {
  const W  = doc.page.width - 80;
  const bg = rowIndex % 2 === 0 ? '#FFFFFF' : LGRY;
  doc.rect(40, y, W, rowH).fill(bg).stroke(MGRY);
  doc.fillColor(DARK).fontSize(8).font('Helvetica');
  let x = 44;
  cols.forEach((col, i) => {
    doc.text(String(values[i] !== undefined && values[i] !== null ? values[i] : '—'),
      x, y + 5, { width: col.w - 4, align: col.align || 'left' });
    x += col.w;
  });
  return y + rowH;
}

function drawNoData(doc, y, period) {
  doc.rect(40, y, doc.page.width - 80, 60).fill(LGRY).stroke(MGRY);
  doc.fillColor('#64748B').fontSize(11).font('Helvetica')
     .text(`No payslip data for this period (${period})`, 40, y + 22,
       { width: doc.page.width - 80, align: 'center' });
}

function drawFooter(doc) {
  const W = doc.page.width - 80;
  const y = doc.page.height - 40;
  doc.fillColor('#94A3B8').fontSize(7).font('Helvetica')
     .text(`Generated on ${new Date().toLocaleString('en-IN')} · Confidential`, 40, y,
       { width: W, align: 'center' });
}

function checkPageBreak(doc, y, needed = 40) {
  if (y + needed > doc.page.height - 60) {
    doc.addPage();
    return 40;
  }
  return y;
}

// ── Route ─────────────────────────────────────────────────────────────────────

router.get('/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { month, year } = req.query;

    const adminResult = await pool.query('SELECT company_name FROM admins WHERE id = $1', [req.admin_id]);
    const adminName   = adminResult.rows[0]?.company_name || 'Company';

    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year)  || new Date().getFullYear();

    const periodLabel = `${MONTH_NAMES[m - 1]} ${y}`;

    const isQuarterly = reportId === 'quarterly-payroll-summary';
    const isAnnual    = reportId === 'annual-payroll-summary';

    let slipsResult;
    if (isAnnual) {
      slipsResult = await pool.query(
        'SELECT * FROM payslips WHERE admin_id = $1 AND year = $2 ORDER BY month ASC, employee_name ASC',
        [req.admin_id, y]
      );
    } else if (isQuarterly) {
      const qStart  = Math.floor((m - 1) / 3) * 3 + 1;
      const qMonths = [qStart, qStart + 1, qStart + 2];
      slipsResult = await pool.query(
        'SELECT * FROM payslips WHERE admin_id = $1 AND year = $2 AND month = ANY($3::int[]) ORDER BY month ASC, employee_name ASC',
        [req.admin_id, y, qMonths]
      );
    } else {
      slipsResult = await pool.query(
        'SELECT * FROM payslips WHERE admin_id = $1 AND month = $2 AND year = $3 ORDER BY employee_name ASC',
        [req.admin_id, m, y]
      );
    }
    const slips = slipsResult.rows;

    const filename = `${reportId}-${y}-${String(m).padStart(2, '0')}.pdf`;
    const doc      = startDoc(res, filename);

    // ── Dispatch to report builder ───────────────────────────────────────────
    switch (reportId) {
      case 'monthly-payroll-summary':
        buildMonthlyPayrollSummary(doc, slips, adminName, periodLabel, m, y);
        break;
      case 'salary-register':
        buildSalaryRegister(doc, slips, adminName, periodLabel);
        break;
      case 'pf-report':
        buildPFReport(doc, slips, adminName, periodLabel);
        break;
      case 'esi-report':
        buildESIReport(doc, slips, adminName, periodLabel);
        break;
      case 'professional-tax-report':
        buildPTReport(doc, slips, adminName, periodLabel);
        break;
      case 'tds-report':
        buildTDSReport(doc, slips, adminName, periodLabel);
        break;
      case 'bank-advice':
        buildBankAdvice(doc, slips, adminName, periodLabel);
        break;
      case 'employee-headcount':
        buildHeadcount(doc, slips, adminName, periodLabel);
        break;
      case 'cost-to-company':
        buildCTC(doc, slips, adminName, periodLabel);
        break;
      case 'payslip-audit-trail':
        buildAuditTrail(doc, slips, adminName, periodLabel);
        break;
      case 'quarterly-payroll-summary':
        buildQuarterlySummary(doc, slips, adminName, y, m);
        break;
      case 'annual-payroll-summary':
        buildAnnualSummary(doc, slips, adminName, y);
        break;
      case 'statutory-compliance':
        buildStatutoryCompliance(doc, slips, adminName, periodLabel, m, y);
        break;
      default:
        doc.fontSize(14).fillColor(DARK).text(`Unknown report: ${reportId}`, 40, 100);
        drawFooter(doc);
        doc.end();
        return;
    }
  } catch (err) {
    console.error('[reports]', err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// ── Report builders ───────────────────────────────────────────────────────────

function buildMonthlyPayrollSummary(doc, slips, adminName, periodLabel, month, year) {
  let y = drawHeader(doc, `Monthly Payroll Summary — ${periodLabel}`, adminName);

  if (!slips.length) {
    drawNoData(doc, y, periodLabel);
    drawFooter(doc);
    doc.end();
    return;
  }

  const W = doc.page.width - 80;

  // Summary stats
  const totalGross = slips.reduce((s, p) => s + (p.gross_salary || p.salary || 0), 0);
  const totalNet   = slips.reduce((s, p) => s + (p.net_salary   || p.salary || 0), 0);
  const totalDed   = slips.reduce((s, p) => s + (p.total_deductions || 0), 0);

  const statW = (W - 10) / 3;
  const stats = [
    { label: 'Total Employees', value: slips.length },
    { label: 'Total Gross',     value: INR(totalGross) },
    { label: 'Total Net Pay',   value: INR(totalNet) },
  ];
  stats.forEach((st, i) => {
    const sx = 40 + i * (statW + 5);
    doc.rect(sx, y, statW, 48).fill(LGRY).stroke(MGRY);
    doc.fillColor(ACCENT).fontSize(16).font('Helvetica-Bold')
       .text(String(st.value), sx + 8, y + 8, { width: statW - 16 });
    doc.fillColor('#64748B').fontSize(8).font('Helvetica')
       .text(st.label, sx + 8, y + 30, { width: statW - 16 });
  });
  y += 62;

  // Table
  const cols = [
    { label: '#',            w: 24,  align: 'left' },
    { label: 'Employee',     w: 120, align: 'left' },
    { label: 'Dept',         w: 80,  align: 'left' },
    { label: 'Gross',        w: 70,  align: 'right' },
    { label: 'Earnings',     w: 70,  align: 'right' },
    { label: 'Deductions',   w: 70,  align: 'right' },
    { label: 'Net Pay',      w: 80,  align: 'right' },
  ];

  y = drawTableHeader(doc, y, cols);

  slips.forEach((p, i) => {
    y = checkPageBreak(doc, y);
    const vals = [
      i + 1,
      p.employee_name,
      p.department || '—',
      INR(p.gross_salary || p.salary),
      INR(p.total_earnings),
      INR(p.total_deductions),
      INR(p.net_salary || p.salary),
    ];
    y = drawTableRow(doc, y, cols, vals, i);
  });

  // Totals row
  y = checkPageBreak(doc, y);
  doc.rect(40, y, W, 20).fill('#FFF7ED').stroke(MGRY);
  doc.fillColor(ACCENT).fontSize(8.5).font('Helvetica-Bold');
  let x = 44;
  const totals = ['', 'TOTAL', '', INR(totalGross), INR(slips.reduce((s,p)=>s+(p.total_earnings||0),0)), INR(totalDed), INR(totalNet)];
  cols.forEach((col, i) => {
    doc.text(totals[i], x, y + 6, { width: col.w - 4, align: col.align || 'left' });
    x += col.w;
  });

  drawFooter(doc);
  doc.end();
}

function buildSalaryRegister(doc, slips, adminName, periodLabel) {
  let y = drawHeader(doc, `Salary Register — ${periodLabel}`, adminName);

  if (!slips.length) {
    drawNoData(doc, y, periodLabel);
    drawFooter(doc);
    doc.end();
    return;
  }

  const cols = [
    { label: 'Employee',    w: 100, align: 'left' },
    { label: 'ID',          w: 60,  align: 'left' },
    { label: 'Basic',       w: 60,  align: 'right' },
    { label: 'HRA',         w: 60,  align: 'right' },
    { label: 'Conveyance',  w: 68,  align: 'right' },
    { label: 'Special',     w: 60,  align: 'right' },
    { label: 'Other Earn.', w: 62,  align: 'right' },
    { label: 'Net Pay',     w: 64,  align: 'right' },
  ];

  y = drawTableHeader(doc, y, cols);

  slips.forEach((p, i) => {
    y = checkPageBreak(doc, y);
    const earn = p.earnings || {};
    const otherEarn = Object.entries(earn)
      .filter(([k]) => !['basic','hra','conveyance','special'].includes(k))
      .reduce((s, [, v]) => s + (v || 0), 0);
    const vals = [
      p.employee_name,
      p.employee_id,
      INR(earn.basic || 0),
      INR(earn.hra   || 0),
      INR(earn.conveyance || 0),
      INR(earn.special || 0),
      INR(otherEarn),
      INR(p.net_salary || p.salary),
    ];
    y = drawTableRow(doc, y, cols, vals, i);
  });

  drawFooter(doc);
  doc.end();
}

function buildPFReport(doc, slips, adminName, periodLabel) {
  let y = drawHeader(doc, `PF Contribution Report — ${periodLabel}`, adminName);

  if (!slips.length) {
    drawNoData(doc, y, periodLabel);
    drawFooter(doc);
    doc.end();
    return;
  }

  const cols = [
    { label: '#',              w: 24,  align: 'left' },
    { label: 'Employee',       w: 130, align: 'left' },
    { label: 'Basic (₹)',      w: 80,  align: 'right' },
    { label: 'Emp PF 12% (₹)', w: 90,  align: 'right' },
    { label: 'Emp PF 12% (₹)', w: 90,  align: 'right' },
    { label: 'Total PF (₹)',   w: 100, align: 'right' },
  ];

  y = drawTableHeader(doc, y, cols);

  let totalEmpPF = 0, totalErPF = 0;

  slips.forEach((p, i) => {
    y = checkPageBreak(doc, y);
    const empPF = (p.deductions || {}).pf_employee || 0;
    const erPF  = (p.employer_contributions || {}).pf_employer || 0;
    totalEmpPF += empPF;
    totalErPF  += erPF;
    const vals = [i + 1, p.employee_name, INR((p.earnings || {}).basic || 0), INR(empPF), INR(erPF), INR(empPF + erPF)];
    y = drawTableRow(doc, y, cols, vals, i);
  });

  // Totals
  y = checkPageBreak(doc, y);
  doc.rect(40, y, doc.page.width - 80, 20).fill('#FFF7ED');
  doc.fillColor(ACCENT).fontSize(8.5).font('Helvetica-Bold');
  let x = 44;
  const totals = ['', 'TOTAL', '', INR(totalEmpPF), INR(totalErPF), INR(totalEmpPF + totalErPF)];
  cols.forEach((col, i2) => {
    doc.text(totals[i2], x, y + 6, { width: col.w - 4, align: col.align || 'left' });
    x += col.w;
  });

  drawFooter(doc);
  doc.end();
}

function buildESIReport(doc, slips, adminName, periodLabel) {
  let y = drawHeader(doc, `ESI Contribution Report — ${periodLabel}`, adminName);

  if (!slips.length) {
    drawNoData(doc, y, periodLabel);
    drawFooter(doc);
    doc.end();
    return;
  }

  const eligible = slips.filter(p => (p.gross_salary || p.salary || 0) <= 21000);

  doc.fillColor(DARK).fontSize(9).font('Helvetica')
     .text(`ESI eligible employees (gross ≤ ₹21,000): ${eligible.length} of ${slips.length}`, 40, y);
  y += 20;

  const cols = [
    { label: '#',               w: 24,  align: 'left' },
    { label: 'Employee',        w: 130, align: 'left' },
    { label: 'Gross (₹)',       w: 80,  align: 'right' },
    { label: 'Emp ESI 0.75% (₹)', w: 90, align: 'right' },
    { label: 'Emp ESI 3.25% (₹)', w: 90, align: 'right' },
    { label: 'Total ESI (₹)',   w: 100, align: 'right' },
  ];

  y = drawTableHeader(doc, y, cols);

  let totalEmpESI = 0, totalErESI = 0;

  eligible.forEach((p, i) => {
    y = checkPageBreak(doc, y);
    const empESI = (p.deductions || {}).esi_employee || 0;
    const erESI  = (p.employer_contributions || {}).esi_employer || 0;
    totalEmpESI += empESI;
    totalErESI  += erESI;
    const vals = [i + 1, p.employee_name, INR(p.gross_salary || p.salary), INR(empESI), INR(erESI), INR(empESI + erESI)];
    y = drawTableRow(doc, y, cols, vals, i);
  });

  y = checkPageBreak(doc, y);
  doc.rect(40, y, doc.page.width - 80, 20).fill('#FFF7ED');
  doc.fillColor(ACCENT).fontSize(8.5).font('Helvetica-Bold');
  let x = 44;
  const totals = ['', 'TOTAL', '', INR(totalEmpESI), INR(totalErESI), INR(totalEmpESI + totalErESI)];
  cols.forEach((col, i2) => {
    doc.text(totals[i2], x, y + 6, { width: col.w - 4, align: col.align || 'left' });
    x += col.w;
  });

  drawFooter(doc);
  doc.end();
}

function buildPTReport(doc, slips, adminName, periodLabel) {
  let y = drawHeader(doc, `Professional Tax Report — ${periodLabel}`, adminName);

  if (!slips.length) {
    drawNoData(doc, y, periodLabel);
    drawFooter(doc);
    doc.end();
    return;
  }

  const cols = [
    { label: '#',          w: 28,  align: 'left' },
    { label: 'Employee',   w: 160, align: 'left' },
    { label: 'Dept',       w: 100, align: 'left' },
    { label: 'Gross (₹)',  w: 100, align: 'right' },
    { label: 'PT (₹)',     w: 80,  align: 'right' },
    { label: 'Net Pay (₹)',w: 66,  align: 'right' },
  ];

  y = drawTableHeader(doc, y, cols);

  let totalPT = 0;
  slips.forEach((p, i) => {
    y = checkPageBreak(doc, y);
    const pt = (p.deductions || {}).pt || 0;
    totalPT += pt;
    const vals = [i + 1, p.employee_name, p.department || '—', INR(p.gross_salary || p.salary), INR(pt), INR(p.net_salary || p.salary)];
    y = drawTableRow(doc, y, cols, vals, i);
  });

  y = checkPageBreak(doc, y);
  doc.rect(40, y, doc.page.width - 80, 20).fill('#FFF7ED');
  doc.fillColor(ACCENT).fontSize(8.5).font('Helvetica-Bold');
  let x = 44;
  ['', 'TOTAL', '', '', INR(totalPT), ''].forEach((t, i2) => {
    doc.text(t, x, y + 6, { width: cols[i2].w - 4, align: cols[i2].align || 'left' });
    x += cols[i2].w;
  });

  drawFooter(doc);
  doc.end();
}

function buildTDSReport(doc, slips, adminName, periodLabel) {
  let y = drawHeader(doc, `TDS Report — ${periodLabel}`, adminName);

  if (!slips.length) {
    drawNoData(doc, y, periodLabel);
    drawFooter(doc);
    doc.end();
    return;
  }

  const withTDS = slips.filter(p => ((p.deductions || {}).tds || 0) > 0);

  doc.fillColor(DARK).fontSize(9).font('Helvetica')
     .text(`Employees with TDS deduction: ${withTDS.length} of ${slips.length}`, 40, y);
  y += 20;

  const cols = [
    { label: '#',          w: 28,  align: 'left' },
    { label: 'Employee',   w: 160, align: 'left' },
    { label: 'Gross (₹)',  w: 100, align: 'right' },
    { label: 'TDS (₹)',    w: 100, align: 'right' },
    { label: 'Net Pay (₹)',w: 146, align: 'right' },
  ];

  y = drawTableHeader(doc, y, cols);

  let totalTDS = 0;
  slips.forEach((p, i) => {
    y = checkPageBreak(doc, y);
    const tds = (p.deductions || {}).tds || 0;
    totalTDS += tds;
    const vals = [i + 1, p.employee_name, INR(p.gross_salary || p.salary), INR(tds), INR(p.net_salary || p.salary)];
    y = drawTableRow(doc, y, cols, vals, i);
  });

  y = checkPageBreak(doc, y);
  doc.rect(40, y, doc.page.width - 80, 20).fill('#FFF7ED');
  doc.fillColor(ACCENT).fontSize(8.5).font('Helvetica-Bold');
  let x = 44;
  ['', 'TOTAL', '', INR(totalTDS), ''].forEach((t, i2) => {
    doc.text(t, x, y + 6, { width: cols[i2].w - 4, align: cols[i2].align || 'left' });
    x += cols[i2].w;
  });

  drawFooter(doc);
  doc.end();
}

function buildBankAdvice(doc, slips, adminName, periodLabel) {
  let y = drawHeader(doc, `Bank Advice — ${periodLabel}`, adminName);

  if (!slips.length) {
    drawNoData(doc, y, periodLabel);
    drawFooter(doc);
    doc.end();
    return;
  }

  const cols = [
    { label: '#',              w: 28,  align: 'left' },
    { label: 'Employee Name',  w: 160, align: 'left' },
    { label: 'Employee ID',    w: 80,  align: 'left' },
    { label: 'Bank Account',   w: 120, align: 'left' },
    { label: 'Net Salary (₹)', w: 146, align: 'right' },
  ];

  y = drawTableHeader(doc, y, cols);

  let total = 0;
  slips.forEach((p, i) => {
    y = checkPageBreak(doc, y);
    const net  = p.net_salary || p.salary || 0;
    total += net;
    const vals = [i + 1, p.employee_name, p.employee_id, '—', INR(net)];
    y = drawTableRow(doc, y, cols, vals, i);
  });

  y = checkPageBreak(doc, y);
  doc.rect(40, y, doc.page.width - 80, 20).fill('#FFF7ED');
  doc.fillColor(ACCENT).fontSize(8.5).font('Helvetica-Bold');
  let x = 44;
  ['', 'TOTAL', '', '', INR(total)].forEach((t, i2) => {
    doc.text(t, x, y + 6, { width: cols[i2].w - 4, align: cols[i2].align || 'left' });
    x += cols[i2].w;
  });

  y += 28;
  doc.fillColor('#64748B').fontSize(8).font('Helvetica')
     .text('Note: Bank account numbers are as per employee records. Please verify before transfer.', 40, y);

  drawFooter(doc);
  doc.end();
}

function buildHeadcount(doc, slips, adminName, periodLabel) {
  let y = drawHeader(doc, `Employee Headcount Report — ${periodLabel}`, adminName);

  if (!slips.length) {
    drawNoData(doc, y, periodLabel);
    drawFooter(doc);
    doc.end();
    return;
  }

  // Group by department
  const deptMap = {};
  slips.forEach(p => {
    const dept = p.department || 'Unknown';
    if (!deptMap[dept]) deptMap[dept] = { count: 0, totalNet: 0 };
    deptMap[dept].count++;
    deptMap[dept].totalNet += p.net_salary || p.salary || 0;
  });

  const cols = [
    { label: '#',                 w: 28,  align: 'left' },
    { label: 'Department',        w: 180, align: 'left' },
    { label: 'Headcount',         w: 80,  align: 'center' },
    { label: 'Total Net Pay (₹)', w: 120, align: 'right' },
    { label: 'Avg Net Pay (₹)',   w: 126, align: 'right' },
  ];

  y = drawTableHeader(doc, y, cols);

  Object.entries(deptMap).sort((a, b) => b[1].count - a[1].count).forEach(([dept, data], i) => {
    y = checkPageBreak(doc, y);
    const vals = [
      i + 1,
      dept,
      data.count,
      INR(data.totalNet),
      INR(Math.round(data.totalNet / data.count)),
    ];
    y = drawTableRow(doc, y, cols, vals, i);
  });

  y = checkPageBreak(doc, y);
  doc.rect(40, y, doc.page.width - 80, 20).fill('#FFF7ED');
  doc.fillColor(ACCENT).fontSize(8.5).font('Helvetica-Bold');
  let x = 44;
  ['', 'TOTAL', slips.length, '', ''].forEach((t, i2) => {
    doc.text(String(t), x, y + 6, { width: cols[i2].w - 4, align: cols[i2].align || 'left' });
    x += cols[i2].w;
  });

  drawFooter(doc);
  doc.end();
}

function buildCTC(doc, slips, adminName, periodLabel) {
  let y = drawHeader(doc, `Cost to Company (CTC) — ${periodLabel}`, adminName);

  if (!slips.length) {
    drawNoData(doc, y, periodLabel);
    drawFooter(doc);
    doc.end();
    return;
  }

  const cols = [
    { label: '#',             w: 24,  align: 'left' },
    { label: 'Employee',      w: 120, align: 'left' },
    { label: 'Gross (₹)',     w: 70,  align: 'right' },
    { label: 'Net Pay (₹)',   w: 70,  align: 'right' },
    { label: 'Emp PF (₹)',    w: 68,  align: 'right' },
    { label: 'Emp ESI (₹)',   w: 68,  align: 'right' },
    { label: 'CTC (₹)',       w: 114, align: 'right' },
  ];

  y = drawTableHeader(doc, y, cols);

  let totalCTC = 0;
  slips.forEach((p, i) => {
    y = checkPageBreak(doc, y);
    const net    = p.net_salary || p.salary || 0;
    const erPF   = (p.employer_contributions || {}).pf_employer  || 0;
    const erESI  = (p.employer_contributions || {}).esi_employer || 0;
    const ctc    = net + erPF + erESI;
    totalCTC    += ctc;
    const vals   = [i + 1, p.employee_name, INR(p.gross_salary || p.salary), INR(net), INR(erPF), INR(erESI), INR(ctc)];
    y = drawTableRow(doc, y, cols, vals, i);
  });

  y = checkPageBreak(doc, y);
  doc.rect(40, y, doc.page.width - 80, 20).fill('#FFF7ED');
  doc.fillColor(ACCENT).fontSize(8.5).font('Helvetica-Bold');
  let x = 44;
  ['', 'TOTAL', '', '', '', '', INR(totalCTC)].forEach((t, i2) => {
    doc.text(t, x, y + 6, { width: cols[i2].w - 4, align: cols[i2].align || 'left' });
    x += cols[i2].w;
  });

  drawFooter(doc);
  doc.end();
}

function buildAuditTrail(doc, slips, adminName, periodLabel) {
  let y = drawHeader(doc, `Payslip Audit Trail — ${periodLabel}`, adminName);

  if (!slips.length) {
    drawNoData(doc, y, periodLabel);
    drawFooter(doc);
    doc.end();
    return;
  }

  const cols = [
    { label: '#',            w: 24,  align: 'left' },
    { label: 'Employee',     w: 130, align: 'left' },
    { label: 'ID',           w: 60,  align: 'left' },
    { label: 'Net Pay (₹)',  w: 80,  align: 'right' },
    { label: 'Generated',    w: 100, align: 'left' },
    { label: 'Emailed',      w: 50,  align: 'center' },
    { label: 'Emailed At',   w: 90,  align: 'left' },
  ];

  y = drawTableHeader(doc, y, cols);

  slips.forEach((p, i) => {
    y = checkPageBreak(doc, y);
    const genDate   = p.created_at ? new Date(p.created_at).toLocaleDateString('en-IN') : '—';
    const emailDate = p.emailed_at ? new Date(p.emailed_at).toLocaleDateString('en-IN') : '—';
    const vals = [
      i + 1,
      p.employee_name,
      p.employee_id,
      INR(p.net_salary || p.salary),
      genDate,
      p.emailed ? 'Yes' : 'No',
      emailDate,
    ];
    y = drawTableRow(doc, y, cols, vals, i);
  });

  drawFooter(doc);
  doc.end();
}

function buildQuarterlySummary(doc, slips, adminName, year, currentMonth) {
  const qStart = Math.floor((currentMonth - 1) / 3) * 3 + 1;
  const qMonths = [qStart, qStart + 1, qStart + 2].filter(m => m <= 12);
  const qLabel = `Q${Math.ceil(currentMonth / 3)} ${year}`;

  let y = drawHeader(doc, `Quarterly Payroll Summary — ${qLabel}`, adminName);

  if (!slips.length) {
    drawNoData(doc, y, qLabel);
    drawFooter(doc);
    doc.end();
    return;
  }

  const cols = [
    { label: 'Month',        w: 80,  align: 'left' },
    { label: 'Employees',    w: 80,  align: 'center' },
    { label: 'Total Gross',  w: 100, align: 'right' },
    { label: 'Deductions',   w: 100, align: 'right' },
    { label: 'Total Net',    w: 174, align: 'right' },
  ];

  y = drawTableHeader(doc, y, cols);

  qMonths.forEach((m, i) => {
    y = checkPageBreak(doc, y);
    const mSlips   = slips.filter(p => parseInt(p.month) === m);
    const gross    = mSlips.reduce((s, p) => s + (p.gross_salary || p.salary || 0), 0);
    const ded      = mSlips.reduce((s, p) => s + (p.total_deductions || 0), 0);
    const net      = mSlips.reduce((s, p) => s + (p.net_salary || p.salary || 0), 0);
    const vals     = [MONTH_NAMES[m - 1] + ' ' + year, mSlips.length, INR(gross), INR(ded), INR(net)];
    y = drawTableRow(doc, y, cols, vals, i);
  });

  y = checkPageBreak(doc, y);
  const totalGross = slips.reduce((s, p) => s + (p.gross_salary || p.salary || 0), 0);
  const totalDed   = slips.reduce((s, p) => s + (p.total_deductions || 0), 0);
  const totalNet   = slips.reduce((s, p) => s + (p.net_salary || p.salary || 0), 0);
  doc.rect(40, y, doc.page.width - 80, 20).fill('#FFF7ED');
  doc.fillColor(ACCENT).fontSize(8.5).font('Helvetica-Bold');
  let x = 44;
  ['TOTAL', '', INR(totalGross), INR(totalDed), INR(totalNet)].forEach((t, i2) => {
    doc.text(t, x, y + 6, { width: cols[i2].w - 4, align: cols[i2].align || 'left' });
    x += cols[i2].w;
  });

  drawFooter(doc);
  doc.end();
}

function buildAnnualSummary(doc, slips, adminName, year) {
  let y = drawHeader(doc, `Annual Payroll Summary — ${year}`, adminName);

  if (!slips.length) {
    drawNoData(doc, y, String(year));
    drawFooter(doc);
    doc.end();
    return;
  }

  const cols = [
    { label: 'Month',        w: 90,  align: 'left' },
    { label: 'Employees',    w: 70,  align: 'center' },
    { label: 'Total Gross',  w: 100, align: 'right' },
    { label: 'Deductions',   w: 100, align: 'right' },
    { label: 'Total Net',    w: 174, align: 'right' },
  ];

  y = drawTableHeader(doc, y, cols);

  for (let m = 1; m <= 12; m++) {
    const mSlips = slips.filter(p => parseInt(p.month) === m);
    if (!mSlips.length) continue;
    y = checkPageBreak(doc, y);
    const gross = mSlips.reduce((s, p) => s + (p.gross_salary || p.salary || 0), 0);
    const ded   = mSlips.reduce((s, p) => s + (p.total_deductions || 0), 0);
    const net   = mSlips.reduce((s, p) => s + (p.net_salary || p.salary || 0), 0);
    const vals  = [MONTH_NAMES[m - 1] + ' ' + year, mSlips.length, INR(gross), INR(ded), INR(net)];
    y = drawTableRow(doc, y, cols, vals, m - 1);
  }

  y = checkPageBreak(doc, y);
  const totalGross = slips.reduce((s, p) => s + (p.gross_salary || p.salary || 0), 0);
  const totalDed   = slips.reduce((s, p) => s + (p.total_deductions || 0), 0);
  const totalNet   = slips.reduce((s, p) => s + (p.net_salary || p.salary || 0), 0);
  doc.rect(40, y, doc.page.width - 80, 20).fill('#FFF7ED');
  doc.fillColor(ACCENT).fontSize(8.5).font('Helvetica-Bold');
  let x = 44;
  ['ANNUAL TOTAL', '', INR(totalGross), INR(totalDed), INR(totalNet)].forEach((t, i2) => {
    doc.text(t, x, y + 6, { width: cols[i2].w - 4, align: cols[i2].align || 'left' });
    x += cols[i2].w;
  });

  drawFooter(doc);
  doc.end();
}

function buildStatutoryCompliance(doc, slips, adminName, periodLabel, month, year) {
  let y = drawHeader(doc, `Statutory Compliance Checklist — ${periodLabel}`, adminName);

  const W = doc.page.width - 80;

  // Summary numbers
  const totalPF  = slips.reduce((s, p) => s + ((p.deductions || {}).pf_employee || 0) + ((p.employer_contributions || {}).pf_employer || 0), 0);
  const totalESI = slips.reduce((s, p) => s + ((p.deductions || {}).esi_employee || 0) + ((p.employer_contributions || {}).esi_employer || 0), 0);
  const totalPT  = slips.reduce((s, p) => s + ((p.deductions || {}).pt || 0), 0);
  const totalTDS = slips.reduce((s, p) => s + ((p.deductions || {}).tds || 0), 0);
  const hasPF    = totalPF > 0;
  const hasESI   = totalESI > 0;
  const hasPT    = totalPT > 0;
  const hasTDS   = totalTDS > 0;

  const checks = [
    {
      category: 'Provident Fund (PF)',
      due:      '15th of following month',
      amount:   INR(totalPF),
      status:   hasPF ? 'Calculated' : 'No PF deductions',
      ok:       hasPF,
      detail:   'ECR to be filed on EPFO portal. Challan to be paid by 15th.',
    },
    {
      category: 'ESI (Employee State Insurance)',
      due:      '21st of following month',
      amount:   INR(totalESI),
      status:   hasESI ? 'Calculated' : 'No ESI deductions',
      ok:       hasESI,
      detail:   'File on ESIC portal. Covers employees with gross ≤ ₹21,000.',
    },
    {
      category: 'Professional Tax',
      due:      'Last day of following month',
      amount:   INR(totalPT),
      status:   hasPT ? 'Calculated' : 'No PT deductions',
      ok:       hasPT,
      detail:   'State-specific filing. Karnataka/MH: monthly. Check your state portal.',
    },
    {
      category: 'TDS (Income Tax)',
      due:      '7th of following month',
      amount:   INR(totalTDS),
      status:   hasTDS ? 'Calculated' : 'No TDS deductions',
      ok:       hasTDS,
      detail:   'Deposit via TRACES. Quarterly TDS returns (Form 24Q) due quarterly.',
    },
  ];

  checks.forEach((c, i) => {
    y = checkPageBreak(doc, y, 80);
    const rowY = y;
    doc.rect(40, rowY, W, 68).fill(i % 2 === 0 ? LGRY : '#FFFFFF').stroke(MGRY);

    const dot = c.ok ? '#22C55E' : '#94A3B8';
    doc.circle(56, rowY + 16, 6).fill(dot);

    doc.fillColor(DARK).fontSize(10).font('Helvetica-Bold')
       .text(c.category, 70, rowY + 8, { width: 200 });
    doc.fillColor('#64748B').fontSize(8).font('Helvetica')
       .text(`Due: ${c.due}`, 70, rowY + 24, { width: 200 });
    doc.text(c.detail, 70, rowY + 36, { width: W - 180 });

    doc.fillColor(ACCENT).fontSize(11).font('Helvetica-Bold')
       .text(c.amount, W - 60, rowY + 8, { width: 100, align: 'right' });
    doc.fillColor(c.ok ? '#166534' : '#64748B').fontSize(8).font('Helvetica')
       .text(c.status, W - 60, rowY + 28, { width: 100, align: 'right' });

    y += 76;
  });

  y += 10;
  doc.rect(40, y, W, 36).fill('#FFF7ED').stroke('#FED7AA');
  doc.fillColor('#92400E').fontSize(8.5).font('Helvetica-Bold')
     .text('Disclaimer:', 50, y + 8);
  doc.font('Helvetica').fillColor('#92400E')
     .text('This checklist is indicative. Verify due dates, rates, and applicability with a chartered accountant.', 50, y + 20, { width: W - 20 });

  drawFooter(doc);
  doc.end();
}

module.exports = router;
