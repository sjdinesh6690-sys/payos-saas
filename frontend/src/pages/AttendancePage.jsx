import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar, Save, RefreshCw, MapPin, CheckCircle2,
  Users, AlertCircle, Clock, Info, ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

// Calculate LOP from inputs
function calcLOP(workingDays, presentDays, leaveDays) {
  const wd  = parseInt(workingDays)  || 0;
  const pd  = parseInt(presentDays)  || 0;
  const ld  = parseInt(leaveDays)    || 0;
  const absent = Math.max(0, wd - pd);
  return Math.max(0, absent - ld);
}

export default function AttendancePage() {
  const now   = new Date();
  const [month,  setMonth]  = useState(now.getMonth() + 1);
  const [year,   setYear]   = useState(now.getFullYear());
  const [rows,   setRows]   = useState([]);
  const [globalWD, setGlobalWD] = useState(26);   // working days for this month (applies to all)
  const [saving, setSaving] = useState(false);
  const [filterLocation, setFilterLocation] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['attendance', month, year],
    queryFn: () => api.get(`/attendance?month=${month}&year=${year}`).then(r => r.data),
  });

  // Sync data into local editable rows
  useEffect(() => {
    if (data?.records) {
      // Use the policy working days as global default
      const policyWD = data.policy?.working_days_per_month || 26;

      // Find the most common working_days across saved records, fall back to policy
      const savedWDs = data.records.filter(r => r.saved).map(r => r.working_days);
      const dominantWD = savedWDs.length > 0
        ? savedWDs.sort((a, b) =>
            savedWDs.filter(v => v === a).length - savedWDs.filter(v => v === b).length
          ).pop()
        : policyWD;

      setGlobalWD(dominantWD);

      setRows(data.records.map(r => ({
        employee_id:  r.employee_id,
        employee_name: r.employee_name,
        department:   r.department || '',
        location:     r.location   || '',
        saved:        r.saved,
        working_days: r.working_days || dominantWD,
        present_days: r.present_days ?? (r.working_days || dominantWD),
        // Combine CL + SL + EL into one "leave_days" number for display
        leave_days:   (parseInt(r.casual_leave) || 0) + (parseInt(r.sick_leave) || 0) + (parseInt(r.earned_leave) || 0),
        lop_days:     parseInt(r.lop_days) || 0,
        notes:        r.notes || '',
      })));
    }
  }, [data]);

  // When global working days changes, update all rows
  const applyGlobalWD = (wd) => {
    setGlobalWD(wd);
    setRows(prev => prev.map(r => {
      const newWD = parseInt(wd) || 26;
      const lop   = calcLOP(newWD, r.present_days, r.leave_days);
      return { ...r, working_days: newWD, lop_days: lop };
    }));
  };

  // Update a single cell
  const updateRow = (employee_id, field, value) => {
    setRows(prev => prev.map(r => {
      if (r.employee_id !== employee_id) return r;
      const updated = { ...r, [field]: value };
      // Recalculate LOP whenever any of the three key fields change
      if (['present_days', 'leave_days', 'working_days'].includes(field)) {
        updated.lop_days = calcLOP(updated.working_days, updated.present_days, updated.leave_days);
      }
      return updated;
    }));
  };

  // Set all to full attendance (no leaves, no LOP)
  const setAllFull = () => {
    setRows(prev => prev.map(r => ({
      ...r,
      present_days: globalWD,
      leave_days:   0,
      lop_days:     0,
    })));
    toast.success('All employees set to full attendance');
  };

  // Save
  const handleSave = async () => {
    setSaving(true);
    try {
      // Map simplified "leave_days" back to casual_leave for the backend
      const records = rows.map(r => ({
        employee_id:  r.employee_id,
        working_days: r.working_days,
        present_days: parseInt(r.present_days) || 0,
        casual_leave: parseInt(r.leave_days)   || 0,   // store total leave in casual_leave
        sick_leave:   0,
        earned_leave: 0,
        lop_days:     r.lop_days,
        notes:        r.notes,
      }));
      const res = await api.post('/attendance', { month, year, records });
      toast.success(res.data.message || 'Attendance saved!');
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const locations     = [...new Set(rows.map(r => r.location).filter(Boolean))];
  const filteredRows  = filterLocation ? rows.filter(r => r.location === filterLocation) : rows;
  const policy        = data?.policy;
  const totalLeaveDays = policy ? (policy.casual_leave_days + policy.sick_leave_days + policy.earned_leave_days) : 39;

  // Stats
  const withLOP      = rows.filter(r => r.lop_days > 0).length;
  const totalLOP     = rows.reduce((s, r) => s + (r.lop_days || 0), 0);
  const fullAtt      = rows.filter(r => r.lop_days === 0).length;
  const showLocations = locations.length > 0;

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Enter how many days each employee came in this month. LOP is calculated automatically.
          </p>
        </div>
        <Button
          className="h-9 text-white text-sm"
          style={{ background: '#1A7A4A' }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving
            ? <><RefreshCw size={14} className="mr-1.5 animate-spin" /> Saving…</>
            : <><Save size={14} className="mr-1.5" /> Save Attendance</>}
        </Button>
      </div>

      {/* ── Step 1: Pick month ─────────────────────────────────────────────── */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center">1</div>
            <span className="text-sm font-semibold text-slate-800">Pick the month you are entering attendance for</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Calendar size={16} className="text-slate-400" />
            <select
              value={month}
              onChange={e => setMonth(parseInt(e.target.value))}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold focus:ring-2 focus:ring-green-500 outline-none"
            >
              {MONTH_NAMES.map((n, i) => <option key={i} value={i+1}>{n}</option>)}
            </select>
            <input
              type="number"
              value={year}
              onChange={e => setYear(parseInt(e.target.value))}
              min="2020" max="2030"
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-semibold w-24 focus:ring-2 focus:ring-green-500 outline-none"
            />
            <span className="text-sm font-bold text-green-700 bg-green-50 px-3 py-1.5 rounded-lg">
              {MONTH_NAMES[month-1]} {year}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── Step 2: Set working days ───────────────────────────────────────── */}
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center">2</div>
            <span className="text-sm font-semibold text-slate-800">How many working days are there in {MONTH_NAMES[month-1]} {year}?</span>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5">
              <span className="text-sm text-slate-600">Working days this month:</span>
              <input
                type="number"
                value={globalWD}
                onChange={e => applyGlobalWD(e.target.value)}
                min="1" max="31"
                className="w-16 text-center border border-green-300 rounded-lg px-2 py-1.5 text-lg font-bold text-green-700 focus:ring-2 focus:ring-green-400 outline-none"
              />
              <span className="text-sm text-slate-400">days</span>
            </div>
            {policy && (
              <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
                Your policy default: <strong>{policy.working_days_per_month} days/month</strong> &nbsp;·&nbsp; Each employee gets <strong>{totalLeaveDays} leave days/year</strong>
              </span>
            )}
            <div className="ml-auto flex gap-2">
              {showLocations && (
                <select
                  value={filterLocation}
                  onChange={e => setFilterLocation(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-green-500 outline-none"
                >
                  <option value="">All Locations</option>
                  {locations.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              )}
              <button
                onClick={setAllFull}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              >
                ✓ Set All Full
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Step 3: Enter attendance ───────────────────────────────────────── */}
      <Card className="border-slate-200 shadow-sm">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center">3</div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Enter attendance for {MONTH_NAMES[month-1]} {year}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Fill in "Days Present" and "Approved Leave". LOP calculates itself.
              </p>
            </div>
          </div>
          {isLoading && <RefreshCw size={14} className="text-slate-400 animate-spin" />}
        </div>

        {filteredRows.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            {isLoading ? 'Loading employees…' : 'No employees found. Add employees first.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Employee</th>
                  {showLocations && (
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Location</th>
                  )}
                  {/* Column header with emoji for clarity */}
                  <th className="px-4 py-3 text-center text-xs font-semibold text-green-700 uppercase tracking-wide w-36">
                    🟢 Days Present
                    <div className="text-[10px] font-normal text-slate-400 normal-case mt-0.5">out of {globalWD} days</div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-blue-600 uppercase tracking-wide w-36">
                    🏖 Approved Leave
                    <div className="text-[10px] font-normal text-slate-400 normal-case mt-0.5">CL / SL / EL taken</div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-red-500 uppercase tracking-wide w-32">
                    🔴 LOP Days
                    <div className="text-[10px] font-normal text-slate-400 normal-case mt-0.5">salary deducted</div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredRows.map(row => {
                  const wd      = parseInt(row.working_days) || globalWD;
                  const pd      = parseInt(row.present_days) || 0;
                  const ld      = parseInt(row.leave_days)   || 0;
                  const lop     = parseInt(row.lop_days)     || 0;
                  const absent  = Math.max(0, wd - pd);
                  const pct     = wd > 0 ? Math.round((pd / wd) * 100) : 100;
                  const hasLOP  = lop > 0;

                  return (
                    <tr
                      key={row.employee_id}
                      className="hover:bg-slate-50 transition-colors"
                      style={hasLOP ? { background: '#fff8f8' } : {}}
                    >
                      {/* Employee */}
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{row.employee_name}</div>
                        <div className="text-xs text-slate-400">{row.department || row.employee_id}</div>
                      </td>
                      {showLocations && (
                        <td className="px-4 py-3 text-slate-500 text-xs">{row.location || '—'}</td>
                      )}

                      {/* Days Present */}
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          value={pd}
                          onChange={e => updateRow(row.employee_id, 'present_days', parseInt(e.target.value) ?? 0)}
                          min={0}
                          max={wd}
                          className="w-20 text-center border-2 border-green-300 rounded-xl px-2 py-2 text-lg font-bold text-green-700 focus:ring-2 focus:ring-green-400 outline-none bg-green-50"
                        />
                        {absent > 0 && (
                          <div className="text-xs text-slate-400 mt-1">{absent} day{absent !== 1 ? 's' : ''} absent</div>
                        )}
                      </td>

                      {/* Approved Leave */}
                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          value={ld}
                          onChange={e => updateRow(row.employee_id, 'leave_days', parseInt(e.target.value) ?? 0)}
                          min={0}
                          max={absent}
                          className="w-20 text-center border-2 border-blue-300 rounded-xl px-2 py-2 text-lg font-bold text-blue-700 focus:ring-2 focus:ring-blue-400 outline-none bg-blue-50"
                        />
                        {ld > 0 && (
                          <div className="text-xs text-blue-400 mt-1">{ld} leave{ld !== 1 ? 's' : ''}</div>
                        )}
                      </td>

                      {/* LOP — auto-calculated, shown read-only */}
                      <td className="px-4 py-3 text-center">
                        <div
                          className="w-20 mx-auto text-center rounded-xl px-2 py-2 text-lg font-bold"
                          style={{
                            background: hasLOP ? '#FEF2F2' : '#F0FFF4',
                            color:      hasLOP ? '#dc2626' : '#16a34a',
                            border:     `2px solid ${hasLOP ? '#fecaca' : '#bbf7d0'}`,
                          }}
                        >
                          {lop}
                        </div>
                        <div className="text-xs mt-1" style={{ color: hasLOP ? '#dc2626' : '#16a34a' }}>
                          {hasLOP ? `${lop} day${lop !== 1 ? 's' : ''} deducted` : 'no deduction'}
                        </div>
                      </td>

                      {/* Notes */}
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={row.notes}
                          onChange={e => updateRow(row.employee_id, 'notes', e.target.value)}
                          placeholder="Optional note…"
                          className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs text-slate-600 focus:ring-2 focus:ring-slate-300 outline-none"
                          maxLength={100}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table footer */}
        {filteredRows.length > 0 && (
          <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
            <div className="flex gap-4 text-sm text-slate-500">
              <span>👥 {rows.length} employees</span>
              <span>✅ {fullAtt} full attendance</span>
              {withLOP > 0 && <span className="text-red-500 font-medium">🔴 {withLOP} with LOP ({totalLOP} total days)</span>}
            </div>
            <Button
              className="h-8 text-xs text-white"
              style={{ background: '#1A7A4A' }}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : `Save ${filteredRows.length} Records`}
            </Button>
          </div>
        )}
      </Card>

      {/* ── How it works explainer ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Formula */}
        <div style={{ background: '#EFF6FF', border: '1.5px solid #bfdbfe', borderRadius: 14, padding: '16px 18px' }}>
          <p style={{ fontWeight: 700, fontSize: 13, color: '#1e40af', marginBottom: 8 }}>
            📐 How LOP is calculated
          </p>
          <div style={{ fontSize: 13, color: '#1d4ed8', lineHeight: 1.8 }}>
            <strong>Absent Days</strong> = Working Days − Present Days<br />
            <strong>LOP</strong> = Absent Days − Approved Leave (min 0)
          </div>
          <div style={{ marginTop: 10, padding: '8px 12px', background: '#fff', borderRadius: 8, fontSize: 12, color: '#374151' }}>
            <strong>Example:</strong> 26 working days, 22 present = 4 absent.<br />
            Employee took 3 approved leaves → <strong style={{ color: '#dc2626' }}>LOP = 1 day</strong> (salary cut for 1 day only).
          </div>
        </div>

        {/* Tips */}
        <div style={{ background: '#F0FFF4', border: '1.5px solid #bbf7d0', borderRadius: 14, padding: '16px 18px' }}>
          <p style={{ fontWeight: 700, fontSize: 13, color: '#15803d', marginBottom: 8 }}>
            💡 Quick tips
          </p>
          <ul style={{ fontSize: 13, color: '#166534', lineHeight: 2, margin: 0, paddingLeft: 16 }}>
            <li>LOP = 0 means no salary cut</li>
            <li>Approved Leave = any CL / SL / EL taken</li>
            <li>Click <strong>"Set All Full"</strong> if everyone attended fully</li>
            <li>Change leave entitlements in <strong>Leave Policy</strong></li>
          </ul>
        </div>
      </div>

    </div>
  );
}
