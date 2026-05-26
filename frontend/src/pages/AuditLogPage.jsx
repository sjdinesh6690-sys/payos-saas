import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, Search, Filter, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import api from '@/lib/api';

const ACTION_COLORS = {
  payslip_generated:    'bg-green-100 text-green-700 border-green-200',
  payslip_deleted:      'bg-red-100 text-red-700 border-red-200',
  payslip_edited:       'bg-yellow-100 text-yellow-700 border-yellow-200',
  payroll_locked:       'bg-indigo-100 text-indigo-700 border-indigo-200',
  payroll_unlocked:     'bg-orange-100 text-orange-700 border-orange-200',
  employee_created:     'bg-blue-100 text-blue-700 border-blue-200',
  employee_updated:     'bg-blue-100 text-blue-700 border-blue-200',
  employee_deleted:     'bg-red-100 text-red-700 border-red-200',
  salary_revised:       'bg-purple-100 text-purple-700 border-purple-200',
  salary_revision_added:'bg-purple-100 text-purple-700 border-purple-200',
  email_sent:           'bg-teal-100 text-teal-700 border-teal-200',
  login:                'bg-slate-100 text-slate-700 border-slate-200',
  logout:               'bg-slate-100 text-slate-600 border-slate-200',
};

const actionLabel = (action) =>
  action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const formatDate = (ts) => {
  if (!ts) return '—';
  const d = new Date(ts);
  return d.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
};

const PAGE_SIZE = 30;

export default function AuditLogPage() {
  const [search, setSearch]         = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [page, setPage]             = useState(0);

  // Fetch action types for filter dropdown
  const { data: actions = [] } = useQuery({
    queryKey: ['audit-actions'],
    queryFn:  () => api.get('/audit/actions').then(r => r.data),
    staleTime: 60_000,
  });

  // Fetch paginated logs
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', filterAction, page],
    queryFn:  () => api.get('/audit', {
      params: {
        action: filterAction || undefined,
        limit:  PAGE_SIZE,
        offset: page * PAGE_SIZE,
      },
    }).then(r => r.data),
    keepPreviousData: true,
    staleTime: 10_000,
  });

  const logs  = data?.logs  || [];
  const total = data?.total || 0;

  // Client-side search (on top of server pagination)
  const filtered = useMemo(() => {
    if (!search.trim()) return logs;
    const q = search.toLowerCase();
    return logs.filter(l =>
      l.action?.toLowerCase().includes(q) ||
      l.entity?.toLowerCase().includes(q) ||
      JSON.stringify(l.new_values || {}).toLowerCase().includes(q)
    );
  }, [logs, search]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Shield size={22} className="text-indigo-600" />
            Audit Log
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Complete record of all admin actions — {total.toLocaleString()} entries
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search actions, entities…"
            className="w-full pl-9 pr-4 h-9 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>

        {/* Action filter */}
        <div className="flex items-center gap-1.5">
          <Filter size={14} className="text-slate-400" />
          <select
            value={filterAction}
            onChange={e => { setFilterAction(e.target.value); setPage(0); }}
            className="h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          >
            <option value="">All Actions</option>
            {actions.map(a => (
              <option key={a} value={a}>{actionLabel(a)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 whitespace-nowrap">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 whitespace-nowrap">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 whitespace-nowrap">Entity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Details</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 whitespace-nowrap">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16">
                    <Clock size={32} className="mx-auto text-slate-200 mb-2" />
                    <p className="text-slate-400 text-sm">No audit entries found</p>
                  </td>
                </tr>
              ) : filtered.map(log => {
                const colorClass = ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-600 border-slate-200';
                const details = log.new_values || log.old_values;
                let detailStr = '';
                if (details) {
                  try {
                    const obj = typeof details === 'string' ? JSON.parse(details) : details;
                    detailStr = Object.entries(obj)
                      .slice(0, 4)
                      .map(([k, v]) => `${k}: ${typeof v === 'object' ? '…' : v}`)
                      .join(' · ');
                  } catch {}
                }

                return (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap font-mono">
                      {formatDate(log.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${colorClass}`}>
                        {actionLabel(log.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 font-mono">{log.entity || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-xs truncate" title={detailStr}>
                      {detailStr || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400 font-mono">{log.ip_address || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-500">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-medium text-slate-600 px-2">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed text-slate-600"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
