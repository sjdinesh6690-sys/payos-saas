import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Download, FileSpreadsheet, FileText, AlertCircle,
  Users, Building2, CreditCard, Receipt,
  ShieldCheck, Landmark, Calculator,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';

// ── Constants ────────────────────────────────────────────────────────────────
const MONTHS = ['','January','February','March','April','May','June','July','August','September','October','November','December'];
const YEARS  = [2022, 2023, 2024, 2025, 2026, 2027];

// ── Report definitions (only what actually has data + is useful) ──────────────
const PAYROLL_REPORTS = [
  {
    id:      'monthly-payroll-summary',
    label:   'Payslip Summary',
    desc:    'Month-wise totals — headcount, gross pay, deductions, net paid.',
    use:     'Use this to get a quick overview of your monthly payroll spend.',
    icon:    Receipt,
    color:   'blue',
    pdf:     true,
    excel:   false,
  },
  {
    id:      'salary-register',
    label:   'Salary Register',
    desc:    'Full salary breakup for every employee — basic, HRA, allowances, deductions.',
    use:     'Use this for internal payroll records and audit.',
    icon:    FileText,
    color:   'indigo',
    pdf:     true,
    excel:   true,
    excelId: 'salary-register',
  },
  {
    id:      'bank-advice',
    label:   'Bank Payment Advice',
    desc:    'Employee name, bank account number, IFSC, and net salary to transfer.',
    use:     'Upload the Excel to your bank portal for bulk salary transfer.',
    icon:    CreditCard,
    color:   'green',
    pdf:     true,
    excel:   true,
    excelId: 'bank-advice',
  },
];

const STATUTORY_REPORTS = [
  {
    id:      'pf-report',
    label:   'PF / EPF Report',
    desc:    'Employee + employer PF contributions. Excel is in EPFO ECR upload format.',
    use:     'Use the Excel to upload directly to the EPFO Unified Portal.',
    icon:    ShieldCheck,
    color:   'emerald',
    pdf:     true,
    excel:   true,
    excelId: 'pf-ecr',
  },
  {
    id:      'esi-report',
    label:   'ESI Contribution Report',
    desc:    'ESI deductions for employees with salary ≤ ₹21,000/month.',
    use:     'Use the Excel for ESIC portal contribution filing.',
    icon:    Building2,
    color:   'teal',
    pdf:     true,
    excel:   true,
    excelId: 'esi-contribution',
  },
  {
    id:      'professional-tax-report',
    label:   'Professional Tax (PT)',
    desc:    'State-wise PT deductions with applicable slab reference.',
    use:     'Use for monthly PT challan payment and filing.',
    icon:    Landmark,
    color:   'violet',
    pdf:     true,
    excel:   true,
    excelId: 'professional-tax',
  },
  {
    id:      'tds-report',
    label:   'TDS Summary',
    desc:    'Tax Deducted at Source per employee for the selected month.',
    use:     'Use for quarterly TDS return filing (Form 24Q).',
    icon:    Calculator,
    color:   'orange',
    pdf:     true,
    excel:   false,
  },
];

