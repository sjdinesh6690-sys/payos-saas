import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, Search, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import api from '@/lib/api';

const MONTHS = ['','January','February','March','April','May','June','July','August','September','October','November','December'];

const CATEGORIES = [
  {
    label: 'Payroll Reports',
    reports: [
      { id: 'monthly-payroll-summary',   label: 'Monthly Payroll Summary',     desc: 'Total salaries paid for selected month' },
      { id: 'quarterly-payroll-summary', label: 'Quarterly Payroll Summary',   desc: 'Q1–Q4 salary breakdown' },
      { id: 'annual-payroll-summary',    label: 'Annual Payroll Summary',      desc: 'Full year salary report' },
      { id: 'salary-register',           label: 'Salary Register',             desc: 'Detailed payroll register with all employees' },
      { id: 'bank-advice',               label: 'Bank Advice / Transfer List', desc: 'Employee bank transfer details' },
    ],
  },
  {
    label: 'Statutory & Compliance',
    reports: [
      { id: 'pf-report',               label: 'PF Contribution Report',    desc: 'Employee & employer PF contributions' },
      { id: 'esi-report',              label: 'ESI Contribution Report',   desc: 'Employee & employer ESI deductions' },
      { id: 'professional-tax-report', label: 'Professional Tax Report',   desc: 'State professional tax deductions' },
      { id: 'tds-report',              label: 'TDS Report',                desc: 'Tax deducted at source summary' },
      { id: 'statutory-compliance',    label: 'Compliance Checklist',      desc: 'PF/ESI/PT filing status' },
    ],
  },
  {
    label: 'Employee Reports',
    reports: [
      { id: 'employee-headcount',  label: 'Employee Headcount Report', desc: 'Active employees by department' },
      { id: 'cost-to-company',     label: 'Cost to Company (CTC)',     desc: 'Total employer cost per employee' },
      { id: 'payslip-audit-trail', label: 'Payslip Audit Trail',       desc: 'Payslip generation history log' },
    ],
  },
];

export default function ReportsPage() {
  const now    = new Date();
  const [month,  setMonth]  = useState(now.getMonth() + 1);
  const [year,   setYear]   = useState(now.getFullYear());
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState({});

  const { data: months = [] } = useQuery({
    queryKey: ['payslip-months'],
    queryFn: () => api.get('/payslips/months').then(r => r.data),
  });

  const allReports = CATEGORIES.flatMap(c => c.reports);
  const filtered   = search
    ? allReports.filter(r => r.label.toLowerCase().includes(search.toLowerCase()) || r.desc.toLowerCase().includes(search.toLowerCase()))
    : null;

  const download = async (id, label) => {
    setLoading(l => ({ ...l, [id]: true }));
    try {
      const res = await fetch(`/api/reports/${id}?format=pdf&month=${month}&year=${year}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('payslip_token')}` },
      });
      if (!res.ok) { toast.error('Could not generate report — check server logs'); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `${label.replace(/\s+/g, '_')}_${year}_${String(month).padStart(2,'0')}.pdf`;
      document.body.appendChild(a); a.click();
      URL.revokeObjectURL(url); document.body.removeChild(a);
      toast.success(`${label} downloaded`);
    } catch {
      toast.error('Error generating report');
    } finally {
      setLoading(l => ({ ...l, [id]: false }));
    }
  };

  const ReportCard = ({ r }) => (
    <Card key={r.id}>
      <CardContent className="flex items-center justify-between py-4 px-5 gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 p-1.5 rounded bg-slate-100 shrink-0">
            <FileText size={14} className="text-slate-500" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">{r.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
          </div>
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={loading[r.id]}
          onClick={() => download(r.id, r.label)}
          className="shrink-0 h-8"
        >
          <Download size={13} className="mr-1" />
          {loading[r.id] ? 'Generating…' : 'PDF'}
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Compliance Reports</h1>
        <p className="text-sm text-slate-500 mt-0.5">Download statutory and payroll compliance reports</p>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search reports…"
            className="pl-8 h-9 text-sm"
          />
        </div>
        {/* Month select */}
        <select
          value={month}
          onChange={e => setMonth(Number(e.target.value))}
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          {MONTHS.slice(1).map((m, i) => (
            <option key={i + 1} value={i + 1}>{m}</option>
          ))}
        </select>
        {/* Year select */}
        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          {[2023, 2024, 2025, 2026, 2027].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        <div className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-md">
          Reporting period: <strong>{MONTHS[month]} {year}</strong>
        </div>
      </div>

      {/* Search results or categorised list */}
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
