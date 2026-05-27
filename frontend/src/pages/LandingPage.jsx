import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/* ─── Scroll reveal ───────────────────────────────────────────────────────── */
function useReveal(t = 0.1) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); o.disconnect(); } }, { threshold: t });
    if (ref.current) o.observe(ref.current);
    return () => o.disconnect();
  }, []);
  return [ref, vis];
}

/* ─── Logo ────────────────────────────────────────────────────────────────── */
const Leaf = ({ size = 20, fill = 'white', stroke = '#1A7A4A' }) => (
  <svg viewBox="0 0 20 24" fill="none" style={{ width: size, height: size }}>
    <path d="M10,1 C16,1 19,7 18,13 C17,19 14,22 10,23 C6,22 3,19 2,13 C1,7 4,1 10,1Z" fill={fill} />
    <line x1="10" y1="2"  x2="10" y2="22" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
    <line x1="4"  y1="7"  x2="16" y2="7"  stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
    <line x1="4"  y1="11" x2="16" y2="11" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
    <line x1="4"  y1="11" x2="14" y2="20" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const G = '#1A7A4A';

/* ══════════════════════════════════════════════════════════════════════════
   REAL APP SCREEN MOCKUPS  — matches the actual PayLeef UI
══════════════════════════════════════════════════════════════════════════ */

/* Shared sidebar used in all screens */
function AppSidebar({ active }) {
  const items = [
    { icon: '📊', label: 'Dashboard' },
    { icon: '👥', label: 'Employees' },
    { icon: '📅', label: 'Attendance' },
    { icon: '🚀', label: 'Generate' },
    { icon: '📑', label: 'Reports' },
    { icon: '⚙️', label: 'Settings' },
  ];
  return (
    <div style={{ width: 64, background: '#0F172A', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 6px', gap: 4, flexShrink: 0 }}>
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Leaf size={18} fill="white" stroke="#4ADE80" />
      </div>
      {items.map((item, i) => (
        <div key={item.label} style={{
          width: 44, height: 44, borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, cursor: 'pointer',
          background: item.label === active ? 'rgba(26,122,74,0.4)' : 'transparent',
          border: item.label === active ? '1px solid rgba(74,222,128,0.3)' : '1px solid transparent',
        }}>
          <span style={{ fontSize: 13 }}>{item.icon}</span>
          <span style={{ fontSize: 6, color: item.label === active ? '#4ADE80' : 'rgba(255,255,255,0.3)', fontWeight: 600 }}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

/* Screen 1 — Dashboard (matches real DashboardPage) */
function ScreenDashboard() {
  return (
    <div style={{ flex: 1, background: '#F8FAFC', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
      {/* Greeting */}
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Good morning, Dinesh 👋</div>
        <div style={{ fontSize: 10, color: '#94A3B8' }}>Wednesday, 28 May 2026</div>
      </div>
      {/* Status card */}
      <div style={{ background: '#FFFBEB', border: '1.5px solid #FCD34D', borderRadius: 14, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>📋</div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '.06em' }}>May 2026 Payroll Pending</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#0F172A', marginTop: 1 }}>Ready to generate payslips for 24 employees</div>
          </div>
        </div>
        <div style={{ padding: '5px 12px', background: '#D97706', borderRadius: 8, fontSize: 10, fontWeight: 700, color: 'white', whiteSpace: 'nowrap' }}>Generate →</div>
      </div>
      {/* 3 stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { label: 'Total Employees', value: '24', sub: '3 departments', icon: '👥', bg: '#F0FDF4', color: G },
          { label: 'Monthly Payroll', value: '₹16.4L', sub: 'avg ₹68,400', icon: '📈', bg: '#F5F3FF', color: '#7C3AED' },
          { label: 'May Payslips', value: '0 / 24', sub: 'Not generated', icon: '📄', bg: '#FFFBEB', color: '#D97706' },
        ].map(c => (
          <div key={c.label} style={{ background: 'white', border: '1.5px solid #E2E8F0', borderRadius: 14, padding: '10px 10px 8px' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, marginBottom: 6 }}>{c.icon}</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#0F172A', lineHeight: 1 }}>{c.value}</div>
            <div style={{ fontSize: 8, fontWeight: 600, color: '#64748B', marginTop: 3 }}>{c.label}</div>
            <div style={{ fontSize: 8, color: '#94A3B8' }}>{c.sub}</div>
          </div>
        ))}
      </div>
      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {[
          { label: 'Add / Edit Employees', desc: 'Manage your team', icon: '👥', color: G, bg: '#F0FDF4' },
          { label: 'Import Salaries', desc: 'Upload CSV or Excel', icon: '📤', color: '#0891B2', bg: '#ECFEFF' },
          { label: 'Generate & Send', desc: 'Create payslips', icon: '🚀', color: '#D97706', bg: '#FFFBEB' },
          { label: 'Download Reports', desc: 'PF, ESI, Bank advice', icon: '📊', color: '#7C3AED', bg: '#F5F3FF' },
        ].map(c => (
          <div key={c.label} style={{ background: 'white', border: '1.5px solid #E2E8F0', borderRadius: 12, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>{c.icon}</div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#0F172A' }}>{c.label}</div>
              <div style={{ fontSize: 8, color: '#94A3B8' }}>{c.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Screen 2 — AI Review (matches real review flow) */
function ScreenAI() {
  return (
    <div style={{ flex: 1, background: '#F8FAFC', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>AI Anomaly Detection</div>
          <div style={{ fontSize: 10, color: '#94A3B8' }}>May 2026 · 24 employees scanned</div>
        </div>
        <div style={{ padding: '4px 10px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 20, fontSize: 9, fontWeight: 700, color: G }}>✓ SCAN COMPLETE</div>
      </div>
      {/* Alert: 1 flag */}
      <div style={{ background: '#FFFBEB', border: '1.5px solid #FCD34D', borderRadius: 12, padding: '10px 12px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#D97706', marginBottom: 4 }}>⚠ 1 flag found — Karthik M</div>
        <div style={{ fontSize: 9, color: '#92400E', marginBottom: 8 }}>Salary is ₹88,000 — 28% higher than last month (₹69,000). Verify if bonus was added.</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ flex: 1, padding: '5px', textAlign: 'center', borderRadius: 6, border: '1px solid #FCD34D', fontSize: 9, color: '#D97706', fontWeight: 600, cursor: 'pointer' }}>Review</div>
          <div style={{ flex: 2, padding: '5px', textAlign: 'center', borderRadius: 6, background: '#D97706', fontSize: 9, fontWeight: 700, color: 'white', cursor: 'pointer' }}>Looks correct — Approve & Continue</div>
        </div>
      </div>
      {/* Clear employees */}
      <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 12, padding: '10px 12px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: G, marginBottom: 6 }}>✓ 23 employees — All clear</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[['Arjun Sharma', '₹70,200', 'Engineering'], ['Priya Nair', '₹52,400', 'Marketing'], ['Divya R', '₹45,000', 'HR']].map(([n, s, d]) => (
            <div key={n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', borderRadius: 8, padding: '5px 8px', border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: 10, color: '#0F172A', fontWeight: 500 }}>{n} <span style={{ color: '#94A3B8', fontSize: 9 }}>{d}</span></span>
              <span style={{ fontSize: 10, fontWeight: 700, color: G }}>{s} ✓</span>
            </div>
          ))}
        </div>
      </div>
      {/* Totals */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
        {[['Total Gross', '₹16.4L'], ['Total PF', '₹1.26L'], ['Total TDS', '₹52K']].map(([l, v]) => (
          <div key={l} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, padding: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: 8, color: '#64748B', marginBottom: 2 }}>{l}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#0F172A' }}>{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Screen 3 — Generate & Send (matches real SendPage) */
function ScreenGenerate() {
  return (
    <div style={{ flex: 1, background: '#F8FAFC', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Generate & Send Payslips</div>
          <div style={{ fontSize: 10, color: '#94A3B8' }}>May 2026 · 24 employees</div>
        </div>
        <div style={{ padding: '7px 14px', background: G, borderRadius: 8, fontSize: 10, fontWeight: 700, color: 'white', cursor: 'pointer' }}>🚀 Send All</div>
      </div>
      {/* Progress */}
      <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, padding: '10px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>
          <span>Sending payslips…</span><span style={{ color: G }}>18 / 24 done</span>
        </div>
        <div style={{ height: 6, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: '75%', background: 'linear-gradient(to right, #1A7A4A, #22C55E)', borderRadius: 3 }} />
        </div>
        <div style={{ fontSize: 9, color: '#94A3B8', marginTop: 4 }}>Estimated 22 seconds remaining</div>
      </div>
      {/* Employee list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1, overflow: 'hidden' }}>
        {[
          ['Arjun Sharma', 'arjun@company.in', '₹70,200', 'Sent ✓', '#15803D', '#F0FDF4'],
          ['Priya Nair', 'priya@company.in', '₹52,400', 'Sent ✓', '#15803D', '#F0FDF4'],
          ['Karthik M', 'karthik@company.in', '₹88,000', 'Sending…', '#2563EB', '#EFF6FF'],
          ['Divya R', 'divya@company.in', '₹45,000', 'Queued', '#64748B', '#F8FAFC'],
          ['Suresh K', 'suresh@company.in', '₹38,500', 'Queued', '#64748B', '#F8FAFC'],
        ].map(([n, e, s, st, tc, bg]) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: bg, borderRadius: 10, border: '1px solid #E2E8F0' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#0F172A' }}>{n}</div>
              <div style={{ fontSize: 8, color: '#94A3B8' }}>{e}</div>
            </div>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#475569' }}>{s}</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: tc, whiteSpace: 'nowrap' }}>{st}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Screen 4 — Employee Portal (matches real employee-facing UI) */
function ScreenPortal() {
  return (
    <div style={{ flex: 1, background: '#F8FAFC', padding: 16, display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'white', border: '1px solid #E2E8F0', borderRadius: 12, padding: '10px 12px' }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>👤</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>Arjun Sharma</div>
          <div style={{ fontSize: 9, color: '#94A3B8' }}>Senior Engineer · EMP-001 · Engineering</div>
        </div>
        <div style={{ padding: '4px 10px', background: '#F5F3FF', borderRadius: 8, fontSize: 9, fontWeight: 700, color: '#7C3AED' }}>AI Chat ✨</div>
      </div>
      {/* Payslips */}
      <div style={{ fontSize: 10, fontWeight: 700, color: '#64748B', letterSpacing: '.06em', textTransform: 'uppercase' }}>My Payslips</div>
      {[
        ['May 2026', '₹70,200', true, 'New — just arrived!'],
        ['Apr 2026', '₹70,200', false, 'Downloaded'],
        ['Mar 2026', '₹68,500', false, 'Downloaded'],
      ].map(([m, n, isNew, status]) => (
        <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: isNew ? '#F0FDF4' : 'white', borderRadius: 12, border: isNew ? `1.5px solid #BBF7D0` : '1px solid #E2E8F0' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: isNew ? 700 : 500, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
              {m} {isNew && <span style={{ fontSize: 8, padding: '2px 6px', background: G, color: 'white', borderRadius: 8, fontWeight: 700 }}>NEW</span>}
            </div>
            <div style={{ fontSize: 9, color: '#64748B', marginTop: 2 }}>Net Pay: <strong>{n}</strong> · {status}</div>
          </div>
          <div style={{ display: 'flex', gap: 5 }}>
            <div style={{ padding: '4px 10px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 7, fontSize: 9, fontWeight: 600, color: '#2563EB', cursor: 'pointer' }}>⬇ PDF</div>
          </div>
        </div>
      ))}
      {/* AI Chat */}
      <div style={{ background: 'white', border: '1.5px solid #DDD6FE', borderRadius: 12, padding: '10px 12px' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', marginBottom: 6 }}>✨ Ask AI about your payslip</div>
        <div style={{ background: '#F5F3FF', borderRadius: 8, padding: '6px 8px', marginBottom: 5, fontSize: 10, color: '#4C1D95', fontStyle: 'italic' }}>"Why is my TDS higher this month?"</div>
        <div style={{ background: '#FAFAFA', borderRadius: 8, padding: '6px 8px', fontSize: 9, color: '#374151', lineHeight: 1.5 }}>Your TDS increased because your projected annual income crossed ₹5 lakh this quarter, moving you to the 20% slab…</div>
      </div>
    </div>
  );
}

/* ─── Demo showcase ───────────────────────────────────────────────────────── */
const DEMOS = [
  { tab: 'Dashboard', icon: '📊', sidebar: 'Dashboard', heading: 'Always know where you stand.', body: 'The dashboard tells you exactly what needs to happen this month — one status card, three key numbers, four quick actions.', Screen: ScreenDashboard },
  { tab: 'AI Review', icon: '🤖', sidebar: 'Generate', heading: 'AI catches errors before you do.', body: 'Every salary is scanned. Anomalies flagged with one-click approve or review. No wrong payslip ever goes out.', Screen: ScreenAI },
  { tab: 'Generate & Send', icon: '🚀', sidebar: 'Generate', heading: 'One click. All inboxes.', body: 'Payslip PDFs are generated and emailed to every employee. Watch the progress live. Under 3 minutes total.', Screen: ScreenGenerate },
  { tab: 'Employee Portal', icon: '🔐', sidebar: 'Dashboard', heading: 'Employees self-serve.', body: 'Every employee gets a secure login to download payslips and ask AI about their pay — no more HR calls.', Screen: ScreenPortal },
];

function DemoShowcase() {
  const [active, setActive] = useState(0);
  const [fading, setFading] = useState(false);
  const timer = useRef(null);

  const go = (i) => {
    if (i === active) return;
    setFading(true);
    setTimeout(() => { setActive(i); setFading(false); }, 160);
  };

  const resetAuto = (i) => {
    clearInterval(timer.current);
    go(i);
    timer.current = setInterval(() => { setFading(true); setTimeout(() => setActive(p => (p + 1) % DEMOS.length), 160); setTimeout(() => setFading(false), 320); }, 5000);
  };

  useEffect(() => {
    timer.current = setInterval(() => { setFading(true); setTimeout(() => setActive(p => (p + 1) % DEMOS.length), 160); setTimeout(() => setFading(false), 320); }, 5000);
    return () => clearInterval(timer.current);
  }, []);

  const d = DEMOS[active];
  const Screen = d.Screen;

  return (
    <div>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 40, justifyContent: 'center' }}>
        {DEMOS.map((item, i) => (
          <button key={i} onClick={() => resetAuto(i)} style={{
            padding: '8px 18px', borderRadius: 24, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            background: active === i ? G : '#F1F5F9',
            color: active === i ? 'white' : '#64748B',
            transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            {item.icon} {item.tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: 48, alignItems: 'center' }}>
        {/* Left — text */}
        <div style={{ opacity: fading ? 0 : 1, transform: fading ? 'translateY(6px)' : 'translateY(0)', transition: 'all 0.16s' }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: 18, border: `1px solid #BBF7D0` }}>{d.icon}</div>
          <h3 style={{ fontSize: 'clamp(22px,2.8vw,32px)', fontWeight: 800, color: '#0F172A', margin: '0 0 14px', lineHeight: 1.2, letterSpacing: '-0.02em' }}>{d.heading}</h3>
          <p style={{ fontSize: 15, color: '#64748B', lineHeight: 1.75, margin: '0 0 32px' }}>{d.body}</p>
          {/* Progress dots */}
          <div style={{ display: 'flex', gap: 8 }}>
            {DEMOS.map((_, i) => (
              <button key={i} onClick={() => resetAuto(i)} style={{ width: active === i ? 28 : 8, height: 8, borderRadius: 4, border: 'none', cursor: 'pointer', background: active === i ? G : '#E2E8F0', transition: 'all 0.3s' }} />
            ))}
          </div>
        </div>

        {/* Right — real app mockup */}
        <div style={{ borderRadius: 18, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)', background: 'white' }}>
          {/* Browser bar */}
          <div style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF5F57' }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFBD2E' }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#28C840' }} />
            <div style={{ flex: 1, height: 18, background: 'white', borderRadius: 4, marginLeft: 6, display: 'flex', alignItems: 'center', paddingLeft: 8, border: '1px solid #E2E8F0' }}>
              <span style={{ fontSize: 9, color: '#94A3B8' }}>app.payleef.in/admin/{d.tab.toLowerCase().replace(/ /g, '-')}</span>
            </div>
          </div>
          {/* App layout */}
          <div style={{ display: 'flex', height: 340, opacity: fading ? 0 : 1, transition: 'opacity 0.16s' }}>
            <AppSidebar active={d.sidebar} />
            <Screen />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const industries = ['🏭 Manufacturing', '🏥 Healthcare', '🛒 Retail & FMCG', '💼 IT Services', '🏗️ Construction', '🚚 Logistics', '🏫 Schools', '🏨 Hospitality', '📦 E-commerce', '⚙️ Engineering', '🧪 Pharma', '🏦 Finance & NBFC'];

  return (
    <div style={{ fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif", background: '#fff', color: '#0F172A', overflowX: 'hidden' }}>

      {/* ── NAV ──────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        background: scrolled ? 'rgba(255,255,255,0.95)' : 'white',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: '1px solid #E2E8F0',
        transition: 'all 0.25s',
      }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 62 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }} onClick={() => navigate('/')}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Leaf size={17} />
            </div>
            <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-0.04em', color: '#0F172A' }}>Pay<span style={{ color: G }}>Leef</span></span>
          </div>
          <div className="nav-links" style={{ display: 'flex', gap: 24 }}>
            {[['Features', '#features'], ['How it works', '#how'], ['Pricing', '#pricing']].map(([l, h]) => (
              <a key={l} href={h} style={{ fontSize: 14, color: '#64748B', textDecoration: 'none', fontWeight: 500 }}
                onMouseOver={e => e.target.style.color = '#0F172A'} onMouseOut={e => e.target.style.color = '#64748B'}>{l}</a>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate('/login')} style={{ fontSize: 14, color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 14px', borderRadius: 8, fontWeight: 500 }}>Sign in</button>
            <button onClick={() => navigate('/register')} style={{ fontSize: 14, fontWeight: 700, color: 'white', background: G, border: 'none', borderRadius: 9, cursor: 'pointer', padding: '9px 20px', boxShadow: '0 2px 10px rgba(26,122,74,0.3)' }}>
              Start free trial →
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{ paddingTop: 120, paddingBottom: 80, paddingLeft: 24, paddingRight: 24, background: 'linear-gradient(180deg, #F0FDF4 0%, #ffffff 60%)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Subtle dot grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(#E2E8F0 1px, transparent 1px)', backgroundSize: '28px 28px', opacity: 0.6, pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: 860, margin: '0 auto' }}>
          {/* Badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 20, padding: '6px 16px', marginBottom: 28 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 6px #22C55E' }} />
            <span style={{ fontSize: 13, color: '#15803D', fontWeight: 600 }}>Payroll software · Built for India · GST & PF ready</span>
          </div>

          {/* Headline */}
          <h1 style={{ fontSize: 'clamp(38px,6vw,72px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.035em', margin: '0 0 24px', color: '#0F172A' }}>
            Stop doing payroll<br />
            <span style={{ color: G }}>manually.</span>
          </h1>

          <p style={{ fontSize: 'clamp(16px,2vw,20px)', color: '#64748B', maxWidth: 540, margin: '0 auto 44px', lineHeight: 1.75 }}>
            Upload salary data, AI reviews every number, one click sends payslips to all employees. Under 3 minutes. Every month.
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}>
            <button onClick={() => navigate('/register')} style={{
              background: G, color: 'white', border: 'none', borderRadius: 12, padding: '14px 32px', fontSize: 16, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(26,122,74,0.35)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(26,122,74,0.45)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(26,122,74,0.35)'; }}
            >
              Start Free Trial — 30 Days Free →
            </button>
            <a href="#demo" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#374151', background: 'white', border: '1.5px solid #E2E8F0', borderRadius: 12, padding: '14px 26px', fontSize: 16, fontWeight: 500, textDecoration: 'none', transition: 'all 0.2s' }}
              onMouseOver={e => { e.currentTarget.style.borderColor = G; e.currentTarget.style.color = G; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#374151'; }}
            >
              <svg viewBox="0 0 12 14" fill="none" style={{ width: 10, height: 10 }}><path d="M1 1L11 7L1 13V1Z" fill="currentColor" /></svg>
              See how it works
            </a>
          </div>

          <p style={{ fontSize: 12, color: '#94A3B8', letterSpacing: '.02em' }}>No credit card · Cancel anytime · Data stays in India</p>
        </div>

        {/* Hero app preview */}
        <div style={{ maxWidth: 900, margin: '64px auto 0', position: 'relative' }}>
          {/* Glow */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 60%, rgba(26,122,74,0.12) 0%, transparent 65%)', pointerEvents: 'none', borderRadius: '50%' }} />
          {/* App window */}
          <div style={{ borderRadius: 18, overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.14), 0 0 0 1px rgba(0,0,0,0.06)', border: '1px solid #E2E8F0', position: 'relative' }}>
            <div style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F57' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD2E' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28C840' }} />
              <div style={{ flex: 1, height: 20, background: 'white', borderRadius: 5, marginLeft: 8, display: 'flex', alignItems: 'center', paddingLeft: 10, border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: 11, color: '#94A3B8' }}>app.payleef.in/admin/dashboard</span>
              </div>
            </div>
            <div style={{ display: 'flex', height: 380 }}>
              <AppSidebar active="Dashboard" />
              <ScreenDashboard />
            </div>
          </div>
        </div>
      </section>

      {/* ── INDUSTRIES MARQUEE ───────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9', padding: '20px 0', overflow: 'hidden', background: '#FAFAFA', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 80, background: 'linear-gradient(to right, #FAFAFA, transparent)', zIndex: 2, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, background: 'linear-gradient(to left, #FAFAFA, transparent)', zIndex: 2, pointerEvents: 'none' }} />
        <div style={{ textAlign: 'center', marginBottom: 14, fontSize: 11, fontWeight: 600, color: '#94A3B8', letterSpacing: '.1em', textTransform: 'uppercase' }}>Works for every type of Indian business</div>
        <div className="marquee-track">
          {[...industries, ...industries].map((item, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginRight: 36, fontSize: 13, color: '#64748B', fontWeight: 500, whiteSpace: 'nowrap' }}>
              <span>{item.split(' ')[0]}</span>{item.split(' ').slice(1).join(' ')}
            </span>
          ))}
        </div>
      </div>

      {/* ── INTERACTIVE DEMO ─────────────────────────────────────────────── */}
      <section id="demo" style={{ padding: '96px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div id="how" style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: G, textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 12 }}>Live preview</div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,46px)', fontWeight: 800, margin: '0 0 14px', letterSpacing: '-0.025em', color: '#0F172A' }}>
              See the actual software in action.
            </h2>
            <p style={{ fontSize: 16, color: '#64748B', maxWidth: 500, margin: '0 auto', lineHeight: 1.65 }}>
              These are real screens from PayLeef — not mockups. Click each step to see exactly how it works.
            </p>
          </div>
          <DemoShowcase />
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: '80px 24px', background: '#F8FAFC', borderTop: '1px solid #F1F5F9' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: G, textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 12 }}>Features</div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, margin: 0, letterSpacing: '-0.025em', color: '#0F172A' }}>Everything HR needs. Nothing extra.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {[
              { icon: '🤖', title: 'AI Anomaly Detection', bg: '#F0FDF4', desc: 'AI scans every salary before payslips go out. Catches spikes, duplicates, and missing deductions automatically.' },
              { icon: '📊', title: 'Smart Salary Import', bg: '#EFF6FF', desc: 'Upload Excel or CSV in any format. Smart column mapping figures it out. Or type directly in the built-in grid.' },
              { icon: '📧', title: 'Instant Email Delivery', bg: '#FFF1F2', desc: 'One click sends PDF payslips to every employee. Connect Gmail or Outlook in 2 minutes.' },
              { icon: '🏛️', title: 'India Compliance Built-in', bg: '#FFFBEB', desc: 'PF, ESI, TDS, PT, LOP — all baked in. Set your config once. Applied correctly every month.' },
              { icon: '👤', title: 'Employee Self-Service', bg: '#F5F3FF', desc: 'Every employee gets a secure login to download payslips and ask an AI about their pay.' },
              { icon: '📑', title: 'Form 16 & Reports', bg: '#ECFDF5', desc: 'Form 16 Part B, Salary Register, PF ECR, ESI returns, Bank Advice — all downloadable in one click.' },
            ].map((c, i) => {
              const [ref, vis] = useReveal();
              return (
                <div key={i} ref={ref} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 18, padding: '24px 22px', opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(18px)', transition: `all 0.45s ease ${i * 0.07}s` }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 14 }}>{c.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>{c.title}</div>
                  <div style={{ fontSize: 13.5, color: '#64748B', lineHeight: 1.65 }}>{c.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', background: 'white', borderTop: '1px solid #F1F5F9' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: G, textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 12 }}>How it works</div>
          <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, margin: '0 0 60px', letterSpacing: '-0.025em', color: '#0F172A' }}>3 steps. Every month.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 40 }}>
            {[
              { n: '01', icon: '📤', title: 'Upload salary data', desc: 'Drop your Excel or CSV. Smart import maps any column format automatically. Or type directly in the grid.' },
              { n: '02', icon: '🤖', title: 'AI reviews everything', desc: 'Payroll engine calculates PF, TDS, LOP. AI scans every number and flags issues before they go out.' },
              { n: '03', icon: '🚀', title: 'Send with one click', desc: 'Payslips PDF-generated and emailed to all employees. Self-service portal updated. Done in under 3 minutes.' },
            ].map((s, i) => {
              const [ref, vis] = useReveal();
              return (
                <div key={i} ref={ref} style={{ opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(18px)', transition: `all 0.45s ease ${i * 0.1}s` }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: '#F0FDF4', border: '1.5px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 18px' }}>{s.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '.1em', marginBottom: 8 }}>STEP {s.n}</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', marginBottom: 10 }}>{s.title}</div>
                  <div style={{ fontSize: 13.5, color: '#64748B', lineHeight: 1.7 }}>{s.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── WHY PAYLEEF ──────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', background: '#F8FAFC', borderTop: '1px solid #F1F5F9' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: G, textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 12 }}>Why PayLeef</div>
            <h2 style={{ fontSize: 'clamp(24px,3.5vw,38px)', fontWeight: 800, color: '#0F172A', lineHeight: 1.2, letterSpacing: '-0.02em', margin: '0 0 18px' }}>Built for Indian HR. Not adapted.</h2>
            <p style={{ fontSize: 15, color: '#64748B', lineHeight: 1.75, marginBottom: 28 }}>
              Most payroll software is built for the West and awkwardly adapted for India. PayLeef was designed from scratch for Indian statutory rules, Indian business sizes, and Indian HR workflows.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {['PF, ESI, TDS, PT — all baked in, not bolted on', 'New employee added in under 30 seconds', 'Handles LOP, bonus, overtime per employee', 'Works for 5 employees or 500 — same software', 'Your data stays in India, always'].map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <svg viewBox="0 0 10 10" fill="none" style={{ width: 8, height: 8 }}><path d="M1.5 5L4 7.5L8.5 2.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <span style={{ fontSize: 14, color: '#374151', lineHeight: 1.55 }}>{p}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { icon: '🇮🇳', title: 'Built for India', sub: 'PF · ESI · TDS · PT', bg: '#F0FDF4', border: '#BBF7D0' },
              { icon: '⚡', title: 'Fast setup', sub: 'First payroll same day', bg: '#FFFBEB', border: '#FCD34D' },
              { icon: '🔒', title: 'Secure', sub: 'Data stays in India', bg: '#EFF6FF', border: '#BFDBFE' },
              { icon: '🤖', title: 'AI-powered', sub: 'Real payroll intelligence', bg: '#F5F3FF', border: '#DDD6FE' },
              { icon: '📧', title: 'Direct email', sub: 'No third-party portals', bg: '#FFF1F2', border: '#FECACA' },
              { icon: '📈', title: 'Scalable', sub: '5 to 500 employees', bg: '#ECFDF5', border: '#A7F3D0' },
            ].map((c, i) => {
              const [ref, vis] = useReveal();
              return (
                <div key={i} ref={ref} style={{ padding: '16px', borderRadius: 14, background: c.bg, border: `1px solid ${c.border}`, opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(14px)', transition: `all 0.4s ease ${i * 0.06}s` }}>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{c.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>{c.title}</div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>{c.sub}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: '80px 24px', background: 'white', borderTop: '1px solid #F1F5F9' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: G, textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 12 }}>Pricing</div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.025em', color: '#0F172A' }}>Simple. Transparent. No surprises.</h2>
            <p style={{ fontSize: 15, color: '#64748B', margin: 0 }}>30-day free trial on all plans. No credit card needed.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 20, maxWidth: 720, margin: '0 auto' }}>
            {[
              {
                plan: 'PayLeef Pro — Monthly Plan',
                price: '₹999',
                period: '/month',
                badge: null,
                features: ['Up to 100 employees', 'PDF payslips + Email delivery', 'AI anomaly detection', 'Employee self-service portal', 'Form 16 & compliance reports', 'Custom email branding', 'Priority support', '30-day free trial'],
                best: false,
                cta: 'Start free trial',
              },
              {
                plan: 'PayLeef Pro — Annual Plan',
                price: '₹9,990',
                period: '/year',
                badge: '🎉 Save ₹2,358 vs monthly — 2 months free!',
                features: ['Up to 100 employees', 'PDF payslips + Email delivery', 'AI anomaly detection', 'Employee self-service portal', 'Form 16 & compliance reports', 'Custom email branding', 'Priority support', '30-day free trial'],
                best: true,
                cta: 'Get annual plan',
              },
            ].map((p, i) => {
              const [ref, vis] = useReveal();
              return (
                <div key={i} ref={ref} style={{
                  padding: '32px 28px', borderRadius: 20, position: 'relative',
                  border: p.best ? `2px solid ${G}` : '1px solid #E2E8F0',
                  background: p.best ? '#F0FDF4' : 'white',
                  boxShadow: p.best ? '0 8px 40px rgba(26,122,74,0.14)' : '0 2px 8px rgba(0,0,0,0.05)',
                  opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(18px)',
                  transition: `all 0.45s ease ${i * 0.1}s`,
                }}>
                  {p.best && <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: G, color: 'white', fontSize: 10, fontWeight: 800, padding: '4px 16px', borderRadius: 20, letterSpacing: '.06em', whiteSpace: 'nowrap' }}>BEST VALUE</div>}
                  <div style={{ fontSize: 13, fontWeight: 700, color: p.best ? G : '#64748B', letterSpacing: '.04em', marginBottom: 10 }}>{p.plan}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: p.badge ? 10 : 20 }}>
                    <span style={{ fontSize: 42, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.03em' }}>{p.price}</span>
                    <span style={{ fontSize: 14, color: '#94A3B8' }}>{p.period}</span>
                  </div>
                  {p.badge && (
                    <div style={{ background: '#FEF9C3', border: '1px solid #FDE047', borderRadius: 8, padding: '6px 10px', marginBottom: 18, fontSize: 12, fontWeight: 600, color: '#854D0E' }}>{p.badge}</div>
                  )}
                  <div style={{ height: 1, background: p.best ? '#BBF7D0' : '#E2E8F0', marginBottom: 20 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 26 }}>
                    {p.features.map((f, fi) => (
                      <div key={fi} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg viewBox="0 0 10 10" fill="none" style={{ width: 7, height: 7 }}><path d="M1.5 5L3.5 7.5L8.5 2.5" stroke="#16A34A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        </div>
                        <span style={{ fontSize: 13, color: '#374151' }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => navigate('/register')} style={{
                    width: '100%', padding: '13px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    background: p.best ? G : 'transparent',
                    color: p.best ? 'white' : G,
                    border: p.best ? 'none' : `1.5px solid ${G}`,
                    transition: 'all 0.2s',
                  }}
                    onMouseOver={e => { e.currentTarget.style.background = p.best ? '#15653E' : '#F0FDF4'; }}
                    onMouseOut={e => { e.currentTarget.style.background = p.best ? G : 'transparent'; }}
                  >{p.cta}</button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', background: 'linear-gradient(135deg, #0A2E1A 0%, #1A7A4A 100%)', textAlign: 'center' }}>
        <div style={{ maxWidth: 580, margin: '0 auto' }}>
          <div style={{ fontSize: 40, marginBottom: 18 }}>🚀</div>
          <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, color: 'white', margin: '0 0 16px', letterSpacing: '-0.025em' }}>
            Ready to fix payroll forever?
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 36, lineHeight: 1.7 }}>
            Start your free trial today. No credit card. No commitment. Run your first payroll in under 10 minutes.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/register')} style={{ background: 'white', color: G, border: 'none', borderRadius: 12, padding: '14px 32px', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.15)', transition: 'transform 0.15s' }}
              onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
            >Start Free Trial →</button>
            <button onClick={() => navigate('/login')} style={{ color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 12, padding: '14px 26px', fontSize: 16, fontWeight: 500, cursor: 'pointer' }}>Sign in</button>
          </div>
          <p style={{ marginTop: 22, fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>30 days free · No credit card · Cancel anytime</p>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer style={{ background: '#0F172A', padding: '48px 24px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 40 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Leaf size={16} /></div>
                <span style={{ fontSize: 16, fontWeight: 900, color: 'white', letterSpacing: '-0.04em' }}>Pay<span style={{ color: '#4ADE80' }}>Leef</span></span>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7, maxWidth: 240, margin: 0 }}>Payroll software built for Indian businesses. Simple, accurate, automatic.</p>
            </div>
            {[
              { h: 'Product', links: ['Features', 'Pricing', 'AI Detection', 'Employee Portal', 'Form 16'] },
              { h: 'Company', links: ['About', 'Blog', 'Contact'] },
              { h: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Security'] },
            ].map(col => (
              <div key={col.h}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 14 }}>{col.h}</div>
                {col.links.map(l => (
                  <div key={l} style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 10, cursor: 'pointer', transition: 'color 0.2s' }}
                    onMouseOver={e => e.target.style.color = 'white'} onMouseOut={e => e.target.style.color = 'rgba(255,255,255,0.4)'}>{l}</div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', margin: 0 }}>© 2026 PayLeef. All rights reserved.</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', margin: 0 }}>
              Built by <a href="https://www.dinmind.com" target="_blank" rel="noopener noreferrer" style={{ color: '#4ADE80', textDecoration: 'none', fontWeight: 600 }}>DinMind Infotech</a>
            </p>
          </div>
        </div>
      </footer>

      <style>{`
        @media (max-width: 768px) { .nav-links { display: none !important; } }
        .marquee-track {
          display: flex; width: max-content;
          animation: marquee 32s linear infinite;
        }
        .marquee-track:hover { animation-play-state: paused; }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
