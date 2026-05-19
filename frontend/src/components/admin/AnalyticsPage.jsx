import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { Download, TrendingUp, Users, DollarSign, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

const MONTHS    = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const COLORS    = ['#1A7A4A','#22C55E','#4ADE80','#16A34A','#15803D','#86EFAC','#BBF7D0','#052e16'];
const fmtShort  = (n) => { if (n >= 100000) return `₹${(n/100000).toFixed(1)}L`; if (n >= 1000) return `₹${(n/1000).toFixed(0)}K`; return `₹${n}`; };
const fmt       = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' && p.value > 1000 ? fmtShort(p.value) : p.value}</p>
      ))}
    </div>
  );
};

const Section = ({ title, subtitle, children, action }) => (
  <Card>
    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </Card>
);

export default function AnalyticsPage() {
  const now   = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [fromMonth, setFromMonth] = useState(1);
  const [fromYear, setFromYear]   = useState(now.getFullYear());
  const [toMonth, setToMonth]     = useState(now.getMonth() + 1);
  const [toYear, setToYear]       = useState(now.getFullYear());
  const [downloadLoading, setDownloadLoading] = useState({});

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.get('/employees').then(r => r.data),
  });
  const { data: payslips = [] } = useQuery({
    queryKey: ['payslips'],
    queryFn: () => api.get('/payslips').then(r => r.data),
  });

  // ── Filtered payslips by date range ────────────────────────────────────────
  const filteredPayslips = useMemo(() => {
    return payslips.filter(p => {
      const py = Number(p.year), pm = Number(p.month);
      const afterFrom = py > fromYear || (py === fromYear && pm >= fromMonth);
      const beforeTo  = py < toYear  || (py === toYear  && pm <= toMonth);
      return afterFrom && beforeTo;
    });
  }, [payslips, fromMonth, fromYear, toMonth, toYear]);

  // ── Department payroll ──────────────────────────────────────────────────────
  const deptPayroll = useMemo(() => {
    const map = {};
    employees.forEach(e => {
      const d = e.department || 'Unassigned';
      if (!map[d]) map[d] = { name: d, payroll: 0, count: 0, avg: 0 };
      map[d].payroll += Number(e.salary) || 0;
      map[d].count   += 1;
    });
    return Object.values(map).map(d => ({ ...d, avg: d.count ? Math.round(d.payroll / d.count) : 0 }))
      .sort((a, b) => b.payroll - a.payroll);
  }, [employees]);

  // ── Salary distribution bands ───────────────────────────────────────────────
  const salaryBands = useMemo(() => {
    const bands = [
      { name: '<20K', min: 0, max: 20000 },
      { name: '20–40K', min: 20000, max: 40000 },
      { name: '40–60K', min: 40000, max: 60000 },
      { name: '60–100K', min: 60000, max: 100000 },
      { name: '100K+', min: 100000, max: Infinity },
    ];
    return bands.map(b => ({
      name: b.name,
      employees: employees.filter(e => (Number(e.salary) || 0) >= b.min && (Number(e.salary) || 0) < b.max).length,
    }));
  }, [employees]);

  // ── Monthly payroll trend for selected year ─────────────────────────────────
  const monthlyTrend = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const m  = i + 1;
      const ps = filteredPayslips.filter(p => Number(p.month) === m && Number(p.year) === year);
      return {
        name:    MONTHS[m],
        payroll: ps.reduce((s, p) => s + (Number(p.net_salary || p.salary) || 0), 0),
        count:   ps.length,
      };
    });
  }, [filteredPayslips, year]);

  // ── Top/bottom earners ──────────────────────────────────────────────────────
  const sorted      = useMemo(() => [...employees].sort((a, b) => (Number(b.salary) || 0) - (Number(a.salary) || 0)), [employees]);
  const topEarners  = sorted.slice(0, 8).map(e => ({ name: e.employee_name, salary: Number(e.salary) || 0, dept: e.department || '' }));
  const deptPie     = deptPayroll.map((d, i) => ({ ...d, fill: COLORS[i % COLORS.length] }));

  // ── Employee count by dept for pie ──────────────────────────────────────────
  const headcountPie = deptPayroll.map((d, i) => ({ name: d.name, value: d.count, fill: COLORS[i % COLORS.length] }));

  const downloadReport = async (id, label) => {
    setDownloadLoading(l => ({ ...l, [id]: true }));
    try {
      const res = await fetch(`/api/analytics/${id}?format=pdf&year=${year}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('payslip_token')}` },
      });
      if (!res.ok) { toast.error('Could not generate report'); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `${label.replace(/\s+/g,'_')}_${year}.pdf`;
      document.body.appendChild(a); a.click();
      URL.revokeObjectURL(url); document.body.removeChild(a);
      toast.success(`${label} downloaded`);
    } catch { toast.error('Error generating report'); }
    finally { setDownloadLoading(l => ({ ...l, [id]: false })); }
  };

  const isEmpty = employees.length === 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header + year filter */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics & Insights</h1>
          <p className="text-sm text-slate-500 mt-0.5">Live charts and management intelligence</p>
        </div>
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          {[2023, 2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Date range filter bar */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24, padding:'14px 18px', background:'#F0FDF4', borderRadius:12, border:'1px solid #BBF7D0', flexWrap:'wrap' }}>
        <span style={{ fontSize:13, fontWeight:600, color:'#166534' }}>Date Range:</span>
        {/* From */}
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:12, color:'#64748B' }}>From</span>
          <select value={fromMonth} onChange={e => setFromMonth(Number(e.target.value))} style={{ fontSize:12, padding:'5px 8px', borderRadius:6, border:'1px solid #D1FAE5' }}>
            {MONTHS.slice(1).map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <input type="number" value={fromYear} onChange={e => setFromYear(Number(e.target.value))} min={2020} max={2030} style={{ width:72, fontSize:12, padding:'5px 8px', borderRadius:6, border:'1px solid #D1FAE5' }} />
        </div>
        {/* To */}
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <span style={{ fontSize:12, color:'#64748B' }}>To</span>
          <select value={toMonth} onChange={e => setToMonth(Number(e.target.value))} style={{ fontSize:12, padding:'5px 8px', borderRadius:6, border:'1px solid #D1FAE5' }}>
            {MONTHS.slice(1).map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <input type="number" value={toYear} onChange={e => setToYear(Number(e.target.value))} min={2020} max={2030} style={{ width:72, fontSize:12, padding:'5px 8px', borderRadius:6, border:'1px solid #D1FAE5' }} />
        </div>
        <span style={{ fontSize:11, color:'#94A3B8' }}>Showing data for selected period</span>
      </div>

      {isEmpty && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-5 py-4 text-sm text-amber-800">
          No employee data yet. Add employees to see analytics charts.
        </div>
      )}

      {/* Row 1: Monthly trend + Department payroll */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <Section title={`Monthly Payroll Trend — ${year}`} subtitle="Total disbursement each month">
          <div className="px-2 py-4 h-56">
            {monthlyTrend.every(m => m.payroll === 0) ? (
              <div className="h-full flex items-center justify-center text-slate-300 text-sm">No payslip data for {year}</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyTrend} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={fmtShort} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={50} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="payroll" name="Payroll" fill="#3b82f6" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Section>

        <Section title="Department Payroll Cost" subtitle="Monthly payroll by department">
          <div className="px-2 py-4 h-56">
            {deptPayroll.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-300 text-sm">Add departments to employees</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptPayroll} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                  <XAxis type="number" tickFormatter={fmtShort} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="payroll" name="Payroll" fill="#10b981" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Section>
      </div>

      {/* Row 2: Salary bands + Headcount pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <Section title="Salary Distribution" subtitle="Number of employees in each salary band">
          <div className="px-2 py-4 h-52">
            {employees.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-300 text-sm">No data</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salaryBands} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<Tip />} />
                  <Bar dataKey="employees" name="Employees" fill="#8b5cf6" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Section>

        <Section title="Headcount by Department" subtitle="Employees in each department">
          <div className="px-4 py-4 h-52 flex items-center">
            {headcountPie.length === 0 ? (
              <div className="w-full text-center text-slate-300 text-sm">No departments set</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={headcountPie} cx="40%" cy="50%" outerRadius={80} dataKey="value" paddingAngle={3}>
                    {headcountPie.map((d, i) => <Cell key={i} fill={d.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [`${v} employees`, n]} />
                  <Legend iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Section>
      </div>

      {/* Row 3: Top earners bar chart */}
      <Section
        title="Top Earners"
        subtitle="Highest paid employees"
        action={
          <Button variant="outline" className="h-8 text-xs" onClick={() => downloadReport('high-earners', 'Top Earners')}>
            <Download size={12} className="mr-1" /> Export
          </Button>
        }
      >
        <div className="px-2 py-4 h-56">
          {topEarners.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-300 text-sm">No employees yet</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topEarners} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tickFormatter={fmtShort} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip content={<Tip />} />
                <Bar dataKey="salary" name="Salary" fill="#f59e0b" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </Section>

      {/* Row 4: Department avg salary table */}
      <Section title="Department Summary" subtitle="Payroll cost and headcount per department">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {['Department','Employees','Total Payroll','Avg Salary','% of Total'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {deptPayroll.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400 text-sm">No department data. Add departments to employees.</td></tr>
              ) : (() => {
                const total = deptPayroll.reduce((s, d) => s + d.payroll, 0);
                return deptPayroll.map((d, i) => (
                  <tr key={d.name} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full inline-block shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="font-medium text-slate-800">{d.name}</span>
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">{d.count}</td>
                    <td className="px-5 py-3 font-semibold text-slate-800">{fmt(d.payroll)}</td>
                    <td className="px-5 py-3 text-slate-600">{fmt(d.avg)}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full"
                            style={{ width: total ? `${(d.payroll / total) * 100}%` : '0%', background: COLORS[i % COLORS.length] }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 w-8">{total ? `${Math.round((d.payroll / total) * 100)}%` : '0%'}</span>
                      </div>
                    </td>
                  </tr>
                ));
              })()}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Downloadable reports */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Download Detailed Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { id: 'salary-distribution',  label: 'Salary Distribution',    desc: 'Band-wise employee count' },
            { id: 'department-payroll',   label: 'Department Payroll Cost', desc: 'Cost breakdown by dept' },
            { id: 'salary-trends',        label: 'Salary Trends',           desc: 'Month-over-month changes' },
            { id: 'net-vs-gross',         label: 'Net vs Gross Analysis',   desc: 'Take-home vs gross salary' },
            { id: 'employee-growth',      label: 'Employee Growth',         desc: 'Headcount over time' },
            { id: 'budget-vs-actual',     label: 'Budget vs Actual',        desc: 'Planned vs actual spend' },
          ].map(r => (
            <Card key={r.id}>
              <CardContent className="py-4 px-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{r.label}</p>
                  <p className="text-xs text-slate-500">{r.desc}</p>
                </div>
                <Button size="sm" variant="outline" className="h-8 shrink-0"
                  disabled={downloadLoading[r.id]}
                  onClick={() => downloadReport(r.id, r.label)}>
                  <Download size={12} />
                  {downloadLoading[r.id] ? '…' : 'PDF'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
