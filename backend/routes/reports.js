const express     = require('express');
const PDFDocument = require('pdfkit');
const ExcelJS     = require('exceljs');
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

const ACCENT = '#1A7A4A';
const DARK   = '#1E293B';
const LGRY   = '#F8FAFC';
const MGRY   = '#E2E8F0';

function drawHeader(doc, title, subtitle, dateRange) {
  const PW = doc.page.width;
  const W  = PW - 80;
  // Green header band
  doc.rect(0, 0, PW, 80).fill(ACCENT);
  // Left: PayLeef brand
  doc.fillColor('rgba(255,255,255,0.55)').fontSize(9).font('Helvetica')
     .text('PayLeef · Payroll for India', 40, 14, { width: 200 });
  // Title
  doc.fillColor('white').fontSize(18).font('Helvetica-Bold')
     .text(title, 40, 28, { width: W - 120 });
  // Right: date range box
  if (dateRange) {
    doc.rect(PW - 160, 14, 120, 52).fillAndStroke('rgba(0,0,0,0.15)', 'rgba(255,255,255,0.2)');
    doc.fillColor('rgba(255,255,255,0.75)').fontSize(7).font('Helvetica')
       .text('PERIOD', PW - 148, 20, { width: 96, align: 'center' });
    doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
       .text(dateRange, PW - 148, 30, { width: 96, align: 'center' });
  }
  // Sub-line
  doc.fillColor('rgba(255,255,255,0.8)').fontSize(8.5).font('Helvetica')
     .text(subtitle, 40, 56, { width: W - 120 });
  // Thin accent stripe at bottom of header
  doc.rect(0, 80, PW, 3).fill('#155C38');
  return 100; // starting y after header
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
     .text(`PayLeef · Generated on ${new Date().toLocaleString('en-IN')} · Confidential`, 40, y,
       { width: W, align: 'center' });
}

// Draw a statutory info strip below header
function drawStatutoryBar(doc, y, items) {
  const W = doc.page.width - 80;
  const filled = items.filter(i => i.value);
  if (!filled.length) {
    // Show a warning if nothing is configured
    doc.rect(40, y, W, 22).fill('#FEF3C7').stroke('#FCD34D');
    doc.fillColor('#92400E').fontSize(7.5).font('Helvetica-Bold')
       .text('⚠  Statutory registration numbers not configured. Go to Settings → Statutory Details to add them.',
         44, y + 7, { width: W - 8 });
    return y + 30;
  }
  doc.rect(40, y, W, 22).fill('#F0FDF4').stroke('#BBF7D0');
  doc.fillColor('#166534').fontSize(7.5).font('Helvetica-Bold');
  let x = 44;
  const cellW = Math.floor((W - 8) / filled.length);
  filled.forEach(item => {
    doc.text(`${item.label}: `, x, y + 4, { continued: true });
    doc.font('Helvetica').text(item.value, { width: cellW - 4 });
    doc.font('Helvetica-Bold');
    x += cellW;
  });
  return y + 30;
}

function checkPageBreak(doc, y, needed = 40) {
  if (y + needed > doc.page.height - 60) {
    doc.addPage();
    return 40;
  }
  return y;
}

// ── Excel helper ──────────────────────────────────────────────────────────────

function styleHeader(ws, row, cols) {
  const headerRow = ws.getRow(row);
  headerRow.eachCell((cell) => {
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    cell.font   = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  headerRow.height = 28;
  if (cols) ws.columns = cols;
}

function styleDataRow(ws, rowNum, isAlt) {
  const r = ws.getRow(rowNum);
  r.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: isAlt ? 'FFF8FAFC' : 'FFFFFFFF' } };
    cell.border = {
      top: { style: 'hair', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'hair', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    };
    cell.font      = { size: 9 };
    cell.alignment = { vertical: 'middle' };
  });
  r.height = 20;
}

function styleTotalRow(ws, rowNum, cols) {
  const r = ws.getRow(rowNum);
  r.eachCell({ includeEmpty: true }, (cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7ED' } };
    cell.font = { bold: true, size: 10, color: { argb: 'FF92400E' } };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FFFCD34D' } },
      bottom: { style: 'medium', color: { argb: 'FFFCD34D' } },
      left: { style: 'thin' }, right: { style: 'thin' },
    };
    cell.alignment = { vertical: 'middle' };
  });
  r.height = 22;
}

function addInfoSheet(wb, adminInfo, periodLabel, reportTitle) {
  const info = wb.addWorksheet('Info');
  info.columns = [{ width: 30 }, { width: 50 }];
  const rows = [
    ['Report', reportTitle],
    ['Period', periodLabel],
    ['Company', adminInfo.company_name || ''],
    ['PAN', adminInfo.pan_number || ''],
    ['TAN', adminInfo.tan_number || ''],
    ['EPFO Code', adminInfo.epfo_code || ''],
    ['ESIC Code', adminInfo.esic_code || ''],
    ['PT Reg No.', adminInfo.pt_reg_number || ''],
    ['Generated On', new Date().toLocaleString('en-IN')],
    ['Generated By', 'PayOS · Payroll Software for India'],
  ];
  rows.forEach(([k, v], i) => {
    const r = info.getRow(i + 1);
    r.getCell(1).value = k;
    r.getCell(2).value = v;
    r.getCell(1).font = { bold: true, size: 10 };
    r.getCell(2).font = { size: 10 };
    if (i === 0) {
      r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      r.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      r.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      r.getCell(2).font = { bold: true, color: { argb: 'FFFCD34D' }, size: 11 };
    }
    r.height = 20;
  });
}

