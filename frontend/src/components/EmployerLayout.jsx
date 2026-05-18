import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Upload, FileText, Users, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
          <p className="text-zoho-blue font-bold text-lg leading-tight">DinMind</p>
          <p className="text-xs text-zoho-muted">Payslip Portal</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                 ${isActive
                   ? 'bg-blue-50 text-zoho-blue'
                   : 'text-zoho-muted hover:bg-gray-50 hover:text-zoho-text'}`
              }>
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
