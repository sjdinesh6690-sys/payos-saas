import { useQuery } from '@tanstack/react-query';
import { Users, FileText, TrendingUp, Building2, CheckCircle2, AlertCircle } from 'lucide-react';
import api from '@/lib/api';

const superApi = {
  get: (path) => api.get(path, {
    headers: { Authorization: `Bearer ${localStorage.getItem('payos_super_token')}` }
  })
};

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const fmtNum = (n) => new Intl.NumberFormat('en-IN').format(n || 0);

export default function SuperDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['super-stats'],
    queryFn: () => superApi.get('/super-admin/stats').then(r => r.data),
  });

  const { data: clientsData } = useQuery({
    queryKey: ['super-clients'],
    queryFn: () => superApi.get('/super-admin/clients').then(r => r.data),
  });

  const recentClients = (clientsData?.clients || [])
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 5);

  if (isLoading) {
    return <div className="p-8 text-slate-400 text-sm">Loading platform stats…</div>;
  }

  const statCards = [
    { label: 'Total Clients',       value: fmtNum(stats?.total_clients),   icon: Building2,  color: '#3B82F6', bg: '#EFF6FF' },
    { label: 'Active Clients',      value: fmtNum(stats?.active_clients),  icon: CheckCircle2, color: '#10B981', bg: '#ECFDF5' },
    { label: 'Total Employees',     value: fmtNum(stats?.total_employees), icon: Users,      color: '#8B5CF6', bg: '#F5F3FF' },
    { label: 'Total Payslips',      value: fmtNum(stats?.total_payslips),  icon: FileText,   color: '#E85C2F', bg: '#FFF4F0' },
    { label: 'Payslips This Month', value: fmtNum(stats?.payslips_this_month), icon: TrendingUp, color: '#F59E0B', bg: '#FFFBEB' },
    { label: 'Total Disbursed',     value: fmt(stats?.total_disbursed),    icon: TrendingUp, color: '#059669', bg: '#ECFDF5' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Platform Overview</h1>
        <p className="text-sm text-slate-500 mt-0.5">Live metrics across all PayOS client companies</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 font-medium">{s.label}</p>
                  <p className="text-2xl font-black text-slate-900 mt-1">{s.value}</p>
                </div>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: s.bg }}>
                  <Icon size={18} style={{ color: s.color }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent signups */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Recent Client Signups</h2>
          <a href="/super-admin/clients" className="text-xs font-medium hover:opacity-80 transition-opacity" style={{ color: '#E85C2F' }}>
            View all →
          </a>
        </div>
        <div className="divide-y divide-slate-50">
          {recentClients.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-sm">No clients yet</div>
          ) : recentClients.map((c) => (
            <div key={c.id} className="px-5 py-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: '#E85C2F' }}>
                {(c.company_name || c.email || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{c.company_name || '—'}</p>
                <p className="text-xs text-slate-500 truncate">{c.email}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs font-medium text-slate-700">{c.employee_count} emp · {c.payslip_count} slips</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {c.created_at ? new Date(c.created_at).toLocaleDateString('en-IN') : '—'}
                </p>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
              }`}>
                {c.status || 'active'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Onboarding completion */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
        <h2 className="text-sm font-bold text-slate-900 mb-4">Client Onboarding Status</h2>
        <div className="flex items-center gap-4">
          {(() => {
            const all       = clientsData?.clients || [];
            const completed = all.filter(c => c.onboarding_completed).length;
            const pending   = all.length - completed;
            const pct       = all.length ? Math.round((completed / all.length) * 100) : 0;
            return (
              <>
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                    <span>{completed} completed</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: '#E85C2F' }} />
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="flex items-center gap-1 text-[11px] text-green-600">
                      <CheckCircle2 size={11} /> {completed} completed
                    </span>
                    <span className="flex items-center gap-1 text-[11px] text-amber-600">
                      <AlertCircle size={11} /> {pending} pending
                    </span>
                  </div>
                </div>
                <div className="w-20 h-20 shrink-0 flex items-center justify-center rounded-full border-4 border-orange-100" style={{ borderTopColor: '#E85C2F' }}>
                  <span className="text-lg font-black" style={{ color: '#E85C2F' }}>{pct}%</span>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
