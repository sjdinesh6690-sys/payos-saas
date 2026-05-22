/**
 * PayLeef — 5 Payslip PDF Templates
 * Each template is a function: renderTemplate(doc, payslip, branding, admin)
 * All templates share the same data structure, different visual styles.
 */
const { getDefaultConfig } = require('./payrollEngine');

const INR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function monthName(p) {
  return `${MONTHS[p.month]} ${p.year}`;
}

/** Draw logo from base64 data URL */
function drawLogo(doc, base64, x, y, maxW, maxH) {
  if (!base64) return;
  try {
    const comma = base64.indexOf(',');
    const buf   = Buffer.from(base64.slice(comma + 1), 'base64');
    doc.image(buf, x, y, { fit: [maxW, maxH], align: 'left', valign: 'center' });
  } catch (_) { /* skip if logo fails */ }
}

/** Get label map from config snapshot */
function getLabelMaps(p) {
  const cfg = p.config_snapshot || getDefaultConfig();
  const earnLabels   = {};
  const deductLabels = {};
  (cfg.earnings   || []).filter(c => c.enabled).forEach(c => { earnLabels[c.key]   = c.label; });
  (cfg.deductions || []).filter(c => c.enabled).forEach(c => { deductLabels[c.key] = c.label; });
  return { cfg, earnLabels, deductLabels };
}

