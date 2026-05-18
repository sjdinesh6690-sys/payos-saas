const PDFDocument = require('pdfkit');

const formatCurrency = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const buildPayslipDoc = (payslip) => {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const { employee_id, employee_name, department, month, basic_salary, hra, food_allowance, total_salary } = payslip;

  const [y, m] = month.split('-').map(Number);
  const nm     = m === 12 ? 1 : m + 1;
  const ny     = m === 12 ? y + 1 : y;
  const payDate   = `01/${String(nm).padStart(2, '0')}/${ny}`;
  const monthLabel = new Date(y, m - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  // ── Header band ──────────────────────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, 100).fill('#1B4F8A');
  doc.fillColor('white').fontSize(20)
     .text('DINMIND INFOTECH PVT LTD.', 50, 25, { width: doc.page.width - 100 });
  doc.fontSize(9)
     .text('Payslip Portal | dinesh@dinmind.in | www.dinmind.com', 50, 52, { width: doc.page.width - 100 });

  // ── Title ────────────────────────────────────────────────────────────────
  doc.fillColor('#1B4F8A').fontSize(14)
     .text(`PAYSLIP — ${monthLabel}`, 50, 120, { align: 'center', width: doc.page.width - 100 });

  // ── Employee info ────────────────────────────────────────────────────────
  doc.rect(50, 145, doc.page.width - 100, 80).stroke('#CCCCCC');
  doc.fillColor('#333').fontSize(10);
  doc.text(`Employee ID:    ${employee_id}`,       65, 160);
  doc.text(`Employee Name:  ${employee_name}`,     65, 178);
  doc.text(`Department:     ${department || '-'}`, 65, 196);
  doc.text(`Pay Date:       ${payDate}`,           300, 160);

  // ── Earnings table ───────────────────────────────────────────────────────
  doc.rect(50, 240, doc.page.width - 100, 130).stroke('#CCCCCC');
  doc.rect(50, 240, doc.page.width - 100, 25).fill('#F0F4F8');
  doc.fillColor('#1B4F8A').fontSize(10).text('EARNINGS', 65, 250);
  doc.fillColor('#333');

  const rows = [
    ['Basic Salary',   formatCurrency(basic_salary)],
    ['HRA',            formatCurrency(hra)],
    ['Food Allowance', formatCurrency(food_allowance)],
  ];
  rows.forEach(([label, val], i) => {
    const ry = 275 + i * 22;
    doc.text(label, 65, ry);
    doc.text(val, 350, ry, { align: 'right', width: 150 });
  });

  // Total row
  doc.rect(50, 350, doc.page.width - 100, 30).fill('#1B4F8A');
  doc.fillColor('white').fontSize(11).text('TOTAL SALARY', 65, 359);
  doc.text(formatCurrency(total_salary), 350, 359, { align: 'right', width: 150 });

  // Footer
  doc.fillColor('#999').fontSize(8)
     .text('This is a system-generated payslip. No signature required.', 50, 420, {
       align: 'center', width: doc.page.width - 100,
     });

  doc.end();
  return doc;
};

// CRITICAL: Never write to disk — always use this buffer method
const getPayslipBuffer = (payslip) =>
  new Promise((resolve, reject) => {
    const doc    = buildPayslipDoc(payslip);
    const chunks = [];
    doc.on('data',  c => chunks.push(c));
    doc.on('end',   () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

module.exports = { getPayslipBuffer };
