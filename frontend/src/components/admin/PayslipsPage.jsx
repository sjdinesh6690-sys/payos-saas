import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Download, Trash2, Mail, MoreHorizontal,
  FileText, ChevronUp, ChevronDown,
  Sparkles, AlertTriangle, AlertCircle, Info, X, Loader2,
  Pencil, Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SimpleDropdown, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import DataFilters from '@/components/filters/DataFilters';
import DeleteConfirmDialog from '@/components/dialogs/DeleteConfirmDialog';

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_FULL  = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// ── Severity config ──────────────────────────────────────────────────────────
const SEVERITY = {
  high:   { label: 'High',   icon: AlertTriangle, color: 'text-red-600',    bg: 'bg-red-50 border-red-200',    badge: 'bg-red-100 text-red-700 border-red-200' },
  medium: { label: 'Medium', icon: AlertCircle,   color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', badge: 'bg-orange-100 text-orange-700 border-orange-200' },
  low:    { label: 'Low',    icon: Info,           color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200',  badge: 'bg-blue-100 text-blue-700 border-blue-200' },
};

// ── Anomaly Panel ────────────────────────────────────────────────────────────
function AnomalyPanel({ result, onClose }) {
  if (!result) return null;
  const { anomalies = [], scanned, month, year, compared_to } = result;
  const high   = anomalies.filter(a => a.severity === 'high');
  const medium = anomalies.filter(a => a.severity === 'medium');
  const low    = anomalies.filter(a => a.severity === 'low');

  return (
    <Card className="border-2 border-purple-200 bg-purple-50/30">
      <CardContent className="pt-5 pb-5">
        {/* Panel header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-purple-600" />
            <div>
              <p className="text-sm font-semibold text-slate-900">
                AI Anomaly Scan — {MONTH_FULL[month]} {year}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Scanned {scanned} payslips · Compared vs {compared_to}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-purple-100 text-slate-400">
            <X size={16} />
          </button>
        </div>

        {/* Summary pills */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          {high.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
              <AlertTriangle size={11} /> {high.length} High Risk
            </span>
          )}
          {medium.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">
              <AlertCircle size={11} /> {medium.length} Medium
            </span>
          )}
          {low.length > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
              <Info size={11} /> {low.length} Low
            </span>
          )}
          {anomalies.length === 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
              ✅ All Clear — No anomalies found
            </span>
          )}
        </div>

        {/* Anomaly list */}
        {anomalies.length > 0 && (
          <div className="space-y-2">
            {[...high, ...medium, ...low].map((a, i) => {
              const s   = SEVERITY[a.severity] || SEVERITY.low;
              const Icon = s.icon;
              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${s.bg}`}>
                  <Icon size={15} className={`mt-0.5 flex-shrink-0 ${s.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-800">{a.employee_name}</span>
                      <span className="text-xs text-slate-400 font-mono">{a.employee_id}</span>
                      <Badge className={`text-[10px] px-1.5 py-0 border ${s.badge}`}>
                        {s.label}
                      </Badge>
                    </div>
                    <p className="text-xs font-medium text-slate-700 mt-0.5">{a.issue}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{a.detail}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Edit Payslip Modal ───────────────────────────────────────────────────────
function EditPayslipModal({ payslip, onClose, onSaved }) {
  const parseObj = (v) => {
    try { return typeof v === 'string' ? JSON.parse(v) : (v || {}); } catch { return {}; }
  };
  const toRows = (obj) =>
    Object.entries(parseObj(obj)).map(([label, amount]) => ({ label, amount: String(amount) }));

  const [earningRows,   setEarningRows]   = useState(() => toRows(payslip.earnings));
  const [deductionRows, setDeductionRows] = useState(() => toRows(payslip.deductions));
  const [saving, setSaving] = useState(false);

  const totalE = earningRows.reduce((s, r)   => s + (parseFloat(r.amount) || 0), 0);
  const totalD = deductionRows.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
  const net    = totalE - totalD;

  const updateRow  = (setter, idx, field, val) =>
    setter(prev => prev.map((r, i) => i === idx ? { ...r, [field]: val } : r));
  const addRow     = (setter) => setter(prev => [...prev, { label: '', amount: '' }]);
  const removeRow  = (setter, idx) => setter(prev => prev.filter((_, i) => i !== idx));

  const save = async () => {
    setSaving(true);
    try {
      const earnings   = {};
      earningRows.forEach(r => { if (r.label.trim()) earnings[r.label.trim()] = parseFloat(r.amount) || 0; });
      const deductions = {};
      deductionRows.forEach(r => { if (r.label.trim()) deductions[r.label.trim()] = parseFloat(r.amount) || 0; });
      await api.put(`/payslips/${payslip.id}`, { earnings, deductions });
      toast.success('Payslip updated');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const RowTable = ({ label, rows, setter, colorClass }) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className={`text-sm font-semibold ${colorClass}`}>{label}</p>
        <button type="button" onClick={() => addRow(setter)}
          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium">
          <Plus size={12} /> Add row
        </button>
      </div>
      <div className="space-y-1.5">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={r.label}
              onChange={e => updateRow(setter, i, 'label', e.target.value)}
              placeholder="Component name"
              className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
            <div className="relative w-32 shrink-0">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
              <input
                type="number"
                value={r.amount}
                onChange={e => updateRow(setter, i, 'amount', e.target.value)}
                className="w-full pl-6 pr-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 text-right"
                min={0}
              />
            </div>
            <button type="button" onClick={() => removeRow(setter, i)}
              className="p-1.5 text-slate-300 hover:text-red-400 transition-colors shrink-0">
              <X size={13} />
            </button>
          </div>
        ))}
        {rows.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-2">No entries — click Add row</p>
        )}
        {rows.length > 0 && (
          <div className="flex justify-end pt-1.5 border-t border-slate-100">
            <span className={`text-sm font-semibold ${colorClass}`}>
              {label === 'Earnings' ? fmt(totalE) : `−${fmt(totalD)}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <p className="font-bold text-slate-900">Edit Payslip</p>
            <p className="text-sm text-slate-500 mt-0.5">
              {payslip.employee_name} · {MONTH_FULL[payslip.month]} {payslip.year}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-5">
          <RowTable label="Earnings"   rows={earningRows}   setter={setEarningRows}   colorClass="text-green-700" />
          <RowTable label="Deductions" rows={deductionRows} setter={setDeductionRows} colorClass="text-red-600" />

          {/* Net salary */}
          <div className="rounded-xl bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Net Salary (Take Home)</p>
              <p className="text-xs text-slate-500 mt-0.5">{fmt(totalE)} − {fmt(totalD)}</p>
            </div>
            <p className="text-2xl font-bold text-green-400">{fmt(net)}</p>
          </div>

          <p className="text-xs text-slate-400 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
            💡 Changes update the PDF immediately. The employee will see the new amounts next time they download.
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 h-10 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50">
            Cancel
          </button>
          <button type="button" onClick={save} disabled={saving}
            className="flex-1 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold disabled:opacity-60">
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main PayslipsPage ────────────────────────────────────────────────────────
export default function PayslipsPage() {
  const qc = useQueryClient();

  const { data: payslips = [], isLoading } = useQuery({
    queryKey: ['payslips'],
    queryFn:  () => api.get('/payslips').then(r => r.data),
  });
  const { data: months = [] } = useQuery({
    queryKey: ['payslip-months'],
    queryFn:  () => api.get('/payslips/months').then(r => r.data),
  });

  // Selection
  const [selected, setSelected] = useState(new Set());

  // Filters
  const [search, setSearch]         = useState('');
  const [filterMonth, setFilterMonth] = useState('');

  // Sort
  const [sortKey, setSortKey] = useState('year');
  const [sortDir, setSortDir] = useState('desc');

  // Dialogs
  const [deleteOpen, setDeleteOpen]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);
  const [emailing, setEmailing]         = useState(false);

  // Edit payslip
  const [editTarget, setEditTarget]     = useState(null);

  // Anomaly detection
  const [scanLoading, setScanLoading]   = useState(false);
  const [scanResult, setScanResult]     = useState(null);
  const [scanMonthKey, setScanMonthKey] = useState(''); // 'YYYY-MM' or '' for latest

  const refetch = () => {
    qc.invalidateQueries({ queryKey: ['payslips'] });
    qc.invalidateQueries({ queryKey: ['payslip-months'] });
  };

  // Month filter options
  const monthOptions = useMemo(() =>
    months.map(m => {
      const [y, mo] = m.split('-');
      return { label: `${MONTH_NAMES[parseInt(mo)]} ${y}`, value: m };
    }), [months]);

  // Filtered + sorted
  const filtered = useMemo(() => {
    let list = [...payslips];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.employee_name?.toLowerCase().includes(q) ||
        p.employee_id?.toLowerCase().includes(q)
      );
    }

    if (filterMonth) {
      const [y, m] = filterMonth.split('-');
      list = list.filter(p => String(p.year) === y && String(p.month).padStart(2, '0') === m);
    }

    list.sort((a, b) => {
      let av = a[sortKey] ?? '', bv = b[sortKey] ?? '';
      if (sortKey === 'salary' || sortKey === 'year' || sortKey === 'month') {
        av = Number(av); bv = Number(bv);
      } else {
        av = String(av).toLowerCase(); bv = String(bv).toLowerCase();
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
    return list;
  }, [payslips, search, filterMonth, sortKey, sortDir]);

  // Selection
  const allSelected = filtered.length > 0 && filtered.every(p => selected.has(p.id));
  const toggleAll   = () => {
    if (allSelected) {
      setSelected(s => { const n = new Set(s); filtered.forEach(p => n.delete(p.id)); return n; });
    } else {
      setSelected(s => { const n = new Set(s); filtered.forEach(p => n.add(p.id)); return n; });
    }
  };
  const toggleOne = (id) => setSelected(s => {
    const n = new Set(s);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  const sort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };
  const SortIcon = ({ k }) => sortKey === k
    ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
    : null;

  const handleDownload = async (p) => {
    try {
      const res  = await api.get(`/payslips/${p.id}/download`, { responseType: 'blob' });
      const blob = res.data;
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `Payslip_${p.employee_id}_${p.year}-${String(p.month).padStart(2,'0')}.pdf`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`Payslip downloaded for ${p.employee_name}`);
    } catch {
      toast.error('Error downloading payslip');
    }
  };

  const promptDelete     = (p) => { setDeleteTarget(p); setDeleteOpen(true); };
  const promptBulkDelete = ()  => { setDeleteTarget(null); setDeleteOpen(true); };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      if (deleteTarget) {
        await api.delete(`/payslips/${deleteTarget.id}`);
        toast.success('Payslip deleted');
      } else {
        await api.post('/payslips/bulk-delete', { ids: [...selected] });
        toast.success(`${selected.size} payslips deleted`);
        setSelected(new Set());
      }
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Delete failed');
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  const handleBulkEmail = async () => {
    if (!selected.size) return;
    setEmailing(true);
    try {
      await api.post('/payslips/bulk-email', { ids: [...selected] });
      toast.success(`${selected.size} payslips marked as emailed`);
      setSelected(new Set());
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Email action failed');
    } finally {
      setEmailing(false);
    }
  };

  // ── Anomaly Scan ────────────────────────────────────────────────────────────
  // Unique months available in loaded payslips — derived directly, no separate query needed
  const availableMonths = useMemo(() => {
    const seen = new Map();
    payslips.forEach(p => {
      const key = `${p.year}-${String(p.month).padStart(2,'0')}`;
      if (!seen.has(key)) seen.set(key, { key, month: p.month, year: p.year });
    });
    return [...seen.values()].sort((a, b) => b.year - a.year || b.month - a.month);
  }, [payslips]);

  const handleAnomalyScan = async () => {
    let scanMonth, scanYear;

    if (scanMonthKey) {
      // User picked a specific month from the dropdown
      const [y, m] = scanMonthKey.split('-');
      scanMonth = parseInt(m);
      scanYear  = parseInt(y);
    } else if (availableMonths.length > 0) {
      // Default to the most recent month found in payslips data
      scanMonth = availableMonths[0].month;
      scanYear  = availableMonths[0].year;
    } else {
      toast.error('No payslips found. Generate payslips first.');
      return;
    }

    setScanLoading(true);
    setScanResult(null);

    try {
      const res  = await api.post('/ai/anomaly-scan', { month: scanMonth, year: scanYear });
      setScanResult(res.data);
      const count = res.data.anomalies?.length || 0;
      if (count === 0) {
        toast.success('Scan complete — No anomalies found! ✅');
      } else {
        const high = res.data.anomalies.filter(a => a.severity === 'high').length;
        if (high > 0) {
          toast.error(`Found ${count} issue(s) — ${high} high risk! Review below.`);
        } else {
          toast.warning(`Found ${count} issue(s) to review.`);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'AI scan failed. Try again.';
      toast.error(msg);
    } finally {
      setScanLoading(false);
    }
  };

  // Stats
  const totalSalary  = payslips.reduce((s, p) => s + (Number(p.net_salary || p.salary) || 0), 0);
  const uniqueMonths = new Set(payslips.map(p => `${p.year}-${p.month}`)).size;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payslips</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {payslips.length} total · {filtered.length} shown
            {selected.size > 0 && ` · ${selected.size} selected`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selected.size > 0 && (
            <>
              <Button variant="outline" className="h-9 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={handleBulkEmail} disabled={emailing}>
                <Mail size={14} className="mr-1.5" /> Mark Emailed ({selected.size})
              </Button>
              <Button variant="outline" className="h-9 border-red-200 text-red-600 hover:bg-red-50" onClick={promptBulkDelete}>
                <Trash2 size={14} className="mr-1.5" /> Delete ({selected.size})
              </Button>
            </>
          )}

          {/* AI Anomaly Scan — month picker + button */}
          <div className="flex items-center gap-1">
            <select
              value={scanMonthKey}
              onChange={e => setScanMonthKey(e.target.value)}
              disabled={scanLoading || payslips.length === 0}
              className="h-9 rounded-l-md border border-r-0 border-purple-300 bg-purple-50 px-2 text-xs text-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-400"
            >
              <option value="">Latest Month</option>
              {availableMonths.map(m => (
                <option key={m.key} value={m.key}>
                  {MONTH_FULL[m.month]} {m.year}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              className="h-9 text-purple-700 border-purple-300 hover:bg-purple-50 font-medium rounded-l-none"
              onClick={handleAnomalyScan}
              disabled={scanLoading || payslips.length === 0}
            >
              {scanLoading
                ? <><Loader2 size={14} className="mr-1.5 animate-spin" /> Scanning…</>
                : <><Sparkles size={14} className="mr-1.5" /> AI Scan</>
              }
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Payslips',    value: payslips.length },
          { label: 'Total Disbursed',   value: fmt(totalSalary) },
          { label: 'Months Processed',  value: uniqueMonths },
          { label: 'Avg Salary',        value: payslips.length ? fmt(totalSalary / payslips.length) : '—' },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="text-xl font-bold mt-1 text-slate-800">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Anomaly Results Panel */}
      {scanResult && (
        <AnomalyPanel result={scanResult} onClose={() => setScanResult(null)} />
      )}

      {/* Filters */}
      <DataFilters
        search={search}
        onSearch={setSearch}
        filters={[{ key: 'month', label: 'All Months', options: monthOptions }]}
        values={{ month: filterMonth }}
        onChange={(k, v) => k === 'month' && setFilterMonth(v)}
      />

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 w-10">
                  <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                </th>
                {[
                  { key: 'employee_id',   label: 'Emp ID' },
                  { key: 'employee_name', label: 'Name' },
                  { key: 'month',         label: 'Period' },
                  { key: 'salary',        label: 'Salary' },
                  { key: 'emailed',       label: 'Status' },
                ].map(col => (
                  <th
                    key={col.key}
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-600 cursor-pointer select-none whitespace-nowrap"
                    onClick={() => sort(col.key)}
                  >
                    <span className="flex items-center gap-1">
                      {col.label} <SortIcon k={col.key} />
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-10 text-slate-400">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <FileText size={32} className="mx-auto text-slate-200 mb-2" />
                    <p className="text-slate-400 text-sm">No payslips found</p>
                  </td>
                </tr>
              ) : filtered.map(p => (
                <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${selected.has(p.id) ? 'bg-blue-50' : ''}`}>
                  <td className="px-4 py-3">
                    <Checkbox checked={selected.has(p.id)} onCheckedChange={() => toggleOne(p.id)} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{p.employee_id}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{p.employee_name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {MONTH_NAMES[p.month]} {p.year}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{fmt(p.net_salary || p.salary)}</td>
                  <td className="px-4 py-3">
                    {p.emailed
                      ? <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Sent</Badge>
                      : <Badge className="bg-slate-100 text-slate-600 border-slate-200 text-xs">Pending</Badge>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <SimpleDropdown
                      align="end"
                      trigger={
                        <button type="button" className="p-1 rounded hover:bg-slate-100 text-slate-400">
                          <MoreHorizontal size={16} />
                        </button>
                      }
                    >
                      <DropdownMenuItem onClick={() => handleDownload(p)}>
                        <Download size={14} /> Download PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setEditTarget(p)}>
                        <Pencil size={14} /> Edit Payslip
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600" onClick={() => promptDelete(p)}>
                        <Trash2 size={14} /> Delete
                      </DropdownMenuItem>
                    </SimpleDropdown>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={deleteTarget ? 'Delete Payslip?' : `Delete ${selected.size} payslips?`}
        description={
          deleteTarget
            ? `Delete payslip for ${deleteTarget.employee_name} (${MONTH_NAMES[deleteTarget.month]} ${deleteTarget.year})?`
            : `Permanently delete ${selected.size} payslips?`
        }
        onConfirm={handleDelete}
        loading={deleting}
      />

      {editTarget && (
        <EditPayslipModal
          payslip={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => qc.invalidateQueries({ queryKey: ['payslips'] })}
        />
      )}
    </div>
  );
}