async function sendExcel(wb, res, filename) {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  await wb.xlsx.write(res);
  res.end();
}

// ── Excel Reports Route ───────────────────────────────────────────────────────

router.get('/excel/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { month, year } = req.query;

    const adminResult = await pool.query(
      'SELECT company_name, pan_number, tan_number, epfo_code, esic_code, pt_reg_number, state FROM admins WHERE id = $1',
      [req.admin_id]
    );
    const adminRow  = adminResult.rows[0] || {};
    const adminName = adminRow.company_name || 'Company';

    const m = parseInt(month) || new Date().getMonth() + 1;
    const y = parseInt(year)  || new Date().getFullYear();
    const periodLabel = `${MONTH_NAMES[m - 1]} ${y}`;

    const slipsResult = await pool.query(
      'SELECT * FROM payslips WHERE admin_id = $1 AND month = $2 AND year = $3 ORDER BY employee_name ASC',
      [req.admin_id, m, y]
    );
    const slips = slipsResult.rows;

    switch (reportId) {
      case 'pf-ecr':
        return await buildExcelPFECR(res, slips, adminRow, periodLabel, m, y);
      case 'esi-contribution':
        return await buildExcelESI(res, slips, adminRow, periodLabel, m, y);
      case 'professional-tax':
        return await buildExcelPT(res, slips, adminRow, periodLabel, m, y);
      case 'bank-advice': {
        const empIds = [...new Set(slips.map(p => p.employee_id))];
        let bankMap = {};
        if (empIds.length) {
          const bRes = await pool.query(
            'SELECT employee_id, bank_account_number, ifsc_code, bank_name FROM employees WHERE admin_id = $1 AND employee_id = ANY($2::text[])',
            [req.admin_id, empIds]
          );
          bRes.rows.forEach(e => { bankMap[e.employee_id] = e; });
        }
        return await buildExcelBankAdvice(res, slips, adminRow, periodLabel, bankMap, m, y);
      }
      case 'salary-register':
        return await buildExcelSalaryRegister(res, slips, adminRow, periodLabel, m, y);
      default:
        return res.status(404).json({ error: `Unknown Excel report: ${reportId}` });
    }
  } catch (err) {
    console.error('[excel-reports]', err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// ── PF ECR (EPFO format) ──────────────────────────────────────────────────────
// Based on EPFO Unified Portal ECR upload format
async function buildExcelPFECR(res, slips, adminInfo, periodLabel, month, year) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'PayOS';
  wb.created = new Date();

  // Main ECR Sheet
  const ws = wb.addWorksheet('PF ECR', { pageSetup: { fitToPage: true, orientation: 'landscape' } });

  // Title
  ws.mergeCells('A1:K1');
  const titleCell = ws.getCell('A1');
  titleCell.value = `PROVIDENT FUND — ELECTRONIC CHALLAN CUM RETURN (ECR)`;
  titleCell.font  = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  titleCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A7A4A' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 32;

  ws.mergeCells('A2:K2');
  const subCell = ws.getCell('A2');
  subCell.value = `Establishment: ${adminInfo.company_name || ''} | EPFO Code: ${adminInfo.epfo_code || 'Not Set'} | Period: ${periodLabel}`;
  subCell.font  = { size: 9, color: { argb: 'FF166534' } };
  subCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 20;

  // Warning if EPFO code missing
  if (!adminInfo.epfo_code) {
    ws.mergeCells('A3:K3');
    const warnCell = ws.getCell('A3');
    warnCell.value = '⚠  EPFO Establishment Code not set. Go to Settings → Statutory Details before uploading to EPFO portal.';
    warnCell.font  = { bold: true, size: 9, color: { argb: 'FF92400E' } };
    warnCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7ED' } };
    warnCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(3).height = 18;
  }

  const headerRow = adminInfo.epfo_code ? 3 : 4;

  // ECR Column Headers (EPFO standard format)
  const cols = [
    { header: '#',                         key: 'sno',          width: 5  },
    { header: 'UAN',                        key: 'uan',          width: 16 },
    { header: 'Member Name',                key: 'name',         width: 22 },
    { header: 'Gross Wages (₹)',            key: 'gross',        width: 16 },
    { header: 'EPF Wages (₹)\n(Capped 15K)',key: 'epf_wages',   width: 16 },
    { header: 'EPS Wages (₹)\n(Capped 15K)',key: 'eps_wages',   width: 16 },
    { header: 'EDLI Wages (₹)',             key: 'edli_wages',   width: 16 },
    { header: 'EE Contribution\n12% (₹)',   key: 'ee_pf',       width: 16 },
    { header: 'ER EPS\n8.33% (₹)',          key: 'er_eps',      width: 14 },
    { header: 'ER EPF Diff\n(₹)',           key: 'er_epf_diff', width: 14 },
    { header: 'NCP Days',                   key: 'ncp',          width: 10 },
  ];
  ws.columns = cols;

  const hRow = ws.getRow(headerRow);
  cols.forEach((c, i) => { hRow.getCell(i + 1).value = c.header; });
  styleHeader(ws, headerRow, null);

  let totalEE = 0, totalEPS = 0, totalERDiff = 0;
  let dataRow = headerRow + 1;

  slips.forEach((p, idx) => {
    const gross    = p.gross_salary || p.salary || 0;
    const basic    = (p.earnings || {}).basic || 0;
    const epfWage  = Math.min(basic || gross, 15000); // EPF wages capped at 15000
    const epsWage  = Math.min(epfWage, 15000);
    const eeContrib = (p.deductions || {}).pf_employee || Math.round(epfWage * 0.12);
    const erEPS    = Math.min(Math.round(epsWage * 0.0833), 1250);
    const erDiff   = eeContrib - erEPS;

    totalEE    += eeContrib;
    totalEPS   += erEPS;
    totalERDiff += erDiff;

    const r = ws.getRow(dataRow);
    r.values = [idx + 1, '', p.employee_name, gross, epfWage, epsWage, epfWage, eeContrib, erEPS, erDiff, 0];
    styleDataRow(ws, dataRow, idx % 2 === 1);
    // Right-align numeric cells
    [4,5,6,7,8,9,10].forEach(ci => { r.getCell(ci).alignment = { horizontal: 'right', vertical: 'middle' }; });
    dataRow++;
  });

  // Total row
  const tr = ws.getRow(dataRow);
  tr.values = ['', 'TOTAL', `${slips.length} employees`, '', '', '', '', totalEE, totalEPS, totalERDiff, ''];
  styleTotalRow(ws, dataRow, null);
  [8,9,10].forEach(ci => { tr.getCell(ci).alignment = { horizontal: 'right', vertical: 'middle' }; });

  // Notes sheet
  const notes = wb.addWorksheet('Instructions');
  notes.columns = [{ width: 12 }, { width: 80 }];
  [
    ['Column', 'Description'],
    ['UAN', 'Universal Account Number — obtain from employee or EPFO portal (mandatory for upload)'],
    ['EPF Wages', 'Basic + DA wages, capped at ₹15,000/month. Used to compute 12% EE contribution.'],
    ['EPS Wages', 'EPS wages = EPF wages, capped at ₹15,000. ER contributes 8.33% to EPS (max ₹1,250).'],
    ['EDLI Wages', 'Same as EPF wages. Employer pays 0.5% EDLI premium.'],
    ['EE Contribution', "Employee's 12% PF deduction from salary."],
    ['ER EPS', "Employer's EPS contribution — 8.33% of EPS wages, max ₹1,250."],
    ['ER EPF Diff', 'Employer EPF = EE Contribution - ER EPS. Goes into EPF (not EPS) pool.'],
    ['NCP Days', 'No Contribution Period days. Enter 0 if employee worked full month.'],
    ['UAN Note', 'This report uses Employee ID as placeholder for UAN. Add actual UAN in employee profile.'],
    ['Portal', 'Upload ECR at: https://unifiedportal-emp.epfindia.gov.in/epfo/'],
    ['Due Date', 'ECR must be filed and challan paid by 15th of the following month.'],
  ].forEach(([k, v], i) => {
    const r = notes.getRow(i + 1);
    r.getCell(1).value = k; r.getCell(2).value = v;
    r.getCell(1).font = { bold: i === 0, size: 9 };
    r.getCell(2).font = { size: 9 };
    if (i === 0) {
      [1,2].forEach(ci => { r.getCell(ci).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }; r.getCell(ci).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 }; });
    }
    r.height = 18;
  });

  addInfoSheet(wb, adminInfo, periodLabel, 'PF ECR — EPFO Electronic Challan cum Return');

  const filename = `PF_ECR_${adminInfo.company_name || 'Company'}_${year}_${String(month).padStart(2,'0')}.xlsx`.replace(/\s+/g,'_');
  await sendExcel(wb, res, filename);
}

