import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, ChevronRight, Loader2, Bot, User, RotateCcw, Sparkles } from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

// ─── Indian states list ────────────────────────────────────────────────────
const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh',
  'Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka',
  'Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram',
  'Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana',
  'Tripura','Uttar Pradesh','Uttarakhand','West Bengal',
  'Delhi','Jammu & Kashmir','Ladakh','Puducherry','Chandigarh',
];

// ─── Full conversation script ─────────────────────────────────────────────
// Each step: id, stage, consultantMsg, type, key, options?, placeholder?, default?
const SCRIPT = [
  // ── Stage 1: Company Info ──────────────────────────────────────────────
  {
    id: 0,
    stage: 1,
    stageLabel: 'Company Info',
    consultantMsg: "Hello! I'm your PayLeef Setup Consultant. 👋\n\nI'll help you configure your payroll in just a few minutes by asking simple questions one at a time.\n\nLet's start! What is your **company name**?",
    type: 'text',
    key: 'companyName',
    placeholder: 'e.g. Acme Technologies Pvt Ltd',
  },
  {
    id: 1,
    stage: 1,
    stageLabel: 'Company Info',
    consultantMsg: "Great! Now, which **state** is your company registered in? This helps me set the correct Professional Tax slab for your location.",
    type: 'state-select',
    key: 'state',
    options: INDIAN_STATES,
  },
  {
    id: 2,
    stage: 1,
    stageLabel: 'Company Info',
    consultantMsg: "What **industry** are you in? This helps me recommend the right compliance defaults.",
    type: 'chips',
    key: 'industry',
    options: ['IT / Software', 'Manufacturing', 'Healthcare', 'Retail / Trade', 'Education', 'Construction', 'Logistics', 'Other'],
  },
  {
    id: 3,
    stage: 1,
    stageLabel: 'Company Info',
    consultantMsg: "How many **employees** do you currently have? This is important for ESI eligibility (required if you have 10+ employees with gross ≤ ₹21,000).",
    type: 'chips',
    key: 'employeeCount',
    options: ['1–9', '10–19', '20–49', '50–99', '100–499', '500+'],
  },

  // ── Stage 2: Salary Structure ──────────────────────────────────────────
  {
    id: 4,
    stage: 2,
    stageLabel: 'Salary Structure',
    consultantMsg: "Now let's set up your **salary structure**.\n\nWhat percentage of the Gross Salary should be the **Basic Pay**?\n\n💡 *Standard practice is 40–50% of gross. Basic affects PF calculation.*",
    type: 'chips',
    key: 'basicPct',
    options: ['35%', '40%', '45%', '50%', '60%'],
    default: '40%',
  },
  {
    id: 5,
    stage: 2,
    stageLabel: 'Salary Structure',
    consultantMsg: "What percentage of **Basic Pay** should be the **HRA (House Rent Allowance)**?\n\n💡 *40% of Basic is standard for non-metro cities; 50% for metro cities (Delhi, Mumbai, Chennai, Kolkata).*",
    type: 'chips',
    key: 'hraPct',
    options: ['30%', '40%', '50%', '60%'],
    default: '40%',
  },
  {
    id: 6,
    stage: 2,
    stageLabel: 'Salary Structure',
    consultantMsg: "Do you want to include a fixed **Conveyance Allowance**?\n\n💡 *₹1,600/month is the standard amount (tax-exempt up to this limit).*",
    type: 'chips',
    key: 'conveyance',
    options: ['₹1,600 (Standard)', '₹2,000', '₹3,000', 'No Conveyance'],
    default: '₹1,600 (Standard)',
  },
  {
    id: 7,
    stage: 2,
    stageLabel: 'Salary Structure',
    consultantMsg: "Do you want to include a fixed **Medical Allowance**?\n\n💡 *₹1,250/month is the standard (partially tax-exempt with bills).*",
    type: 'chips',
    key: 'medical',
    options: ['₹1,250 (Standard)', '₹1,500', '₹2,000', 'No Medical'],
    default: '₹1,250 (Standard)',
  },

  // ── Stage 3: Statutory Deductions ─────────────────────────────────────
  {
    id: 8,
    stage: 3,
    stageLabel: 'Statutory Compliance',
    consultantMsg: "Let's configure your **statutory deductions**.\n\nDo you want to enable **PF (Provident Fund)**?\n\n💡 *PF is mandatory for companies with 20+ employees. Employee contributes 12% of Basic (capped at ₹1,800/month).*",
    type: 'chips',
    key: 'pfEnabled',
    options: ['Yes, enable PF', 'No, skip PF'],
    default: 'Yes, enable PF',
  },
  {
    id: 9,
    stage: 3,
    stageLabel: 'Statutory Compliance',
    consultantMsg: "Do you want to enable **ESI (Employee State Insurance)**?\n\n💡 *ESI is mandatory for companies with 10+ employees. Applies only to employees with gross salary ≤ ₹21,000. Employee contributes 0.75% of gross.*",
    type: 'chips',
    key: 'esiEnabled',
    options: ['Yes, enable ESI', 'No, skip ESI'],
    default: 'Yes, enable ESI',
  },
  {
    id: 10,
    stage: 3,
    stageLabel: 'Statutory Compliance',
    consultantMsg: "Do you want to enable **Professional Tax (PT)**?\n\n💡 *PT is state-specific. I'll automatically apply the correct slab for your state.*",
    type: 'chips',
    key: 'ptEnabled',
    options: ['Yes, enable PT', 'No, skip PT'],
    default: 'Yes, enable PT',
  },
  {
    id: 11,
    stage: 3,
    stageLabel: 'Statutory Compliance',
    consultantMsg: "Do you want to enable **TDS (Tax Deducted at Source)**?\n\n💡 *TDS applies to employees earning above the income tax exemption limit. PayLeef calculates TDS automatically based on the employee's tax declaration.*",
    type: 'chips',
    key: 'tdsEnabled',
    options: ['Yes, enable TDS', 'No, skip TDS'],
    default: 'Yes, enable TDS',
  },

  // ── Stage 4: Leave Policy ──────────────────────────────────────────────
  {
    id: 12,
    stage: 4,
    stageLabel: 'Leave Policy',
    consultantMsg: "Now let's set your **Leave Policy**.\n\nHow many **working days per month** does your company follow?\n\n💡 *Most Indian companies use 26 days (excluding Sundays). This is used for LOP (Loss of Pay) calculation.*",
    type: 'chips',
    key: 'workingDays',
    options: ['24 days', '25 days', '26 days', '27 days', '30 days'],
    default: '26 days',
  },
  {
    id: 13,
    stage: 4,
    stageLabel: 'Leave Policy',
    consultantMsg: "How many **Casual Leaves (CL)** do employees get per year?\n\n💡 *Standard is 12 CL per year (1 per month). Casual leaves are for personal/emergency use.*",
    type: 'text',
    key: 'clDays',
    placeholder: 'e.g. 12',
    inputHint: 'Enter number of days (e.g. 12)',
  },
  {
    id: 14,
    stage: 4,
    stageLabel: 'Leave Policy',
    consultantMsg: "How many **Sick Leaves (SL)** do employees get per year?\n\n💡 *Standard is 12 SL per year. Sick leaves are for medical reasons.*",
    type: 'text',
    key: 'slDays',
    placeholder: 'e.g. 12',
    inputHint: 'Enter number of days (e.g. 12)',
  },
  {
    id: 15,
    stage: 4,
    stageLabel: 'Leave Policy',
    consultantMsg: "How many **Earned Leaves / Privilege Leaves (EL/PL)** do employees get per year?\n\n💡 *Standard is 15 EL per year. These are accumulated and can be encashed.*",
    type: 'text',
    key: 'elDays',
    placeholder: 'e.g. 15',
    inputHint: 'Enter number of days (e.g. 15)',
  },

  // ── Stage 5: Payslip Design ────────────────────────────────────────────
  {
    id: 16,
    stage: 5,
    stageLabel: 'Payslip Design',
    consultantMsg: "Almost done! Let's choose your **payslip template**.\n\nClick on a design below to preview it and select the one that fits your company style.",
    type: 'template-select',
    key: 'template',
    default: 'classic',
  },
  {
    id: 17,
    stage: 5,
    stageLabel: 'Payslip Design',
    consultantMsg: "Should payslip PDFs be **password-protected**?\n\n💡 *When enabled, each employee's payslip PDF is locked with their Employee ID as the password. This keeps salary information confidential.*",
    type: 'chips',
    key: 'pdfPassword',
    options: ['Yes, password-protect PDFs', 'No, open access'],
    default: 'Yes, password-protect PDFs',
  },
];

