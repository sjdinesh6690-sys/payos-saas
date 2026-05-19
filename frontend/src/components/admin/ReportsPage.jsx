import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, Search, Calendar, CalendarRange } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';

const MONTHS = ['','January','February','March','April','May','June','July','August','September','October','November','December'];
const YEARS  = [2022, 2023, 2024, 2025, 2026, 2027];

// Reports that support date ranges (compliance / statutory)
const RANGE_REPORT_IDS = new Set([
  'pf-report','esi-report','professional-tax-report','tds-report',
  'statutory-compliance','quarterly-payroll-summary','annual-payroll-summary',
  'cost-to-company','payslip-audit-trail',
]);

const CATEGORIES = [
  {
    label: 'Payroll Reports',
    reports: [
      { id: 'monthly-payroll-summary',   label: 'Monthly Payroll Summary',     desc: 'Total salaries paid for selected month' },
      { id: 'quarterly-payroll-summary', label: 'Quarterly Payroll Summary',   desc: 'Q1–Q4 salary breakdown — select date range' },
      { id: 'annual-payroll-summary',    label: 'Annual Payroll Summary',      desc: 'Full year salary report — select date range' },
      { id: 'salary-register',           label: 'Salary Register',             desc: 'Detailed payroll register with all employees' },
      { id: 'bank-advice',               label: 'Bank Advice / Transfer List', desc: 'Employee bank transfer details' },
    ],
  },
  {
    label: 'Statutory & Compliance',
    reports: [
      { id: 'pf-report',               label: 'PF Contribution Report',    desc: 'Employee & employer PF contributions — supports date range' },
      { id: 'esi-report',              label: 'ESI Contribution Report',   desc: 'Employee & employer ESI deductions — supports date range' },
      { id: 'professional-tax-report', label: 'Professional Tax Report',   desc: 'State professional tax deductions — supports date range' },
      { id: 'tds-report',              label: 'TDS Report',                desc: 'Tax deducted at source summary — supports date range' },
      { id: 'statutory-compliance',    label: 'Compliance Checklist',      desc: 'PF/ESI/PT filing status — supports date range' },
    ],
  },
  {
    label: 'Employee Reports',
    reports: [
      { id: 'employee-headcount',  label: 'Employee Headcount Report', desc: 'Active employees by department' },
      { id: 'cost-to-company',     label: 'Cost to Company (CTC)',     desc: 'Total employer cost per employee — supports date range' },
      { id: 'payslip-audit-trail', label: 'Payslip Audit Trail',       desc: 'Payslip generation history log — supports date range' },
    ],
  },
];

// Quick preset ranges
const PRESETS = [
  { label: 'This Month',    getRange: () => { const n=new Date(); return { fm:n.getMonth()+1,fy:n.getFullYear(),tm:n.getMonth()+1,ty:n.getFullYear() }; } },
  { label: 'Last 3 Months', getRange: () => { const n=new Date(); const s=new Date(n.getFullYear(),n.getMonth()-2,1); return { fm:s.getMonth()+1,fy:s.getFullYear(),tm:n.getMonth()+1,ty:n.getFullYear() }; } },
  { label: 'Last 6 Months', getRange: () => { const n=new Date(); const s=new Date(n.getFullYear(),n.getMonth()-5,1); return { fm:s.getMonth()+1,fy:s.getFullYear(),tm:n.getMonth()+1,ty:n.getFullYear() }; } },
  { label: 'This FY (Apr–Mar)', getRange: () => { const n=new Date(); const fy=n.getMonth()>=3?n.getFullYear():n.getFullYear()-1; return { fm:4,fy,tm:3,ty:fy+1 }; } },
  { label: 'Last FY', getRange: () => { const n=new Date(); const fy=(n.getMonth()>=3?n.getFullYear():n.getFullYear()-1)-1; return { fm:4,fy,tm:3,ty:fy+1 }; } },
];

