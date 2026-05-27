import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/* ─── Intersection observer reveal ───────────────────────────────────────── */
function useReveal(threshold = 0.12) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); o.disconnect(); } }, { threshold });
    if (ref.current) o.observe(ref.current);
    return () => o.disconnect();
  }, []);
  return [ref, vis];
}

/* ─── Animated counter ────────────────────────────────────────────────────── */
function Counter({ end, suffix = '', duration = 2000 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const o = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      o.disconnect();
      let t0 = null;
      const step = (ts) => {
        if (!t0) t0 = ts;
        const p = Math.min((ts - t0) / duration, 1);
        setVal(Math.floor((1 - Math.pow(1 - p, 3)) * end));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.5 });
    if (ref.current) o.observe(ref.current);
    return () => o.disconnect();
  }, [end, duration]);
  return <span ref={ref}>{val.toLocaleString('en-IN')}{suffix}</span>;
}

/* ─── SVG leaf logo ───────────────────────────────────────────────────────── */
const Leaf = ({ size = 20, fill = 'white', stroke = '#1A7A4A' }) => (
  <svg viewBox="0 0 20 24" fill="none" style={{ width: size, height: size }}>
    <path d="M10,1 C16,1 19,7 18,13 C17,19 14,22 10,23 C6,22 3,19 2,13 C1,7 4,1 10,1Z" fill={fill} />
    <line x1="10" y1="2" x2="10" y2="22" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
    <line x1="4"  y1="7"  x2="16" y2="7"  stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
    <line x1="4"  y1="11" x2="16" y2="11" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
    <line x1="4"  y1="11" x2="14" y2="20" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

/* ─── Glowing check icon ─────────────────────────────────────────────────── */
const Check = () => (
  <svg viewBox="0 0 16 16" fill="none" style={{ width: 16, height: 16, flexShrink: 0 }}>
    <circle cx="8" cy="8" r="8" fill="#166534" opacity="0.2" />
    <path d="M4.5 8L7 10.5L11.5 5.5" stroke="#4ADE80" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ─── Demo screen: the PayLeef dashboard UI mockup ───────────────────────── */
const STEPS = [
  {
    tab: 'Upload Salaries',
    icon: '📤',
    heading: 'Drop your Excel. Done.',
    body: 'Any column order. Any format. Smart import maps the data automatically.',
    screen: () => (
      <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '.06em' }}>UPLOAD SALARY DATA — MAY 2026</div>
        <div style={{ border: '2px dashed rgba(74,222,128,0.25)', borderRadius: 10, padding: 16, textAlign: 'center', background: 'rgba(74,222,128,0.04)' }}>
          <div style={{ fontSize: 26, marginBottom: 4 }}>📊</div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#E2E8F0' }}>salary_may2026.xlsx</div>
          <div style={{ fontSize: 10, color: '#4ADE80', marginTop: 4, fontWeight: 600 }}>✓ 24 employees detected</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {[['Arjun Sharma', 'Engineering', '₹70,200', true], ['Priya Nair', 'Marketing', '₹52,400', true], ['Karthik M', 'Finance', '₹88,000', true], ['Divya R', 'HR', '₹45,000', true]].map(([n, d, s, ok]) => (
            <div key={n} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 7, border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ fontSize: 11, color: '#CBD5E1' }}>{n} <span style={{ color: '#475569', fontSize: 9 }}>{d}</span></span>
              <span style={{ fontSize: 11, fontWeight: 700, color: ok ? '#4ADE80' : '#FCA5A5' }}>{s}</span>
            </div>
          ))}
          <div style={{ fontSize: 10, color: '#4ADE80', textAlign: 'right', marginTop: 2 }}>+20 more · all clear</div>
        </div>
      </div>
    ),
  },
  {
    tab: 'AI Checks Numbers',
    icon: '🤖',
    heading: 'AI reviews every rupee.',
    body: 'Catches salary spikes, missing deductions, LOP errors — before a single payslip goes out.',
    screen: () => (
      <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '.06em' }}>AI PAYROLL REVIEW</div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#4ADE80', background: 'rgba(74,222,128,0.12)', padding: '3px 8px', borderRadius: 8 }}>SCAN DONE</div>
        </div>
        <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#4ADE80', marginBottom: 3 }}>✓ 23 of 24 employees — all clear</div>
          <div style={{ fontSize: 10, color: '#6EE7B7' }}>No anomalies in salary, PF, ESI or TDS calculations</div>
        </div>
        <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#FCD34D', marginBottom: 3 }}>⚠ Karthik M — salary 28% higher</div>
          <div style={{ fontSize: 10, color: '#FDE68A', marginBottom: 8 }}>Possible bonus not tagged. Please confirm before sending.</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ flex: 1, textAlign: 'center', padding: '5px', borderRadius: 6, border: '1px solid rgba(251,191,36,0.3)', fontSize: 9, color: '#FCD34D', cursor: 'pointer' }}>Review</div>
            <div style={{ flex: 1, textAlign: 'center', padding: '5px', borderRadius: 6, background: 'rgba(251,191,36,0.2)', fontSize: 9, fontWeight: 700, color: '#F59E0B', cursor: 'pointer' }}>Approve</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
          {[['Total Gross', '₹16.4L'], ['Total PF', '₹1.3L'], ['Total TDS', '₹52K']].map(([l, v]) => (
            <div key={l} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 6px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: 8, color: '#64748B', marginBottom: 3 }}>{l}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#E2E8F0' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    tab: 'Generate & Send',
    icon: '🚀',
    heading: 'One click. All inboxes.',
    body: 'Payslip PDFs generated and emailed to every employee. Takes under 2 minutes.',
    screen: () => (
      <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '.06em' }}>SENDING PAYSLIPS — MAY 2026</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#4ADE80' }}>24</div>
            <div style={{ fontSize: 9, color: '#6EE7B7', fontWeight: 600 }}>Payslips ready</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#60A5FA' }}>24</div>
            <div style={{ fontSize: 9, color: '#93C5FD', fontWeight: 600 }}>Emails queued</div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {[
            ['Arjun Sharma', 'Sent ✓', '#4ADE80'],
            ['Priya Nair', 'Sent ✓', '#4ADE80'],
            ['Karthik M', 'Sending…', '#60A5FA'],
            ['Divya R', 'Queued', '#475569'],
          ].map(([n, s, c]) => (
            <div key={n} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 7, border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: 11, color: '#CBD5E1' }}>{n}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: c }}>{s}</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 'auto', padding: '10px', background: 'linear-gradient(135deg,#1A7A4A,#15653E)', borderRadius: 10, textAlign: 'center', fontSize: 12, fontWeight: 700, color: 'white', cursor: 'pointer' }}>
          🚀 Send All 24 Payslips Now
        </div>
      </div>
    ),
  },
  {
    tab: 'Employee Portal',
    icon: '🔐',
    heading: 'Employees self-serve.',
    body: 'Each employee logs in to download payslips and ask the AI about their pay.',
    screen: () => (
      <div style={{ padding: '20px 18px', display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#1A7A4A,#15653E)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>👤</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#E2E8F0' }}>Arjun Sharma</div>
            <div style={{ fontSize: 9, color: '#475569' }}>Senior Engineer · EMP-001</div>
          </div>
          <div style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, color: '#A78BFA', background: 'rgba(167,139,250,0.12)', padding: '3px 8px', borderRadius: 8 }}>AI ✨</div>
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#64748B', letterSpacing: '.06em' }}>MY PAYSLIPS</div>
        {[['May 2026', '₹70,200', true], ['Apr 2026', '₹70,200', false], ['Mar 2026', '₹68,500', false]].map(([m, n, isNew]) => (
          <div key={m} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: isNew ? '1px solid rgba(74,222,128,0.2)' : '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: isNew ? 700 : 500, color: isNew ? '#E2E8F0' : '#94A3B8' }}>{m} {isNew && <span style={{ fontSize: 9, color: '#4ADE80', fontWeight: 700 }}>NEW</span>}</div>
              <div style={{ fontSize: 10, color: '#475569' }}>Net: {n}</div>
            </div>
            <div style={{ fontSize: 9, padding: '4px 10px', borderRadius: 6, background: 'rgba(96,165,250,0.12)', color: '#60A5FA', fontWeight: 600, cursor: 'pointer' }}>⬇ PDF</div>
          </div>
        ))}
        <div style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 10, padding: 10 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#A78BFA', marginBottom: 4 }}>✨ Ask AI about your pay</div>
          <div style={{ fontSize: 10, color: '#C4B5FD', fontStyle: 'italic', marginBottom: 6 }}>"Why is my TDS different this month?"</div>
          <div style={{ fontSize: 10, color: '#DDD6FE', background: 'rgba(255,255,255,0.05)', borderRadius: 6, padding: '6px 8px' }}>Your TDS rose because your projected annual income crossed ₹5L this quarter…</div>
        </div>
      </div>
    ),
  },
];

