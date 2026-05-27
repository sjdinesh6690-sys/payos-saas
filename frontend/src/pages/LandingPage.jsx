import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/* ─── Scroll-reveal hook ──────────────────────────────────────────────────── */
function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return [ref, visible];
}

/* ─── Logo mark ───────────────────────────────────────────────────────────── */
const LeafMark = ({ size = 20, leafColor = 'white', lineColor = '#1A7A4A' }) => (
  <svg viewBox="0 0 20 24" fill="none" style={{ width: size, height: size }}>
    <path d="M10,1 C16,1 19,7 18,13 C17,19 14,22 10,23 C6,22 3,19 2,13 C1,7 4,1 10,1 Z" fill={leafColor} />
    <line x1="10" y1="2" x2="10" y2="22" stroke={lineColor} strokeWidth="1.7" strokeLinecap="round" />
    <line x1="4" y1="7" x2="16" y2="7" stroke={lineColor} strokeWidth="1.7" strokeLinecap="round" />
    <line x1="4" y1="11" x2="16" y2="11" stroke={lineColor} strokeWidth="1.7" strokeLinecap="round" />
    <line x1="4" y1="11" x2="14" y2="20" stroke={lineColor} strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

/* ─── Payslip card mockup (hero) ──────────────────────────────────────────── */
function PayslipCard({ style }) {
  return (
    <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 24px 80px rgba(0,0,0,0.18)', padding: '22px 24px', width: 300, ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 2 }}>PAYSLIP — MAY 2026</div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>Arjun Sharma</div>
          <div style={{ fontSize: 11, color: '#64748B' }}>Senior Engineer · EMP-001</div>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 16 }}>👤</span>
        </div>
      </div>
      <div style={{ background: '#F8FAFC', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
        {[{ l: 'Basic Salary', v: '₹45,000' }, { l: 'HRA', v: '₹18,000' }, { l: 'Special Allowance', v: '₹12,500' }].map(r => (
          <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: '#64748B' }}>{r.l}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#0F172A' }}>{r.v}</span>
          </div>
        ))}
        <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 8, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>Net Pay</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#1A7A4A' }}>₹70,200</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ flex: 1, background: '#DCFCE7', borderRadius: 8, padding: '7px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#166534', fontWeight: 600 }}>STATUS</div>
          <div style={{ fontSize: 11, color: '#15803D', fontWeight: 700 }}>✓ Sent</div>
        </div>
        <div style={{ flex: 1, background: '#EFF6FF', borderRadius: 8, padding: '7px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#1D4ED8', fontWeight: 600 }}>PDF</div>
          <div style={{ fontSize: 11, color: '#2563EB', fontWeight: 700 }}>⬇ Ready</div>
        </div>
        <div style={{ flex: 1, background: '#F5F3FF', borderRadius: 8, padding: '7px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: '#6D28D9', fontWeight: 600 }}>AI</div>
          <div style={{ fontSize: 11, color: '#7C3AED', fontWeight: 700 }}>✓ Clean</div>
        </div>
      </div>
    </div>
  );
}

function FloatBadge({ icon, text, sub, style }) {
  return (
    <div style={{ position: 'absolute', background: 'white', borderRadius: 14, padding: '10px 16px', boxShadow: '0 12px 40px rgba(0,0,0,0.14)', display: 'flex', alignItems: 'center', gap: 10, ...style }}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>{text}</div>
        <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

/* ─── Bento feature card ──────────────────────────────────────────────────── */
function BentoCard({ icon, title, desc, bg = '#F0FDF4', span = 1, tall = false, children }) {
  const [ref, vis] = useReveal();
  return (
    <div ref={ref} style={{
      gridColumn: `span ${span}`, background: 'white', border: '1px solid #E2E8F0',
      borderRadius: 20, padding: '28px 28px 24px', minHeight: tall ? 320 : 220,
      overflow: 'hidden', position: 'relative',
      opacity: vis ? 1 : 0,
      transform: vis ? 'translateY(0)' : 'translateY(24px)',
      transition: 'opacity 0.5s ease, transform 0.5s ease',
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 16 }}>{icon}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13.5, color: '#64748B', lineHeight: 1.6, marginBottom: 16 }}>{desc}</div>
      {children}
    </div>
  );
}

function StepRow({ num, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#15803D', flexShrink: 0, marginTop: 1 }}>{num}</div>
      <div style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.55 }}>{text}</div>
    </div>
  );
}

