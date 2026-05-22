/**
 * PayLeef — 5 Enterprise-Grade Payslip PDF Templates
 * Professional quality inspired by Keka, Darwinbox, and Zoho Payroll.
 * Each template: renderFn(doc, payslip, branding, admin)
 */
const { getDefaultConfig } = require('./payrollEngine');

// ── Helpers ───────────────────────────────────────────────────────────────────

const INR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function monthName(p) {
  return `${MONTHS[p.month || 1]} ${p.year}`;
}

/** Convert number to Indian words: 45000 → "Forty Five Thousand Rupees Only" */
function toWords(n) {
  n = Math.round(n || 0);
  if (n <= 0) return 'Zero Rupees Only';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function conv(num) {
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + conv(num % 100) : '');
  }
  const parts = [];
  if (n >= 10000000) { parts.push(conv(Math.floor(n / 10000000)) + ' Crore'); n %= 10000000; }
  if (n >= 100000)   { parts.push(conv(Math.floor(n / 100000))   + ' Lakh');  n %= 100000; }
  if (n >= 1000)     { parts.push(conv(Math.floor(n / 1000))     + ' Thousand'); n %= 1000; }
  if (n > 0)         { parts.push(conv(n)); }
  return parts.join(' ') + ' Rupees Only';
}