// ── Color maps ────────────────────────────────────────────────────────────────
const COLOR = {
  blue:    { bg: 'bg-blue-50',    icon: 'text-blue-600',    border: 'border-blue-100'    },
  indigo:  { bg: 'bg-indigo-50',  icon: 'text-indigo-600',  border: 'border-indigo-100'  },
  green:   { bg: 'bg-green-50',   icon: 'text-green-600',   border: 'border-green-100'   },
  emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', border: 'border-emerald-100' },
  teal:    { bg: 'bg-teal-50',    icon: 'text-teal-600',    border: 'border-teal-100'    },
  violet:  { bg: 'bg-violet-50',  icon: 'text-violet-600',  border: 'border-violet-100'  },
  orange:  { bg: 'bg-orange-50',  icon: 'text-orange-500',  border: 'border-orange-100'  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
}

// ── Main Component ───────────────────────────────────────────────────────────
export default function ReportsPage() {
  const now   = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());
  const [loading, setLoading] = useState({});

  // Fetch payslip summary for selected month to show data availability
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['report-summary', month, year],
    queryFn:  async () => {
      const res = await api.get(`/payslips?month=${month}&year=${year}&page=1&limit=500`);
      const slips = res.data?.payslips || res.data || [];
      if (!slips.length) return null;
      const totalNet   = slips.reduce((s, p) => s + (parseFloat(p.net_salary)  || 0), 0);
      const totalGross = slips.reduce((s, p) => s + (parseFloat(p.gross_salary) || parseFloat(p.basic_salary) || 0), 0);
      return { count: slips.length, totalNet, totalGross };
    },
    staleTime: 30_000,
  });

  const hasData = summary && summary.count > 0;

  // Download handler
  const download = async (reportId, label, format = 'pdf', excelId = null) => {
    if (!hasData) {
      toast.error(`No payslip data for ${MONTHS[month]} ${year}. Generate payslips first.`);
      return;
    }
    const key = `${reportId}_${format}`;
    setLoading(l => ({ ...l, [key]: true }));
    try {
      let url, ext;
      if (format === 'excel') {
        url = `/api/reports/excel/${excelId}?month=${month}&year=${year}`;
        ext = 'xlsx';
      } else {
        url = `/api/reports/${reportId}?month=${month}&year=${year}`;
        ext = 'pdf';
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem('payslip_token')}` },
      });
      if (!res.ok) {
        // Try to read JSON error message from backend
        try {
          const errData = await res.json();
          toast.error(errData.error || 'Could not generate report — please try again');
        } catch {
          toast.error('Could not generate report — please try again');
        }
        return;
      }
      const blob  = await res.blob();
      const dlUrl = URL.createObjectURL(blob);
      const a     = document.createElement('a');
      const suffix = `${year}_${String(month).padStart(2, '0')}`;
      a.href = dlUrl;
      a.download = `${label.replace(/\s+/g, '_')}_${suffix}.${ext}`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(dlUrl);
      document.body.removeChild(a);
      toast.success(`${label} ${format === 'excel' ? 'Excel' : 'PDF'} downloaded`);
    } catch {
      toast.error('Error generating report — please try again');
    } finally {
      setLoading(l => ({ ...l, [key]: false }));
    }
  };

  // ── Report Card ─────────────────────────────────────────────────────────────
  const ReportCard = ({ r }) => {
    const c = COLOR[r.color] || COLOR.blue;
    const Icon = r.icon;
    return (
      <div className={`rounded-xl border ${hasData ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50'} p-5 flex flex-col gap-4 transition-all`}>
        {/* Top row */}
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${c.bg} shrink-0`}>
            <Icon size={18} className={c.icon} />
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${hasData ? 'text-slate-900' : 'text-slate-400'}`}>{r.label}</p>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{r.desc}</p>
          </div>
        </div>

        {/* Usage tip */}
        <div className={`text-xs rounded-lg px-3 py-2 ${hasData ? `${c.bg} ${c.icon}` : 'bg-slate-100 text-slate-400'}`}>
          💡 {r.use}
        </div>

        {/* Download buttons */}
        <div className="flex items-center gap-2 mt-auto">
          <Button
            size="sm"
            disabled={!hasData || loading[`${r.id}_pdf`]}
            onClick={() => download(r.id, r.label, 'pdf')}
            className={`h-8 flex-1 text-xs ${hasData ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
          >
            <Download size={12} className="mr-1.5" />
            {loading[`${r.id}_pdf`] ? 'Generating…' : 'Download PDF'}
          </Button>
          {r.excel && (
            <Button
              size="sm"
              variant="outline"
              disabled={!hasData || loading[`${r.id}_excel`]}
              onClick={() => download(r.id, r.label, 'excel', r.excelId)}
              className={`h-8 flex-1 text-xs ${hasData ? 'border-green-300 text-green-700 hover:bg-green-50' : 'border-slate-200 text-slate-400 cursor-not-allowed'}`}
            >
              <FileSpreadsheet size={12} className="mr-1.5" />
              {loading[`${r.id}_excel`] ? 'Generating…' : 'Download Excel'}
            </Button>
          )}
        </div>
      </div>
    );
  };

  const selBox = 'h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400';

  return (
    <div className="p-6 space-y-6 max-w-5xl">

      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: '#1A7A4A' }}>
            STEP 4 OF 4
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">④ Download Reports</h1>
        <p className="text-sm text-slate-500 mt-0.5">Download payroll and statutory compliance reports for any month</p>
      </div>

      {/* ── Period Selector + Data Status ── */}
      <Card>
        <CardContent className="py-5 px-5">
          <div className="flex flex-wrap items-center gap-4">

            {/* Month + Year selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-600 shrink-0">Report for:</span>
              <select value={month} onChange={e => setMonth(Number(e.target.value))} className={selBox}>
                {MONTHS.slice(1).map((m, i) => (
                  <option key={i + 1} value={i + 1}>{m}</option>
                ))}
              </select>
              <select value={year} onChange={e => setYear(Number(e.target.value))} className={selBox}>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>

            {/* Data status badge */}
            <div className="flex items-center gap-2 ml-auto">
              {summaryLoading ? (
                <span className="text-xs text-slate-400 animate-pulse">Checking data…</span>
              ) : hasData ? (
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
                  <Users size={14} className="text-green-600" />
                  <div>
                    <span className="text-sm font-semibold text-green-700">{summary.count} employees</span>
                    <span className="text-xs text-green-600 ml-2">·</span>
                    <span className="text-xs text-green-600 ml-2">Net paid: <strong>{fmt(summary.totalNet)}</strong></span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2">
                  <AlertCircle size={14} className="text-amber-500" />
                  <span className="text-sm text-amber-700 font-medium">No payslips found for {MONTHS[month]} {year}</span>
                  <span className="text-xs text-amber-600">— generate payslips first from the Generate &amp; Send page</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick month shortcuts */}
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-400 self-center">Quick pick:</span>
            {[-1, -2, -3].map(offset => {
              const d   = new Date(now.getFullYear(), now.getMonth() + offset, 1);
              const m   = d.getMonth() + 1;
              const y   = d.getFullYear();
              const active = m === month && y === year;
              return (
                <button
                  key={offset}
                  onClick={() => { setMonth(m); setYear(y); }}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    active
                      ? 'bg-slate-800 text-white border-slate-800'
                      : 'border-slate-200 text-slate-600 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50'
                  }`}
                >
                  {MONTHS[m]} {y}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Payroll Reports ── */}
      <div>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Payroll Reports</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PAYROLL_REPORTS.map(r => <ReportCard key={r.id} r={r} />)}
        </div>
      </div>

      {/* ── Statutory / Compliance Reports ── */}
      <div>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Statutory &amp; Compliance Reports</h2>
        <p className="text-xs text-slate-400 mb-3">Required for government filings — PF, ESI, PT, TDS</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {STATUTORY_REPORTS.map(r => <ReportCard key={r.id} r={r} />)}
        </div>
      </div>

      {/* ── Bottom info bar ── */}
      <div className="rounded-lg bg-slate-50 border border-slate-100 px-5 py-4 text-xs text-slate-500 flex flex-wrap gap-x-6 gap-y-1">
        <span>📄 <strong>PDF</strong> — for records, printing, and sharing</span>
        <span>📊 <strong>Excel</strong> — for government portal uploads and bank transfers</span>
        <span>⚠️ All reports use payslips generated for the selected month</span>
      </div>
    </div>
  );
}
