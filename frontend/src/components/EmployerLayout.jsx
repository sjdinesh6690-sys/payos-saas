import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Upload, FileText, Users, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const RupeeLeaf = ({ size = 20 }) => (
  <svg viewBox="0 0 20 24" fill="none" style={{ width: size, height: size }}>
    <path d="M10,1 C16,1 19,7 18,13 C17,19 14,22 10,23 C6,22 3,19 2,13 C1,7 4,1 10,1 Z" fill="white"/>
    <line x1="10" y1="2" x2="10" y2="22" stroke="#1A7A4A" strokeWidth="1.7" strokeLinecap="round"/>
    <line x1="4" y1="7" x2="16" y2="7" stroke="#1A7A4A" strokeWidth="1.7" strokeLinecap="round"/>
    <line x1="4" y1="11" x2="16" y2="11" stroke="#1A7A4A" strokeWidth="1.7" strokeLinecap="round"/>
    <line x1="4" y1="11" x2="14" y2="20" stroke="#1A7A4A" strokeWidth="1.7" strokeLinecap="round"/>
  </svg>
);

const NAV = [
  { to: '/employer',           icon: LayoutDashboard, label: 'Dashboard',      end: true },
  { to: '/employer/upload',    icon: Upload,          label: 'Upload Salaries', end: false },
  { to: '/employer/payslips',  icon: FileText,        label: 'Payslip History', end: false },
  { to: '/employer/employees', icon: Users,           label: 'Employees',       end: false },
];

export default function EmployerLayout() {
  const { logout } = useAuth();
  const navigate   = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="flex h-screen bg-zoho-bg">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-zoho-border flex flex-col shrink-0">
        <div className="px-5 py-5 border-b border-zoho-border">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: '#1A7A4A', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(26,122,74,0.3)' }}>
              <RupeeLeaf size={19} />
            </div>
            <div>
              <div style={{ lineHeight: 1.1 }}>
                <span style={{ fontSize: 15, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.04em' }}>Pay</span>
                <span style={{ fontSize: 15, fontWeight: 900, color: '#1A7A4A', letterSpacing: '-0.04em' }}>Leef</span>
              </div>
              <span style={{ display: 'block', fontSize: 9, color: '#94A3B8', letterSpacing: '0.1em' }}>PAYROLL FOR INDIA</span>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                 ${isActive
                   ? 'text-white'
                   : 'text-zoho-muted hover:bg-gray-50 hover:text-zoho-text'}`
              }
              style={({ isActive }) => isActive ? { background: '#1A7A4A' } : {}}>
              <Icon size={16} />{label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-zoho-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-8 py-7">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