/** Payslip reference number: EMP001-MAY2025 */
function slipRef(p) {
  const mo = String(p.month || 1).padStart(2, '0');
  const MSHORT = ['','JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  return `${p.employee_id || 'EMP'}-${MSHORT[p.month || 1]}${p.year}`;
}

/** Draw logo from base64 data URL */
function drawLogo(doc, base64, x, y, maxW, maxH) {
  if (!base64) return;
  try {
    const comma = base64.indexOf(',');
    const buf = Buffer.from(base64.slice(comma + 1), 'base64');
    doc.image(buf, x, y, { fit: [maxW, maxH], align: 'left', valign: 'center' });
  } catch (_) { /* skip */ }
}

/** Get label maps from config snapshot */
function getRows(p) {
  const cfg = p.config_snapshot || getDefaultConfig();
  const earnLabels = {}, deductLabels = {};
  (cfg.earnings   || []).filter(c => c.enabled).forEach(c => { earnLabels[c.key]   = c.label; });
  (cfg.deductions || []).filter(c => c.enabled).forEach(c => { deductLabels[c.key] = c.label; });
  const earnRows   = Object.entries(p.earnings   || {}).filter(([, v]) => v > 0).map(([k, v]) => ({ label: earnLabels[k]   || k, amt: v }));
  const deductRows = Object.entries(p.deductions || {}).filter(([, v]) => v > 0).map(([k, v]) => ({ label: deductLabels[k] || k, amt: v }));
  return { earnRows, deductRows };
}

/** Draw two-column earnings/deductions table — shared across templates */
function drawTable(doc, { earnRows, deductRows, lx, rx, half, startY, rowH, headerH, headerBg, headerBg2, textColor, altBg, earnColor, deductColor, borderedRows }) {
  let y = startY;

  // Headers
  doc.rect(lx, y, half, headerH).fill(headerBg);
  doc.rect(rx, y, half, headerH).fill(headerBg2 || '#991B1B');
  doc.fillColor('white').fontSize(8).font('Helvetica-Bold');
  doc.text('EARNINGS',    lx + 10, y + Math.floor((headerH - 8) / 2), { width: half - 20 });
  doc.text('AMOUNT',      lx + 10, y + Math.floor((headerH - 8) / 2), { width: half - 10, align: 'right' });
  doc.text('DEDUCTIONS',  rx + 10, y + Math.floor((headerH - 8) / 2), { width: half - 20 });
  doc.text('AMOUNT',      rx + 10, y + Math.floor((headerH - 8) / 2), { width: half - 10, align: 'right' });
  y += headerH;

  const maxR = Math.max(earnRows.length, deductRows.length, 1);
  for (let i = 0; i < maxR; i++) {
    const bg = i % 2 === 0 ? '#FFFFFF' : (altBg || '#F8FAFC');
    if (borderedRows) {
      doc.rect(lx, y, half, rowH).fill(bg).moveTo(lx, y + rowH).lineTo(lx + half, y + rowH).lineWidth(0.3).stroke('#E2E8F0');
      doc.rect(rx, y, half, rowH).fill(bg).moveTo(rx, y + rowH).lineTo(rx + half, y + rowH).lineWidth(0.3).stroke('#E2E8F0');
    } else {
      doc.rect(lx, y, half, rowH).fill(bg);
      doc.rect(rx, y, half, rowH).fill(bg);
    }
    const ty = y + Math.floor((rowH - 8) / 2);
    if (earnRows[i]) {
      doc.fillColor(textColor || '#334155').fontSize(8).font('Helvetica').text(earnRows[i].label, lx + 10, ty, { width: half - 80 });
      doc.fillColor(earnColor || '#1E293B').font('Helvetica-Bold').text(INR(earnRows[i].amt), lx + 10, ty, { width: half - 10, align: 'right' });
    }
    if (deductRows[i]) {
      doc.fillColor(textColor || '#334155').fontSize(8).font('Helvetica').text(deductRows[i].label, rx + 10, ty, { width: half - 80 });
      doc.fillColor(deductColor || '#DC2626').font('Helvetica-Bold').text(INR(deductRows[i].amt), rx + 10, ty, { width: half - 10, align: 'right' });
    }
    y += rowH;
  }
  return y;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 1 — CLASSIC  (Traditional navy blue, authoritative & trusted)
// ─────────────────────────────────────────────────────────────────────────────
function renderClassic(doc, p, branding, admin) {
  const PW   = doc.page.width;
  const ML   = 40;
  const W    = PW - 80;
  const COL  = '#1B4F8A';
  const LGR  = '#F8FAFC';
  const mn   = monthName(p);
  const net  = p.net_salary || p.salary || 0;
  const ref  = slipRef(p);

  // ── Header band ──────────────────────────────────────────────────────────────
  doc.rect(0, 0, PW, 92).fill(COL);
  // Thin gold accent stripe at bottom of header
  doc.rect(0, 88, PW, 4).fill('#C8A63D');

  if (branding.logo_base64) drawLogo(doc, branding.logo_base64, ML, 14, 60, 62);
  const tx = branding.logo_base64 ? ML + 74 : ML;

  doc.fillColor('white').fontSize(18).font('Helvetica-Bold')
     .text(branding.company_name || admin?.company_name || 'Company', tx, 18, { width: W - 120 });
  doc.fontSize(7.5).font('Helvetica').fillColor('rgba(255,255,255,0.75)')
     .text([branding.company_address, branding.company_phone, branding.company_email, branding.company_website].filter(Boolean).join('   ·   '), tx, 42, { width: W - 120 });
  if (branding.company_gstin) {
    doc.fontSize(7).fillColor('rgba(255,255,255,0.5)')
       .text(`GSTIN: ${branding.company_gstin}`, tx, 56, { width: W - 120 });
  }

  // Right side of header
  doc.fillColor('white').fontSize(11).font('Helvetica-Bold')
     .text('SALARY SLIP', PW - 170, 18, { width: 130, align: 'right' });
  doc.fontSize(8).font('Helvetica').fillColor('rgba(255,255,255,0.7)')
     .text(mn, PW - 170, 34, { width: 130, align: 'right' });
  doc.fontSize(7.5).fillColor('rgba(255,255,255,0.5)')
     .text(`Ref: ${ref}`, PW - 170, 48, { width: 130, align: 'right' });
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#FFD580')
     .text(INR(net), PW - 170, 62, { width: 130, align: 'right' });
  doc.fontSize(6.5).font('Helvetica').fillColor('rgba(255,255,255,0.5)')
     .text('NET SALARY', PW - 170, 80, { width: 130, align: 'right' });

  let y = 104;

  // ── Employee details panel ─────────────────────────────────────────────────
  doc.rect(ML, y, W, 74).fill(LGR);
  doc.rect(ML, y, W, 74).lineWidth(0.5).stroke('#CBD5E1');
  doc.rect(ML, y, 4, 74).fill(COL); // accent bar

  const fields = [
    ['Employee Name',  p.employee_name,                      'Pay Period',    mn],
    ['Employee ID',    p.employee_id,                        'Working Days',  String(p.working_days || 26)],
    ['Department',     p.department || '—',                  'Present Days',  String(p.present_days ?? (p.working_days || 26))],
    ['Designation',    p.designation || '—',                 'LOP Days',      String(p.lop_days || 0)],
  ];
  const c1 = ML + 14, c2 = ML + W / 2 + 10, lw = 96;
  fields.forEach(([l1, v1, l2, v2], i) => {
    const fy = y + 10 + i * 16;
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#64748B').text(l1, c1, fy, { width: lw });
    doc.fontSize(8).font('Helvetica').fillColor('#1E293B').text(v1, c1 + lw, fy, { width: W / 2 - lw - 30 });
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#64748B').text(l2, c2, fy, { width: lw });
    doc.fontSize(8).font('Helvetica').fillColor('#1E293B').text(v2, c2 + lw, fy);
  });
  y += 86;

  // ── Earnings / Deductions table ────────────────────────────────────────────
  const { earnRows, deductRows } = getRows(p);
  const gap = 6;
  const half = (W - gap) / 2;
  const lx = ML, rx = ML + half + gap;

  y = drawTable(doc, {
    earnRows, deductRows, lx, rx, half, startY: y,
    rowH: 19, headerH: 22,
    headerBg: COL, headerBg2: '#991B1B',
    altBg: '#F1F5F9',
    earnColor: COL, deductColor: '#B91C1C',
    borderedRows: true,
  });
  y += 2;

  // Totals row
  doc.rect(lx, y, half, 22).fill('#DBEAFE');
  doc.rect(rx, y, half, 22).fill('#FEE2E2');
  doc.fillColor(COL).fontSize(8.5).font('Helvetica-Bold')
     .text('Total Earnings', lx + 10, y + 6, { width: half - 20 })
     .text(INR(p.total_earnings), lx + 10, y + 6, { width: half - 10, align: 'right' });
  doc.fillColor('#991B1B')
     .text('Total Deductions', rx + 10, y + 6, { width: half - 20 })
     .text(INR(p.total_deductions), rx + 10, y + 6, { width: half - 10, align: 'right' });
  y += 34;

  // ── Net Salary block ────────────────────────────────────────────────────────
  doc.rect(ML, y, W, 52).fill(COL);
  doc.rect(ML, y, 5, 52).fill('#C8A63D');
  doc.fillColor('white').fontSize(9).font('Helvetica-Bold')
     .text('NET SALARY (Take Home Pay)', ML + 16, y + 8, { width: W - 26 });
  doc.fontSize(18).font('Helvetica-Bold')
     .text(INR(net), ML + 16, y + 22, { width: W - 26 });
  doc.fontSize(7.5).font('Helvetica').fillColor('rgba(255,255,255,0.6)')
     .text(`In Words: ${toWords(net)}`, ML + 16, y + 42, { width: W - 26 });
  y += 64;

  // ── Employer contributions ──────────────────────────────────────────────────
  if (branding.show_employer_contributions !== false) {
    const epf  = (p.employer_contributions || {}).pf_employer  || 0;
    const eesi = (p.employer_contributions || {}).esi_employer || 0;
    if (epf > 0 || eesi > 0) {
      doc.rect(ML, y, W, 20).fill('#EFF6FF').lineWidth(0.5).stroke('#BFDBFE');
      doc.fillColor('#1D4ED8').fontSize(7.5).font('Helvetica')
         .text(`Employer Contributions — Provident Fund: ${INR(epf)}   ESI: ${INR(eesi)}   Total CTC: ${INR(net + epf + eesi)}`, ML + 10, y + 6, { width: W - 20, align: 'center' });
      y += 28;
    }
  }

  // ── Signature ───────────────────────────────────────────────────────────────
  if (branding.show_signature_line !== false) {
    y += 18;
    doc.moveTo(ML, y).lineTo(ML + 150, y).lineWidth(0.8).stroke('#94A3B8');
    doc.moveTo(PW - ML - 150, y).lineTo(PW - ML, y).lineWidth(0.8).stroke('#94A3B8');
    doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica')
       .text('Employee Signature', ML, y + 4, { width: 150, align: 'center' })
       .text('Authorised Signatory', PW - ML - 150, y + 4, { width: 150, align: 'center' });
    y += 22;
  }

  // ── Footer ──────────────────────────────────────────────────────────────────
  doc.moveTo(ML, y + 8).lineTo(ML + W, y + 8).lineWidth(0.5).stroke('#CBD5E1');
  doc.fillColor('#94A3B8').fontSize(7).font('Helvetica')
     .text(branding.custom_footer_text || 'This is a computer-generated payslip and does not require a physical signature.', ML, y + 12, { align: 'center', width: W });
}


// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 2 — MODERN  (Brand color, clean contemporary design)
// ─────────────────────────────────────────────────────────────────────────────
function renderModern(doc, p, branding, admin) {
  const PW  = doc.page.width;
  const ML  = 40;
  const W   = PW - 80;
  const PRI = branding.primary_color || '#E85C2F';
  const mn  = monthName(p);
  const net = p.net_salary || p.salary || 0;
  const ref = slipRef(p);

  // ── Header ──────────────────────────────────────────────────────────────────
  doc.rect(0, 0, PW, 95).fill(PRI);

  if (branding.logo_base64) drawLogo(doc, branding.logo_base64, ML, 16, 62, 62);
  const tx = branding.logo_base64 ? ML + 76 : ML;

  doc.fillColor('white').fontSize(19).font('Helvetica-Bold')
     .text(branding.company_name || admin?.company_name || 'Company', tx, 18, { width: W - 130 });
  doc.fontSize(7.5).font('Helvetica').fillColor('rgba(255,255,255,0.7)')
     .text([branding.company_address, branding.company_gstin ? `GSTIN: ${branding.company_gstin}` : ''].filter(Boolean).join('   ·   '), tx, 41, { width: W - 130 });
  doc.fontSize(7.5).fillColor('rgba(255,255,255,0.55)')
     .text([branding.company_phone, branding.company_email, branding.company_website].filter(Boolean).join('   ·   '), tx, 55, { width: W - 130 });

  // Right: Payslip badge
  doc.rect(PW - 170, 14, 130, 66).fill('rgba(0,0,0,0.18)');
  doc.fillColor('white').fontSize(10).font('Helvetica-Bold')
     .text('SALARY SLIP', PW - 166, 22, { width: 122, align: 'center' });
  doc.fontSize(8).font('Helvetica').fillColor('rgba(255,255,255,0.7)')
     .text(mn, PW - 166, 36, { width: 122, align: 'center' });
  doc.fontSize(7).fillColor('rgba(255,255,255,0.5)')
     .text(`Ref: ${ref}`, PW - 166, 50, { width: 122, align: 'center' });
  doc.fontSize(14).font('Helvetica-Bold').fillColor('white')
     .text(INR(net), PW - 166, 62, { width: 122, align: 'center' });

  // Bottom accent stripe
  doc.rect(0, 91, PW, 4).fill('rgba(0,0,0,0.2)');

  let y = 108;

  // ── Employee card ───────────────────────────────────────────────────────────
  doc.rect(ML, y, W, 76).fill('#FFF8F6');
  doc.rect(ML, y, W, 76).lineWidth(0.5).stroke('#FDDDD3');
  doc.rect(ML, y, 5, 76).fill(PRI);

  const fields = [
    ['EMPLOYEE NAME', p.employee_name,           'PAY PERIOD',   mn],
    ['EMPLOYEE ID',   p.employee_id,             'WORKING DAYS', String(p.working_days || 26)],
    ['DEPARTMENT',    p.department || '—',       'PRESENT DAYS', String(p.present_days ?? (p.working_days || 26))],
    ['DESIGNATION',   p.designation || '—',     'LOP DAYS',     String(p.lop_days || 0)],
  ];
  const c1 = ML + 16, c2 = ML + W / 2 + 10, lw = 90;
  fields.forEach(([l1, v1, l2, v2], i) => {
    const fy = y + 10 + i * 17;
    doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#94A3B8').text(l1, c1, fy, { width: lw });
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#1E293B').text(v1, c1 + lw, fy, { width: W / 2 - lw - 30 });
    doc.fontSize(6.5).font('Helvetica-Bold').fillColor('#94A3B8').text(l2, c2, fy, { width: lw });
    doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#1E293B').text(v2, c2 + lw, fy);
  });
  y += 90;

  // ── Earnings / Deductions table ─────────────────────────────────────────────
  const { earnRows, deductRows } = getRows(p);
  const gap = 8, half = (W - gap) / 2;
  const lx = ML, rx = ML + half + gap;

  y = drawTable(doc, {
    earnRows, deductRows, lx, rx, half, startY: y,
    rowH: 20, headerH: 24,
    headerBg: PRI, headerBg2: '#DC2626',
    altBg: '#FFF8F6',
    earnColor: PRI, deductColor: '#DC2626',
    borderedRows: true,
  });
  y += 2;

  // Totals
  doc.rect(lx, y, half, 22).fill('#FFF1ED');
  doc.rect(rx, y, half, 22).fill('#FEF2F2');
  doc.fillColor(PRI).fontSize(8.5).font('Helvetica-Bold')
     .text('Total Earnings', lx + 10, y + 6, { width: half - 20 })
     .text(INR(p.total_earnings), lx + 10, y + 6, { width: half - 10, align: 'right' });
  doc.fillColor('#DC2626')
     .text('Total Deductions', rx + 10, y + 6, { width: half - 20 })
     .text(INR(p.total_deductions), rx + 10, y + 6, { width: half - 10, align: 'right' });
  y += 34;

  // ── Net Salary block ────────────────────────────────────────────────────────
  doc.rect(ML, y, W, 54).fill(PRI);
  doc.rect(ML + W - 5, y, 5, 54).fill('rgba(0,0,0,0.15)');
  doc.fillColor('white').fontSize(9).font('Helvetica-Bold')
     .text('NET SALARY (Take Home Pay)', ML + 14, y + 8, { width: W - 28 });
  doc.fontSize(19).font('Helvetica-Bold')
     .text(INR(net), ML + 14, y + 20, { width: W - 28 });
  doc.fontSize(7.5).font('Helvetica').fillColor('rgba(255,255,255,0.65)')
     .text(`In Words: ${toWords(net)}`, ML + 14, y + 42, { width: W - 28 });
  y += 66;

  // Employer contributions
  if (branding.show_employer_contributions !== false) {
    const epf  = (p.employer_contributions || {}).pf_employer  || 0;
    const eesi = (p.employer_contributions || {}).esi_employer || 0;
    if (epf > 0 || eesi > 0) {
      doc.rect(ML, y, W, 20).fill('#FFF8F6').lineWidth(0.5).stroke('#FDDDD3');
      doc.fillColor('#9A3412').fontSize(7.5).font('Helvetica')
         .text(`Employer PF: ${INR(epf)}   ESI: ${INR(eesi)}   Total CTC: ${INR(net + epf + eesi)}`, ML + 10, y + 6, { width: W - 20, align: 'center' });
      y += 28;
    }
  }

  // Signature
  if (branding.show_signature_line !== false) {
    y += 16;
    doc.moveTo(ML, y).lineTo(ML + 150, y).lineWidth(0.8).stroke('#CBD5E1');
    doc.moveTo(PW - ML - 150, y).lineTo(PW - ML, y).lineWidth(0.8).stroke('#CBD5E1');
    doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica')
       .text('Employee Signature', ML, y + 4, { width: 150, align: 'center' })
       .text('Authorised Signatory', PW - ML - 150, y + 4, { width: 150, align: 'center' });
    y += 22;
  }

  // Footer
  doc.moveTo(ML, y + 8).lineTo(ML + W, y + 8).lineWidth(0.4).stroke('#E2E8F0');
  doc.fillColor('#CBD5E1').fontSize(7).font('Helvetica')
     .text(branding.custom_footer_text || 'This is a computer-generated payslip and does not require a physical signature.', ML, y + 12, { align: 'center', width: W });
}


// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 3 — CORPORATE  (Dark executive, charcoal & accent, premium feel)
// ─────────────────────────────────────────────────────────────────────────────
function renderCorporate(doc, p, branding, admin) {
  const PW   = doc.page.width;
  const ML   = 40;
  const W    = PW - 80;
  const DARK = '#0F172A';
  const MID  = '#1E293B';
  const ACC  = branding.primary_color || '#E85C2F';
  const mn   = monthName(p);
  const net  = p.net_salary || p.salary || 0;
  const ref  = slipRef(p);

  // ── Full dark header ─────────────────────────────────────────────────────────
  doc.rect(0, 0, PW, 104).fill(DARK);
  doc.rect(0, 100, PW, 4).fill(ACC);

  if (branding.logo_base64) drawLogo(doc, branding.logo_base64, ML, 18, 64, 66);
  const tx = branding.logo_base64 ? ML + 78 : ML;

  doc.fillColor('white').fontSize(20).font('Helvetica-Bold')
     .text(branding.company_name || admin?.company_name || 'Company', tx, 18, { width: W - 130 });
  doc.fontSize(7.5).font('Helvetica').fillColor('#64748B')
     .text([branding.company_address, branding.company_phone].filter(Boolean).join('   ·   '), tx, 44, { width: W - 130 });
  doc.fillColor('#475569').fontSize(7.5)
     .text([branding.company_email, branding.company_website, branding.company_gstin ? `GSTIN: ${branding.company_gstin}` : ''].filter(Boolean).join('   ·   '), tx, 58, { width: W - 130 });

  // Right side header info
  doc.fillColor(ACC).fontSize(11).font('Helvetica-Bold')
     .text('PAYSLIP', PW - 170, 18, { width: 130, align: 'right' });
  doc.fillColor('#94A3B8').fontSize(8).font('Helvetica')
     .text(mn, PW - 170, 34, { width: 130, align: 'right' });
  doc.fillColor('#64748B').fontSize(7.5)
     .text(`Ref: ${ref}`, PW - 170, 48, { width: 130, align: 'right' });
  doc.fillColor('white').fontSize(15).font('Helvetica-Bold')
     .text(INR(net), PW - 170, 62, { width: 130, align: 'right' });
  doc.fillColor('#475569').fontSize(7).font('Helvetica')
     .text('NET SALARY', PW - 170, 82, { width: 130, align: 'right' });

  let y = 118;

  // ── Employee info — dark strip with 4+4 columns ─────────────────────────────
  doc.rect(ML, y, W, 64).fill(MID);

  const col1Data = [
    { l: 'EMPLOYEE',    v: p.employee_name },
    { l: 'EMPLOYEE ID', v: p.employee_id },
    { l: 'DEPARTMENT',  v: p.department || '—' },
    { l: 'DESIGNATION', v: p.designation || '—' },
  ];
  const col2Data = [
    { l: 'PAY PERIOD',    v: mn },
    { l: 'WORKING DAYS',  v: String(p.working_days || 26) },
    { l: 'PRESENT DAYS',  v: String(p.present_days ?? (p.working_days || 26)) },
    { l: 'LOP DAYS',      v: String(p.lop_days || 0) },
  ];
  const cw = (W / 4);
  col1Data.forEach(({ l, v }, i) => {
    const fx = ML + i * cw + 10;
    doc.fillColor('#64748B').fontSize(6.5).font('Helvetica-Bold').text(l, fx, y + 8, { width: cw - 20 });
    doc.fillColor('white').fontSize(8.5).font('Helvetica-Bold').text(v, fx, y + 20, { width: cw - 20 });
    doc.fillColor('#64748B').fontSize(6.5).font('Helvetica-Bold').text(col2Data[i].l, fx, y + 37, { width: cw - 20 });
    doc.fillColor(ACC).fontSize(9).font('Helvetica-Bold').text(col2Data[i].v, fx, y + 49, { width: cw - 20 });
  });
  y += 78;

  // ── Table ────────────────────────────────────────────────────────────────────
  const { earnRows, deductRows } = getRows(p);
  const gap = 6, half = (W - gap) / 2;
  const lx = ML, rx = ML + half + gap;

  y = drawTable(doc, {
    earnRows, deductRows, lx, rx, half, startY: y,
    rowH: 20, headerH: 24,
    headerBg: MID, headerBg2: MID,
    altBg: '#F1F5F9',
    earnColor: DARK, deductColor: '#B91C1C',
    borderedRows: false,
  });
  // Table borders
  doc.rect(lx, y - (drawTable.lastRowH || 0), half, 0).lineWidth(0.3).stroke('#CBD5E1');
  y += 2;

  // Totals
  doc.rect(lx, y, half, 22).fill('#E2E8F0');
  doc.rect(rx, y, half, 22).fill('#FEE2E2');
  doc.fillColor(DARK).fontSize(8.5).font('Helvetica-Bold')
     .text('Total Earnings', lx + 10, y + 6, { width: half - 20 })
     .text(INR(p.total_earnings), lx + 10, y + 6, { width: half - 10, align: 'right' });
  doc.fillColor('#B91C1C')
     .text('Total Deductions', rx + 10, y + 6, { width: half - 20 })
     .text(INR(p.total_deductions), rx + 10, y + 6, { width: half - 10, align: 'right' });
  y += 34;

  // ── Net Salary ──────────────────────────────────────────────────────────────
  doc.rect(ML, y, W, 54).fill(DARK);
  doc.rect(ML, y, 6, 54).fill(ACC);
  doc.fillColor('white').fontSize(9).font('Helvetica-Bold')
     .text('NET SALARY (Take Home Pay)', ML + 16, y + 8, { width: W - 26 });
  doc.fontSize(19).font('Helvetica-Bold')
     .text(INR(net), ML + 16, y + 20, { width: W - 26 });
  doc.fontSize(7.5).font('Helvetica').fillColor('#475569')
     .text(`In Words: ${toWords(net)}`, ML + 16, y + 42, { width: W - 26 });
  y += 66;

  // Employer contributions
  if (branding.show_employer_contributions !== false) {
    const epf  = (p.employer_contributions || {}).pf_employer  || 0;
    const eesi = (p.employer_contributions || {}).esi_employer || 0;
    if (epf > 0 || eesi > 0) {
      doc.rect(ML, y, W, 20).fill('#F1F5F9').lineWidth(0.3).stroke('#E2E8F0');
      doc.fillColor('#64748B').fontSize(7.5).font('Helvetica')
         .text(`Employer PF: ${INR(epf)}   ESI: ${INR(eesi)}   Total CTC: ${INR(net + epf + eesi)}`, ML + 10, y + 6, { width: W - 20, align: 'center' });
      y += 28;
    }
  }

  if (branding.show_signature_line !== false) {
    y += 16;
    doc.moveTo(ML, y).lineTo(ML + 150, y).lineWidth(0.8).stroke('#94A3B8');
    doc.moveTo(PW - ML - 150, y).lineTo(PW - ML, y).lineWidth(0.8).stroke('#94A3B8');
    doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica')
       .text('Employee Signature', ML, y + 4, { width: 150, align: 'center' })
       .text('Authorised Signatory', PW - ML - 150, y + 4, { width: 150, align: 'center' });
    y += 22;
  }

  doc.moveTo(ML, y + 8).lineTo(ML + W, y + 8).lineWidth(0.4).stroke('#CBD5E1');
  doc.fillColor('#94A3B8').fontSize(7).font('Helvetica')
     .text(branding.custom_footer_text || 'Confidential — For authorised recipients only.', ML, y + 12, { align: 'center', width: W });
}


// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 4 — MINIMAL  (Pure black & white — perfect for printing)
// ─────────────────────────────────────────────────────────────────────────────
function renderMinimal(doc, p, branding, admin) {
  const PW = doc.page.width;
  const ML = 40;
  const W  = PW - 80;
  const mn = monthName(p);
  const net = p.net_salary || p.salary || 0;
  const ref = slipRef(p);

  // ── Header ───────────────────────────────────────────────────────────────────
  if (branding.logo_base64) drawLogo(doc, branding.logo_base64, ML, 28, 56, 56);
  const tx = branding.logo_base64 ? ML + 70 : ML;

  doc.fillColor('#000000').fontSize(19).font('Helvetica-Bold')
     .text(branding.company_name || admin?.company_name || 'Company', tx, 30, { width: W - 140 });
  doc.fontSize(7.5).font('Helvetica').fillColor('#555')
     .text([branding.company_address, branding.company_phone, branding.company_email].filter(Boolean).join('   ·   '), tx, 54, { width: W - 140 });
  if (branding.company_gstin) {
    doc.fontSize(7).fillColor('#777')
       .text(`GSTIN: ${branding.company_gstin}`, tx, 68, { width: W - 140 });
  }

  // Right header
  doc.fillColor('#000').fontSize(12).font('Helvetica-Bold')
     .text('SALARY SLIP', PW - ML - 140, 30, { width: 140, align: 'right' });
  doc.fontSize(8).font('Helvetica').fillColor('#333')
     .text(mn, PW - ML - 140, 46, { width: 140, align: 'right' });
  doc.fontSize(7.5).fillColor('#777')
     .text(`Ref: ${ref}`, PW - ML - 140, 60, { width: 140, align: 'right' });

  let y = 90;
  doc.moveTo(ML, y).lineTo(ML + W, y).lineWidth(1.5).stroke('#000');
  y += 14;

  // ── Employee details - two row grid ────────────────────────────────────────
  const row1 = [
    { l: 'Employee Name', v: p.employee_name },
    { l: 'Employee ID',   v: p.employee_id },
    { l: 'Department',    v: p.department || '—' },
    { l: 'Designation',   v: p.designation || '—' },
  ];
  const row2 = [
    { l: 'Pay Period',    v: mn },
    { l: 'Working Days',  v: String(p.working_days || 26) },
    { l: 'Present Days',  v: String(p.present_days ?? (p.working_days || 26)) },
    { l: 'LOP Days',      v: String(p.lop_days || 0) },
  ];
  [row1, row2].forEach((row, ri) => {
    const cw = W / 4;
    row.forEach(({ l, v }, i) => {
      const fx = ML + i * cw;
      doc.fillColor('#777').fontSize(7).font('Helvetica-Bold').text(l.toUpperCase(), fx, y, { width: cw - 10 });
      doc.fillColor('#000').fontSize(8.5).font('Helvetica-Bold').text(v, fx, y + 12, { width: cw - 10 });
    });
    y += 30;
  });

  doc.moveTo(ML, y).lineTo(ML + W, y).lineWidth(0.7).stroke('#666');
  y += 14;

  // ── Table ───────────────────────────────────────────────────────────────────
  const { earnRows, deductRows } = getRows(p);
  const gap = 10, half = (W - gap) / 2;
  const lx = ML, rx = ML + half + gap;

  // Headers — text only, underlined
  doc.fillColor('#000').fontSize(8.5).font('Helvetica-Bold')
     .text('EARNINGS',   lx, y, { width: half - 10 })
     .text('AMOUNT',     lx, y, { width: half, align: 'right' })
     .text('DEDUCTIONS', rx, y, { width: half - 10 })
     .text('AMOUNT',     rx, y, { width: half, align: 'right' });
  y += 16;
  doc.moveTo(lx, y).lineTo(lx + half, y).lineWidth(0.5).stroke('#999');
  doc.moveTo(rx, y).lineTo(rx + half, y).lineWidth(0.5).stroke('#999');
  y += 4;

  const maxR = Math.max(earnRows.length, deductRows.length, 1);
  for (let i = 0; i < maxR; i++) {
    const ty = y + 4;
    if (earnRows[i]) {
      doc.fillColor('#333').fontSize(8).font('Helvetica').text(earnRows[i].label, lx, ty, { width: half - 80 });
      doc.fillColor('#000').font('Helvetica-Bold').text(INR(earnRows[i].amt), lx, ty, { width: half, align: 'right' });
    }
    if (deductRows[i]) {
      doc.fillColor('#333').fontSize(8).font('Helvetica').text(deductRows[i].label, rx, ty, { width: half - 80 });
      doc.fillColor('#000').font('Helvetica-Bold').text(INR(deductRows[i].amt), rx, ty, { width: half, align: 'right' });
    }
    y += 18;
  }

  doc.moveTo(lx, y).lineTo(lx + half, y).lineWidth(0.5).stroke('#999');
  doc.moveTo(rx, y).lineTo(rx + half, y).lineWidth(0.5).stroke('#999');
  y += 8;

  // Totals
  doc.fillColor('#000').fontSize(8.5).font('Helvetica-Bold')
     .text('TOTAL EARNINGS', lx, y, { width: half - 10 })
     .text(INR(p.total_earnings), lx, y, { width: half, align: 'right' })
     .text('TOTAL DEDUCTIONS', rx, y, { width: half - 10 })
     .text(INR(p.total_deductions), rx, y, { width: half, align: 'right' });
  y += 22;

  // Net salary — clean bordered box
  doc.rect(ML, y, W, 50).lineWidth(1.5).stroke('#000');
  doc.fillColor('#000').fontSize(9).font('Helvetica-Bold')
     .text('NET SALARY (Take Home Pay)', ML + 10, y + 8, { width: W - 20 });
  doc.fontSize(18).font('Helvetica-Bold')
     .text(INR(net), ML + 10, y + 20, { width: W - 20 });
  doc.fontSize(7.5).font('Helvetica').fillColor('#555')
     .text(`In Words: ${toWords(net)}`, ML + 10, y + 40, { width: W - 20 });
  y += 62;

  if (branding.show_employer_contributions !== false) {
    const epf  = (p.employer_contributions || {}).pf_employer  || 0;
    const eesi = (p.employer_contributions || {}).esi_employer || 0;
    if (epf > 0 || eesi > 0) {
      doc.fillColor('#555').fontSize(7.5).font('Helvetica')
         .text(`Employer PF: ${INR(epf)}   ESI: ${INR(eesi)}   Total CTC: ${INR(net + epf + eesi)}`, ML, y + 4, { width: W, align: 'center' });
      y += 18;
    }
  }

  if (branding.show_signature_line !== false) {
    y += 16;
    doc.moveTo(ML, y).lineTo(ML + 150, y).lineWidth(0.8).stroke('#000');
    doc.moveTo(PW - ML - 150, y).lineTo(PW - ML, y).lineWidth(0.8).stroke('#000');
    doc.fillColor('#555').fontSize(7.5).font('Helvetica')
       .text('Employee Signature', ML, y + 4, { width: 150, align: 'center' })
       .text('Authorised Signatory', PW - ML - 150, y + 4, { width: 150, align: 'center' });
    y += 22;
  }

  doc.moveTo(ML, y + 6).lineTo(ML + W, y + 6).lineWidth(0.5).stroke('#999');
  doc.fillColor('#888').fontSize(7).font('Helvetica')
     .text(branding.custom_footer_text || 'This is a computer-generated payslip and does not require a physical signature.', ML, y + 10, { align: 'center', width: W });
}


// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 5 — PREMIUM  (Split layout, dark sidebar, bold typography)
// ─────────────────────────────────────────────────────────────────────────────
function renderPremium(doc, p, branding, admin) {
  const PW   = doc.page.width;
  const PH   = doc.page.height;
  const PRI  = branding.primary_color || '#E85C2F';
  const DARK = '#0F172A';
  const SIDE = 210;          // left panel width
  const RX   = SIDE + 20;   // right content X
  const RW   = PW - RX - 30; // right content width
  const mn   = monthName(p);
  const net  = p.net_salary || p.salary || 0;
  const ref  = slipRef(p);

  // ── Background panels ────────────────────────────────────────────────────────
  doc.rect(0, 0, SIDE, PH).fill(DARK);
  doc.rect(SIDE, 0, PW - SIDE, PH).fill('#FAFAFA');
  doc.rect(0, 0, 5, PH).fill(PRI);   // left accent
  // Subtle right panel background
  doc.rect(SIDE, 0, PW - SIDE, 5).fill(PRI); // top accent on right

  // ── Left panel — company info ────────────────────────────────────────────────
  let ly = 24;
  if (branding.logo_base64) {
    drawLogo(doc, branding.logo_base64, 16, ly, 50, 50);
    ly += 64;
  }
  doc.fillColor('white').fontSize(13).font('Helvetica-Bold')
     .text(branding.company_name || admin?.company_name || 'Company', 16, ly, { width: SIDE - 26 });
  ly += 20;
  doc.fillColor('#475569').fontSize(7).font('Helvetica')
     .text([branding.company_address, branding.company_phone, branding.company_email].filter(Boolean).join('\n'), 16, ly, { width: SIDE - 26, lineGap: 2 });
  ly += [branding.company_address, branding.company_phone, branding.company_email].filter(Boolean).length * 14 + 4;

  if (branding.company_gstin) {
    doc.fillColor('#334155').fontSize(6.5).font('Helvetica')
       .text(`GSTIN: ${branding.company_gstin}`, 16, ly, { width: SIDE - 26 });
    ly += 14;
  }

  // Divider
  doc.moveTo(16, ly + 6).lineTo(SIDE - 10, ly + 6).lineWidth(0.3).stroke('#1E293B');
  ly += 18;

  // PAYSLIP label
  doc.fillColor(PRI).fontSize(9).font('Helvetica-Bold')
     .text('PAYSLIP', 16, ly, { width: SIDE - 26 });
  ly += 14;
  doc.fillColor('#94A3B8').fontSize(8).font('Helvetica')
     .text(mn, 16, ly, { width: SIDE - 26 });
  ly += 12;
  doc.fillColor('#475569').fontSize(7)
     .text(`Ref: ${ref}`, 16, ly, { width: SIDE - 26 });
  ly += 18;

  // Net pay box on left panel
  doc.rect(16, ly, SIDE - 26, 60).fill('#1E293B');
  doc.rect(16, ly, 3, 60).fill(PRI);
  doc.fillColor('#94A3B8').fontSize(7).font('Helvetica-Bold')
     .text('NET SALARY', 24, ly + 8, { width: SIDE - 36 });
  doc.fillColor('white').fontSize(15).font('Helvetica-Bold')
     .text(INR(net), 24, ly + 20, { width: SIDE - 36 });
  doc.fillColor('#64748B').fontSize(6.5).font('Helvetica')
     .text('Take Home Pay', 24, ly + 40, { width: SIDE - 36 });
  ly += 72;

  // Employee details on left panel
  const empSideData = [
    { l: 'NAME',        v: p.employee_name },
    { l: 'EMP ID',      v: p.employee_id },
    { l: 'DEPARTMENT',  v: p.department || '—' },
    { l: 'DESIGNATION', v: p.designation || '—' },
    { l: 'PAY PERIOD',  v: mn },
    { l: 'PRESENT / WORKING', v: `${p.present_days ?? (p.working_days || 26)} / ${p.working_days || 26} Days` },
    { l: 'LOP DAYS',    v: String(p.lop_days || 0) },
  ];
  ly += 6;
  empSideData.forEach(({ l, v }) => {
    doc.fillColor('#475569').fontSize(6.5).font('Helvetica-Bold').text(l, 16, ly, { width: SIDE - 26 });
    doc.fillColor('white').fontSize(8).font('Helvetica').text(v, 16, ly + 11, { width: SIDE - 26 });
    ly += 26;
  });

  // ── Right panel content ──────────────────────────────────────────────────────
  const { earnRows, deductRows } = getRows(p);
  let ry = 24;

  // EARNINGS
  doc.fillColor(DARK).fontSize(9).font('Helvetica-Bold')
     .text('EARNINGS', RX, ry, { width: RW });
  doc.moveTo(RX, ry + 14).lineTo(RX + RW, ry + 14).lineWidth(1).stroke(PRI);
  ry += 22;

  earnRows.forEach((row, i) => {
    const bg = i % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
    doc.rect(RX - 4, ry - 2, RW + 8, 20).fill(bg);
    doc.fillColor('#334155').fontSize(8).font('Helvetica')
       .text(row.label, RX, ry + 2, { width: RW - 90 });
    doc.fillColor(PRI).font('Helvetica-Bold')
       .text(INR(row.amt), RX, ry + 2, { width: RW, align: 'right' });
    ry += 20;
  });

  // Earnings total
  doc.rect(RX - 4, ry - 1, RW + 8, 22).fill('#FFF1ED');
  doc.fillColor(PRI).fontSize(8.5).font('Helvetica-Bold')
     .text('Total Earnings', RX, ry + 5, { width: RW - 10 })
     .text(INR(p.total_earnings), RX, ry + 5, { width: RW, align: 'right' });
  ry += 32;

  // DEDUCTIONS
  doc.fillColor(DARK).fontSize(9).font('Helvetica-Bold')
     .text('DEDUCTIONS', RX, ry, { width: RW });
  doc.moveTo(RX, ry + 14).lineTo(RX + RW, ry + 14).lineWidth(1).stroke('#DC2626');
  ry += 22;

  deductRows.forEach((row, i) => {
    const bg = i % 2 === 0 ? '#FEF2F2' : '#FFFFFF';
    doc.rect(RX - 4, ry - 2, RW + 8, 20).fill(bg);
    doc.fillColor('#334155').fontSize(8).font('Helvetica')
       .text(row.label, RX, ry + 2, { width: RW - 90 });
    doc.fillColor('#DC2626').font('Helvetica-Bold')
       .text(INR(row.amt), RX, ry + 2, { width: RW, align: 'right' });
    ry += 20;
  });

  // Deductions total
  doc.rect(RX - 4, ry - 1, RW + 8, 22).fill('#FEE2E2');
  doc.fillColor('#DC2626').fontSize(8.5).font('Helvetica-Bold')
     .text('Total Deductions', RX, ry + 5, { width: RW - 10 })
     .text(INR(p.total_deductions), RX, ry + 5, { width: RW, align: 'right' });
  ry += 34;

  // In words
  doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica')
     .text(`In Words: ${toWords(net)}`, RX, ry, { width: RW });
  ry += 16;

  // Employer contributions
  if (branding.show_employer_contributions !== false) {
    const epf  = (p.employer_contributions || {}).pf_employer  || 0;
    const eesi = (p.employer_contributions || {}).esi_employer || 0;
    if (epf > 0 || eesi > 0) {
      doc.rect(RX - 4, ry, RW + 8, 30).fill('#F8FAFC');
      doc.fillColor('#64748B').fontSize(7.5).font('Helvetica-Bold')
         .text('EMPLOYER CONTRIBUTIONS', RX, ry + 6, { width: RW });
      doc.fillColor('#94A3B8').fontSize(7).font('Helvetica')
         .text(`PF: ${INR(epf)}   ESI: ${INR(eesi)}   Total CTC: ${INR(net + epf + eesi)}`, RX, ry + 18, { width: RW });
      ry += 40;
    }
  }

  if (branding.show_signature_line !== false) {
    ry += 12;
    doc.moveTo(RX, ry).lineTo(RX + 140, ry).lineWidth(0.8).stroke('#CBD5E1');
    doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica')
       .text('Authorised Signatory', RX, ry + 4, { width: 140, align: 'center' });
    ry += 20;
  }

  // Footer on right
  const footerY = PH - 32;
  doc.moveTo(RX, footerY).lineTo(RX + RW, footerY).lineWidth(0.4).stroke('#CBD5E1');
  doc.fillColor('#CBD5E1').fontSize(6.5).font('Helvetica')
     .text(branding.custom_footer_text || 'Computer-generated payslip — no physical signature required.', RX, footerY + 6, { width: RW, align: 'left' });
}


// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
const TEMPLATES = {
  classic:   renderClassic,
  modern:    renderModern,
  corporate: renderCorporate,
  minimal:   renderMinimal,
  premium:   renderPremium,
};

function renderPayslipPDF(doc, payslip, branding, admin) {
  const tpl = TEMPLATES[branding?.template || 'modern'];
  (tpl || renderModern)(doc, payslip, branding || {}, admin || {});
}

module.exports = { renderPayslipPDF, TEMPLATES };
