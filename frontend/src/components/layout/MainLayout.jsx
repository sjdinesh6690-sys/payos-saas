import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, HelpCircle, Palette, Check, X, BookOpen, Users, FileText, Upload, Send, BarChart2, Settings, LogOut } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import Sidebar from './Sidebar';
import TrialBanner from './TrialBanner';
import { TrialContext } from '@/lib/TrialContext';
import api from '@/lib/api';

// ── Theme color system ────────────────────────────────────────────────────────
const PRESET_COLORS = [
  { hex: '#1A7A4A', label: 'Professional Blue' },
  { hex: '#059669', label: 'Emerald'           },
  { hex: '#7C3AED', label: 'Violet'            },
  { hex: '#0891B2', label: 'Cyan'              },
  { hex: '#DC2626', label: 'Red'               },
  { hex: '#D97706', label: 'Amber'             },
  { hex: '#E85C2F', label: 'Orange'            },
  { hex: '#0F172A', label: 'Charcoal'          },
];

// ── Help content per page ────────────────────────────────────────────────────
const HELP_CONTENT = {
  '/admin/dashboard': {
    icon: BookOpen,
    title: 'Dashboard — Your Payroll Home',
    steps: [
      { emoji: '📊', heading: 'See your numbers at a glance', body: 'The top cards show total employees, monthly payroll cost, average salary, and payslips generated this month.' },
      { emoji: '📈', heading: 'Monthly trend chart', body: 'The bar chart shows how much you paid each month. If a bar is missing, it means no payslips were generated that month.' },
      { emoji: '🏆', heading: 'Top earners list', body: 'Scroll down to see your highest paid employees. Click "View all" to go to the full employee list.' },
      { emoji: '🚀', heading: 'Quick actions', body: 'Use the "Import Data" and "Generate Payslips" buttons at the top right to quickly jump to those tasks.' },
    ],
  },
  '/admin/employees': {
    icon: Users,
    title: 'Employees — Manage Your Team',
    steps: [
      { emoji: '➕', heading: 'Add a new employee', body: 'Click the "Add Employee" button at the top right. Fill in the name, employee ID, department, salary, and email. Then click Save.' },
      { emoji: '✏️', heading: 'Edit an employee', body: 'Click the pencil (edit) icon on any row to update their details like salary, designation, or department.' },
      { emoji: '🗑️', heading: 'Remove an employee', body: 'Click the bin (delete) icon to remove an employee. This does not delete their old payslips.' },
      { emoji: '📥', heading: 'Add many employees at once', body: 'Use "Import Data" in the left menu to upload a CSV file with all your employees in one go.' },
      { emoji: '🔍', heading: 'Find an employee quickly', body: 'Type a name or employee ID in the search bar at the top to filter the list instantly.' },
    ],
  },
  '/admin/payslips': {
    icon: FileText,
    title: 'Payslips — All Generated Payslips',
    steps: [
      { emoji: '📅', heading: 'Filter by month', body: 'Use the month and year dropdowns at the top to see payslips for a specific period.' },
      { emoji: '⬇️', heading: 'Download a payslip', body: 'Click the download icon on any row to get that employee\'s payslip as a PDF file.' },
      { emoji: '📧', heading: 'Send payslips by email', body: 'Tick the checkboxes next to employees, then click "Send Email" to email their payslips to them directly.' },
      { emoji: '🗑️', heading: 'Delete payslips', body: 'Select one or more payslips and click "Delete" to remove them. You can regenerate them later.' },
      { emoji: '✅', heading: 'See who was emailed', body: 'A green tick in the "Emailed" column means that employee has already received their payslip by email.' },
    ],
  },
  '/admin/upload': {
    icon: Upload,
    title: 'Import Data — Upload Your Data',
    steps: [
      { emoji: '1️⃣', heading: 'Step 1 — Download the template', body: 'Click "Download Template" to get a ready-made spreadsheet. Open it in Excel or Google Sheets.' },
      { emoji: '2️⃣', heading: 'Step 2 — Fill in your data', body: 'Add your employee details or salary information row by row. Do not change the column headings.' },
      { emoji: '3️⃣', heading: 'Step 3 — Upload the file', body: 'Drag your file into the upload box, or click "Browse" to select it from your computer. Then click Upload.' },
      { emoji: '✅', heading: 'Check the result', body: 'After upload, you will see how many records were added and if any rows were skipped. Fix any errors and re-upload.' },
      { emoji: '💡', heading: 'Tip — Employee tab vs Payslip tab', body: 'Use the "Employee Master" tab to add new staff. Use the "Payslip Data" tab to upload salary breakdowns for a specific month.' },
    ],
  },
  '/admin/send': {
    icon: Send,
    title: 'Generate & Send — Create Payslips',
    steps: [
      { emoji: '📅', heading: 'Step 1 — Pick the month and year', body: 'Select the month and year you want to generate payslips for, then click "Generate Payslips".' },
      { emoji: '⚙️', heading: 'Payslips are calculated automatically', body: 'The system calculates Basic, HRA, PF, ESI, and other components based on your Payroll Config settings.' },
      { emoji: '🔧', heading: 'Adjust individual employees', body: 'Click the "Adjust" button next to an employee to add LOP (leave without pay), overtime, or bonus before sending.' },
      { emoji: '📧', heading: 'Step 2 — Send by email', body: 'After generating, tick all employees and click "Send Email" to deliver payslips to each person\'s inbox.' },
      { emoji: '💡', heading: 'Tip — Check emails are set up', body: 'Make sure each employee has an email address saved. You can check this in the Employees page.' },
    ],
  },
  '/admin/reports': {
    icon: BarChart2,
    title: 'Reports — Download Official Reports',
    steps: [
      { emoji: '📋', heading: 'Monthly payroll summary', body: 'Download a full list of all employees, their salaries, and deductions for any month in Excel or PDF format.' },
      { emoji: '🏛️', heading: 'Statutory reports', body: 'Download PF (Provident Fund), ESI, and Professional Tax reports ready to submit to government departments.' },
      { emoji: '📅', heading: 'Pick a date range', body: 'Use the month/year selector to choose which period the report covers, then click Download.' },
      { emoji: '📂', heading: 'Where does the file go?', body: 'The file downloads to your computer\'s Downloads folder automatically. Open it in Excel to view.' },
    ],
  },
  '/admin/analytics': {
    icon: BarChart2,
    title: 'Analytics — Payroll Insights',
    steps: [
      { emoji: '📊', heading: 'Payroll trend', body: 'See how your total payroll cost has changed month by month over the past year.' },
      { emoji: '🏢', heading: 'Department breakdown', body: 'Compare how much each department costs so you can plan your budget better.' },
      { emoji: '💰', heading: 'Salary distribution', body: 'See how many employees fall into different salary bands — useful for HR planning.' },
      { emoji: '📤', heading: 'Export data', body: 'Click the Export button to download the analytics data as a spreadsheet.' },
    ],
  },
  '/admin/payroll-config': {
    icon: Settings,
    title: 'Payroll Config — Set Your Rules',
    steps: [
      { emoji: '💵', heading: 'Earnings components', body: 'Set up how salary is split — Basic Pay (usually 40%), HRA (40% of Basic), Conveyance, Special Allowance, etc.' },
      { emoji: '➖', heading: 'Deductions', body: 'Configure PF (12% of Basic), ESI (0.75% of Gross if salary ≤ ₹21,000), Professional Tax, and TDS.' },
      { emoji: '💾', heading: 'Save your settings', body: 'Click "Save Config" when done. All future payslips will use these settings automatically.' },
      { emoji: '⚠️', heading: 'Important note', body: 'Changing config will only affect NEW payslips. Already generated payslips are not changed.' },
      { emoji: '🎨', heading: 'Branding', body: 'Add your company logo and choose a payslip template. This appears on every payslip PDF.' },
    ],
  },
};

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function applyTheme(hex) {
  const { r, g, b } = hexToRgb(hex);
  const root = document.documentElement;
  root.style.setProperty('--brand',       hex);
  root.style.setProperty('--brand-light', `rgba(${r},${g},${b},0.1)`);
  root.style.setProperty('--brand-hover', `rgb(${Math.max(0,r-25)},${Math.max(0,g-25)},${Math.max(0,b-25)})`);
  localStorage.setItem('payos_brand_color', hex);
}