// ─── Stage definitions ─────────────────────────────────────────────────────
const STAGES = [
  { num: 1, label: 'Company Info' },
  { num: 2, label: 'Salary Structure' },
  { num: 3, label: 'Statutory' },
  { num: 4, label: 'Leave Policy' },
  { num: 5, label: 'Payslip Design' },
];

// ─── Build payroll config from collected answers ───────────────────────────
function buildConfig(answers) {
  const basicPct    = parseInt(answers.basicPct)   || 40;
  const hraPct      = parseInt(answers.hraPct)     || 40;

  const conveyanceVal = answers.conveyance === 'No Conveyance' ? 0
    : answers.conveyance === '₹2,000' ? 2000
    : answers.conveyance === '₹3,000' ? 3000
    : 1600;

  const medicalVal = answers.medical === 'No Medical' ? 0
    : answers.medical === '₹1,500' ? 1500
    : answers.medical === '₹2,000' ? 2000
    : 1250;

  const pfEnabled  = answers.pfEnabled  !== 'No, skip PF';
  const esiEnabled = answers.esiEnabled !== 'No, skip ESI';
  const ptEnabled  = answers.ptEnabled  !== 'No, skip PT';
  const tdsEnabled = answers.tdsEnabled !== 'No, skip TDS';

  const earnings = [
    { key: 'basic',      type: 'pct_of_gross', value: basicPct,  enabled: true, order: 1 },
    { key: 'hra',        type: 'pct_of_basic',  value: hraPct,   enabled: true, order: 2 },
    { key: 'conveyance', type: 'fixed',         value: conveyanceVal, enabled: conveyanceVal > 0, order: 4 },
    { key: 'medical',    type: 'fixed',         value: medicalVal, enabled: medicalVal > 0, order: 5 },
    { key: 'special',    type: 'remainder',     enabled: true,   order: 6 },
    { key: 'overtime',   type: 'manual',        enabled: true,   order: 7 },
    { key: 'bonus',      type: 'manual',        enabled: true,   order: 9 },
  ];

  const deductions = [
    { key: 'pf_employee',  type: 'pct_of_basic', value: 12, cap: 1800, enabled: pfEnabled },
    { key: 'esi_employee', type: 'pct_of_gross',  value: 0.75, threshold: 21000, threshold_type: 'max_gross', enabled: esiEnabled },
    { key: 'pt',           type: 'fixed',         value: 200, enabled: ptEnabled },
    { key: 'tds',          type: 'tds',           enabled: tdsEnabled },
    { key: 'lop',          type: 'lop',           enabled: true },
  ];

  return { earnings, deductions };
}