// ── ESI Contribution (ESIC format) ────────────────────────────────────────────
async function buildExcelESI(res, slips, adminInfo, periodLabel, month, year) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'PayOS';
  wb.created = new Date();

  const ws = wb.addWorksheet('ESI Contribution', { pageSetup: { fitToPage: true, orientation: 'landscape' } });

  ws.mergeCells('A1:H1');
  const tc = ws.getCell('A1');
  tc.value = `ESI CONTRIBUTION STATEMENT — ${periodLabel}`;
  tc.font  = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  tc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0369A1' } };
  tc.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 32;

  ws.mergeCells('A2:H2');
  const sc = ws.getCell('A2');
  sc.value = `Establishment: ${adminInfo.company_name || ''} | ESIC Code: ${adminInfo.esic_code || 'Not Set'} | Period: ${periodLabel}`;
  sc.font  = { size: 9, color: { argb: 'FF075985' } };
  sc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F9FF' } };
  sc.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 20;

  if (!adminInfo.esic_code) {
    ws.mergeCells('A3:H3');
    const wc = ws.getCell('A3');
    wc.value = '⚠  ESIC Establishment Code not set. Go to Settings → Statutory Details.';
    wc.font  = { bold: true, size: 9, color: { argb: 'FF92400E' } };
    wc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7ED' } };
    wc.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(3).height = 18;
  }

  const headerRow = adminInfo.esic_code ? 3 : 4;
  const eligible  = slips.filter(p => (p.gross_salary || p.salary || 0) <= 21000);

  const cols = [
    { header: '#',                       key: 'sno',    width: 5  },
    { header: 'IP Number\n(ESIC No.)',   key: 'ip',     width: 18 },
    { header: 'Employee Name',           key: 'name',   width: 24 },
    { header: 'Employee ID',             key: 'empid',  width: 14 },
    { header: 'Total Wages (₹)',         key: 'wages',  width: 16 },
    { header: 'EE Contribution\n0.75% (₹)', key: 'ee', width: 18 },
    { header: 'ER Contribution\n3.25% (₹)', key: 'er', width: 18 },
    { header: 'Total ESI (₹)',           key: 'total',  width: 15 },
  ];
  ws.columns = cols;

  const hRow = ws.getRow(headerRow);
  cols.forEach((c, i) => { hRow.getCell(i + 1).value = c.header; });
  styleHeader(ws, headerRow, null);

  let totalEE = 0, totalER = 0;
  let dataRow = headerRow + 1;

  if (eligible.length === 0) {
    const nr = ws.getRow(dataRow);
    nr.getCell(1).value = 'No ESI-eligible employees (gross salary > ₹21,000 for all employees)';
    ws.mergeCells(`A${dataRow}:H${dataRow}`);
    nr.getCell(1).font = { italic: true, color: { argb: 'FF64748B' }, size: 9 };
    nr.getCell(1).alignment = { horizontal: 'center' };
    dataRow++;
  } else {
    eligible.forEach((p, idx) => {
      const gross  = p.gross_salary || p.salary || 0;
      const eeESI  = (p.deductions || {}).esi_employee || Math.round(gross * 0.0075);
      const erESI  = (p.employer_contributions || {}).esi_employer || Math.round(gross * 0.0325);
      totalEE += eeESI;
      totalER += erESI;

      const r = ws.getRow(dataRow);
      r.values = [idx + 1, '', p.employee_name, p.employee_id, gross, eeESI, erESI, eeESI + erESI];
      styleDataRow(ws, dataRow, idx % 2 === 1);
      [5,6,7,8].forEach(ci => { r.getCell(ci).alignment = { horizontal: 'right', vertical: 'middle' }; });
      dataRow++;
    });

    const tr = ws.getRow(dataRow);
    tr.values = ['', 'TOTAL', `${eligible.length} eligible employees`, '', '', totalEE, totalER, totalEE + totalER];
    styleTotalRow(ws, dataRow, null);
    [6,7,8].forEach(ci => { tr.getCell(ci).alignment = { horizontal: 'right', vertical: 'middle' }; });
    dataRow++;

    // Non-eligible note
    if (eligible.length < slips.length) {
      dataRow++;
      const nr = ws.getRow(dataRow);
      nr.getCell(1).value = `Note: ${slips.length - eligible.length} employee(s) with gross > ₹21,000 are not ESI-eligible and excluded.`;
      ws.mergeCells(`A${dataRow}:H${dataRow}`);
      nr.getCell(1).font = { italic: true, size: 9, color: { argb: 'FF64748B' } };
    }
  }

  const notes = wb.addWorksheet('Instructions');
  notes.columns = [{ width: 14 }, { width: 76 }];
  [
    ['Field', 'Description'],
    ['IP Number', 'Insurance Policy Number issued by ESIC. Add it in employee profile. Leave blank if not assigned yet.'],
    ['Eligibility', 'Employees with gross salary ≤ ₹21,000/month are eligible for ESI.'],
    ['EE Rate', '0.75% of total wages deducted from employee salary.'],
    ['ER Rate', '3.25% of total wages paid by employer.'],
    ['Wages', 'Gross wages for the month (all earnings before deductions).'],
    ['Portal', 'File at: https://www.esic.in/EmployerPortal/ESICInsurance/ESICInsuranceLogin.aspx'],
    ['Due Date', 'ESI contribution must be paid by 21st of the following month.'],
    ['Challan', 'Generate challan on ESIC portal and pay via net banking.'],
  ].forEach(([k, v], i) => {
    const r = notes.getRow(i + 1);
    r.getCell(1).value = k; r.getCell(2).value = v;
    r.getCell(1).font = { bold: i === 0, size: 9 };
    r.getCell(2).font = { size: 9 };
    if (i === 0) {
      [1,2].forEach(ci => { r.getCell(ci).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0369A1' } }; r.getCell(ci).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 }; });
    }
    r.height = 18;
  });

  addInfoSheet(wb, adminInfo, periodLabel, 'ESI Contribution Statement');

  const filename = `ESI_Contribution_${adminInfo.company_name || 'Company'}_${year}_${String(month).padStart(2,'0')}.xlsx`.replace(/\s+/g,'_');
  await sendExcel(wb, res, filename);
}

// ── Professional Tax (PT) ─────────────────────────────────────────────────────
async function buildExcelPT(res, slips, adminInfo, periodLabel, month, year) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'PayOS';

  const ws = wb.addWorksheet('Professional Tax', { pageSetup: { fitToPage: true } });

  ws.mergeCells('A1:G1');
  const tc = ws.getCell('A1');
  tc.value = `PROFESSIONAL TAX RETURN — ${periodLabel}`;
  tc.font  = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  tc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } };
  tc.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 32;

  ws.mergeCells('A2:G2');
  const sc = ws.getCell('A2');
  sc.value = `Company: ${adminInfo.company_name || ''} | PT Reg No: ${adminInfo.pt_reg_number || 'Not Set'} | State: ${adminInfo.state || ''} | Period: ${periodLabel}`;
  sc.font  = { size: 9, color: { argb: 'FF4C1D95' } };
  sc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } };
  sc.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 20;

  const headerRow = 3;
  const cols = [
    { header: '#',              key: 'sno',        width: 5  },
    { header: 'Employee Name', key: 'name',        width: 26 },
    { header: 'Employee ID',   key: 'empid',       width: 14 },
    { header: 'Department',    key: 'dept',        width: 18 },
    { header: 'Gross Wages (₹)', key: 'gross',    width: 16 },
    { header: 'PT Amount (₹)', key: 'pt',          width: 14 },
    { header: 'Net Pay (₹)',   key: 'net',         width: 14 },
  ];
  ws.columns = cols;
  const hRow = ws.getRow(headerRow);
  cols.forEach((c, i) => { hRow.getCell(i + 1).value = c.header; });
  styleHeader(ws, headerRow, null);

  let totalPT = 0;
  let dataRow = headerRow + 1;

  slips.forEach((p, idx) => {
    const pt = (p.deductions || {}).pt || 0;
    totalPT += pt;
    const r = ws.getRow(dataRow);
    r.values = [idx + 1, p.employee_name, p.employee_id, p.department || '', p.gross_salary || p.salary || 0, pt, p.net_salary || p.salary || 0];
    styleDataRow(ws, dataRow, idx % 2 === 1);
    [5,6,7].forEach(ci => { r.getCell(ci).alignment = { horizontal: 'right', vertical: 'middle' }; });
    dataRow++;
  });

  const tr = ws.getRow(dataRow);
  tr.values = ['', 'TOTAL', `${slips.length} employees`, '', slips.reduce((s,p)=>s+(p.gross_salary||p.salary||0),0), totalPT, slips.reduce((s,p)=>s+(p.net_salary||p.salary||0),0)];
  styleTotalRow(ws, dataRow, null);
  [5,6,7].forEach(ci => { tr.getCell(ci).alignment = { horizontal: 'right', vertical: 'middle' }; });

  // PT Slab reference
  const slabSheet = wb.addWorksheet('PT Slab Reference');
  slabSheet.columns = [{ width: 30 }, { width: 20 }, { width: 20 }];
  [
    ['State / Monthly Gross Salary', 'PT Amount', 'Notes'],
    ['Karnataka: ≤ ₹14,999', '₹0', 'No PT'],
    ['Karnataka: ₹15,000+', '₹200', 'Monthly'],
    ['Maharashtra: ≤ ₹7,499', '₹0', 'No PT'],
    ['Maharashtra: ₹7,500 – ₹9,999', '₹175', 'Monthly (except Feb: ₹174)'],
    ['Maharashtra: ₹10,000 – ₹24,999', '₹200', 'Monthly (except Feb)'],
    ['Maharashtra: ₹25,000+', '₹200', 'Monthly'],
    ['Tamil Nadu: ≤ ₹3,499', '₹0', 'No PT'],
    ['Tamil Nadu: ₹3,500 – ₹4,999', '₹60', 'Semi-annual'],
    ['Tamil Nadu: ₹5,000 – ₹9,999', '₹150', 'Semi-annual'],
    ['Tamil Nadu: ₹10,000 – ₹19,999', '₹300', 'Semi-annual'],
    ['Tamil Nadu: ₹20,000+', '₹1,250', 'Semi-annual (₹208.33/mo)'],
    ['Andhra Pradesh / Telangana: ₹15,000+', '₹200', 'Monthly'],
    ['West Bengal: as per slabs', 'Varies', 'Check WB PT portal'],
    ['Note:', 'PT rates & frequency vary by state.', 'Verify with your CA / state portal.'],
  ].forEach(([a, b, c], i) => {
    const r = slabSheet.getRow(i + 1);
    r.getCell(1).value = a; r.getCell(2).value = b; r.getCell(3).value = c;
    [1,2,3].forEach(ci => { r.getCell(ci).font = { bold: i === 0, size: 9 }; });
    if (i === 0) {
      [1,2,3].forEach(ci => { r.getCell(ci).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF7C3AED' } }; r.getCell(ci).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 9 }; });
    }
    r.height = 18;
  });

  addInfoSheet(wb, adminInfo, periodLabel, 'Professional Tax Return');

  const filename = `Professional_Tax_${adminInfo.company_name || 'Company'}_${year}_${String(month).padStart(2,'0')}.xlsx`.replace(/\s+/g,'_');
  await sendExcel(wb, res, filename);
}

// ── Bank Salary Advice ────────────────────────────────────────────────────────
async function buildExcelBankAdvice(res, slips, adminInfo, periodLabel, bankMap, month, year) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'PayOS';

  const ws = wb.addWorksheet('Bank Advice', { pageSetup: { fitToPage: true, orientation: 'landscape' } });

  ws.mergeCells('A1:I1');
  const tc = ws.getCell('A1');
  tc.value = `SALARY BANK TRANSFER ADVICE — ${periodLabel}`;
  tc.font  = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  tc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  tc.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 32;

  ws.mergeCells('A2:I2');
  const sc = ws.getCell('A2');
  sc.value = `Company: ${adminInfo.company_name || ''} | PAN: ${adminInfo.pan_number || ''} | Period: ${periodLabel} | Generated: ${new Date().toLocaleDateString('en-IN')}`;
  sc.font  = { size: 9, color: { argb: 'FF334155' } };
  sc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  sc.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 18;

  const hasMissingBank = slips.some(p => !(bankMap[p.employee_id] || {}).bank_account_number);
  if (hasMissingBank) {
    ws.mergeCells('A3:I3');
    const wc = ws.getCell('A3');
    wc.value = '⚠  Some employees are missing bank account details. Go to Employees → Edit to add bank info.';
    wc.font  = { bold: true, size: 9, color: { argb: 'FF92400E' } };
    wc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7ED' } };
    wc.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(3).height = 18;
  }

  const headerRow = hasMissingBank ? 4 : 3;
  const cols = [
    { header: '#',                key: 'sno',    width: 5  },
    { header: 'Employee Name',    key: 'name',   width: 26 },
    { header: 'Employee ID',      key: 'empid',  width: 14 },
    { header: 'Department',       key: 'dept',   width: 16 },
    { header: 'Bank Name',        key: 'bank',   width: 20 },
    { header: 'Account Number',   key: 'acno',   width: 22 },
    { header: 'IFSC Code',        key: 'ifsc',   width: 14 },
    { header: 'Net Salary (₹)',   key: 'net',    width: 16 },
    { header: 'Remarks',          key: 'remark', width: 20 },
  ];
  ws.columns = cols;
  const hRow = ws.getRow(headerRow);
  cols.forEach((c, i) => { hRow.getCell(i + 1).value = c.header; });
  styleHeader(ws, headerRow, null);

  let totalNet = 0;
  let dataRow  = headerRow + 1;

  slips.forEach((p, idx) => {
    const net  = p.net_salary || p.salary || 0;
    totalNet  += net;
    const bank = bankMap[p.employee_id] || {};
    const remark = !bank.bank_account_number ? '❌ Bank details missing' : '✓ Ready';

    const r = ws.getRow(dataRow);
    r.values = [idx+1, p.employee_name, p.employee_id, p.department||'', bank.bank_name||'', bank.bank_account_number||'', bank.ifsc_code||'', net, remark];
    styleDataRow(ws, dataRow, idx % 2 === 1);
    r.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
    if (!bank.bank_account_number) {
      [6,7,9].forEach(ci => { r.getCell(ci).font = { color: { argb: 'FFDC2626' }, size: 9 }; });
    }
    dataRow++;
  });

  const tr = ws.getRow(dataRow);
  tr.values = ['', 'TOTAL TRANSFER', `${slips.length} employees`, '', '', '', '', totalNet, ''];
  styleTotalRow(ws, dataRow, null);
  tr.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
  tr.getCell(8).font = { bold: true, size: 12, color: { argb: 'FF166534' } };

  // Summary totals box
  dataRow += 2;
  ws.getRow(dataRow).getCell(1).value = 'TRANSFER SUMMARY';
  ws.getRow(dataRow).getCell(1).font  = { bold: true, size: 10 };
  dataRow++;
  const readyCount    = slips.filter(p => (bankMap[p.employee_id] || {}).bank_account_number).length;
  const missingCount  = slips.length - readyCount;
  const readyTotal    = slips.filter(p => (bankMap[p.employee_id] || {}).bank_account_number).reduce((s,p)=>s+(p.net_salary||p.salary||0),0);

  [
    ['Employees Ready for Transfer:', readyCount],
    ['Employees Missing Bank Details:', missingCount],
    ['Total Amount Ready for Transfer (₹):', readyTotal],
    ['Total Salary Bill (₹):', totalNet],
  ].forEach(([label, val]) => {
    const r = ws.getRow(dataRow);
    r.getCell(1).value = label;
    r.getCell(2).value = val;
    r.getCell(1).font = { size: 9 };
    r.getCell(2).font = { bold: true, size: 9 };
    r.getCell(2).alignment = { horizontal: 'right' };
    dataRow++;
  });

  addInfoSheet(wb, adminInfo, periodLabel, 'Bank Salary Advice / Transfer List');

  const filename = `Bank_Salary_Advice_${adminInfo.company_name || 'Company'}_${year}_${String(month).padStart(2,'0')}.xlsx`.replace(/\s+/g,'_');
  await sendExcel(wb, res, filename);
}

