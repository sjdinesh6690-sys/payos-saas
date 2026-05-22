import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar, Save, Download, Upload, CheckCircle2,
  Clock, Users, AlertCircle, RefreshCw, MapPin, Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

// Small number input used repeatedly in the table
const NumInput = ({ value, onChange, min = 0, max = 31, color = 'slate', width = 14 }) => {
  const colors = {
    slate:  { border: 'border-slate-200',  text: 'text-slate-700',  ring: 'focus:ring-slate-300'  },
    green:  { border: 'border-green-200',  text: 'text-green-700',  ring: 'focus:ring-green-400'  },
    red:    { border: 'border-red-200',    text: 'text-red-600',    ring: 'focus:ring-red-400'    },
    blue:   { border: 'border-blue-200',   text: 'text-blue-700',   ring: 'focus:ring-blue-400'   },
    purple: { border: 'border-purple-200', text: 'text-purple-700', ring: 'focus:ring-purple-400' },
    amber:  { border: 'border-amber-200',  text: 'text-amber-700',  ring: 'focus:ring-amber-400'  },
  };
  const c = colors[color] || colors.slate;
  return (
    <input
      type="number"
      value={value}
      onChange={e => onChange(e.target.value)}
      min={min}
      max={max}
      className={`w-${width} text-center border ${c.border} rounded-lg px-1 py-1 text-sm font-semibold ${c.text} focus:ring-2 ${c.ring} outline-none`}
    />
  );
};

// Tiny balance badge shown under leave inputs
const BalBadge = ({ label, remaining }) => {
  const low = remaining <= 2;
  return (
    <span
      title={`${remaining} day${remaining !== 1 ? 's' : ''} remaining`}
      style={{
        fontSize: 10,
        fontWeight: 700,
        padding: '1px 5px',
        borderRadius: 4,
        background: low ? '#FEF2F2' : '#F0FFF4',
        color: low ? '#dc2626' : '#15803d',
        border: `1px solid ${low ? '#fecaca' : '#bbf7d0'}`,
        whiteSpace: 'nowrap',
      }}
    >
      {label} {remaining < 0 ? '0' : remaining}d left
    </span>
  );
};

