import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, Upload,
  Send, BarChart3, TrendingUp, LogOut, Settings2,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Payroll',
    items: [
      { to: '/admin/employees',  label: 'Employees',       icon: Users },
      { to: '/admin/payslips',   label: 'Payslips',        icon: FileText },
      { to: '/admin/upload',     label: 'Import Data',     icon: Upload },
      { to: '/admin/send',       label: 'Generate & Send', icon: Send },
    ],
  },
  {
    label: 'Insights',
    items: [
      { to: '/admin/reports',    label: 'Reports',         icon: BarChart3 },
      { to: '/admin/analytics',  label: 'Analytics',       icon: TrendingUp },
    ],
  },
  {
    label: 'Settings',
    items: [
      { to: '/admin/payroll-config', label: 'Payroll Config', icon: Settings2 },
    ],
  },
];

export default function Sidebar() {
  const navigate  = useNavigate();
  const adminName = localStorage.getItem('employee_name') || 'Admin';
  const adminEmail = localStorage.getItem('payslip_email') || '';
  const initials  = adminName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const logout = () => {
    localStorage.removeItem('payslip_token');
    localStorage.removeItem('payslip_role');
    localStorage.removeItem('employee_name');
    navigate('/login');
  };

  return (
    <aside
      className="w-[230px] shrink-0 flex flex-col h-screen sticky top-0"
      style={{
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--border-light)',
        boxShadow: '2px 0 12px rgba(0,0,0,0.04)',
      }}
    >
      {/* ── Brand ──────────────────────────────────────────── */}
      <div className="px-5 pt-6 pb-5" style={{ borderBottom: '1px solid var(--border-light)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
            style={{ background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-hover) 100%)' }}
          >
            <FileText size={16} className="text-white" />
          </div>
          <div>
            <p className="text-[15px] font-800 leading-tight" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
              PayOS
            </p>
            <p className="text-[11px] leading-tight" style={{ color: 'var(--text-muted)' }}>
              Smart Payroll OS
            </p>
          </div>
        </div>
      </div>

      {/* ── Navigation ─────────────────────────────────────── */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        {NAV_GROUPS.map((group, gi) => (
          <div key={group.label} className={gi > 0 ? 'mt-6' : ''}>
            {/* Group label */}
            <p
              className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: 'var(--text-muted)' }}
            >
              {group.label}
            </p>

            {/* Group items */}
            <div className="space-y-[2px]">
              {group.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-[9px] rounded-xl text-[13.5px] font-medium transition-all duration-150 group',
                      isActive ? 'active-nav' : 'inactive-nav'
                    )
                  }
                  style={({ isActive }) =>
                    isActive
                      ? {
                          background: 'var(--brand-light)',
                          color: 'var(--brand)',
                          boxShadow: 'inset 3px 0 0 var(--brand)',
                        }
                      : {
                          color: 'var(--text-secondary)',
                        }
                  }
                  onMouseEnter={e => {
                    if (!e.currentTarget.classList.contains('active-nav')) {
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
                  <span className="flex-1">{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── User profile + Logout ──────────────────────────── */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid var(--border-light)' }}>
        {/* Admin info row */}
        <div
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1"
          style={{ background: 'var(--border-light)' }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
            style={{ background: 'linear-gradient(135deg, var(--brand) 0%, var(--brand-hover) 100%)' }}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
              {adminName}
            </p>
            <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
              Admin
            </p>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-xl text-[13px] transition-all"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--brand-light)';
            e.currentTarget.style.color = 'var(--brand)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = '';
            e.currentTarget.style.color = 'var(--text-muted)';
          }}
        >
          <LogOut size={14} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
