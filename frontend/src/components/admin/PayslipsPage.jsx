import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Download, Trash2, Mail, MoreHorizontal,
  FileText, ChevronUp, ChevronDown,
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

export default function PayslipsPage() {
  const qc = useQueryClient();

  const { data: payslips = [], isLoading } = useQuery({
    queryKey: ['payslips'],
    queryFn: () => api.get('/payslips').then(r => r.data),
  });
  const { data: months = [] } = useQuery({
    queryKey: ['payslip-months'],
    queryFn: () => api.get('/payslips/months').then(r => r.data),
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
      // Use shared api axios instance — handles auth token automatically
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

  const promptDelete     = (p)  => { setDeleteTarget(p); setDeleteOpen(true); };
  const promptBulkDelete = ()   => { setDeleteTarget(null); setDeleteOpen(true); };

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

  // Stats
  // Use net_salary for "Total Disbursed" — this is actual money paid out, not gross
  const totalSalary = payslips.reduce((s, p) => s + (Number(p.net_salary || p.salary) || 0), 0);
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
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Payslips', value: payslips.length },
          { label: 'Total Disbursed', value: fmt(totalSalary) },
          { label: 'Months Processed', value: uniqueMonths },
          { label: 'Avg Salary', value: payslips.length ? fmt(totalSalary / payslips.length) : '—' },
        ].map((s, i) => (
          <Card key={i}>
            <CardContent className="pt-4 pb-4">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="text-xl font-bold mt-1 text-slate-800">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

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
    </div>
  );
}