export default function AttendancePage() {
  const now   = new Date();
  const [month, setMonth]           = useState(now.getMonth() + 1);
  const [year,  setYear]            = useState(now.getFullYear());
  const [rows,  setRows]            = useState([]);
  const [saving, setSaving]         = useState(false);
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

  // Unique locations for filter
  const locations = [...new Set(rows.map(r => r.location).filter(Boolean))];
  const filteredRows = filterLocation ? rows.filter(r => r.location === filterLocation) : rows;

  // Recalculate LOP from fields
  const calcLOP = (wd, pd, cl, sl, el) => {
    const absent = Math.max(0, (parseInt(wd) || 26) - (parseInt(pd) || 0));
    const leaves = Math.max(0, (parseInt(cl) || 0)) +
                   Math.max(0, (parseInt(sl) || 0)) +
                   Math.max(0, (parseInt(el) || 0));
    return Math.max(0, absent - leaves);
  };

  // Update a single cell and auto-recalculate dependent fields
  const updateRow = useCallback((employee_id, field, value) => {
    setRows(prev => prev.map(r => {
      if (r.employee_id !== employee_id) return r;
      const updated = { ...r, [field]: value };

      const autoFields = ['present_days', 'casual_leave', 'sick_leave', 'earned_leave', 'working_days'];
      if (autoFields.includes(field)) {
        const wd = parseInt(field === 'working_days' ? value : updated.working_days) || 26;
        const pd = parseInt(field === 'present_days' ? value : updated.present_days) || 0;
        const cl = Math.max(0, parseInt(field === 'casual_leave'  ? value : updated.casual_leave)  || 0);
        const sl = Math.max(0, parseInt(field === 'sick_leave'    ? value : updated.sick_leave)    || 0);
        const el = Math.max(0, parseInt(field === 'earned_leave'  ? value : updated.earned_leave)  || 0);

        updated.lop_days = calcLOP(wd, pd, cl, sl, el);

        // Also update balances to stay in sync
        const base_cl = r.cl_balance + (parseInt(r.casual_leave) || 0); // balance before this month's edit
        const base_sl = r.sl_balance + (parseInt(r.sick_leave)   || 0);
        const base_el = r.el_balance + (parseInt(r.earned_leave) || 0);

        updated.cl_balance = base_cl - cl;
        updated.sl_balance = base_sl - sl;
        updated.el_balance = base_el - el;
      }

      return updated;
    }));
  }, []);

  // Set all employees to full attendance
  const setAllFull = () => {
    setRows(prev => prev.map(r => ({
      ...r,
      present_days: r.working_days,
      casual_leave: 0,
      sick_leave: 0,
      earned_leave: 0,
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

  // Download CSV template (includes leave columns)
  const downloadTemplate = () => {
    const header = 'Employee ID,Employee Name,Working Days,Present Days,CL Taken,SL Taken,EL Taken,LOP Days,Notes';
    const csvRows = rows.map(r =>
      `${r.employee_id},"${r.employee_name}",${r.working_days},${r.present_days},${r.casual_leave || 0},${r.sick_leave || 0},${r.earned_leave || 0},${r.lop_days},"${r.notes || ''}"`
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

  // Upload CSV (supports old 6-col and new 9-col formats)
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
          const cl  = parseInt(cols[4]) || 0;
          const sl  = parseInt(cols[5]) || 0;
          const el  = parseInt(cols[6]) || 0;
          const lopCol = parseInt(cols[7]);
          const safeP = isNaN(pd) ? wd : pd;
          updates[emp_id] = {
            working_days: wd,
            present_days: safeP,
            casual_leave:  isNaN(cl) ? 0 : cl,
            sick_leave:    isNaN(sl) ? 0 : sl,
            earned_leave:  isNaN(el) ? 0 : el,
            lop_days:      isNaN(lopCol) ? calcLOP(wd, safeP, cl, sl, el) : lopCol,
            notes:         cols[8] || '',
          };
          imported++;
        }
        setRows(prev => prev.map(r =>
          updates[r.employee_id] ? { ...r, ...updates[r.employee_id] } : r
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
  const fullAttendance = rows.filter(r => parseInt(r.lop_days) === 0).length;
  const withLOP        = rows.filter(r => parseInt(r.lop_days) > 0).length;
  const totalLOPDays   = rows.reduce((s, r) => s + (parseInt(r.lop_days) || 0), 0);
  const policy         = data?.policy;

  const showLocations = locations.length > 0;

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track monthly attendance with CL / SL / EL — LOP is auto-calculated and applied at payslip generation
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
            {saving
              ? <><RefreshCw size={14} className="mr-1.5 animate-spin" /> Saving…</>
              : <><Save size={14} className="mr-1.5" /> Save Attendance</>}
          </Button>
        </div>
      </div>

      {/* Month / Year picker */}
      <div className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex-wrap">
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

        {/* Policy pill */}
        {policy && (
          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
            Policy: CL {policy.casual_leave_days} · SL {policy.sick_leave_days} · EL {policy.earned_leave_days} days/yr
          </span>
        )}

        <div className="flex-1" />

        {showLocations && (
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
          { label: 'Total Employees',  value: totalEmployees, icon: Users,        color: '#E85C2F', bg: '#FFF1ED' },
          { label: 'Full Attendance',  value: fullAttendance, icon: CheckCircle2, color: '#16a34a', bg: '#E8F5E9' },
          { label: 'With LOP',         value: withLOP,        icon: AlertCircle,  color: '#d97706', bg: '#FFF8E1' },
          { label: 'Total LOP Days',   value: totalLOPDays,   icon: Clock,        color: '#dc2626', bg: '#FEF2F2' },
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
              Enter leaves taken. LOP = MAX(0, Absent − CL − SL − EL). Balance shown below each leave column.
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
            <table className="w-full text-sm" style={{ minWidth: 950 }}>
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Dept</th>
                  {showLocations && (
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Location</th>
                  )}
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Work Days</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-green-600 uppercase tracking-wide">Present</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-blue-600 uppercase tracking-wide">CL Taken</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-purple-600 uppercase tracking-wide">SL Taken</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-amber-600 uppercase tracking-wide">EL Taken</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-red-500 uppercase tracking-wide">LOP</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes</th>
                  <th className="px-3 py-3 text-center text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredRows.map(row => {
                  const lop = parseInt(row.lop_days) || 0;
                  const wd  = parseInt(row.working_days) || 26;
                  const pd  = parseInt(row.present_days) || 0;
                  const absent = Math.max(0, wd - pd);
                  const cl  = parseInt(row.casual_leave)  || 0;
                  const sl  = parseInt(row.sick_leave)    || 0;
                  const el  = parseInt(row.earned_leave)  || 0;
                  const pct = wd > 0 ? Math.round((pd / wd) * 100) : 100;

                  const cl_bal = row.cl_balance ?? (policy ? policy.casual_leave_days - cl : 0);
                  const sl_bal = row.sl_balance ?? (policy ? policy.sick_leave_days   - sl : 0);
                  const el_bal = row.el_balance ?? (policy ? policy.earned_leave_days - el : 0);

                  return (
                    <tr key={row.employee_id} className="hover:bg-slate-50 transition-colors">
                      {/* Employee */}
                      <td className="px-3 py-2">
                        <div className="font-medium text-slate-900 text-sm">{row.employee_name}</div>
                        <div className="text-xs text-slate-400">{row.employee_id}</div>
                      </td>
                      {/* Dept */}
                      <td className="px-3 py-2 text-slate-600 text-xs">{row.department || '—'}</td>
                      {showLocations && (
                        <td className="px-3 py-2 text-slate-500 text-xs">{row.location || '—'}</td>
                      )}
                      {/* Working Days */}
                      <td className="px-3 py-2 text-center">
                        <NumInput
                          value={row.working_days}
                          onChange={v => updateRow(row.employee_id, 'working_days', parseInt(v) || 26)}
                          min={1} max={31} color="slate"
                        />
                      </td>
                      {/* Present Days */}
                      <td className="px-3 py-2 text-center">
                        <NumInput
                          value={row.present_days}
                          onChange={v => updateRow(row.employee_id, 'present_days', v)}
                          min={0} max={row.working_days} color="green"
                        />
                        {absent > 0 && (
                          <div className="text-xs text-slate-400 mt-0.5">{absent}d absent</div>
                        )}
                      </td>
                      {/* CL Taken */}
                      <td className="px-3 py-2 text-center">
                        <NumInput
                          value={cl}
                          onChange={v => updateRow(row.employee_id, 'casual_leave', v)}
                          min={0} max={row.working_days} color="blue"
                        />
                        <div className="mt-0.5">
                          <BalBadge label="CL" remaining={cl_bal} />
                        </div>
                      </td>
                      {/* SL Taken */}
                      <td className="px-3 py-2 text-center">
                        <NumInput
                          value={sl}
                          onChange={v => updateRow(row.employee_id, 'sick_leave', v)}
                          min={0} max={row.working_days} color="purple"
                        />
                        <div className="mt-0.5">
                          <BalBadge label="SL" remaining={sl_bal} />
                        </div>
                      </td>
                      {/* EL Taken */}
                      <td className="px-3 py-2 text-center">
                        <NumInput
                          value={el}
                          onChange={v => updateRow(row.employee_id, 'earned_leave', v)}
                          min={0} max={row.working_days} color="amber"
                        />
                        <div className="mt-0.5">
                          <BalBadge label="EL" remaining={el_bal} />
                        </div>
                      </td>
                      {/* LOP (auto-calculated, but editable override) */}
                      <td className="px-3 py-2 text-center">
                        <NumInput
                          value={lop}
                          onChange={v => updateRow(row.employee_id, 'lop_days', parseInt(v) || 0)}
                          min={0} max={row.working_days} color={lop > 0 ? 'red' : 'slate'}
                        />
                      </td>
                      {/* Notes */}
                      <td className="px-3 py-2">
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
                      <td className="px-3 py-2 text-center">
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

      {/* Info cards row */}
      <div className="grid grid-cols-2 gap-4">
        {/* LOP formula */}
        <div className="flex gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-800">
          <Info size={16} className="shrink-0 mt-0.5 text-blue-500" />
          <div>
            <strong>LOP Formula:</strong><br />
            <span className="text-xs">
              Absent = Working Days − Present Days<br />
              LOP = MAX(0, Absent − CL − SL − EL taken)<br />
              <em>Example: 4 absent, 3 leaves → 1 LOP day only</em>
            </span>
          </div>
        </div>
        {/* Leave policy hint */}
        <div className="flex gap-3 p-4 bg-green-50 border border-green-100 rounded-xl text-sm text-green-800">
          <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-green-500" />
          <div>
            <strong>Leave Policy:</strong><br />
            <span className="text-xs">
              Change CL/SL/EL entitlements in <strong>Settings → Leave Policy</strong>.
              Balances shown under each column update as you type.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