// ── Salary Register (Excel) ───────────────────────────────────────────────────
async function buildExcelSalaryRegister(res, slips, adminInfo, periodLabel, month, year) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'PayOS';

  const ws = wb.addWorksheet('Salary Register', { pageSetup: { fitToPage: true, orientation: 'landscape' } });

  ws.mergeCells('A1:P1');
  const tc = ws.getCell('A1');
  tc.value = `SALARY REGISTER — ${periodLabel}`;
  tc.font  = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
  tc.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A7A4A' } };
  tc.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 32;

  ws.mergeCells('A2:P2');
  const sc = ws.getCell('A2');
  sc.value = `${adminInfo.company_name || ''} | Period: ${periodLabel} | Generated: ${new Date().toLocaleDateString('en-IN')}`;
  sc.font  = { size: 9 }; sc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
  sc.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 18;

  const headerRow = 3;
  const cols = [
    { header: '#',           key: 'sno',   width: 4  },
    { header: 'Emp ID',      key: 'empid', width: 12 },
    { header: 'Name',        key: 'name',  width: 22 },
    { header: 'Dept',        key: 'dept',  width: 14 },
    // Earnings
    { header: 'Basic (₹)',        key: 'basic',  width: 12 },
    { header: 'HRA (₹)',          key: 'hra',    width: 10 },
    { header: 'DA (₹)',           key: 'da',     width: 10 },
    { header: 'Conveyance (₹)',   key: 'conv',   width: 13 },
    { header: 'Medical (₹)',      key: 'med',    width: 12 },
    { header: 'Special (₹)',      key: 'spl',    width: 12 },
    { header: 'Gross (₹)',        key: 'gross',  width: 13 },
    // Deductions
    { header: 'PF EE (₹)',       key: 'pf',    width: 11 },
    { header: 'ESI EE (₹)',      key: 'esi',   width: 11 },
    { header: 'PT (₹)',          key: 'pt',    width: 9  },
    { header: 'TDS (₹)',         key: 'tds',   width: 10 },
    { header: 'Net Pay (₹)',     key: 'net',   width: 14 },
  ];
  ws.columns = cols;
  const hRow = ws.getRow(headerRow);
  cols.forEach((c, i) => { hRow.getCell(i + 1).value = c.header; });
  styleHeader(ws, headerRow, null);

  // Earnings / Deductions sub-header
  ws.mergeCells(`E2:K2`);
  ws.mergeCells(`L2:P2`); // this is actually row 2 but used for later section — skip, headers are clear

  let dataRow = headerRow + 1;
  const totals = new Array(cols.length).fill(0);

  slips.forEach((p, idx) => {
    const earn = p.earnings      || {};
    const ded  = p.deductions    || {};
    const gross = p.gross_salary || p.salary || 0;
    const net   = p.net_salary   || p.salary || 0;

    const vals = [
      idx+1,
      p.employee_id,
      p.employee_name,
      p.department || '',
      earn.basic       || 0,
      earn.hra         || 0,
      earn.da          || 0,
      earn.conveyance  || 0,
      earn.medical     || 0,
      earn.special     || 0,
      gross,
      ded.pf_employee  || 0,
      ded.esi_employee || 0,
      ded.pt           || 0,
      ded.tds          || 0,
      net,
    ];

    const r = ws.getRow(dataRow);
    r.values = vals;
    styleDataRow(ws, dataRow, idx % 2 === 1);
    // Right-align numeric cols (5 onwards)
    for (let ci = 5; ci <= cols.length; ci++) {
      r.getCell(ci).alignment = { horizontal: 'right', vertical: 'middle' };
    }
    // Accumulate totals for numeric cols
    vals.forEach((v, i) => { if (typeof v === 'number') totals[i] += v; });
    dataRow++;
  });

  // Total row
  const totalVals = ['', 'TOTALS', `${slips.length} employees`, '', ...totals.slice(4)];
  const tr = ws.getRow(dataRow);
  tr.values = totalVals;
  styleTotalRow(ws, dataRow, null);
  for (let ci = 5; ci <= cols.length; ci++) {
    tr.getCell(ci).alignment = { horizontal: 'right', vertical: 'middle' };
  }

  addInfoSheet(wb, adminInfo, periodLabel, 'Salary Register');

  const filename = `Salary_Register_${adminInfo.company_name || 'Company'}_${year}_${String(month).padStart(2,'0')}.xlsx`.replace(/\s+/g,'_');
  await sendExcel(wb, res, filename);
}

