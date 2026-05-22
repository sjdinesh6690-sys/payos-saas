import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import {
  Plus, Trash2, Pencil, Upload, MoreHorizontal,
  Users, Download, ChevronUp, ChevronDown, UserX, UserCheck, FileText, FileSpreadsheet, MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SimpleDropdown, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import DataFilters from '@/components/filters/DataFilters';
import EmployeeEditDialog from '@/components/dialogs/EmployeeEditDialog';
import DeleteConfirmDialog from '@/components/dialogs/DeleteConfirmDialog';
import FileUploadDialog from '@/components/upload/FileUploadDialog';

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ── Exit dialog ─────────────────────────────────────────────────────────── */
function ExitDialog({ emp, onClose, onConfirm }) {
  const [exitDate, setExitDate]     = useState(new Date().toISOString().slice(0,10));
  const [exitReason, setExitReason] = useState('');
  const [saving, setSaving]         = useState(false);
  if (!emp) return null;
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:'#fff', borderRadius:16, padding:28, width:420, boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ fontSize:17, fontWeight:700, color:'#0F172A', marginBottom:4 }}>Mark as Left Organisation</div>
        <div style={{ fontSize:13, color:'#64748B', marginBottom:20 }}>
          <strong>{emp.employee_name}</strong> will be marked as inactive. All their payslip history stays in the system.
        </div>
        <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:6 }}>Last Working Day</label>
        <input type="date" value={exitDate} onChange={e => setExitDate(e.target.value)}
          style={{ width:'100%', border:'1px solid #E2E8F0', borderRadius:8, padding:'9px 12px', fontSize:13, marginBottom:14, boxSizing:'border-box' }} />
        <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:6 }}>Reason (optional)</label>
        <select value={exitReason} onChange={e => setExitReason(e.target.value)}
          style={{ width:'100%', border:'1px solid #E2E8F0', borderRadius:8, padding:'9px 12px', fontSize:13, marginBottom:20, boxSizing:'border-box', background:'#fff' }}>
          <option value="">Select reason…</option>
          <option>Resigned</option>
          <option>Terminated</option>
          <option>Contract ended</option>
          <option>Retired</option>
          <option>Other</option>
        </select>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ background:'none', border:'1px solid #E2E8F0', borderRadius:8, padding:'9px 18px', fontSize:13, cursor:'pointer', color:'#64748B' }}>Cancel</button>
          <button
            disabled={saving}
            onClick={async () => { setSaving(true); await onConfirm(exitDate, exitReason); setSaving(false); }}
            style={{ background:'#DC2626', color:'#fff', border:'none', borderRadius:8, padding:'9px 20px', fontSize:13, fontWeight:700, cursor:'pointer' }}>
            {saving ? 'Saving…' : 'Confirm Exit'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('active'); // 'active' | 'inactive' | 'all'

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees', statusFilter],
    queryFn: () => api.get(`/employees${statusFilter !== 'all' ? `?status=${statusFilter}` : ''}`).then(r => r.data),
  });

  // Selection
  const [selected, setSelected] = useState(new Set());

  // Filters
  const [search, setSearch]         = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterLoc,  setFilterLoc]  = useState('');

  // Sort
  const [sortKey, setSortKey] = useState('employee_name');
  const [sortDir, setSortDir] = useState('asc');

  // Dialogs
  const [editOpen, setEditOpen]         = useState(false);
  const [editEmp, setEditEmp]           = useState(null);
  const [deleteOpen, setDeleteOpen]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);
  const [uploadOpen, setUploadOpen]     = useState(false);
  const [exitDialogEmp, setExitDialogEmp] = useState(null);

  const refetch = () => qc.invalidateQueries({ queryKey: ['employees', statusFilter] });

  /* ── Exit / Reactivate handlers ─────────────────────────────────────────── */
  const handleMarkLeft = async (exitDate, exitReason) => {
    try {
      await api.put(`/employees/${exitDialogEmp.id}/deactivate`, { date_of_exit: exitDate, exit_reason: exitReason });
      toast.success(`${exitDialogEmp.employee_name} marked as left. All payslip history preserved.`);
      setExitDialogEmp(null);
      refetch();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to update'); }
  };

  const handleReactivate = async (emp) => {
    try {
      await api.put(`/employees/${emp.id}/reactivate`);
      toast.success(`${emp.employee_name} reactivated successfully.`);
      refetch();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to reactivate'); }
  };

  // Derived filter options
  const departments = useMemo(() => {
    const set = new Set(employees.map(e => e.department).filter(Boolean));
    return [...set].sort().map(d => ({ label: d, value: d }));
  }, [employees]);

  const locations = useMemo(() => {
    const set = new Set(employees.map(e => e.location).filter(Boolean));
    return [...set].sort().map(l => ({ label: l, value: l }));
  }, [employees]);

  // Filtered + sorted list
  const filtered = useMemo(() => {
    let list = [...employees];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.employee_name?.toLowerCase().includes(q) ||
        e.employee_id?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q) ||
        e.department?.toLowerCase().includes(q) ||
        e.designation?.toLowerCase().includes(q) ||
        e.location?.toLowerCase().includes(q)
      );
    }
    if (filterDept) list = list.filter(e => e.department === filterDept);
    if (filterLoc)  list = list.filter(e => e.location  === filterLoc);

    list.sort((a, b) => {
      let av = a[sortKey] ?? '', bv = b[sortKey] ?? '';
      if (sortKey === 'salary') { av = Number(av); bv = Number(bv); }
      else { av = String(av).toLowerCase(); bv = String(bv).toLowerCase(); }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
    return list;
  }, [employees, search, filterDept, filterLoc, sortKey, sortDir]);

  // Selection helpers
  const allSelected  = filtered.length > 0 && filtered.every(e => selected.has(e.id));
  const toggleAll    = () => {
    if (allSelected) {
      setSelected(s => { const n = new Set(s); filtered.forEach(e => n.delete(e.id)); return n; });
    } else {
      setSelected(s => { const n = new Set(s); filtered.forEach(e => n.add(e.id)); return n; });
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

  const promptDelete     = (emp) => { setDeleteTarget(emp); setDeleteOpen(true); };
  const promptBulkDelete = ()    => { setDeleteTarget(null); setDeleteOpen(true); };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      if (deleteTarget) {
        await api.delete(`/employees/${deleteTarget.id}`);
        toast.success('Employee deleted');
      } else {
        await api.post('/employees/bulk-delete', { ids: [...selected] });
        toast.success(`${selected.size} employees deleted`);
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

  const openAdd  = () => { setEditEmp(null); setEditOpen(true); };
  const openEdit = (emp) => { setEditEmp(emp); setEditOpen(true); };

  const exportExcel = () => {
    // Build rows with full salary breakdown
    const rows = employees.map((e, idx) => ({
      '#': idx + 1,
      'Employee ID':       e.employee_id || '',
      'Employee Name':     e.employee_name || '',
      'Email':             e.email || '',
      'Phone':             e.phone || '',
      'Department':        e.department || '',
      'Designation':       e.designation || '',
      'Location':          e.location || '',
      'Date of Joining':   e.date_of_joining || '',
      'Status':            e.status === 'inactive' ? 'Left / Inactive' : 'Active',
      'Date of Exit':      e.date_of_exit || '',
      'Exit Reason':       e.exit_reason || '',
      // Salary fields
      'Monthly Gross (₹)':        Number(e.salary || 0),
      'Yearly CTC (₹)':           Number(e.yearly_ctc || 0),
      'Monthly Net / Take-Home (₹)': Number(e.net_salary_monthly || 0),
      // Statutory
      'PAN Number':        e.pan_number || '',
      'UAN Number':        e.uan_number || '',
      // Bank
      'Bank Name':         e.bank_name || '',
      'Bank Account No.':  e.bank_account_number || '',
      'IFSC Code':         e.ifsc_code || '',
      // Last payslip
      'Last Payslip Month': e.last_payslip_month ? `${['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][e.last_payslip_month]} ${e.last_payslip_year}` : '',
      'Last Net Salary (₹)': Number(e.last_net_salary || 0),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // Column widths
    const colWidths = [
      { wch: 4 }, { wch: 12 }, { wch: 24 }, { wch: 28 }, { wch: 14 },
      { wch: 18 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 },
      { wch: 18 }, { wch: 16 }, { wch: 22 },
      { wch: 14 }, { wch: 14 },
      { wch: 16 }, { wch: 20 }, { wch: 12 },
      { wch: 16 }, { wch: 18 },
    ];
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');

    // Info sheet
    const info = XLSX.utils.aoa_to_sheet([
      ['Field', 'Description'],
      ['Monthly Gross', 'CTC Gross salary per month (before deductions). Used to calculate PF, ESI, etc.'],
      ['Yearly CTC', 'Total annual Cost to Company = Gross × 12 + employer contributions'],
      ['Monthly Net / Take-Home', 'Actual salary credited to bank after all deductions'],
      ['PAN Number', 'Required for TDS deduction under Income Tax'],
      ['UAN Number', 'Required for EPF/PF filing on EPFO portal'],
      ['Bank Account No.', 'Used for salary bank transfer advice'],
      ['IFSC Code', 'Bank IFSC code for NEFT transfer'],
      ['Generated by', 'PayLeef · Payroll Software for India'],
      ['Generated on', new Date().toLocaleString('en-IN')],
    ]);
    info['!cols'] = [{ wch: 24 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, info, 'Field Guide');

    XLSX.writeFile(wb, `Employees_Master_${new Date().toISOString().slice(0,10)}.xlsx`);
    toast.success(`${employees.length} employees exported to Excel`);
  };

  return (
    <div className="p-6 space-y-6">
      <ExitDialog emp={exitDialogEmp} onClose={() => setExitDialogEmp(null)} onConfirm={handleMarkLeft} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: '#1A7A4A' }}>STEP 1 OF 4</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">① Add Employees</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {employees.length} {statusFilter === 'inactive' ? 'former' : statusFilter === 'active' ? 'active' : 'total'} · {filtered.length} shown
            {selected.size > 0 && ` · ${selected.size} selected`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selected.size > 0 && (
            <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 h-9" onClick={promptBulkDelete}>
              <Trash2 size={14} className="mr-1.5" /> Delete ({selected.size})
            </Button>
          )}
          <Button variant="outline" className="h-9 border-green-300 text-green-700 hover:bg-green-50" onClick={exportExcel}>
            <FileSpreadsheet size={14} className="mr-1.5" /> Export Excel
          </Button>
          <Button className="h-9 bg-orange-600 hover:bg-orange-700 text-white" onClick={openAdd}>
            <Plus size={14} className="mr-1.5" /> Add Employee
          </Button>
        </div>
      </div>

      {/* Status tabs */}
      <div style={{ display:'flex', gap:6, background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:10, padding:4, width:'fit-content' }}>
        {[
          { key:'active',   label:'Active',       color:'#15803D', bg:'#1A7A4A' },
          { key:'inactive', label:'Left / Exited', color:'#DC2626', bg:'#DC2626' },
          { key:'all',      label:'All Employees', color:'#475569', bg:'#475569' },
        ].map(t => (
          <button key={t.key} onClick={() => { setStatusFilter(t.key); setSelected(new Set()); }}
            style={{ padding:'7px 16px', borderRadius:8, border:'none', cursor:'pointer', fontSize:13, fontWeight: statusFilter===t.key ? 700 : 500,
              background: statusFilter===t.key ? t.bg : 'transparent',
              color: statusFilter===t.key ? '#fff' : '#64748B', transition:'all .15s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Employees shown',  value: employees.length },
          { label: 'Total Payroll',    value: fmt(employees.reduce((s, e) => s + (Number(e.salary) || 0), 0)) },
          { label: 'Departments',      value: departments.length },
          { label: 'Avg Salary',       value: employees.length ? fmt(employees.reduce((s, e) => s + (Number(e.salary) || 0), 0) / employees.length) : '—' },
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
        filters={[
          { key: 'dept', label: 'All Departments', options: departments },
          { key: 'loc',  label: 'All Locations',   options: locations  },
        ]}
        values={{ dept: filterDept, loc: filterLoc }}
        onChange={(k, v) => {
          if (k === 'dept') setFilterDept(v);
          if (k === 'loc')  setFilterLoc(v);
        }}
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
                  { key: 'employee_id',   label: 'ID' },
                  { key: 'employee_name', label: 'Name' },
                  { key: 'department',    label: 'Dept / Role' },
                  { key: 'location',      label: 'Location' },
                  { key: 'email',         label: 'Email' },
                  { key: 'salary',        label: 'Salary' },
                  { key: 'last_payslip',  label: 'Last Payslip' },
                  { key: 'status',        label: 'Status' },
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
                <tr><td colSpan={10} className="text-center py-10 text-slate-400">Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-16">
                    <Users size={32} className="mx-auto text-slate-200 mb-2" />
                    <p className="text-slate-400 text-sm">No employees found</p>
                    <Button className="mt-3 h-8 text-xs bg-orange-600 hover:bg-orange-700 text-white" onClick={openAdd}>
                      <Plus size={12} className="mr-1" /> Add First Employee
                    </Button>
                  </td>
                </tr>
              ) : filtered.map(emp => {
                const isInactive = emp.status === 'inactive';
                const lastPayslipLabel = emp.last_payslip_month
                  ? `${MONTHS[emp.last_payslip_month - 1]} ${emp.last_payslip_year}`
                  : null;
                return (
                <tr key={emp.id} className={`hover:bg-slate-50 transition-colors ${selected.has(emp.id) ? 'bg-orange-50' : ''} ${isInactive ? 'opacity-70' : ''}`}>
                  <td className="px-4 py-3">
                    <Checkbox checked={selected.has(emp.id)} onCheckedChange={() => toggleOne(emp.id)} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{emp.employee_id}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{emp.employee_name}</div>
                    {emp.phone && <div className="text-xs text-slate-400">{emp.phone}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {emp.department && (
                      <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-xs">{emp.department}</Badge>
                    )}
                    {emp.designation && <div className="text-xs text-slate-500 mt-0.5">{emp.designation}</div>}
                  </td>
                  <td className="px-4 py-3">
                    {emp.location
                      ? <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:12, color:'#374151', background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:20, padding:'2px 9px', fontWeight:600 }}>
                          <MapPin size={10} color="#16a34a" />{emp.location}
                        </span>
                      : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{emp.email || <span className="text-slate-300">—</span>}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800 text-sm">{fmt(emp.salary)}<span className="text-xs text-slate-400 font-normal">/mo</span></div>
                    {emp.yearly_ctc > 0 && <div className="text-xs text-slate-500">CTC: {fmt(emp.yearly_ctc)}/yr</div>}
                    {emp.net_salary_monthly > 0 && <div className="text-xs text-green-700">Net: {fmt(emp.net_salary_monthly)}/mo</div>}
                  </td>
                  <td className="px-4 py-3">
                    {lastPayslipLabel ? (
                      <div>
                        <div className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                          <FileText size={11} className="text-green-600" /> {lastPayslipLabel}
                        </div>
                        <div className="text-xs text-slate-400">{fmt(emp.last_net_salary)}</div>
                      </div>
                    ) : <span className="text-xs text-slate-300">No payslips yet</span>}
                  </td>
                  <td className="px-4 py-3">
                    {isInactive ? (
                      <div>
                        <span style={{ fontSize:10, fontWeight:700, background:'#FEE2E2', color:'#991B1B', padding:'2px 8px', borderRadius:20 }}>LEFT</span>
                        {emp.date_of_exit && <div className="text-xs text-slate-400 mt-0.5">Exit: {emp.date_of_exit}</div>}
                        {emp.exit_reason  && <div className="text-xs text-slate-400">{emp.exit_reason}</div>}
                      </div>
                    ) : (
                      <span style={{ fontSize:10, fontWeight:700, background:'#DCFCE7', color:'#166534', padding:'2px 8px', borderRadius:20 }}>ACTIVE</span>
                    )}
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
                      {!isInactive && (
                        <DropdownMenuItem onClick={() => openEdit(emp)}>
                          <Pencil size={14} /> Edit
                        </DropdownMenuItem>
                      )}
                      {!isInactive && (
                        <DropdownMenuItem className="text-orange-600" onClick={() => setExitDialogEmp(emp)}>
                          <UserX size={14} /> Mark as Left
                        </DropdownMenuItem>
                      )}
                      {isInactive && (
                        <DropdownMenuItem className="text-green-600" onClick={() => handleReactivate(emp)}>
                          <UserCheck size={14} /> Reactivate
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600" onClick={() => promptDelete(emp)}>
                        <Trash2 size={14} /> Delete Permanently
                      </DropdownMenuItem>
                    </SimpleDropdown>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Dialogs */}
      <EmployeeEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        employee={editEmp}
        onSaved={refetch}
      />
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={deleteTarget ? `Delete ${deleteTarget.employee_name}?` : `Delete ${selected.size} employees?`}
        description={
          deleteTarget
            ? `This will permanently delete ${deleteTarget.employee_name} and all their data.`
            : `This will permanently delete ${selected.size} employees. This cannot be undone.`
        }
        onConfirm={handleDelete}
        loading={deleting}
      />
      <FileUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        type="employees"
        onUploaded={refetch}
      />
    </div>
  );
}
