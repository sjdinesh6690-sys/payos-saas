import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

// ── Animated counter ──────────────────────────────────────────────────────────
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
        setCount(Math.floor(p * end));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    }, { threshold: 0.5 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [end, duration]);
  return [count, ref];
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const CheckIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 16, height: 16 }}>
    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);
const ArrowIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 16, height: 16 }}>
    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);
const MenuIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 22, height: 22 }}>
    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);
const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 22, height: 22 }}>
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const StarIcon = () => (
  <svg viewBox="0 0 20 20" fill="#F59E0B" style={{ width: 16, height: 16 }}>
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
  </svg>
);

// ── Dashboard Mockup ──────────────────────────────────────────────────────────
function DashboardMockup() {
  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      boxShadow: '0 32px 80px rgba(15,23,80,0.18), 0 0 0 1px rgba(15,23,80,0.07)',
      overflow: 'hidden',
      width: '100%',
      maxWidth: 520,
    }}>
      {/* Browser bar */}
      <div style={{ background: '#F1F5F9', borderBottom: '1px solid #E2E8F0', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', gap: 5 }}>
          <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#FF5F57' }} />
          <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#FFBD2E' }} />
          <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#28C840' }} />
        </div>
        <div style={{ flex: 1, background: '#fff', borderRadius: 6, height: 26, border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', paddingLeft: 10, fontSize: 11, color: '#94A3B8' }}>
          app.payos.in/dashboard
        </div>
      </div>

      {/* Top nav inside mockup */}
      <div style={{ background: '#0F4FBF', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ width: 14, height: 14 }}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>PayOS</span>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {['Dashboard', 'Employees', 'Payslips'].map(t => (
            <span key={t} style={{ color: t === 'Dashboard' ? '#fff' : 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 500, cursor: 'pointer' }}>{t}</span>
          ))}
        </div>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>A</div>
      </div>

      {/* Dashboard content */}
      <div style={{ padding: 20, background: '#F8FAFC' }}>
        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Total Employees', val: '124', change: '+3 this month', color: '#0F4FBF', bg: '#EFF6FF' },
            { label: 'Monthly Payroll', val: '₹84.2L', change: '↑ 4.2% vs last', color: '#059669', bg: '#F0FDF4' },
            { label: 'Payslips Sent', val: '124', change: '100% delivered', color: '#7C3AED', bg: '#F5F3FF' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 10, padding: '12px 14px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 9, color: '#64748B', marginBottom: 4, fontWeight: 500 }}>{s.label}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 2 }}>{s.val}</div>
              <div style={{ fontSize: 9, color: s.color, fontWeight: 600 }}>{s.change}</div>
            </div>
          ))}
        </div>

        {/* Chart */}
        <div style={{ background: '#fff', borderRadius: 10, padding: 14, border: '1px solid #E2E8F0', marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#1E293B' }}>Monthly Payroll Trend</span>
            <span style={{ fontSize: 9, color: '#94A3B8', background: '#F1F5F9', padding: '2px 8px', borderRadius: 4 }}>2025–26</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 44 }}>
            {[28, 48, 36, 60, 42, 68, 55, 78, 65, 88, 74, 100].map((h, i) => (
              <div key={i} style={{
                flex: 1, height: `${h}%`, borderRadius: '3px 3px 0 0',
                background: i === 11 ? '#0F4FBF' : '#DBEAFE',
              }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
            {['Apr', 'Jun', 'Aug', 'Oct', 'Dec', 'Mar'].map(m => (
              <span key={m} style={{ fontSize: 8, color: '#CBD5E1' }}>{m}</span>
            ))}
          </div>
        </div>

        {/* Employee rows */}
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E2E8F0' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#1E293B' }}>Recent Payslips</span>
            <span style={{ fontSize: 9, color: '#0F4FBF', fontWeight: 600, cursor: 'pointer' }}>View all →</span>
          </div>
          {[
            { name: 'Arjun Sharma', dept: 'Engineering', amt: '₹70,200', status: 'Sent', color: '#0F4FBF' },
            { name: 'Priya Nair', dept: 'Product', amt: '₹83,300', status: 'Sent', color: '#0F4FBF' },
            { name: 'Rohan Mehta', dept: 'Design', amt: '₹61,800', status: 'Pending', color: '#D97706' },
          ].map((r, i) => (
            <div key={i} style={{ padding: '9px 14px', borderBottom: i < 2 ? '1px solid #F8FAFC' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: i === 0 ? '#DBEAFE' : i === 1 ? '#D1FAE5' : '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: i === 0 ? '#0F4FBF' : i === 1 ? '#059669' : '#7C3AED' }}>
                  {r.name[0]}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#1E293B' }}>{r.name}</div>
                  <div style={{ fontSize: 9, color: '#94A3B8' }}>{r.dept}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#0F172A' }}>{r.amt}</span>
                <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: r.status === 'Sent' ? '#D1FAE5' : '#FEF3C7', color: r.status === 'Sent' ? '#059669' : '#D97706' }}>{r.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Feature icons ─────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: '⚡',
    title: 'Auto Payroll Calculation',
    desc: 'Configure once. PayOS calculates Basic, HRA, PF (12%), ESI (0.75%), PT, and TDS for every employee — automatically, every month.',
    color: '#0F4FBF',
    bg: '#EFF6FF',
  },
  {
    icon: '📋',
    title: '100% Statutory Compliance',
    desc: 'PF, ESI, Professional Tax, and TDS computed as per Indian government norms. Always audit-ready with full logs.',
    color: '#059669',
    bg: '#F0FDF4',
  },
  {
    icon: '📄',
    title: '5 Professional PDF Templates',
    desc: 'Classic, Modern, Corporate, Minimal, and Premium templates. Add your company logo and branding in minutes.',
    color: '#7C3AED',
    bg: '#F5F3FF',
  },
  {
    icon: '📧',
    title: 'Bulk Email Delivery',
    desc: 'Send payslips to 100+ employees in one click. Each employee gets a personalised email with their PDF payslip attached.',
    color: '#0891B2',
    bg: '#ECFEFF',
  },
  {
    icon: '📊',
    title: 'Analytics & Reports',
    desc: 'PF, ESI, TDS, Salary Register, Bank Advice — download compliance reports instantly. Track trends and department costs.',
    color: '#DC2626',
    bg: '#FEF2F2',
  },
  {
    icon: '🔒',
    title: 'Secure Role-Based Access',
    desc: 'JWT-secured login. Admin and employee portals with separate access. Employees can view and download their own payslips.',
    color: '#D97706',
    bg: '#FFFBEB',
  },
];

const PLANS = [
  {
    name: 'Starter',
    price: 'Free',
    period: '30-day trial',
    desc: 'Try PayOS with your full team. No credit card needed.',
    features: ['Up to 10 employees', 'All 5 PDF templates', 'PF & ESI compliance', 'Payslip email delivery', 'Basic analytics & reports'],
    cta: 'Start Free Trial',
    highlight: false,
  },
  {
    name: 'Growth',
    price: '₹999',
    period: '/month',
    desc: 'Everything you need to run payroll for a growing team.',
    features: ['Up to 50 employees', 'All 5 PDF templates', 'Full compliance suite', 'Bulk email delivery', 'Advanced analytics', 'Priority support'],
    cta: 'Get Started',
    highlight: true,
    badge: 'Most Popular',
  },
  {
    name: 'Enterprise',
    price: '₹2,499',
    period: '/month',
    desc: 'For large organisations with multiple entities and teams.',
    features: ['Unlimited employees', 'Custom branding & logo', 'Multi-company support', 'API access', 'Dedicated account manager', 'SLA guarantee'],
    cta: 'Contact Sales',
    highlight: false,
  },
];

const TESTIMONIALS = [
  {
    name: 'Priya Sundarajan',
    role: 'HR Manager',
    company: 'TechFlow Solutions',
    text: 'PayOS cut our monthly payroll from 3 hours to under 10 minutes. The compliance calculations are spot-on — no more reconciliation errors.',
    rating: 5,
    initials: 'PS',
  },
  {
    name: 'Rajesh Kumar',
    role: 'Finance Lead',
    company: 'Nexus Logistics',
    text: 'Finally a payroll tool built for India. PF, ESI, PT are all handled perfectly. The PDF payslips look so professional — employees love them.',
    rating: 5,
    initials: 'RK',
  },
  {
    name: 'Ananya Krishnan',
    role: 'Operations Head',
    company: 'BrightStart Ventures',
    text: 'We onboarded 80 employees from a single CSV file. Payslips generated and emailed in one click. Incredible time saver for our team.',
    rating: 5,
    initials: 'AK',
  },
];

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [emp, empRef] = useCounter(500);
  const [ps, psRef] = useCounter(50000);
  const [mins, minsRef] = useCounter(10);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  const C = {
    blue: '#0F4FBF',
    blueDark: '#0A3A8F',
    blueLight: '#EFF6FF',
    text: '#0F172A',
    muted: '#64748B',
    border: '#E2E8F0',
    bg: '#F8FAFC',
  };

  return (
    <div style={{ background: '#fff', color: C.text, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        .nav-link { color: #334155; text-decoration: none; font-size: 14px; font-weight: 500; padding: 6px 4px; transition: color .15s; white-space: nowrap; }
        .nav-link:hover { color: #0F4FBF; }
        .btn-blue {
          background: #0F4FBF; color: #fff; border: none;
          padding: 11px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all .2s; display: inline-flex; align-items: center; gap: 8px;
        }
        .btn-blue:hover { background: #0A3A8F; box-shadow: 0 4px 16px rgba(15,79,191,0.3); }
        .btn-outline {
          background: transparent; color: #0F4FBF; border: 1.5px solid #0F4FBF;
          padding: 11px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all .2s; display: inline-flex; align-items: center; gap: 8px;
        }
        .btn-outline:hover { background: #EFF6FF; }
        .btn-white {
          background: #fff; color: #0F4FBF; border: none;
          padding: 13px 28px; border-radius: 8px; font-size: 15px; font-weight: 700;
          cursor: pointer; transition: all .2s; display: inline-flex; align-items: center; gap: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .btn-white:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.15); transform: translateY(-1px); }
        .btn-outline-white {
          background: transparent; color: #fff; border: 1.5px solid rgba(255,255,255,0.5);
          padding: 13px 24px; border-radius: 8px; font-size: 15px; font-weight: 600;
          cursor: pointer; transition: all .2s; display: inline-flex; align-items: center; gap: 8px;
        }
        .btn-outline-white:hover { background: rgba(255,255,255,0.1); border-color: #fff; }
        .feature-card {
          background: #fff; border: 1px solid #E2E8F0; border-radius: 14px;
          padding: 28px; transition: all .2s; cursor: default;
        }
        .feature-card:hover { border-color: #BFDBFE; box-shadow: 0 8px 32px rgba(15,79,191,0.1); transform: translateY(-2px); }
        .plan-card { border-radius: 16px; padding: 32px; transition: all .2s; }
        .plan-card:hover { transform: translateY(-3px); }
        .testimonial-card { background: #fff; border: 1px solid #E2E8F0; border-radius: 14px; padding: 28px; transition: all .2s; }
        .testimonial-card:hover { border-color: #BFDBFE; box-shadow: 0 8px 24px rgba(15,79,191,0.08); }
        .step-num { width: 40px; height: 40px; border-radius: 50%; background: #0F4FBF; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 800; flex-shrink: 0; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        .hero-visual { animation: float 5s ease-in-out infinite; }
        .section-label { display: inline-block; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #0F4FBF; background: #EFF6FF; border-radius: 100px; padding: 4px 14px; margin-bottom: 12px; }
      `}</style>

      {/* ── NAVBAR ────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 200,
        background: scrolled ? 'rgba(255,255,255,0.97)' : '#fff',
        borderBottom: `1px solid ${scrolled ? C.border : '#F1F5F9'}`,
        backdropFilter: 'blur(12px)',
        boxShadow: scrolled ? '0 1px 12px rgba(0,0,0,0.08)' : 'none',
        transition: 'all .25s',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }} onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(15,79,191,0.35)' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" style={{ width: 18, height: 18 }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            </div>
            <div>
              <span style={{ fontSize: 18, fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>PayOS</span>
              <span style={{ display: 'block', fontSize: 10, color: C.muted, lineHeight: 1, marginTop: -2 }}>Smart Payroll OS</span>
            </div>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex" style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            {['Features', 'How it works', 'Pricing', 'Testimonials'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`} className="nav-link">{l}</a>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn-outline" style={{ padding: '9px 18px', fontSize: 13 }} onClick={() => navigate('/login')}>Sign in</button>
            <button className="btn-blue" style={{ padding: '9px 18px', fontSize: 13 }} onClick={() => navigate('/register')}>
              Start Free Trial
            </button>
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(v => !v)} style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer', color: C.text, padding: 4 }}>
            {mobileOpen ? <XIcon /> : <MenuIcon />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div style={{ background: '#fff', borderTop: `1px solid ${C.border}`, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {['Features', 'How it works', 'Pricing', 'Testimonials'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`} className="nav-link" style={{ fontSize: 16 }} onClick={() => setMobileOpen(false)}>{l}</a>
            ))}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 8 }}>
              <button className="btn-outline" onClick={() => navigate('/login')}>Sign in</button>
              <button className="btn-blue" onClick={() => navigate('/register')}>Start Free Trial</button>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section style={{ background: 'linear-gradient(160deg, #EFF6FF 0%, #fff 60%)', borderBottom: `1px solid ${C.border}`, padding: '80px 24px 0', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'flex-end' }}>
          {/* Left */}
          <div style={{ paddingBottom: 60 }}>
            <div className="section-label">🇮🇳 Built for Indian Businesses</div>
            <h1 style={{ fontSize: 'clamp(36px, 4.5vw, 58px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 20, color: C.text }}>
              Payroll that runs<br />
              <span style={{ color: C.blue }}>itself — in minutes.</span>
            </h1>
            <p style={{ fontSize: 18, color: C.muted, lineHeight: 1.75, marginBottom: 36, maxWidth: 460 }}>
              PayOS automates salary calculations, PF/ESI compliance, and payslip delivery for your entire team. No spreadsheets. No errors.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
              <button className="btn-blue" style={{ padding: '13px 28px', fontSize: 15 }} onClick={() => navigate('/register')}>
                Start Free — 30 Days <ArrowIcon />
              </button>
              <button className="btn-outline" style={{ padding: '13px 24px', fontSize: 15 }} onClick={() => navigate('/login')}>
                Sign into account
              </button>
            </div>
            {/* Trust signals */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
              {[
                '✓ No credit card required',
                '✓ Free for 30 days',
                '✓ Cancel anytime',
              ].map(t => (
                <span key={t} style={{ fontSize: 13, color: '#059669', fontWeight: 500 }}>{t}</span>
              ))}
            </div>
          </div>

          {/* Right — mockup sits at bottom */}
          <div className="hero-visual" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>
            <DashboardMockup />
          </div>
        </div>
      </section>

      {/* ── STATS BAR ─────────────────────────────────────────────────────── */}
      <section style={{ background: C.blue, padding: '28px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 48 }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>Trusted by businesses across India</p>
          {[
            ['500+', 'Companies'],
            ['50,000+', 'Payslips Generated'],
            ['99.9%', 'Uptime'],
            ['< 10 min', 'Avg Payroll Run'],
          ].map(([v, l]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{v}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: '96px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div className="section-label">Features</div>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 44px)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 14, color: C.text }}>
              Everything your payroll team needs
            </h2>
            <p style={{ fontSize: 17, color: C.muted, maxWidth: 520, margin: '0 auto', lineHeight: 1.65 }}>
              A complete payroll OS built for Indian compliance — from calculation to compliance reports to payslip delivery.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="feature-card">
                <div style={{ width: 48, height: 48, borderRadius: 12, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 18 }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10, color: C.text }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPLIANCE HIGHLIGHT ──────────────────────────────────────────── */}
      <section style={{ background: C.bg, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          {/* Left */}
          <div>
            <div className="section-label">Indian Compliance</div>
            <h2 style={{ fontSize: 'clamp(24px, 3vw, 40px)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 20, color: C.text }}>
              Statutory compliance, handled automatically
            </h2>
            <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.75, marginBottom: 32 }}>
              PayOS knows Indian payroll law. PF, ESI, Professional Tax, and TDS are calculated as per government norms — automatically, every month.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'PF (Provident Fund)', detail: 'Employee 12% + Employer 12% split calculated automatically', color: '#0F4FBF' },
                { label: 'ESI (Employee State Insurance)', detail: '0.75% employee + 3.25% employer — auto-computed for eligible employees', color: '#059669' },
                { label: 'Professional Tax', detail: 'State-wise PT slabs applied based on gross salary', color: '#7C3AED' },
                { label: 'TDS Deduction', detail: 'Income tax calculated on CTC and deducted monthly', color: '#DC2626' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fff', border: `1.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <CheckIcon style={{ color: item.color }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{item.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Compliance card visual */}
          <div>
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, boxShadow: '0 4px 24px rgba(15,23,80,0.07)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Payslip Breakdown — Arjun Sharma</h4>
                <span style={{ fontSize: 11, background: '#D1FAE5', color: '#059669', padding: '3px 10px', borderRadius: 6, fontWeight: 600 }}>Compliant ✓</span>
              </div>

              {/* Earnings */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Earnings</div>
                {[
                  ['Basic Pay', '₹36,000'],
                  ['HRA (40%)', '₹14,400'],
                  ['Conveyance', '₹1,600'],
                  ['Special Allowance', '₹11,600'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.bg}`, fontSize: 13 }}>
                    <span style={{ color: C.muted }}>{k}</span>
                    <span style={{ fontWeight: 600, color: C.text }}>{v}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 13, fontWeight: 700, color: '#059669' }}>
                  <span>Gross Pay</span><span>₹63,600</span>
                </div>
              </div>

              {/* Deductions */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Deductions</div>
                {[
                  ['PF (12%)', '₹4,320', '#0F4FBF'],
                  ['ESI (0.75%)', '₹477', '#7C3AED'],
                  ['Professional Tax', '₹200', '#DC2626'],
                  ['TDS', '₹2,400', '#D97706'],
                ].map(([k, v, c]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.bg}`, fontSize: 13 }}>
                    <span style={{ color: C.muted }}>{k}</span>
                    <span style={{ fontWeight: 600, color: c }}>{v}</span>
                  </div>
                ))}
              </div>

              {/* Net Pay */}
              <div style={{ background: '#0F4FBF', borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>Net Pay (Take Home)</span>
                <span style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>₹56,203</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section id="how-it-works" style={{ padding: '96px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div className="section-label">How it works</div>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 44px)', fontWeight: 800, letterSpacing: '-0.02em', color: C.text }}>
              From setup to payslips in 3 simple steps
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {[
              {
                num: '01',
                icon: '👥',
                title: 'Add your employees',
                desc: 'Upload all employees via CSV or add them manually. Include name, department, designation, salary, and date of joining. Done in minutes.',
                detail: ['Import from Excel or CSV', 'Manual entry with form', 'Supports all departments'],
              },
              {
                num: '02',
                icon: '⚙️',
                title: 'Configure your payroll rules',
                desc: 'Set up earnings (Basic, HRA, Allowances) and deductions (PF, ESI, PT, TDS). PayOS auto-applies Indian statutory rules. No manual calculation ever.',
                detail: ['Pre-built Indian tax rules', 'Customisable components', 'LOP and overtime adjustments'],
              },
              {
                num: '03',
                icon: '🚀',
                title: 'Generate & send payslips',
                desc: 'Pick the month, review the payroll summary, and click Generate. PayOS creates professional PDF payslips and emails every employee — in one click.',
                detail: ['Bulk generation for all staff', 'Auto email to each employee', 'Instant download as ZIP'],
              },
            ].map((s, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '64px 1fr', gap: 28, alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
                  <div className="step-num">{s.num}</div>
                  {i < 2 && <div style={{ width: 2, height: 60, background: '#DBEAFE', marginTop: 8 }} />}
                </div>
                <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: 28, marginBottom: 0 }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{s.icon}</div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10, color: C.text }}>{s.title}</h3>
                  <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7, marginBottom: 16 }}>{s.desc}</p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {s.detail.map(d => (
                      <span key={d} style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 6, background: '#EFF6FF', color: C.blue }}>
                        ✓ {d}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LIVE STATS ────────────────────────────────────────────────────── */}
      <section style={{ background: C.bg, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: '64px 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {[
            { ref: empRef, count: emp, suffix: '+', label: 'Companies using PayOS', icon: '🏢' },
            { ref: psRef, count: ps, suffix: '+', label: 'Payslips Generated', icon: '📄' },
            { ref: minsRef, count: mins, suffix: ' min', label: 'Average payroll run', icon: '⚡' },
          ].map((s, i) => (
            <div key={i} ref={s.ref} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14, padding: '32px 24px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>{s.icon}</div>
              <div style={{ fontSize: 42, fontWeight: 900, color: C.blue, letterSpacing: '-0.02em' }}>
                {s.count.toLocaleString('en-IN')}{s.suffix}
              </div>
              <div style={{ fontSize: 14, color: C.muted, marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: '96px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div className="section-label">Pricing</div>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 44px)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 12, color: C.text }}>
              Simple, transparent pricing
            </h2>
            <p style={{ fontSize: 16, color: C.muted }}>No hidden fees. No long-term contracts. Start free, upgrade when ready.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, alignItems: 'start' }}>
            {PLANS.map((plan, i) => (
              <div
                key={i}
                className="plan-card"
                style={{
                  position: 'relative',
                  background: plan.highlight ? C.blue : '#fff',
                  border: plan.highlight ? `2px solid ${C.blue}` : `1px solid ${C.border}`,
                  boxShadow: plan.highlight ? '0 16px 48px rgba(15,79,191,0.25)' : '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                {plan.badge && (
                  <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: '#fff', color: C.blue, fontSize: 11, fontWeight: 800, padding: '4px 14px', borderRadius: 100, border: `1.5px solid ${C.blue}`, whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(15,79,191,0.15)' }}>
                    {plan.badge}
                  </div>
                )}
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: plan.highlight ? '#fff' : C.text }}>{plan.name}</div>
                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 38, fontWeight: 900, color: plan.highlight ? '#fff' : C.blue }}>{plan.price}</span>
                  <span style={{ fontSize: 14, color: plan.highlight ? 'rgba(255,255,255,0.65)' : C.muted, marginLeft: 4 }}>{plan.period}</span>
                </div>
                <p style={{ fontSize: 13, color: plan.highlight ? 'rgba(255,255,255,0.7)' : C.muted, marginBottom: 24, lineHeight: 1.5 }}>{plan.desc}</p>
                <button
                  onClick={() => navigate('/register')}
                  style={{
                    width: '100%', justifyContent: 'center', marginBottom: 24,
                    background: plan.highlight ? '#fff' : C.blue,
                    color: plan.highlight ? C.blue : '#fff',
                    border: 'none', padding: '12px 20px', borderRadius: 8,
                    fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all .2s',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  {plan.cta}
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: plan.highlight ? 'rgba(255,255,255,0.85)' : C.muted }}>
                      <span style={{ color: plan.highlight ? '#93C5FD' : '#059669', flexShrink: 0 }}><CheckIcon /></span>
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────────────────── */}
      <section id="testimonials" style={{ padding: '96px 24px', background: C.bg, borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div className="section-label">Testimonials</div>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 44px)', fontWeight: 800, letterSpacing: '-0.02em', color: C.text }}>
              Loved by HR & Finance teams
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="testimonial-card">
                <div style={{ display: 'flex', gap: 3, marginBottom: 16 }}>
                  {[...Array(t.rating)].map((_, j) => <StarIcon key={j} />)}
                </div>
                <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.75, marginBottom: 22 }}>
                  "{t.text}"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                    {t.initials}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{t.name}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>{t.role} · {t.company}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
      <section style={{ background: C.blue, padding: '80px 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, letterSpacing: '-0.02em', color: '#fff', marginBottom: 16, lineHeight: 1.15 }}>
            Ready to automate your payroll?
          </h2>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.75)', marginBottom: 36, lineHeight: 1.65 }}>
            Join 500+ businesses running smarter payroll with PayOS.<br />30-day free trial — no credit card needed.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-white" onClick={() => navigate('/register')}>
              Start Free Trial <ArrowIcon />
            </button>
            <button className="btn-outline-white" onClick={() => navigate('/login')}>
              Sign in to account
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer style={{ background: '#0F172A', padding: '56px 24px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 48 }}>
            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" style={{ width: 17, height: 17 }}>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <span style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>PayOS</span>
              </div>
              <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.75, maxWidth: 240 }}>
                Smart Payroll OS for Indian businesses. Automate calculations, ensure compliance, and delight your employees.
              </p>
            </div>

            {[
              { heading: 'Product', items: ['Features', 'Pricing', 'Templates', 'Analytics', 'Reports'] },
              { heading: 'Compliance', items: ['PF Calculations', 'ESI Deductions', 'Professional Tax', 'TDS Reports', 'Audit Trail'] },
              { heading: 'Company', items: ['About', 'Blog', 'Careers', 'Privacy Policy', 'Terms of Service'] },
            ].map(col => (
              <div key={col.heading}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 16 }}>{col.heading}</p>
                {col.items.map(item => (
                  <div key={item} style={{ marginBottom: 10 }}>
                    <span style={{ fontSize: 14, color: '#64748B', cursor: 'pointer', transition: 'color .15s' }}
                      onMouseOver={e => e.target.style.color = '#fff'}
                      onMouseOut={e => e.target.style.color = '#64748B'}
                    >{item}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid #1E293B', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ fontSize: 13, color: '#475569' }}>© 2026 PayOS · Smart Payroll OS · Made in India 🇮🇳</p>
            <p style={{ fontSize: 13, color: '#475569' }}>Built by DinMind Software Solutions</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