// Load saved theme immediately (before render)
// Migrate anyone who had the old orange default → new blue default
const saved = localStorage.getItem('payos_brand_color');
const migratedOrange = saved === '#E85C2F';
if (saved && !migratedOrange) applyTheme(saved);
else { localStorage.removeItem('payos_brand_color'); applyTheme('#1A7A4A'); }

// ─────────────────────────────────────────────────────────────────────────────

const PAGE_META = {
  '/admin/dashboard':      { title: 'Dashboard',       subtitle: 'Your payroll overview' },
  '/admin/employees':      { title: 'Employees',        subtitle: 'Manage your team' },
  '/admin/payslips':       { title: 'Payslips',         subtitle: 'All generated payslips' },
  '/admin/upload':         { title: 'Import Data',      subtitle: 'Upload employees via CSV' },
  '/admin/send':           { title: 'Generate & Send',  subtitle: 'Create and email payslips' },
  '/admin/reports':        { title: 'Reports',          subtitle: 'Compliance & statutory reports' },
  '/admin/analytics':      { title: 'Analytics',        subtitle: 'Payroll trends & insights' },
  '/admin/payroll-config': { title: 'Payroll Config',   subtitle: 'Rules, components & templates' },
};

export default function MainLayout() {
  const token    = localStorage.getItem('payslip_token');
  const role     = localStorage.getItem('payslip_role');
  const name     = localStorage.getItem('employee_name') || 'Admin';
  const location = useLocation();

  const [profileOpen, setProfileOpen] = useState(false);
  const [themeOpen,   setThemeOpen]   = useState(false);
  const [helpOpen,    setHelpOpen]    = useState(false);
  const [brandColor,  setBrandColor]  = useState(localStorage.getItem('payos_brand_color') || '#1A7A4A');

  const profileRef = useRef(null);
  const themeRef   = useRef(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (themeRef.current   && !themeRef.current.contains(e.target))   setThemeOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pickColor = (hex) => {
    setBrandColor(hex);
    applyTheme(hex);
  };

  if (!token || role !== 'employer') {
    return <Navigate to="/login" replace />;
  }

  // ── Onboarding check ──────────────────────────────────────────────────
  const { data: onboarding, isLoading: onboardingLoading } = useQuery({
    queryKey: ['onboarding-status'],
    queryFn: () => api.get('/admin-profile/onboarding').then(r => r.data),
    staleTime: 60_000,
    retry: false,
  });

  if (!onboardingLoading && onboarding && onboarding.onboarding_completed === false) {
    return <Navigate to="/onboarding" replace />;
  }

  // ── Trial status ──────────────────────────────────────────────────────
  const { data: trialData, isLoading: trialLoading } = useQuery({
    queryKey: ['trial-status'],
    queryFn: () => api.get('/admin-profile/trial').then(r => r.data),
    staleTime: 60_000,
    retry: false,
  });

  const trialCtx = {
    trialActive:   trialData?.trial_active   ?? true,
    daysRemaining: trialData?.days_remaining ?? 30,
    isReadOnly:    trialData?.is_read_only   ?? false,
    isPaid:        trialData?.is_paid        ?? false,
    trialEndDate:  trialData?.trial_end_date ?? null,
    loading:       trialLoading,
  };

  const pageMeta = PAGE_META[location.pathname] || { title: 'Dashboard', subtitle: '' };
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const logout = () => {
    localStorage.removeItem('payslip_token');
    localStorage.removeItem('payslip_role');
    localStorage.removeItem('employee_name');
    window.location.href = '/login';
  };

  return (
    <TrialContext.Provider value={trialCtx}>
      <div className="flex min-h-screen" style={{ background: 'var(--bg-warm)' }}>
        <Sidebar />

        <div className="flex-1 flex flex-col min-w-0">

          {/* ── Top Header ───────────────────────────────────── */}
          <header
            className="h-16 flex items-center px-6 gap-4 sticky top-0 z-20"
            style={{
              background: 'rgba(255,255,255,0.92)',
              backdropFilter: 'blur(12px)',
              borderBottom: '1px solid var(--border-light)',
              boxShadow: '0 1px 8px rgba(0,0,0,0.05)',
            }}
          >
            {/* Page title */}
            <div className="shrink-0">
              <p className="text-[15px] font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>
                {pageMeta.title}
              </p>
              {pageMeta.subtitle && (
                <p className="text-[11.5px] leading-tight" style={{ color: 'var(--text-muted)' }}>
                  {pageMeta.subtitle}
                </p>
              )}
            </div>

            {/* Right side actions */}
            <div className="ml-auto flex items-center gap-2">

              {/* ── Theme colour picker ── */}
              <div className="relative" ref={themeRef}>
                <button
                  onClick={() => setThemeOpen(v => !v)}
                  className="w-9 h-9 flex items-center justify-center rounded-xl transition-all"
                  title="Change theme colour"
                  style={{ color: themeOpen ? 'var(--brand)' : 'var(--text-muted)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--border-light)'; e.currentTarget.style.color = 'var(--brand)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = themeOpen ? 'var(--brand-light)' : ''; e.currentTarget.style.color = themeOpen ? 'var(--brand)' : 'var(--text-muted)'; }}
                >
                  {/* Coloured dot inside the palette icon to show current color */}
                  <div className="relative">
                    <Palette size={17} />
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-1 ring-white"
                      style={{ background: brandColor }}
                    />
                  </div>
                </button>

                {/* Colour picker dropdown */}
                {themeOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 rounded-2xl p-4 z-50"
                    style={{
                      width: 240,
                      background: '#fff',
                      border: '1px solid var(--border)',
                      boxShadow: '0 12px 32px rgba(0,0,0,0.14)',
                    }}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.08em] mb-3" style={{ color: 'var(--text-muted)' }}>
                      Theme Colour
                    </p>

                    {/* Preset swatches */}
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {PRESET_COLORS.map(({ hex, label }) => (
                        <button
                          key={hex}
                          title={label}
                          onClick={() => pickColor(hex)}
                          className="relative w-full aspect-square rounded-xl transition-transform hover:scale-110 focus:outline-none"
                          style={{ background: hex }}
                        >
                          {brandColor.toLowerCase() === hex.toLowerCase() && (
                            <Check size={12} className="text-white absolute inset-0 m-auto drop-shadow" />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Divider */}
                    <div className="my-3" style={{ borderTop: '1px solid var(--border-light)' }} />

                    {/* Custom colour input */}
                    <p className="text-[11px] mb-2" style={{ color: 'var(--text-muted)' }}>Custom colour</p>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          value={brandColor}
                          maxLength={7}
                          onChange={e => {
                            const v = e.target.value;
                            setBrandColor(v);
                            if (/^#[0-9A-Fa-f]{6}$/.test(v)) applyTheme(v);
                          }}
                          className="w-full h-8 pl-3 pr-2 text-[12px] rounded-lg border focus:outline-none font-mono"
                          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                          placeholder="#000000"
                        />
                      </div>
                      <label
                        className="w-8 h-8 rounded-lg overflow-hidden cursor-pointer shrink-0 border"
                        style={{ borderColor: 'var(--border)' }}
                        title="Pick any colour"
                      >
                        <input
                          type="color"
                          value={brandColor.length === 7 && /^#[0-9A-Fa-f]{6}$/.test(brandColor) ? brandColor : '#E85C2F'}
                          onChange={e => pickColor(e.target.value)}
                          className="w-10 h-10 -translate-x-1 -translate-y-1 cursor-pointer"
                          style={{ opacity: 0.01 }}
                        />
                        <div className="w-full h-full -mt-8" style={{ background: brandColor }} />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Help */}
              <button
                onClick={() => setHelpOpen(v => !v)}
                className="w-9 h-9 flex items-center justify-center rounded-xl transition-all"
                style={{ color: helpOpen ? 'var(--brand)' : 'var(--text-muted)', background: helpOpen ? 'var(--brand-light)' : '' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-light)'; e.currentTarget.style.color = 'var(--brand)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = helpOpen ? 'var(--brand-light)' : ''; e.currentTarget.style.color = helpOpen ? 'var(--brand)' : 'var(--text-muted)'; }}
                title="Help — how to use this page"
              >
                <HelpCircle size={17} />
              </button>

              {/* Divider */}
              <div className="w-px h-6 mx-1" style={{ background: 'var(--border)' }} />

              {/* Avatar + profile dropdown */}
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen(v => !v)}
                  className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl transition-all"
                  style={{ color: 'var(--text-primary)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--border-light)'}
                  onMouseLeave={e => { if (!profileOpen) e.currentTarget.style.background = ''; }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                    style={{ background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-hover) 100%)' }}
                  >
                    {initials}
                  </div>
                  <span className="text-[13px] font-medium hidden sm:block">{name}</span>
                  <ChevronRight
                    size={13}
                    style={{
                      color: 'var(--text-muted)',
                      transform: profileOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.15s',
                    }}
                  />
                </button>

                {/* Dropdown */}
                {profileOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-52 rounded-2xl py-1.5 z-50"
                    style={{
                      background: '#fff',
                      border: '1px solid var(--border)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    }}
                  >
                    <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{name}</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Administrator</p>
                    </div>
                    <button
                      onClick={logout}
                      className="flex items-center gap-2.5 w-full px-4 py-3 text-[13px] font-semibold transition-all rounded-b-2xl"
                      style={{ color: '#DC2626' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = ''; }}
                    >
                      <LogOut size={15} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Trial banner */}
          <TrialBanner />

          {/* ── Help Panel (slides in from right) ──────────────── */}
          {helpOpen && (() => {
            const help = HELP_CONTENT[location.pathname] || HELP_CONTENT['/admin/dashboard'];
            const HelpIcon = help.icon;
            return (
              <div
                style={{
                  position: 'fixed', top: 0, right: 0, bottom: 0, width: 360,
                  background: '#fff', borderLeft: '1px solid var(--border)',
                  boxShadow: '-8px 0 32px rgba(0,0,0,0.10)',
                  zIndex: 100, overflowY: 'auto', display: 'flex', flexDirection: 'column',
                }}
              >
                {/* Header */}
                <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border-light)', background: 'var(--brand-light)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <HelpIcon size={16} color="#fff" />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>How to use this page</span>
                    </div>
                    <button
                      onClick={() => setHelpOpen(false)}
                      style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{help.title}</h3>
                </div>

                {/* Steps */}
                <div style={{ padding: '20px', flex: 1 }}>
                  {help.steps.map((step, i) => (
                    <div key={i} style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
                      <div style={{ fontSize: 22, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>{step.emoji}</div>
                      <div>
                        <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{step.heading}</p>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{step.body}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer tip */}
                <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-light)', background: 'var(--bg-warm)' }}>
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
                    💬 Need more help? Click the <strong>?</strong> icon on any page for step-by-step guidance.
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Page content */}
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </TrialContext.Provider>
  );
}
