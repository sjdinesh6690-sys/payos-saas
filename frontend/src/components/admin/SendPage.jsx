import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2, AlertCircle, Send, FileText, Users, Mail,
  ChevronLeft, ChevronRight, Search, X, UserMinus, Settings2,
  Plus, Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

const MONTHS = ['','January','February','March','April','May','June','July','August','September','October','November','December'];
const fmt    = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

function getManualComponents(config) {
  if (!config) return { manualEarnings: [], manualDeductions: [], hasLop: false };
  const manualEarnings   = (config.earnings  || []).filter(c => c.enabled && c.type === 'manual');
  const manualDeductions = (config.deductions || []).filter(c => c.enabled && c.type === 'manual');
  const lopComp          = (config.deductions || []).find(c => c.enabled && c.type === 'lop');
  return { manualEarnings, manualDeductions, hasLop: !!lopComp };
}

// Employee search dropdown — shared across sections
function EmpSearch({ employees, exclude = [], placeholder, onSelect }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const results = q.length >= 1
    ? employees.filter(e =>
        !exclude.includes(e.employee_id) &&
        (e.employee_name.toLowerCase().includes(q.toLowerCase()) ||
         e.employee_id.toLowerCase().includes(q.toLowerCase()) ||
         (e.department || '').toLowerCase().includes(q.toLowerCase()))
      ).slice(0, 8)
    : [];

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          {results.map(e => (
            <button key={e.employee_id} type="button"
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 text-left text-sm transition-colors"
              onMouseDown={() => { onSelect(e); setQ(''); setOpen(false); }}>
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                {e.employee_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 truncate">{e.employee_name}</p>
                <p className="text-xs text-slate-400">{e.employee_id}{e.department ? ` · ${e.department}` : ''}</p>
              </div>
              <span className="text-xs text-slate-500 shrink-0">₹{Number(e.salary||0).toLocaleString('en-IN')}</span>
            </button>
          ))}
        </div>
      )}
      {open && q.length >= 1 && results.length === 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg px-4 py-3 text-sm text-slate-400">
          No employees found for "{q}"
        </div>
      )}
    </div>
  );
}

