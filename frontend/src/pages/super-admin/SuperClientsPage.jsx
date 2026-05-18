import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search, CheckCircle2, XCircle, AlertCircle,
  ToggleLeft, ToggleRight, Clock, Plus, Zap, TimerOff,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

const superApi = {
  get: (path)       => api.get(path,      { headers: { Authorization: `Bearer ${localStorage.getItem('payos_super_token')}` } }),
  put: (path, body) => api.put(path, body, { headers: { Authorization: `Bearer ${localStorage.getItem('payos_super_token')}` } }),
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const PLANS = ['starter', 'professional', 'enterprise'];

// Trial badge shown in client list
function TrialBadge({ client }) {
  const days = client.trial_days_remaining ?? null;
  const active = client.trial_active;

  if (days === null) return <span className="text-[10px] text-slate-400">—</span>;
  if (!active)
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-600">Expired</span>;
  if (days <= 3)
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">{days}d left</span>;
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">{days}d left</span>;
}

export default function SuperClientsPage() {
  const qc = useQueryClient();
  const [search, setSearch]       = useState('');
  const [selected, setSelected]   = useState(null);
  const [extendDays, setExtendDays] = useState('30');
  const [trialLoading, setTrialLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['super-clients'],
    queryFn: () => superApi.get('/super-admin/clients').then(r => r.data),
  });

  const clients = useMemo(() => {
    const all = data?.clients || [];
    if (!search) return all;
    const q = search.toLowerCase();
    return all.filter(c =>
      (c.company_name || '').toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q)
    );
  }, [data, search]);

  const toggleStatus = async (client) => {
    const newStatus = client.status === 'active' ? 'suspended' : 'active';
    try {
      await superApi.put(`/super-admin/clients/${client.id}/status`, { status: newStatus });
      toast.success(`Client ${newStatus === 'active' ? 'activated' : 'suspended'}`);
      qc.invalidateQueries({ queryKey: ['super-clients'] });
      if (selected?.id === client.id) setSelected(c => ({ ...c, status: newStatus }));
    } catch { toast.error('Could not update client status'); }
  };

  const changePlan = async (client, plan) => {
    try {
      await superApi.put(`/super-admin/clients/${client.id}/status`, { plan });
      toast.success(`Plan updated to ${plan}`);
      qc.invalidateQueries({ queryKey: ['super-clients'] });
      if (selected?.id === client.id) setSelected(c => ({ ...c, plan }));
    } catch { toast.error('Could not update plan'); }
  };

  const updateTrial = async (client, action, days) => {
    setTrialLoading(true);
    try {
      await superApi.put(`/super-admin/clients/${client.id}/trial`, { action, days: parseInt(days) || 30 });
      const labels = { extend: `Trial extended by ${days} days`, activate: `Trial activated (${days} days)`, expire: 'Trial expired immediately' };
      toast.success(labels[action] || 'Trial updated');
      await qc.invalidateQueries({ queryKey: ['super-clients'] });
      // Update selected with fresh data
      const fresh = await superApi.get('/super-admin/clients').then(r => r.data);
      const updated = (fresh.clients || []).find(c => c.id === client.id);
      if (updated) setSelected(updated);
    } catch { toast.error('Could not update trial'); }
    finally { setTrialLoading(false); }
  };

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* ── Client list ─────────────────────────────────────────────── */}
      <div className={`flex flex-col ${selected ? 'w-1/2' : 'flex-1'} bg-white border-r border-slate-100 transition-all`}>
        <div className="px-5 py-4 border-b border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold text-slate-900">All Clients</h1>
              <p className="text-xs text-slate-500">{clients.length} companies registered</p>
            </div>
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by company or email…"
              className="w-full h-9 pl-9 pr-3 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:bg-white" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400 text-sm">Loading clients…</div>
          ) : clients.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">No clients found</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                <tr>
                  {['Company', 'Plan', 'Trial', 'Employees', 'Onboarding', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {clients.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => setSelected(c)}
                    className={`cursor-pointer hover:bg-slate-50 transition-colors ${selected?.id === c.id ? 'bg-orange-50' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ background: '#E85C2F' }}>
                          {(c.company_name || c.email || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-xs truncate max-w-[110px]">{c.company_name || '—'}</p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[110px]">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.plan === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                        c.plan === 'professional' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-600'
                      }`}>{c.plan || 'starter'}</span>
                    </td>
                    <td className="px-4 py-3"><TrialBadge client={c} /></td>
                    <td className="px-4 py-3 text-slate-700 font-medium text-xs">{c.employee_count}</td>
                    <td className="px-4 py-3">
                      {c.onboarding_completed
                        ? <span className="flex items-center gap-1 text-[10px] text-green-600"><CheckCircle2 size={11} /> Done</span>
                        : <span className="flex items-center gap-1 text-[10px] text-amber-600"><AlertCircle size={11} /> Pending</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                      }`}>{c.status || 'active'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={e => { e.stopPropagation(); toggleStatus(c); }}
                        className="p-1 rounded-lg hover:bg-slate-100 transition-colors"
                        title={c.status === 'active' ? 'Suspend' : 'Activate'}
                      >
                        {c.status === 'active'
                          ? <ToggleRight size={18} className="text-green-500" />
                          : <ToggleLeft  size={18} className="text-slate-300" />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Detail drawer ────────────────────────────────────────────── */}
      {selected && (
        <div className="w-1/2 bg-white flex flex-col overflow-y-auto">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
            <h2 className="text-sm font-bold text-slate-900">Client Detail</h2>
            <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600 text-lg leading-none">×</button>
          </div>

          <div className="p-6 space-y-6">
            {/* Avatar + name */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-xl font-black" style={{ background: '#E85C2F' }}>
                {(selected.company_name || selected.email || '?')[0].toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selected.company_name || '—'}</h3>
                <p className="text-sm text-slate-500">{selected.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    selected.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                  }`}>{selected.status || 'active'}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    selected.plan === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                    selected.plan === 'professional' ? 'bg-blue-100 text-blue-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>{selected.plan || 'starter'}</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Employees', value: selected.employee_count },
                { label: 'Payslips',  value: selected.payslip_count },
                { label: 'Industry',  value: selected.company_industry || '—' },
              ].map((s, i) => (
                <div key={i} className="rounded-xl p-3 bg-slate-50 border border-slate-100 text-center">
                  <p className="text-xl font-black text-slate-900">{s.value}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* ── Trial Status Card ──────────────────────────────────── */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
                <Clock size={14} className="text-slate-500" />
                <h4 className="text-xs font-bold text-slate-700">Free Trial</h4>
              </div>
              <div className="p-4">
                {/* Trial status row */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {selected.trial_active
                        ? `${selected.trial_days_remaining} days remaining`
                        : 'Trial expired'}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {selected.trial_end_date
                        ? `Ends ${fmtDate(selected.trial_end_date)}`
                        : 'No trial date set'}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    selected.trial_active
                      ? selected.trial_days_remaining <= 3
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {selected.trial_active ? 'Active' : 'Expired'}
                  </span>
                </div>

                {/* Progress bar */}
                {selected.trial_active && (
                  <div className="mb-4">
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (selected.trial_days_remaining / (selected.trial_days || 30)) * 100)}%`,
                          background: selected.trial_days_remaining <= 3 ? '#F59E0B' : '#E85C2F',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Extend trial */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-slate-600">Extend trial by</label>
                  <div className="flex gap-2">
                    <div className="flex gap-1.5">
                      {['7', '14', '30', '60'].map(d => (
                        <button key={d}
                          onClick={() => setExtendDays(d)}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            extendDays === d
                              ? 'border-orange-500 text-orange-600 bg-orange-50'
                              : 'border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}>
                          {d}d
                        </button>
                      ))}
                    </div>
                    <button
                      disabled={trialLoading}
                      onClick={() => updateTrial(selected, 'extend', extendDays)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={{ background: '#E85C2F' }}
                    >
                      <Plus size={12} /> Extend
                    </button>
                  </div>

                  {/* Activate fresh trial */}
                  <button
                    disabled={trialLoading}
                    onClick={() => updateTrial(selected, 'activate', 30)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border-2 border-green-200 text-green-700 hover:bg-green-50 transition-all disabled:opacity-50"
                  >
                    <Zap size={13} /> Give Fresh 30-Day Trial
                  </button>

                  {/* Force expire */}
                  <button
                    disabled={trialLoading}
                    onClick={() => {
                      if (window.confirm('Force-expire this client\'s trial immediately?')) {
                        updateTrial(selected, 'expire');
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold border-2 border-red-200 text-red-600 hover:bg-red-50 transition-all disabled:opacity-50"
                  >
                    <TimerOff size={13} /> Force Expire Now
                  </button>
                </div>
              </div>
            </div>

            {/* Company info */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Company Info</h4>
              {[
                { label: 'Company Size', value: selected.company_size || '—' },
                { label: 'Registered',   value: fmtDate(selected.created_at) },
                { label: 'Last Active',  value: fmtDate(selected.last_active) },
                { label: 'Onboarding',   value: selected.onboarding_completed ? '✅ Completed' : '⏳ Pending' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-2 border-b border-slate-50">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className="text-xs font-semibold text-slate-800">{value}</span>
                </div>
              ))}
            </div>

            {/* Plan + status actions */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Account Actions</h4>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Change Plan</label>
                <div className="flex gap-2">
                  {PLANS.map(p => (
                    <button key={p} onClick={() => changePlan(selected, p)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border-2 transition-all capitalize ${
                        (selected.plan || 'starter') === p
                          ? 'border-orange-500 text-orange-600 bg-orange-50'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}>
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => toggleStatus(selected)}
                className={`w-full py-2.5 rounded-xl text-sm font-bold border-2 transition-all flex items-center justify-center gap-2 ${
                  selected.status === 'active'
                    ? 'border-red-200 text-red-600 hover:bg-red-50'
                    : 'border-green-200 text-green-600 hover:bg-green-50'
                }`}>
                {selected.status === 'active'
                  ? <><XCircle size={15} /> Suspend Client</>
                  : <><CheckCircle2 size={15} /> Activate Client</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
