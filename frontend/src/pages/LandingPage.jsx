import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

/* ─── Animated number counter ─────────────────────────────────────────────── */
function useCounter(end, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      obs.disconnect();
      let startTime = null;
      const step = (ts) => {
        if (!startTime) startTime = ts;
        const p = Math.min((ts - startTime) / duration, 1);
        const ease = 1 - Math.pow(1 - p, 3);
        setCount(Math.floor(ease * end));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end, duration]);
  return [count, ref];
}

/* ─── Scroll-reveal hook ──────────────────────────────────────────────────── */
function useReveal() {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.15 });
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

/* ─── Payslip card mockup (used in hero) ──────────────────────────────────── */
function PayslipCard({ style }) {
  return (
    <div style={{
      background: 'white', borderRadius: 16, boxShadow: '0 24px 80px rgba(0,0,0,0.18)',
      padding: '22px 24px', width: 300, ...style,
    }}>
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
        {[
          { l: 'Basic Salary', v: '₹45,000' },
          { l: 'HRA', v: '₹18,000' },
          { l: 'Special Allowance', v: '₹12,500' },
        ].map(r => (
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

/* ─── Floating badge (hero decoration) ───────────────────────────────────── */
function FloatBadge({ icon, text, sub, style }) {
  return (
    <div style={{
      position: 'absolute', background: 'white', borderRadius: 14,
      padding: '10px 16px', boxShadow: '0 12px 40px rgba(0,0,0,0.14)',
      display: 'flex', alignItems: 'center', gap: 10, ...style,
    }}>
      <div style={{ fontSize: 22 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', lineHeight: 1 }}>{text}</div>
        <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

/* ─── Bento feature card ──────────────────────────────────────────────────── */
function BentoCard({ icon, title, desc, accent = '#1A7A4A', bg = '#F0FDF4', span = 1, tall = false, children }) {
  const [ref, vis] = useReveal();
  return (
    <div
      ref={ref}
      style={{
        gridColumn: `span ${span}`,
        background: 'white',
        border: '1px solid #E2E8F0',
        borderRadius: 20,
        padding: '28px 28px 24px',
        minHeight: tall ? 320 : 220,
        overflow: 'hidden',
        position: 'relative',
        opacity: vis ? 1 : 0,
        transform: vis ? 'translateY(0)' : 'translateY(24px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}
    >
      <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 16 }}>
        {icon}
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13.5, color: '#64748B', lineHeight: 1.6, marginBottom: 16 }}>{desc}</div>
      {children}
    </div>
  );
}

/* ─── Step indicator ──────────────────────────────────────────────────────── */
function StepRow({ num, text }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#15803D', flexShrink: 0, marginTop: 1 }}>{num}</div>
      <div style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.55 }}>{text}</div>
    </div>
  );
}

/* ─── Pricing card ────────────────────────────────────────────────────────── */
function PricingCard({ plan, price, period, features, cta, highlight, navigate }) {
  return (
    <div style={{
      border: highlight ? '2px solid #1A7A4A' : '1px solid #E2E8F0',
      borderRadius: 20,
      padding: '32px 28px',
      background: highlight ? '#F0FDF4' : 'white',
      position: 'relative',
    }}>
      {highlight && (
        <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: '#1A7A4A', color: 'white', fontSize: 11, fontWeight: 700, padding: '4px 16px', borderRadius: 20 }}>
          MOST POPULAR
        </div>
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
              <svg viewBox="0 0 12 12" fill="none" style={{ width: 8, height: 8 }}>
                <path d="M2 6L5 9L10 3" stroke="#16A34A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span style={{ fontSize: 13.5, color: '#374151' }}>{f}</span>
          </div>
        ))}
      </div>
      <button
        onClick={() => navigate('/register')}
        style={{
          width: '100%', padding: '13px 0', borderRadius: 12, cursor: 'pointer',
          background: highlight ? '#1A7A4A' : 'transparent',
          border: highlight ? 'none' : '1.5px solid #1A7A4A',
          color: highlight ? 'white' : '#1A7A4A',
          fontSize: 14, fontWeight: 700,
        }}
      >
        {cta}
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                            */
/* ═══════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [emp, empRef] = useCounter(2800);
  const [comp, compRef] = useCounter(150);
  const [time, timeRef] = useCounter(80);
  const [acc, accRef] = useCounter(100);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const G = '#1A7A4A';
  const GD = '#15653E';

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
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(26,122,74,0.3)' }}>
              <LeafMark size={20} />
            </div>
            <div style={{ lineHeight: 1 }}>
              <span style={{ fontSize: 18, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.04em' }}>Pay</span>
              <span style={{ fontSize: 18, fontWeight: 900, color: G, letterSpacing: '-0.04em' }}>Leef</span>
            </div>
          </div>

          {/* Nav links — desktop */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }} className="hide-mobile">
            {['Features', 'How it works', 'Pricing', 'For HR Teams'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`} style={{ fontSize: 14, color: '#374151', textDecoration: 'none', fontWeight: 500 }}
                onMouseOver={e => e.target.style.color = G}
                onMouseOut={e => e.target.style.color = '#374151'}>{l}</a>
            ))}
          </div>

          {/* CTA buttons */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={() => navigate('/login')} style={{ fontSize: 14, fontWeight: 600, color: '#374151', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 16px' }}>
              Sign in
            </button>
            <button onClick={() => navigate('/register')} style={{ fontSize: 14, fontWeight: 700, color: 'white', background: G, border: 'none', borderRadius: 10, cursor: 'pointer', padding: '9px 20px', boxShadow: '0 2px 12px rgba(26,122,74,0.3)' }}>
              Start free trial
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: '100vh',
        background: 'linear-gradient(160deg, #0A1628 0%, #0D2137 40%, #0A2E1A 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        textAlign: 'center',
        padding: '120px 24px 80px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background grid */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.07,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />

        {/* Glow blobs */}
        <div style={{ position: 'absolute', top: '15%', left: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(26,122,74,0.25) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '8%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(56,189,248,0.15) 0%, transparent 70%)', filter: 'blur(40px)' }} />

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(26,122,74,0.2)', border: '1px solid rgba(74,222,128,0.3)',
          borderRadius: 20, padding: '6px 16px', marginBottom: 28,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80', boxShadow: '0 0 8px #4ADE80' }} />
          <span style={{ fontSize: 13, color: '#4ADE80', fontWeight: 600 }}>Built for Indian businesses · GST & PF Ready</span>
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.03em', margin: '0 0 24px', maxWidth: 800 }}>
          <span style={{ color: 'white' }}>Payroll that</span>
          <br />
          <span style={{ background: 'linear-gradient(135deg, #4ADE80 0%, #22C55E 50%, #86EFAC 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            runs itself.
          </span>
        </h1>

        {/* Sub */}
        <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'rgba(255,255,255,0.65)', maxWidth: 560, lineHeight: 1.7, margin: '0 0 44px' }}>
          Upload salaries, generate payslips, send by email — all in under 3 minutes.
          AI catches errors before they reach your employees.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 64 }}>
          <button onClick={() => navigate('/register')} style={{
            background: 'linear-gradient(135deg, #1A7A4A, #15653E)',
            color: 'white', border: 'none', borderRadius: 14, padding: '15px 32px',
            fontSize: 16, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 24px rgba(26,122,74,0.5)',
          }}>
            Start free — 30 days trial →
          </button>
          <button onClick={() => navigate('/login')} style={{
            background: 'rgba(255,255,255,0.08)', color: 'white',
            border: '1px solid rgba(255,255,255,0.2)', borderRadius: 14, padding: '15px 28px',
            fontSize: 16, fontWeight: 600, cursor: 'pointer',
          }}>
            Sign in
          </button>
        </div>

        {/* Floating payslip card + badges */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 20 }}>
          <PayslipCard style={{ position: 'relative', zIndex: 2 }} />
          <FloatBadge icon="🤖" text="AI checked" sub="No anomalies found" style={{ top: -18, right: -120, zIndex: 3 }} />
          <FloatBadge icon="✉️" text="47 sent" sub="All employees notified" style={{ bottom: 40, left: -130, zIndex: 3 }} />
          <FloatBadge icon="⚡" text="2 min 14s" sub="Full payroll done" style={{ bottom: -16, right: -100, zIndex: 3 }} />
        </div>

        {/* Trust note */}
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', marginTop: 32 }}>
          No credit card needed · Cancel anytime · Data stays in India
        </p>
      </section>

      {/* ── STATS BAND ────────────────────────────────────────────────────── */}
      <section style={{ background: '#0F172A', padding: '48px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, textAlign: 'center' }}>
          {[
            { ref: empRef, val: emp, suffix: '+', label: 'Employees on payroll' },
            { ref: compRef, val: comp, suffix: '+', label: 'Companies trust PayLeef' },
            { ref: timeRef, val: time, suffix: '%', label: 'Time saved vs manual' },
            { ref: accRef, val: acc, suffix: '%', label: 'Payroll accuracy' },
          ].map((s, i) => (
            <div key={i} ref={s.ref}>
              <div style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, color: '#4ADE80', lineHeight: 1 }}>
                {s.val.toLocaleString('en-IN')}{s.suffix}
              </div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES BENTO GRID ───────────────────────────────────────────── */}
      <section id="features" style={{ padding: '100px 24px', background: '#F8FAFC' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: G, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Everything you need</div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
              One tool. Zero payroll stress.
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>

            {/* Big card — AI */}
            <BentoCard span={2} tall icon="🤖" title="AI Anomaly Detection" accent={G} bg="#F0FDF4"
              desc="Before payslips go out, AI scans every number. Duplicate entries, sudden salary spikes, missing deductions — caught automatically. No more employee complaints about wrong pay.">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {['Duplicate detection', 'Salary spike alert', 'PF mismatch check', 'Instant report'].map(t => (
                  <span key={t} style={{ fontSize: 11, fontWeight: 600, color: '#15803D', background: '#DCFCE7', padding: '4px 10px', borderRadius: 20 }}>{t}</span>
                ))}
              </div>
            </BentoCard>

            {/* Small card — Speed */}
            <BentoCard icon="⚡" title="Done in minutes" bg="#FEF9C3" accent="#CA8A04"
              desc="Upload CSV or Excel, review, generate, send. Your entire monthly payroll in under 5 minutes — not 5 hours.">
              <div style={{ background: '#FEF3C7', borderRadius: 10, padding: '12px 14px', marginTop: 8 }}>
                <div style={{ fontSize: 11, color: '#92400E', fontWeight: 600, marginBottom: 4 }}>AVG TIME SAVED</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#78350F' }}>4.5 hrs</div>
                <div style={{ fontSize: 11, color: '#B45309' }}>per payroll cycle</div>
              </div>
            </BentoCard>

            {/* Small card — Email */}
            <BentoCard icon="📧" title="Instant email delivery" bg="#EFF6FF" accent="#2563EB"
              desc="Payslips delivered to every employee automatically. Custom SMTP setup takes 2 minutes with our step-by-step guide.">
              <div style={{ marginTop: 8 }}>
                <StepRow num="1" text="Connect your Gmail or Outlook" />
                <StepRow num="2" text="Click Generate & Send" />
                <StepRow num="3" text="Done — all inboxes reached" />
              </div>
            </BentoCard>

            {/* Big card — Import */}
            <BentoCard span={2} icon="📊" title="Smart data import — any format" bg="#F5F3FF" accent="#7C3AED"
              desc="Upload Excel, CSV — even if columns are in the wrong order or some cells are empty. Our smart importer figures it out. Or type directly in the built-in spreadsheet editor.">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
                {[
                  { icon: '📄', label: '.CSV files', desc: 'Any separator' },
                  { icon: '📊', label: '.XLSX files', desc: 'Multi-sheet OK' },
                  { icon: '✏️', label: 'Type directly', desc: 'Built-in editor' },
                  { icon: '🧠', label: 'Smart mapping', desc: 'AI column match' },
                ].map(c => (
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

            {/* Small — PDF */}
            <BentoCard icon="📑" title="Professional PDF payslips" bg="#FFF1F2" accent="#E11D48"
              desc="Clean, branded payslip PDFs with your company logo. Employees can download anytime from their self-service portal.">
            </BentoCard>

            {/* Small — Compliance */}
            <BentoCard icon="🏛️" title="India compliance built-in" bg="#ECFDF5" accent={G}
              desc="PF, ESI, TDS, PT — all deduction rules baked in. Payroll config lets you set slabs once, apply everywhere.">
            </BentoCard>

            {/* Big — Employee portal */}
            <BentoCard span={2} icon="👤" title="Employee self-service portal" bg="#F0F9FF" accent="#0284C7"
              desc="Every employee gets their own secure login. They can view all their payslips, download PDFs, and even chat with an AI assistant about their pay — reducing HR queries to zero.">
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
            <h2 style={{ fontSize: 'clamp(28px,4vw,42px)', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
              3 steps. Every month.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 32 }}>
            {[
              { num: '01', icon: '📤', color: '#F0FDF4', title: 'Upload salary data', desc: 'Drop your Excel or CSV file. Or type directly in our built-in grid editor. Smart import handles messy columns automatically.' },
              { num: '02', icon: '⚙️', color: '#EFF6FF', title: 'AI reviews everything', desc: 'Payroll engine calculates PF, TDS, LOP. AI scans for anomalies. You review a clean summary before anything goes out.' },
              { num: '03', icon: '🚀', color: '#FEF9C3', title: 'Send with one click', desc: 'All payslips emailed directly to employees. PDFs attached. Self-service portal updated. Done.' },
            ].map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ width: 64, height: 64, borderRadius: 18, background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 20px' }}>
                  {s.icon}
                </div>
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
              {[
                'New joiner? Add them in 30 seconds',
                'Employee leaving? Mark exit, auto-calculate final settlement',
                'LOP days? Just type the number — engine handles the rest',
                'Bonus month? Add it per-employee before generating',
              ].map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: '#1A7A4A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <svg viewBox="0 0 12 12" fill="none" style={{ width: 8, height: 8 }}>
                      <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 1.55 }}>{p}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { icon: '👋', label: 'New joiner added', time: 'Just now', color: '#DCFCE7', tc: '#15803D' },
              { icon: '📊', label: 'Payroll generated', time: '2 min ago', color: '#DBEAFE', tc: '#1D4ED8' },
              { icon: '✉️', label: '47 emails sent', time: '3 min ago', color: '#FEF3C7', tc: '#B45309' },
              { icon: '🤖', label: 'AI scan: 0 issues', time: '3 min ago', color: '#F5F3FF', tc: '#6D28D9' },
              { icon: '⬇️', label: 'PDF downloaded', time: '5 min ago', color: '#ECFDF5', tc: '#059669' },
              { icon: '🏛️', label: 'PF auto-calculated', time: '5 min ago', color: '#FFF1F2', tc: '#BE123C' },
            ].map((n, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: n.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, marginBottom: 10 }}>{n.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.85)', lineHeight: 1.3, marginBottom: 4 }}>{n.label}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{n.time}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
      <section style={{ padding: '100px 24px', background: '#F8FAFC' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
              Loved by HR teams across India
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {[
              { name: 'Priya Menon', role: 'HR Manager, Chennai', review: 'We used to spend an entire Friday doing payroll. Now it takes 8 minutes. I literally had to double-check if it actually worked.', stars: 5 },
              { name: 'Rajesh Kumar', role: 'Finance Head, Bangalore', review: 'The AI anomaly detection caught a duplicate entry before it went out. That would have caused a huge mess. Saved us big.', stars: 5 },
              { name: 'Anitha S', role: 'HR Lead, Coimbatore', review: 'Even our non-tech staff can use this. The SMTP setup guide was so simple. Everything just worked first time.', stars: 5 },
            ].map((t, i) => (
              <div key={i} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 18, padding: '24px 22px' }}>
                <div style={{ display: 'flex', gap: 3, marginBottom: 14 }}>
                  {[...Array(t.stars)].map((_, j) => <span key={j} style={{ fontSize: 14, color: '#F59E0B' }}>★</span>)}
                </div>
                <p style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.65, marginBottom: 18 }}>"{t.review}"</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: G }}>
                    {t.name[0]}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8' }}>{t.role}</div>
                  </div>
                </div>
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
            <h2 style={{ fontSize: 'clamp(26px,3.5vw,40px)', fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 12px' }}>
              Pay only for what you use
            </h2>
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
      <section style={{
        padding: '80px 24px',
        background: 'linear-gradient(135deg, #0A2E1A 0%, #1A7A4A 100%)',
        textAlign: 'center',
      }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🚀</div>
          <h2 style={{ fontSize: 'clamp(26px,4vw,42px)', fontWeight: 800, color: 'white', letterSpacing: '-0.02em', margin: '0 0 16px' }}>
            Ready to fix payroll forever?
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 36, lineHeight: 1.6 }}>
            Join 150+ companies that run stress-free payroll every month. Start your 30-day free trial today.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/register')} style={{
              background: 'white', color: G, border: 'none', borderRadius: 14,
              padding: '15px 32px', fontSize: 16, fontWeight: 700, cursor: 'pointer',
            }}>
              Start free trial →
            </button>
            <button onClick={() => navigate('/login')} style={{
              background: 'rgba(255,255,255,0.15)', color: 'white',
              border: '1px solid rgba(255,255,255,0.3)', borderRadius: 14,
              padding: '15px 28px', fontSize: 16, fontWeight: 600, cursor: 'pointer',
            }}>
              Sign in
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer style={{ background: '#0A1628', padding: '56px 24px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 48 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <LeafMark size={18} />
                </div>
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
                    onMouseOver={e => e.target.style.color = '#4ADE80'}
                    onMouseOut={e => e.target.style.color = 'rgba(255,255,255,0.45)'}>{l}</div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
              © 2026 PayLeef. All rights reserved.
            </p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
              Built & Powered by{' '}
              <a href="https://www.dinmind.com" target="_blank" rel="noopener noreferrer"
                style={{ color: '#4ADE80', fontWeight: 600, textDecoration: 'none' }}
                onMouseOver={e => e.target.style.textDecoration = 'underline'}
                onMouseOut={e => e.target.style.textDecoration = 'none'}>
                DinMind Infotech
              </a>
            </p>
          </div>
        </div>
      </footer>

      {/* ── Mobile hide utility ────────────────────────────────────────────── */}
      <style>{`
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
        }
      `}</style>
    </div>
  );
}