export default function ReportsPage() {
  const now = new Date();
  const [search,    setSearch]    = useState('');
  const [loading,   setLoading]   = useState({});
  const [useRange,  setUseRange]  = useState(false);

  // Single month
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  // Date range
  const [fromMonth, setFromMonth] = useState(now.getMonth() + 1);
  const [fromYear,  setFromYear]  = useState(now.getFullYear());
  const [toMonth,   setToMonth]   = useState(now.getMonth() + 1);
  const [toYear,    setToYear]    = useState(now.getFullYear());

  const applyPreset = (p) => {
    const r = p.getRange();
    setFromMonth(r.fm); setFromYear(r.fy);
    setToMonth(r.tm);   setToYear(r.ty);
    setUseRange(true);
  };

  const rangeLabel = useRange
    ? `${MONTHS[fromMonth]} ${fromYear} → ${MONTHS[toMonth]} ${toYear}`
    : `${MONTHS[month]} ${year}`;

  const allReports = CATEGORIES.flatMap(c => c.reports);
  const filtered   = search
    ? allReports.filter(r => r.label.toLowerCase().includes(search.toLowerCase()) || r.desc.toLowerCase().includes(search.toLowerCase()))
    : null;

  const download = async (id, label) => {
    setLoading(l => ({ ...l, [id]: true }));
    try {
      const isRange = useRange && RANGE_REPORT_IDS.has(id);
      let url;
      if (isRange) {
        url = `/api/reports/${id}?format=pdf&from_month=${fromMonth}&from_year=${fromYear}&to_month=${toMonth}&to_year=${toYear}`;
      } else {
        url = `/api/reports/${id}?format=pdf&month=${month}&year=${year}`;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('payslip_token')}` },
      });
      if (!res.ok) { toast.error('Could not generate report — check server logs'); return; }
      const blob = await res.blob();
      const dlUrl = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      const suffix = isRange
        ? `${fromYear}_${String(fromMonth).padStart(2,'0')}_to_${toYear}_${String(toMonth).padStart(2,'0')}`
        : `${year}_${String(month).padStart(2,'0')}`;
      a.href = dlUrl; a.download = `${label.replace(/\s+/g,'_')}_${suffix}.pdf`;
      document.body.appendChild(a); a.click();
      URL.revokeObjectURL(dlUrl); document.body.removeChild(a);
      toast.success(`${label} downloaded`);
    } catch {
      toast.error('Error generating report');
    } finally {
      setLoading(l => ({ ...l, [id]: false }));
    }
  };

  const selBox = 'h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500';

  const ReportCard = ({ r }) => {
    const supportsRange = RANGE_REPORT_IDS.has(r.id);
    return (
      <Card>
        <CardContent className="flex items-center justify-between py-4 px-5 gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className={`mt-0.5 p-1.5 rounded shrink-0 ${supportsRange ? 'bg-blue-50' : 'bg-slate-100'}`}>
              {supportsRange
                ? <CalendarRange size={14} className="text-blue-500" />
                : <FileText size={14} className="text-slate-500" />
              }
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900">{r.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {supportsRange && useRange && (
              <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 rounded px-2 py-0.5 whitespace-nowrap">Range</span>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={loading[r.id]}
              onClick={() => download(r.id, r.label)}
              className="h-8"
            >
              <Download size={13} className="mr-1" />
              {loading[r.id] ? 'Generating…' : 'PDF'}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Compliance Reports</h1>
        <p className="text-sm text-slate-500 mt-0.5">Download statutory and payroll compliance reports</p>
      </div>

      {/* Date range toggle */}
      <Card>
        <CardContent className="py-4 px-5 space-y-4">
          {/* Toggle */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-700">Report Period:</span>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-medium">
              <button
                onClick={() => setUseRange(false)}
                className={`px-4 py-1.5 transition-colors ${!useRange ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                <Calendar size={12} className="inline mr-1" />
                Single Month
              </button>
              <button
                onClick={() => setUseRange(true)}
                className={`px-4 py-1.5 transition-colors ${useRange ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                <CalendarRange size={12} className="inline mr-1" />
                Date Range
              </button>
            </div>
          </div>

          {!useRange ? (
            /* Single month */
            <div className="flex flex-wrap items-center gap-3">
              <select value={month} onChange={e => setMonth(Number(e.target.value))} className={selBox}>
                {MONTHS.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
              <select value={year} onChange={e => setYear(Number(e.target.value))} className={selBox}>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md">
                Period: <strong>{MONTHS[month]} {year}</strong>
              </span>
            </div>
          ) : (
            /* Date range */
            <div className="space-y-3">
              {/* Quick presets */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-slate-500 self-center">Quick select:</span>
                {PRESETS.map(p => (
                  <button key={p.label} onClick={() => applyPreset(p)}
                    className="text-xs px-3 py-1 rounded-full border border-slate-200 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition-colors">
                    {p.label}
                  </button>
                ))}
              </div>
              {/* From → To */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 w-8">From</span>
                  <select value={fromMonth} onChange={e => setFromMonth(Number(e.target.value))} className={selBox}>
                    {MONTHS.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                  </select>
                  <select value={fromYear} onChange={e => setFromYear(Number(e.target.value))} className={selBox}>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <span className="text-slate-400 text-sm">→</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500 w-4">To</span>
                  <select value={toMonth} onChange={e => setToMonth(Number(e.target.value))} className={selBox}>
                    {MONTHS.slice(1).map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                  </select>
                  <select value={toYear} onChange={e => setToYear(Number(e.target.value))} className={selBox}>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <span className="text-xs text-slate-500 bg-orange-50 text-orange-700 border border-orange-100 px-3 py-1.5 rounded-md font-medium">
                  {rangeLabel}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Reports marked with <CalendarRange size={11} className="inline text-blue-500" /> use the full date range. Others use the "From" month only.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search reports…"
          className="pl-8 h-9 text-sm"
        />
      </div>

      {/* Report cards */}
      {filtered ? (
        <div>
          <p className="text-xs text-slate-500 mb-3">{filtered.length} result{filtered.length !== 1 ? 's' : ''} for "{search}"</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filtered.map(r => <ReportCard key={r.id} r={r} />)}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-sm">No reports match "{search}"</div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {CATEGORIES.map(cat => (
            <div key={cat.label}>
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{cat.label}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {cat.reports.map(r => <ReportCard key={r.id} r={r} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
