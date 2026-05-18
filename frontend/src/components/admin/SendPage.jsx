import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2, AlertCircle, Send, FileText, Users, Mail,
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Settings2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

const MONTHS = ['','January','February','March','April','May','June','July','August','September','October','November','December'];
const fmt    = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

// Build the list of manual components from config
function getManualComponents(config) {
  if (!config) return { manualEarnings: [], manualDeductions: [], hasLop: false };
  const manualEarnings   = (config.earnings   || []).filter(c => c.enabled && c.type === 'manual');
  const manualDeductions = (config.deductions  || []).filter(c => c.enabled && c.type === 'manual');
  const lopComp          = (config.deductions  || []).find(c => c.enabled && c.type === 'lop');
  return { manualEarnings, manualDeductions, hasLop: !!lopComp };
}

export default function SendPage() {
  const qc  = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  const [workingDays,  setWorkingDays]  = useState(26);
  const [adjustments,  setAdjustments]  = useState({});   // { [employee_id]: { present_days, overtime, ... } }
  const [showAdj,      setShowAdj]      = useState(false);
  const [genLoading,   setGenLoading]   = useState(false);
  const [sendLoading,  setSendLoading]  = useState(false);

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.get('/employees').then(r => r.data),
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
  // All manual columns to show in the adjustments table
  const adjCols = [
    hasLop && { key: 'present_days', label: 'Present Days', placeholder: workingDays },
    ...manualEarnings.map(c  => ({ key: c.key, label: `${c.label} (₹)`,  placeholder: '0' })),
    ...manualDeductions.map(c => ({ key: c.key, label: `${c.label} (₹)`, placeholder: '0' })),
  ].filter(Boolean);

  const thisMonthSlips = allPayslips.filter(
    p => String(p.month) === String(month) && String(p.year) === String(year)
  );
  const emailedCount = thisMonthSlips.filter(p => p.emailed).length;
  const pendingEmail = thisMonthSlips.filter(p => !p.emailed);
  const totalPayroll = thisMonthSlips.reduce((s, p) => s + (Number(p.net_salary || p.salary) || 0), 0);

  // Block navigation more than 1 month into the future
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

  const setAdj = (empId, key, value) =>
    setAdjustments(prev => ({
      ...prev,
      [empId]: { ...(prev[empId] || {}), [key]: value },
    }));

  const generate = async () => {
    // Confirmation before overwriting existing payslips
    if (thisMonthSlips.length > 0) {
      const ok = window.confirm(
        `This will overwrite all ${thisMonthSlips.length} existing payslip(s) for ${MONTHS[month]} ${year}.\n\nContinue?`
      );
      if (!ok) return;
    }
    setGenLoading(true);
    try {
      await api.post('/payslips/generate', {
        month,
        year,
        working_days: workingDays,
        adjustments,
      });
      toast.success(`Payslips generated for ${MONTHS[month]} ${year}`);
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
      // Use shared api axios instance (handles auth token automatically)
      const res = await api.post('/email/send', { month, year });
      toast.success(res.data.message || 'Emails sent');
      qc.invalidateQueries({ queryKey: ['payslips'] });
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Email send failed');
    } finally {
      setSendLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Generate & Send Payslips</h1>
        <p className="text-sm text-slate-500 mt-0.5">Select month → enter adjustments → generate → send emails</p>
      </div>

      {/* Month selector */}
      <Card>
        <CardContent className="py-5">
          <div className="flex items-center justify-between max-w-xs mx-auto">
            <button type="button" onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
              <ChevronLeft size={20} />
            </button>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">{MONTHS[month]}</p>
              <p className="text-slate-500 text-sm">{year}</p>
            </div>
            <button type="button" onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Employees',    value: employees.length,        icon: Users },
          { label: 'Payslips Generated', value: thisMonthSlips.length,   icon: FileText },
          { label: 'Emails Sent',        value: emailedCount,            icon: Mail },
          { label: 'Total Net Payroll',  value: fmt(totalPayroll),       icon: Send },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="py-4 px-4">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Step 1 — Generate */}
      <Card>
        <CardContent className="py-5 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center shrink-0">1</div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900">Generate Payslips</p>
              <p className="text-sm text-slate-500 mt-0.5">
                Calculates all earnings and deductions for all {employees.length} employees using your
                {' '}<strong>Payroll Config</strong> (PF, ESI, LOP, allowances, etc.).
                {thisMonthSlips.length > 0 && <span className="text-amber-600 ml-1">({thisMonthSlips.length} already exist — regenerating will overwrite.)</span>}
              </p>
            </div>
            {thisMonthSlips.length > 0 && <Badge className="bg-green-100 text-green-700 border-green-200 shrink-0">Done</Badge>}
          </div>

          {employees.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <AlertCircle size={15} /> No employees found. Add employees before generating payslips.
            </div>
          )}

          {/* Working days */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Working Days This Month:</label>
              <Input
                type="number"
                value={workingDays}
                onChange={e => setWorkingDays(parseInt(e.target.value) || 26)}
                className="h-8 w-20 text-sm"
                min={1} max={31}
              />
            </div>
            <p className="text-xs text-slate-400">Used to calculate daily rate for LOP deductions.</p>
          </div>

          {/* Per-employee adjustments toggle */}
          {employees.length > 0 && adjCols.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowAdj(v => !v)}
                className="flex items-center gap-2 text-sm font-medium hover:opacity-80" style={{ color: '#E85C2F' }}
              >
                <Settings2 size={15} />
                Per-Employee Adjustments (LOP, Overtime, Incentive, Bonus, TDS…)
                {showAdj ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showAdj && (
                <div className="mt-3 rounded-lg border border-slate-200 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2.5 text-left font-semibold text-slate-600 sticky left-0 bg-slate-50 min-w-[140px]">Employee</th>
                        {adjCols.map(col => (
                          <th key={col.key} className="px-3 py-2.5 text-left font-semibold text-slate-600 whitespace-nowrap min-w-[100px]">
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {employees.map(emp => (
                        <tr key={emp.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2 sticky left-0 bg-white">
                            <p className="font-medium text-slate-800">{emp.employee_name}</p>
                            <p className="text-slate-400">{emp.employee_id}</p>
                          </td>
                          {adjCols.map(col => (
                            <td key={col.key} className="px-3 py-2">
                              <Input
                                type="number"
                                placeholder={String(col.placeholder)}
                                value={(adjustments[emp.employee_id] || {})[col.key] || ''}
                                onChange={e => setAdj(emp.employee_id, col.key, e.target.value)}
                                className="h-7 text-xs w-24"
                                min={0}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 text-xs text-blue-700">
                    Leave blank to use defaults. Present Days defaults to {workingDays} (full month).
                  </div>
                </div>
              )}
            </div>
          )}

          <Button
            onClick={generate}
            disabled={genLoading || employees.length === 0}
            className="w-full text-white h-10" style={{ background: '#E85C2F' }}
          >
            <FileText size={15} className="mr-2" />
            {genLoading ? 'Generating…' : `Generate Payslips for ${MONTHS[month]} ${year}`}
          </Button>
        </CardContent>
      </Card>

      {/* Step 2 — Send Emails */}
      <Card>
        <CardContent className="py-5 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 text-sm font-bold flex items-center justify-center shrink-0">2</div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900">Send Emails</p>
              <p className="text-sm text-slate-500 mt-0.5">
                {pendingEmail.length > 0
                  ? `${pendingEmail.length} payslip${pendingEmail.length > 1 ? 's' : ''} pending.`
                  : emailedCount > 0 ? 'All emails sent.' : 'Generate payslips first.'}
              </p>
            </div>
            {emailedCount > 0 && emailedCount === thisMonthSlips.length && (
              <Badge className="bg-green-100 text-green-700 border-green-200 shrink-0">All Sent</Badge>
            )}
          </div>

          {/* Payslip list */}
          {thisMonthSlips.length > 0 && (
            <div className="rounded-lg border border-slate-100 overflow-hidden max-h-56 overflow-y-auto">
              <div className="bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 border-b border-slate-100">
                {MONTHS[month]} {year} — {thisMonthSlips.length} employees
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
                      {p.total_deductions > 0 && <p className="text-slate-400">Deductions: {fmt(p.total_deductions)}</p>}
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
