import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, Upload,
  Send, BarChart3, TrendingUp, LogOut, Settings2, Settings, CalendarCheck, CreditCard, Umbrella, MapPin, UserCog,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const RupeeLeaf = ({ size = 20 }) => (
  <svg viewBox="0 0 20 24" fill="none" style={{ width: size, height: size }}>
    <path d="M10,1 C16,1 19,7 18,13 C17,19 14,22 10,23 C6,22 3,19 2,13 C1,7 4,1 10,1 Z" fill="white"/>
    <line x1="10" y1="2" x2="10" y2="22" stroke="#1A7A4A" strokeWidth="1.7" strokeLinecap="round"/>
    <line x1="4" y1="7" x2="16" y2="7" stroke="#1A7A4A" strokeWidth="1.7" strokeLinecap="round"/>
    <line x1="4" y1="11" x2="16" y2="11" stroke="#1A7A4A" strokeWidth="1.7" strokeLinecap="round"/>
    <line x1="4" y1="11" x2="14" y2="20" stroke="#1A7A4A" strokeWidth="1.7" strokeLinecap="round"/>
  </svg>
);

// Numbered step badge
const StepBadge = ({ num, active }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 20,
      height: 20,
      borderRadius: '50%',
      fontSize: 10,
      fontWeight: 700,
      flexShrink: 0,
      background: active ? 'var(--brand)' : 'var(--border-light)',
      color: active ? 'white' : 'var(--text-muted)',
      border: active ? '2px solid var(--brand)' : '2px solid #E2E8F0',
    }}
  >
    {num}
  </span>
);

// The 4-step monthly workflow — permKey maps to permissions object key
const WORKFLOW_STEPS = [
  { step: 1, to: '/admin/employees',   label: 'Add Employees',     icon: Users,    hint: 'Enter staff details',     permKey: 'employees' },
  { step: 2, to: '/admin/upload',      label: 'Upload Salaries',   icon: Upload,   hint: 'Import CSV/Excel',        permKey: 'upload' },
  { step: 3, to: '/admin/send',        label: 'Generate & Send',   icon: Send,     hint: 'Create payslips & email', permKey: 'send' },
  { step: 4, to: '/admin/reports',     label: 'Download Reports',  icon: BarChart3,hint: 'PDF & Excel reports',     permKey: 'reports' },
];

const OTHER_NAV = [
  { to: '/admin/dashboard',     label: 'Dashboard',       icon: LayoutDashboard, permKey: null },
  { to: '/admin/locations',     label: 'Locations',       icon: MapPin,          permKey: 'locations' },
  { to: '/admin/attendance',    label: 'Attendance',      icon: CalendarCheck,   permKey: 'attendance' },
  { to: '/admin/leave-policy',  label: 'Leave Policy',    icon: Umbrella,        permKey: 'leave_policy' },
  { to: '/admin/billing',       label: 'Billing & Plan',  icon: CreditCard,      permKey: 'billing' },
  { to: '/admin/payslips',      label: 'Payslip History', icon: FileText,        permKey: 'payslips' },
  { to: '/admin/analytics',     label: 'Analytics',       icon: TrendingUp,      permKey: 'analytics' },
  { to: '/admin/payroll-config',label: 'Payroll Config',  icon: Settings2,       permKey: 'payroll_config' },
  { to: '/admin/settings',      label: 'Settings',        icon: Settings,        permKey: 'settings' },
];