export default function SendPage() {
  const qc  = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  const [workingDays, setWorkingDays] = useState(26);
  const [genLoading,  setGenLoading]  = useState(false);
  const [sendLoading, setSendLoading] = useState(false);

  // Exceptions — only these are stored; everyone else is normal
  const [lopList,          setLopList]          = useState([]);   // [{ emp, absentDays }]
  const [excludeList,      setExcludeList]      = useState([]);   // [emp]
  const [extrasList,       setExtrasList]       = useState([]);   // [{ emp, ...values }]
  const [salaryOverrides,  setSalaryOverrides]  = useState([]);   // [{ emp, salary }]

  const { data: employees = [] } = useQuery({
    queryKey: ['employees', 'active'],
    queryFn: () => api.get('/employees?status=active').then(r => r.data),
  });
  const { data: allPayslips = [] } = useQuery({
    queryKey: ['payslips'],
    queryFn: () => api.get('/payslips').then(r => r.data),
  });
  const { data: configData } = useQuery({
    queryKey: ['payroll-config'],
    queryFn: () => api.get('/payroll-config').then(r => r.data),
  });

  const config = configData?.config;
  const { manualEarnings, manualDeductions, hasLop } = getManualComponents(config);
  const extraCols = [
    ...manualEarnings.map(c  => ({ key: c.key, label: c.label, type: 'earning' })),
    ...manualDeductions.map(c => ({ key: c.key, label: c.label, type: 'deduction' })),
  ];
  const hasExtras = extraCols.length > 0;

  const thisMonthSlips = allPayslips.filter(
    p => String(p.month) === String(month) && String(p.year) === String(year)
  );
  const emailedCount = thisMonthSlips.filter(p => p.emailed).length;
  const pendingEmail = thisMonthSlips.filter(p => !p.emailed);
  const totalPayroll = thisMonthSlips.reduce((s, p) => s + (Number(p.net_salary || p.salary) || 0), 0);

  const maxMonth = now.getMonth() + 1;
  const maxYear  = now.getFullYear();
  const isFuture = (m, y) => y > maxYear || (y === maxYear && m > maxMonth);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => {
    const nm = month === 12 ? 1 : month + 1;
    const ny = month === 12 ? year + 1 : year;
    if (isFuture(nm, ny)) { toast.error('Cannot navigate beyond the current month'); return; }
    setMonth(nm); setYear(ny);
  };

  // Derived counts
  const excludedIds   = new Set(excludeList.map(e => e.employee_id));
  const lopIds        = new Set(lopList.map(l => l.emp.employee_id));
  const selectedCount = employees.length - excludeList.length;

  // Department summary
  const deptMap = {};
  employees.forEach(e => {
    const d = e.department || 'No Dept';
    deptMap[d] = (deptMap[d] || 0) + 1;
  });

  // Build adjustments object for API
  const buildAdjustments = () => {
    const adj = {};
    lopList.forEach(({ emp, absentDays }) => {
      adj[emp.employee_id] = {
        ...(adj[emp.employee_id] || {}),
        present_days: Math.max(0, workingDays - Number(absentDays || 0)),
      };
    });
    extrasList.forEach(({ emp, ...vals }) => {
      adj[emp.employee_id] = { ...(adj[emp.employee_id] || {}), ...vals };
    });
    return adj;
  };

  // Build salary overrides object for API
  const buildSalaryOverrides = () => {
    const overrides = {};
    salaryOverrides.forEach(({ emp, salary }) => {
      if (salary) overrides[emp.employee_id] = Number(salary);
    });
    return overrides;
  };

  // Salary override helpers
  const overrideIds   = new Set(salaryOverrides.map(e => e.emp.employee_id));
  const addOverride   = (emp) => {
    if (overrideIds.has(emp.employee_id)) return;
    setSalaryOverrides(prev => [...prev, { emp, salary: emp.salary || '' }]);
  };
  const removeOverride   = (empId) => setSalaryOverrides(prev => prev.filter(e => e.emp.employee_id !== empId));
  const setOverrideSalary = (empId, val) =>
    setSalaryOverrides(prev => prev.map(e => e.emp.employee_id === empId ? { ...e, salary: val } : e));

  const generate = async () => {
    if (selectedCount === 0) { toast.error('No employees selected'); return; }
    if (thisMonthSlips.length > 0) {
      const ok = window.confirm(
        `This will overwrite existing payslips for ${MONTHS[month]} ${year}.\n\nContinue?`
      );
      if (!ok) return;
    }
    setGenLoading(true);
    try {
      const selectedIds = employees
        .filter(e => !excludedIds.has(e.employee_id))
        .map(e => e.employee_id);
      await api.post('/payslips/generate', {
        month,
        year,
        working_days: workingDays,
        adjustments: buildAdjustments(),
        employee_ids: selectedIds,
        salary_overrides: buildSalaryOverrides(),
      });
      toast.success(`Payslips generated for ${selectedIds.length} employees — ${MONTHS[month]} ${year}`);
      qc.invalidateQueries({ queryKey: ['payslips'] });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Generation failed');
    } finally {
      setGenLoading(false);
    }
  };

  const sendEmails = async () => {
    if (!pendingEmail.length) { toast('No pending payslips to email'); return; }
    setSendLoading(true);
    try {
      const res = await api.post('/email/send', { month, year });
      toast.success(res.data.message || 'Emails sent');
      qc.invalidateQueries({ queryKey: ['payslips'] });
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Email send failed');
    } finally {
      setSendLoading(false);
    }
  };

  // LOP helpers
  const addLop = (emp) => {
    if (lopIds.has(emp.employee_id)) return;
    setLopList(prev => [...prev, { emp, absentDays: '' }]);
  };
  const removeLop = (empId) => setLopList(prev => prev.filter(l => l.emp.employee_id !== empId));
  const setLopDays = (empId, val) =>
    setLopList(prev => prev.map(l => l.emp.employee_id === empId ? { ...l, absentDays: val } : l));

  // Exclude helpers
  const addExclude = (emp) => {
    if (excludedIds.has(emp.employee_id)) return;
    setExcludeList(prev => [...prev, emp]);
  };
  const removeExclude = (empId) => setExcludeList(prev => prev.filter(e => e.employee_id !== empId));

  // Extras helpers
  const extrasIds = new Set(extrasList.map(e => e.emp.employee_id));
  const addExtras = (emp) => {
    if (extrasIds.has(emp.employee_id)) return;
    setExtrasList(prev => [...prev, { emp }]);
  };
  const removeExtras = (empId) => setExtrasList(prev => prev.filter(e => e.emp.employee_id !== empId));
  const setExtrasVal = (empId, key, val) =>
    setExtrasList(prev => prev.map(e => e.emp.employee_id === empId ? { ...e, [key]: val } : e));

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Generate & Send Payslips</h1>
        <p className="text-sm text-slate-500 mt-0.5">Select month → mark exceptions → generate → send</p>
      </div>

      {/* Month selector */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between max-w-xs mx-auto">
            <button type="button" onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
              <ChevronLeft size={20} />
            </button>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">{MONTHS[month]}</p>
              <p className="text-slate-500 text-sm">{year}</p>
            </div>
            <button type="button" onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
              <ChevronRight size={20} />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Active Employees', value: employees.length,      color: 'text-slate-900' },
          { label: 'Will Get Payslip', value: selectedCount,         color: 'text-green-700' },
          { label: 'Emails Sent',      value: emailedCount,          color: 'text-blue-700'  },
          { label: 'Total Payroll',    value: fmt(totalPayroll),     color: 'text-slate-900' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="py-3 px-4">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Step 1 — Generate */}
      <Card>
        <CardContent className="py-5 space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center shrink-0">1</div>
            <div>
              <p className="font-semibold text-slate-900">Generate Payslips</p>
              <p className="text-sm text-slate-500 mt-0.5">
                All active employees are included by default. Only action the exceptions below.
                {thisMonthSlips.length > 0 && <span className="text-amber-600 ml-1">({thisMonthSlips.length} already generated — will overwrite.)</span>}
              </p>
            </div>
            {thisMonthSlips.length > 0 && <Badge className="bg-green-100 text-green-700 border-green-200 ml-auto shrink-0">Done</Badge>}
          </div>

          {employees.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <AlertCircle size={15} /> No employees found. Add employees first.
            </div>
          )}

          {employees.length > 0 && (
            <>
              {/* Working days + department summary */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Working Days:</label>
                    <Input
                      type="number"
                      value={workingDays}
                      onChange={e => setWorkingDays(parseInt(e.target.value) || 26)}
                      className="h-8 w-20 text-sm"
                      min={1} max={31}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-green-700 font-medium bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                    <CheckCircle2 size={14} />
                    {selectedCount} employees included
                    {excludeList.length > 0 && <span className="text-red-500 ml-1">· {excludeList.length} excluded</span>}
                    {lopList.length > 0 && <span className="text-amber-600 ml-1">· {lopList.length} with LOP</span>}
                  </div>
                </div>
                {/* Department chips */}
                <div className="flex flex-wrap gap-2">
                  {Object.entries(deptMap).map(([dept, count]) => (
                    <span key={dept} className="inline-flex items-center gap-1.5 text-xs bg-white border border-slate-200 rounded-full px-2.5 py-1 text-slate-600">
                      <Building2 size={10} className="text-slate-400" />
                      {dept} <span className="font-semibold text-slate-800">{count}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* SECTION A — Mark LOP */}
              {hasLop && (
                <div className="rounded-xl border border-red-100 overflow-hidden">
                  <div className="bg-red-50 px-4 py-3 border-b border-red-100">
                    <p className="text-sm font-semibold text-red-800">🔴 Mark LOP — Who was absent this month?</p>
                    <p className="text-xs text-red-600 mt-0.5">Search and add only the employees who missed days. Everyone else gets full salary.</p>
                  </div>
                  <div className="p-4 space-y-3">
                    <EmpSearch
                      employees={employees}
                      exclude={[...lopIds, ...excludedIds]}
                      placeholder="Search employee name or ID to mark LOP…"
                      onSelect={addLop}
                    />
                    {lopList.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-2">No LOP marked — all employees at full attendance</p>
                    )}
                    {lopList.length > 0 && (
                      <div className="space-y-2">
                        {lopList.map(({ emp, absentDays }) => {
                          const present = absentDays !== '' ? Math.max(0, workingDays - Number(absentDays)) : workingDays;
                          return (
                            <div key={emp.employee_id}
                              className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800 truncate">{emp.employee_name}</p>
                                <p className="text-xs text-slate-500">{emp.employee_id}{emp.department ? ` · ${emp.department}` : ''}</p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="text-right">
                                  <label className="text-xs text-slate-500 block">Absent Days</label>
                                  <Input
                                    type="number"
                                    value={absentDays}
                                    onChange={e => setLopDays(emp.employee_id, e.target.value)}
                                    className="h-8 w-20 text-sm text-center border-red-300 bg-white"
                                    min={0} max={workingDays}
                                    placeholder="0"
                                  />
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-slate-400">Present</p>
                                  <p className="text-sm font-bold text-slate-700">{present} days</p>
                                </div>
                                <button type="button" onClick={() => removeLop(emp.employee_id)}
                                  className="p-1.5 rounded-lg hover:bg-red-200 text-red-400 hover:text-red-600 transition-colors">
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION B — Exclude employees */}
              <div className="rounded-xl border border-amber-100 overflow-hidden">
                <div className="bg-amber-50 px-4 py-3 border-b border-amber-100">
                  <p className="text-sm font-semibold text-amber-800">⛔ Exclude Employees — Skip anyone this month?</p>
                  <p className="text-xs text-amber-600 mt-0.5">Search and add employees who should NOT get a payslip this month (e.g. on leave without pay, new joiner mid-month).</p>
                </div>
                <div className="p-4 space-y-3">
                  <EmpSearch
                    employees={employees}
                    exclude={[...excludedIds]}
                    placeholder="Search to exclude an employee this month…"
                    onSelect={addExclude}
                  />
                  {excludeList.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-2">No exclusions — all active employees included</p>
                  )}
                  {excludeList.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {excludeList.map(emp => (
                        <div key={emp.employee_id}
                          className="flex items-center gap-2 bg-amber-100 border border-amber-200 rounded-full pl-3 pr-2 py-1.5">
                          <div>
                            <p className="text-xs font-semibold text-amber-900">{emp.employee_name}</p>
                            <p className="text-xs text-amber-600">{emp.employee_id}</p>
                          </div>
                          <button type="button" onClick={() => removeExclude(emp.employee_id)}
                            className="w-5 h-5 rounded-full bg-amber-200 hover:bg-amber-300 flex items-center justify-center text-amber-700 transition-colors">
                            <X size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION C — Extras (bonus, overtime, TDS) */}
              {hasExtras && (
                <div className="rounded-xl border border-orange-100 overflow-hidden">
                  <div className="bg-orange-50 px-4 py-3 border-b border-orange-100">
                    <p className="text-sm font-semibold text-orange-800">
                      <Settings2 size={14} className="inline mr-1.5" />
                      Extra Adjustments — Bonus, Overtime, TDS
                    </p>
                    <p className="text-xs text-orange-600 mt-0.5">Search and add employees who have extra earnings or deductions this month.</p>
                  </div>
                  <div className="p-4 space-y-3">
                    <EmpSearch
                      employees={employees}
                      exclude={[...extrasIds]}
                      placeholder="Search to add bonus / overtime / TDS for an employee…"
                      onSelect={addExtras}
                    />
                    {extrasList.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-2">No extra adjustments this month</p>
                    )}
                    {extrasList.length > 0 && (
                      <div className="space-y-2">
                        {extrasList.map(item => (
                          <div key={item.emp.employee_id}
                            className="flex flex-wrap items-center gap-3 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2.5">
                            <div className="min-w-[140px]">
                              <p className="text-sm font-medium text-slate-800">{item.emp.employee_name}</p>
                              <p className="text-xs text-slate-500">{item.emp.employee_id}</p>
                            </div>
                            {extraCols.map(col => (
                              <div key={col.key} className="text-center">
                                <label className="text-xs text-slate-500 block">{col.label} (₹)</label>
                                <Input
                                  type="number"
                                  value={item[col.key] || ''}
                                  onChange={e => setExtrasVal(item.emp.employee_id, col.key, e.target.value)}
                                  className="h-8 w-24 text-sm text-center"
                                  placeholder="0"
                                  min={0}
                                />
                              </div>
                            ))}
                            <button type="button" onClick={() => removeExtras(item.emp.employee_id)}
                              className="p-1.5 rounded-lg hover:bg-orange-200 text-orange-400 hover:text-orange-600 ml-auto">
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION D — Salary Override (for retroactive / different pay months) */}
              <div className="rounded-xl border border-purple-100 overflow-hidden">
                <div className="bg-purple-50 px-4 py-3 border-b border-purple-100">
                  <p className="text-sm font-semibold text-purple-800">💰 Different Salary This Month?</p>
                  <p className="text-xs text-purple-600 mt-0.5">
                    Use this for past months where an employee was paid less than their current salary.
                    Leave blank for everyone unless their salary was different this month.
                  </p>
                </div>
                <div className="p-4 space-y-3">
                  <EmpSearch
                    employees={employees}
                    exclude={[...overrideIds, ...excludedIds]}
                    placeholder="Search employee to enter a different salary for this month…"
                    onSelect={addOverride}
                  />
                  {salaryOverrides.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-2">
                      No overrides — all employees use their current master salary
                    </p>
                  )}
                  {salaryOverrides.length > 0 && (
                    <div className="space-y-2">
                      {salaryOverrides.map(({ emp, salary }) => (
                        <div key={emp.employee_id}
                          className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{emp.employee_name}</p>
                            <p className="text-xs text-slate-500">
                              {emp.employee_id} · Current master salary: ₹{Number(emp.salary||0).toLocaleString('en-IN')}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <label className="text-xs text-slate-500 block mb-1">Gross Salary for this month (₹)</label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                              <Input
                                type="number"
                                value={salary}
                                onChange={e => setOverrideSalary(emp.employee_id, e.target.value)}
                                className="h-8 w-36 text-sm pl-6 text-right border-purple-300 bg-white"
                                placeholder="e.g. 25000"
                                min={0}
                              />
                            </div>
                          </div>
                          <button type="button" onClick={() => removeOverride(emp.employee_id)}
                            className="p-1.5 rounded-lg hover:bg-purple-200 text-purple-400 hover:text-purple-600 transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Summary before generate */}
              <div className="rounded-xl border-2 border-slate-800 bg-slate-900 text-white p-4">
                <p className="text-sm font-semibold mb-2">📋 Summary — {MONTHS[month]} {year}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-400">{selectedCount}</p>
                    <p className="text-xs text-slate-400">Will get payslip</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-400">{lopList.length}</p>
                    <p className="text-xs text-slate-400">With LOP</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-400">{excludeList.length}</p>
                    <p className="text-xs text-slate-400">Excluded</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-400">{extrasList.length}</p>
                    <p className="text-xs text-slate-400">With extras</p>
                  </div>
                </div>
              </div>

              <button
                onClick={generate}
                disabled={genLoading || selectedCount === 0}
                style={{
                  width: '100%',
                  padding: '14px 20px',
                  background: genLoading || selectedCount === 0 ? '#CBD5E1' : 'linear-gradient(135deg, #F97316, #EA580C)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: genLoading || selectedCount === 0 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  boxShadow: genLoading || selectedCount === 0 ? 'none' : '0 4px 14px rgba(234,88,12,0.35)',
                  transition: 'all 0.15s ease',
                  letterSpacing: '0.01em',
                }}
                onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = 'linear-gradient(135deg, #EA580C, #C2410C)'; }}
                onMouseLeave={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = 'linear-gradient(135deg, #F97316, #EA580C)'; }}
              >
                <FileText size={18} />
                {genLoading
                  ? '⏳ Generating Payslips…'
                  : selectedCount === 0
                    ? 'Select employees above to generate'
                    : `🚀 Generate ${selectedCount} Payslips — ${MONTHS[month]} ${year}`}
              </button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Step 2 — Send Emails */}
      <Card>
        <CardContent className="py-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 text-sm font-bold flex items-center justify-center shrink-0">2</div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900">Send Emails</p>
              <p className="text-sm text-slate-500 mt-0.5">
                {pendingEmail.length > 0
                  ? `${pendingEmail.length} payslip${pendingEmail.length > 1 ? 's' : ''} ready to send.`
                  : emailedCount > 0 ? 'All emails sent.' : 'Generate payslips first, then send.'}
              </p>
            </div>
            {emailedCount > 0 && emailedCount === thisMonthSlips.length && (
              <Badge className="bg-green-100 text-green-700 border-green-200 shrink-0">All Sent</Badge>
            )}
          </div>

          {thisMonthSlips.length > 0 && (
            <div className="rounded-lg border border-slate-100 overflow-hidden max-h-56 overflow-y-auto">
              <div className="bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 border-b border-slate-100">
                {MONTHS[month]} {year} — {thisMonthSlips.length} payslips generated
              </div>
              {thisMonthSlips.map(p => (
                <div key={p.id} className="px-4 py-2 flex items-center justify-between text-sm border-b border-slate-50 last:border-0">
                  <div>
                    <span className="font-medium text-slate-800">{p.employee_name}</span>
                    <span className="text-slate-400 ml-2 text-xs">{p.employee_id}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs">
                      <p className="font-semibold text-slate-700">{fmt(p.net_salary || p.salary)}</p>
                      {p.lop_days > 0 && <p className="text-red-500">LOP: {p.lop_days}d</p>}
                    </div>
                    {p.emailed
                      ? <Badge className="bg-green-100 text-green-700 border-green-200 text-xs"><CheckCircle2 size={10} className="mr-1" />Sent</Badge>
                      : <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-xs">Pending</Badge>
                    }
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button
            onClick={sendEmails}
            disabled={sendLoading || thisMonthSlips.length === 0 || pendingEmail.length === 0}
            className="w-full bg-green-600 hover:bg-green-700 text-white h-10"
          >
            <Mail size={15} className="mr-2" />
            {sendLoading ? 'Sending…' : `Send ${pendingEmail.length || ''} Emails`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