/* ─── Main demo component ────────────────────────────────────────────────── */
function DemoShowcase() {
  const [active, setActive] = useState(0);
  const [fading, setFading] = useState(false);
  const timerRef = useRef(null);

  const go = (i) => {
    if (i === active) return;
    setFading(true);
    setTimeout(() => { setActive(i); setFading(false); }, 180);
  };

  const resetAuto = (i) => {
    clearInterval(timerRef.current);
    go(i);
    timerRef.current = setInterval(() => setActive(p => { const n = (p + 1) % STEPS.length; setFading(true); setTimeout(() => setFading(false), 180); return n; }), 5000);
  };

  useEffect(() => {
    timerRef.current = setInterval(() => setActive(p => { const n = (p + 1) % STEPS.length; setFading(true); setTimeout(() => setFading(false), 180); return n; }), 5000);
    return () => clearInterval(timerRef.current);
  }, []);

  const step = STEPS[active];
  const Screen = step.screen;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }}>
      {/* Left: text + tabs */}
      <div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 36 }}>
          {STEPS.map((s, i) => (
            <button key={i} onClick={() => resetAuto(i)} style={{
              padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
              background: active === i ? '#1A7A4A' : 'rgba(255,255,255,0.06)',
              color: active === i ? 'white' : 'rgba(255,255,255,0.5)',
              transition: 'all 0.2s',
            }}>
              {s.icon} {s.tab}
            </button>
          ))}
        </div>
        <div style={{ opacity: fading ? 0 : 1, transform: fading ? 'translateY(6px)' : 'translateY(0)', transition: 'all 0.18s' }}>
          <h3 style={{ fontSize: 'clamp(22px,3vw,32px)', fontWeight: 800, color: 'white', margin: '0 0 14px', lineHeight: 1.2, letterSpacing: '-0.02em' }}>{step.heading}</h3>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7, margin: '0 0 32px' }}>{step.body}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {STEPS.map((_, i) => (
            <button key={i} onClick={() => resetAuto(i)} style={{ width: active === i ? 32 : 8, height: 8, borderRadius: 4, border: 'none', cursor: 'pointer', background: active === i ? '#4ADE80' : 'rgba(255,255,255,0.15)', transition: 'all 0.3s' }} />
          ))}
        </div>
      </div>

      {/* Right: app mockup */}
      <div style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#0D1B2E', boxShadow: '0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)' }}>
        {/* Browser bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px', background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF5F57' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FFBD2E' }} />
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#28C840' }} />
          <div style={{ flex: 1, height: 18, background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginLeft: 6, display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>app.payleef.in</span>
          </div>
        </div>
        {/* App layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr', minHeight: 340 }}>
          {/* Sidebar */}
          <div style={{ background: 'rgba(0,0,0,0.2)', borderRight: '1px solid rgba(255,255,255,0.05)', padding: '12px 6px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}><Leaf size={18} fill="white" stroke="#4ADE80" /></div>
            {[['📊', 0], ['👥', 0], ['📤', 0], ['🤖', 1], ['🚀', 2], ['🔐', 3]].map(([icon, step], idx) => (
              <div key={idx} style={{ width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, margin: '0 auto', background: step === active ? 'rgba(26,122,74,0.35)' : 'transparent', border: step === active ? '1px solid rgba(74,222,128,0.25)' : '1px solid transparent' }}>{icon}</div>
            ))}
          </div>
          {/* Screen */}
          <div style={{ opacity: fading ? 0 : 1, transition: 'opacity 0.18s' }}>
            <Screen />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Feature card ───────────────────────────────────────────────────────── */
function FeatureCard({ icon, title, desc, glow }) {
  const [ref, vis] = useReveal();
  return (
    <div ref={ref} style={{
      padding: '28px 24px', borderRadius: 18, border: '1px solid rgba(255,255,255,0.07)',
      background: 'rgba(255,255,255,0.03)',
      backdropFilter: 'blur(8px)',
      position: 'relative', overflow: 'hidden',
      opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(20px)',
      transition: 'all 0.5s ease',
    }}>
      {glow && <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle, ${glow}18 0%, transparent 70%)`, pointerEvents: 'none' }} />}
      <div style={{ fontSize: 28, marginBottom: 16 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: 'white', marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>{desc}</div>
    </div>
  );
}

/* ─── Pricing card ───────────────────────────────────────────────────────── */
function PricingCard({ plan, monthly, yearly, period, features, cta, best, navigate }) {
  const [ref, vis] = useReveal();
  return (
    <div ref={ref} style={{
      padding: '32px 28px', borderRadius: 20, position: 'relative',
      border: best ? '1px solid rgba(74,222,128,0.35)' : '1px solid rgba(255,255,255,0.08)',
      background: best ? 'rgba(26,122,74,0.12)' : 'rgba(255,255,255,0.03)',
      backdropFilter: 'blur(10px)',
      boxShadow: best ? '0 0 40px rgba(74,222,128,0.08)' : 'none',
      opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(24px)',
      transition: 'all 0.5s ease',
    }}>
      {best && <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: '#1A7A4A', color: '#4ADE80', fontSize: 10, fontWeight: 800, padding: '3px 14px', borderRadius: 20, letterSpacing: '.06em', whiteSpace: 'nowrap' }}>MOST POPULAR</div>}
      <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '.08em', marginBottom: 8 }}>{plan.toUpperCase()}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
        <span style={{ fontSize: 40, fontWeight: 900, color: 'white' }}>{monthly}</span>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>{period}</span>
      </div>
      {yearly && <div style={{ fontSize: 12, color: '#4ADE80', marginBottom: 20, fontWeight: 600 }}>{yearly}</div>}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '20px 0' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
        {features.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Check />
            <span style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.7)' }}>{f}</span>
          </div>
        ))}
      </div>
      <button onClick={() => navigate('/register')} style={{
        width: '100%', padding: '13px', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer', border: 'none',
        background: best ? '#1A7A4A' : 'rgba(255,255,255,0.07)',
        color: best ? 'white' : 'rgba(255,255,255,0.8)',
        transition: 'all 0.2s',
      }}
        onMouseOver={e => e.currentTarget.style.background = best ? '#15653E' : 'rgba(255,255,255,0.12)'}
        onMouseOut={e => e.currentTarget.style.background = best ? '#1A7A4A' : 'rgba(255,255,255,0.07)'}
      >{cta}</button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const DARK = '#050E1B';
  const G    = '#1A7A4A';

  /* marquee data */
  const industries = ['🏭 Manufacturing', '🏥 Healthcare', '🛒 Retail & FMCG', '💼 IT Services', '🏗️ Construction', '🚚 Logistics', '🏫 Schools & Colleges', '🏨 Hotels & Hospitality', '📦 E-commerce', '⚙️ Engineering', '🧪 Pharma', '🏦 Finance & NBFC'];

  return (
    <div style={{ fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif", background: DARK, color: 'white', overflowX: 'hidden' }}>

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        background: scrolled ? 'rgba(5,14,27,0.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : 'none',
        transition: 'all 0.3s',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => navigate('/')}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Leaf size={18} />
            </div>
            <span style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-0.04em' }}>Pay<span style={{ color: '#4ADE80' }}>Leef</span></span>
          </div>

          {/* Links */}
          <div className="nav-links" style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
            {[['Features', '#features'], ['How it works', '#how'], ['Pricing', '#pricing']].map(([l, h]) => (
              <a key={l} href={h} style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.55)', textDecoration: 'none', fontWeight: 500, transition: 'color 0.2s' }}
                onMouseOver={e => e.target.style.color = 'white'} onMouseOut={e => e.target.style.color = 'rgba(255,255,255,0.55)'}>{l}</a>
            ))}
          </div>

          {/* CTA */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => navigate('/login')} style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.6)', background: 'none', border: 'none', cursor: 'pointer', padding: '7px 14px', borderRadius: 8 }}>Sign in</button>
            <button onClick={() => navigate('/register')} style={{
              fontSize: 13.5, fontWeight: 700, color: 'white', background: G, border: 'none', borderRadius: 9, cursor: 'pointer', padding: '9px 20px',
              boxShadow: '0 0 20px rgba(26,122,74,0.4)',
            }}>Start free trial →</button>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '130px 24px 80px', position: 'relative', overflow: 'hidden' }}>

        {/* Background orbs */}
        <div style={{ position: 'absolute', top: '20%', left: '15%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,122,74,0.18) 0%, transparent 65%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.1) 0%, transparent 65%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 900, height: 900, borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,122,74,0.06) 0%, transparent 60%)', filter: 'blur(80px)', pointerEvents: 'none' }} />

        {/* Grid overlay */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '72px 72px', pointerEvents: 'none' }} />

        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 20, padding: '6px 18px', marginBottom: 32 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 10px #4ADE80' }} />
          <span style={{ fontSize: 13, color: '#4ADE80', fontWeight: 600, letterSpacing: '.02em' }}>Payroll software · Built for India · GST & PF ready</span>
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: 'clamp(40px,6.5vw,80px)', fontWeight: 900, lineHeight: 1.0, letterSpacing: '-0.035em', margin: '0 0 28px', maxWidth: 820 }}>
          <span style={{ color: 'white' }}>Stop doing payroll</span><br />
          <span style={{
            background: 'linear-gradient(135deg, #4ADE80 0%, #22C55E 40%, #86EFAC 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>manually.</span>
        </h1>

        <p style={{ fontSize: 'clamp(16px,2vw,20px)', color: 'rgba(255,255,255,0.5)', maxWidth: 560, lineHeight: 1.75, margin: '0 0 48px' }}>
          Upload your salary sheet, AI reviews every number, one click sends payslips to all employees. Under 3 minutes, every month.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 60 }}>
          <button onClick={() => navigate('/register')} style={{
            background: 'linear-gradient(135deg, #1A7A4A 0%, #15653E 100%)',
            color: 'white', border: 'none', borderRadius: 14, padding: '15px 32px',
            fontSize: 16, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 30px rgba(26,122,74,0.5), 0 0 0 1px rgba(74,222,128,0.1)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
            onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 40px rgba(26,122,74,0.6), 0 0 0 1px rgba(74,222,128,0.15)'; }}
            onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 30px rgba(26,122,74,0.5), 0 0 0 1px rgba(74,222,128,0.1)'; }}
          >
            Start Free Trial — 30 Days Free →
          </button>
          <a href="#demo" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, textDecoration: 'none',
            color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)', borderRadius: 14, padding: '15px 28px',
            fontSize: 16, fontWeight: 500, transition: 'all 0.2s',
          }}
            onMouseOver={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
            onMouseOut={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
          >
            <svg viewBox="0 0 14 16" fill="none" style={{ width: 11, height: 11 }}><path d="M1 1L13 8L1 15V1Z" fill="currentColor" /></svg>
            See how it works
          </a>
        </div>

        {/* Trust strip */}
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', letterSpacing: '.02em' }}>
          No credit card &nbsp;·&nbsp; Cancel anytime &nbsp;·&nbsp; Data stays in India &nbsp;·&nbsp; 30-day free trial
        </p>

        {/* Hero UI card */}
        <div style={{ marginTop: 64, position: 'relative', maxWidth: 460, width: '100%', zIndex: 2 }}>
          {/* Glow behind card */}
          <div style={{ position: 'absolute', inset: -40, borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,122,74,0.25) 0%, transparent 60%)', filter: 'blur(30px)', zIndex: 0 }} />
          {/* Payslip card */}
          <div style={{ position: 'relative', zIndex: 1, background: 'rgba(13,27,46,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: '20px 22px', backdropFilter: 'blur(20px)', boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 3, letterSpacing: '.06em' }}>PAYSLIP · MAY 2026</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>Arjun Sharma</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Senior Engineer · EMP-001</div>
              </div>
              <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 8, padding: '5px 10px', fontSize: 11, color: '#4ADE80', fontWeight: 700 }}>✓ Sent</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: '12px 14px', marginBottom: 14 }}>
              {[['Basic Salary', '₹45,000'], ['HRA', '₹18,000'], ['Special Allowance', '₹12,500']].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                  <span style={{ color: 'rgba(255,255,255,0.45)' }}>{l}</span>
                  <span style={{ color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>{v}</span>
                </div>
              ))}
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'white' }}>Net Pay</span>
                <span style={{ fontSize: 16, fontWeight: 900, color: '#4ADE80' }}>₹70,200</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)', borderRadius: 8, padding: '7px 0', textAlign: 'center', fontSize: 10, color: '#4ADE80', fontWeight: 700 }}>🤖 AI Verified</div>
              <div style={{ flex: 1, background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.15)', borderRadius: 8, padding: '7px 0', textAlign: 'center', fontSize: 10, color: '#60A5FA', fontWeight: 700 }}>📧 Email Sent</div>
              <div style={{ flex: 1, background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.15)', borderRadius: 8, padding: '7px 0', textAlign: 'center', fontSize: 10, color: '#A78BFA', fontWeight: 700 }}>⬇ PDF Ready</div>
            </div>
          </div>
          {/* Floating badge — time */}
          <div style={{ position: 'absolute', top: -16, right: -20, background: 'rgba(13,27,46,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: '8px 14px', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 18 }}>⚡</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>2 min 14s</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>Full payroll done</div>
            </div>
          </div>
          {/* Floating badge — AI */}
          <div style={{ position: 'absolute', bottom: 20, left: -24, background: 'rgba(13,27,46,0.95)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 12, padding: '8px 14px', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 18 }}>🤖</div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#4ADE80' }}>0 errors found</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>AI scan complete</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── INDUSTRY MARQUEE ─────────────────────────────────────────────── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '18px 0', overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 80, background: `linear-gradient(to right, ${DARK}, transparent)`, zIndex: 2, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, background: `linear-gradient(to left, ${DARK}, transparent)`, zIndex: 2, pointerEvents: 'none' }} />
        <div className="marquee-track" style={{ display: 'flex', width: 'max-content', animation: 'marquee 28s linear infinite' }}>
          {[...industries, ...industries].map((item, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginRight: 40, fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: 500, whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: 16 }}>{item.split(' ')[0]}</span>
              {item.split(' ').slice(1).join(' ')}
            </span>
          ))}
        </div>
      </div>

      {/* ── HOW IT WORKS / DEMO ──────────────────────────────────────────── */}
      <section id="demo" style={{ padding: '100px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div id="how" style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#4ADE80', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 14 }}>See it in action</div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
              Full payroll in <span style={{ color: '#4ADE80' }}>under 3 minutes.</span>
            </h2>
            <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', maxWidth: 500, margin: '0 auto' }}>
              Click each step to see exactly how PayLeef works — from upload to employee inbox.
            </p>
          </div>
          <DemoShowcase />
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: '80px 24px 100px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#4ADE80', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 14 }}>Features</div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 800, margin: 0, letterSpacing: '-0.025em' }}>Everything HR needs. Nothing extra.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            <FeatureCard icon="🤖" title="AI Anomaly Detection" glow="#4ADE80" desc="Before any payslip goes out, AI scans every number. Catches salary spikes, duplicate entries, and missing deductions automatically." />
            <FeatureCard icon="📊" title="Smart Salary Import" glow="#60A5FA" desc="Drop your Excel or CSV — any format, any column order. The importer figures it out. Or type directly in the built-in grid." />
            <FeatureCard icon="📧" title="Instant Email Delivery" glow="#F472B6" desc="One click sends PDF payslips to every employee email. Connect Gmail or Outlook in 2 minutes — no tech knowledge needed." />
            <FeatureCard icon="🏛️" title="India Compliance Built-in" glow="#FBBF24" desc="PF, ESI, TDS, PT, LOP — all deduction rules baked in. Set your config once, it applies correctly every month." />
            <FeatureCard icon="👤" title="Employee Self-Service" glow="#A78BFA" desc="Every employee gets a secure login. They download their payslips and ask an AI about their pay — reducing HR queries to zero." />
            <FeatureCard icon="📑" title="Form 16 & Reports" glow="#34D399" desc="Generate Form 16 Part B, Salary Register, PF ECR, ESI returns and bank advice — all in one click, ready to submit." />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#4ADE80', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 14 }}>How it works</div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, margin: 0, letterSpacing: '-0.025em' }}>3 steps. Every month.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 32 }}>
            {[
              { n: '01', icon: '📤', title: 'Upload salary data', desc: 'Drop your Excel or CSV file, or type directly in the built-in editor. Smart import maps any format automatically.' },
              { n: '02', icon: '🤖', title: 'AI reviews everything', desc: 'Payroll engine calculates PF, TDS, and LOP. AI scans for errors. You review a clean summary before anything goes out.' },
              { n: '03', icon: '🚀', title: 'Send with one click', desc: 'All payslips generated as PDF and emailed to employees. Self-service portal updated. Done in under 3 minutes.' },
            ].map((s, i) => {
              const [ref, vis] = useReveal();
              return (
                <div key={i} ref={ref} style={{ textAlign: 'center', opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(20px)', transition: `all 0.5s ease ${i * 0.1}s` }}>
                  <div style={{ width: 60, height: 60, borderRadius: 16, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 20px' }}>{s.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.25)', letterSpacing: '.1em', marginBottom: 8 }}>STEP {s.n}</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: 'white', marginBottom: 10 }}>{s.title}</div>
                  <div style={{ fontSize: 13.5, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>{s.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── WHY PAYLEEF ──────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#4ADE80', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 14 }}>Why PayLeef</div>
            <h2 style={{ fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 800, color: 'white', lineHeight: 1.2, letterSpacing: '-0.02em', margin: '0 0 20px' }}>
              Built for Indian HR teams. Not adapted.
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', lineHeight: 1.75, marginBottom: 32 }}>
              Most payroll software was built for the US or UK and awkwardly adapted for India. PayLeef was designed from scratch for Indian statutory rules, Indian business sizes, and Indian HR workflows.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {['PF, ESI, TDS, PT — all baked in, not bolted on', 'New employee set up in under 30 seconds', 'Handles LOP, bonus, overtime per employee', 'Payslips in English — or customize with your branding', 'Works for 5 employees or 500 employees, same software'].map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ marginTop: 1, flexShrink: 0 }}><Check /></div>
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.55 }}>{p}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { icon: '🇮🇳', title: 'Built for India', sub: 'PF, ESI, TDS, PT', c: '#4ADE80' },
              { icon: '⚡', title: 'Fast setup', sub: 'Same-day onboarding', c: '#FBBF24' },
              { icon: '🔒', title: 'Secure', sub: 'Data stays in India', c: '#60A5FA' },
              { icon: '🤖', title: 'AI-powered', sub: 'Real payroll intelligence', c: '#A78BFA' },
              { icon: '📧', title: 'Direct email', sub: 'No third-party portals', c: '#F472B6' },
              { icon: '📈', title: 'Scales with you', sub: '5 to 500 employees', c: '#34D399' },
            ].map((c, i) => {
              const [ref, vis] = useReveal();
              return (
                <div key={i} ref={ref} style={{ padding: '18px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.02)', opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(14px)', transition: `all 0.4s ease ${i * 0.06}s` }}>
                  <div style={{ fontSize: 22, marginBottom: 8 }}>{c.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 3 }}>{c.title}</div>
                  <div style={{ fontSize: 11, color: c.c, fontWeight: 500 }}>{c.sub}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: '80px 24px 100px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#4ADE80', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 14 }}>Pricing</div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.025em' }}>Simple. Transparent. No surprises.</h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', margin: 0 }}>Start with a 30-day free trial. No credit card needed.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            <PricingCard navigate={navigate} plan="Starter" monthly="₹499" period="/month" cta="Start free trial"
              features={['Up to 25 employees', 'PDF payslips', 'Email delivery', 'PF & TDS calculations', '30-day free trial']} />
            <PricingCard navigate={navigate} plan="Pro" monthly="₹999" yearly="Save ₹2,400 with annual plan" period="/month" highlight best cta="Start free trial"
              features={['Up to 100 employees', 'AI anomaly detection', 'Employee self-service portal', 'Form 16 & compliance reports', 'Custom email branding', 'Priority support']} />
            <PricingCard navigate={navigate} plan="Enterprise" monthly="Custom" period="" cta="Contact us"
              features={['Unlimited employees', 'Multi-company support', 'API access', 'White-label option', 'Dedicated account manager', 'SLA guarantee']} />
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px 100px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 700, height: 700, borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,122,74,0.15) 0%, transparent 60%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 620, margin: '0 auto' }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🚀</div>
          <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, margin: '0 0 18px', letterSpacing: '-0.03em', lineHeight: 1.1 }}>
            Ready to <span style={{ color: '#4ADE80' }}>fix payroll</span> forever?
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.45)', marginBottom: 40, lineHeight: 1.7 }}>
            Start your free trial today. No credit card. No commitment. Your first payroll run in under 10 minutes.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/register')} style={{
              background: 'linear-gradient(135deg, #1A7A4A, #15653E)', color: 'white', border: 'none',
              borderRadius: 14, padding: '15px 36px', fontSize: 16, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 30px rgba(26,122,74,0.5)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 40px rgba(26,122,74,0.65)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 30px rgba(26,122,74,0.5)'; }}
            >
              Start Free Trial →
            </button>
            <button onClick={() => navigate('/login')} style={{ color: 'rgba(255,255,255,0.6)', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '15px 28px', fontSize: 16, fontWeight: 500, cursor: 'pointer' }}>
              Sign in
            </button>
          </div>
          <p style={{ marginTop: 24, fontSize: 13, color: 'rgba(255,255,255,0.2)' }}>30 days free · No credit card · Cancel anytime</p>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '48px 24px 32px', background: 'rgba(0,0,0,0.3)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 40 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Leaf size={17} /></div>
                <span style={{ fontSize: 16, fontWeight: 900, letterSpacing: '-0.04em' }}>Pay<span style={{ color: '#4ADE80' }}>Leef</span></span>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', lineHeight: 1.7, maxWidth: 240, margin: 0 }}>
                Payroll software built specifically for Indian businesses. Simple, accurate, automatic.
              </p>
            </div>
            {[
              { h: 'Product', links: ['Features', 'Pricing', 'AI Detection', 'Employee Portal', 'Form 16'] },
              { h: 'Company', links: ['About', 'Blog', 'Contact'] },
              { h: 'Legal', links: ['Privacy Policy', 'Terms of Service', 'Security'] },
            ].map(col => (
              <div key={col.h}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: 16 }}>{col.h}</div>
                {col.links.map(l => (
                  <div key={l} style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginBottom: 10, cursor: 'pointer', transition: 'color 0.2s' }}
                    onMouseOver={e => e.target.style.color = 'white'} onMouseOut={e => e.target.style.color = 'rgba(255,255,255,0.35)'}>{l}</div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', margin: 0 }}>© 2026 PayLeef. All rights reserved.</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', margin: 0 }}>
              Built by <a href="https://www.dinmind.com" target="_blank" rel="noopener noreferrer" style={{ color: '#4ADE80', textDecoration: 'none', fontWeight: 600 }}>DinMind Infotech</a>
            </p>
          </div>
        </div>
      </footer>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        @media (max-width: 768px) {
          .nav-links { display: none !important; }
        }
        @keyframes marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .marquee-track:hover { animation-play-state: paused; }
      `}</style>
    </div>
  );
}
