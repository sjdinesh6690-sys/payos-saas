import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users, FileText, DollarSign, TrendingUp, Building2,
  Plus, Upload, Send, BarChart3, ArrowRight, CheckCircle2, Clock,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const fmtShort = (n) => {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)   return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const PIE_COLORS  = ['#E85C2F','#10b981','#f59e0b','#8b5cf6','#06b6d4','#3b82f6','#f97316'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {fmtShort(p.value)}</p>
      ))}
    </div>
  );
};

export default function DashboardPage() {
  const navigate = useNavigate();

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.get('/employees').then(r => r.data),
  });
  const { data: payslips = [] } = useQuery({
    queryKey: ['payslips'],
    queryFn: () => api.get('/payslips').then(r => r.data),
  });

  const now       = new Date();
  const thisMonth = now.getMonth() + 1;
  const thisYear  = now.getFullYear();

  // ── Core stats ──────────────────────────────────────────────────────────────
  const totalPayroll    = employees.reduce((s, e) => s + (Number(e.salary) || 0), 0);
  const avgSalary       = employees.length ? totalPayroll / employees.length : 0;
  const thisMonthSlips  = payslips.filter(p => p.month === thisMonth && p.year === thisYear);
  const pendingPayslips = employees.length - thisMonthSlips.length;
  const departments     = [...new Set(employees.map(e => e.department).filter(Boolean))];
  const emailedCount    = thisMonthSlips.filter(p => p.emailed).length;

  const stats = [
    { label: 'Total Employees',     value: employees.length,         icon: Users,      iconBg: '#FFF1ED', iconColor: '#E85C2F' },
    { label: 'Monthly Payroll',     value: fmtShort(totalPayroll),   icon: DollarSign, iconBg: '#E8F5E9', iconColor: '#16a34a' },
    { label: 'Avg Salary',          value: fmtShort(avgSalary),      icon: TrendingUp, iconBg: '#F3E8FF', iconColor: '#7c3aed' },
    { label: 'This Month Payslips', value: thisMonthSlips.length,    icon: FileText,   iconBg: '#FFF8E1', iconColor: '#d97706' },
    { label: 'Departments',         value: departments.length,       icon: Building2,  iconBg: '#E0F7FA', iconColor: '#0891b2' },
    { label: 'Emails Sent',         value: emailedCount,             icon: Send,       iconBg: '#EDE9FE', iconColor: '#6d28d9' },
  ];

  // ── Monthly payroll trend (last 6 months) ───────────────────────────────────
  const monthlyTrend = useMemo(() => {
    const result = [];
    for (let i = 5; i >= 0; i--) {
      const d  = new Date(thisYear, thisMonth - 1 - i, 1);
      const m  = d.getMonth() + 1;
      const y  = d.getFullYear();
      const ps = payslips.filter(p => p.month === m && p.year === y);
      result.push({
        name:  `${MONTH_NAMES[m - 1]} ${y !== thisYear ? `'${String(y).slice(2)}` : ''}`.trim(),
        total: ps.reduce((s, p) => s + (Number(p.net_salary || p.salary) || 0), 0),
        count: ps.length,
      });
    }
    return result;
  }, [payslips, thisMonth, thisYear]);

  // ── Department payroll ───────────────────────────────────────────────────────
  const deptData = useMemo(() => {
    const map = {};
    employees.forEach(e => {
      const dept = e.department || 'Unassigned';
      if (!map[dept]) map[dept] = { name: dept, payroll: 0, count: 0 };
      map[dept].payroll += Number(e.salary) || 0;
      map[dept].count   += 1;
    });
    return Object.values(map).sort((a, b) => b.payroll - a.payroll).slice(0, 8);
  }, [employees]);

  // ── Salary distribution ──────────────────────────────────────────────────────
  const salaryDist = useMemo(() => {
    const bands = [
      { name: '< ₹20K',       min: 0,      max: 20000 },
      { name: '₹20–40K',      min: 20000,  max: 40000 },
      { name: '₹40–60K',      min: 40000,  max: 60000 },
      { name: '₹60–100K',     min: 60000,  max: 100000 },
      { name: '₹100K+',       min: 100000, max: Infinity },
    ];
    return bands
      .map(b => ({ name: b.name, value: employees.filter(e => (Number(e.salary) || 0) >= b.min && (Number(e.salary) || 0) < b.max).length }))
      .filter(b => b.value > 0);
  }, [employees]);

  // ── Top earners ──────────────────────────────────────────────────────────────
  const topEarners = useMemo(() =>
    [...employees].sort((a, b) => (Number(b.salary) || 0) - (Number(a.salary) || 0)).slice(0, 6),
    [employees]);

  // ── Recent payslips ──────────────────────────────────────────────────────────
  const recentPayslips = useMemo(() =>
    [...payslips]
      .sort((a, b) => b.year - a.year || b.month - a.month || b.id - a.id)
      .slice(0, 5),
    [payslips]);

  const isEmpty = employees.length === 0;

  return (
    <div className="p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {MONTH_NAMES[thisMonth - 1]} {thisYear} · Overview
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="h-9" onClick={() => navigate('/admin/upload')}>
            <Upload size={14} className="mr-1.5" /> Import Data
          </Button>
          <Button className="h-9 text-white" style={{ background: '#E85C2F' }} onClick={() => navigate('/admin/send')}>
            <Send size={14} className="mr-1.5" /> Generate Payslips
          </Button>
        </div>
      </div>

      {/* ── Monthly Workflow Guide — always visible ─────────────────────────── */}
      <div className="rounded-xl overflow-hidden border border-slate-200 shadow-sm">
        {/* Header */}
        <div className="px-5 py-3 flex items-center gap-2" style={{ background: '#1A7A4A' }}>
          <span className="text-white font-bold text-sm">📋 Monthly Payroll Steps — Follow This Order Every Month</span>
        </div>

        {/* Steps row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 bg-white divide-x divide-y lg:divide-y-0 divide-slate-100">
          {/* Step 1 — Add Employees */}
          {(() => {
            const done = employees.length > 0;
            const isNext = !done;
            return (
              <button
                type="button"
                onClick={() => navigate('/admin/employees')}
                className="flex flex-col items-start gap-2 p-4 text-left hover:bg-green-50 transition-all group"
                style={{ background: isNext ? '#F0FDF4' : 'white' }}
              >
                <div className="flex items-center gap-2 w-full">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 text-white"
                    style={{ background: done ? '#16a34a' : isNext ? '#1A7A4A' : '#cbd5e1' }}>
                    {done ? '✓' : '1'}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wide" style={{ color: done ? '#16a34a' : isNext ? '#1A7A4A' : '#94a3b8' }}>
                    {done ? 'Done' : 'Do This First'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">① Add Employees</p>
                  <p className="text-xs text-slate-500 mt-0.5">Enter all staff names, IDs, department & salary</p>
                  <p className="text-xs font-semibold mt-1" style={{ color: '#1A7A4A' }}>
                    {employees.length} employee{employees.length !== 1 ? 's' : ''} added
                  </p>
                </div>
              </button>
            );
          })()}

          {/* Step 2 — Upload Salaries */}
          {(() => {
            const step1Done = employees.length > 0;
            const done = step1Done; // If employees exist, salaries are likely configured
            const isNext = step1Done && thisMonthSlips.length === 0;
            return (
              <button
                type="button"
                onClick={() => navigate('/admin/upload')}
                className="flex flex-col items-start gap-2 p-4 text-left hover:bg-blue-50 transition-all"
                style={{ background: isNext ? '#EFF6FF' : 'white' }}
              >
                <div className="flex items-center gap-2 w-full">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 text-white"
                    style={{ background: done ? '#3b82f6' : isNext ? '#1d4ed8' : '#cbd5e1' }}>
                    2
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wide" style={{ color: isNext ? '#1d4ed8' : '#94a3b8' }}>
                    {isNext ? 'Do This Next' : 'Step 2'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">② Upload Salaries</p>
                  <p className="text-xs text-slate-500 mt-0.5">Import CSV/Excel with this month's salary data</p>
                  <p className="text-xs font-semibold mt-1 text-blue-600">
                    Update salaries if changed this month
                  </p>
                </div>
              </button>
            );
          })()}

          {/* Step 3 — Generate & Send */}
          {(() => {
            const step2Done = employees.length > 0;
            const done = thisMonthSlips.length > 0 && emailedCount === thisMonthSlips.length;
            const inProgress = thisMonthSlips.length > 0 && emailedCount < thisMonthSlips.length;
            const isNext = step2Done && thisMonthSlips.length === 0;
            return (
              <button
                type="button"
                onClick={() => navigate('/admin/send')}
                className="flex flex-col items-start gap-2 p-4 text-left hover:bg-orange-50 transition-all"
                style={{ background: isNext ? '#FFF7ED' : 'white' }}
              >
                <div className="flex items-center gap-2 w-full">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 text-white"
                    style={{ background: done ? '#16a34a' : inProgress ? '#f97316' : isNext ? '#ea580c' : '#cbd5e1' }}>
                    {done ? '✓' : '3'}
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wide" style={{ color: isNext ? '#ea580c' : inProgress ? '#f97316' : '#94a3b8' }}>
                    {done ? 'Done' : inProgress ? 'In Progress' : isNext ? 'Do This Next' : 'Step 3'}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">③ Generate &amp; Send</p>
                  <p className="text-xs text-slate-500 mt-0.5">Create payslips and email them to staff</p>
                  <p className="text-xs font-semibold mt-1" style={{ color: '#ea580c' }}>
                    {thisMonthSlips.length > 0
                      ? `${thisMonthSlips.length} payslips · ${emailedCount} emailed`
                      : 'No payslips yet this month'}
                  </p>
                </div>
              </button>
            );
          })()}

          {/* Step 4 — Download Reports */}
          {(() => {
            const done = thisMonthSlips.length > 0;
            return (
              <button
                type="button"
                onClick={() => navigate('/admin/reports')}
                className="flex flex-col items-start gap-2 p-4 text-left hover:bg-purple-50 transition-all"
              >
                <div className="flex items-center gap-2 w-full">
                  <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 text-white"
                    style={{ background: done ? '#7c3aed' : '#cbd5e1' }}>
                    4
                  </span>
                  <span className="text-xs font-bold uppercase tracking-wide text-slate-400">Step 4</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">④ Download Reports</p>
                  <p className="text-xs text-slate-500 mt-0.5">PF, ESI, Bank Advice, Salary Register</p>
                  <p className="text-xs font-semibold mt-1 text-purple-600">
                    {done ? 'Reports ready to download' : 'Generate payslips first'}
                  </p>
                </div>
              </button>
            );
          })()}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map(({ label, value, icon: Icon, iconBg, iconColor }) => (
          <Card key={label} className="border-0 shadow-sm">
            <CardContent className="pt-4 pb-4 px-4">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs text-slate-500 leading-tight pr-2">{label}</p>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: iconBg }}>
                  <Icon size={15} style={{ color: iconColor }} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Monthly payroll trend */}
        <Card className="lg:col-span-2">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Monthly Payroll Trend</h3>
              <p className="text-xs text-slate-500">Last 6 months total disbursement</p>
            </div>
            <BarChart3 size={16} className="text-slate-300" />
          </div>
          <div className="px-2 py-4 h-52">
            {monthlyTrend.every(m => m.total === 0) ? (
              <div className="h-full flex items-center justify-center text-slate-300 text-sm">No payslip data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={52} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name="Payroll" fill="#E85C2F" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Salary distribution pie */}
        <Card>
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Salary Distribution</h3>
            <p className="text-xs text-slate-500">Employees by salary band</p>
          </div>
          <div className="px-4 py-4 h-52 flex flex-col items-center justify-center">
            {salaryDist.length === 0 ? (
              <span className="text-slate-300 text-sm">No data</span>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={salaryDist} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={3}>
                      {salaryDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [`${v} employees`, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
                  {salaryDist.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-1 text-xs text-slate-600">
                      <span className="w-2 h-2 rounded-full inline-block" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      {d.name} ({d.value})
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Department payroll + Top earners */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Department payroll bar */}
        <Card>
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Department-wise Payroll</h3>
            <p className="text-xs text-slate-500">Monthly cost per department</p>
          </div>
          <div className="px-2 py-4 h-56">
            {deptData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-300 text-sm">Add departments to employees</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptData} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tickFormatter={fmtShort} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="payroll" name="Payroll" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Top earners */}
        <Card>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Top Earners</h3>
              <p className="text-xs text-slate-500">Highest paid employees</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/employees')}
              className="flex items-center gap-1 text-xs hover:opacity-80" style={{ color: '#E85C2F' }}
            >
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {topEarners.length === 0 ? (
              <div className="py-10 text-center text-slate-300 text-sm">No employees yet</div>
            ) : topEarners.map((emp, i) => (
              <div key={emp.id} className="px-5 py-3 flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs flex items-center justify-center font-semibold shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{emp.employee_name}</p>
                  <p className="text-xs text-slate-400">{emp.department || emp.employee_id}</p>
                </div>
                <span className="text-sm font-bold text-slate-700 shrink-0">{fmtShort(emp.salary)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Recent payslips + Payslip status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Recent payslips */}
        <Card>
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Recent Payslips</h3>
              <p className="text-xs text-slate-500">Latest generated payslips</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/admin/payslips')}
              className="flex items-center gap-1 text-xs hover:opacity-80" style={{ color: '#E85C2F' }}
            >
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {recentPayslips.length === 0 ? (
              <div className="py-10 text-center text-slate-300 text-sm">No payslips yet</div>
            ) : recentPayslips.map(p => (
              <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900">{p.employee_name}</p>
                  <p className="text-xs text-slate-400">{MONTH_NAMES[p.month - 1]} {p.year} · {p.employee_id}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-700">{fmt(p.salary)}</p>
                  {p.emailed
                    ? <Badge className="bg-green-100 text-green-700 border-green-200 text-xs mt-0.5">Sent</Badge>
                    : <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs mt-0.5">Pending</Badge>
                  }
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* This month status */}
        <Card>
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">This Month — {MONTH_NAMES[thisMonth - 1]} {thisYear}</h3>
            <p className="text-xs text-slate-500">Payroll processing status</p>
          </div>
          <div className="px-5 py-4 space-y-4">
            {/* Progress bar */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
                <span>Payslips generated</span>
                <span className="font-semibold">{thisMonthSlips.length} / {employees.length}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{ background: '#E85C2F', width: employees.length ? `${(thisMonthSlips.length / employees.length) * 100}%` : '0%' }}
                />
              </div>
            </div>
            {/* Email progress */}
            <div>
              <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
                <span>Payslips emailed</span>
                <span className="font-semibold">{emailedCount} / {thisMonthSlips.length || employees.length}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: thisMonthSlips.length ? `${(emailedCount / thisMonthSlips.length) * 100}%` : '0%' }}
                />
              </div>
            </div>

            {/* Checklist */}
            <div className="space-y-2 pt-2">
              {[
                { label: 'Employees added',         done: employees.length > 0 },
                { label: 'Payslips generated',      done: thisMonthSlips.length > 0 },
                { label: 'Emails sent',             done: emailedCount > 0 },
              ].map(item => (
                <div key={item.label} className="flex items-center gap-2 text-sm">
                  {item.done
                    ? <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                    : <Clock size={16} className="text-slate-300 shrink-0" />
                  }
                  <span className={item.done ? 'text-slate-700' : 'text-slate-400'}>{item.label}</span>
                </div>
              ))}
            </div>

            {/* Quick action */}
            <div className="pt-2 flex gap-2">
              {employees.length === 0 && (
                <Button size="sm" className="flex-1 text-white h-8" style={{ background: '#E85C2F' }} onClick={() => navigate('/admin/upload')}>
                  <Plus size={13} className="mr-1" /> Add Employees
                </Button>
              )}
              {employees.length > 0 && thisMonthSlips.length === 0 && (
                <Button size="sm" className="flex-1 text-white h-8" style={{ background: '#E85C2F' }} onClick={() => navigate('/admin/send')}>
                  <FileText size={13} className="mr-1" /> Generate Payslips
                </Button>
              )}
              {thisMonthSlips.length > 0 && emailedCount < thisMonthSlips.length && (
                <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white h-8" onClick={() => navigate('/admin/send')}>
                  <Send size={13} className="mr-1" /> Send Emails
                </Button>
              )}
              {thisMonthSlips.length > 0 && emailedCount === thisMonthSlips.length && (
                <div className="flex-1 flex items-center justify-center gap-1.5 text-sm text-green-600 font-medium">
                  <CheckCircle2 size={15} /> All done for {MONTH_NAMES[thisMonth - 1]}!
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Quick actions */}
      <Card>
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">Quick Actions</h3>
        </div>
        <div className="px-5 py-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Add Employee',      icon: Plus,      path: '/admin/employees', iconBg: '#FFF1ED', iconColor: '#E85C2F' },
            { label: 'Import CSV',        icon: Upload,    path: '/admin/upload',    iconBg: '#E8F5E9', iconColor: '#16a34a' },
            { label: 'Generate Payslips', icon: FileText,  path: '/admin/send',      iconBg: '#F3E8FF', iconColor: '#7c3aed' },
            { label: 'View Analytics',    icon: BarChart3, path: '/admin/analytics', iconBg: '#FFF8E1', iconColor: '#d97706' },
          ].map(a => (
            <button
              key={a.label}
              type="button"
              onClick={() => navigate(a.path)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium bg-white hover:shadow-md transition-all border border-slate-100 text-slate-700"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: a.iconBg }}>
                <a.icon size={15} style={{ color: a.iconColor }} />
              </div>
              {a.label}
            </button>
          ))}
        </div>
      </Card>
    </div>
  );
}
