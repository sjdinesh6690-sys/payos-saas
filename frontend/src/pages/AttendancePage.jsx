import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar, Save, Download, Upload, CheckCircle2,
  Clock, Users, AlertCircle, RefreshCw, MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

export default function AttendancePage() {
  const now   = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());
  const [rows,  setRows]  = useState([]);        // local editable state
  const [saving, setSaving] = useState(false);
  const [filterLocation, setFilterLocation] = useState('');

  // Fetch attendance for selected month/year
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['attendance', month, year],
    queryFn: () => api.get(`/attendance?month=${month}&year=${year}`).then(r => r.data),
  });

  // When data loads, sync into local editable rows
  useEffect(() => {
    if (data?.records) {
      setRows(data.records.map(r => ({ ...r })));
    }
  }, [data]);

  // Compute unique locations for filter
  const locations = [...new Set(rows.map(r => r.location).filter(Boolean))];

  const filteredRows = filterLocation
    ? rows.filter(r => r.location === filterLocation)
    : rows;

  // Update a single cell
  const updateRow = useCallback((employee_id, field, value) => {
    setRows(prev => prev.map(r => {
      if (r.employee_id !== employee_id) return r;
      const updated = { ...r, [field]: value };
      // Auto-calc LOP when present_days changes
      if (field === 'present_days') {
        const pd  = parseInt(value)  || 0;
        const wd  = parseInt(r.working_days) || 26;
        updated.lop_days = Math.max(0, wd - pd);
      }
      // Auto-calc present_days when lop changes
      if (field === 'lop_days') {
        const lop = parseInt(value) || 0;
        const wd  = parseInt(r.working_days) || 26;
        updated.present_days = Math.max(0, wd - lop);
      }
      return updated;
    }));
  }, []);

  // Set all employees to full attendance (quick reset)
  const setAllFull = () => {
    setRows(prev => prev.map(r => ({
      ...r,
      present_days: r.working_days,
      lop_days: 0,
    })));
    toast.success('All employees set to full attendance');
  };

  // Save attendance
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.post('/attendance', { month, year, records: rows });
      toast.success(res.data.message || 'Attendance saved!');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  // Download CSV template
  const downloadTemplate = () => {
    const header = 'Employee ID,Employee Name,Working Days,Present Days,LOP Days,Notes';
    const csvRows = rows.map(r =>
      `${r.employee_id},"${r.employee_name}",${r.working_days},${r.present_days},${r.lop_days},"${r.notes || ''}"`
    );
    const blob = new Blob([[header, ...csvRows].join('\n')], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Attendance_${MONTH_NAMES[month-1]}_${year}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
  };

  // Upload CSV
  const handleCSVUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const lines  = ev.target.result.split('\n').filter(Boolean);
        const header = lines[0].toLowerCase();
        if (!header.includes('employee id') && !header.includes('employee_id')) {
          toast.error('Invalid CSV — first row must have headers');
          return;
        }
        let imported = 0;
        const updates = {};
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
          const emp_id = cols[0];
          if (!emp_id) continue;
          const wd  = parseInt(cols[2]) || 26;
          const pd  = parseInt(cols[3]);
          const lop = parseInt(cols[4]);
          updates[emp_id] = {
            working_days: wd,
            present_days: isNaN(pd) ? wd : pd,
            lop_days:     isNaN(lop) ? Math.max(0, wd - (isNaN(pd) ? wd : pd)) : lop,
            notes:        cols[5] || '',
          };
          imported++;
        }
        setRows(prev => prev.map(r =>
          updates[r.employee_id]
            ? { ...r, ...updates[r.employee_id] }
            : r
        ));
        toast.success(`Imported ${imported} records from CSV`);
      } catch (err) {
        toast.error('CSV parse error — check the file format');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Summary stats
  const totalEmployees = rows.length;
  const fullAttendance = rows.filter(r => r.lop_days === 0).length;
  const withLOP        = rows.filter(r => parseInt(r.lop_days) > 0).length;
  const totalLOPDays   = rows.reduce((s, r) => s + (parseInt(r.lop_days) || 0), 0);

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track monthly attendance — LOP days are applied when generating payslips
          </p>
        </div>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-700 cursor-pointer hover:bg-slate-50">
            <Upload size={14} />
            Import CSV
            <input type="file" accept=".csv" className="hidden" onChange={handleCSVUpload} />
          </label>
          <Button variant="outline" className="h-9 text-sm" onClick={downloadTemplate}>
            <Download size={14} className="mr-1.5" /> Export CSV
          </Button>
          <Button className="h-9 text-white text-sm" style={{ background: '#1A7A4A' }} onClick={handleSave} disabled={saving}>
            {saving ? <><RefreshCw size={14} className="mr-1.5 animate-spin" /> Saving…</> : <><Save size={14} className="mr-1.5" /> Save Attendance</>}
          </Button>
        </div>
      </div>

      {/* Month / Year picker */}
      <div className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
        <Calendar size={18} className="text-slate-400" />
        <span className="text-sm font-medium text-slate-700">Period:</span>
        <select
          value={month}
          onChange={e => setMonth(parseInt(e.target.value))}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
        >
          {MONTH_NAMES.map((n, i) => <option key={i} value={i+1}>{n}</option>)}
        </select>
        <input
          type="number"
          value={year}
          onChange={e => setYear(parseInt(e.target.value))}
          min="2020" max="2030"
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-20 focus:ring-2 focus:ring-green-500 outline-none"
        />
        <span className="text-sm font-semibold text-slate-700 ml-1">
          {MONTH_NAMES[month-1]} {year}
        </span>

        <div className="flex-1" />

        {/* Location filter */}
        {locations.length > 0 && (
          <div className="flex items-center gap-2">
            <MapPin size={14} className="text-slate-400" />
            <select
              value={filterLocation}
              onChange={e => setFilterLocation(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="">All Locations</option>
              {locations.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        )}

        <Button variant="outline" size="sm" onClick={setAllFull} className="text-xs h-8 ml-2">
          <CheckCircle2 size={12} className="mr-1" /> Set All Full
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Employees',  value: totalEmployees, icon: Users,         color: '#E85C2F', bg: '#FFF1ED' },
          { label: 'Full Attendance',  value: fullAttendance, icon: CheckCircle2,  color: '#16a34a', bg: '#E8F5E9' },
          { label: 'With LOP',         value: withLOP,        icon: AlertCircle,   color: '#d97706', bg: '#FFF8E1' },
          { label: 'Total LOP Days',   value: totalLOPDays,   icon: Clock,         color: '#dc2626', bg: '#FEF2F2' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs text-slate-500">{label}</p>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: bg }}>
                  <Icon size={13} style={{ color }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Attendance grid */}
      <Card className="border-slate-200 shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Attendance Sheet — {MONTH_NAMES[month-1]} {year}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Enter days present. LOP auto-calculates. Working days default 26.
            </p>
          </div>
          {isLoading && <RefreshCw size={14} className="text-slate-400 animate-spin" />}
        </div>

        {filteredRows.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            {isLoading ? 'Loading…' : 'No employees found. Add employees first.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Department</th>
                  {locations.length > 0 && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Location</th>
                  )}
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide w-24">Working Days</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-green-600 uppercase tracking-wide w-24">Present Days</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-red-500 uppercase tracking-wide w-24">LOP Days</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide w-20">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredRows.map(row => {
                  const lop  = parseInt(row.lop_days) || 0;
                  const wd   = parseInt(row.working_days) || 26;
                  const pct  = Math.round(((wd - lop) / wd) * 100);
                  return (
                    <tr key={row.employee_id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{row.employee_name}</div>
                        <div className="text-xs text-slate-400">{row.employee_id}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-sm">{row.department || '—'}</td>
                      {locations.length > 0 && (
                        <td className="px-4 py-3 text-slate-500 text-xs">{row.location || '—'}</td>
                      )}
                      {/* Working Days */}
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          value={row.working_days}
                          onChange={e => updateRow(row.employee_id, 'working_days', parseInt(e.target.value) || 26)}
                          min="1" max="31"
                          className="w-16 text-center border border-slate-200 rounded-lg px-2 py-1 text-sm focus:ring-2 focus:ring-slate-300 outline-none"
                        />
                      </td>
                      {/* Present Days */}
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          value={row.present_days}
                          onChange={e => updateRow(row.employee_id, 'present_days', e.target.value)}
                          min="0" max={row.working_days}
                          className="w-16 text-center border border-green-200 rounded-lg px-2 py-1 text-sm font-semibold text-green-700 focus:ring-2 focus:ring-green-400 outline-none"
                        />
                      </td>
                      {/* LOP Days */}
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          value={row.lop_days}
                          onChange={e => updateRow(row.employee_id, 'lop_days', e.target.value)}
                          min="0" max={row.working_days}
                          className="w-16 text-center border border-red-200 rounded-lg px-2 py-1 text-sm font-semibold text-red-600 focus:ring-2 focus:ring-red-400 outline-none"
                        />
                      </td>
                      {/* Notes */}
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={row.notes || ''}
                          onChange={e => updateRow(row.employee_id, 'notes', e.target.value)}
                          placeholder="Optional reason…"
                          className="w-full border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-600 focus:ring-2 focus:ring-slate-300 outline-none"
                          maxLength={100}
                        />
                      </td>
                      {/* Status badge */}
                      <td className="px-4 py-3 text-center">
                        {lop === 0 ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Full</Badge>
                        ) : (
                          <Badge className="bg-red-50 text-red-600 border-red-200 text-xs">{pct}%</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        {filteredRows.length > 0 && (
          <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
            <p className="text-xs text-slate-500">
              {withLOP} employee{withLOP !== 1 ? 's' : ''} with LOP · {totalLOPDays} total LOP days this month
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={setAllFull}>
                Reset All to Full
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs text-white"
                style={{ background: '#1A7A4A' }}
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving…' : `Save ${filteredRows.length} Records`}
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Info card */}
      <div className="flex gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800">
        <AlertCircle size={16} className="shrink-0 mt-0.5 text-blue-500" />
        <div>
          <strong>How attendance links to payroll:</strong> When you generate payslips in <strong>Generate & Send</strong>,
          the LOP days you enter here are automatically applied to reduce the employee's salary for that month.
          You can also override LOP per employee at payslip generation time.
        </div>
      </div>
    </div>
  );
}
