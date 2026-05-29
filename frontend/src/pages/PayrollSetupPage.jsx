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

// ─── Reduced script — 9 mandatory questions only ──────────────────────────
const buildScript = (companyName) => [
  {
    id: 0, stage: 1, stageLabel: 'Company Info',
    consultantMsg: `Hi${companyName ? ` **${companyName}**` : ''}! 👋 I'm your **PayLeef Setup Helper**.\n\nI'll ask you **9 quick questions** to configure your payroll automatically. Let's go!\n\nFirst, which **state** is your company in?\n\n💡 *I use this to set the correct Professional Tax slab for your state.*`,
    type: 'state-select', key: 'state', options: INDIAN_STATES,
  },
  {
    id: 1, stage: 1, stageLabel: 'Company Info',
    consultantMsg: "How many **employees** do you have right now?\n\n💡 *If you have 10+ employees earning ≤ ₹21,000/month, ESI (medical insurance) is compulsory by law.*",
    type: 'chips', key: 'employeeCount',
    options: ['1–9', '10–19', '20–49', '50–99', '100–499', '500+'],
  },
  {
    id: 2, stage: 2, stageLabel: 'Salary Structure',
    consultantMsg: "What % of total salary should be **Basic Pay**?\n\n💡 *Most companies use 40%. PF is always calculated on basic pay.*",
    type: 'chips', key: 'basicPct',
    options: ['35%', '40%', '45%', '50%', '60%'], default: '40%',
  },
  {
    id: 3, stage: 3, stageLabel: 'Statutory',
    consultantMsg: "Do you want **PF (Provident Fund)** deducted from salary?\n\n💡 *Required if you have 20+ employees. Employee pays 12% of basic pay (max ₹1,800/month).*",
    type: 'chips', key: 'pfEnabled',
    options: ['Yes, deduct PF', 'No, skip PF'], default: 'Yes, deduct PF',
  },
  {
    id: 4, stage: 3, stageLabel: 'Statutory',
    consultantMsg: "Do you want **ESI** (Employee State Insurance) deducted?\n\n💡 *Required if you have 10+ employees earning ≤ ₹21,000. Employee pays 0.75% of gross salary.*",
    type: 'chips', key: 'esiEnabled',
    options: ['Yes, deduct ESI', 'No, skip ESI'], default: 'Yes, deduct ESI',
  },
  {
    id: 5, stage: 3, stageLabel: 'Statutory',
    consultantMsg: "Do you want **Professional Tax (PT)** deducted?\n\n💡 *I already know the exact PT slab for your state — I will apply it automatically.*",
    type: 'chips', key: 'ptEnabled',
    options: ['Yes, deduct PT', 'No, skip PT'], default: 'Yes, deduct PT',
  },
  {
    id: 6, stage: 3, stageLabel: 'Statutory',
    consultantMsg: "Do you want **TDS (Income Tax)** deducted from high earners?\n\n💡 *PayLeef calculates TDS automatically based on each employee's annual salary.*",
    type: 'chips', key: 'tdsEnabled',
    options: ['Yes, deduct TDS', 'No, skip TDS'], default: 'Yes, deduct TDS',
  },
  {
    id: 7, stage: 4, stageLabel: 'Payslip Design',
    consultantMsg: "Almost done! 🎉\n\nPick the **payslip design** you like.\nClick any design below to select it.",
    type: 'template-select', key: 'template', default: 'classic',
  },
  {
    id: 8, stage: 4, stageLabel: 'Payslip Design',
    consultantMsg: "Should we **lock payslip PDFs with a password**?\n\n💡 *If yes, each employee's payslip PDF will be locked — only they can open it using their Employee ID.*",
    type: 'chips', key: 'pdfPassword',
    options: ['Yes, lock with password', 'No, keep open'], default: 'Yes, lock with password',
  },
];

// ─── Stage definitions ─────────────────────────────────────────────────────
const STAGES = [
  { num: 1, label: 'Company' },
  { num: 2, label: 'Salary' },
  { num: 3, label: 'Statutory' },
  { num: 4, label: 'Design' },
];

// ─── localStorage progress key ─────────────────────────────────────────────
const STORAGE_KEY = 'payroll_setup_progress';

