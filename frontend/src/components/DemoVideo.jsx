import { useState, useEffect, useRef, useCallback } from 'react';

const G = '#1A7A4A';

/* ── tiny helpers ── */
const Leaf = ({ size = 18 }) => (
  <svg viewBox="0 0 20 24" fill="none" style={{ width: size, height: size }}>
    <path d="M10,1 C16,1 19,7 18,13 C17,19 14,22 10,23 C6,22 3,19 2,13 C1,7 4,1 10,1Z" fill="white" />
    <line x1="10" y1="2"  x2="10" y2="22" stroke="#4ADE80" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="4"  y1="7"  x2="16" y2="7"  stroke="#4ADE80" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="4"  y1="11" x2="16" y2="11" stroke="#4ADE80" strokeWidth="1.6" strokeLinecap="round" />
    <line x1="4"  y1="11" x2="14" y2="20" stroke="#4ADE80" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

/* ─────────────────────── SCENES ─────────────────────── */
const TOTAL = 175; // seconds
const SCENES = [
  { id: 0, start: 0,   end: 22,  label: 'Intro',                caption: 'PayLeef Pro — Payroll Software for India' },
  { id: 1, start: 22,  end: 45,  label: 'Dashboard',            caption: '📊 Dashboard — all payroll status at a glance' },
  { id: 2, start: 45,  end: 70,  label: 'Employees',            caption: '👥 Employee Master — manage your entire team' },
  { id: 3, start: 70,  end: 95,  label: 'AI Detection',         caption: '🤖 AI detects unusual salaries before you send' },
  { id: 4, start: 95,  end: 120, label: 'Payslip PDF',          caption: '📄 Professional PDF — auto-calculated, password-protected' },
  { id: 5, start: 120, end: 145, label: 'Bulk Send',            caption: '📧 One click — payslips sent to all employees' },
  { id: 6, start: 145, end: 162, label: 'Employee Portal',      caption: '👤 Employee self-service portal + AI assistant' },
  { id: 7, start: 162, end: 175, label: 'Reports',              caption: '📑 Government-ready compliance reports — PF, ESI, Form 16' },
];

/* ─────────────────────── SCENE RENDERERS ─────────────────────── */
function SceneIntro({ progress }) {
  const p = progress; // 0–1 within scene
  return (
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #0A2E1A 0%, #1A7A4A 50%, #0F172A 100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center' }}>
      <div style={{ opacity: p > 0.08 ? 1 : 0, transform: p > 0.08 ? 'translateY(0)' : 'translateY(16px)', transition: 'all 0.5s', display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 20, padding: '6px 18px' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#4ADE80' }}>🚀 India's Payroll Software for SMEs</span>
      </div>
      <div style={{ opacity: p > 0.18 ? 1 : 0, transform: p > 0.18 ? 'translateY(0)' : 'translateY(16px)', transition: 'all 0.5s 0.1s', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.2)' }}>
          <Leaf size={28} />
        </div>
        <div style={{ fontSize: 44, fontWeight: 900, color: 'white', letterSpacing: '-0.04em', lineHeight: 1 }}>
          Pay<span style={{ color: '#4ADE80' }}>Leef</span> <span style={{ fontSize: 22, fontWeight: 400, color: 'rgba(255,255,255,0.4)' }}>Pro</span>
        </div>
      </div>
      <div style={{ opacity: p > 0.3 ? 1 : 0, transform: p > 0.3 ? 'translateY(0)' : 'translateY(12px)', transition: 'all 0.5s 0.2s', fontSize: 18, color: 'rgba(255,255,255,0.72)', maxWidth: 480, lineHeight: 1.65 }}>
        Automate payslips, PF, TDS, ESI & email delivery<br />for your entire team — in under 10 minutes.
      </div>
      <div style={{ opacity: p > 0.45 ? 1 : 0, transition: 'opacity 0.5s 0.3s', display: 'flex', gap: 32, marginTop: 8 }}>
        {[['₹2.4Cr+', 'Payroll Processed'], ['500+', 'Employees Served'], ['10 min', 'Full Payroll Run']].map(([v, l], i) => (
          <div key={i} style={{ textAlign: 'center', opacity: p > 0.45 + i * 0.08 ? 1 : 0, transition: `opacity 0.4s ${i * 0.1}s` }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: 'white' }}>{v}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ opacity: p > 0.7 ? 1 : 0, transition: 'opacity 0.5s', fontSize: 13, color: 'rgba(255,255,255,0.38)' }}>payleef.com · ₹999/month · 30-day free trial</div>
    </div>
  );
}

function AppShell({ active, children, title, rightEl }) {
  const navItems = [
    { icon: '📊', label: 'Dashboard' },
    { icon: '👥', label: 'Employees' },
    { icon: '📅', label: 'Attendance' },
    { icon: '🚀', label: 'Generate' },
    { icon: '📑', label: 'Reports' },
    { icon: '⚙️', label: 'Settings' },
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', background: '#F8FAFC' }}>
      {/* Sidebar */}
      <div style={{ width: 60, background: '#0F172A', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 5px', gap: 2, flexShrink: 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}><Leaf size={16} /></div>
        {navItems.map(item => (
          <div key={item.label} style={{ width: 46, height: 44, borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, background: item.label === active ? 'rgba(26,122,74,0.35)' : 'transparent', border: item.label === active ? '1px solid rgba(74,222,128,0.25)' : '1px solid transparent' }}>
            <span style={{ fontSize: 13 }}>{item.icon}</span>
            <span style={{ fontSize: 6, color: item.label === active ? '#4ADE80' : 'rgba(255,255,255,0.3)', fontWeight: 600 }}>{item.label}</span>
          </div>
        ))}
      </div>
      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: '0 16px', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {rightEl}
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#1A7A4A,#4ADE80)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 700 }}>D</div>
          </div>
        </div>
        <div style={{ flex: 1, padding: 16, overflow: 'hidden' }}>{children}</div>
      </div>
    </div>
  );
}

function SceneDashboard() {
  return (
    <AppShell active="Dashboard" title="Good morning, Dinesh 👋" rightEl={<span style={{ fontSize: 10, color: '#64748B' }}>Synced ✓</span>}>
      <div style={{ background: '#FFFBEB', border: '1.5px solid #FCD34D', borderRadius: 10, padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>📋</span>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#D97706', textTransform: 'uppercase', letterSpacing: '.06em' }}>May 2026 Payroll Pending</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#0F172A' }}>Ready to generate payslips for 24 employees</div>
          </div>
        </div>
        <div style={{ padding: '5px 12px', background: '#D97706', borderRadius: 7, fontSize: 10, fontWeight: 700, color: 'white', whiteSpace: 'nowrap' }}>Generate →</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 12 }}>
        {[
          { icon: '👥', val: '24', lbl: 'Employees', bg: '#F0FDF4' },
          { icon: '📈', val: '₹16.4L', lbl: 'Monthly Payroll', bg: '#F5F3FF' },
          { icon: '📄', val: '0/24', lbl: 'Payslips Sent', bg: '#FFFBEB' },
          { icon: '⚠️', val: '1', lbl: 'AI Flag', bg: '#FFF1F2' },
        ].map((c, i) => (
          <div key={i} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, padding: '10px 10px 8px' }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, marginBottom: 6 }}>{c.icon}</div>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#0F172A', lineHeight: 1 }}>{c.val}</div>
            <div style={{ fontSize: 8, color: '#64748B', fontWeight: 600, marginTop: 3, textTransform: 'uppercase', letterSpacing: '.04em' }}>{c.lbl}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: 12, display: 'flex', gap: 10 }}>
          <span style={{ fontSize: 18 }}>🚀</span>
          <div><div style={{ fontSize: 11, fontWeight: 700, color: '#0F172A' }}>Generate May Payslips</div><div style={{ fontSize: 9, color: '#15803D' }}>24 employees ready</div></div>
        </div>
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, padding: 12, display: 'flex', gap: 10 }}>
          <span style={{ fontSize: 18 }}>📑</span>
          <div><div style={{ fontSize: 11, fontWeight: 700, color: '#0F172A' }}>Download Reports</div><div style={{ fontSize: 9, color: '#64748B' }}>PF ECR, ESI, Form 16</div></div>
        </div>
      </div>
    </AppShell>
  );
}

function SceneEmployees({ showForm }) {
  return (
    <AppShell active="Employees" title="Employee Master" rightEl={
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ border: `1.5px solid ${G}`, color: G, borderRadius: 7, padding: '4px 10px', fontSize: 10, fontWeight: 600 }}>⬆ Upload CSV</div>
        <div style={{ background: G, color: 'white', borderRadius: 7, padding: '4px 10px', fontSize: 10, fontWeight: 700 }}>+ Add Employee</div>
      </div>
    }>
      <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>All Employees (24)</span>
          <input style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, padding: '4px 9px', fontSize: 10, color: '#0F172A', width: 120 }} placeholder="🔍 Search..." readOnly />
        </div>
        {[
          { ini: 'AS', name: 'Arjun Sharma', dept: 'Engineering · EMP001', sal: '₹70,200', badgeTxt: 'Active', badgeBg: '#DCFCE7', badgeC: '#15803D', avatarBg: '#DCFCE7', avatarC: '#15803D' },
          { ini: 'PN', name: 'Priya Nair', dept: 'Marketing · EMP002', sal: '₹52,400', badgeTxt: 'Active', badgeBg: '#DCFCE7', badgeC: '#15803D', avatarBg: '#DBEAFE', avatarC: '#1D4ED8' },
          { ini: 'KM', name: 'Karthik M', dept: 'Engineering · EMP003', sal: '₹88,000', badgeTxt: 'AI Flag ⚠', badgeBg: '#FEF9C3', badgeC: '#854D0E', avatarBg: '#FEF9C3', avatarC: '#854D0E' },
          { ini: 'DR', name: 'Divya R', dept: 'HR · EMP004', sal: '₹45,000', badgeTxt: 'Active', badgeBg: '#DCFCE7', badgeC: '#15803D', avatarBg: '#FCE7F3', avatarC: '#9D174D' },
          { ini: 'SK', name: 'Suresh K', dept: 'Operations · EMP005', sal: '₹38,500', badgeTxt: 'Active', badgeBg: '#DCFCE7', badgeC: '#15803D', avatarBg: '#E0E7FF', avatarC: '#3730A3' },
        ].map((e, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid #F8FAFC' }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: e.avatarBg, color: e.avatarC, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, flexShrink: 0 }}>{e.ini}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#0F172A' }}>{e.name}</div>
              <div style={{ fontSize: 9, color: '#94A3B8' }}>{e.dept}</div>
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, color: G }}>{e.sal}</div>
            <div style={{ padding: '2px 7px', borderRadius: 20, background: e.badgeBg, color: e.badgeC, fontSize: 9, fontWeight: 600 }}>{e.badgeTxt}</div>
          </div>
        ))}
        <div style={{ padding: '6px 14px', fontSize: 9, color: '#94A3B8', textAlign: 'center' }}>+19 more employees</div>
      </div>
      {/* Add employee modal */}
      {showForm && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: 'white', borderRadius: 14, padding: 20, width: 320, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A', marginBottom: 14 }}>➕ Add New Employee</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[['First Name', 'Rajesh'], ['Last Name', 'Kumar'], ['Department', 'Engineering ▾'], ['Gross Salary', '₹55,000'], ['Email', 'rajesh@co.in'], ['Employee ID', 'EMP025']].map(([l, v], i) => (
                <div key={i}>
                  <div style={{ fontSize: 10, fontWeight: 600, color: '#374151', marginBottom: 3 }}>{l}</div>
                  <div style={{ background: i === 0 ? 'white' : '#F8FAFC', border: `1.5px solid ${i === 0 ? G : '#E2E8F0'}`, borderRadius: 7, padding: '6px 10px', fontSize: 11, color: '#0F172A' }}>{v}{i === 0 && <span style={{ borderRight: '2px solid #1A7A4A', marginLeft: 1, animation: 'blink 0.7s infinite' }}>&nbsp;</span>}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <div style={{ flex: 1, border: `1.5px solid ${G}`, color: G, borderRadius: 7, padding: '7px', textAlign: 'center', fontSize: 11, fontWeight: 600 }}>Cancel</div>
              <div style={{ flex: 2, background: G, color: 'white', borderRadius: 7, padding: '7px', textAlign: 'center', fontSize: 11, fontWeight: 700 }}>Save Employee →</div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function SceneAI({ approved }) {
  return (
    <AppShell active="Generate" title="🤖 AI Anomaly Detection" rightEl={
      <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 7, padding: '4px 10px', fontSize: 10, fontWeight: 600, color: '#15803D' }}>✓ 23 Clear · 1 Flag</div>
    }>
      <div style={{ border: '2px solid #EF4444', borderRadius: 10, background: 'rgba(239,68,68,0.04)', padding: '10px 12px', marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', marginBottom: 4 }}>🚨 Unusual Salary Spike — Karthik M</div>
        <div style={{ fontSize: 10, color: '#374151', marginBottom: 8, lineHeight: 1.5 }}>₹88,000 this month vs ₹69,000 last month — <strong>+27.5% higher</strong>. Verify if a bonus or salary revision was added.</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <div style={{ flex: 1, background: '#FEE2E2', border: '1px solid #FECACA', borderRadius: 6, padding: '5px', textAlign: 'center', fontSize: 9, fontWeight: 700, color: '#DC2626' }}>⚠ Hold & Review</div>
          <div style={{ flex: 2, background: approved ? '#15803D' : G, borderRadius: 6, padding: '5px', textAlign: 'center', fontSize: 9, fontWeight: 700, color: 'white', transition: 'background 0.3s' }}>
            {approved ? '✓ Approved!' : '✓ Looks Correct — Approve & Continue'}
          </div>
        </div>
      </div>
      <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '8px 14px', borderBottom: '1px solid #F1F5F9' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#0F172A' }}>✓ 23 Employees — All Clear</span>
        </div>
        {[['AS', 'Arjun Sharma', 'Engineering', '₹70,200', '#DCFCE7', '#15803D'], ['PN', 'Priya Nair', 'Marketing', '₹52,400', '#DBEAFE', '#1D4ED8'], ['DR', 'Divya R', 'HR', '₹45,000', '#FCE7F3', '#9D174D']].map(([ini, n, d, s, bg, c]) => (
          <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px', borderBottom: '1px solid #F8FAFC' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: bg, color: c, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700 }}>{ini}</div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 11, fontWeight: 600, color: '#0F172A' }}>{n}</div><div style={{ fontSize: 9, color: '#94A3B8' }}>{d}</div></div>
            <div style={{ fontSize: 11, fontWeight: 700, color: G }}>{s}</div>
            <div style={{ padding: '2px 7px', borderRadius: 20, background: '#DCFCE7', color: '#15803D', fontSize: 9, fontWeight: 600 }}>✓ Clear</div>
          </div>
        ))}
        <div style={{ padding: '6px 14px', fontSize: 9, color: '#94A3B8', textAlign: 'center' }}>+20 more employees — all within normal range</div>
      </div>
    </AppShell>
  );
}

function ScenePayslip() {
  return (
    <AppShell active="Generate" title="📄 Payslip Preview — Arjun Sharma" rightEl={
      <div style={{ display: 'flex', gap: 6 }}>
        <div style={{ border: `1.5px solid ${G}`, color: G, borderRadius: 7, padding: '4px 10px', fontSize: 10, fontWeight: 600 }}>⬇ Download PDF</div>
        <div style={{ background: G, color: 'white', borderRadius: 7, padding: '4px 10px', fontSize: 10, fontWeight: 700 }}>📧 Send</div>
      </div>
    }>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* PDF */}
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, padding: 12 }}>
          <div style={{ background: 'linear-gradient(135deg,#0F172A,#1A7A4A)', borderRadius: 8, padding: '10px 12px', marginBottom: 10, display: 'flex', justifyContent: 'space-between' }}>
            <div><div style={{ color: 'white', fontSize: 12, fontWeight: 800 }}>TechCorp India Pvt Ltd</div><div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 9 }}>May 2026 Payslip</div></div>
            <div style={{ textAlign: 'right' }}><div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 10 }}>Arjun Sharma</div><div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 8 }}>EMP001 · Engineering</div></div>
          </div>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 5 }}>Earnings</div>
          {[['Basic Salary', '₹35,000'], ['HRA', '₹14,000'], ['Special Allowance', '₹14,700']].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #F1F5F9', fontSize: 10 }}>
              <span style={{ color: '#374151' }}>{l}</span><span style={{ fontWeight: 600 }}>{v}</span>
            </div>
          ))}
          <div style={{ fontSize: 9, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '.06em', margin: '7px 0 4px' }}>Deductions</div>
          {[['PF (12%)', '−₹4,200'], ['Professional Tax', '−₹200'], ['TDS', '−₹8,100']].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #F1F5F9', fontSize: 10 }}>
              <span style={{ color: '#374151' }}>{l}</span><span style={{ fontWeight: 600, color: '#DC2626' }}>{v}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: '#F0FDF4', borderRadius: 8, marginTop: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#0F172A' }}>Net Take-Home</span>
            <span style={{ fontSize: 16, fontWeight: 900, color: G }}>₹51,200</span>
          </div>
        </div>
        {/* Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#15803D', marginBottom: 6 }}>✓ Auto-Calculated</div>
            {['PF @ 12% of Basic', 'ESI @ 0.75% (if applicable)', 'TDS — New Tax Regime', 'Professional Tax (state slab)', 'LOP deducted from attendance'].map(f => (
              <div key={f} style={{ fontSize: 9, color: '#374151', lineHeight: 2 }}>✓ {f}</div>
            ))}
          </div>
          <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>📧 Email Delivery</div>
            <div style={{ fontSize: 9, color: '#64748B', marginBottom: 6 }}>PDF sent to arjun@company.in as password-protected attachment</div>
            <div style={{ background: '#F0FDF4', borderRadius: 7, padding: '6px 9px', fontSize: 9, color: '#15803D', fontWeight: 600 }}>🔒 Password: Employee DOB (e.g. 15081990)</div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function SceneBulkSend({ sendPct }) {
  const sent = Math.round(18 + (sendPct / 100) * 6);
  return (
    <AppShell active="Generate" title="📧 Sending Payslips — May 2026" rightEl={
      <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 7, padding: '4px 10px', fontSize: 10, fontWeight: 600, color: '#15803D' }}>{sent} / 24 Sent ✓</div>
    }>
      <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ padding: '10px 14px', background: '#F0FDF4', borderBottom: '1px solid #E2E8F0', display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ flex: 1, background: '#E2E8F0', borderRadius: 4, height: 8 }}>
            <div style={{ width: `${75 + sendPct * 0.25}%`, height: '100%', background: `linear-gradient(90deg,${G},#4ADE80)`, borderRadius: 4, transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#15803D' }}>{Math.round(75 + sendPct * 0.25)}%</div>
        </div>
        {[
          { ini: 'AS', n: 'Arjun Sharma', e: 'arjun@company.in', status: 'sent', avatarBg: '#DCFCE7', avatarC: '#15803D' },
          { ini: 'PN', n: 'Priya Nair', e: 'priya@company.in', status: 'sent', avatarBg: '#DBEAFE', avatarC: '#1D4ED8' },
          { ini: 'KM', n: 'Karthik M', e: 'karthik@company.in', status: sendPct > 40 ? 'sent' : 'sending', avatarBg: '#FEF9C3', avatarC: '#854D0E' },
          { ini: 'DR', n: 'Divya R', e: 'divya@company.in', status: 'sent', avatarBg: '#FCE7F3', avatarC: '#9D174D' },
          { ini: 'SK', n: 'Suresh K', e: 'suresh@company.in', status: sendPct > 70 ? 'sent' : 'queued', avatarBg: '#E0E7FF', avatarC: '#3730A3' },
        ].map((r) => (
          <div key={r.ini} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: '1px solid #F8FAFC' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: r.avatarBg, color: r.avatarC, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{r.ini}</div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 11, fontWeight: 600, color: '#0F172A' }}>{r.n}</div><div style={{ fontSize: 9, color: '#94A3B8' }}>{r.e}</div></div>
            <div style={{ padding: '3px 8px', borderRadius: 20, fontSize: 9, fontWeight: 700, background: r.status === 'sent' ? '#DCFCE7' : r.status === 'sending' ? '#DBEAFE' : '#F1F5F9', color: r.status === 'sent' ? '#15803D' : r.status === 'sending' ? '#1D4ED8' : '#94A3B8' }}>
              {r.status === 'sent' ? '✓ Sent' : r.status === 'sending' ? 'Sending…' : 'Queued'}
            </div>
          </div>
        ))}
        <div style={{ padding: '6px 14px', fontSize: 9, color: '#94A3B8', textAlign: 'center' }}>+19 more employees in queue</div>
      </div>
    </AppShell>
  );
}

function ScenePortal() {
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', background: '#F8FAFC' }}>
      <div style={{ width: 58, background: '#0F172A', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 5px', gap: 2 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}><Leaf size={16} /></div>
        {[['📄', 'My Payslips'], ['🤖', 'AI Chat'], ['👤', 'Profile']].map(([icon, lbl]) => (
          <div key={lbl} style={{ width: 46, height: 44, borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, background: lbl === 'My Payslips' ? 'rgba(26,122,74,0.35)' : 'transparent' }}>
            <span style={{ fontSize: 13 }}>{icon}</span>
            <span style={{ fontSize: 6, color: lbl === 'My Payslips' ? '#4ADE80' : 'rgba(255,255,255,0.3)', fontWeight: 600 }}>{lbl}</span>
          </div>
        ))}
        <div style={{ marginTop: 'auto', width: '100%', padding: '0 5px' }}>
          <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 8, padding: '8px 4px', textAlign: 'center' }}>
            <div style={{ fontSize: 16 }}>👤</div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginTop: 2 }}>Arjun</div>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ background: 'white', borderBottom: '1px solid #E2E8F0', padding: '0 16px', height: 48, display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>My Payslips</span>
        </div>
        <div style={{ flex: 1, padding: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 20 }}>🎉</span>
            <div style={{ flex: 1 }}><div style={{ fontSize: 11, fontWeight: 700, color: '#15803D' }}>May 2026 payslip has arrived!</div><div style={{ fontSize: 9, color: '#64748B' }}>Net pay: ₹51,200 · Tap to view & download</div></div>
            <div style={{ background: G, borderRadius: 7, padding: '5px 10px', fontSize: 10, fontWeight: 700, color: 'white' }}>View →</div>
          </div>
          <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #F1F5F9' }}><span style={{ fontSize: 11, fontWeight: 700, color: '#0F172A' }}>Payslip History</span></div>
            {[['May 2026', '₹51,200', true], ['Apr 2026', '₹51,200', false], ['Mar 2026', '₹49,800', false]].map(([m, n, isNew]) => (
              <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderBottom: '1px solid #F8FAFC', background: isNew ? '#F0FDF4' : 'white' }}>
                <span style={{ fontSize: 16 }}>📄</span>
                <div style={{ flex: 1 }}><div style={{ fontSize: 11, fontWeight: 600, color: '#0F172A' }}>{m}</div><div style={{ fontSize: 9, color: '#94A3B8' }}>Net: {n}</div></div>
                {isNew && <div style={{ padding: '2px 7px', borderRadius: 20, background: '#DCFCE7', color: '#15803D', fontSize: 9, fontWeight: 600 }}>New ✨</div>}
                <span style={{ fontSize: 16, cursor: 'pointer' }}>⬇</span>
              </div>
            ))}
          </div>
          <div style={{ background: 'white', border: '1.5px solid #DDD6FE', borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED', marginBottom: 6 }}>✨ Ask AI about your payslip</div>
            <div style={{ background: '#F5F3FF', borderRadius: 7, padding: '6px 9px', marginBottom: 5, fontSize: 10, color: '#4C1D95', fontStyle: 'italic' }}>"Why is my TDS higher this month?"</div>
            <div style={{ background: '#FAFAFA', borderRadius: 7, padding: '6px 9px', fontSize: 9, color: '#374151', lineHeight: 1.6 }}>Your TDS increased because your annual income crossed ₹5L, moving you to the 20% slab. Calculated under New Tax Regime.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SceneReports() {
  const items = [
    ['🏦', 'PF ECR File', 'EPFO Upload Ready', '#DCFCE7', '#15803D'],
    ['🏥', 'ESI Report', 'ESIC Portal Ready', '#DBEAFE', '#1D4ED8'],
    ['📋', 'Professional Tax', 'State PT Challan', '#F3E8FF', '#7C3AED'],
    ['💳', 'Bank Advice', 'Salary Transfer File', '#FEF9C3', '#854D0E'],
    ['📑', 'Form 16 Part B', 'Annual TDS Certificate', '#FFF1F2', '#BE123C'],
    ['📊', 'Salary Register', 'Full Month Register', '#F0FDF4', '#15803D'],
  ];
  return (
    <AppShell active="Reports" title="Compliance Reports" rightEl={<span style={{ fontSize: 10, color: '#64748B' }}>May 2026 ▾</span>}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {items.map(([icon, title, sub, bg, color]) => (
          <div key={title} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 10, padding: '11px 12px', display: 'flex', gap: 10, alignItems: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{icon}</div>
            <div style={{ flex: 1 }}><div style={{ fontSize: 11, fontWeight: 700, color: '#0F172A' }}>{title}</div><div style={{ fontSize: 9, color: '#64748B' }}>{sub}</div></div>
            <div style={{ background: bg, borderRadius: 6, padding: '4px 8px', fontSize: 9, fontWeight: 700, color, cursor: 'pointer' }}>⬇ Excel</div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

/* ─────────────────────── CURSOR ─────────────────────── */
function Cursor({ x, y, clicking }) {
  return (
    <div style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: 20, height: 20, pointerEvents: 'none', zIndex: 999, transform: clicking ? 'scale(0.85)' : 'scale(1)', transition: 'left 0.5s cubic-bezier(.25,.46,.45,.94), top 0.5s cubic-bezier(.25,.46,.45,.94), transform 0.1s' }}>
      <svg viewBox="0 0 20 20" width="20" height="20">
        <path d="M4 2L4 16L8 12L11 18L13 17L10 11L16 11Z" fill="white" stroke="rgba(0,0,0,0.45)" strokeWidth="1" />
      </svg>
    </div>
  );
}