export default function Sidebar() {
  const navigate   = useNavigate();
  const isSubUser  = localStorage.getItem('payslip_is_sub_user') === 'true';
  const subName    = localStorage.getItem('payslip_sub_user_name') || '';
  const adminName  = isSubUser ? subName : (localStorage.getItem('employee_name') || 'Admin');
  const initials   = adminName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  // Parse permissions — only used for sub-users
  let permissions = {};
  if (isSubUser) {
    try { permissions = JSON.parse(localStorage.getItem('payslip_permissions') || '{}'); } catch {}
  }

  // Check if a nav item is allowed for current user
  const allowed = (permKey) => {
    if (!isSubUser) return true;         // main admin — see everything
    if (!permKey) return true;           // dashboard always visible
    return permissions[permKey] === true;
  };

  const logout = () => {
    ['payslip_token','payslip_role','employee_name','payslip_is_sub_user','payslip_sub_user_name','payslip_permissions']
      .forEach(k => localStorage.removeItem(k));
    navigate('/login');
  };

  return (
    <aside
      className="w-[245px] shrink-0 flex flex-col h-screen sticky top-0"
      style={{
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--border-light)',
        boxShadow: '2px 0 12px rgba(0,0,0,0.04)',
      }}
    >
      {/* ── Brand ──────────────────────────────────────────── */}
      <div className="px-5 pt-6 pb-5" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: '#1A7A4A', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(26,122,74,0.3)' }}>
            <RupeeLeaf size={22} />
          </div>
          <div>
            <div style={{ lineHeight: 1.1 }}>
              <span style={{ fontSize: 17, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.04em' }}>Pay</span>
              <span style={{ fontSize: 17, fontWeight: 900, color: '#1A7A4A', letterSpacing: '-0.04em' }}>Leef</span>
            </div>
            <span style={{ display: 'block', fontSize: 9.5, color: '#94A3B8', letterSpacing: '0.1em' }}>PAYROLL FOR INDIA</span>
          </div>
        </div>
      </div>

      {/* ── Navigation ─────────────────────────────────────── */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">

        {/* ── MONTHLY WORKFLOW — numbered steps ── */}
        <div className="mb-5">
          <p
            className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: 'var(--text-muted)' }}
          >
            📋 Monthly Steps — Do In Order
          </p>

          {/* Step connector line */}
          <div className="relative">
            {/* Vertical connector */}
            <div style={{
              position: 'absolute',
              left: 22,
              top: 22,
              bottom: 22,
              width: 2,
              background: 'linear-gradient(to bottom, #1A7A4A44, #1A7A4A22)',
              borderRadius: 2,
            }} />

            <div className="space-y-[3px]">
              {WORKFLOW_STEPS.filter(s => allowed(s.permKey)).map(({ step, to, label, icon: Icon, hint }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-[9px] rounded-xl text-[13px] font-medium transition-all duration-150',
                      isActive ? 'active-nav' : 'inactive-nav'
                    )
                  }
                  style={({ isActive }) =>
                    isActive
                      ? { background: 'var(--brand-light)', color: 'var(--brand)', boxShadow: 'inset 3px 0 0 var(--brand)' }
                      : { color: 'var(--text-secondary)' }
                  }
                  onMouseEnter={e => {
                    if (!e.currentTarget.style.boxShadow) {
                      e.currentTarget.style.background = 'var(--border-light)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!e.currentTarget.style.boxShadow) {
                      e.currentTarget.style.background = '';
                      e.currentTarget.style.color = 'var(--text-secondary)';
                    }
                  }}
                >
                  {/* Step number badge */}
                  <StepBadge num={step} active={false} />
                  <Icon size={15} className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="leading-tight font-semibold">{label}</div>
                    <div className="text-[10px] opacity-60 leading-tight">{hint}</div>
                  </div>
                </NavLink>
              ))}
            </div>
          </div>
        </div>

        {/* ── Other pages ── */}
        <div>
          <p
            className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: 'var(--text-muted)' }}
          >
            More
          </p>
          <div className="space-y-[2px]">
            {OTHER_NAV.filter(n => allowed(n.permKey)).map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-[9px] rounded-xl text-[13px] font-medium transition-all duration-150',
                    isActive ? 'active-nav' : 'inactive-nav'
                  )
                }
                style={({ isActive }) =>
                  isActive
                    ? { background: 'var(--brand-light)', color: 'var(--brand)', boxShadow: 'inset 3px 0 0 var(--brand)' }
                    : { color: 'var(--text-secondary)' }
                }
                onMouseEnter={e => {
                  if (!e.currentTarget.style.boxShadow) {
                    e.currentTarget.style.background = 'var(--border-light)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={e => {
                  if (!e.currentTarget.style.boxShadow) {
                    e.currentTarget.style.background = '';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                <Icon size={15} className="shrink-0" />
                <span className="flex-1">{label}</span>
              </NavLink>
            ))}

            {/* Team Access — only visible to main admin, not sub-users */}
            {!isSubUser && (
              <NavLink
                to="/admin/users"
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-[9px] rounded-xl text-[13px] font-medium transition-all duration-150',
                    isActive ? 'active-nav' : 'inactive-nav'
                  )
                }
                style={({ isActive }) =>
                  isActive
                    ? { background: 'var(--brand-light)', color: 'var(--brand)', boxShadow: 'inset 3px 0 0 var(--brand)' }
                    : { color: 'var(--text-secondary)' }
                }
                onMouseEnter={e => {
                  if (!e.currentTarget.style.boxShadow) {
                    e.currentTarget.style.background = 'var(--border-light)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }
                }}
                onMouseLeave={e => {
                  if (!e.currentTarget.style.boxShadow) {
                    e.currentTarget.style.background = '';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }
                }}
              >
                <UserCog size={15} className="shrink-0" />
                <span className="flex-1">Team Access</span>
              </NavLink>
            )}
          </div>
        </div>
      </nav>

      {/* ── User profile + Logout ──────────────────────────── */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid var(--border-light)' }}>
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1"
          style={{ background: 'var(--border-light)' }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
            style={{ background: isSubUser ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' : 'linear-gradient(135deg, var(--brand) 0%, var(--brand-hover) 100%)' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {adminName || 'Admin'}
            </p>
            <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
              {isSubUser ? 'Team Member' : 'Admin'}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-[13px] transition-all"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--brand-light)'; e.currentTarget.style.color = 'var(--brand)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <LogOut size={14} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
