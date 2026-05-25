import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Upload, Send, BarChart3,
  LogOut, Settings, ChevronDown, ChevronUp,
  FileText, TrendingUp, Settings2, CalendarCheck,
  CreditCard, Umbrella, MapPin, UserCog, BookOpen,
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

// Core monthly workflow — always visible
const CORE_NAV = [
  { to: '/admin/dashboard',  label: 'Dashboard',         icon: LayoutDashboard, permKey: null },
  { to: '/admin/employees',  label: 'Employees & Import', icon: Users,           permKey: 'employees' },
  { to: '/admin/send',       label: 'Generate & Send',    icon: Send,            permKey: 'send' },
  { to: '/admin/reports',    label: 'Reports',            icon: BarChart3,       permKey: 'reports' },
];

// Hidden behind "More" — advanced / infrequent pages
const MORE_NAV = [
  { to: '/admin/form16',         label: 'Form 16 Part B',  icon: BookOpen,     permKey: 'reports' },
  { to: '/admin/payslips',       label: 'Payslip History', icon: FileText,     permKey: 'payslips' },
  { to: '/admin/attendance',     label: 'Attendance',      icon: CalendarCheck, permKey: 'attendance' },
  { to: '/admin/leave-policy',   label: 'Leave Policy',    icon: Umbrella,      permKey: 'leave_policy' },
  { to: '/admin/analytics',      label: 'Analytics',       icon: TrendingUp,    permKey: 'analytics' },
  { to: '/admin/locations',      label: 'Locations',       icon: MapPin,        permKey: 'locations' },
  { to: '/admin/payroll-config', label: 'Payroll Config',  icon: Settings2,     permKey: 'payroll_config' },
  { to: '/admin/billing',        label: 'Billing & Plan',  icon: CreditCard,    permKey: 'billing' },
  { to: '/admin/settings',       label: 'Settings',        icon: Settings,      permKey: 'settings' },
];

function NavItem({ to, label, icon: Icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-150 group',
          isActive ? '' : ''
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
      <Icon size={16} className="shrink-0" />
      <span>{label}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  const navigate    = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  const isSubUser   = localStorage.getItem('payslip_is_sub_user') === 'true';
  const subName     = localStorage.getItem('payslip_sub_user_name') || '';
  const adminName   = isSubUser ? subName : (localStorage.getItem('employee_name') || 'Admin');
  const initials    = adminName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  // Parse permissions — only used for sub-users
  let permissions = {};
  if (isSubUser) {
    try { permissions = JSON.parse(localStorage.getItem('payslip_permissions') || '{}'); } catch {}
  }

  const allowed = (permKey) => {
    if (!isSubUser) return true;
    if (!permKey) return true;
    return permissions[permKey] === true;
  };

  const logout = () => {
    ['payslip_token','payslip_role','employee_name','payslip_is_sub_user','payslip_sub_user_name','payslip_permissions']
      .forEach(k => localStorage.removeItem(k));
    navigate('/login');
  };

  const visibleCore = CORE_NAV.filter(n => allowed(n.permKey));
  const visibleMore = MORE_NAV.filter(n => allowed(n.permKey));

  return (
    <aside
      className="w-[220px] shrink-0 flex flex-col h-screen sticky top-0"
      style={{
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--border-light)',
        boxShadow: '2px 0 12px rgba(0,0,0,0.04)',
      }}
    >
      {/* ── Brand ── */}
      <div className="px-4 pt-5 pb-4" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: '#1A7A4A', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(26,122,74,0.3)',
          }}>
            <RupeeLeaf size={21} />
          </div>
          <div>
            <div style={{ lineHeight: 1.1 }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.04em' }}>Pay</span>
              <span style={{ fontSize: 16, fontWeight: 900, color: '#1A7A4A', letterSpacing: '-0.04em' }}>Leef</span>
            </div>
            <span style={{ display: 'block', fontSize: 9, color: '#94A3B8', letterSpacing: '0.12em' }}>PAYROLL FOR INDIA</span>
          </div>
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav className="flex-1 py-3 px-2.5 overflow-y-auto space-y-0.5">

        {/* Core nav */}
        {visibleCore.map(item => (
          <NavItem key={item.to} {...item} />
        ))}

        {/* More toggle */}
        {visibleMore.length > 0 && (
          <>
            <div className="pt-1" />
            <button
              onClick={() => setMoreOpen(v => !v)}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              {moreOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              <span>{moreOpen ? 'Less' : 'More'}</span>
            </button>

            {moreOpen && (
              <div className="space-y-0.5 pt-0.5">
                {visibleMore.map(item => (
                  <NavItem key={item.to} {...item} />
                ))}

                {/* Team Access — main admin only */}
                {!isSubUser && (
                  <NavItem to="/admin/users" label="Team Access" icon={UserCog} />
                )}
              </div>
            )}
          </>
        )}

        {/* Team Access when more is not shown (admin with no more items) */}
        {visibleMore.length === 0 && !isSubUser && (
          <NavItem to="/admin/users" label="Team Access" icon={UserCog} />
        )}

      </nav>

      {/* ── User + Logout ── */}
      <div className="px-2.5 py-3" style={{ borderTop: '1px solid var(--border-light)' }}>
        <div
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl mb-1"
          style={{ background: 'var(--border-light)' }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
            style={{
              background: isSubUser
                ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                : 'linear-gradient(135deg, var(--brand) 0%, var(--brand-hover) 100%)',
            }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {adminName || 'Admin'}
            </p>
            <p className="text-[10.5px] truncate" style={{ color: 'var(--text-muted)' }}>
              {isSubUser ? 'Team Member' : 'Admin'}
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-[13px] transition-all"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.color = '#DC2626'; }}
          onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = 'var(--text-muted)'; }}
        >
          <LogOut size={14} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