/* ─────────────────────── MAIN COMPONENT ─────────────────────── */
export default function DemoVideo() {
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [cursorPos, setCursorPos] = useState({ x: 50, y: 50 });
  const [clicking, setClicking] = useState(false);
  const rafRef = useRef();
  const lastTsRef = useRef();
  const timeRef = useRef(0);

  const currentScene = SCENES.find(s => time >= s.start && time < s.end) || SCENES[0];
  const sceneIdx = SCENES.indexOf(currentScene);
  const sceneProgress = (time - currentScene.start) / (currentScene.end - currentScene.start);

  // Animate cursor based on scene + time
  useEffect(() => {
    const local = time - currentScene.start;
    const paths = {
      0: [{ x: 50, y: 50 }],
      1: local < 8 ? [{ x: 84, y: 42 }] : [{ x: 15, y: 68 }],
      2: local < 5 ? [{ x: 88, y: 17 }] : local < 12 ? [{ x: 50, y: 52 }] : [{ x: 48, y: 60 }],
      3: [{ x: 50 + Math.sin(local * 0.8) * 6, y: 57 + Math.cos(local * 0.6) * 3 }],
      4: local < 6 ? [{ x: 84, y: 17 }] : [{ x: 73, y: 17 }],
      5: [{ x: 50, y: 52 }],
      6: [{ x: 90, y: 38 }],
      7: [{ x: 88, y: 48 }],
    };
    const target = paths[sceneIdx]?.[0] || { x: 50, y: 50 };
    setCursorPos(target);

    // Click effect at key moments
    if (sceneIdx === 2 && Math.abs(local - 5) < 0.15) { setClicking(true); setTimeout(() => setClicking(false), 200); }
    if (sceneIdx === 3 && Math.abs(local - 6) < 0.15) { setClicking(true); setTimeout(() => setClicking(false), 200); }
    if (sceneIdx === 4 && Math.abs(local - 7) < 0.15) { setClicking(true); setTimeout(() => setClicking(false), 200); }
  }, [Math.floor(time * 4), sceneIdx]);

  const tick = useCallback((ts) => {
    if (!lastTsRef.current) lastTsRef.current = ts;
    const delta = (ts - lastTsRef.current) / 1000;
    lastTsRef.current = ts;
    timeRef.current = Math.min(timeRef.current + delta, TOTAL);
    setTime(timeRef.current);
    if (timeRef.current < TOTAL) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      setPlaying(false);
      timeRef.current = 0;
      setTime(0);
    }
  }, []);

  useEffect(() => {
    if (playing) {
      lastTsRef.current = null;
      rafRef.current = requestAnimationFrame(tick);
    } else {
      cancelAnimationFrame(rafRef.current);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, tick]);

  function handlePlay() {
    if (!started) setStarted(true);
    setPlaying(p => !p);
  }

  function seek(e) {
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    timeRef.current = pct * TOTAL;
    setTime(timeRef.current);
  }

  const pct = (time / TOTAL) * 100;
  const mm = Math.floor(time / 60);
  const ss = Math.floor(time % 60).toString().padStart(2, '0');
  const sendPct = sceneIdx === 5 ? Math.min(100, sceneProgress * 100) : 0;

  return (
    <div style={{ width: '100%', maxWidth: 960, margin: '0 auto' }}>
      {/* Video container */}
      <div style={{ position: 'relative', width: '100%', paddingTop: '56.25%', background: '#000', borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.22), 0 0 0 1px rgba(0,0,0,0.08)' }}>
        <div style={{ position: 'absolute', inset: 0 }}>

          {/* Scenes */}
          {!started && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 10 }}>
              <SceneIntro progress={0.5} />
            </div>
          )}
          {started && sceneIdx === 0 && <SceneIntro progress={sceneProgress} />}
          {started && sceneIdx === 1 && <SceneDashboard />}
          {started && sceneIdx === 2 && <SceneEmployees showForm={sceneProgress > 0.35} />}
          {started && sceneIdx === 3 && <SceneAI approved={sceneProgress > 0.55} />}
          {started && sceneIdx === 4 && <ScenePayslip />}
          {started && sceneIdx === 5 && <SceneBulkSend sendPct={sendPct} />}
          {started && sceneIdx === 6 && <ScenePortal />}
          {started && sceneIdx === 7 && <SceneReports />}

          {/* Cursor */}
          {started && <Cursor x={cursorPos.x} y={cursorPos.y} clicking={clicking} />}

          {/* Watermark */}
          <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '3px 10px', display: 'flex', alignItems: 'center', gap: 6, backdropFilter: 'blur(4px)', zIndex: 20 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#4ADE80' }} />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>PayLeef Pro · Live Demo</span>
          </div>

          {/* Scene caption */}
          {started && (
            <div style={{ position: 'absolute', bottom: 52, left: '50%', transform: 'translateX(-50%)', background: 'rgba(0,0,0,0.7)', color: 'white', fontSize: 13, fontWeight: 600, padding: '6px 18px', borderRadius: 20, whiteSpace: 'nowrap', backdropFilter: 'blur(6px)', border: '1px solid rgba(255,255,255,0.1)', pointerEvents: 'none', zIndex: 20 }}>
              {currentScene.caption}
            </div>
          )}

          {/* Play overlay (before start) */}
          {!started && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30 }}>
              <button onClick={handlePlay} style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(26,122,74,0.9)', border: '3px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 0 40px rgba(26,122,74,0.5)', transition: 'transform 0.15s' }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
                <svg viewBox="0 0 24 24" width="30" height="30" style={{ marginLeft: 4 }}><path d="M6 4l15 8-15 8z" fill="white" /></svg>
              </button>
            </div>
          )}

          {/* Controls */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.82))', padding: '28px 14px 10px', zIndex: 25 }}>
            {/* Progress */}
            <div onClick={seek} style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.25)', borderRadius: 2, cursor: 'pointer', marginBottom: 8, position: 'relative' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: G, borderRadius: 2, position: 'relative' }}>
                <div style={{ position: 'absolute', right: -5, top: -4, width: 12, height: 12, background: G, borderRadius: '50%' }} />
              </div>
            </div>
            {/* Scene chapters */}
            <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
              {SCENES.map((s, i) => (
                <div key={i} title={s.label} onClick={() => { timeRef.current = s.start; setTime(s.start); if (!started) setStarted(true); }} style={{ flex: s.end - s.start, height: 3, borderRadius: 2, cursor: 'pointer', background: time >= s.start ? (time < s.end ? '#4ADE80' : 'rgba(255,255,255,0.5)') : 'rgba(255,255,255,0.15)', transition: 'background 0.2s' }} />
              ))}
            </div>
            {/* Buttons row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={handlePlay} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
                {playing
                  ? <svg viewBox="0 0 16 16" width="18" height="18" fill="white"><rect x="3" y="2" width="4" height="12"/><rect x="9" y="2" width="4" height="12"/></svg>
                  : <svg viewBox="0 0 16 16" width="18" height="18" fill="white"><path d="M4 3v10l9-5z"/></svg>
                }
              </button>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontFamily: 'monospace' }}>{mm}:{ss} / 2:55</span>
              <div style={{ flex: 1 }} />
              {/* Scene label */}
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{currentScene.label}</span>
              <svg viewBox="0 0 14 14" width="14" height="14" fill="rgba(255,255,255,0.6)"><path d="M1 4h3l3-3v12l-3-3H1zM10 5a3 3 0 0 1 0 4M12 3a6 6 0 0 1 0 8"/></svg>
              <div style={{ width: 50, height: 3, background: 'rgba(255,255,255,0.3)', borderRadius: 2 }}><div style={{ width: '70%', height: '100%', background: 'white', borderRadius: 2 }} /></div>
              <svg viewBox="0 0 16 16" width="16" height="16" fill="rgba(255,255,255,0.6)"><path d="M2 2h5v2H4v4H2zM9 2h5v6h-2V4H9zM2 10h2v4h4v2H2zM12 10h2v6H9v-2h3z"/></svg>
            </div>
          </div>

        </div>
      </div>

      {/* Chapter dots below */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 16, flexWrap: 'wrap' }}>
        {SCENES.map((s, i) => (
          <button key={i} onClick={() => { timeRef.current = s.start; setTime(s.start); if (!started) setStarted(true); }} style={{ background: sceneIdx === i ? G : '#F1F5F9', color: sceneIdx === i ? 'white' : '#64748B', border: 'none', borderRadius: 20, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