function PricingCard({ plan, price, period, features, cta, highlight, navigate }) {
  return (
    <div style={{ border: highlight ? '2px solid #1A7A4A' : '1px solid #E2E8F0', borderRadius: 20, padding: '32px 28px', background: highlight ? '#F0FDF4' : 'white', position: 'relative' }}>
      {highlight && (
        <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: '#1A7A4A', color: 'white', fontSize: 11, fontWeight: 700, padding: '4px 16px', borderRadius: 20 }}>MOST POPULAR</div>
      )}
      <div style={{ fontSize: 13, fontWeight: 600, color: '#64748B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{plan}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
        <span style={{ fontSize: 38, fontWeight: 800, color: '#0F172A' }}>{price}</span>
        <span style={{ fontSize: 13, color: '#94A3B8' }}>{period}</span>
      </div>
      <div style={{ marginBottom: 24, borderBottom: '1px solid #E2E8F0', paddingBottom: 20 }} />
      <div style={{ marginBottom: 28 }}>
        {features.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg viewBox="0 0 12 12" fill="none" style={{ width: 8, height: 8 }}><path d="M2 6L5 9L10 3" stroke="#16A34A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <span style={{ fontSize: 13.5, color: '#374151' }}>{f}</span>
          </div>
        ))}
      </div>
      <button onClick={() => navigate('/register')} style={{ width: '100%', padding: '13px 0', borderRadius: 12, cursor: 'pointer', background: highlight ? '#1A7A4A' : 'transparent', border: highlight ? 'none' : '1.5px solid #1A7A4A', color: highlight ? 'white' : '#1A7A4A', fontSize: 14, fontWeight: 700 }}>{cta}</button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   INTERACTIVE WALKTHROUGH SCREENS
   Each screen is a realistic mockup of that step in PayLeef
───────────────────────────────────────────────────────────────────────────── */

function ScreenAddEmployee() {
  return (
    <div style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: 10 }}>Add New Employee</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { label: 'Employee Name', value: 'Priya Nair', focus: true },
          { label: 'Employee ID', value: 'EMP-024' },
          { label: 'Designation', value: 'Marketing Manager' },
          { label: 'Department', value: 'Marketing' },
          { label: 'Monthly CTC', value: '₹85,000' },
          { label: 'Join Date', value: '01 May 2026' },
        ].map(f => (
          <div key={f.label}>
            <div style={{ fontSize: 9, fontWeight: 600, color: '#64748B', marginBottom: 3, textTransform: 'uppercase' }}>{f.label}</div>
            <div style={{ fontSize: 11, padding: '6px 10px', borderRadius: 6, background: f.focus ? '#F0FDF4' : '#F8FAFC', border: f.focus ? '1.5px solid #1A7A4A' : '1px solid #E2E8F0', color: '#0F172A', fontWeight: f.focus ? 600 : 400 }}>{f.value}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, padding: '8px', textAlign: 'center', borderRadius: 8, border: '1px solid #E2E8F0', fontSize: 11, color: '#64748B', cursor: 'pointer' }}>Cancel</div>
        <div style={{ flex: 2, padding: '8px', textAlign: 'center', borderRadius: 8, background: '#1A7A4A', color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>✓ Save Employee</div>
      </div>
    </div>
  );
}

