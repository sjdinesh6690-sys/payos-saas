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
const XMarkIcon = () => (
  <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 16, height: 16 }}>
    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
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

// ── PayLeef Logo Mark ─────────────────────────────────────────────────────────
const LeafMark = ({ size = 18, color = 'white' }) => (
  <svg viewBox="0 0 24 24" fill="none" style={{ width: size, height: size }}>
    <path d="M12 2C6.5 2 2 9 2 14c0 3.3 2.7 6 6 6 1.8 0 3.4-.8 4.5-2C13.5 20.2 15 21 16.7 21c2.4 0 5.3-2 5.3-7C22 7.5 17.5 2 12 2z" fill={color} opacity="0.9"/>
    <path d="M12 2 L12 20" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
  </svg>
);

// ── Dashboard Mockup ──────────────────────────────────────────────────────────
function DashboardMockup() {
  const G = '#1A7A4A';
  return (
    <div style={{
      background: '#fff',
      borderRadius: 16,
      boxShadow: '0 32px 80px rgba(26,122,74,0.18), 0 0 0 1px rgba(26,122,74,0.09)',
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
          app.payleef.in/dashboard
        </div>
      </div>

      {/* Top nav inside mockup */}
      <div style={{ background: G, padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LeafMark size={14} />
          </div>
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>PayLeef</span>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {['Dashboard', 'Employees', 'Payslips'].map(t => (
            <span key={t} style={{ color: t === 'Dashboard' ? '#fff' : 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 500 }}>{t}</span>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 6, padding: '2px 8px', fontSize: 9, color: '#fff', fontWeight: 600 }}>🤖 AI</div>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>A</div>
        </div>
      </div>

      {/* Dashboard content */}
      <div style={{ padding: 20, background: '#F8FAFC' }}>
        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
          {[
            { label: 'Total Employees', val: '47', change: '+2 this month', color: G, bg: '#F0FDF4' },
            { label: 'Monthly Payroll', val: '₹28.4L', change: '✓ Compliance OK', color: '#059669', bg: '#F0FDF4' },
            { label: 'AI Anomalies', val: '0', change: 'All payslips clean', color: '#7C3AED', bg: '#F5F3FF' },
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
                background: i === 11 ? G : '#DCFCE7',
              }} />
            ))}
          </div>
        </div>

        {/* Employee rows */}
        <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E2E8F0' }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#1E293B' }}>Recent Payslips</span>
            <span style={{ fontSize: 9, color: G, fontWeight: 600 }}>View all →</span>
          </div>
          {[
            { name: 'Arjun Sharma', dept: 'Engineering', amt: '₹70,200', status: 'Sent' },
            { name: 'Priya Nair', dept: 'Operations', amt: '₹52,800', status: 'Sent' },
            { name: 'Rohan Mehta', dept: 'Accounts', amt: '₹41,500', status: 'Pending' },
          ].map((r, i) => (
            <div key={i} style={{ padding: '9px 14px', borderBottom: i < 2 ? '1px solid #F8FAFC' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: i === 0 ? '#DCFCE7' : i === 1 ? '#D1FAE5' : '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: i === 0 ? G : i === 1 ? '#059669' : '#7C3AED' }}>
                  {r.name[0]}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#1E293B' }}>{r.name}</div>
                  <div style={{ fontSize: 9, color: '#94A3B8' }}>{r.dept}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#0F172A' }}>{r.amt}</span>
                <span style={{ fontSize: 9, fontWeight: 600, padding: '2px 7px', borderRadius: 4, background: r.status === 'Sent' ? '#DCFCE7' : '#FEF3C7', color: r.status === 'Sent' ? '#166534' : '#D97706' }}>{r.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: '⚡',
    title: 'Auto Payroll Calculation',
    desc: 'Configure once. PayLeef calculates Basic, HRA, PF (12%), ESI (0.75%), PT, and TDS for every employee — automatically, every month. Zero manual work.',
    color: '#1A7A4A',
    bg: '#F0FDF4',
  },
  {
    icon: '🏛️',
    title: 'Government Compliance, Simplified',
    desc: 'PF, ESI, Professional Tax, TDS — all computed as per Indian government rules. Audit-ready reports at one click. Never face an inspector unprepared.',
    color: '#059669',
    bg: '#ECFDF5',
  },
  {
    icon: '🤖',
    title: 'AI Anomaly Detection',
    desc: 'Every payroll run is scanned by AI. It flags unusual salary drops, missing deductions, zero-net-pay cases, and high absenteeism — before you send payslips.',
    color: '#7C3AED',
    bg: '#F5F3FF',
  },
  {
    icon: '💬',
    title: 'Employee AI Chat',
    desc: 'Employees can ask "Why did my salary change?" or "What is my PF deduction?" and get instant, accurate answers — no HR calls needed.',
    color: '#0891B2',
    bg: '#ECFEFF',
  },
  {
    icon: '📄',
    title: 'Professional PDF Payslips',
    desc: 'Beautiful, professional payslip templates with your company logo. Bulk-generate and email all employees in one click. Each gets a personalised PDF.',
    color: '#D97706',
    bg: '#FFFBEB',
  },
  {
    icon: '📊',
    title: 'Compliance Reports',
    desc: 'PF, ESI, TDS, Salary Register, Bank Advice — download all statutory reports instantly. Track department-wise costs and payroll trends over time.',
    color: '#DC2626',
    bg: '#FEF2F2',
  },
];

const PLANS = [
  {
    name: 'Free Trial',
    price: '₹0',
    period: 'First 30 days',
    desc: 'Full access to every feature. No credit card. No limits.',
    perEmp: null,
    features: [
      'All features unlocked',
      'Up to 10 employees',
      'AI anomaly detection',
      'Employee AI chat',
      'PF, ESI, PT compliance',
      'PDF payslips & email delivery',
    ],
    cta: 'Start Free',
    highlight: false,
    badge: null,
  },
  {
    name: 'Starter',
    price: '₹499',
    period: '/month',
    desc: 'Perfect for small businesses and startups up to 10 staff.',
    perEmp: '₹49.9 per employee',
    features: [
      'Up to 10 employees',
      'All features included',
      'AI features included',
      'Full statutory compliance',
      'PDF payslips & email delivery',
      'Email support',
    ],
    cta: 'Get Started',
    highlight: false,
    badge: 'Cheapest in Market',
  },
  {
    name: 'Growth',
    price: '₹1,499',
    period: '/month',
    desc: 'For growing businesses with up to 50 employees.',
    perEmp: '₹29.9 per employee',
    features: [
      'Up to 50 employees',
      'All Starter features',
      'Priority support',
      'Multi-department analytics',
      'LOP & overtime management',
      'Bulk operations',
    ],
    cta: 'Get Started',
    highlight: true,
    badge: 'Most Popular',
  },
  {
    name: 'Business',
    price: '₹3,999',
    period: '/month',
    desc: 'For established businesses scaling up to 200 employees.',
    perEmp: '₹19.9 per employee',
    features: [
      'Up to 200 employees',
      'All Growth features',
      'Dedicated account manager',
      'Custom payroll components',
      'Advanced reports & exports',
      'SLA guarantee',
    ],
    cta: 'Get Started',
    highlight: false,
    badge: null,
  },
];

const TESTIMONIALS = [
  {
    name: 'Priya Sundarajan',
    role: 'HR Manager',
    company: 'TechFlow Solutions',
    text: 'PayLeef cut our monthly payroll from 3 hours to under 10 minutes. The AI caught a zero-deduction error on one payslip that we would have missed. Incredible.',
    rating: 5,
    initials: 'PS',
    empCount: '32 employees',
  },
  {
    name: 'Rajesh Kumar',
    role: 'Finance Lead',
    company: 'Nexus Logistics',
    text: 'Finally a payroll tool built for India. PF, ESI, PT are all handled perfectly. My employees love asking the AI chat about their salary — zero HR queries now.',
    rating: 5,
    initials: 'RK',
    empCount: '68 employees',
  },
  {
    name: 'Ananya Krishnan',
    role: 'Operations Head',
    company: 'BrightStart Ventures',
    text: 'We compared greytHR and Keka. PayLeef was 6x cheaper and up in 20 minutes. The government compliance is automatic. This is what Indian SMEs actually need.',
    rating: 5,
    initials: 'AK',
    empCount: '18 employees',
  },
];

const COMPARISON = [
  { feature: 'Starting Price', payleef: '₹499/mo', greythr: '₹3,000+/mo', keka: '₹6,000+/mo', zoho: '₹999/mo' },
  { feature: 'Setup Time', payleef: '10 minutes', greythr: '2–4 weeks', keka: '3–6 weeks', zoho: '1–2 weeks' },
  { feature: 'AI Employee Chat', payleef: true, greythr: false, keka: false, zoho: false },
  { feature: 'AI Anomaly Detection', payleef: true, greythr: false, keka: false, zoho: false },
  { feature: 'PF + ESI Auto-Calc', payleef: true, greythr: true, keka: true, zoho: true },
  { feature: 'Built for SMEs (< 200)', payleef: true, greythr: false, keka: false, zoho: true },
  { feature: '30-Day Free Trial', payleef: true, greythr: false, keka: false, zoho: true },
  { feature: 'No Hidden Fees', payleef: true, greythr: false, keka: false, zoho: false },
];

// ── Main ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [emp, empRef] = useCounter(200);
  const [ps, psRef] = useCounter(20000);
  const [mins, minsRef] = useCounter(10);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', h);
    return () => window.removeEventListener('scroll', h);
  }, []);

  const C = {
    green: '#1A7A4A',
    greenDark: '#145C38',
    greenLight: '#F0FDF4',
    greenBorder: '#DCFCE7',
    text: '#0F172A',
    muted: '#64748B',
    border: '#E2E8F0',
    bg: '#F8FAFC',
  };

  return (
    <div style={{ background: '#fff', color: C.text, fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .nav-link { color: #334155; text-decoration: none; font-size: 14px; font-weight: 500; padding: 6px 4px; transition: color .15s; white-space: nowrap; }
        .nav-link:hover { color: #1A7A4A; }
        .btn-green {
          background: #1A7A4A; color: #fff; border: none;
          padding: 11px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all .2s; display: inline-flex; align-items: center; gap: 8px;
        }
        .btn-green:hover { background: #145C38; box-shadow: 0 4px 16px rgba(26,122,74,0.35); }
        .btn-outline {
          background: transparent; color: #1A7A4A; border: 1.5px solid #1A7A4A;
          padding: 11px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;
          cursor: pointer; transition: all .2s; display: inline-flex; align-items: center; gap: 8px;
        }
        .btn-outline:hover { background: #F0FDF4; }
        .btn-white {
          background: #fff; color: #1A7A4A; border: none;
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
        .feature-card:hover { border-color: #DCFCE7; box-shadow: 0 8px 32px rgba(26,122,74,0.1); transform: translateY(-2px); }
        .plan-card { border-radius: 16px; padding: 32px; transition: all .2s; }
        .plan-card:hover { transform: translateY(-3px); }
        .testimonial-card { background: #fff; border: 1px solid #E2E8F0; border-radius: 14px; padding: 28px; transition: all .2s; }
        .testimonial-card:hover { border-color: #DCFCE7; box-shadow: 0 8px 24px rgba(26,122,74,0.08); }
        .step-num { width: 40px; height: 40px; border-radius: 50%; background: #1A7A4A; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 800; flex-shrink: 0; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        .hero-visual { animation: float 5s ease-in-out infinite; }
        .section-label { display: inline-block; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: #1A7A4A; background: #DCFCE7; border-radius: 100px; padding: 4px 14px; margin-bottom: 12px; }
        .compare-yes { color: #166534; font-weight: 700; }
        .compare-no { color: #94A3B8; }
        .ai-badge { background: linear-gradient(135deg, #7C3AED, #5B21B6); color: #fff; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 100px; display: inline-block; margin-left: 6px; vertical-align: middle; }
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
            <div style={{ width: 36, height: 36, borderRadius: 10, background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(26,122,74,0.35)' }}>
              <LeafMark size={20} />
            </div>
            <div>
              <span style={{ fontSize: 18, fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>PayLeef</span>
              <span style={{ display: 'block', fontSize: 10, color: C.muted, lineHeight: 1, marginTop: -1 }}>India's Smartest Payroll</span>
            </div>
          </div>

          {/* Desktop Nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            {['Features', 'How it works', 'Pricing', 'Compare'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`} className="nav-link">{l}</a>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button className="btn-outline" style={{ padding: '9px 18px', fontSize: 13 }} onClick={() => navigate('/login')}>Sign in</button>
            <button className="btn-green" style={{ padding: '9px 18px', fontSize: 13 }} onClick={() => navigate('/register')}>
              Free 30-Day Trial
            </button>
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.text, padding: 4 }}>
            {mobileOpen ? <XIcon /> : <MenuIcon />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div style={{ background: '#fff', borderTop: `1px solid ${C.border}`, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {['Features', 'How it works', 'Pricing', 'Compare'].map(l => (
              <a key={l} href={`#${l.toLowerCase().replace(/ /g, '-')}`} className="nav-link" style={{ fontSize: 16 }} onClick={() => setMobileOpen(false)}>{l}</a>
            ))}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 8 }}>
              <button className="btn-outline" onClick={() => navigate('/login')}>Sign in</button>
              <button className="btn-green" onClick={() => navigate('/register')}>Start Free Trial</button>
            </div>
          </div>
        )}
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section style={{ background: 'linear-gradient(160deg, #ECFDF5 0%, #fff 65%)', borderBottom: `1px solid ${C.border}`, padding: '80px 24px 0', overflow: 'hidden' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'flex-end' }}>
          {/* Left */}
          <div style={{ paddingBottom: 60 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <div className="section-label" style={{ marginBottom: 0 }}>🇮🇳 Built for Indian SMEs</div>
              <div style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 10px', borderRadius: 100 }}>✨ Now with AI</div>
            </div>
            <h1 style={{ fontSize: 'clamp(34px, 4.5vw, 56px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 20, color: C.text }}>
              India's Simplest Payroll.<br />
              <span style={{ color: C.green }}>Zero Errors. 100%</span><br />
              Government Compliant.
            </h1>
            <p style={{ fontSize: 18, color: C.muted, lineHeight: 1.75, marginBottom: 36, maxWidth: 480 }}>
              PayLeef automates salary calculations, PF/ESI/PT compliance, and payslip delivery for your whole team.
              AI catches errors before they reach employees. Setup in <strong>10 minutes</strong>.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
              <button className="btn-green" style={{ padding: '13px 28px', fontSize: 15 }} onClick={() => navigate('/register')}>
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

          {/* Right — mockup */}
          <div className="hero-visual" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end' }}>
            <DashboardMockup />
          </div>
        </div>
      </section>

      {/* ── STATS BAR ─────────────────────────────────────────────────────── */}
      <section style={{ background: C.green, padding: '28px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 48 }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', fontWeight: 500 }}>Trusted by growing businesses across India</p>
          {[
            ['200+', 'Companies'],
            ['20,000+', 'Payslips Generated'],
            ['99.9%', 'Uptime'],
            ['< 10 min', 'Avg Payroll Run'],
            ['6x', 'Cheaper than Keka'],
          ].map(([v, l]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{v}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── WHY PAYLEEF — PAIN POINT ──────────────────────────────────────── */}
      <section style={{ padding: '80px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', textAlign: 'center' }}>
          <div className="section-label">Why PayLeef?</div>
          <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 42px)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 16, color: C.text }}>
            Big payroll tools built for big companies.<br />
            <span style={{ color: C.green }}>PayLeef is built for you.</span>
          </h2>
          <p style={{ fontSize: 17, color: C.muted, maxWidth: 600, margin: '0 auto 48px', lineHeight: 1.7 }}>
            Software like greytHR and Keka is built for 1,000-person companies with full HR teams.
            If you run a business of 5 to 200 people, you need something that just works — fast, affordable, and India-compliant.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              {
                icon: '⚡',
                title: 'Ready in 10 Minutes',
                desc: 'Not weeks of onboarding. Add your employees, configure payroll rules, and generate your first payslips — all in one afternoon.',
                color: C.green,
                bg: C.greenLight,
              },
              {
                icon: '💰',
                title: 'Starting at ₹499/Month',
                desc: "Less than what you pay for a single employee's lunch. greytHR starts at ₹3,000. Keka starts at ₹6,000. We start at ₹499.",
                color: '#059669',
                bg: '#ECFDF5',
              },
              {
                icon: '🤖',
                title: 'AI That No One Else Has',
                desc: 'Employee self-service AI chat. Automatic anomaly detection. Features that big players charge extra for — included in every plan.',
                color: '#7C3AED',
                bg: '#F5F3FF',
              },
            ].map((item, i) => (
              <div key={i} style={{ background: item.bg, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, textAlign: 'left' }}>
                <div style={{ fontSize: 32, marginBottom: 14 }}>{item.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10, color: C.text }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: '96px 24px', background: C.bg, borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div className="section-label">Features</div>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 44px)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 14, color: C.text }}>
              Everything your business needs — nothing it doesn't
            </h2>
            <p style={{ fontSize: 17, color: C.muted, maxWidth: 520, margin: '0 auto', lineHeight: 1.65 }}>
              A complete payroll platform built for Indian compliance — from calculation to AI to payslip delivery.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {FEATURES.map((f, i) => (
              <div key={i} className="feature-card">
                <div style={{ width: 48, height: 48, borderRadius: 12, background: f.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 18 }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10, color: C.text }}>
                  {f.title}
                  {(i === 2 || i === 3) && <span className="ai-badge">AI</span>}
                </h3>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── AI FEATURES HIGHLIGHT ─────────────────────────────────────────── */}
      <section style={{ background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 50%, #0F3460 100%)', padding: '96px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{ display: 'inline-block', background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', padding: '4px 16px', borderRadius: 100, marginBottom: 16 }}>
              ✨ AI Powered Features
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 44px)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 14, color: '#fff' }}>
              The first Indian payroll with built-in AI
            </h2>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.65)', maxWidth: 520, margin: '0 auto', lineHeight: 1.65 }}>
              No other payroll at this price point has AI. PayLeef includes two powerful AI features that save time and prevent costly errors.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
            {/* AI Anomaly Detection */}
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(124,58,237,0.25)', border: '1px solid rgba(124,58,237,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🔍</div>
                <div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>Admin Feature</div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>AI Anomaly Detection</h3>
                </div>
              </div>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, marginBottom: 24 }}>
                After generating payslips, run an AI scan of the entire payroll. It compares month-over-month and flags issues automatically.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { icon: '🚨', text: 'Salary drop more than 20% vs last month', severity: 'HIGH' },
                  { icon: '⚠️', text: 'Zero deductions (PF/PT missing)', severity: 'HIGH' },
                  { icon: '📅', text: 'Employee has 3+ LOP days this month', severity: 'MEDIUM' },
                  { icon: '👤', text: 'New employee — verify details', severity: 'LOW' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 14px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)', flex: 1 }}>{item.text}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: item.severity === 'HIGH' ? 'rgba(220,38,38,0.3)' : item.severity === 'MEDIUM' ? 'rgba(217,119,6,0.3)' : 'rgba(37,99,235,0.3)', color: item.severity === 'HIGH' ? '#FCA5A5' : item.severity === 'MEDIUM' ? '#FCD34D' : '#93C5FD' }}>
                      {item.severity}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Employee AI Chat */}
            <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 36 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(8,145,178,0.25)', border: '1px solid rgba(8,145,178,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>💬</div>
                <div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>Employee Feature</div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>Employee AI Chat</h3>
                </div>
              </div>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, marginBottom: 24 }}>
                Employees log in and can ask questions about their salary slip in plain English. No more HR calls for basic payslip questions.
              </p>
              {/* Chat mockup */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { msg: 'Why did my salary change this month?', isUser: true },
                  { msg: 'You had 2 LOP days this month. Your present days were 24 out of 26, so your salary was prorated to ₹47,200 (from ₹51,000 gross).', isUser: false },
                  { msg: 'How much PF am I paying?', isUser: true },
                  { msg: 'Your PF deduction is ₹1,800/month — 12% of your basic salary, capped at the government limit.', isUser: false },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: item.isUser ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '80%', padding: '10px 14px', borderRadius: 12, fontSize: 13, lineHeight: 1.5,
                      background: item.isUser ? 'rgba(8,145,178,0.3)' : 'rgba(255,255,255,0.08)',
                      color: item.isUser ? '#E0F2FE' : 'rgba(255,255,255,0.8)',
                      border: `1px solid ${item.isUser ? 'rgba(8,145,178,0.4)' : 'rgba(255,255,255,0.08)'}`,
                    }}>
                      {item.msg}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── COMPLIANCE ────────────────────────────────────────────────────── */}
      <section style={{ background: C.bg, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: '80px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
          {/* Left */}
          <div>
            <div className="section-label">Government Compliance</div>
            <h2 style={{ fontSize: 'clamp(24px, 3vw, 40px)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 20, color: C.text }}>
              We simplify the government<br />pay process — completely.
            </h2>
            <p style={{ fontSize: 16, color: C.muted, lineHeight: 1.75, marginBottom: 32 }}>
              PF, ESI, Professional Tax, and TDS are complex, change frequently, and carry heavy penalties if wrong. PayLeef handles all of it automatically — no expertise required.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'PF (Provident Fund)', detail: 'Employee 12% + Employer 12% — automatically split. Employer contribution tracked separately. Capped at ₹1,800 as per government norms.', color: C.green },
                { label: 'ESI (Employee State Insurance)', detail: '0.75% employee + 3.25% employer — auto-computed for eligible staff (gross ≤ ₹21,000). Threshold enforced automatically.', color: '#059669' },
                { label: 'Professional Tax', detail: 'Slab-based PT applied on gross salary. Correct amount deducted every month — no manual lookup needed.', color: '#7C3AED' },
                { label: 'TDS Deduction', detail: 'Monthly TDS deducted as per annual CTC and entered adjustments. Full audit trail for income tax compliance.', color: '#DC2626' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#fff', border: `1.5px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, color: item.color }}>
                    <CheckIcon />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 3 }}>{item.label}</div>
                    <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.55 }}>{item.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — payslip card */}
          <div>
            <div style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 16, padding: 28, boxShadow: '0 4px 24px rgba(26,122,74,0.09)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Payslip — Arjun Sharma</h4>
                <span style={{ fontSize: 11, background: '#DCFCE7', color: '#166534', padding: '3px 10px', borderRadius: 6, fontWeight: 600 }}>Compliant ✓</span>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Earnings</div>
                {[
                  ['Basic Pay (40%)', '₹24,000'],
                  ['HRA (40% of Basic)', '₹9,600'],
                  ['Conveyance Allowance', '₹1,600'],
                  ['Special Allowance', '₹24,800'],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F8FAFC', fontSize: 13 }}>
                    <span style={{ color: C.muted }}>{k}</span>
                    <span style={{ fontWeight: 600, color: C.text }}>{v}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 13, fontWeight: 700, color: C.green }}>
                  <span>Gross Pay</span><span>₹60,000</span>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Deductions</div>
                {[
                  ['PF Employee (12%)', '₹1,800', C.green],
                  ['ESI Employee (0.75%)', '₹450', '#7C3AED'],
                  ['Professional Tax', '₹200', '#DC2626'],
                  ['TDS (Income Tax)', '₹2,100', '#D97706'],
                ].map(([k, v, c]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #F8FAFC', fontSize: 13 }}>
                    <span style={{ color: C.muted }}>{k}</span>
                    <span style={{ fontWeight: 600, color: c }}>{v}</span>
                  </div>
                ))}
              </div>

              <div style={{ background: C.green, borderRadius: 10, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}>Net Take-Home Pay</span>
                <span style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>₹55,450</span>
              </div>

              <div style={{ marginTop: 14, background: C.greenLight, borderRadius: 8, padding: '10px 14px', fontSize: 12, color: C.green, fontWeight: 500 }}>
                🏦 Employer also contributing: PF ₹1,800 + ESI ₹1,950 (tracked separately)
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
              From zero to payslips in 3 steps
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {[
              {
                num: '01',
                icon: '👥',
                title: 'Add your employees',
                desc: 'Upload all employees via CSV or add them manually. Name, department, salary, date of joining — done in minutes.',
                detail: ['Import from Excel or CSV', 'Manual entry with form', 'All departments & designations'],
              },
              {
                num: '02',
                icon: '⚙️',
                title: 'Configure your payroll rules',
                desc: 'Set up earnings (Basic, HRA, Allowances) and deductions (PF, ESI, PT, TDS). Pre-built Indian rules are ready to go.',
                detail: ['Pre-built Indian tax rules', 'Customisable components', 'LOP & overtime support'],
              },
              {
                num: '03',
                icon: '🚀',
                title: 'Generate, scan with AI & send',
                desc: 'Pick the month, run AI anomaly scan, review the payroll, and click Generate. Professional PDFs emailed to every employee in one click.',
                detail: ['Bulk generation for all staff', 'AI error scan before sending', 'Auto email to each employee'],
              },
            ].map((s, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '64px 1fr', gap: 28, alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="step-num">{s.num}</div>
                  {i < 2 && <div style={{ width: 2, height: 60, background: '#DCFCE7', marginTop: 8 }} />}
                </div>
                <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: 14, padding: 28 }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{s.icon}</div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10, color: C.text }}>{s.title}</h3>
                  <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7, marginBottom: 16 }}>{s.desc}</p>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {s.detail.map(d => (
                      <span key={d} style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 6, background: C.greenLight, color: C.green }}>
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
            { ref: empRef, count: emp, suffix: '+', label: 'Companies using PayLeef', icon: '🏢' },
            { ref: psRef, count: ps, suffix: '+', label: 'Payslips Generated', icon: '📄' },
            { ref: minsRef, count: mins, suffix: ' min', label: 'Average payroll run', icon: '⚡' },
          ].map((s, i) => (
            <div key={i} ref={s.ref} style={{ background: '#fff', border: `1px solid ${C.border}`, borderRadius: 14, padding: '32px 24px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>{s.icon}</div>
              <div style={{ fontSize: 42, fontWeight: 900, color: C.green, letterSpacing: '-0.02em' }}>
                {s.count.toLocaleString('en-IN')}{s.suffix}
              </div>
              <div style={{ fontSize: 14, color: C.muted, marginTop: 6 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ padding: '96px 24px', background: '#fff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div className="section-label">Pricing</div>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 44px)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 12, color: C.text }}>
              Simple, transparent pricing
            </h2>
            <p style={{ fontSize: 16, color: C.muted }}>
              No hidden fees. No long-term contracts. Start free, upgrade when ready.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, alignItems: 'start' }}>
            {PLANS.map((plan, i) => (
              <div
                key={i}
                className="plan-card"
                style={{
                  position: 'relative',
                  background: plan.highlight ? C.green : '#fff',
                  border: plan.highlight ? `2px solid ${C.green}` : `1px solid ${C.border}`,
                  boxShadow: plan.highlight ? '0 16px 48px rgba(26,122,74,0.25)' : '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                {plan.badge && (
                  <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: plan.highlight ? '#fff' : C.green, color: plan.highlight ? C.green : '#fff', fontSize: 10, fontWeight: 800, padding: '4px 12px', borderRadius: 100, whiteSpace: 'nowrap', boxShadow: '0 2px 8px rgba(26,122,74,0.2)' }}>
                    {plan.badge}
                  </div>
                )}
                <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: plan.highlight ? '#fff' : C.text }}>{plan.name}</div>
                <div style={{ marginBottom: 4 }}>
                  <span style={{ fontSize: 34, fontWeight: 900, color: plan.highlight ? '#fff' : C.green }}>{plan.price}</span>
                  <span style={{ fontSize: 13, color: plan.highlight ? 'rgba(255,255,255,0.65)' : C.muted, marginLeft: 4 }}>{plan.period}</span>
                </div>
                {plan.perEmp && (
                  <div style={{ fontSize: 11, color: plan.highlight ? 'rgba(255,255,255,0.6)' : C.muted, marginBottom: 8 }}>≈ {plan.perEmp}</div>
                )}
                <p style={{ fontSize: 13, color: plan.highlight ? 'rgba(255,255,255,0.7)' : C.muted, marginBottom: 20, lineHeight: 1.5 }}>{plan.desc}</p>
                <button
                  onClick={() => navigate('/register')}
                  style={{
                    width: '100%', justifyContent: 'center', marginBottom: 20,
                    background: plan.highlight ? '#fff' : C.green,
                    color: plan.highlight ? C.green : '#fff',
                    border: 'none', padding: '11px 16px', borderRadius: 8,
                    fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  {plan.cta}
                </button>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {plan.features.map(f => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: plan.highlight ? 'rgba(255,255,255,0.85)' : C.muted }}>
                      <span style={{ color: plan.highlight ? '#86EFAC' : '#059669', flexShrink: 0 }}><CheckIcon /></span>
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Enterprise note */}
          <div style={{ marginTop: 32, textAlign: 'center', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 12, padding: '20px 32px' }}>
            <p style={{ fontSize: 15, color: C.text }}>
              <strong>200+ employees?</strong> <span style={{ color: C.muted }}>We offer custom enterprise pricing with dedicated support, SLA, and multi-company features.</span>
              <button onClick={() => navigate('/register')} style={{ background: 'none', border: 'none', color: C.green, fontWeight: 700, fontSize: 15, cursor: 'pointer', marginLeft: 8 }}>
                Contact us →
              </button>
            </p>
          </div>
        </div>
      </section>

      {/* ── COMPARISON TABLE ──────────────────────────────────────────────── */}
      <section id="compare" style={{ padding: '96px 24px', background: C.bg, borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div className="section-label">Compare</div>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 44px)', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: 12, color: C.text }}>
              How PayLeef stacks up
            </h2>
            <p style={{ fontSize: 16, color: C.muted }}>
              Big names. Big prices. Big complexity. We're different.
            </p>
          </div>

          <div style={{ background: '#fff', borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', background: C.green, padding: '14px 24px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>Feature</div>
              {['PayLeef', 'greytHR', 'Keka', 'Zoho'].map(name => (
                <div key={name} style={{ fontSize: 13, fontWeight: 800, color: '#fff', textAlign: 'center' }}>{name}</div>
              ))}
            </div>

            {COMPARISON.map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '13px 24px', borderBottom: i < COMPARISON.length - 1 ? `1px solid ${C.border}` : 'none', background: i % 2 === 0 ? '#fff' : C.bg }}>
                <div style={{ fontSize: 14, color: C.text, fontWeight: 500 }}>{row.feature}</div>
                {[row.payleef, row.greythr, row.keka, row.zoho].map((val, j) => (
                  <div key={j} style={{ textAlign: 'center', fontSize: 13 }}>
                    {typeof val === 'boolean' ? (
                      val
                        ? <span style={{ color: j === 0 ? C.green : '#059669' }}><CheckIcon /></span>
                        : <span style={{ color: '#CBD5E1' }}><XMarkIcon /></span>
                    ) : (
                      <span style={{ fontWeight: j === 0 ? 700 : 500, color: j === 0 ? C.green : C.muted }}>{val}</span>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ──────────────────────────────────────────────────── */}
      <section id="testimonials" style={{ padding: '96px 24px', background: '#fff', borderTop: `1px solid ${C.border}` }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div className="section-label">Reviews</div>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 44px)', fontWeight: 800, letterSpacing: '-0.02em', color: C.text }}>
              Loved by business owners across India
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="testimonial-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 3 }}>
                    {[...Array(t.rating)].map((_, j) => <StarIcon key={j} />)}
                  </div>
                  <span style={{ fontSize: 11, color: C.muted, background: C.bg, padding: '2px 8px', borderRadius: 4 }}>{t.empCount}</span>
                </div>
                <p style={{ fontSize: 14, color: '#334155', lineHeight: 1.75, marginBottom: 22 }}>
                  "{t.text}"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, borderRadius: '50%', background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
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
      <section style={{ background: 'linear-gradient(135deg, #166534 0%, #1A7A4A 100%)', padding: '80px 24px' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🍃</div>
          <h2 style={{ fontSize: 'clamp(28px, 4vw, 48px)', fontWeight: 900, letterSpacing: '-0.02em', color: '#fff', marginBottom: 16, lineHeight: 1.15 }}>
            Ready to simplify your payroll?
          </h2>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.75)', marginBottom: 36, lineHeight: 1.65 }}>
            Join 200+ Indian businesses running smarter, error-free payroll with PayLeef.<br />
            30-day free trial — no credit card. No onboarding calls. Just payroll that works.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn-white" onClick={() => navigate('/register')}>
              Start Free — 30 Days <ArrowIcon />
            </button>
            <button className="btn-outline-white" onClick={() => navigate('/login')}>
              Sign in to account
            </button>
          </div>
          <p style={{ marginTop: 24, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            ✓ Setup in 10 minutes &nbsp; ✓ No credit card &nbsp; ✓ Cancel anytime
          </p>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer style={{ background: '#0F172A', padding: '56px 24px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 48 }}>
            {/* Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <LeafMark size={19} />
                </div>
                <span style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>PayLeef</span>
              </div>
              <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.75, maxWidth: 240, marginBottom: 16 }}>
                India's Simplest Payroll. Built for businesses of 5–200 employees. Zero errors. 100% government compliant.
              </p>
              <p style={{ fontSize: 12, color: '#475569' }}>🇮🇳 Made in India · Built for India</p>
            </div>

            {[
              { heading: 'Product', items: ['Features', 'AI Features', 'Pricing', 'Compare', 'PDF Templates'] },
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
            <p style={{ fontSize: 13, color: '#475569' }}>© 2026 PayLeef · India's Simplest Payroll</p>
            <p style={{ fontSize: 13, color: '#475569' }}>Built by DinMind Software Solutions</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