function buildLeavePolicy(answers) {
  const workingDays = parseInt(answers.workingDays) || 26;
  const clDays      = parseInt(answers.clDays)      || 12;
  const slDays      = parseInt(answers.slDays)      || 12;
  const elDays      = parseInt(answers.elDays)      || 15;
  return { working_days_per_month: workingDays, cl_days: clDays, sl_days: slDays, el_days: elDays };
}

function buildBranding(answers) {
  return {
    company_name: answers.companyName || '',
    template: answers.template || 'classic',
    pdf_password_enabled: answers.pdfPassword === 'Yes, password-protect PDFs',
  };
}

// ─── Format consultant message (bold + line breaks) ───────────────────────
function formatMsg(text) {
  const lines = text.split('\n');
  return lines.map((line, i) => {
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <span key={i}>
        {parts.map((part, j) =>
          j % 2 === 1 ? <strong key={j}>{part}</strong> : part
        )}
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
}

// ─── Config summary card ───────────────────────────────────────────────────
function ConfigSummary({ answers }) {
  const config = buildConfig(answers);
  const leave  = buildLeavePolicy(answers);
  const brand  = buildBranding(answers);

  const earningSummary = config.earnings
    .filter(e => e.enabled)
    .map(e => {
      if (e.type === 'pct_of_gross') return `Basic: ${e.value}% of Gross`;
      if (e.type === 'pct_of_basic') return `HRA: ${e.value}% of Basic`;
      if (e.type === 'fixed') return `${e.key === 'conveyance' ? 'Conveyance' : 'Medical'}: ₹${e.value}/month`;
      if (e.type === 'remainder') return 'Special Allowance: Remainder';
      return null;
    })
    .filter(Boolean);

  const deductionSummary = config.deductions
    .filter(d => d.enabled)
    .map(d => {
      if (d.key === 'pf_employee')  return `PF: 12% of Basic (max ₹1,800)`;
      if (d.key === 'esi_employee') return `ESI: 0.75% of Gross (≤₹21,000)`;
      if (d.key === 'pt')           return `Professional Tax: State slab`;
      if (d.key === 'tds')          return `TDS: Auto-calculated`;
      if (d.key === 'lop')          return `LOP: Auto-calculated`;
      return null;
    })
    .filter(Boolean);

  const row = (label, value) => (
    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-light)', fontSize: 13 }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{value}</span>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
      {/* Company */}
      <div style={{ background: 'var(--sidebar-bg)', borderRadius: 12, padding: '14px 16px', border: '1px solid var(--border-light)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--brand)', marginBottom: 8 }}>Company</p>
        {row('Name', brand.company_name)}
        {row('State', answers.state)}
        {row('Industry', answers.industry)}
        {row('Employees', answers.employeeCount)}
        {row('Payslip Template', brand.template.charAt(0).toUpperCase() + brand.template.slice(1))}
        {row('PDF Password', brand.pdf_password_enabled ? '✅ Enabled' : '❌ Disabled')}
      </div>

      {/* Earnings */}
      <div style={{ background: 'var(--sidebar-bg)', borderRadius: 12, padding: '14px 16px', border: '1px solid var(--border-light)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--brand)', marginBottom: 8 }}>Earnings</p>
        {earningSummary.map(s => row(s.split(':')[0], s.split(':').slice(1).join(':').trim()))}
      </div>

      {/* Deductions */}
      <div style={{ background: 'var(--sidebar-bg)', borderRadius: 12, padding: '14px 16px', border: '1px solid var(--border-light)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#DC2626', marginBottom: 8 }}>Deductions</p>
        {deductionSummary.map(s => row(s.split(':')[0], s.split(':').slice(1).join(':').trim()))}
      </div>

      {/* Leave */}
      <div style={{ background: 'var(--sidebar-bg)', borderRadius: 12, padding: '14px 16px', border: '1px solid var(--border-light)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7C3AED', marginBottom: 8 }}>Leave Policy</p>
        {row('Working Days/Month', `${leave.working_days_per_month} days`)}
        {row('Casual Leave/Year', `${leave.cl_days} days`)}
        {row('Sick Leave/Year', `${leave.sl_days} days`)}
        {row('Earned Leave/Year', `${leave.el_days} days`)}
      </div>
    </div>
  );
}

// ─── Template Preview Cards ───────────────────────────────────────────────
const TEMPLATES = [
  {
    key: 'classic',
    name: 'Classic',
    desc: 'Traditional table layout. Clean and formal — best for most Indian companies.',
    preview: (
      <div style={{ background: '#fff', borderRadius: 6, overflow: 'hidden', fontSize: 5.5, fontFamily: 'Arial, sans-serif', border: '1px solid #e5e7eb' }}>
        {/* Header */}
        <div style={{ background: '#1A7A4A', padding: '6px 8px', color: '#fff' }}>
          <div style={{ fontWeight: 800, fontSize: 7 }}>ACME TECHNOLOGIES PVT LTD</div>
          <div style={{ opacity: 0.8, fontSize: 5 }}>123, Anna Salai, Chennai – 600002</div>
          <div style={{ marginTop: 3, background: 'rgba(255,255,255,0.15)', display: 'inline-block', padding: '1px 4px', borderRadius: 2, fontSize: 5.5, fontWeight: 700 }}>
            PAYSLIP — APRIL 2025
          </div>
        </div>
        {/* Employee info row */}
        <div style={{ display: 'flex', gap: 4, padding: '4px 6px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
          {[['Employee', 'Ramesh Kumar'], ['Dept', 'Engineering'], ['ID', 'EMP001']].map(([l, v]) => (
            <div key={l} style={{ flex: 1 }}>
              <div style={{ color: '#6b7280', fontSize: 4.5 }}>{l}</div>
              <div style={{ fontWeight: 700, fontSize: 5.5 }}>{v}</div>
            </div>
          ))}
        </div>
        {/* Earnings/Deductions table */}
        <div style={{ display: 'flex', gap: 0 }}>
          <div style={{ flex: 1, padding: '3px 6px', borderRight: '1px solid #e5e7eb' }}>
            <div style={{ fontWeight: 800, color: '#1A7A4A', fontSize: 5, marginBottom: 2 }}>EARNINGS</div>
            {[['Basic Pay', '20,000'], ['HRA', '8,000'], ['Conveyance', '1,600'], ['Medical', '1,250'], ['Special Allow.', '4,150']].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0', borderBottom: '0.5px solid #f3f4f6' }}>
                <span>{l}</span><span style={{ fontWeight: 600 }}>₹{v}</span>
              </div>
            ))}
          </div>
          <div style={{ flex: 1, padding: '3px 6px' }}>
            <div style={{ fontWeight: 800, color: '#DC2626', fontSize: 5, marginBottom: 2 }}>DEDUCTIONS</div>
            {[['PF', '1,800'], ['ESI', '263'], ['Prof. Tax', '200'], ['TDS', '0']].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0', borderBottom: '0.5px solid #f3f4f6' }}>
                <span>{l}</span><span style={{ fontWeight: 600 }}>₹{v}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Net pay */}
        <div style={{ background: '#1A7A4A', color: '#fff', padding: '4px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 6 }}>NET PAY</span>
          <span style={{ fontWeight: 900, fontSize: 8 }}>₹32,987</span>
        </div>
      </div>
    ),
  },
  {
    key: 'modern',
    name: 'Modern',
    desc: 'Sleek two-column design with color accents. Looks premium and contemporary.',
    preview: (
      <div style={{ background: '#fff', borderRadius: 6, overflow: 'hidden', fontSize: 5.5, fontFamily: 'Arial, sans-serif', border: '1px solid #e5e7eb' }}>
        {/* Bold top bar */}
        <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1A7A4A 100%)', padding: '7px 8px', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 7.5, letterSpacing: '-0.3px' }}>ACME TECHNOLOGIES</div>
              <div style={{ fontSize: 4.5, opacity: 0.7, marginTop: 1 }}>Pay Statement · April 2025</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 4.5, opacity: 0.7 }}>Net Pay</div>
              <div style={{ fontWeight: 900, fontSize: 9, color: '#6ee7b7' }}>₹32,987</div>
            </div>
          </div>
        </div>
        {/* Employee card */}
        <div style={{ background: '#f0fdf4', padding: '4px 8px', borderBottom: '1px solid #d1fae5', display: 'flex', gap: 8 }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#1A7A4A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 6, flexShrink: 0 }}>RK</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 6 }}>Ramesh Kumar</div>
            <div style={{ color: '#6b7280', fontSize: 4.5 }}>Engineering · EMP001 · Chennai</div>
          </div>
        </div>
        {/* 2-col earnings */}
        <div style={{ display: 'flex', gap: 0, padding: '3px 0' }}>
          <div style={{ flex: 1, padding: '0 6px', borderRight: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 4, fontWeight: 800, color: '#1A7A4A', marginBottom: 2, letterSpacing: '0.04em' }}>EARNINGS</div>
            {[['Basic', '20,000'], ['HRA', '8,000'], ['Conveyance', '1,600'], ['Special', '5,400']].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5px 0' }}>
                <span style={{ color: '#6b7280' }}>{l}</span><span style={{ fontWeight: 700 }}>₹{v}</span>
              </div>
            ))}
          </div>
          <div style={{ flex: 1, padding: '0 6px' }}>
            <div style={{ fontSize: 4, fontWeight: 800, color: '#DC2626', marginBottom: 2, letterSpacing: '0.04em' }}>DEDUCTIONS</div>
            {[['PF', '1,800'], ['ESI', '263'], ['PT', '200'], ['TDS', '750']].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5px 0' }}>
                <span style={{ color: '#6b7280' }}>{l}</span><span style={{ fontWeight: 700 }}>₹{v}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Footer strip */}
        <div style={{ margin: '0 6px 4px', borderRadius: 4, background: '#f0fdf4', border: '1px solid #d1fae5', padding: '3px 6px', display: 'flex', justifyContent: 'space-between', fontSize: 5 }}>
          <span style={{ color: '#6b7280' }}>Gross: <strong style={{ color: '#111' }}>₹35,000</strong></span>
          <span style={{ color: '#6b7280' }}>Deductions: <strong style={{ color: '#DC2626' }}>₹3,013</strong></span>
          <span style={{ color: '#059669', fontWeight: 800 }}>Net: ₹31,987</span>
        </div>
      </div>
    ),
  },
  {
    key: 'minimal',
    name: 'Minimal',
    desc: 'Clean black & white with simple lines. Professional and distraction-free.',
    preview: (
      <div style={{ background: '#fff', borderRadius: 6, overflow: 'hidden', fontSize: 5.5, fontFamily: 'Arial, sans-serif', border: '1px solid #e5e7eb', padding: '6px 8px' }}>
        {/* Header text only */}
        <div style={{ borderBottom: '1.5px solid #111', paddingBottom: 4, marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 7, letterSpacing: '-0.2px' }}>ACME TECHNOLOGIES PVT LTD</div>
            <div style={{ color: '#6b7280', fontSize: 4.5 }}>PAYSLIP FOR APRIL 2025</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 4.5, color: '#6b7280' }}>Employee ID</div>
            <div style={{ fontWeight: 700, fontSize: 5.5 }}>EMP001</div>
          </div>
        </div>
        {/* Employee detail line */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 4, paddingBottom: 3, borderBottom: '0.5px solid #e5e7eb' }}>
          {[['Name', 'Ramesh Kumar'], ['Dept', 'Engineering'], ['DOJ', '01-Jan-2020']].map(([l, v]) => (
            <div key={l} style={{ flex: 1 }}>
              <div style={{ color: '#9ca3af', fontSize: 4 }}>{l}</div>
              <div style={{ fontWeight: 600, fontSize: 5 }}>{v}</div>
            </div>
          ))}
        </div>
        {/* Simple list */}
        {[['Basic Pay', '20,000', false], ['HRA', '8,000', false], ['Conveyance', '1,600', false], ['Special Allow.', '5,400', false], ['PF Deduction', '(1,800)', true], ['Professional Tax', '(200)', true]].map(([l, v, isDed]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0', borderBottom: '0.5px solid #f9fafb' }}>
            <span style={{ color: isDed ? '#DC2626' : '#374151' }}>{l}</span>
            <span style={{ fontWeight: 600, color: isDed ? '#DC2626' : '#111' }}>₹{v}</span>
          </div>
        ))}
        {/* Net Pay line */}
        <div style={{ borderTop: '1.5px solid #111', marginTop: 3, paddingTop: 3, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 900, fontSize: 6.5 }}>NET PAY</span>
          <span style={{ fontWeight: 900, fontSize: 6.5 }}>₹ 32,987</span>
        </div>
      </div>
    ),
  },
];

