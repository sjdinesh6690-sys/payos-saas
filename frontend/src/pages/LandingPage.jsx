import { useState, useEffect, useRef } from 'react';
import DemoVideo from '@/components/DemoVideo';
import { useNavigate } from 'react-router-dom';

/* ─── Scroll reveal ─────────────────────────────────────────────────────── */
function useReveal(t = 0.12) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); o.disconnect(); } }, { threshold: t });
    if (ref.current) o.observe(ref.current);
    return () => o.disconnect();
  }, []);
  return [ref, vis];
}

/* ─── Leaf icon ─────────────────────────────────────────────────────────── */
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

/* ─── Check icon ────────────────────────────────────────────────────────── */
const Check = ({ color = '#16A34A', size = 7 }) => (
  <svg viewBox="0 0 10 10" fill="none" style={{ width: size, height: size }}>
    <path d="M1.5 5L3.5 7.5L8.5 2.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ─── Section label ─────────────────────────────────────────────────────── */
const SectionLabel = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 700, color: G, textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 14 }}>{children}</div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN LANDING PAGE
═══════════════════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [faqOpen, setFaqOpen] = useState(null);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  const industries = ['🏭 Manufacturing', '🏥 Healthcare', '🛒 Retail & FMCG', '💼 IT Services', '🏗️ Construction', '🚚 Logistics & Transport', '🏫 Schools & Colleges', '🏨 Hotels & Hospitality', '📦 E-commerce', '⚙️ Engineering Firms', '🧪 Pharma & Biotech', '🏦 Finance & NBFC', '🏪 Supermarkets', '🏋️ Fitness & Wellness'];

  return (
    <div style={{ fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,sans-serif", background: '#fff', color: '#0F172A', overflowX: 'hidden' }}>

      {/* ══ NAV ════════════════════════════════════════════════════════════ */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
        background: scrolled ? 'rgba(255,255,255,0.96)' : 'white',
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
          <div className="nav-links" style={{ display: 'flex', gap: 28 }}>
            {[['Features', '#features'], ['How it works', '#how'], ['Pricing', '#pricing'], ['FAQ', '#faq']].map(([l, h]) => (
              <a key={l} href={h} style={{ fontSize: 14, color: '#64748B', textDecoration: 'none', fontWeight: 500 }}
                onMouseOver={e => e.target.style.color = '#0F172A'} onMouseOut={e => e.target.style.color = '#64748B'}>{l}</a>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate('/login')} style={{ fontSize: 14, color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', padding: '8px 14px', borderRadius: 8, fontWeight: 500 }}>Sign in</button>
            <button onClick={() => navigate('/register')} style={{ fontSize: 14, fontWeight: 700, color: 'white', background: G, border: 'none', borderRadius: 9, cursor: 'pointer', padding: '9px 20px', boxShadow: '0 2px 10px rgba(26,122,74,0.3)' }}>
              Start Free Trial →
            </button>
          </div>
        </div>
      </nav>

      {/* ══ HERO ════════════════════════════════════════════════════════════ */}
      <section style={{ paddingTop: 110, paddingBottom: 70, paddingLeft: 24, paddingRight: 24, background: 'linear-gradient(180deg,#F0FDF4 0%,#ffffff 65%)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(#D1FAE5 1px,transparent 1px)', backgroundSize: '28px 28px', opacity: 0.5, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 20, padding: '6px 16px', marginBottom: 28 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#22C55E', boxShadow: '0 0 6px #22C55E' }} />
            <span style={{ fontSize: 13, color: '#15803D', fontWeight: 600 }}>Made for India · PF · ESI · TDS · PT · Form 16</span>
          </div>

          <h1 style={{ fontSize: 'clamp(36px,6vw,70px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.035em', margin: '0 0 10px', color: '#0F172A' }}>
            Your employees deserve
          </h1>
          <h1 style={{ fontSize: 'clamp(36px,6vw,70px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.035em', margin: '0 0 24px', color: G }}>
            payslips on time. Every time.
          </h1>

          <p style={{ fontSize: 'clamp(16px,2vw,19px)', color: '#475569', maxWidth: 540, margin: '0 auto 20px', lineHeight: 1.75 }}>
            PayLeef automates your entire monthly payroll — salary calculations, PF, TDS, ESI, LOP — and delivers password-protected PDF payslips directly to every employee's inbox.
          </p>
          <p style={{ fontSize: 15, color: '#64748B', margin: '0 auto 40px', maxWidth: 480 }}>
            <strong style={{ color: '#0F172A' }}>HR teams save 4–6 hours every month.</strong> Employees get instant access to their payslips, Form 16, and a built-in AI to answer their pay questions.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 28 }}>
            <button onClick={() => navigate('/register')} style={{
              background: G, color: 'white', border: 'none', borderRadius: 12, padding: '15px 34px', fontSize: 16, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 24px rgba(26,122,74,0.35)', transition: 'transform 0.15s, box-shadow 0.15s',
            }}
              onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(26,122,74,0.45)'; }}
              onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(26,122,74,0.35)'; }}
            >
              Start Free — 30 Days, No Card →
            </button>
            <a href="#demo-video" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#374151', background: 'white', border: '1.5px solid #E2E8F0', borderRadius: 12, padding: '14px 26px', fontSize: 15, fontWeight: 500, textDecoration: 'none', transition: 'all 0.2s' }}
              onMouseOver={e => { e.currentTarget.style.borderColor = G; e.currentTarget.style.color = G; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#374151'; }}
            >
              <svg viewBox="0 0 12 14" fill="none" style={{ width: 10, height: 10 }}><path d="M1 1L11 7L1 13V1Z" fill="currentColor" /></svg>
              Watch 3-min demo
            </a>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
            {['No credit card needed', 'Setup in 10 minutes', 'Data stays in India', 'Cancel anytime'].map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748B' }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Check /></div>
                {t}
              </div>
            ))}
          </div>
        </div>

        {/* Hero stats */}
        <div style={{ maxWidth: 700, margin: '56px auto 0', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 2 }}>
          {[
            { v: '₹2.4Cr+', l: 'Payroll Processed' },
            { v: '10 min', l: 'Avg. Full Payroll Run' },
            { v: '100%', l: 'India Compliant (PF, ESI, TDS)' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center', padding: '20px', borderRight: i < 2 ? '1px solid #E2E8F0' : 'none' }}>
              <div style={{ fontSize: 'clamp(24px,4vw,36px)', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.03em', lineHeight: 1 }}>{s.v}</div>
              <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 6, fontWeight: 500 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ PAIN POINT (The old way) ════════════════════════════════════════ */}
      <section style={{ padding: '72px 24px', background: '#FFF7ED', borderTop: '1px solid #FED7AA' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <SectionLabel>Sound familiar?</SectionLabel>
            <h2 style={{ fontSize: 'clamp(24px,4vw,40px)', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.025em', margin: 0 }}>
              Payroll done manually is painful for everyone.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {[
              {
                who: '😩 HR Manager',
                pain: '"I spend 2 full days every month in Excel. One wrong formula ruins everything. And I still get calls from employees asking where their payslip is."',
                bg: '#FFF1F2', border: '#FECACA',
              },
              {
                who: '👨‍💼 Business Owner',
                pain: '"I don\'t know if PF and TDS are being calculated correctly. I\'m scared of a compliance notice. My accountant charges extra just for this."',
                bg: '#FFFBEB', border: '#FCD34D',
              },
              {
                who: '👤 Employee',
                pain: '"I always get my payslip late — sometimes after the 15th. I can\'t get it on WhatsApp when I need it for a loan application or background check."',
                bg: '#F5F3FF', border: '#DDD6FE',
              },
            ].map((c, i) => {
              const [ref, vis] = useReveal();
              return (
                <div key={i} ref={ref} style={{ background: c.bg, border: `1.5px solid ${c.border}`, borderRadius: 16, padding: '22px 20px', opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(18px)', transition: `all 0.45s ease ${i * 0.1}s` }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 12 }}>{c.who}</div>
                  <div style={{ fontSize: 14, color: '#374151', lineHeight: 1.75, fontStyle: 'italic' }}>{c.pain}</div>
                </div>
              );
            })}
          </div>
          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <div style={{ display: 'inline-block', background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: 12, padding: '14px 28px', fontSize: 15, fontWeight: 700, color: G }}>
              PayLeef solves all 3 problems — for HR, owners, and employees. ↓
            </div>
          </div>
        </div>
      </section>

      {/* ══ INDUSTRIES MARQUEE ══════════════════════════════════════════════ */}
      <div style={{ borderTop: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9', padding: '18px 0', overflow: 'hidden', background: '#FAFAFA', position: 'relative' }}>
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 80, background: 'linear-gradient(to right,#FAFAFA,transparent)', zIndex: 2, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, background: 'linear-gradient(to left,#FAFAFA,transparent)', zIndex: 2, pointerEvents: 'none' }} />
        <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: '.1em', textTransform: 'uppercase' }}>Trusted by businesses across India</div>
        <div className="marquee-track">
          {[...industries, ...industries].map((item, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginRight: 36, fontSize: 13, color: '#64748B', fontWeight: 500, whiteSpace: 'nowrap' }}>
              {item}
            </span>
          ))}
        </div>
      </div>

      {/* ══ DEMO VIDEO ══════════════════════════════════════════════════════ */}
      <section id="demo-video" style={{ padding: '80px 24px 72px', background: '#0F172A' }}>
        <div style={{ maxWidth: 980, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 44 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 20, padding: '6px 16px', marginBottom: 16 }}>
              <svg viewBox="0 0 12 14" fill="none" style={{ width: 10, height: 10 }}><path d="M1 1L11 7L1 13V1Z" fill="#4ADE80" /></svg>
              <span style={{ fontSize: 12, color: '#4ADE80', fontWeight: 600 }}>Full product walkthrough — 3 minutes</span>
            </div>
            <h2 style={{ fontSize: 'clamp(24px,4vw,42px)', fontWeight: 900, color: 'white', margin: '0 0 12px', letterSpacing: '-0.03em' }}>
              See exactly how PayLeef works
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
              Dashboard → Employees → AI detection → PDF payslip → Bulk send → Employee portal → Compliance reports
            </p>
          </div>
          <DemoVideo />
        </div>
      </section>

      {/* ══ HOW IT WORKS ════════════════════════════════════════════════════ */}
      <section id="how" style={{ padding: '80px 24px', background: 'white' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <SectionLabel>How it works</SectionLabel>
            <h2 style={{ fontSize: 'clamp(26px,4vw,42px)', fontWeight: 900, margin: '0 0 12px', letterSpacing: '-0.025em', color: '#0F172A' }}>
              3 simple steps. Under 10 minutes. Every month.
            </h2>
            <p style={{ fontSize: 15, color: '#64748B', maxWidth: 480, margin: '0 auto' }}>No training needed. No complex setup. Just payroll done right.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 32, position: 'relative' }}>
            {[
              {
                n: '01', icon: '📤', color: '#F0FDF4', border: '#BBF7D0',
                title: 'Upload your salary data',
                desc: 'Drop an Excel file or CSV — any format. PayLeef\'s smart import automatically maps your columns. Or type directly in the built-in salary grid. Add LOP, bonus, overtime per employee.',
                time: '~2 minutes',
              },
              {
                n: '02', icon: '🤖', color: '#F5F3FF', border: '#DDD6FE',
                title: 'AI reviews every number',
                desc: 'Payroll engine auto-calculates PF (12%), ESI (0.75%), TDS (New/Old regime), Professional Tax (state-wise), and LOP deductions. AI flags salary spikes, wrong numbers, and missing data — before any payslip is sent.',
                time: '~1 minute',
              },
              {
                n: '03', icon: '🚀', color: '#FFFBEB', border: '#FCD34D',
                title: 'Send to everyone — one click',
                desc: 'PDF payslips are generated instantly with your company branding. Each PDF is password-protected (employee DOB). Sent directly to each employee\'s email. Self-service portal updated automatically.',
                time: '~3 minutes',
              },
            ].map((s, i) => {
              const [ref, vis] = useReveal();
              return (
                <div key={i} ref={ref} style={{ opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(18px)', transition: `all 0.45s ease ${i * 0.12}s` }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: s.color, border: `1.5px solid ${s.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 16 }}>{s.icon}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', letterSpacing: '.1em' }}>STEP {s.n}</span>
                    <span style={{ fontSize: 11, background: '#F0FDF4', color: G, borderRadius: 20, padding: '2px 8px', fontWeight: 600 }}>⏱ {s.time}</span>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginBottom: 10, lineHeight: 1.3 }}>{s.title}</div>
                  <div style={{ fontSize: 14, color: '#64748B', lineHeight: 1.75 }}>{s.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══ BENEFITS — TWO AUDIENCES ════════════════════════════════════════ */}
      <section style={{ padding: '80px 24px', background: '#F8FAFC', borderTop: '1px solid #F1F5F9' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <SectionLabel>Who benefits</SectionLabel>
            <h2 style={{ fontSize: 'clamp(26px,4vw,42px)', fontWeight: 900, margin: '0 0 12px', letterSpacing: '-0.025em', color: '#0F172A' }}>
              Built for HR teams. Loved by employees.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* HR / Admin side */}
            <div style={{ background: 'white', border: '1.5px solid #E2E8F0', borderRadius: 20, padding: '32px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{ width: 46, height: 46, borderRadius: 14, background: '#F0FDF4', border: '1.5px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🏢</div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#0F172A' }}>For HR & Business Owners</div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>Save hours. Run error-free payroll.</div>
                </div>
              </div>
              {[
                { icon: '⚡', title: 'Full payroll in under 10 minutes', body: 'What used to take 2 days now takes 10 minutes. Upload salaries, review AI flags, and send — all in one place.' },
                { icon: '🤖', title: 'AI catches errors before you send', body: 'No more "sorry wrong salary" emails. AI scans every number for spikes, missing deductions, and anomalies.' },
                { icon: '🇮🇳', title: 'Zero compliance headaches', body: 'PF, ESI, TDS, Professional Tax auto-calculated every month. PF ECR, ESI, Bank Advice files ready to upload to government portals.' },
                { icon: '📑', title: 'All reports in one click', body: 'Form 16 Part B, Salary Register, PF ECR, ESI returns, Bank Advice — download formatted Excel files instantly.' },
                { icon: '🏗️', title: 'Multi-location support', body: 'Manage multiple office locations with separate payslip templates and Professional Tax slabs per state.' },
                { icon: '🔒', title: 'Audit trail & payroll lock', body: 'Lock each month\'s payroll once finalized. Full audit trail shows every change — who, when, what.' },
              ].map((b, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 18 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{b.icon}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>{b.title}</div>
                    <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>{b.body}</div>
                  </div>
                </div>
              ))}
              <button onClick={() => navigate('/register')} style={{ width: '100%', marginTop: 8, padding: '12px', background: G, color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Start Free Trial — No Card Required →
              </button>
            </div>

            {/* Employee side */}
            <div style={{ background: 'linear-gradient(160deg, #0F172A, #1A3A2A)', border: '1.5px solid rgba(74,222,128,0.2)', borderRadius: 20, padding: '32px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{ width: 46, height: 46, borderRadius: 14, background: 'rgba(74,222,128,0.12)', border: '1.5px solid rgba(74,222,128,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>👤</div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: 'white' }}>For Employees</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Know your pay. Anytime, anywhere.</div>
                </div>
              </div>
              {[
                { icon: '📱', title: 'Payslip on your phone — instantly', body: 'No more asking HR. Log in from your phone and download any month\'s payslip in seconds. Even from previous years.' },
                { icon: '🔒', title: 'Password-protected PDF', body: 'Your payslip PDF is secured with your date of birth as the password. Safe to share for loan applications, background checks, and visa applications.' },
                { icon: '🤖', title: 'Ask AI about your pay', body: '"Why is my TDS higher?" "What is HRA?" "When will I get Form 16?" — Ask in plain English. Get a clear answer instantly. No more waiting for HR to reply.' },
                { icon: '📋', title: 'Form 16 downloaded directly', body: 'At year end, download your Form 16 Part B directly from the portal. No need to email HR. No delays.' },
                { icon: '📊', title: 'Full salary breakdown visible', body: 'See every component — Basic, HRA, PF, TDS, LOP deduction — clearly explained. Know exactly what you take home and why.' },
                { icon: '🔑', title: 'Your own secure login', body: 'HR gives you portal access. You set your own password. Your data is private — only you can see your payslips.' },
              ].map((b, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 18 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{b.icon}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 2 }}>{b.title}</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>{b.body}</div>
                  </div>
                </div>
              ))}
              <div style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 10, padding: '12px 14px', marginTop: 8 }}>
                <div style={{ fontSize: 13, color: '#4ADE80', fontWeight: 600 }}>✓ Employee portal is included in every plan — free for all your staff</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ FEATURES ════════════════════════════════════════════════════════ */}
      <section id="features" style={{ padding: '80px 24px', background: 'white', borderTop: '1px solid #F1F5F9' }}>
        <div style={{ maxWidth: 1060, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <SectionLabel>All features</SectionLabel>
            <h2 style={{ fontSize: 'clamp(26px,4vw,42px)', fontWeight: 900, margin: '0 0 12px', letterSpacing: '-0.025em', color: '#0F172A' }}>
              Everything payroll needs. Nothing it doesn't.
            </h2>
            <p style={{ fontSize: 15, color: '#64748B', maxWidth: 500, margin: '0 auto' }}>One flat price. All features included. No hidden add-ons.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {[
              {
                icon: '🤖', bg: '#F0FDF4', title: 'AI Anomaly Detection',
                desc: 'AI scans every salary line before payslips go out. Automatically catches suspicious spikes (+20% month-on-month), wrong PF calculations, duplicate entries, and missing deductions — and asks you to confirm or reject.',
                tags: ['Smart alerts', 'Before sending', 'One-click approve'],
              },
              {
                icon: '🧮', bg: '#EFF6FF', title: 'Automatic Payroll Calculations',
                desc: 'PF at 12% of basic, ESI at 0.75%, TDS under New & Old Tax Regime, LOP by daily rate from attendance, Professional Tax by state slab — all calculated automatically. No formulas. No errors.',
                tags: ['PF · ESI · TDS · PT', 'LOP auto-deducted', 'New & Old regime'],
              },
              {
                icon: '📄', bg: '#FFF7ED', title: 'Professional PDF Payslips',
                desc: 'Every payslip is generated as a clean, professional PDF with your company logo and branding. Password-protected with the employee\'s date of birth. Delivered to their email inbox automatically.',
                tags: ['Company branding', 'Password-protected', 'Instant delivery'],
              },
              {
                icon: '📅', bg: '#F5F3FF', title: 'Attendance & Leave Management',
                desc: 'Upload attendance via CSV for 500+ employees in one go, or enter manually. Track CL, SL, EL leave balances per employee. LOP is automatically pulled into payroll from attendance — no double entry.',
                tags: ['CSV bulk upload', 'CL · SL · EL leaves', 'Auto LOP deduction'],
              },
              {
                icon: '📑', bg: '#ECFDF5', title: 'Compliance Reports — All Formats',
                desc: 'Every government report ready in one click: PF ECR file for EPFO upload, ESI report for ESIC portal, Professional Tax challan, Bank Advice for salary transfers, Salary Register, Form 16 Part B.',
                tags: ['PF ECR · ESI', 'Bank Advice · PT', 'Form 16 Part B'],
              },
              {
                icon: '👥', bg: '#FFFBEB', title: 'Employee Master & History',
                desc: 'Full employee database with joining date, department, designation, bank account, PF & ESI numbers, emergency contact. Complete salary revision history. See every change ever made — who changed what and when.',
                tags: ['Complete records', 'Salary history', 'Bank details'],
              },
              {
                icon: '🔐', bg: '#FFF1F2', title: 'Payroll Lock & Audit Trail',
                desc: 'Lock each month\'s payroll once finalized — prevents accidental changes. Full audit trail logs every action: who generated, who edited, who sent. Fully traceable for compliance and HR governance.',
                tags: ['Month-end lock', 'Full audit log', 'Who did what'],
              },
              {
                icon: '🏗️', bg: '#F0F9FF', title: 'Multi-Location & Sub-Users',
                desc: 'Manage multiple office locations with separate payslip configurations per location. Create sub-users (HR managers) with module-level permissions — control who can view, edit, generate, or send payslips.',
                tags: ['Multiple offices', 'Sub-user roles', 'Permission control'],
              },
              {
                icon: '📧', bg: '#F8FAFC', title: 'Custom Email Branding',
                desc: 'Payslip emails are sent from your company name and domain (using Resend). Customise the email subject, message body, and logo. Employees see your company name — not a third-party platform.',
                tags: ['Your domain', 'Custom message', 'Professional look'],
              },
            ].map((c, i) => {
              const [ref, vis] = useReveal();
              return (
                <div key={i} ref={ref} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 16, padding: '22px 20px', opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(18px)', transition: `all 0.45s ease ${i * 0.06}s` }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 14 }}>{c.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', marginBottom: 8 }}>{c.title}</div>
                  <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.7, marginBottom: 12 }}>{c.desc}</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {c.tags.map(tag => (
                      <span key={tag} style={{ fontSize: 10, fontWeight: 600, color: G, background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 20, padding: '2px 8px' }}>{tag}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ══ COMPLIANCE — DEDICATED SECTION ═════════════════════════════════ */}
      <section style={{ padding: '80px 24px', background: 'linear-gradient(160deg, #0F172A 0%, #0A2E1A 100%)', borderTop: '1px solid #1E293B' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, color: '#4ADE80', textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 14 }}>India Compliance</div>
            <h2 style={{ fontSize: 'clamp(24px,4vw,40px)', fontWeight: 900, color: 'white', margin: '0 0 12px', letterSpacing: '-0.025em' }}>
              Every government report — ready to submit
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.5)', maxWidth: 520, margin: '0 auto' }}>
              No more manually filling government portal forms. Download formatted files and upload directly.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {[
              {
                icon: '🏦', title: 'PF ECR File', subtitle: 'EPFO Portal',
                desc: 'Electronic Challan cum Return file in the exact format required by EPFO. Upload directly to the EPFO unified portal. Includes employer and employee contributions.',
                badge: 'Monthly',
              },
              {
                icon: '🏥', title: 'ESI Contribution Report', subtitle: 'ESIC Portal',
                desc: 'ESI contribution report for employees earning up to ₹21,000/month. Formatted for direct upload to the ESIC portal. Employee and employer share calculated automatically.',
                badge: 'Monthly',
              },
              {
                icon: '📋', title: 'Professional Tax Challan', subtitle: 'State Government',
                desc: 'State-wise PT slabs automatically applied. Formatted challan for Maharashtra, Karnataka, Tamil Nadu, and all other PT states. Different slabs handled automatically by location.',
                badge: 'Monthly',
              },
              {
                icon: '💳', title: 'Bank Salary Advice', subtitle: 'Your Bank',
                desc: 'NEFT/RTGS salary transfer file with employee name, bank account, IFSC code, and net salary. Formatted for upload to your bank\'s corporate net banking portal.',
                badge: 'Monthly',
              },
              {
                icon: '📑', title: 'Form 16 Part B', subtitle: 'Income Tax',
                desc: 'Complete Form 16 Part B with salary details, deductions, and TDS summary for each employee. Generated for the full financial year. Employees download it directly from their portal.',
                badge: 'Annual',
              },
              {
                icon: '📊', title: 'Salary Register', subtitle: 'Internal / Audit',
                desc: 'Full monthly salary register with every employee, all earnings, all deductions, and net pay. Excel format ready for your accountant, auditor, or internal records.',
                badge: 'Monthly',
              },
            ].map((r, i) => {
              const [ref, vis] = useReveal();
              return (
                <div key={i} ref={ref} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: '22px 20px', opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(18px)', transition: `all 0.45s ease ${i * 0.07}s` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{r.icon}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(74,222,128,0.12)', color: '#4ADE80', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 20, padding: '3px 9px' }}>{r.badge}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: 'white', marginBottom: 3 }}>{r.title}</div>
                  <div style={{ fontSize: 11, color: '#4ADE80', fontWeight: 600, marginBottom: 10 }}>→ {r.subtitle}</div>
                  <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>{r.desc}</div>
                </div>
              );
            })}
          </div>
          <div style={{ textAlign: 'center', marginTop: 40, fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
            All reports downloadable as formatted Excel files. No data entry. No manual formatting. One click.
          </div>
        </div>
      </section>

      {/* ══ COMPARISON TABLE ════════════════════════════════════════════════ */}
      <section style={{ padding: '80px 24px', background: 'white', borderTop: '1px solid #F1F5F9' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <SectionLabel>PayLeef vs Manual Payroll</SectionLabel>
            <h2 style={{ fontSize: 'clamp(24px,4vw,40px)', fontWeight: 900, margin: 0, letterSpacing: '-0.025em', color: '#0F172A' }}>
              Why switch from Excel & WhatsApp?
            </h2>
          </div>
          <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
            {/* Header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
              <div style={{ padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.06em' }}>Feature</div>
              <div style={{ padding: '14px 16px', fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'center', borderLeft: '1px solid #E2E8F0' }}>Excel / Manual</div>
              <div style={{ padding: '14px 16px', fontSize: 12, fontWeight: 800, color: G, textTransform: 'uppercase', letterSpacing: '.06em', textAlign: 'center', background: '#F0FDF4', borderLeft: '1px solid #BBF7D0' }}>PayLeef Pro</div>
            </div>
            {[
              ['Time to run payroll', '2–3 days', '< 10 minutes'],
              ['PF / TDS / ESI calculations', 'Manual + error-prone', 'Auto, 100% accurate'],
              ['Payslip delivery to employees', 'WhatsApp / printed', 'Email + secure portal'],
              ['AI error detection', '❌ None', '✓ Every month'],
              ['Form 16 generation', 'Accountant charges extra', '✓ Built-in, free'],
              ['Government report files', 'Manual formatting', '✓ 1-click Excel download'],
              ['Employee self-service', '❌ None — call HR', '✓ 24/7 portal + AI chat'],
              ['Salary revision history', 'Hard to track', '✓ Full history logged'],
              ['Payroll lock & audit trail', '❌ No control', '✓ Locked & traceable'],
              ['Multi-location support', 'Separate files per location', '✓ All in one system'],
              ['Compliance risk', 'High — easy to miss', 'Low — rules built-in'],
              ['Cost', 'HR time + accountant fees', '₹999/month flat'],
            ].map(([feature, manual, payleef], i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', borderBottom: '1px solid #F1F5F9', background: i % 2 === 0 ? 'white' : '#FAFAFA' }}>
                <div style={{ padding: '12px 20px', fontSize: 14, color: '#374151', fontWeight: 500 }}>{feature}</div>
                <div style={{ padding: '12px 16px', fontSize: 13, color: '#EF4444', textAlign: 'center', borderLeft: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{manual}</div>
                <div style={{ padding: '12px 16px', fontSize: 13, color: G, fontWeight: 700, textAlign: 'center', background: '#F0FDF4', borderLeft: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{payleef}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <button onClick={() => navigate('/register')} style={{ background: G, color: 'white', border: 'none', borderRadius: 12, padding: '14px 32px', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(26,122,74,0.3)' }}>
              Switch to PayLeef — Free for 30 Days →
            </button>
          </div>
        </div>
      </section>

      {/* ══ PRICING ═════════════════════════════════════════════════════════ */}
      <section id="pricing" style={{ padding: '80px 24px', background: '#F8FAFC', borderTop: '1px solid #F1F5F9' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <SectionLabel>Pricing</SectionLabel>
            <h2 style={{ fontSize: 'clamp(26px,4vw,42px)', fontWeight: 900, margin: '0 0 12px', letterSpacing: '-0.025em', color: '#0F172A' }}>One plan. All features. No surprises.</h2>
            <p style={{ fontSize: 15, color: '#64748B', margin: 0 }}>Start free. Upgrade when you're ready. Cancel anytime.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 720, margin: '0 auto' }}>
            {[
              {
                plan: 'PayLeef Pro — Monthly',
                price: '₹999', period: '/month',
                badge: null,
                perEmp: 'Less than ₹10/employee (100 employees)',
                features: [
                  'Up to 100 employees',
                  'Unlimited payslip generations',
                  'AI anomaly detection',
                  'Auto PF, ESI, TDS, PT calculations',
                  'PDF payslips + email delivery',
                  'Employee self-service portal',
                  'Form 16 Part B generation',
                  'All 6 compliance reports',
                  'Multi-location support',
                  'Payroll lock & audit trail',
                  'Sub-user management',
                  'Priority support',
                  '30-day free trial included',
                ],
                best: false, cta: 'Start Free Trial',
              },
              {
                plan: 'PayLeef Pro — Annual',
                price: '₹9,990', period: '/year',
                badge: '🎉 Save ₹2,358 vs monthly — 2 months free!',
                perEmp: 'Less than ₹8/employee/month',
                features: [
                  'Everything in Monthly plan',
                  'Unlimited payslip generations',
                  'AI anomaly detection',
                  'Auto PF, ESI, TDS, PT calculations',
                  'PDF payslips + email delivery',
                  'Employee self-service portal',
                  'Form 16 Part B generation',
                  'All 6 compliance reports',
                  'Multi-location support',
                  'Payroll lock & audit trail',
                  'Sub-user management',
                  'Priority support',
                  '30-day free trial included',
                ],
                best: true, cta: 'Get Annual Plan & Save',
              },
            ].map((p, i) => {
              const [ref, vis] = useReveal();
              return (
                <div key={i} ref={ref} style={{
                  padding: '30px 26px', borderRadius: 20, position: 'relative',
                  border: p.best ? `2px solid ${G}` : '1px solid #E2E8F0',
                  background: p.best ? '#F0FDF4' : 'white',
                  boxShadow: p.best ? '0 8px 40px rgba(26,122,74,0.14)' : '0 2px 8px rgba(0,0,0,0.04)',
                  opacity: vis ? 1 : 0, transform: vis ? 'translateY(0)' : 'translateY(18px)',
                  transition: `all 0.45s ease ${i * 0.1}s`,
                }}>
                  {p.best && <div style={{ position: 'absolute', top: -13, left: '50%', transform: 'translateX(-50%)', background: G, color: 'white', fontSize: 10, fontWeight: 800, padding: '4px 16px', borderRadius: 20, whiteSpace: 'nowrap' }}>BEST VALUE</div>}
                  <div style={{ fontSize: 13, fontWeight: 700, color: p.best ? G : '#64748B', marginBottom: 8 }}>{p.plan}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                    <span style={{ fontSize: 40, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.03em' }}>{p.price}</span>
                    <span style={{ fontSize: 14, color: '#94A3B8' }}>{p.period}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748B', marginBottom: p.badge ? 10 : 18 }}>{p.perEmp}</div>
                  {p.badge && <div style={{ background: '#FEF9C3', border: '1px solid #FDE047', borderRadius: 8, padding: '6px 10px', marginBottom: 18, fontSize: 12, fontWeight: 600, color: '#854D0E' }}>{p.badge}</div>}
                  <div style={{ height: 1, background: p.best ? '#BBF7D0' : '#E2E8F0', marginBottom: 18 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 24 }}>
                    {p.features.map((f, fi) => (
                      <div key={fi} style={{ display: 'flex', gap: 9, alignItems: 'center' }}>
                        <div style={{ width: 17, height: 17, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Check /></div>
                        <span style={{ fontSize: 12.5, color: '#374151' }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => navigate('/register')} style={{
                    width: '100%', padding: '13px', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    background: p.best ? G : 'transparent', color: p.best ? 'white' : G,
                    border: p.best ? 'none' : `1.5px solid ${G}`, transition: 'all 0.2s',
                  }}
                    onMouseOver={e => e.currentTarget.style.background = p.best ? '#15653E' : '#F0FDF4'}
                    onMouseOut={e => e.currentTarget.style.background = p.best ? G : 'transparent'}
                  >{p.cta}</button>
                </div>
              );
            })}
          </div>
          <div style={{ textAlign: 'center', marginTop: 28, fontSize: 13, color: '#94A3B8' }}>
            Need more than 100 employees? <span style={{ color: G, fontWeight: 600, cursor: 'pointer' }}>Contact us for custom pricing →</span>
          </div>
        </div>
      </section>

      {/* ══ FAQ ════════════════════════════════════════════════════════════ */}
      <section id="faq" style={{ padding: '80px 24px', background: 'white', borderTop: '1px solid #F1F5F9' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <SectionLabel>FAQ</SectionLabel>
            <h2 style={{ fontSize: 'clamp(24px,4vw,40px)', fontWeight: 900, margin: 0, letterSpacing: '-0.025em', color: '#0F172A' }}>Common questions</h2>
          </div>
          {[
            {
              q: 'Is PayLeef really compliant with Indian PF, ESI, and TDS rules?',
              a: 'Yes. PayLeef has India\'s statutory rules built in — not bolted on. PF is calculated at 12% of basic salary. ESI at 0.75% for eligible employees. TDS under both New and Old Tax Regime. Professional Tax using state-wise slabs for every state. These rules are updated when government regulations change.',
            },
            {
              q: 'How do my employees access their payslips?',
              a: 'You enable portal access for each employee from the Employees page. They receive an email with their login link and set their own password. They can then log in from any device — phone or desktop — to download their payslips, view their salary breakdown, get Form 16, and ask the AI assistant any pay-related question.',
            },
            {
              q: 'Can I upload salaries from an Excel file?',
              a: 'Yes. You can upload a CSV or Excel file with employee names and salary amounts. PayLeef\'s smart import automatically maps your columns — even if your file format is different each month. You can also enter salaries directly in the built-in grid, or set a fixed monthly salary in the Employee Master that auto-populates every month.',
            },
            {
              q: 'What happens with LOP (Loss of Pay) for absent employees?',
              a: 'PayLeef connects attendance and payroll. Upload your attendance CSV or enter manually. Mark CL, SL, EL, and LOP days per employee. LOP is automatically deducted from the gross salary at the daily rate (monthly salary ÷ working days). No manual calculation needed.',
            },
            {
              q: 'How is my data kept secure?',
              a: 'All data is stored in a secure cloud database in India. Payslip PDFs are password-protected with each employee\'s date of birth. Access is controlled by role — admins see all data, employees only see their own. You can set up sub-users with limited permissions. All connections are encrypted.',
            },
            {
              q: 'Can I try it before paying?',
              a: 'Yes — the 30-day free trial is completely free with no credit card required. Add all your employees, run your first payroll, send payslips, and download compliance reports. You only need to pay after your trial ends.',
            },
          ].map((item, i) => (
            <div key={i} style={{ borderBottom: '1px solid #F1F5F9', overflow: 'hidden' }}>
              <button onClick={() => setFaqOpen(faqOpen === i ? null : i)} style={{ width: '100%', padding: '18px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', paddingRight: 16 }}>{item.q}</span>
                <span style={{ fontSize: 20, color: '#94A3B8', flexShrink: 0, transform: faqOpen === i ? 'rotate(45deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>+</span>
              </button>
              {faqOpen === i && (
                <div style={{ paddingBottom: 18, fontSize: 14, color: '#64748B', lineHeight: 1.8 }}>{item.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ══ FINAL CTA ═══════════════════════════════════════════════════════ */}
      <section style={{ padding: '90px 24px', background: 'linear-gradient(135deg,#0A2E1A 0%,#1A7A4A 100%)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px,transparent 1px)', backgroundSize: '32px 32px', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: 620, margin: '0 auto' }}>
          <div style={{ fontSize: 44, marginBottom: 20 }}>🌿</div>
          <h2 style={{ fontSize: 'clamp(28px,4vw,46px)', fontWeight: 900, color: 'white', margin: '0 0 16px', letterSpacing: '-0.025em', lineHeight: 1.1 }}>
            Run your first payroll<br />in under 10 minutes.
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 14, lineHeight: 1.7 }}>
            Join businesses across India that have moved from Excel chaos to clean, automated payroll. Free for 30 days.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 36, flexWrap: 'wrap' }}>
            {['No credit card', 'All features included', 'Setup in 10 minutes', 'Cancel anytime'].map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(74,222,128,0.2)', border: '1px solid rgba(74,222,128,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Check color="#4ADE80" /></div>
                {t}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => navigate('/register')} style={{ background: 'white', color: G, border: 'none', borderRadius: 12, padding: '15px 36px', fontSize: 16, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.2)', transition: 'transform 0.15s' }}
              onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
            >Start Free Trial →</button>
            <button onClick={() => navigate('/login')} style={{ color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, padding: '15px 28px', fontSize: 16, fontWeight: 500, cursor: 'pointer' }}>Sign in</button>
          </div>
          <p style={{ marginTop: 24, fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>
            From <strong style={{ color: 'rgba(255,255,255,0.6)' }}>₹999/month</strong> · Annual plan ₹9,990/year · 30-day free trial
          </p>
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════════════════════ */}
      <footer style={{ background: '#0F172A', padding: '52px 24px 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 40, marginBottom: 40 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Leaf size={16} /></div>
                <span style={{ fontSize: 16, fontWeight: 900, color: 'white', letterSpacing: '-0.04em' }}>Pay<span style={{ color: '#4ADE80' }}>Leef</span></span>
              </div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7, maxWidth: 240, margin: '0 0 16px' }}>Payroll software built for Indian businesses. Simple, accurate, automatic.</p>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>📍 Made in India · Data stored in India</div>
            </div>
            {[
              { h: 'Product', links: ['Features', 'How it works', 'Pricing', 'AI Detection', 'Employee Portal', 'Compliance Reports'] },
              { h: 'Company', links: ['About', 'Contact', 'Privacy Policy', 'Terms of Service'] },
              { h: 'Reports', links: ['PF ECR File', 'ESI Report', 'Form 16 Part B', 'Professional Tax', 'Bank Advice', 'Salary Register'] },
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
          display: inline-flex;
          white-space: nowrap;
          animation: marquee 28s linear infinite;
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @media (max-width: 640px) {
          section > div > div[style*="grid-template-columns: repeat(3"] {
            grid-template-columns: 1fr !important;
          }
          section > div > div[style*="grid-template-columns: 1fr 1fr"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