// ── PDF Route ─────────────────────────────────────────────────────────────────

router.get('/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const { month, year } = req.query;

    const adminResult = await pool.query(
      'SELECT company_name, pan_number, tan_number, epfo_code, esic_code, pt_reg_number, state FROM admins WHERE id = $1',
      [req.admin_id]
    );
    const adminRow  = adminResult.rows[0] || {};
    const adminName = adminRow.company_name || 'Company';
    const adminInfo = adminRow; // pass full info to builders

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
        buildPFReport(doc, slips, adminName, periodLabel, adminInfo);
        break;
      case 'esi-report':
        buildESIReport(doc, slips, adminName, periodLabel, adminInfo);
        break;
      case 'professional-tax-report':
        buildPTReport(doc, slips, adminName, periodLabel, adminInfo);
        break;
      case 'tds-report':
        buildTDSReport(doc, slips, adminName, periodLabel, adminInfo);
        break;
      case 'bank-advice': {
        // Fetch bank account details for employees in these payslips
        const empIds = [...new Set(slips.map(p => p.employee_id))];
        let bankMap = {};
        if (empIds.length) {
          const bankResult = await pool.query(
            'SELECT employee_id, bank_account_number, ifsc_code, bank_name FROM employees WHERE admin_id = $1 AND employee_id = ANY($2::text[])',
            [req.admin_id, empIds]
          );
          bankResult.rows.forEach(e => { bankMap[e.employee_id] = e; });
        }
        buildBankAdvice(doc, slips, adminName, periodLabel, bankMap);
        break;
      }
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
        buildStatutoryCompliance(doc, slips, adminName, periodLabel, m, y, adminInfo);
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
  let y = drawHeader(doc, 'Monthly Payroll Summary', adminName, periodLabel);

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
  let y = drawHeader(doc, 'Salary Register', adminName, periodLabel);

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

function buildPFReport(doc, slips, adminName, periodLabel, adminInfo = {}) {
  let y = drawHeader(doc, 'PF Contribution Report', adminName, periodLabel);
  y = drawStatutoryBar(doc, y, [
    { label: 'EPFO Establishment Code', value: adminInfo.epfo_code },
    { label: 'Company PAN', value: adminInfo.pan_number },
  ]);

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

function buildESIReport(doc, slips, adminName, periodLabel, adminInfo = {}) {
  let y = drawHeader(doc, 'ESI Contribution Report', adminName, periodLabel);
  y = drawStatutoryBar(doc, y, [
    { label: 'ESIC Establishment Code', value: adminInfo.esic_code },
    { label: 'Company PAN', value: adminInfo.pan_number },
  ]);

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

function buildPTReport(doc, slips, adminName, periodLabel, adminInfo = {}) {
  let y = drawHeader(doc, 'Professional Tax Report', adminName, periodLabel);
  y = drawStatutoryBar(doc, y, [
    { label: 'PT Registration No.', value: adminInfo.pt_reg_number },
    { label: 'State', value: adminInfo.state },
  ]);

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

function buildTDSReport(doc, slips, adminName, periodLabel, adminInfo = {}) {
  let y = drawHeader(doc, 'TDS Report', adminName, periodLabel);
  y = drawStatutoryBar(doc, y, [
    { label: 'TAN', value: adminInfo.tan_number },
    { label: 'PAN', value: adminInfo.pan_number },
  ]);

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

function buildBankAdvice(doc, slips, adminName, periodLabel, bankMap = {}) {
  let y = drawHeader(doc, 'Bank Advice / Transfer List', adminName, periodLabel);

  // Check if any bank data exists
  const hasBank = Object.values(bankMap).some(e => e.bank_account_number);
  if (!hasBank) {
    doc.rect(40, y, doc.page.width - 80, 22).fill('#FEF3C7').stroke('#FCD34D');
    doc.fillColor('#92400E').fontSize(7.5).font('Helvetica-Bold')
       .text('⚠  Bank account numbers not added. Edit each employee to add bank details.', 44, y + 7, { width: doc.page.width - 88 });
    y += 30;
  }

  if (!slips.length) {
    drawNoData(doc, y, periodLabel);
    drawFooter(doc);
    doc.end();
    return;
  }

  const cols = [
    { label: '#',              w: 24,  align: 'left' },
    { label: 'Employee Name',  w: 140, align: 'left' },
    { label: 'Employee ID',    w: 70,  align: 'left' },
    { label: 'Bank Name',      w: 80,  align: 'left' },
    { label: 'Account No.',    w: 110, align: 'left' },
    { label: 'IFSC',           w: 70,  align: 'left' },
    { label: 'Net Salary (₹)', w: 40,  align: 'right' },
  ];

  y = drawTableHeader(doc, y, cols);

  let total = 0;
  slips.forEach((p, i) => {
    y = checkPageBreak(doc, y);
    const net  = p.net_salary || p.salary || 0;
    total += net;
    const bank = bankMap[p.employee_id] || {};
    const vals = [
      i + 1,
      p.employee_name,
      p.employee_id,
      bank.bank_name        || '—',
      bank.bank_account_number || '—',
      bank.ifsc_code        || '—',
      INR(net),
    ];
    y = drawTableRow(doc, y, cols, vals, i);
  });

  y = checkPageBreak(doc, y);
  doc.rect(40, y, doc.page.width - 80, 20).fill('#FFF7ED');
  doc.fillColor(ACCENT).fontSize(8.5).font('Helvetica-Bold');
  let x = 44;
  ['', 'TOTAL', '', '', '', '', INR(total)].forEach((t, i2) => {
    doc.text(t, x, y + 6, { width: cols[i2].w - 4, align: cols[i2].align || 'left' });
    x += cols[i2].w;
  });

  y += 28;
  doc.fillColor('#64748B').fontSize(8).font('Helvetica')
     .text('Note: Bank details as per employee records. Please verify before initiating transfer.', 40, y);

  drawFooter(doc);
  doc.end();
}

function buildHeadcount(doc, slips, adminName, periodLabel) {
  let y = drawHeader(doc, 'Employee Headcount Report', adminName, periodLabel);

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
  let y = drawHeader(doc, 'Cost to Company (CTC)', adminName, periodLabel);

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
  let y = drawHeader(doc, 'Payslip Audit Trail', adminName, periodLabel);

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

  let y = drawHeader(doc, 'Quarterly Payroll Summary', adminName, qLabel);

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
  let y = drawHeader(doc, 'Annual Payroll Summary', adminName, String(year));

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

function buildStatutoryCompliance(doc, slips, adminName, periodLabel, month, year, adminInfo = {}) {
  let y = drawHeader(doc, 'Statutory Compliance Checklist', adminName, periodLabel);
  y = drawStatutoryBar(doc, y, [
    { label: 'EPFO Code', value: adminInfo.epfo_code },
    { label: 'ESIC Code', value: adminInfo.esic_code },
    { label: 'PT Reg No.', value: adminInfo.pt_reg_number },
    { label: 'TAN', value: adminInfo.tan_number },
  ]);

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