// ─── Build payroll config from collected answers ───────────────────────────
function buildConfig(answers) {
  const basicPct    = parseInt(answers.basicPct) || 40;
  const pfEnabled   = answers.pfEnabled  !== 'No, skip PF';
  const esiEnabled  = answers.esiEnabled !== 'No, skip ESI';
  const ptEnabled   = answers.ptEnabled  !== 'No, skip PT';
  const tdsEnabled  = answers.tdsEnabled !== 'No, skip TDS';

  const earnings = [
    { key: 'basic',      type: 'pct_of_gross', value: basicPct,  enabled: true, order: 1 },
    { key: 'hra',        type: 'pct_of_basic',  value: 40,       enabled: true, order: 2 },
    { key: 'conveyance', type: 'fixed',         value: 1600,     enabled: true, order: 4 },
    { key: 'medical',    type: 'fixed',         value: 1250,     enabled: true, order: 5 },
    { key: 'special',    type: 'remainder',     enabled: true,   order: 6 },
    { key: 'overtime',   type: 'manual',        enabled: true,   order: 7 },
    { key: 'bonus',      type: 'manual',        enabled: true,   order: 9 },
  ];

  const deductions = [
    { key: 'pf_employee',  type: 'pct_of_basic', value: 12,   cap: 1800, enabled: pfEnabled },
    { key: 'esi_employee', type: 'pct_of_gross',  value: 0.75, threshold: 21000, threshold_type: 'max_gross', enabled: esiEnabled },
    { key: 'pt',           type: 'fixed',         value: 200,  enabled: ptEnabled },
    { key: 'tds',          type: 'tds',           enabled: tdsEnabled },
    { key: 'lop',          type: 'lop',           enabled: true },
  ];

  return { earnings, deductions };
}

function buildLeavePolicy() {
  return { working_days_per_month: 26, cl_days: 12, sl_days: 12, el_days: 15 };
}