function ScreenUploadSalary() {
  return (
    <div style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: 10 }}>Upload Salary Data — May 2026</div>
      <div style={{ border: '2px dashed #CBD5E1', borderRadius: 12, padding: '16px', textAlign: 'center', background: '#F8FAFC' }}>
        <div style={{ fontSize: 24, marginBottom: 6 }}>📊</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>Drop your Excel or CSV here</div>
        <div style={{ fontSize: 9, color: '#94A3B8' }}>Supports .xlsx · .csv · any column order</div>
        <div style={{ marginTop: 10, display: 'inline-block', padding: '5px 14px', borderRadius: 6, background: '#1A7A4A', color: 'white', fontSize: 10, fontWeight: 700 }}>Browse File</div>
      </div>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#64748B' }}>Preview — 5 of 24 employees</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {[
          { name: 'Arjun Sharma', dept: 'Engineering', sal: '₹70,200', ok: true },
          { name: 'Priya Nair', dept: 'Marketing', sal: '₹52,400', ok: true },
          { name: 'Karthik M', dept: 'Finance', sal: '₹88,000', ok: true },
          { name: 'Divya R', dept: 'HR', sal: '₹45,000', ok: true },
          { name: 'Suresh K', dept: 'Ops', sal: '₹38,500', warn: true },
        ].map(r => (
          <div key={r.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 8px', background: r.warn ? '#FFFBEB' : '#F8FAFC', borderRadius: 6, border: r.warn ? '1px solid #FCD34D' : '1px solid #F1F5F9' }}>
            <span style={{ fontSize: 10, color: '#0F172A', fontWeight: 500 }}>{r.name}</span>
            <span style={{ fontSize: 9, color: '#94A3B8' }}>{r.dept}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: r.warn ? '#B45309' : '#15803D' }}>{r.sal} {r.warn ? '⚠' : '✓'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreenAiScan() {
  return (
    <div style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #F1F5F9', paddingBottom: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🤖</div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>AI Payroll Review</div>
        <div style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, color: '#15803D', background: '#DCFCE7', padding: '3px 8px', borderRadius: 10 }}>SCAN COMPLETE</div>
      </div>
      <div style={{ background: '#F0FDF4', borderRadius: 10, padding: 12, border: '1px solid #BBF7D0' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#166534', marginBottom: 4 }}>✓ 23 employees — All clear</div>
        <div style={{ fontSize: 9, color: '#15803D' }}>No anomalies detected in salary, PF, or TDS</div>
      </div>
      <div style={{ background: '#FFFBEB', borderRadius: 10, padding: 12, border: '1px solid #FCD34D' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#92400E', marginBottom: 4 }}>⚠ 1 flag — Suresh K</div>
        <div style={{ fontSize: 9, color: '#B45309' }}>Salary 32% lower than last month. LOP deduction may be missing.</div>
        <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
          <div style={{ flex: 1, textAlign: 'center', padding: '4px', borderRadius: 6, border: '1px solid #FCD34D', fontSize: 9, color: '#B45309', cursor: 'pointer' }}>Fix it</div>
          <div style={{ flex: 1, textAlign: 'center', padding: '4px', borderRadius: 6, background: '#FCD34D', fontSize: 9, fontWeight: 700, color: '#78350F', cursor: 'pointer' }}>Looks correct, keep</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { label: 'Total Gross', val: '₹16.2L' },
          { label: 'Total PF', val: '₹1.26L' },
          { label: 'Total TDS', val: '₹48,200' },
        ].map(s => (
          <div key={s.label} style={{ background: '#F8FAFC', borderRadius: 8, padding: 8, textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#64748B', marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#0F172A' }}>{s.val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ScreenGenerateSend() {
  return (
    <div style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A', borderBottom: '1px solid #F1F5F9', paddingBottom: 10 }}>Generate & Send — May 2026</div>
      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 1, background: '#F0FDF4', borderRadius: 10, padding: 10, border: '1px solid #BBF7D0', textAlign: 'center' }}>
          <div style={{ fontSize: 20, marginBottom: 2 }}>24</div>
          <div style={{ fontSize: 9, color: '#15803D', fontWeight: 600 }}>Payslips ready</div>
        </div>
        <div style={{ flex: 1, background: '#EFF6FF', borderRadius: 10, padding: 10, border: '1px solid #BFDBFE', textAlign: 'center' }}>
          <div style={{ fontSize: 20, marginBottom: 2 }}>24</div>
          <div style={{ fontSize: 9, color: '#1D4ED8', fontWeight: 600 }}>Emails queued</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {[
          { name: 'Arjun Sharma', email: 'arjun@co...', status: 'Sent ✓', color: '#15803D', bg: '#F0FDF4' },
          { name: 'Priya Nair', email: 'priya@co...', status: 'Sent ✓', color: '#15803D', bg: '#F0FDF4' },
          { name: 'Karthik M', email: 'karthik@c...', status: 'Sending…', color: '#2563EB', bg: '#EFF6FF' },
          { name: 'Divya R', email: 'divya@co...', status: 'Queued', color: '#94A3B8', bg: '#F8FAFC' },
        ].map(r => (
          <div key={r.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderRadius: 8, background: r.bg }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#0F172A' }}>{r.name}</div>
              <div style={{ fontSize: 9, color: '#94A3B8' }}>{r.email}</div>
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: r.color }}>{r.status}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 'auto', padding: '10px', background: 'linear-gradient(135deg,#1A7A4A,#15653E)', borderRadius: 10, textAlign: 'center', color: 'white', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
        🚀 Generate & Send All 24 Payslips
      </div>
    </div>
  );
}

function ScreenEmployeePortal() {
  return (
    <div style={{ padding: 20, height: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #F1F5F9', paddingBottom: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>👤</div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#0F172A' }}>Arjun Sharma</div>
          <div style={{ fontSize: 9, color: '#94A3B8' }}>Employee Portal · EMP-001</div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, color: '#7C3AED', background: '#F5F3FF', padding: '3px 8px', borderRadius: 10 }}>AI Chat ✨</div>
      </div>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#64748B' }}>My Payslips</div>
      {[
        { month: 'May 2026', net: '₹70,200', status: 'New ✓' },
        { month: 'Apr 2026', net: '₹70,200', status: 'Downloaded' },
        { month: 'Mar 2026', net: '₹68,500', status: 'Downloaded' },
      ].map(r => (
        <div key={r.month} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', borderRadius: 8, border: '1px solid #F1F5F9', background: '#FAFAFA' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#0F172A' }}>{r.month}</div>
            <div style={{ fontSize: 9, color: '#64748B' }}>Net Pay: {r.net}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{ fontSize: 9, color: '#15803D', fontWeight: 600 }}>{r.status}</div>
            <div style={{ fontSize: 9, padding: '3px 8px', borderRadius: 6, background: '#EFF6FF', color: '#2563EB', fontWeight: 600, cursor: 'pointer' }}>⬇ PDF</div>
          </div>
        </div>
      ))}
      <div style={{ background: '#F5F3FF', borderRadius: 10, padding: 10, border: '1px solid #E9D5FF' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color: '#7C3AED', marginBottom: 4 }}>✨ Ask AI about your pay</div>
        <div style={{ fontSize: 9, color: '#6D28D9', fontStyle: 'italic' }}>"Why is my TDS different this month?"</div>
        <div style={{ marginTop: 6, fontSize: 9, color: '#7C3AED', background: 'white', borderRadius: 6, padding: '5px 8px', border: '1px solid #DDD6FE' }}>
          Your TDS increased because your projected annual income crossed ₹5L this quarter…
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   INTERACTIVE WALKTHROUGH COMPONENT
───────────────────────────────────────────────────────────────────────────── */
const WALK_STEPS = [
  { id: 0, label: '1. Add Employees', icon: '👥', title: 'Set up your team', desc: 'Add employee details, designation, salary, and joining date in seconds.', screen: <ScreenAddEmployee /> },
  { id: 1, label: '2. Upload Salaries', icon: '📊', title: 'Upload any format', desc: 'Drop your Excel or CSV. Smart import maps columns automatically — even messy files.', screen: <ScreenUploadSalary /> },
  { id: 2, label: '3. AI Review', icon: '🤖', title: 'AI catches every error', desc: 'Before anything goes out, AI scans all numbers and flags anything unusual.', screen: <ScreenAiScan /> },
  { id: 3, label: '4. Generate & Send', icon: '🚀', title: 'One click — done', desc: 'All payslips generated as PDF and emailed directly to employees in one go.', screen: <ScreenGenerateSend /> },
  { id: 4, label: '5. Employee Portal', icon: '🔐', title: 'Employees self-serve', desc: 'Every employee gets their own login to view, download, and ask AI questions about their pay.', screen: <ScreenEmployeePortal /> },
];

function InteractiveWalkthrough() {
  const [active, setActive] = useState(0);
  const [animating, setAnimating] = useState(false);
  const timerRef = useRef(null);
  const [ref, vis] = useReveal();

  const goTo = (idx) => {
    if (idx === active) return;
    setAnimating(true);
    setTimeout(() => {
      setActive(idx);
      setAnimating(false);
    }, 200);
  };

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setActive(prev => {
        const next = (prev + 1) % WALK_STEPS.length;
        setAnimating(true);
        setTimeout(() => setAnimating(false), 200);
        return next;
      });
    }, 4000);
    return () => clearInterval(timerRef.current);
  }, []);

  const resetTimer = (idx) => {
    clearInterval(timerRef.current);
    goTo(idx);
    timerRef.current = setInterval(() => {
      setActive(prev => {
        const next = (prev + 1) % WALK_STEPS.length;
        setAnimating(true);
        setTimeout(() => setAnimating(false), 200);
        return next;
      });
    }, 4000);
  };

  const step = WALK_STEPS[active];
  const G = '#1A7A4A';

  return (
    <div ref={ref} style={{ opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(30px)', transition: 'all 0.6s ease' }}>

      {/* Step tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 36 }}>
        {WALK_STEPS.map(s => (
          <button key={s.id} onClick={() => resetTimer(s.id)} style={{
            display: 'flex', alignItems: 'center', gap: 7,
            padding: '8px 16px', borderRadius: 24, cursor: 'pointer',
            border: active === s.id ? 'none' : '1.5px solid #E2E8F0',
            background: active === s.id ? G : 'white',
            color: active === s.id ? 'white' : '#64748B',
            fontSize: 12, fontWeight: active === s.id ? 700 : 500,
            transition: 'all 0.25s ease',
          }}>
            <span>{s.icon}</span> {s.label}
          </button>
        ))}
      </div>

      {/* Main demo area */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 40, alignItems: 'center' }}>

        {/* Left — description */}
        <div style={{ opacity: animating ? 0 : 1, transform: animating ? 'translateY(8px)' : 'translateY(0)', transition: 'all 0.2s ease' }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 20 }}>{step.icon}</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', lineHeight: 1.2, marginBottom: 14, letterSpacing: '-0.02em' }}>{step.title}</div>
          <p style={{ fontSize: 15, color: '#64748B', lineHeight: 1.7, marginBottom: 28 }}>{step.desc}</p>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {WALK_STEPS.map(s => (
              <button key={s.id} onClick={() => resetTimer(s.id)} style={{
                width: active === s.id ? 28 : 8,
                height: 8, borderRadius: 4, border: 'none', cursor: 'pointer',
                background: active === s.id ? G : '#E2E8F0',
                transition: 'all 0.3s ease',
              }} />
            ))}
          </div>
        </div>

        {/* Right — screen mockup */}
        <div style={{
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: 20,
          overflow: 'hidden',
          boxShadow: '0 24px 60px rgba(0,0,0,0.1)',
          position: 'relative',
        }}>
          {/* Browser chrome bar */}
          <div style={{ background: '#F1F5F9', borderBottom: '1px solid #E2E8F0', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF5F57' }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFBD2E' }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#28C840' }} />
            <div style={{ flex: 1, height: 18, background: 'white', borderRadius: 4, marginLeft: 6, display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
              <span style={{ fontSize: 9, color: '#94A3B8' }}>app.payleef.in / {step.label.toLowerCase().replace(/^\d\. /, '').replace(/ /g, '-')}</span>
            </div>
          </div>
          {/* App shell */}
          <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', minHeight: 320 }}>
            {/* Mini sidebar */}
            <div style={{ background: '#0F172A', padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <LeafMark size={20} />
              </div>
              {[
                { icon: '📊', label: 'Dashboard', id: -1 },
                { icon: '👥', label: 'Employees', id: 0 },
                { icon: '📤', label: 'Upload', id: 1 },
                { icon: '🤖', label: 'AI Review', id: 2 },
                { icon: '🚀', label: 'Generate', id: 3 },
                { icon: '🔐', label: 'Portal', id: 4 },
              ].map(m => (
                <div key={m.label} style={{
                  padding: '6px 4px', borderRadius: 8, textAlign: 'center', cursor: 'pointer',
                  background: m.id === active ? 'rgba(26,122,74,0.3)' : 'transparent',
                  border: m.id === active ? '1px solid rgba(74,222,128,0.3)' : '1px solid transparent',
                }}>
                  <div style={{ fontSize: 13 }}>{m.icon}</div>
                  <div style={{ fontSize: 7, color: m.id === active ? '#4ADE80' : 'rgba(255,255,255,0.35)', fontWeight: m.id === active ? 700 : 400, marginTop: 2 }}>{m.label}</div>
                </div>
              ))}
            </div>
            {/* Screen content */}
            <div style={{ opacity: animating ? 0 : 1, transition: 'opacity 0.2s ease', overflow: 'auto' }}>
              {step.screen}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const G = '#1A7A4A';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── Industries marquee items ─────────────────────────────────────────── */
  const marqueeItems = [
    { icon: '🏭', label: 'Manufacturing' },
    { icon: '🏥', label: 'Healthcare & Clinics' },
    { icon: '🏗️', label: 'Construction' },
    { icon: '🛒', label: 'Retail & FMCG' },
    { icon: '💼', label: 'IT Services' },
    { icon: '🏫', label: 'Schools & Colleges' },
    { icon: '🚚', label: 'Logistics & Warehousing' },
    { icon: '🏨', label: 'Hospitality & Hotels' },
    { icon: '⚙️', label: 'Engineering Firms' },
    { icon: '📦', label: 'E-commerce' },
    { icon: '🧪', label: 'Pharma & Labs' },
    { icon: '🏦', label: 'Finance & NBFC' },
  ];

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: '#fff', color: '#0F172A', overflowX: 'hidden' }}>

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(255,255,255,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(0,0,0,0.07)' : 'none',
        transition: 'all 0.3s ease',
        padding: '0 max(24px, calc((100vw - 1200px) / 2))',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(26,122,74,0.3)' }}>
              <LeafMark size={20} />
            </div>
            <div style={{ lineHeight: 1 }}>
              <span style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.04em' }}>Pay</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: G, letterSpacing: '-0.04em' }}>Leef</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="hide-mobile">
            {[['Features', '#features'], ['How it works', '#how-it-works'], ['Pricing', '#pricing'], ['For HR Teams', '#for-hr-teams']].map(([l, h]) => (
              <a key={l} href={h} style={{ fontSize: 14, color: '#374151', textDecoration: 'none', fontWeight: 500 }}
                onMouseOver={e => e.target.style.color = G} onMouseOut={e => e.target.style.color = '#374151'}>{l}</a>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={() => navigate('/login')} style={{ fontSize: 14, fontWeight: 600, color: '#374151', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 16px' }}>Sign in</button>
            <button onClick={() => navigate('/register')} style={{ fontSize: 14, fontWeight: 700, color: 'white', background: G, border: 'none', borderRadius: 10, cursor: 'pointer', padding: '9px 20px', boxShadow: '0 2px 12px rgba(26,122,74,0.3)' }}>Start free trial</button>
          </div>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #0A1628 0%, #0D2137 40%, #0A2E1A 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center', padding: '120px 24px 80px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.07, backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div style={{ position: 'absolute', top: '15%', left: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,122,74,0.25) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '8%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.15) 0%, transparent 70%)', filter: 'blur(40px)' }} />

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(26,122,74,0.2)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 20, padding: '6px 16px', marginBottom: 28 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 8px #4ADE80' }} />
          <span style={{ fontSize: 13, color: '#4ADE80', fontWeight: 600 }}>Built for Indian businesses · GST & PF Ready</span>
        </div>

        <h1 style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.03em', margin: '0 0 24px', maxWidth: 800 }}>
          <span style={{ color: 'white' }}>Payroll that</span><br />
          <span style={{ background: 'linear-gradient(135deg, #4ADE80 0%, #22C55E 50%, #86EFAC 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>runs itself.</span>
        </h1>

        <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'rgba(255,255,255,0.65)', maxWidth: 560, lineHeight: 1.7, margin: '0 0 44px' }}>
          Upload salaries, generate payslips, send by email — all in under 3 minutes. AI catches errors before they reach your employees.
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 64 }}>
          <button onClick={() => navigate('/register')} style={{ background: 'linear-gradient(135deg, #1A7A4A, #15653E)', color: 'white', border: 'none', borderRadius: 14, padding: '15px 32px', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 24px rgba(26,122,74,0.5)' }}>
            Start Free Trial →
          </button>
          <a href="#demo" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: 'rgba(255,255,255,0.08)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 14, padding: '15px 28px', fontSize: 16, fontWeight: 600, cursor: 'pointer', textDecoration: 'none' }}>
            <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg viewBox="0 0 12 14" fill="none" style={{ width: 10, height: 10, marginLeft: 2 }}><path d="M1 1L11 7L1 13V1Z" fill="white" /></svg>
            </span>
            See how it works
          </a>
        </div>

        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 20 }}>
          <PayslipCard style={{ position: 'relative', zIndex: 2 }} />
          <FloatBadge icon="🤖" text="AI checked" sub="No anomalies found" style={{ top: -18, right: -120, zIndex: 3 }} />
          <FloatBadge icon="✉️" text="47 sent" sub="All employees notified" style={{ bottom: 40, left: -130, zIndex: 3 }} />
          <FloatBadge icon="⚡" text="2 min 14s" sub="Full payroll done" style={{ bottom: -16, right: -100, zIndex: 3 }} />
        </div>

        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 32 }}>
          No credit card needed · Cancel anytime · Data stays in India
        </p>
      </section>

      {/* ── MARQUEE — INDUSTRIES ──────────────────────────────────────────── */}
      <section style={{ background: '#0F172A', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '28px 0', overflow: 'hidden' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 20 }}>
          Designed for every type of Indian business
        </div>
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <div className="marquee-track">
            {[...marqueeItems, ...marqueeItems].map((item, i) => (
              <div key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '8px 20px', marginRight: 10,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 24, whiteSpace: 'nowrap', flexShrink: 0,
              }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE WALKTHROUGH ───────────────────────────────────────── */}
      <section id="demo" style={{ padding: '100px 24px', background: 'white' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: G, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>See it in action</div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 16px' }}>
              Full payroll in&nbsp;<span style={{ color: G }}>under 3 minutes.</span>
            </h2>
            <p style={{ fontSize: 16, color: '#64748B', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
              Click through each step to see exactly how PayLeef works — from adding employees to sending payslips.
            </p>
          </div>
          <InteractiveWalkthrough />

          {/* CTA below */}
          <div style={{ textAlign: 'center', marginTop: 52 }}>
            <p style={{ fontSize: 15, color: '#64748B', marginBottom: 20 }}>
              Ready to try it yourself? Get started in 2 minutes — no credit card needed.
            </p>
            <button onClick={() => navigate('/register')} style={{ background: 'linear-gradient(135deg, #1A7A4A, #15653E)', color: 'white', border: 'none', borderRadius: 12, padding: '14px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(26,122,74,0.4)' }}>
              Start Free Trial — 30 Days Free →
            </button>
          </div>
        </div>
      </section>

      {/* ── FEATURES BENTO GRID ───────────────────────────────────────────── */}
      <section id="features" style={{ padding: '100px 24px', background: '#F8FAFC' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: G, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Everything you need</div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>One tool. Zero payroll stress.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <BentoCard span={2} tall icon="🤖" title="AI Anomaly Detection" bg="#F0FDF4"
              desc="Before payslips go out, AI scans every number. Duplicate entries, sudden salary spikes, missing deductions — caught automatically.">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['Duplicate detection', 'Salary spike alert', 'PF mismatch check', 'Instant report'].map(t => (
                  <span key={t} style={{ fontSize: 11, fontWeight: 600, color: '#15803D', background: '#DCFCE7', padding: '4px 10px', borderRadius: 20 }}>{t}</span>
                ))}
              </div>
            </BentoCard>
            <BentoCard icon="⚡" title="Done in minutes" bg="#FEF9C3"
              desc="Upload, review, generate, send. Your entire monthly payroll in under 5 minutes — not 5 hours.">
              <div style={{ background: '#FEF3C7', borderRadius: 10, padding: '12px 14px', marginTop: 8 }}>
                <div style={{ fontSize: 11, color: '#92400E', fontWeight: 600, marginBottom: 4 }}>AVG TIME SAVED</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#78350F' }}>4.5 hrs</div>
                <div style={{ fontSize: 11, color: '#B45309' }}>per payroll cycle</div>
              </div>
            </BentoCard>
            <BentoCard icon="📧" title="Instant email delivery" bg="#EFF6FF"
              desc="Payslips delivered to every employee automatically. Connect your Gmail or Outlook in 2 minutes.">
              <div style={{ marginTop: 8 }}>
                <StepRow num="1" text="Connect your Gmail or Outlook" />
                <StepRow num="2" text="Click Generate & Send" />
                <StepRow num="3" text="Done — all inboxes reached" />
              </div>
            </BentoCard>
            <BentoCard span={2} icon="📊" title="Smart data import — any format" bg="#F5F3FF"
              desc="Upload Excel or CSV — even messy files. Our smart importer figures it out. Or type directly in the built-in spreadsheet editor.">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                {[{ icon: '📄', label: '.CSV files', desc: 'Any separator' }, { icon: '📊', label: '.XLSX files', desc: 'Multi-sheet OK' }, { icon: '✏️', label: 'Type directly', desc: 'Built-in editor' }, { icon: '🧠', label: 'Smart mapping', desc: 'AI column match' }].map(c => (
                  <div key={c.label} style={{ background: '#F5F3FF', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{c.icon}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#4C1D95' }}>{c.label}</div>
                      <div style={{ fontSize: 10, color: '#7C3AED' }}>{c.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </BentoCard>
            <BentoCard icon="📑" title="Professional PDF payslips" bg="#FFF1F2"
              desc="Clean, branded payslip PDFs with your company logo. Employees can download anytime from their portal." />
            <BentoCard icon="🏛️" title="India compliance built-in" bg="#ECFDF5"
              desc="PF, ESI, TDS, PT — all deduction rules baked in. Set slabs once, apply everywhere." />
            <BentoCard span={2} icon="👤" title="Employee self-service portal" bg="#F0F9FF"
              desc="Every employee gets their own secure login. View payslips, download PDFs, and ask an AI assistant about their pay — reducing HR queries to zero.">
              <div style={{ background: '#E0F2FE', borderRadius: 10, padding: '12px 14px', marginTop: 4, fontSize: 12, color: '#0369A1', fontWeight: 500, fontStyle: 'italic' }}>
                "Why is my TDS different this month?" — AI answers it. Not you.
              </div>
            </BentoCard>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: '100px 24px', background: 'white' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: G, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>How it works</div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,42px)', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>3 steps. Every month.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 32 }}>
            {[
              { num: '01', icon: '📤', color: '#F0FDF4', title: 'Upload salary data', desc: 'Drop your Excel or CSV file. Or type directly in our built-in grid editor. Smart import handles messy columns automatically.' },
              { num: '02', icon: '⚙️', color: '#EFF6FF', title: 'AI reviews everything', desc: 'Payroll engine calculates PF, TDS, LOP. AI scans for anomalies. You review a clean summary before anything goes out.' },
              { num: '03', icon: '🚀', color: '#FEF9C3', title: 'Send with one click', desc: 'All payslips emailed directly to employees. PDFs attached. Self-service portal updated. Done.' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: 18, background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 20px' }}>{s.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', marginBottom: 8 }}>STEP {s.num}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>{s.title}</div>
                <div style={{ fontSize: 13.5, color: '#64748B', lineHeight: 1.65 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOR HR TEAMS ─────────────────────────────────────────────────── */}
      <section id="for-hr-teams" style={{ padding: '100px 24px', background: '#0F172A' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#4ADE80', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>For HR teams</div>
            <h2 style={{ fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 800, color: 'white', lineHeight: 1.15, letterSpacing: '-0.02em', margin: '0 0 20px' }}>
              The payroll tool your HR team will actually enjoy using.
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, marginBottom: 32 }}>
              No spreadsheet juggling. No manual calculations. No "did that email go out?" anxiety. Just clean, correct payslips every month.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {['New joiner? Add them in 30 seconds', 'Employee leaving? Auto-calculate final settlement', 'LOP days? Just type the number — engine handles the rest', 'Bonus month? Add it per-employee before generating'].map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: '#1A7A4A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <svg viewBox="0 0 12 12" fill="none" style={{ width: 8, height: 8 }}><path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.55 }}>{p}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { icon: '👋', label: 'New joiner added', time: 'Just now' },
              { icon: '📊', label: 'Payroll generated', time: '2 min ago' },
              { icon: '✉️', label: '47 emails sent', time: '3 min ago' },
              { icon: '🤖', label: 'AI scan: 0 issues', time: '3 min ago' },
              { icon: '⬇️', label: 'PDF downloaded', time: '5 min ago' },
              { icon: '🏛️', label: 'PF auto-calculated', time: '5 min ago' },
            ].map((n, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, marginBottom: 10 }}>{n.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)', lineHeight: 1.3, marginBottom: 4 }}>{n.label}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{n.time}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WHY PAYLEEF — REPLACES FAKE TESTIMONIALS ─────────────────────── */}
      <section style={{ padding: '100px 24px', background: '#F8FAFC' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: G, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Why PayLeef</div>
            <h2 style={{ fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 14px' }}>
              Everything your team needs. Nothing they don't.
            </h2>
            <p style={{ fontSize: 15, color: '#64748B', maxWidth: 520, margin: '0 auto' }}>
              Built specifically for Indian SMEs — not adapted from a foreign product. PF, ESI, TDS, PT — all baked in from day one.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {[
              { icon: '🇮🇳', title: 'Built for India', color: '#F0FDF4', tc: G, desc: 'Indian tax rules, statutory deductions, and compliance built in. Not an afterthought — the foundation.' },
              { icon: '⚡', title: 'Fast to get started', color: '#FEF9C3', tc: '#B45309', desc: 'Most teams complete their first payroll within the same day they sign up. No consultant needed.' },
              { icon: '🔒', title: 'Secure & private', color: '#EFF6FF', tc: '#1D4ED8', desc: 'Your payroll data is encrypted, hosted in India, and never shared with third parties. Full stop.' },
              { icon: '🤖', title: 'AI that actually helps', color: '#F5F3FF', tc: '#7C3AED', desc: 'Not just a chatbot. AI that catches real payroll errors before they go out — and lets employees ask questions about their pay.' },
              { icon: '📧', title: 'Direct email delivery', color: '#FFF1F2', tc: '#BE123C', desc: 'Payslips land in employee inboxes — not a third-party portal they have to log into. Simple, professional.' },
              { icon: '📈', title: 'Grows with you', color: '#ECFDF5', tc: '#059669', desc: 'From 5 to 500 employees, the same software. No migrations, no upgrades, no surprises.' },
            ].map((c, i) => (
              <div key={i} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 18, padding: '24px 22px' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 14 }}>{c.icon}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>{c.title}</div>
                <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.65, margin: 0 }}>{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: '100px 24px', background: 'white' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: G, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Simple pricing</div>
            <h2 style={{ fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 12px' }}>Pay only for what you use</h2>
            <p style={{ fontSize: 15, color: '#64748B', margin: 0 }}>Start free for 30 days. No credit card needed.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            <PricingCard navigate={navigate} plan="Starter" price="₹499" period="/month" cta="Start free trial"
              features={['Up to 25 employees', 'PDF payslips', 'Email delivery', 'Basic reports', '30-day free trial']} />
            <PricingCard navigate={navigate} plan="Pro" price="₹999" period="/month" highlight cta="Start free trial"
              features={['Up to 100 employees', 'AI anomaly detection', 'Custom email templates', 'Advanced analytics', 'Employee self-service portal', 'Priority support']} />
            <PricingCard navigate={navigate} plan="Enterprise" price="Custom" period="" cta="Contact us"
              features={['Unlimited employees', 'Multi-company support', 'API access', 'White-label option', 'Dedicated account manager', 'SLA guarantee']} />
          </div>
        </div>
      </section>

      {/* ── CTA BAND ──────────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', background: 'linear-gradient(135deg, #0A2E1A 0%, #1A7A4A 100%)', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🚀</div>
          <h2 style={{ fontSize: 'clamp(26px,4vw,42px)', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', margin: '0 0 16px' }}>Ready to fix payroll forever?</h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 36, lineHeight: 1.6 }}>
            Start your 30-day free trial today. No credit card. No commitment. Cancel anytime.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/register')} style={{ background: 'white', color: G, border: 'none', borderRadius: 14, padding: '15px 32px', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>Start free trial →</button>
            <button onClick={() => navigate('/login')} style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 14, padding: '15px 28px', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>Sign in</button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer style={{ background: '#0A1628', padding: '56px 24px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 48 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><LeafMark size={18} /></div>
                <span style={{ fontSize: 17, fontWeight: 900, color: 'white' }}>Pay<span style={{ color: '#4ADE80' }}>Leef</span></span>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, maxWidth: 260 }}>
                Payroll software built specifically for Indian businesses. Simple, accurate, and automatic.
              </p>
            </div>
            {[
              { heading: 'Product', links: ['Features', 'Pricing', 'AI Detection', 'Employee Portal'] },
              { heading: 'Company', links: ['About', 'Blog', 'Careers', 'Contact'] },
              { heading: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Security', 'Compliance'] },
            ].map(col => (
              <div key={col.heading}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>{col.heading}</div>
                {col.links.map(l => (
                  <div key={l} style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 10, cursor: 'pointer' }}
                    onMouseOver={e => e.target.style.color = '#4ADE80'} onMouseOut={e => e.target.style.color = 'rgba(255,255,255,0.45)'}>{l}</div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0 }}>© 2026 PayLeef. All rights reserved.</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
              Built & Powered by{' '}
              <a href="https://www.dinmind.com" target="_blank" rel="noopener noreferrer" style={{ color: '#4ADE80', fontWeight: 600, textDecoration: 'none' }}
                onMouseOver={e => e.target.style.textDecoration = 'underline'} onMouseOut={e => e.target.style.textDecoration = 'none'}>DinMind Infotech</a>
            </p>
          </div>
        </div>
      </footer>

      {/* ── Styles ─────────────────────────────────────────────────────────── */}
      <style>{`
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
        }

        /* Smooth horizontal marquee */
        .marquee-track {
          display: flex;
          width: max-content;
          animation: marquee-scroll 30s linear infinite;
        }
        .marquee-track:hover {
          animation-play-state: paused;
        }
        @keyframes marquee-scroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
