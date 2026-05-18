import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, ShieldCheck, BarChart3 } from 'lucide-react';

const NAV = [
  { path: '/super-admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/super-admin/clients',   icon: Users,           label: 'Clients' },
  { path: '/super-admin/analytics', icon: BarChart3,       label: 'Analytics' },
];

export default function SuperAdminLayout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const token = localStorage.getItem('payos_super_token');
  const role  = localStorage.getItem('payos_super_role');

  if (!token || role !== 'super_admin') {
    return <Navigate to="/super-admin/login" replace />;
  }

  const logout = () => {
    localStorage.removeItem('payos_super_token');
    localStorage.removeItem('payos_super_role');
    navigate('/super-admin/login');
  };

  return (
    <div className="flex min-h-screen" style={{ background: '#F4F5F7' }}>
      {/* Sidebar */}
      <div className="w-60 flex flex-col" style={{ background: '#0F172A' }}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#E85C2F' }}>
            <ShieldCheck size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-black text-white leading-tight">PayOS Master</p>
            <p className="text-[10px] text-white/40">Super Admin Panel</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV.map(({ path, icon: Icon, label }) => {
            const active = location.pathname.startsWith(path);
            return (
              <button key={path} onClick={() => navigate(path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'text-white'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`}
                style={active ? { background: '#E85C2F' } : {}}>
                <Icon size={16} /> {label}
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/10">
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-slate-100 flex items-center px-6 sticky top-0 z-10 shadow-sm">
          <p className="text-sm font-semibold text-slate-800">PayOS Master Control Panel</p>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-slate-500">Live</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