function TemplateSelectInput({ onSelect }) {
  const [hovered, setHovered] = useState(null);
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      {TEMPLATES.map(t => (
        <div
          key={t.key}
          onClick={() => onSelect(t.key)}
          onMouseEnter={() => setHovered(t.key)}
          onMouseLeave={() => setHovered(null)}
          style={{
            flex: 1, cursor: 'pointer', borderRadius: 12,
            border: `2px solid ${hovered === t.key ? 'var(--brand)' : 'var(--border)'}`,
            background: hovered === t.key ? 'var(--brand-light)' : 'var(--card-bg)',
            padding: '10px 10px 8px',
            transition: 'all 0.15s',
            boxShadow: hovered === t.key ? '0 0 0 3px rgba(26,122,74,0.12)' : 'none',
          }}
        >
          {/* Mini payslip preview */}
          <div style={{ marginBottom: 8 }}>
            {t.preview}
          </div>
          {/* Template label */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontWeight: 800, fontSize: 13,
              color: hovered === t.key ? 'var(--brand)' : 'var(--text-primary)',
            }}>
              {t.name}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>
              {t.desc}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────
export default function PayrollSetupPage() {
  const [step, setStep]         = useState(0);           // current question index
  const [messages, setMessages] = useState([]);          // chat history [{role, content}]
  const [answers, setAnswers]   = useState({});          // collected answers
  const [inputVal, setInputVal] = useState('');          // text input
  const [stateSearch, setStateSearch] = useState('');    // state filter
  const [thinking, setThinking] = useState(false);       // typing indicator
  const [done, setDone]         = useState(false);       // all questions answered
  const [applying, setApplying] = useState(false);       // API calls in progress
  const [applied, setApplied]   = useState(false);       // successfully applied
  const chatEndRef              = useRef(null);

  const token = localStorage.getItem('payslip_token');

  // Push first consultant message on mount
  useEffect(() => {
    setMessages([{ role: 'consultant', content: SCRIPT[0].consultantMsg }]);
  }, []);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const currentStep = SCRIPT[step] || null;

  // ── Simulate "thinking" then add consultant message ──────────────────
  const addConsultantMsg = (msg, delay = 600) => {
    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      setMessages(prev => [...prev, { role: 'consultant', content: msg }]);
    }, delay);
  };

  // ── Handle user answering a question ─────────────────────────────────
  const handleAnswer = (rawAnswer) => {
    const trimmed = rawAnswer.trim();
    if (!trimmed) return;

    const q = SCRIPT[step];

    // Add user message to chat
    setMessages(prev => [...prev, { role: 'user', content: trimmed }]);

    // Save answer
    const newAnswers = { ...answers, [q.key]: trimmed };
    setAnswers(newAnswers);

    // Clear inputs
    setInputVal('');
    setStateSearch('');

    const nextStep = step + 1;

    if (nextStep >= SCRIPT.length) {
      // All done — show summary
      setStep(nextStep);
      setDone(true);
      addConsultantMsg(
        "✅ Perfect! I've collected all the information I need.\n\nHere's your complete payroll configuration based on your answers. Please review it carefully before applying.",
        800
      );
    } else {
      // Advance to next question
      setStep(nextStep);
      const nextQ = SCRIPT[nextStep];

      // Build a short acknowledgement + next question
      const ack = getAcknowledgement(q.key, trimmed);
      addConsultantMsg(ack + '\n\n' + nextQ.consultantMsg, 700);
    }
  };

  // ── Quick acknowledgement lines ───────────────────────────────────────
  const getAcknowledgement = (key, val) => {
    const acks = {
      companyName:   `Great! Welcome, **${val}**! 🎉`,
      state:         `Got it — **${val}**. I'll apply the correct PT slab for your state.`,
      industry:      `Noted — **${val}** industry. I'll apply suitable compliance defaults.`,
      employeeCount: `Understood — **${val}** employees.`,
      basicPct:      `Basic pay set to **${val}** of gross. ✅`,
      hraPct:        `HRA set to **${val}** of basic. ✅`,
      conveyance:    val === 'No Conveyance' ? `Conveyance allowance skipped.` : `Conveyance set to **${val}**. ✅`,
      medical:       val === 'No Medical' ? `Medical allowance skipped.` : `Medical set to **${val}**. ✅`,
      pfEnabled:     val.startsWith('Yes') ? `✅ PF enabled.` : `⏭ PF skipped.`,
      esiEnabled:    val.startsWith('Yes') ? `✅ ESI enabled.` : `⏭ ESI skipped.`,
      ptEnabled:     val.startsWith('Yes') ? `✅ Professional Tax enabled.` : `⏭ PT skipped.`,
      tdsEnabled:    val.startsWith('Yes') ? `✅ TDS enabled.` : `⏭ TDS skipped.`,
      workingDays:   `Working days set to **${val}** per month.`,
      clDays:        `Casual Leave: **${val}** per year. ✅`,
      slDays:        `Sick Leave: **${val}** per year. ✅`,
      elDays:        `Earned Leave: **${val}** per year. ✅`,
      template:      `Payslip template set to **${val.charAt(0).toUpperCase() + val.slice(1)}**. ✅ Great choice!`,
      pdfPassword:   val.startsWith('Yes') ? `🔒 PDF password protection enabled.` : `🔓 PDFs will be open access.`,
    };
    return acks[key] || `Got it!`;
  };

  // ── Apply configuration via API ───────────────────────────────────────
  const applyConfiguration = async () => {
    setApplying(true);
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const config     = buildConfig(answers);
      const leave      = buildLeavePolicy(answers);
      const branding   = buildBranding(answers);

      // 1. Payroll config
      await axios.put('/api/payroll-config', config, { headers });

      // 2. Leave policy
      await axios.post('/api/leave-policy', leave, { headers });

      // 3. Branding
      await axios.put('/api/payroll-config/branding', branding, { headers });

      setApplied(true);
      toast.success('🎉 Payroll configuration applied successfully!');
      addConsultantMsg(
        "🎉 **Configuration Applied!**\n\nYour payroll is now set up and ready to use!\n\nHere's what to do next:\n1. Go to **Employees** and add your team\n2. Go to **Generate & Send** to run your first payroll\n\nWelcome to PayLeef! 🌿",
        400
      );
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.error || 'Failed to apply configuration. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  // ── Reset wizard ───────────────────────────────────────────────────────
  const resetWizard = () => {
    setStep(0);
    setMessages([{ role: 'consultant', content: SCRIPT[0].consultantMsg }]);
    setAnswers({});
    setInputVal('');
    setStateSearch('');
    setDone(false);
    setApplied(false);
  };

  // ── Current stage progress ────────────────────────────────────────────
  const currentStage = done ? 5 : (currentStep?.stage || 1);
  const stageProgress = done ? 100 : Math.round(((step) / SCRIPT.length) * 100);

  // ── State dropdown filter ─────────────────────────────────────────────
  const filteredStates = INDIAN_STATES.filter(s =>
    s.toLowerCase().includes(stateSearch.toLowerCase())
  );

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>

      {/* ── Page header ── */}
      <div style={{
        padding: '20px 28px 16px',
        borderBottom: '1px solid var(--border-light)',
        background: 'var(--card-bg)',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg, var(--brand) 0%, #10b981 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Sparkles size={18} color="white" />
              </div>
              <div>
                <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                  Payroll Setup Consultant
                </h1>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                  Answer simple questions — I'll configure your payroll automatically
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={resetWizard}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border-light)',
              background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer',
              fontSize: 12, fontWeight: 600,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <RotateCcw size={13} />
            Start Over
          </button>
        </div>

        {/* Stage progress bar */}
        <div style={{ marginTop: 14, display: 'flex', gap: 6, alignItems: 'center' }}>
          {STAGES.map((s, i) => {
            const isComplete = currentStage > s.num || (done && s.num === 5);
            const isCurrent  = currentStage === s.num && !done;
            return (
              <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
                    color: isComplete ? 'var(--brand)' : isCurrent ? 'var(--text-primary)' : 'var(--text-muted)',
                    marginBottom: 3,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}>
                    {isComplete && <CheckCircle2 size={10} />}
                    {s.label}
                  </div>
                  <div style={{ height: 3, borderRadius: 99, background: 'var(--border-light)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 99,
                      background: isComplete ? 'var(--brand)' : isCurrent ? 'var(--brand)' : 'transparent',
                      width: isComplete ? '100%' : isCurrent ? `${stageProgress}%` : '0%',
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
                {i < STAGES.length - 1 && (
                  <ChevronRight size={12} style={{ color: 'var(--border)', flexShrink: 0 }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Chat area ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
          <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {messages.map((msg, idx) => (
              <div key={idx} style={{
                display: 'flex',
                flexDirection: msg.role === 'consultant' ? 'row' : 'row-reverse',
                gap: 10, alignItems: 'flex-start',
              }}>
                {/* Avatar */}
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: msg.role === 'consultant'
                    ? 'linear-gradient(135deg, var(--brand) 0%, #10b981 100%)'
                    : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                }}>
                  {msg.role === 'consultant'
                    ? <Bot size={16} color="white" />
                    : <User size={16} color="white" />
                  }
                </div>

                {/* Bubble */}
                <div style={{
                  maxWidth: '75%',
                  padding: '10px 14px',
                  borderRadius: msg.role === 'consultant' ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
                  background: msg.role === 'consultant' ? 'var(--card-bg)' : 'var(--brand)',
                  color: msg.role === 'consultant' ? 'var(--text-primary)' : 'white',
                  border: msg.role === 'consultant' ? '1px solid var(--border-light)' : 'none',
                  fontSize: 13.5, lineHeight: 1.6,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                }}>
                  {formatMsg(msg.content)}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {thinking && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--brand) 0%, #10b981 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Bot size={16} color="white" />
                </div>
                <div style={{
                  padding: '12px 16px', borderRadius: '4px 14px 14px 14px',
                  background: 'var(--card-bg)', border: '1px solid var(--border-light)',
                  display: 'flex', gap: 5, alignItems: 'center',
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 7, height: 7, borderRadius: '50%', background: 'var(--brand)',
                      animation: `rpa-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}

            {/* Config summary (shown when done) */}
            {done && !thinking && (
              <div style={{ marginLeft: 42 }}>
                <ConfigSummary answers={answers} />
                {!applied && (
                  <button
                    onClick={applyConfiguration}
                    disabled={applying}
                    style={{
                      marginTop: 16, width: '100%',
                      padding: '14px 24px', borderRadius: 12, border: 'none',
                      background: applying ? '#9CA3AF' : 'linear-gradient(135deg, var(--brand) 0%, #10b981 100%)',
                      color: 'white', fontWeight: 700, fontSize: 15,
                      cursor: applying ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: applying ? 'none' : '0 4px 16px rgba(26,122,74,0.3)',
                      transition: 'all 0.2s',
                    }}
                  >
                    {applying
                      ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Applying Configuration...</>
                      : <><Sparkles size={18} /> Apply This Configuration</>
                    }
                  </button>
                )}

                {applied && (
                  <div style={{
                    marginTop: 16, padding: '16px 20px', borderRadius: 12,
                    background: '#ECFDF5', border: '1px solid #6EE7B7',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <CheckCircle2 size={20} color="#059669" />
                    <div>
                      <p style={{ fontWeight: 700, color: '#059669', fontSize: 14 }}>Configuration Applied Successfully!</p>
                      <p style={{ color: '#065F46', fontSize: 12, marginTop: 2 }}>
                        Your payroll is ready. Go to <strong>Employees</strong> to add your team, then <strong>Generate & Send</strong> to run payroll.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* ── Input area (hidden when done) ── */}
        {!done && !thinking && currentStep && (
          <div style={{
            borderTop: '1px solid var(--border-light)',
            background: 'var(--card-bg)',
            padding: '16px 28px',
            flexShrink: 0,
          }}>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>

              {/* Question counter */}
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, fontWeight: 600 }}>
                Question {step + 1} of {SCRIPT.length} · Stage {currentStep.stage}: {currentStep.stageLabel}
              </p>

              {/* Text input */}
              {currentStep.type === 'text' && (
                <div>
                  {currentStep.inputHint && (
                    <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 6, fontStyle: 'italic' }}>
                      💡 {currentStep.inputHint}
                    </p>
                  )}
                  <form onSubmit={e => { e.preventDefault(); handleAnswer(inputVal); }} style={{ display: 'flex', gap: 8 }}>
                    <input
                      autoFocus
                      type={currentStep.key === 'clDays' || currentStep.key === 'slDays' || currentStep.key === 'elDays' ? 'number' : 'text'}
                      min={currentStep.key === 'clDays' || currentStep.key === 'slDays' || currentStep.key === 'elDays' ? '0' : undefined}
                      max={currentStep.key === 'clDays' || currentStep.key === 'slDays' || currentStep.key === 'elDays' ? '365' : undefined}
                      value={inputVal}
                      onChange={e => setInputVal(e.target.value)}
                      placeholder={currentStep.placeholder}
                      style={{
                        flex: 1, padding: '10px 14px', borderRadius: 10,
                        border: '1.5px solid var(--border)',
                        background: 'var(--bg-main)', color: 'var(--text-primary)',
                        fontSize: 14, outline: 'none',
                      }}
                    />
                    <button
                      type="submit"
                      disabled={!inputVal.trim()}
                      style={{
                        padding: '10px 20px', borderRadius: 10, border: 'none',
                        background: inputVal.trim() ? 'var(--brand)' : '#D1D5DB',
                        color: 'white', fontWeight: 700, fontSize: 14,
                        cursor: inputVal.trim() ? 'pointer' : 'not-allowed',
                      }}
                    >
                      Next →
                    </button>
                  </form>
                </div>
              )}

              {/* Chips (multiple choice) */}
              {currentStep.type === 'chips' && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {currentStep.options.map(opt => (
                    <button
                      key={opt}
                      onClick={() => handleAnswer(opt)}
                      style={{
                        padding: '9px 16px', borderRadius: 24,
                        border: `1.5px solid ${opt === currentStep.default ? 'var(--brand)' : 'var(--border)'}`,
                        background: opt === currentStep.default ? 'var(--brand-light)' : 'var(--card-bg)',
                        color: opt === currentStep.default ? 'var(--brand)' : 'var(--text-primary)',
                        fontWeight: opt === currentStep.default ? 700 : 500,
                        fontSize: 13, cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'var(--brand-light)';
                        e.currentTarget.style.borderColor = 'var(--brand)';
                        e.currentTarget.style.color = 'var(--brand)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = opt === currentStep.default ? 'var(--brand-light)' : 'var(--card-bg)';
                        e.currentTarget.style.borderColor = opt === currentStep.default ? 'var(--brand)' : 'var(--border)';
                        e.currentTarget.style.color = opt === currentStep.default ? 'var(--brand)' : 'var(--text-primary)';
                      }}
                    >
                      {opt === currentStep.default ? '★ ' : ''}{opt}
                    </button>
                  ))}
                </div>
              )}

              {/* Template visual selector */}
              {currentStep.type === 'template-select' && (
                <TemplateSelectInput onSelect={val => handleAnswer(val)} />
              )}

              {/* State selector */}
              {currentStep.type === 'state-select' && (
                <div>
                  <input
                    autoFocus
                    value={stateSearch}
                    onChange={e => setStateSearch(e.target.value)}
                    placeholder="Search state..."
                    style={{
                      width: '100%', padding: '10px 14px', borderRadius: 10,
                      border: '1.5px solid var(--border)',
                      background: 'var(--bg-main)', color: 'var(--text-primary)',
                      fontSize: 14, outline: 'none', marginBottom: 10, boxSizing: 'border-box',
                    }}
                  />
                  <div style={{
                    display: 'flex', flexWrap: 'wrap', gap: 6,
                    maxHeight: 160, overflowY: 'auto',
                  }}>
                    {filteredStates.map(state => (
                      <button
                        key={state}
                        onClick={() => handleAnswer(state)}
                        style={{
                          padding: '7px 14px', borderRadius: 20,
                          border: '1.5px solid var(--border)',
                          background: 'var(--card-bg)', color: 'var(--text-primary)',
                          fontSize: 12.5, cursor: 'pointer', fontWeight: 500,
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'var(--brand-light)';
                          e.currentTarget.style.borderColor = 'var(--brand)';
                          e.currentTarget.style.color = 'var(--brand)';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'var(--card-bg)';
                          e.currentTarget.style.borderColor = 'var(--border)';
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }}
                      >
                        {state}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Bounce animation keyframes ── */}
      <style>{`
        @keyframes rpa-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