function buildBranding(answers, companyName) {
  return {
    company_name:        companyName || '',
    template:            answers.template || 'classic',
    pdf_password_enabled: answers.pdfPassword === 'Yes, lock with password',
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
function ConfigSummary({ answers, companyName }) {
  const config = buildConfig(answers);
  const leave  = buildLeavePolicy();
  const brand  = buildBranding(answers, companyName);

  const earningSummary = config.earnings
    .filter(e => e.enabled)
    .map(e => {
      if (e.type === 'pct_of_gross') return `Basic: ${e.value}% of Gross`;
      if (e.type === 'pct_of_basic') return `HRA: 40% of Basic`;
      if (e.type === 'fixed' && e.key === 'conveyance') return `Conveyance: ₹1,600/month`;
      if (e.type === 'fixed' && e.key === 'medical')    return `Medical: ₹1,250/month`;
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
      <div style={{ background: 'var(--sidebar-bg)', borderRadius: 12, padding: '14px 16px', border: '1px solid var(--border-light)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--brand)', marginBottom: 8 }}>Company Details</p>
        {brand.company_name && row('Company Name', brand.company_name)}
        {row('State', answers.state)}
        {row('Employees', answers.employeeCount)}
        {row('Payslip Template', brand.template.charAt(0).toUpperCase() + brand.template.slice(1))}
        {row('PDF Password Lock', brand.pdf_password_enabled ? '✅ Enabled' : '❌ Disabled')}
      </div>

      <div style={{ background: 'var(--sidebar-bg)', borderRadius: 12, padding: '14px 16px', border: '1px solid var(--border-light)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--brand)', marginBottom: 8 }}>Earnings</p>
        {earningSummary.map(s => row(s.split(':')[0], s.split(':').slice(1).join(':').trim()))}
      </div>

      <div style={{ background: 'var(--sidebar-bg)', borderRadius: 12, padding: '14px 16px', border: '1px solid var(--border-light)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#DC2626', marginBottom: 8 }}>Deductions</p>
        {deductionSummary.map(s => row(s.split(':')[0], s.split(':').slice(1).join(':').trim()))}
      </div>

      <div style={{ background: 'var(--sidebar-bg)', borderRadius: 12, padding: '14px 16px', border: '1px solid var(--border-light)' }}>
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7C3AED', marginBottom: 8 }}>Leave Policy (defaults)</p>
        {row('Working Days/Month', '26 days')}
        {row('Casual Leave/Year', '12 days')}
        {row('Sick Leave/Year', '12 days')}
        {row('Earned Leave/Year', '15 days')}
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>You can customise leave in <strong>Leave Policy</strong> settings.</p>
      </div>
    </div>
  );
}

// ─── Template Preview Cards ───────────────────────────────────────────────
const TEMPLATES = [
  {
    key: 'classic',
    name: 'Classic',
    desc: 'Traditional table layout. Clean and formal.',
    preview: (
      <div style={{ background: '#fff', borderRadius: 6, overflow: 'hidden', fontSize: 5.5, fontFamily: 'Arial, sans-serif', border: '1px solid #e5e7eb' }}>
        <div style={{ background: '#1A7A4A', padding: '6px 8px', color: '#fff' }}>
          <div style={{ fontWeight: 800, fontSize: 7 }}>ACME TECHNOLOGIES PVT LTD</div>
          <div style={{ opacity: 0.8, fontSize: 5 }}>123, Anna Salai, Chennai – 600002</div>
          <div style={{ marginTop: 3, background: 'rgba(255,255,255,0.15)', display: 'inline-block', padding: '1px 4px', borderRadius: 2, fontSize: 5.5, fontWeight: 700 }}>PAYSLIP — APRIL 2025</div>
        </div>
        <div style={{ display: 'flex', gap: 4, padding: '4px 6px', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
          {[['Employee', 'Ramesh Kumar'], ['Dept', 'Engineering'], ['ID', 'EMP001']].map(([l, v]) => (
            <div key={l} style={{ flex: 1 }}>
              <div style={{ color: '#6b7280', fontSize: 4.5 }}>{l}</div>
              <div style={{ fontWeight: 700, fontSize: 5.5 }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 0 }}>
          <div style={{ flex: 1, padding: '3px 6px', borderRight: '1px solid #e5e7eb' }}>
            <div style={{ fontWeight: 800, color: '#1A7A4A', fontSize: 5, marginBottom: 2 }}>EARNINGS</div>
            {[['Basic Pay', '20,000'], ['HRA', '8,000'], ['Special Allow.', '6,000']].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}><span>{l}</span><span style={{ fontWeight: 600 }}>₹{v}</span></div>
            ))}
          </div>
          <div style={{ flex: 1, padding: '3px 6px' }}>
            <div style={{ fontWeight: 800, color: '#DC2626', fontSize: 5, marginBottom: 2 }}>DEDUCTIONS</div>
            {[['PF', '1,800'], ['ESI', '263'], ['Prof. Tax', '200']].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}><span>{l}</span><span style={{ fontWeight: 600 }}>₹{v}</span></div>
            ))}
          </div>
        </div>
        <div style={{ background: '#1A7A4A', color: '#fff', padding: '4px 8px', display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700, fontSize: 6 }}>NET PAY</span>
          <span style={{ fontWeight: 900, fontSize: 8 }}>₹32,987</span>
        </div>
      </div>
    ),
  },
  {
    key: 'modern',
    name: 'Modern',
    desc: 'Sleek design with color accents. Looks premium.',
    preview: (
      <div style={{ background: '#fff', borderRadius: 6, overflow: 'hidden', fontSize: 5.5, fontFamily: 'Arial, sans-serif', border: '1px solid #e5e7eb' }}>
        <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1A7A4A 100%)', padding: '7px 8px', color: '#fff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div><div style={{ fontWeight: 900, fontSize: 7.5 }}>ACME TECHNOLOGIES</div><div style={{ fontSize: 4.5, opacity: 0.7 }}>Pay Statement · April 2025</div></div>
            <div style={{ textAlign: 'right' }}><div style={{ fontSize: 4.5, opacity: 0.7 }}>Net Pay</div><div style={{ fontWeight: 900, fontSize: 9, color: '#6ee7b7' }}>₹32,987</div></div>
          </div>
        </div>
        <div style={{ background: '#f0fdf4', padding: '4px 8px', borderBottom: '1px solid #d1fae5', display: 'flex', gap: 8 }}>
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#1A7A4A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 6, flexShrink: 0 }}>RK</div>
          <div><div style={{ fontWeight: 800, fontSize: 6 }}>Ramesh Kumar</div><div style={{ color: '#6b7280', fontSize: 4.5 }}>Engineering · EMP001</div></div>
        </div>
        <div style={{ display: 'flex', padding: '3px 0' }}>
          <div style={{ flex: 1, padding: '0 6px', borderRight: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 4, fontWeight: 800, color: '#1A7A4A', marginBottom: 2 }}>EARNINGS</div>
            {[['Basic', '20,000'], ['HRA', '8,000'], ['Special', '6,750']].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5px 0' }}><span style={{ color: '#6b7280' }}>{l}</span><span style={{ fontWeight: 700 }}>₹{v}</span></div>
            ))}
          </div>
          <div style={{ flex: 1, padding: '0 6px' }}>
            <div style={{ fontSize: 4, fontWeight: 800, color: '#DC2626', marginBottom: 2 }}>DEDUCTIONS</div>
            {[['PF', '1,800'], ['ESI', '263'], ['PT', '200']].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '1.5px 0' }}><span style={{ color: '#6b7280' }}>{l}</span><span style={{ fontWeight: 700 }}>₹{v}</span></div>
            ))}
          </div>
        </div>
        <div style={{ margin: '0 6px 4px', borderRadius: 4, background: '#f0fdf4', border: '1px solid #d1fae5', padding: '3px 6px', display: 'flex', justifyContent: 'space-between', fontSize: 5 }}>
          <span style={{ color: '#6b7280' }}>Gross: <strong style={{ color: '#111' }}>₹35,000</strong></span>
          <span style={{ color: '#059669', fontWeight: 800 }}>Net: ₹32,987</span>
        </div>
      </div>
    ),
  },
  {
    key: 'minimal',
    name: 'Minimal',
    desc: 'Clean black & white. Professional.',
    preview: (
      <div style={{ background: '#fff', borderRadius: 6, overflow: 'hidden', fontSize: 5.5, fontFamily: 'Arial, sans-serif', border: '1px solid #e5e7eb', padding: '6px 8px' }}>
        <div style={{ borderBottom: '1.5px solid #111', paddingBottom: 4, marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
          <div><div style={{ fontWeight: 900, fontSize: 7 }}>ACME TECHNOLOGIES PVT LTD</div><div style={{ color: '#6b7280', fontSize: 4.5 }}>PAYSLIP FOR APRIL 2025</div></div>
          <div style={{ textAlign: 'right' }}><div style={{ fontSize: 4.5, color: '#6b7280' }}>Employee ID</div><div style={{ fontWeight: 700, fontSize: 5.5 }}>EMP001</div></div>
        </div>
        {[['Basic Pay', '20,000', false], ['HRA', '8,000', false], ['Special Allow.', '6,750', false], ['PF Deduction', '(1,800)', true], ['Professional Tax', '(200)', true]].map(([l, v, isDed]) => (
          <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0', borderBottom: '0.5px solid #f9fafb' }}>
            <span style={{ color: isDed ? '#DC2626' : '#374151' }}>{l}</span>
            <span style={{ fontWeight: 600, color: isDed ? '#DC2626' : '#111' }}>₹{v}</span>
          </div>
        ))}
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
          <div style={{ marginBottom: 8 }}>{t.preview}</div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: hovered === t.key ? 'var(--brand)' : 'var(--text-primary)' }}>{t.name}</div>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>{t.desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────
export default function PayrollSetupPage() {
  const [step, setStep]         = useState(0);
  const [messages, setMessages] = useState([]);
  const [answers, setAnswers]   = useState({});
  const [inputVal, setInputVal] = useState('');
  const [stateSearch, setStateSearch] = useState('');
  const [thinking, setThinking] = useState(false);
  const [done, setDone]         = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied]   = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [initialized, setInitialized] = useState(false);
  const chatEndRef = useRef(null);

  const token = localStorage.getItem('payslip_token');

  // ── On mount: fetch company name + check for saved progress ──────────────
  useEffect(() => {
    const init = async () => {
      // 1. Fetch company name from profile
      let fetchedName = '';
      try {
        const res = await axios.get('/api/admin-profile/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        fetchedName = res.data?.admin?.company_name || '';
        setCompanyName(fetchedName);
      } catch { /* silent */ }

      const SCRIPT = buildScript(fetchedName);

      // 2. Check for saved progress
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const { step: savedStep, answers: savedAnswers, messages: savedMessages } = JSON.parse(saved);
          if (savedStep > 0 && savedStep < SCRIPT.length) {
            // Restore progress
            setStep(savedStep);
            setAnswers(savedAnswers || {});
            setMessages([
              ...(savedMessages || [{ role: 'consultant', content: SCRIPT[0].consultantMsg }]),
              {
                role: 'consultant',
                content: `👋 Welcome back! Picking up where you left off — **Question ${savedStep + 1} of ${SCRIPT.length}**.\n\n${SCRIPT[savedStep].consultantMsg}`,
              },
            ]);
            setInitialized(true);
            return;
          }
        }
      } catch { /* ignore bad saved data */ }

      // 3. Fresh start
      setMessages([{ role: 'consultant', content: SCRIPT[0].consultantMsg }]);
      setInitialized(true);
    };

    init();
  }, []); // eslint-disable-line

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const SCRIPT = buildScript(companyName);
  const currentStep = SCRIPT[step] || null;

  // ── Save progress to localStorage ────────────────────────────────────────
  const saveProgress = (currentStep, currentAnswers, currentMessages) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        step: currentStep,
        answers: currentAnswers,
        messages: currentMessages,
      }));
    } catch { /* ignore */ }
  };

  const clearProgress = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  };

  // ── Simulate "thinking" then add consultant message ──────────────────────
  const addConsultantMsg = (msg, delay = 600) => {
    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      setMessages(prev => [...prev, { role: 'consultant', content: msg }]);
    }, delay);
  };

  // ── Handle user answering a question ─────────────────────────────────────
  const handleAnswer = (rawAnswer) => {
    const trimmed = rawAnswer.trim();
    if (!trimmed) return;

    const q = SCRIPT[step];

    const userMsg = { role: 'user', content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);

    const newAnswers = { ...answers, [q.key]: trimmed };
    setAnswers(newAnswers);

    setInputVal('');
    setStateSearch('');

    const nextStep = step + 1;

    if (nextStep >= SCRIPT.length) {
      setStep(nextStep);
      setDone(true);
      clearProgress();
      addConsultantMsg(
        "✅ Perfect! I've collected everything I need.\n\nHere's your complete payroll configuration. Please review it, then click **Apply** to set it up.",
        800
      );
    } else {
      setStep(nextStep);
      const nextQ = SCRIPT[nextStep];
      const ack = getAcknowledgement(q.key, trimmed);
      const nextMessages = [...newMessages, { role: 'consultant', content: ack + '\n\n' + nextQ.consultantMsg }];
      addConsultantMsg(ack + '\n\n' + nextQ.consultantMsg, 700);
      // Save progress (save the messages that will appear after thinking)
      setTimeout(() => saveProgress(nextStep, newAnswers, nextMessages), 800);
    }
  };

  // ── Quick acknowledgement lines ───────────────────────────────────────────
  const getAcknowledgement = (key, val) => {
    const acks = {
      state:         `Got it — **${val}**. I'll apply the correct PT slab for your state.`,
      employeeCount: `Understood — **${val}** employees.`,
      basicPct:      `Basic pay set to **${val}** of gross. ✅`,
      pfEnabled:     val.startsWith('Yes') ? `✅ PF will be deducted.` : `⏭ PF skipped.`,
      esiEnabled:    val.startsWith('Yes') ? `✅ ESI will be deducted.` : `⏭ ESI skipped.`,
      ptEnabled:     val.startsWith('Yes') ? `✅ Professional Tax will be deducted.` : `⏭ PT skipped.`,
      tdsEnabled:    val.startsWith('Yes') ? `✅ TDS will be deducted.` : `⏭ TDS skipped.`,
      template:      `Payslip template set to **${val.charAt(0).toUpperCase() + val.slice(1)}**. ✅`,
      pdfPassword:   val.startsWith('Yes') ? `🔒 PDF password protection enabled.` : `🔓 PDFs will be open access.`,
    };
    return acks[key] || `Got it!`;
  };

  // ── Apply configuration via API ───────────────────────────────────────────
  const applyConfiguration = async () => {
    setApplying(true);
    const headers = { Authorization: `Bearer ${token}` };

    try {
      const config   = buildConfig(answers);
      const leave    = buildLeavePolicy();
      const branding = buildBranding(answers, companyName);

      await axios.put('/api/payroll-config', config, { headers });
      await axios.post('/api/leave-policy', leave, { headers });
      await axios.put('/api/payroll-config/branding', branding, { headers });

      setApplied(true);
      clearProgress();
      toast.success('🎉 Payroll configuration applied successfully!');
      addConsultantMsg(
        "🎉 **Configuration Applied!**\n\nYour payroll is now set up and ready to use!\n\n1. Go to **Employees** and add your team\n2. Go to **Generate & Send** to run your first payroll\n\nWelcome to PayLeef! 🌿",
        400
      );
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to apply configuration. Please try again.');
    } finally {
      setApplying(false);
    }
  };

  // ── Reset wizard ──────────────────────────────────────────────────────────
  const resetWizard = () => {
    clearProgress();
    const freshMessages = [{ role: 'consultant', content: SCRIPT[0].consultantMsg }];
    setStep(0);
    setMessages(freshMessages);
    setAnswers({});
    setInputVal('');
    setStateSearch('');
    setDone(false);
    setApplied(false);
  };

  // ── Stage progress ────────────────────────────────────────────────────────
  const currentStage = done ? 4 : (currentStep?.stage || 1);
  const stageProgress = done ? 100 : Math.round((step / SCRIPT.length) * 100);

  const filteredStates = INDIAN_STATES.filter(s =>
    s.toLowerCase().includes(stateSearch.toLowerCase())
  );

  if (!initialized) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-main)' }}>
        <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: 'var(--brand)' }} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>

      {/* ── Page header ── */}
      <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid var(--border-light)', background: 'var(--card-bg)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, var(--brand) 0%, #10b981 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Sparkles size={18} color="white" />
            </div>
            <div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>Payroll Setup Consultant</h1>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>
                9 quick questions — I'll configure your payroll automatically
              </p>
            </div>
          </div>

          <button
            onClick={resetWizard}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border-light)', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            <RotateCcw size={13} /> Start Over
          </button>
        </div>

        {/* Stage progress bar */}
        <div style={{ marginTop: 14, display: 'flex', gap: 6, alignItems: 'center' }}>
          {STAGES.map((s, i) => {
            const isComplete = currentStage > s.num || (done && s.num === 4);
            const isCurrent  = currentStage === s.num && !done;
            return (
              <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: isComplete ? 'var(--brand)' : isCurrent ? 'var(--text-primary)' : 'var(--text-muted)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {isComplete && <CheckCircle2 size={10} />}
                    {s.label}
                  </div>
                  <div style={{ height: 3, borderRadius: 99, background: 'var(--border-light)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', borderRadius: 99, background: isComplete ? 'var(--brand)' : isCurrent ? 'var(--brand)' : 'transparent', width: isComplete ? '100%' : isCurrent ? `${stageProgress}%` : '0%', transition: 'width 0.4s ease' }} />
                  </div>
                </div>
                {i < STAGES.length - 1 && <ChevronRight size={12} style={{ color: 'var(--border)', flexShrink: 0 }} />}
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
              <div key={idx} style={{ display: 'flex', flexDirection: msg.role === 'consultant' ? 'row' : 'row-reverse', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: msg.role === 'consultant' ? 'linear-gradient(135deg, var(--brand) 0%, #10b981 100%)' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
                  {msg.role === 'consultant' ? <Bot size={16} color="white" /> : <User size={16} color="white" />}
                </div>
                <div style={{ maxWidth: '75%', padding: '10px 14px', borderRadius: msg.role === 'consultant' ? '4px 14px 14px 14px' : '14px 4px 14px 14px', background: msg.role === 'consultant' ? 'var(--card-bg)' : 'var(--brand)', color: msg.role === 'consultant' ? 'var(--text-primary)' : 'white', border: msg.role === 'consultant' ? '1px solid var(--border-light)' : 'none', fontSize: 13.5, lineHeight: 1.6, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                  {formatMsg(msg.content)}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {thinking && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--brand) 0%, #10b981 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Bot size={16} color="white" />
                </div>
                <div style={{ padding: '12px 16px', borderRadius: '4px 14px 14px 14px', background: 'var(--card-bg)', border: '1px solid var(--border-light)', display: 'flex', gap: 5, alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--brand)', animation: `rpa-bounce 1.2s ease-in-out ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}

            {/* Config summary */}
            {done && !thinking && (
              <div style={{ marginLeft: 42 }}>
                <ConfigSummary answers={answers} companyName={companyName} />
                {!applied && (
                  <button
                    onClick={applyConfiguration}
                    disabled={applying}
                    style={{ marginTop: 16, width: '100%', padding: '14px 24px', borderRadius: 12, border: 'none', background: applying ? '#9CA3AF' : 'linear-gradient(135deg, var(--brand) 0%, #10b981 100%)', color: 'white', fontWeight: 700, fontSize: 15, cursor: applying ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: applying ? 'none' : '0 4px 16px rgba(26,122,74,0.3)', transition: 'all 0.2s' }}
                  >
                    {applying
                      ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Applying Configuration...</>
                      : <><Sparkles size={18} /> Apply This Configuration</>
                    }
                  </button>
                )}
                {applied && (
                  <div style={{ marginTop: 16, padding: '16px 20px', borderRadius: 12, background: '#ECFDF5', border: '1px solid #6EE7B7', display: 'flex', alignItems: 'center', gap: 10 }}>
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

        {/* ── Input area ── */}
        {!done && !thinking && currentStep && (
          <div style={{ borderTop: '1px solid var(--border-light)', background: 'var(--card-bg)', padding: '16px 28px', flexShrink: 0 }}>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, fontWeight: 600 }}>
                Question {step + 1} of {SCRIPT.length} · Stage {currentStep.stage}: {currentStep.stageLabel}
              </p>

              {/* Text input */}
              {currentStep.type === 'text' && (
                <div>
                  {currentStep.inputHint && (
                    <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 6, fontStyle: 'italic' }}>💡 {currentStep.inputHint}</p>
                  )}
                  <form onSubmit={e => { e.preventDefault(); handleAnswer(inputVal); }} style={{ display: 'flex', gap: 8 }}>
                    <input
                      autoFocus
                      type="text"
                      value={inputVal}
                      onChange={e => setInputVal(e.target.value)}
                      placeholder={currentStep.placeholder}
                      style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: 14, outline: 'none' }}
                    />
                    <button type="submit" disabled={!inputVal.trim()}
                      style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: inputVal.trim() ? 'var(--brand)' : '#D1D5DB', color: 'white', fontWeight: 700, fontSize: 14, cursor: inputVal.trim() ? 'pointer' : 'not-allowed' }}>
                      Next →
                    </button>
                  </form>
                </div>
              )}

              {/* Chips */}
              {currentStep.type === 'chips' && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {currentStep.options.map(opt => (
                    <button key={opt} onClick={() => handleAnswer(opt)}
                      style={{ padding: '9px 16px', borderRadius: 24, border: `1.5px solid ${opt === currentStep.default ? 'var(--brand)' : 'var(--border)'}`, background: opt === currentStep.default ? 'var(--brand-light)' : 'var(--card-bg)', color: opt === currentStep.default ? 'var(--brand)' : 'var(--text-primary)', fontWeight: opt === currentStep.default ? 700 : 500, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-light)'; e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.color = 'var(--brand)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = opt === currentStep.default ? 'var(--brand-light)' : 'var(--card-bg)'; e.currentTarget.style.borderColor = opt === currentStep.default ? 'var(--brand)' : 'var(--border)'; e.currentTarget.style.color = opt === currentStep.default ? 'var(--brand)' : 'var(--text-primary)'; }}
                    >
                      {opt === currentStep.default ? '★ ' : ''}{opt}
                    </button>
                  ))}
                </div>
              )}

              {/* Template selector */}
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
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1.5px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: 14, outline: 'none', marginBottom: 10, boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
                    {filteredStates.map(state => (
                      <button key={state} onClick={() => handleAnswer(state)}
                        style={{ padding: '7px 14px', borderRadius: 20, border: '1.5px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text-primary)', fontSize: 12.5, cursor: 'pointer', fontWeight: 500 }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-light)'; e.currentTarget.style.borderColor = 'var(--brand)'; e.currentTarget.style.color = 'var(--brand)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--card-bg)'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
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

      <style>{`
        @keyframes rpa-bounce { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-6px); opacity: 1; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
