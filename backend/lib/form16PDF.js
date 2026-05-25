/**
 * PayLeef — Form 16 Part B Generator
 * Professional PDF matching official IT Department format.
 * Supports both Old and New Tax Regime.
 */

const INR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const MONTHS_SHORT = ['', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
const MONTHS_FULL  = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

// ── Tax Slabs ─────────────────────────────────────────────────────────────────

const TAX_SLABS = {
  new: {
    // FY 2024-25 (AY 2025-26) — Budget 2024 New Regime
    standardDeduction: 75000,
    rebate87ALimit: 700000,
    rebate87AMax: Infinity, // full rebate if income ≤ 7L
    slabs: [
      { from: 0,       to: 300000,   rate: 0   },
      { from: 300000,  to: 700000,   rate: 0.05 },
      { from: 700000,  to: 1000000,  rate: 0.10 },
      { from: 1000000, to: 1200000,  rate: 0.15 },
      { from: 1200000, to: 1500000,  rate: 0.20 },
      { from: 1500000, to: Infinity, rate: 0.30 },
    ],
  },
  old: {
    // FY 2024-25 Old Regime (below 60 years)
    standardDeduction: 50000,
    rebate87ALimit: 500000,
    rebate87AMax: 12500,
    slabs: [
      { from: 0,       to: 250000,   rate: 0   },
      { from: 250000,  to: 500000,   rate: 0.05 },
      { from: 500000,  to: 1000000,  rate: 0.20 },
      { from: 1000000, to: Infinity, rate: 0.30 },
    ],
  },
};

function computeTax(taxableIncome, regime) {
  const config = TAX_SLABS[regime] || TAX_SLABS.new;
  let tax = 0;
  for (const slab of config.slabs) {
    if (taxableIncome <= slab.from) break;
    const slabIncome = Math.min(taxableIncome, slab.to) - slab.from;
    tax += slabIncome * slab.rate;
  }

  // Rebate u/s 87A
  let rebate = 0;
  if (taxableIncome <= config.rebate87ALimit) {
    rebate = Math.min(tax, config.rebate87AMax === Infinity ? tax : config.rebate87AMax);
  }

  const taxAfterRebate = Math.max(0, tax - rebate);
  const cess = Math.round(taxAfterRebate * 0.04); // Health & Education Cess 4%
  const totalTax = Math.round(taxAfterRebate + cess);

  return { tax: Math.round(tax), rebate: Math.round(rebate), cess, totalTax };
}

// ── Core calculation ──────────────────────────────────────────────────────────

function buildForm16Data(employee, payslips, declarations, branding, admin, fy) {
  const regime     = declarations.tax_regime || 'new';
  const config     = TAX_SLABS[regime] || TAX_SLABS.new;

  // Financial year labels
  const fyStart    = parseInt(fy.split('-')[0]);
  const fyEnd      = fyStart + 1;
  const fyLabel    = `${fyStart}-${String(fyEnd).slice(-2)}`;    // "2024-25"
  const ayLabel    = `${fyEnd}-${String(fyEnd + 1).slice(-2)}`; // "2025-26"
  const periodFrom = `01-Apr-${fyStart}`;
  const periodTo   = `31-Mar-${fyEnd}`;

  // ── Annual totals from payslips ───────────────────────────────────────────
  const annualComponents = {};
  const annualDeductions = {};
  let grossSalary    = 0;
  let ptDeducted     = 0;
  let pfEmployee     = 0;
  let esiEmployee    = 0;
  let tdsFromSlips   = 0;

  for (const slip of payslips) {
    // Earnings
    const earnings = slip.earnings || {};
    for (const [k, v] of Object.entries(earnings)) {
      annualComponents[k] = (annualComponents[k] || 0) + (Number(v) || 0);
    }
    grossSalary += Number(slip.total_earnings) || 0;

    // Deductions
    const deductions = slip.deductions || {};
    for (const [k, v] of Object.entries(deductions)) {
      annualDeductions[k] = (annualDeductions[k] || 0) + (Number(v) || 0);
    }

    // Specific deductions
    ptDeducted   += Number(deductions.pt)           || 0;
    pfEmployee   += Number(deductions.pf_employee)  || Number((slip.employer_contributions || {}).pf_employee) || 0;
    esiEmployee  += Number(deductions.esi_employee) || 0;
    tdsFromSlips += Number(deductions.tds)          || 0;
  }

  // HRA received from payslips (for auto-calculation reference)
  const hraReceived = annualComponents.hra || 0;

  // Use saved declarations
  const hraExemption    = Math.min(Number(declarations.hra_exemption) || 0, hraReceived);
  const otherSec10      = Number(declarations.other_section10)  || 0;
  const investment80c   = Math.min(Number(declarations.investment_80c)  || 0, 150000);
  const mediclaim80d    = Number(declarations.mediclaim_80d)    || 0;
  const otherDeductions = Number(declarations.other_deductions) || 0;
  const tdsDeducted     = Number(declarations.tds_override) > 0
    ? Number(declarations.tds_override)
    : tdsFromSlips;

  // ── Tax Computation ──────────────────────────────────────────────────────
  // Step 1: Gross salary as per Sec 17(1)
  const sec17_1 = grossSalary;

  // Step 2: Less exemptions u/s 10
  const totalExemptions = hraExemption + otherSec10;

  // Step 3: Balance
  const balance = sec17_1 - totalExemptions;

  // Step 4: Deductions u/s 16
  const stdDeduction = config.standardDeduction;
  const sec16_deductions = stdDeduction + ptDeducted; // Professional Tax u/s 16(iii)

  // Step 5: Income under head Salaries
  const incomeFromSalaries = Math.max(0, balance - sec16_deductions);

  // Step 6: Gross Total Income (no other income assumed)
  const grossTotalIncome = incomeFromSalaries;

  // Step 7: Chapter VI-A deductions (only for old regime)
  let chapterVIA = 0;
  if (regime === 'old') {
    const pfFor80C = Math.min(pfEmployee, 150000);
    const total80C = Math.min(investment80c + pfFor80C, 150000);
    chapterVIA = total80C + mediclaim80d + otherDeductions;
  }

  // Step 8: Net taxable income
  const netTaxableIncome = Math.max(0, grossTotalIncome - chapterVIA);

  // Step 9: Tax calculation
  const { tax, rebate, cess, totalTax } = computeTax(netTaxableIncome, regime);

  // Balance tax (positive = payable, negative = refundable)
  const balanceTax = totalTax - tdsDeducted;

  return {
    // Employer
    company_name:    branding?.company_name    || admin?.company_name    || '',
    company_address: branding?.company_address || admin?.company_address || '',
    company_pan:     declarations.company_pan  || admin?.pan_number      || '',
    tan:             declarations.tan          || '',

    // Employee
    employee_name: employee.employee_name,
    employee_id:   employee.employee_id,
    pan:           employee.pan_number || employee.pan || '',
    designation:   employee.designation || '',
    department:    employee.department  || '',

    // Period
    fy: fyLabel, ay: ayLabel, period_from: periodFrom, period_to: periodTo,

    // Regime
    tax_regime: regime,

    // Salary breakdown
    annual_components: annualComponents,
    annual_deductions: annualDeductions,

    // Tax computation items
    sec17_1,
    perquisites: 0,
    profits_lieu: 0,
    gross_salary: sec17_1,
    hra_exemption: hraExemption,
    other_section10: otherSec10,
    total_exemptions: totalExemptions,
    balance,
    std_deduction: stdDeduction,
    pt_deducted: ptDeducted,
    sec16_deductions,
    income_from_salaries: incomeFromSalaries,
    gross_total_income: grossTotalIncome,

    // Chapter VI-A (old regime only)
    investment_80c:   regime === 'old' ? Math.min(investment80c + Math.min(pfEmployee, 150000), 150000) : 0,
    mediclaim_80d:    regime === 'old' ? mediclaim80d : 0,
    other_deductions: regime === 'old' ? otherDeductions : 0,
    chapter_via:      chapterVIA,

    // Final tax
    net_taxable_income: netTaxableIncome,
    income_tax:         tax,
    surcharge:          0,
    cess,
    rebate_87a:         rebate,
    total_tax_payable:  totalTax,
    tds_deducted:       tdsDeducted,
    balance_tax:        balanceTax,   // +ve = payable, -ve = refundable

    // Payslip count
    payslip_count: payslips.length,
  };
}

// ── PDF Renderer ──────────────────────────────────────────────────────────────

function renderForm16PDF(doc, data) {
  const PW    = doc.page.width;
  const PH    = doc.page.height;
  const ML    = 40;
  const W     = PW - 80;
  const NAVY  = '#1B3F72';
  const LIGHT = '#EFF4FB';
  const MUTED = '#64748B';
  const BLACK = '#0F172A';
  const ACC   = '#C8A63D'; // gold accent

  let y = 0;

  // ═══════════════════════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════════════════════
  doc.rect(0, 0, PW, 88).fill(NAVY);
  doc.rect(0, 84, PW, 4).fill(ACC);

  // Company info
  doc.fillColor('white').fontSize(17).font('Helvetica-Bold')
     .text(data.company_name || 'Company', ML, 16, { width: W - 140 });
  doc.fontSize(7.5).font('Helvetica').fillColor('rgba(255,255,255,0.7)')
     .text(data.company_address || '', ML, 38, { width: W - 140 });
  if (data.tan) {
    doc.fontSize(7.5).fillColor('rgba(255,255,255,0.55)')
       .text(`TAN: ${data.tan}${data.company_pan ? '   PAN: ' + data.company_pan : ''}`, ML, 52, { width: W - 140 });
  }

  // Right: Form title
  doc.rect(PW - 175, 12, 135, 64).fill('rgba(0,0,0,0.2)');
  doc.fillColor(ACC).fontSize(12).font('Helvetica-Bold')
     .text('FORM 16', PW - 171, 20, { width: 127, align: 'center' });
  doc.fillColor('white').fontSize(8).font('Helvetica')
     .text('PART B — Annexure', PW - 171, 36, { width: 127, align: 'center' });
  doc.fontSize(7.5).fillColor('rgba(255,255,255,0.7)')
     .text(`A.Y. ${data.ay}`, PW - 171, 50, { width: 127, align: 'center' });
  doc.fontSize(7).fillColor('rgba(255,255,255,0.5)')
     .text(`F.Y. ${data.fy}`, PW - 171, 63, { width: 127, align: 'center' });

  y = 100;

  // ═══════════════════════════════════════════════════════════════════════════
  // EMPLOYEE DETAILS BOX
  // ═══════════════════════════════════════════════════════════════════════════
  doc.rect(ML, y, W, 60).fill(LIGHT).lineWidth(0.5).stroke('#CBD5E1');
  doc.rect(ML, y, 4, 60).fill(NAVY);

  const eFields = [
    ['Employee Name',  data.employee_name,   'Employee ID', data.employee_id],
    ['PAN of Employee', data.pan || 'Not Provided', 'Designation', data.designation || '—'],
    ['Department',     data.department || '—', 'Period',   `${data.period_from}  to  ${data.period_to}`],
  ];
  eFields.forEach(([l1, v1, l2, v2], i) => {
    const fy = y + 8 + i * 18;
    const c1 = ML + 14, c2 = ML + W / 2, lw = 100;
    doc.fillColor(MUTED).fontSize(7).font('Helvetica-Bold').text(l1, c1, fy, { width: lw });
    doc.fillColor(BLACK).fontSize(8.5).font('Helvetica-Bold').text(v1, c1 + lw, fy, { width: W / 2 - lw - 20 });
    doc.fillColor(MUTED).fontSize(7).font('Helvetica-Bold').text(l2, c2, fy, { width: lw });
    doc.fillColor(BLACK).fontSize(8.5).font('Helvetica-Bold').text(v2, c2 + lw, fy, { width: W / 2 - lw - 10 });
  });

  // Tax regime badge
  const regimeBg   = data.tax_regime === 'new' ? '#DCFCE7' : '#FEF9C3';
  const regimeText = data.tax_regime === 'new' ? '#166534' : '#854D0E';
  const regimeLabel = data.tax_regime === 'new' ? 'New Tax Regime (Default)' : 'Old Tax Regime';
  doc.rect(ML + W - 170, y + 8, 160, 18).fill(regimeBg);
  doc.fillColor(regimeText).fontSize(7.5).font('Helvetica-Bold')
     .text(`Tax Regime: ${regimeLabel}`, ML + W - 168, y + 13, { width: 156, align: 'center' });

  y += 72;

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION TITLE
  // ═══════════════════════════════════════════════════════════════════════════
  doc.rect(ML, y, W, 18).fill(NAVY);
  doc.fillColor('white').fontSize(8).font('Helvetica-Bold')
     .text('DETAILS OF SALARY PAID AND ANY OTHER INCOME AND TAX DEDUCTED', ML + 10, y + 5, { width: W - 20, align: 'center' });
  y += 22;

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPER: draw a computation row
  // ═══════════════════════════════════════════════════════════════════════════
  function row(num, label, amount, opts = {}) {
    const rh     = opts.tall ? 20 : 16;
    const isHead = opts.header;
    const isTot  = opts.total;
    const bg     = isHead ? '#EFF4FB' : isTot ? '#DBEAFE' : (opts.alt ? '#F8FAFC' : 'white');
    const color  = isTot ? NAVY : BLACK;

    doc.rect(ML, y, W, rh).fill(bg).lineWidth(0.3).stroke('#E2E8F0');

    // Number column
    doc.fillColor(MUTED).fontSize(7).font('Helvetica').text(num || '', ML + 4, y + Math.floor((rh - 7) / 2), { width: 18 });

    // Label
    const indent = opts.indent ? opts.indent * 12 : 0;
    doc.fillColor(color).fontSize(isHead || isTot ? 8 : 7.5)
       .font(isHead || isTot ? 'Helvetica-Bold' : 'Helvetica')
       .text(label, ML + 24 + indent, y + Math.floor((rh - 7.5) / 2), { width: W - 120 - indent });

    // Amount
    if (amount !== null && amount !== undefined) {
      doc.fillColor(color).fontSize(isHead || isTot ? 8 : 8)
         .font(isTot ? 'Helvetica-Bold' : 'Helvetica')
         .text(INR(amount), ML + 24, y + Math.floor((rh - 8) / 2), { width: W - 28, align: 'right' });
    }

    y += rh;
  }

  function divider() {
    doc.moveTo(ML, y).lineTo(ML + W, y).lineWidth(0.8).stroke(NAVY);
    y += 4;
  }

  function spacer(h = 6) { y += h; }

  // ═══════════════════════════════════════════════════════════════════════════
  // TAX COMPUTATION TABLE
  // ═══════════════════════════════════════════════════════════════════════════

  // Section 1 — Gross Salary
  row('1', 'Gross Salary', null, { header: true });
  row('(a)', 'Salary as per provisions contained in sec. 17(1)', data.sec17_1, { indent: 1, alt: true });
  row('(b)', 'Value of perquisites u/s 17(2) (as per Form 12BA, wherever applicable)', data.perquisites, { indent: 1 });
  row('(c)', 'Profits in lieu of salary u/s 17(3) (as per Form 12BA, wherever applicable)', data.profits_lieu, { indent: 1, alt: true });
  row('', 'Total Gross Salary (a + b + c)', data.gross_salary, { total: true });
  spacer();

  // Section 2 — Allowances exempt u/s 10
  row('2', 'Less: Allowances to the extent exempt u/s 10', null, { header: true });
  row('(a)', `HRA Exemption u/s 10(13A) — Annual HRA Received: ${INR(data.annual_components?.hra || 0)}`, data.hra_exemption, { indent: 1, alt: true });
  row('(b)', 'Other Exemptions u/s 10 (LTA, etc.)', data.other_section10, { indent: 1 });
  row('', 'Total Exemptions (a + b)', data.total_exemptions, { total: true });
  spacer();

  // Section 3 — Balance
  row('3', 'Balance (1 − 2)', data.balance, { total: true });
  spacer();

  // Section 4 — Deductions u/s 16
  row('4', 'Deductions under section 16', null, { header: true });
  row('(a)', `Standard Deduction u/s 16(ia) — ${data.tax_regime === 'new' ? '₹75,000 (New Regime)' : '₹50,000 (Old Regime)'}`, data.std_deduction, { indent: 1, alt: true });
  row('(b)', 'Entertainment Allowance u/s 16(ii)', 0, { indent: 1 });
  row('(c)', 'Tax on Employment (Professional Tax) u/s 16(iii)', data.pt_deducted, { indent: 1, alt: true });
  row('', 'Total Deductions u/s 16', data.sec16_deductions, { total: true });
  spacer();

  // Section 5
  row('5', 'Income chargeable under the head "Salaries" (3 − 4)', data.income_from_salaries, { total: true });
  spacer();

  // Section 6
  row('6', 'Add: Any other income reported by the employee', 0, { alt: true });
  spacer();

  // Section 7
  row('7', 'Gross Total Income (5 + 6)', data.gross_total_income, { total: true });
  spacer();

  // Section 8 — Chapter VI-A (only for old regime)
  if (data.tax_regime === 'old') {
    row('8', 'Deductions under Chapter VI-A', null, { header: true });
    row('(A)', 'Deductions u/s 80C (PF, LIC, PPF, ELSS, etc.) — Max ₹1,50,000', data.investment_80c, { indent: 1, alt: true });
    row('(B)', 'Deduction u/s 80D (Medical Insurance Premium)', data.mediclaim_80d, { indent: 1 });
    row('(C)', 'Other Deductions (80G, 80E, 80TTA, etc.)', data.other_deductions, { indent: 1, alt: true });
    row('', 'Aggregate Deductible Amount under Chapter VI-A', data.chapter_via, { total: true });
    spacer();
  } else {
    row('8', 'Deductions under Chapter VI-A (not applicable under New Regime)', 0, { alt: true });
    spacer();
  }

  // Section 9
  row('9', 'Total Income (Net Taxable Income) (7 − 8)', data.net_taxable_income, { total: true });
  spacer();

  // Section 10 — Tax
  row('10', 'Tax on Total Income', data.income_tax, { header: true });
  spacer(2);

  row('11', 'Surcharge (if applicable)', data.surcharge, { alt: true });

  row('12', 'Health and Education Cess @ 4% on (10 + 11)', data.cess);

  row('13', 'Tax Payable (10 + 11 + 12)', data.income_tax + data.surcharge + data.cess, { total: true });
  spacer();

  row('14', 'Less: Rebate u/s 87A', data.rebate_87a, { alt: true });
  spacer();

  row('15', 'Net Tax Payable after Rebate (13 − 14)', data.total_tax_payable, { total: true });
  spacer();

  row('16', 'Less: Relief u/s 89 (where applicable)', 0, { alt: true });
  spacer();

  row('17', 'Net Tax Payable (15 − 16)', data.total_tax_payable, { total: true });
  spacer();

  row('18', 'Total Tax Deducted at Source (TDS)', data.tds_deducted, { alt: true });
  spacer();

  // Balance — highlight differently
  const balanceAmt  = Math.abs(data.balance_tax);
  const balanceType = data.balance_tax > 0 ? 'payable' : data.balance_tax < 0 ? 'refundable' : 'NIL';
  const balanceBg   = data.balance_tax > 0 ? '#FEE2E2' : data.balance_tax < 0 ? '#DCFCE7' : '#F1F5F9';
  const balanceClr  = data.balance_tax > 0 ? '#B91C1C' : data.balance_tax < 0 ? '#166534' : NAVY;

  doc.rect(ML, y, W, 20).fill(balanceBg).lineWidth(0.3).stroke('#E2E8F0');
  doc.fillColor(NAVY).fontSize(7).font('Helvetica').text('19', ML + 4, y + 6, { width: 18 });
  doc.fillColor(balanceClr).fontSize(8).font('Helvetica-Bold')
     .text(`Balance Tax ${balanceType === 'payable' ? 'Payable' : balanceType === 'refundable' ? 'Refundable' : '(NIL)'} (17 − 18)`,
       ML + 24, y + 6, { width: W - 120 });
  doc.fillColor(balanceClr).fontSize(9).font('Helvetica-Bold')
     .text(balanceType === 'NIL' ? 'NIL' : INR(balanceAmt), ML + 24, y + 6, { width: W - 28, align: 'right' });
  y += 26;

  spacer(8);
  divider();
  spacer(8);

  // ═══════════════════════════════════════════════════════════════════════════
  // ANNUAL SALARY COMPONENT SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  doc.rect(ML, y, W, 18).fill(NAVY);
  doc.fillColor('white').fontSize(8).font('Helvetica-Bold')
     .text(`ANNUAL SALARY BREAKUP — F.Y. ${data.fy} (${data.payslip_count} month${data.payslip_count !== 1 ? 's' : ''} of data)`, ML + 10, y + 5, { width: W - 20, align: 'center' });
  y += 22;

  // Build component rows from config
  const compKeys = Object.keys(data.annual_components || {});
  const deductKeys = Object.keys(data.annual_deductions || {}).filter(k => !['tds', 'lop'].includes(k));

  const half = (W - 6) / 2;
  const lx = ML, rx = ML + half + 6;

  // Headers
  doc.rect(lx, y, half, 18).fill('#1E293B');
  doc.rect(rx, y, half, 18).fill('#1E293B');
  doc.fillColor('white').fontSize(7.5).font('Helvetica-Bold')
     .text('EARNINGS COMPONENT', lx + 8, y + 5, { width: half - 90 })
     .text('ANNUAL AMOUNT', lx + 8, y + 5, { width: half - 8, align: 'right' })
     .text('DEDUCTION COMPONENT', rx + 8, y + 5, { width: half - 90 })
     .text('ANNUAL AMOUNT', rx + 8, y + 5, { width: half - 8, align: 'right' });
  y += 18;

  const maxRows = Math.max(compKeys.length, deductKeys.length, 1);
  for (let i = 0; i < maxRows; i++) {
    const bg = i % 2 === 0 ? 'white' : '#F8FAFC';
    doc.rect(lx, y, half, 16).fill(bg);
    doc.rect(rx, y, half, 16).fill(bg);

    if (compKeys[i]) {
      const label = compKeys[i].replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      doc.fillColor('#334155').fontSize(7.5).font('Helvetica').text(label, lx + 8, y + 4, { width: half - 90 });
      doc.fillColor(NAVY).font('Helvetica-Bold').text(INR(data.annual_components[compKeys[i]]), lx + 8, y + 4, { width: half - 8, align: 'right' });
    }
    if (deductKeys[i]) {
      const label = deductKeys[i].replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      doc.fillColor('#334155').fontSize(7.5).font('Helvetica').text(label, rx + 8, y + 4, { width: half - 90 });
      doc.fillColor('#DC2626').font('Helvetica-Bold').text(INR(data.annual_deductions[deductKeys[i]]), rx + 8, y + 4, { width: half - 8, align: 'right' });
    }
    y += 16;
  }

  // Totals row
  doc.rect(lx, y, half, 18).fill('#DBEAFE');
  doc.rect(rx, y, half, 18).fill('#FEE2E2');
  doc.fillColor(NAVY).fontSize(8).font('Helvetica-Bold')
     .text('Total Gross Earnings', lx + 8, y + 5, { width: half - 90 })
     .text(INR(data.gross_salary), lx + 8, y + 5, { width: half - 8, align: 'right' });
  const totalDed = Object.entries(data.annual_deductions || {})
    .filter(([k]) => !['lop'].includes(k))
    .reduce((s, [, v]) => s + (Number(v) || 0), 0);
  doc.fillColor('#B91C1C')
     .text('Total Deductions', rx + 8, y + 5, { width: half - 90 })
     .text(INR(totalDed), rx + 8, y + 5, { width: half - 8, align: 'right' });
  y += 26;

  spacer(8);
  divider();
  spacer(8);

  // ═══════════════════════════════════════════════════════════════════════════
  // VERIFICATION / SIGNATURE
  // ═══════════════════════════════════════════════════════════════════════════
  doc.rect(ML, y, W, 70).fill('#FAFAFA').lineWidth(0.5).stroke('#CBD5E1');
  doc.fillColor(NAVY).fontSize(7.5).font('Helvetica-Bold')
     .text('VERIFICATION', ML + 10, y + 8, { width: W - 20 });
  doc.fillColor(MUTED).fontSize(7).font('Helvetica')
     .text(
       `I, ……………………………………, son/daughter of ……………………………………, working in the capacity of ……………………………………, do hereby certify that a sum of ${INR(data.tds_deducted)} has been deducted and deposited to the credit of the Central Government. I further certify that the information given above is true, complete and correct and is based on the books of account, documents, TDS statements and other available records.`,
       ML + 10, y + 22, { width: W - 20, lineGap: 2 }
     );

  // Signature line
  doc.moveTo(ML + W - 160, y + 62).lineTo(ML + W - 10, y + 62).lineWidth(0.8).stroke('#94A3B8');
  doc.fillColor(MUTED).fontSize(7).font('Helvetica')
     .text('Signature of person responsible for deduction of tax', ML + W - 165, y + 66, { width: 160, align: 'center' });
  doc.fillColor(BLACK).fontSize(7).font('Helvetica-Bold')
     .text(data.company_name, ML + W - 165, y + 75, { width: 160, align: 'center' });
  y += 88;

  // ═══════════════════════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════════════════════
  doc.moveTo(ML, y + 4).lineTo(ML + W, y + 4).lineWidth(0.4).stroke('#CBD5E1');
  doc.fillColor('#94A3B8').fontSize(6.5).font('Helvetica')
     .text(
       `This is a computer-generated Form 16 Part B for A.Y. ${data.ay} issued by ${data.company_name}. ` +
       `The employer is responsible for issuing Part A through the TRACES portal. ` +
       `This document is valid as an annexure to Form 16 as per Rule 31 of Income Tax Rules, 1962.`,
       ML, y + 8, { width: W, align: 'center', lineGap: 1 }
     );
}

module.exports = { buildForm16Data, renderForm16PDF, computeTax };