/** Shared: build earnings/deduction rows */
function getRows(p) {
  const { earnLabels, deductLabels } = getLabelMaps(p);
  const earnRows   = Object.entries(p.earnings   || {}).filter(([,v]) => v > 0).map(([k,v]) => ({ label: earnLabels[k]   || k, amt: v }));
  const deductRows = Object.entries(p.deductions || {}).filter(([,v]) => v > 0).map(([k,v]) => ({ label: deductLabels[k] || k, amt: v }));
  return { earnRows, deductRows };
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 1 — CLASSIC  (Traditional navy blue, two-column table)
// ─────────────────────────────────────────────────────────────────────────────
function renderClassic(doc, p, branding, admin) {
  const W   = doc.page.width - 80;
  const COL = '#1B4F8A';
  const LGR = '#F8FAFC';
  const MGR = '#E2E8F0';
  const mn  = monthName(p);

  // Header band
  doc.rect(0, 0, doc.page.width, 85).fill(COL);

  // Logo
  if (branding.logo_base64) drawLogo(doc, branding.logo_base64, 40, 12, 60, 60);

  const textX = branding.logo_base64 ? 112 : 40;
  doc.fillColor('white').fontSize(17).font('Helvetica-Bold')
     .text(branding.company_name || admin?.company_name || 'Company', textX, 16, { width: W - 80 });
  doc.fontSize(8).font('Helvetica')
     .text([branding.company_address, branding.company_phone, branding.company_email].filter(Boolean).join('  ·  '), textX, 38, { width: W - 80 });

  doc.fontSize(9).font('Helvetica-Bold')
     .text('SALARY SLIP', doc.page.width - 160, 18, { width: 140, align: 'right' });
  doc.fontSize(8).font('Helvetica')
     .text(mn, doc.page.width - 160, 32, { width: 140, align: 'right' });
  doc.fontSize(12).font('Helvetica-Bold')
     .text(INR(p.net_salary || p.salary), doc.page.width - 160, 48, { width: 140, align: 'right' });
  doc.fontSize(7).font('Helvetica').fillColor('#BFD8FF')
     .text('NET SALARY', doc.page.width - 160, 64, { width: 140, align: 'right' });

  let y = 100;

  // Employee details
  doc.rect(40, y, W, 68).fill(LGR).stroke(MGR);
  doc.fillColor('#1E293B');
  const c1 = 50, c2 = 260, lw = 95;
  const fields = [
    ['Employee Name:', p.employee_name, 'Pay Period:', mn],
    ['Employee ID:',  p.employee_id,   'Working Days:', String(p.working_days || 26)],
    ['Department:',   p.department  || '—', 'Present Days:', String(p.present_days ?? (p.working_days || 26))],
    ['Designation:',  p.designation || '—', 'LOP Days:', String(p.lop_days || 0)],
  ];
  fields.forEach(([l1, v1, l2, v2], i) => {
    const fy = y + 8 + i * 14;
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#334155').text(l1, c1, fy);
    doc.font('Helvetica').fillColor('#64748B').text(v1, c1 + lw, fy, { width: 140 });
    doc.font('Helvetica-Bold').fillColor('#334155').text(l2, c2, fy);
    doc.font('Helvetica').fillColor('#64748B').text(v2, c2 + lw, fy);
  });
  y += 82;

  // Table
  const { earnRows, deductRows } = getRows(p);
  const half = (W - 8) / 2;
  const lx = 40, rx = 40 + half + 8;
  const rh = 16, hh = 20;

  // Headers
  doc.rect(lx, y, half, hh).fill(COL);
  doc.rect(rx, y, half, hh).fill('#991B1B');
  doc.fillColor('white').fontSize(8.5).font('Helvetica-Bold');
  doc.text('EARNINGS',   lx + 6, y + 5, { width: half - 12 });
  doc.text('Amount',     lx + 6, y + 5, { width: half - 12, align: 'right' });
  doc.text('DEDUCTIONS', rx + 6, y + 5, { width: half - 12 });
  doc.text('Amount',     rx + 6, y + 5, { width: half - 12, align: 'right' });
  y += hh;

  const maxR = Math.max(earnRows.length, deductRows.length, 1);
  for (let i = 0; i < maxR; i++) {
    const bg = i % 2 === 0 ? '#FFFFFF' : LGR;
    doc.rect(lx, y, half, rh).fill(bg);
    doc.rect(rx, y, half, rh).fill(bg);
    if (earnRows[i]) {
      doc.fillColor('#1E293B').fontSize(8).font('Helvetica').text(earnRows[i].label, lx+6, y+4, { width: half-60 });
      doc.font('Helvetica-Bold').text(INR(earnRows[i].amt), lx+6, y+4, { width: half-12, align: 'right' });
    }
    if (deductRows[i]) {
      doc.fillColor('#1E293B').fontSize(8).font('Helvetica').text(deductRows[i].label, rx+6, y+4, { width: half-60 });
      doc.font('Helvetica-Bold').text(INR(deductRows[i].amt), rx+6, y+4, { width: half-12, align: 'right' });
    }
    y += rh;
  }

  // Totals
  doc.rect(lx, y, half, rh+2).fill('#DBEAFE');
  doc.rect(rx, y, half, rh+2).fill('#FEE2E2');
  doc.fillColor(COL).fontSize(8.5).font('Helvetica-Bold')
     .text('Total Earnings', lx+6, y+4, { width: half-12 })
     .text(INR(p.total_earnings), lx+6, y+4, { width: half-12, align: 'right' });
  doc.fillColor('#991B1B')
     .text('Total Deductions', rx+6, y+4, { width: half-12 })
     .text(INR(p.total_deductions), rx+6, y+4, { width: half-12, align: 'right' });
  y += rh + 14;

  // Net pay
  doc.rect(40, y, W, 34).fill(COL);
  doc.fillColor('white').fontSize(11).font('Helvetica-Bold')
     .text('NET SALARY (Take Home)', 50, y+10, { width: W-20 });
  doc.fontSize(13).text(INR(p.net_salary || p.salary), 50, y+9, { width: W-20, align: 'right' });
  y += 46;

  // Employer contributions
  if (branding.show_employer_contributions !== false) {
    const epf = (p.employer_contributions||{}).pf_employer || 0;
    const eesi = (p.employer_contributions||{}).esi_employer || 0;
    if (epf > 0 || eesi > 0) {
      doc.rect(40, y, W, 18).fill(LGR).stroke(MGR);
      doc.fillColor('#64748B').fontSize(7.5).font('Helvetica')
         .text(`Employer Contributions — PF: ${INR(epf)}  ESI: ${INR(eesi)}  CTC: ${INR((p.net_salary||0)+epf+eesi)}`, 46, y+5, { width: W-12 });
      y += 26;
    }
  }

  // Signature
  if (branding.show_signature_line !== false) {
    y += 16;
    doc.moveTo(40, y).lineTo(200, y).stroke('#CBD5E1');
    doc.moveTo(W-120, y).lineTo(W+40, y).stroke('#CBD5E1');
    doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica')
       .text('Employee Signature', 40, y+4)
       .text('Authorised Signatory', W-120, y+4);
    y += 24;
  }

  // Footer
  doc.fillColor('#94A3B8').fontSize(7).font('Helvetica')
     .text(branding.custom_footer_text || 'This is a computer-generated payslip and does not require a signature.', 40, y+8, { align: 'center', width: W });
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 2 — MODERN  (Brand-color header, card-style, clean)
// ─────────────────────────────────────────────────────────────────────────────
function renderModern(doc, p, branding, admin) {
  const W      = doc.page.width - 80;
  const PRI    = branding.primary_color || '#E85C2F';
  const PRI_DK = '#C94A20';
  const mn     = monthName(p);

  // Header
  doc.rect(0, 0, doc.page.width, 90).fill(PRI);
  doc.rect(0, 80, doc.page.width, 10).fill(PRI_DK);

  if (branding.logo_base64) drawLogo(doc, branding.logo_base64, 40, 14, 64, 64);
  const tx = branding.logo_base64 ? 118 : 40;
  doc.fillColor('white').fontSize(18).font('Helvetica-Bold')
     .text(branding.company_name || admin?.company_name || 'Company', tx, 18, { width: W-90 });
  doc.fontSize(8).font('Helvetica').fillColor('rgba(255,255,255,0.7)')
     .text([branding.company_address, branding.company_gstin ? `GSTIN: ${branding.company_gstin}` : ''].filter(Boolean).join('  ·  '), tx, 40, { width: W-90 });
  doc.fillColor('rgba(255,255,255,0.5)').fontSize(7.5)
     .text([branding.company_phone, branding.company_email, branding.company_website].filter(Boolean).join('  ·  '), tx, 54, { width: W-90 });

  // Period badge top-right
  doc.rect(doc.page.width-145, 15, 110, 18).fill('rgba(0,0,0,0.15)');
  doc.fillColor('white').fontSize(8).font('Helvetica-Bold')
     .text('SALARY SLIP · '+mn, doc.page.width-143, 20, { width: 106, align: 'center' });

  let y = 102;

  // Employee card
  doc.rect(40, y, W, 72).fill('#FFF8F6').stroke('#FDDDD3');
  doc.rect(40, y, 4, 72).fill(PRI); // color accent bar

  const c1=54, c2=260, lw=90;
  const empFields = [
    ['Name',        p.employee_name,          'Pay Period',    mn],
    ['Employee ID', p.employee_id,            'Working Days',  String(p.working_days||26)],
    ['Department',  p.department||'—',        'Present Days',  String(p.present_days ?? (p.working_days||26))],
    ['Designation', p.designation||'—',       'LOP Days',      String(p.lop_days||0)],
  ];
  empFields.forEach(([l1,v1,l2,v2], i) => {
    const fy = y+10+i*14;
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#94A3B8').text(l1.toUpperCase(), c1, fy);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#1E293B').text(v1, c1+lw, fy, { width: 165 });
    doc.fontSize(7).font('Helvetica-Bold').fillColor('#94A3B8').text(l2.toUpperCase(), c2, fy);
    doc.fontSize(8).font('Helvetica-Bold').fillColor('#1E293B').text(v2, c2+lw, fy);
  });
  y += 86;

  // Two-column breakdown
  const { earnRows, deductRows } = getRows(p);
  const half = (W-10)/2;
  const lx=40, rx=40+half+10;
  const rh=17, hh=22;

  // Section headers
  doc.rect(lx, y, half, hh).fill(PRI);
  doc.rect(rx, y, half, hh).fill('#DC2626');
  doc.fillColor('white').fontSize(9).font('Helvetica-Bold');
  doc.text('EARNINGS',   lx+8, y+6, { width: half-16 });
  doc.text('Amount',     lx+8, y+6, { width: half-16, align: 'right' });
  doc.text('DEDUCTIONS', rx+8, y+6, { width: half-16 });
  doc.text('Amount',     rx+8, y+6, { width: half-16, align: 'right' });
  y += hh;

  const maxR = Math.max(earnRows.length, deductRows.length, 1);
  for (let i = 0; i < maxR; i++) {
    const bg = i % 2 === 0 ? '#FFFFFF' : '#FFF8F6';
    doc.rect(lx, y, half, rh).fill(bg);
    doc.rect(rx, y, half, rh).fill(bg);
    if (earnRows[i]) {
      doc.fillColor('#334155').fontSize(8).font('Helvetica').text(earnRows[i].label, lx+8, y+5, { width: half-60 });
      doc.font('Helvetica-Bold').fillColor(PRI).text(INR(earnRows[i].amt), lx+8, y+5, { width: half-16, align: 'right' });
    }
    if (deductRows[i]) {
      doc.fillColor('#334155').fontSize(8).font('Helvetica').text(deductRows[i].label, rx+8, y+5, { width: half-60 });
      doc.font('Helvetica-Bold').fillColor('#DC2626').text(INR(deductRows[i].amt), rx+8, y+5, { width: half-16, align: 'right' });
    }
    y += rh;
  }

  // Totals
  doc.rect(lx, y, half, rh+2).fill('#FFF1ED');
  doc.rect(rx, y, half, rh+2).fill('#FEF2F2');
  doc.fillColor(PRI).fontSize(8.5).font('Helvetica-Bold')
     .text('Total Earnings', lx+8, y+5, { width: half-16 })
     .text(INR(p.total_earnings), lx+8, y+5, { width: half-16, align: 'right' });
  doc.fillColor('#DC2626')
     .text('Total Deductions', rx+8, y+5, { width: half-16 })
     .text(INR(p.total_deductions), rx+8, y+5, { width: half-16, align: 'right' });
  y += rh + 14;

  // Net pay box
  doc.rect(40, y, W, 38).fill(PRI);
  doc.rect(40, y, 6, 38).fill(PRI_DK);
  doc.fillColor('white').fontSize(11).font('Helvetica-Bold')
     .text('NET SALARY (Take Home)', 56, y+12, { width: W-26 });
  doc.fontSize(15).text(INR(p.net_salary||p.salary), 56, y+10, { width: W-26, align: 'right' });
  y += 52;

  // Employer CTC
  if (branding.show_employer_contributions !== false) {
    const epf=(p.employer_contributions||{}).pf_employer||0;
    const eesi=(p.employer_contributions||{}).esi_employer||0;
    if (epf>0||eesi>0) {
      doc.rect(40,y,W,18).fill('#FFF8F6').stroke('#FDDDD3');
      doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica')
         .text(`Employer PF: ${INR(epf)}  ESI: ${INR(eesi)}  Total CTC: ${INR((p.net_salary||0)+epf+eesi)}`, 46, y+5, { width: W-12, align: 'center' });
      y += 26;
    }
  }

  if (branding.show_signature_line!==false) {
    y += 14;
    doc.moveTo(40,y).lineTo(190,y).stroke('#CBD5E1');
    doc.moveTo(W-100,y).lineTo(W+40,y).stroke('#CBD5E1');
    doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica')
       .text('Employee Signature',40,y+4)
       .text('Authorised Signatory',W-100,y+4);
    y+=22;
  }

  doc.fillColor('#CBD5E1').fontSize(7).font('Helvetica')
     .text(branding.custom_footer_text||'This is a computer-generated payslip.', 40, y+8, { align:'center', width:W });
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 3 — CORPORATE  (Dark charcoal, executive premium)
// ─────────────────────────────────────────────────────────────────────────────
function renderCorporate(doc, p, branding, admin) {
  const W    = doc.page.width - 80;
  const DARK = '#0F172A';
  const MID  = '#1E293B';
  const ACC  = branding.primary_color || '#E85C2F';
  const mn   = monthName(p);

  // Full dark header
  doc.rect(0,0,doc.page.width,100).fill(DARK);
  // Accent stripe
  doc.rect(0,96,doc.page.width,4).fill(ACC);

  if (branding.logo_base64) drawLogo(doc, branding.logo_base64, 40, 16, 68, 68);
  const tx = branding.logo_base64 ? 122 : 40;

  doc.fillColor('white').fontSize(20).font('Helvetica-Bold')
     .text(branding.company_name||admin?.company_name||'Company', tx, 16, { width: W-90 });
  doc.fontSize(8).font('Helvetica').fillColor('#64748B')
     .text([branding.company_address, branding.company_phone].filter(Boolean).join('  ·  '), tx, 44, { width: W-90 });
  doc.fillColor('#475569').fontSize(8)
     .text([branding.company_email, branding.company_website].filter(Boolean).join('  ·  '), tx, 56, { width: W-90 });

  // Right side
  doc.fillColor(ACC).fontSize(9).font('Helvetica-Bold')
     .text('PAYSLIP', doc.page.width-150, 20, { width:115, align:'right' });
  doc.fillColor('#64748B').fontSize(8).font('Helvetica')
     .text(mn, doc.page.width-150, 34, { width:115, align:'right' });
  doc.fillColor('white').fontSize(14).font('Helvetica-Bold')
     .text(INR(p.net_salary||p.salary), doc.page.width-150, 56, { width:115, align:'right' });
  doc.fillColor('#475569').fontSize(7)
     .text('NET SALARY', doc.page.width-150, 74, { width:115, align:'right' });

  let y=114;

  // Employee info - horizontal strip
  doc.rect(40,y,W,60).fill(MID);
  const empData = [
    {l:'EMPLOYEE', v:p.employee_name}, {l:'EMP ID',v:p.employee_id},
    {l:'DEPARTMENT',v:p.department||'—'}, {l:'DESIGNATION',v:p.designation||'—'},
  ];
  const colW = W/4;
  empData.forEach(({l,v},i) => {
    const fx = 40+i*colW+10;
    doc.fillColor('#64748B').fontSize(7).font('Helvetica-Bold').text(l, fx, y+10, {width:colW-20});
    doc.fillColor('white').fontSize(8.5).font('Helvetica-Bold').text(v, fx, y+24, {width:colW-20});
  });

  const attData = [
    {l:'PAY PERIOD',v:mn}, {l:'WORKING DAYS',v:String(p.working_days||26)},
    {l:'PRESENT DAYS',v:String(p.present_days??(p.working_days||26))}, {l:'LOP DAYS',v:String(p.lop_days||0)},
  ];
  attData.forEach(({l,v},i) => {
    const fx = 40+i*colW+10;
    doc.fillColor('#64748B').fontSize(7).font('Helvetica-Bold').text(l, fx, y+36, {width:colW-20});
    doc.fillColor(ACC).fontSize(8.5).font('Helvetica-Bold').text(v, fx, y+49, {width:colW-20});
  });
  y+=76;

  // Table
  const { earnRows, deductRows } = getRows(p);
  const half=(W-8)/2;
  const lx=40, rx=40+half+8;
  const rh=17, hh=22;

  doc.rect(lx,y,half,hh).fill(MID);
  doc.rect(rx,y,half,hh).fill(MID);
  doc.fillColor(ACC).fontSize(8.5).font('Helvetica-Bold')
     .text('EARNINGS', lx+8,y+6,{width:half-16})
     .text('Amount', lx+8,y+6,{width:half-16,align:'right'});
  doc.fillColor('#DC2626')
     .text('DEDUCTIONS', rx+8,y+6,{width:half-16})
     .text('Amount', rx+8,y+6,{width:half-16,align:'right'});
  y+=hh;

  const maxR=Math.max(earnRows.length,deductRows.length,1);
  for(let i=0;i<maxR;i++){
    const bg = i%2===0?'#F8FAFC':'#F1F5F9';
    doc.rect(lx,y,half,rh).fill(bg);
    doc.rect(rx,y,half,rh).fill(bg);
    if(earnRows[i]){
      doc.fillColor('#334155').fontSize(8).font('Helvetica').text(earnRows[i].label,lx+8,y+5,{width:half-60});
      doc.font('Helvetica-Bold').fillColor('#1E293B').text(INR(earnRows[i].amt),lx+8,y+5,{width:half-16,align:'right'});
    }
    if(deductRows[i]){
      doc.fillColor('#334155').fontSize(8).font('Helvetica').text(deductRows[i].label,rx+8,y+5,{width:half-60});
      doc.font('Helvetica-Bold').fillColor('#1E293B').text(INR(deductRows[i].amt),rx+8,y+5,{width:half-16,align:'right'});
    }
    y+=rh;
  }

  // Total row
  doc.rect(lx,y,half,rh+2).fill('#E2E8F0');
  doc.rect(rx,y,half,rh+2).fill('#E2E8F0');
  doc.fillColor(DARK).fontSize(8.5).font('Helvetica-Bold')
     .text('Total Earnings',lx+8,y+5,{width:half-16})
     .text(INR(p.total_earnings),lx+8,y+5,{width:half-16,align:'right'});
  doc.text('Total Deductions',rx+8,y+5,{width:half-16})
     .text(INR(p.total_deductions),rx+8,y+5,{width:half-16,align:'right'});
  y+=rh+14;

  // Net salary
  doc.rect(40,y,W,38).fill(DARK);
  doc.rect(40,y,5,38).fill(ACC);
  doc.fillColor('white').fontSize(11).font('Helvetica-Bold')
     .text('NET SALARY', 55,y+12,{width:W-25});
  doc.fontSize(15).text(INR(p.net_salary||p.salary),55,y+10,{width:W-25,align:'right'});
  y+=52;

  if(branding.show_employer_contributions!==false){
    const epf=(p.employer_contributions||{}).pf_employer||0;
    const eesi=(p.employer_contributions||{}).esi_employer||0;
    if(epf>0||eesi>0){
      doc.rect(40,y,W,18).fill('#F1F5F9');
      doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica')
         .text(`Employer Contributions — PF: ${INR(epf)}  ESI: ${INR(eesi)}  CTC: ${INR((p.net_salary||0)+epf+eesi)}`,46,y+5,{width:W-12,align:'center'});
      y+=26;
    }
  }

  if(branding.show_signature_line!==false){
    y+=14;
    doc.moveTo(40,y).lineTo(190,y).stroke('#CBD5E1');
    doc.moveTo(W-100,y).lineTo(W+40,y).stroke('#CBD5E1');
    doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica')
       .text('Employee Signature',40,y+4)
       .text('Authorised Signatory',W-100,y+4);
    y+=22;
  }

  doc.fillColor('#94A3B8').fontSize(7).font('Helvetica')
     .text(branding.custom_footer_text||'Confidential — For authorised use only.', 40, y+8, {align:'center',width:W});
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 4 — MINIMAL  (Pure white, black text, printer-friendly)
// ─────────────────────────────────────────────────────────────────────────────
function renderMinimal(doc, p, branding, admin) {
  const W  = doc.page.width - 80;
  const mn = monthName(p);

  if(branding.logo_base64) drawLogo(doc, branding.logo_base64, 40, 30, 60, 60);
  const tx = branding.logo_base64 ? 112 : 40;

  doc.fillColor('#000000').fontSize(18).font('Helvetica-Bold')
     .text(branding.company_name||admin?.company_name||'Company', tx, 32, {width:W-90});
  doc.fontSize(8).font('Helvetica').fillColor('#555555')
     .text([branding.company_address,branding.company_phone,branding.company_email].filter(Boolean).join('  ·  '), tx, 54, {width:W-90});

  // Title
  doc.fillColor('#000').fontSize(11).font('Helvetica-Bold')
     .text('SALARY SLIP', doc.page.width-170, 34, {width:130,align:'right'});
  doc.fontSize(8).font('Helvetica').fillColor('#333')
     .text(mn, doc.page.width-170, 50, {width:130,align:'right'});

  // Horizontal rule
  let y = 88;
  doc.moveTo(40,y).lineTo(40+W,y).lineWidth(1.5).stroke('#000');
  y += 14;

  // Employee details - minimal 4-column
  const empRow1 = [{l:'Employee Name',v:p.employee_name},{l:'Employee ID',v:p.employee_id},{l:'Department',v:p.department||'—'},{l:'Designation',v:p.designation||'—'}];
  const empRow2 = [{l:'Pay Period',v:mn},{l:'Working Days',v:String(p.working_days||26)},{l:'Present Days',v:String(p.present_days??(p.working_days||26))},{l:'LOP Days',v:String(p.lop_days||0)}];

  [empRow1,empRow2].forEach((row,ri)=>{
    const cw=W/4;
    row.forEach(({l,v},i)=>{
      const fx=40+i*cw;
      doc.fillColor('#888').fontSize(7).font('Helvetica-Bold').text(l.toUpperCase(),fx,y,{width:cw-10});
      doc.fillColor('#000').fontSize(8.5).font('Helvetica-Bold').text(v,fx,y+11,{width:cw-10});
    });
    y += 28;
  });

  doc.moveTo(40,y).lineTo(40+W,y).lineWidth(0.5).stroke('#999');
  y+=12;

  // Table
  const { earnRows, deductRows } = getRows(p);
  const half=(W-10)/2;
  const lx=40, rx=40+half+10;
  const rh=16, hh=18;

  // Headers — just text, no fill
  doc.fillColor('#000').fontSize(8.5).font('Helvetica-Bold')
     .text('EARNINGS', lx, y, {width:half-10});
  doc.text('AMOUNT', lx, y, {width:half-10, align:'right'});
  doc.text('DEDUCTIONS', rx, y, {width:half-10});
  doc.text('AMOUNT', rx, y, {width:half-10, align:'right'});
  y+=hh;
  doc.moveTo(lx,y).lineTo(lx+half,y).lineWidth(0.5).stroke('#999');
  doc.moveTo(rx,y).lineTo(rx+half,y).lineWidth(0.5).stroke('#999');
  y+=4;

  const maxR=Math.max(earnRows.length,deductRows.length,1);
  for(let i=0;i<maxR;i++){
    if(earnRows[i]){
      doc.fillColor('#333').fontSize(8).font('Helvetica').text(earnRows[i].label,lx,y+3,{width:half-60});
      doc.font('Helvetica-Bold').fillColor('#000').text(INR(earnRows[i].amt),lx,y+3,{width:half-10,align:'right'});
    }
    if(deductRows[i]){
      doc.fillColor('#333').fontSize(8).font('Helvetica').text(deductRows[i].label,rx,y+3,{width:half-60});
      doc.font('Helvetica-Bold').fillColor('#000').text(INR(deductRows[i].amt),rx,y+3,{width:half-10,align:'right'});
    }
    y+=rh;
  }

  doc.moveTo(lx,y).lineTo(lx+half,y).lineWidth(0.5).stroke('#999');
  doc.moveTo(rx,y).lineTo(rx+half,y).lineWidth(0.5).stroke('#999');
  y+=6;

  // Totals
  doc.fillColor('#000').fontSize(8.5).font('Helvetica-Bold')
     .text('TOTAL EARNINGS',lx,y,{width:half-10})
     .text(INR(p.total_earnings),lx,y,{width:half-10,align:'right'});
  doc.text('TOTAL DEDUCTIONS',rx,y,{width:half-10})
     .text(INR(p.total_deductions),rx,y,{width:half-10,align:'right'});
  y+=20;

  // Net pay — simple box
  doc.rect(40,y,W,34).stroke('#000').lineWidth(1.5);
  doc.fillColor('#000').fontSize(11).font('Helvetica-Bold')
     .text('NET SALARY (Take Home)',50,y+11,{width:W-20});
  doc.fontSize(14).text(INR(p.net_salary||p.salary),50,y+10,{width:W-20,align:'right'});
  y+=48;

  if(branding.show_employer_contributions!==false){
    const epf=(p.employer_contributions||{}).pf_employer||0;
    const eesi=(p.employer_contributions||{}).esi_employer||0;
    if(epf>0||eesi>0){
      doc.fillColor('#555').fontSize(7.5).font('Helvetica')
         .text(`Employer PF: ${INR(epf)}  ESI: ${INR(eesi)}  CTC: ${INR((p.net_salary||0)+epf+eesi)}`,40,y+4,{width:W,align:'center'});
      y+=18;
    }
  }

  if(branding.show_signature_line!==false){
    y+=14;
    doc.moveTo(40,y).lineTo(190,y).stroke('#000');
    doc.moveTo(W-100,y).lineTo(W+40,y).stroke('#000');
    doc.fillColor('#555').fontSize(7.5).font('Helvetica')
       .text('Employee Signature',40,y+4)
       .text('Authorised Signatory',W-100,y+4);
    y+=22;
  }

  doc.moveTo(40,y+4).lineTo(40+W,y+4).lineWidth(0.5).stroke('#999');
  doc.fillColor('#888').fontSize(7).font('Helvetica')
     .text(branding.custom_footer_text||'This is a computer-generated payslip and does not require a physical signature.',40,y+8,{align:'center',width:W});
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATE 5 — PREMIUM  (Split header, accent panel, bold typography)
// ─────────────────────────────────────────────────────────────────────────────
function renderPremium(doc, p, branding, admin) {
  const W   = doc.page.width - 80;
  const PRI = branding.primary_color || '#E85C2F';
  const DRK = '#1E293B';
  const mn  = monthName(p);

  // Left dark panel header
  doc.rect(0,0,220,doc.page.height).fill('#0F172A');
  // Right white area (default)
  doc.rect(220,0,doc.page.width-220,doc.page.height).fill('#FFFFFF');
  // Accent bar on left panel
  doc.rect(0,0,4,doc.page.height).fill(PRI);

  // Company on left
  if(branding.logo_base64) drawLogo(doc, branding.logo_base64, 20, 24, 50, 50);
  const logoEndY = branding.logo_base64 ? 82 : 24;
  doc.fillColor('white').fontSize(14).font('Helvetica-Bold')
     .text(branding.company_name||admin?.company_name||'Company', 16, logoEndY, {width:188});
  doc.fillColor('#64748B').fontSize(7.5).font('Helvetica')
     .text([branding.company_address, branding.company_phone, branding.company_email].filter(Boolean).join('\n'), 16, logoEndY+20, {width:188});

  // PAYSLIP label
  doc.fillColor(PRI).fontSize(11).font('Helvetica-Bold')
     .text('PAYSLIP', 16, 160, {width:188});
  doc.fillColor('#94A3B8').fontSize(8).font('Helvetica')
     .text(mn, 16, 176, {width:188});

  // Net pay on left panel
  doc.rect(16,200,180,52).fill('#1E293B');
  doc.rect(16,200,3,52).fill(PRI);
  doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica-Bold')
     .text('NET SALARY', 26, 208, {width:160});
  doc.fillColor('white').fontSize(16).font('Helvetica-Bold')
     .text(INR(p.net_salary||p.salary), 26, 222, {width:160});
  doc.fillColor('#64748B').fontSize(7).font('Helvetica')
     .text('Take Home Pay', 26, 243, {width:160});

  // Employee details on left panel
  const empLData = [
    {l:'Name',        v:p.employee_name},
    {l:'ID',          v:p.employee_id},
    {l:'Department',  v:p.department||'—'},
    {l:'Designation', v:p.designation||'—'},
    {l:'Pay Days',    v:`${p.present_days??(p.working_days||26)} / ${p.working_days||26}`},
    {l:'LOP Days',    v:String(p.lop_days||0)},
  ];
  let ely=270;
  empLData.forEach(({l,v})=>{
    doc.fillColor('#475569').fontSize(7).font('Helvetica-Bold').text(l.toUpperCase(), 16, ely, {width:188});
    doc.fillColor('white').fontSize(8).font('Helvetica-Bold').text(v, 16, ely+10, {width:188});
    ely+=25;
  });

  // Main content on right side
  const RX=236, RW=doc.page.width-236-20;
  let y=24;

  doc.fillColor(DRK).fontSize(10).font('Helvetica-Bold')
     .text('EARNINGS', RX, y, {width:RW});
  y+=16;

  // Earnings list
  const { earnRows, deductRows } = getRows(p);
  earnRows.forEach((row,i)=>{
    const bg = i%2===0?'#F8FAFC':'#FFFFFF';
    doc.rect(RX-4,y-2,RW+8,16).fill(bg);
    doc.fillColor('#334155').fontSize(8).font('Helvetica').text(row.label,RX,y,{width:RW-80});
    doc.fillColor(PRI).font('Helvetica-Bold').text(INR(row.amt),RX,y,{width:RW,align:'right'});
    y+=16;
  });

  doc.rect(RX-4,y-2,RW+8,18).fill('#FFF1ED');
  doc.fillColor(PRI).fontSize(8.5).font('Helvetica-Bold')
     .text('Total Earnings',RX,y+2,{width:RW})
     .text(INR(p.total_earnings),RX,y+2,{width:RW,align:'right'});
  y+=24;

  doc.fillColor(DRK).fontSize(10).font('Helvetica-Bold')
     .text('DEDUCTIONS', RX, y, {width:RW});
  y+=16;

  deductRows.forEach((row,i)=>{
    const bg=i%2===0?'#FEF2F2':'#FFFFFF';
    doc.rect(RX-4,y-2,RW+8,16).fill(bg);
    doc.fillColor('#334155').fontSize(8).font('Helvetica').text(row.label,RX,y,{width:RW-80});
    doc.fillColor('#DC2626').font('Helvetica-Bold').text(INR(row.amt),RX,y,{width:RW,align:'right'});
    y+=16;
  });

  doc.rect(RX-4,y-2,RW+8,18).fill('#FEE2E2');
  doc.fillColor('#DC2626').fontSize(8.5).font('Helvetica-Bold')
     .text('Total Deductions',RX,y+2,{width:RW})
     .text(INR(p.total_deductions),RX,y+2,{width:RW,align:'right'});
  y+=30;

  if(branding.show_employer_contributions!==false){
    const epf=(p.employer_contributions||{}).pf_employer||0;
    const eesi=(p.employer_contributions||{}).esi_employer||0;
    if(epf>0||eesi>0){
      doc.rect(RX-4,y,RW+8,28).fill('#F8FAFC');
      doc.fillColor('#64748B').fontSize(7.5).font('Helvetica-Bold').text('EMPLOYER CONTRIBUTIONS',RX,y+5,{width:RW});
      doc.fillColor('#94A3B8').fontSize(7).font('Helvetica')
         .text(`PF: ${INR(epf)}  ESI: ${INR(eesi)}  CTC: ${INR((p.net_salary||0)+epf+eesi)}`,RX,y+16,{width:RW});
      y+=36;
    }
  }

  if(branding.show_signature_line!==false){
    y+=14;
    doc.moveTo(RX,y).lineTo(RX+130,y).stroke('#CBD5E1');
    doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica').text('Authorised Signatory',RX,y+4,{width:130,align:'center'});
  }

  // Footer on right
  const footerY=doc.page.height-30;
  doc.fillColor('#CBD5E1').fontSize(7).font('Helvetica')
     .text(branding.custom_footer_text||'Computer-generated payslip. No signature required.',RX,footerY,{width:RW,align:'left'});
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT — pick template by name
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
