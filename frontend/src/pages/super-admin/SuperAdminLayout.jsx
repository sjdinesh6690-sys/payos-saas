import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { LayoutDashboard, Users, LogOut, BarChart3, AlertTriangle, CreditCard, Menu, X } from 'lucide-react';

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
  { path: '/super-admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/super-admin/clients',   icon: Users,           label: 'Clients' },
  { path: '/super-admin/payments',  icon: CreditCard,      label: 'Payments' },
  { path: '/super-admin/analytics', icon: BarChart3,       label: 'Analytics' },
  { path: '/super-admin/errors',    icon: AlertTriangle,   label: 'Error Monitor' },
];

export default function SuperAdminLayout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const token = localStorage.getItem('payos_super_token');
  const role  = localStorage.getItem('payos_super_role');

  if (!token || role !== 'super_admin') {
    return <Navigate to="/super-admin/login" replace />;
  }

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const logout = () => {
    localStorage.removeItem('payos_super_token');
    localStorage.removeItem('payos_super_role');
    navigate('/super-admin/login');
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#1A7A4A', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(26,122,74,0.4)' }}>
            <RupeeLeaf size={20} />
          </div>
          <div>
            <div style={{ lineHeight: 1.1 }}>
              <span style={{ fontSize: 15, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em' }}>Pay</span>
              <span style={{ fontSize: 15, fontWeight: 900, color: '#4ADE80', letterSpacing: '-0.04em' }}>Leef</span>
            </div>
            <span style={{ display: 'block', fontSize: 8.5, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.08em' }}>MASTER PANEL</span>
          </div>
        </div>
        {/* Close button on mobile */}
        <button onClick={() => setSidebarOpen(false)} className="md:hidden text-white/50 hover:text-white ml-auto">
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {NAV.map(({ path, icon: Icon, label }) => {
          const active = location.pathname.startsWith(path);
          return (
            <button key={path} onClick={() => { navigate(path); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active ? 'text-white' : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}
              style={active ? { background: '#1A7A4A' } : {}}>
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
    </>
  );

  return (
    <div className="flex min-h-screen" style={{ background: '#F4F5F7' }}>
      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-60 flex-col flex-shrink-0" style={{ background: '#0F172A' }}>
        <SidebarContent />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setSidebarOpen(false)}>
          <div className="absolute inset-0 bg-black/60" />
          <div className="absolute left-0 top-0 bottom-0 w-64 flex flex-col" style={{ background: '#0F172A' }} onClick={e => e.stopPropagation()}>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 bg-white border-b border-slate-100 flex items-center px-4 sticky top-0 z-10 shadow-sm">
          {/* Hamburger — mobile only */}
          <button onClick={() => setSidebarOpen(true)} className="md:hidden mr-3 p-1.5 rounded-lg hover:bg-slate-100 text-slate-600">
            <Menu size={20} />
          </button>
          <p className="text-sm font-semibold text-slate-800 truncate">PayLeef Master Control Panel</p>
          <div className="ml-auto flex items-center gap-2 flex-shrink-0">
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
