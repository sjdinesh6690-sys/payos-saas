import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, Pencil, Upload, MoreHorizontal,
  Users, Download, ChevronUp, ChevronDown,
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

export default function EmployeesPage() {
  const qc = useQueryClient();
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.get('/employees').then(r => r.data),
  });

  // Selection
  const [selected, setSelected] = useState(new Set());

  // Filters
  const [search, setSearch]         = useState('');
  const [filterDept, setFilterDept] = useState('');

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

  const refetch = () => qc.invalidateQueries({ queryKey: ['employees'] });

  // Derived filter options
  const departments = useMemo(() => {
    const set = new Set(employees.map(e => e.department).filter(Boolean));
    return [...set].sort().map(d => ({ label: d, value: d }));
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
        e.designation?.toLowerCase().includes(q)
      );
    }
    if (filterDept) list = list.filter(e => e.department === filterDept);

    list.sort((a, b) => {
      let av = a[sortKey] ?? '', bv = b[sortKey] ?? '';
      if (sortKey === 'salary') { av = Number(av); bv = Number(bv); }
      else { av = String(av).toLowerCase(); bv = String(bv).toLowerCase(); }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ?  1 : -1;
      return 0;
    });
    return list;
  }, [employees, search, filterDept, sortKey, sortDir]);

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

  const exportCsv = () => {
    const cols = ['employee_id', 'employee_name', 'email', 'salary', 'department', 'designation', 'phone', 'date_of_joining'];
    const rows = [cols.join(','), ...employees.map(e => cols.map(c => e[c] ?? '').join(','))];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'employees.csv'; a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Employees</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {employees.length} total · {filtered.length} shown
            {selected.size > 0 && ` · ${selected.size} selected`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {selected.size > 0 && (
            <Button variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 h-9" onClick={promptBulkDelete}>
              <Trash2 size={14} className="mr-1.5" /> Delete ({selected.size})
            </Button>
          )}
          <Button variant="outline" className="h-9" onClick={exportCsv}>
            <Download size={14} className="mr-1.5" /> Export
          </Button>
          <Button variant="outline" className="h-9" onClick={() => setUploadOpen(true)}>
            <Upload size={14} className="mr-1.5" /> Import CSV
          </Button>
          <Button className="h-9 bg-orange-600 hover:bg-orange-700 text-white" onClick={openAdd}>
            <Plus size={14} className="mr-1.5" /> Add Employee
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Employees', value: employees.length },
          { label: 'Total Payroll',   value: fmt(employees.reduce((s, e) => s + (Number(e.salary) || 0), 0)) },
          { label: 'Departments',     value: departments.length },
          { label: 'Avg Salary',      value: employees.length ? fmt(employees.reduce((s, e) => s + (Number(e.salary) || 0), 0) / employees.length) : '—' },
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
        filters={[{ key: 'dept', label: 'All Departments', options: departments }]}
        values={{ dept: filterDept }}
        onChange={(k, v) => k === 'dept' && setFilterDept(v)}
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
                  { key: 'email',         label: 'Email' },
                  { key: 'salary',        label: 'Salary' },
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
                    <Users size={32} className="mx-auto text-slate-200 mb-2" />
                    <p className="text-slate-400 text-sm">No employees found</p>
                    <Button className="mt-3 h-8 text-xs bg-orange-600 hover:bg-orange-700 text-white" onClick={openAdd}>
                      <Plus size={12} className="mr-1" /> Add First Employee
                    </Button>
                  </td>
                </tr>
              ) : filtered.map(emp => (
                <tr key={emp.id} className={`hover:bg-slate-50 transition-colors ${selected.has(emp.id) ? 'bg-orange-50' : ''}`}>
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
                  <td className="px-4 py-3 text-slate-600 text-xs">{emp.email}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">{fmt(emp.salary)}</td>
                  <td className="px-4 py-3">
                    <SimpleDropdown
                      align="end"
                      trigger={
                        <button type="button" className="p-1 rounded hover:bg-slate-100 text-slate-400">
                          <MoreHorizontal size={16} />
                        </button>
                      }
                    >
                      <DropdownMenuItem onClick={() => openEdit(emp)}>
                        <Pencil size={14} /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600" onClick={() => promptDelete(emp)}>
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
