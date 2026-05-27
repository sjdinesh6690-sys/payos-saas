import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users, FileText, Send, Upload, BarChart3,
  CheckCircle2, Clock, ArrowRight, Zap, TrendingUp, X,
  UserPlus, Settings2, CalendarCheck, Sparkles,
} from 'lucide-react';
import api from '@/lib/api';

const fmt = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
const fmtShort = (n) => {
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000)     return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n || 0}`;
};

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_NAMES   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

// ── Getting Started Banner ───────────────────────────────────────────────────
const SETUP_STEPS = [
  { icon: UserPlus,     label: 'Add Employees',      path: '/admin/employees', desc: 'Add at least one employee' },
  { icon: Settings2,    label: 'Configure Payroll',  path: '/admin/payroll-config', desc: 'Set up earnings & deductions' },
  { icon: CalendarCheck,label: 'Enter Attendance',   path: '/admin/attendance', desc: 'Mark present/absent for this month' },
  { icon: Send,         label: 'Generate & Send',    path: '/admin/send', desc: 'Create payslips and email them' },
];

function GettingStartedBanner({ employees = [], payslips = [], onDismiss }) {
  const navigate = useNavigate();
  const hasEmployees = employees.length > 0;
  const hasPayslips  = payslips.length  > 0;

  // Auto-dismiss if they have employees AND payslips already
  if (hasEmployees && hasPayslips) return null;

  const doneCount = [hasEmployees, hasEmployees, false, hasPayslips].filter(Boolean).length;

  return (
    <div className="rounded-2xl overflow-hidden" style={{
      background: 'linear-gradient(135deg, #0F4C2A 0%, #1A7A4A 100%)',
      boxShadow: '0 4px 24px rgba(26,122,74,0.25)',
    }}>
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm">Welcome to PayLeef! 🎉</p>
            <p className="text-white/70 text-xs mt-0.5">Follow these 4 steps to process your first payroll</p>
          </div>
        </div>
        <button onClick={onDismiss} className="text-white/50 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
          <X size={16} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="px-5 pb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-white/70 text-xs">Setup progress</span>
          <span className="text-white text-xs font-bold">{doneCount}/4 done</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/20">
          <div className="h-1.5 rounded-full bg-white transition-all" style={{ width: `${(doneCount / 4) * 100}%` }} />
        </div>
      </div>

      {/* Steps */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-5 pb-5">
        {SETUP_STEPS.map(({ icon: Icon, label, path, desc }, i) => {
          const done = i === 0 ? hasEmployees : i === 1 ? hasEmployees : i === 3 ? hasPayslips : false;
          return (
            <button
              key={i}
              onClick={() => navigate(path)}
              className="flex flex-col gap-2 p-3 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: done ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.12)' }}
            >
              <div className="flex items-center justify-between">
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                  {done
                    ? <CheckCircle2 size={14} className="text-white" />
                    : <Icon size={14} className="text-white/80" />
                  }
                </div>
                <span className="text-white/60 text-[10px] font-bold">Step {i + 1}</span>
              </div>
              <div>
                <p className={`text-xs font-semibold ${done ? 'text-white line-through opacity-70' : 'text-white'}`}>{label}</p>
                <p className="text-white/60 text-[10px] mt-0.5 leading-tight">{desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const now       = new Date();
  const thisMonth = now.getMonth() + 1;
  const thisYear  = now.getFullYear();
  const dayName   = DAY_NAMES[now.getDay()];
  const adminName = localStorage.getItem('employee_name') || 'there';
  const firstName = adminName.split(' ')[0];

  // Getting started banner — dismiss persists in localStorage
  const [bannerDismissed, setBannerDismissed] = useState(() =>
    localStorage.getItem('pl_gs_dismissed') === '1'
  );
  const dismissBanner = () => {
    localStorage.setItem('pl_gs_dismissed', '1');
    setBannerDismissed(true);
  };

  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: () => api.get('/employees').then(r => r.data),
  });
  const { data: payslips = [] } = useQuery({
    queryKey: ['payslips'],
    queryFn: () => api.get('/payslips').then(r => r.data),
  });

  // ── Key numbers ──────────────────────────────────────────────────────────────
  const totalPayroll   = employees.reduce((s, e) => s + (Number(e.salary) || 0), 0);
  const thisMonthSlips = payslips.filter(p => p.month === thisMonth && p.year === thisYear);
  const emailedCount   = thisMonthSlips.filter(p => p.emailed).length;
  const pendingEmail   = thisMonthSlips.length - emailedCount;
  const notGenerated   = employees.length - thisMonthSlips.length;

  // ── What's the current status & next action? ─────────────────────────────────
  const status = useMemo(() => {
    if (employees.length === 0) return {
      emoji: '👋', label: 'Getting Started',
      message: 'Add your first employees to begin payroll',
      action: 'Add Employees', path: '/admin/employees',
      color: '#1A7A4A', bg: '#F0FDF4', border: '#BBF7D0',
    };
    if (thisMonthSlips.length === 0) return {
      emoji: '📋', label: `${MONTH_SHORT[thisMonth - 1]} ${thisYear} Payroll Pending`,
      message: `Ready to generate payslips for ${employees.length} employees`,
      action: 'Generate Payslips', path: '/admin/send',
      color: '#D97706', bg: '#FFFBEB', border: '#FCD34D',
    };
    if (pendingEmail > 0) return {
      emoji: '📧', label: `${MONTH_SHORT[thisMonth - 1]} ${thisYear} — Send Emails`,
      message: `${thisMonthSlips.length} payslips generated · ${pendingEmail} not yet emailed`,
      action: 'Send Emails Now', path: '/admin/send',
      color: '#7C3AED', bg: '#F5F3FF', border: '#C4B5FD',
    };
    return {
      emoji: '✅', label: `${MONTH_SHORT[thisMonth - 1]} ${thisYear} — All Done!`,
      message: `Payslips sent to all ${thisMonthSlips.length} employees`,
      action: 'View Reports', path: '/admin/reports',
      color: '#16A34A', bg: '#F0FDF4', border: '#86EFAC',
    };
  }, [employees, thisMonthSlips, pendingEmail, thisMonth, thisYear]);

  // ── Last 3 months trend (simple) ────────────────────────────────────────────
  const recentMonths = useMemo(() => {
    const result = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(thisYear, thisMonth - 1 - i, 1);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      const count = payslips.filter(p => p.month === m && p.year === y).length;
      result.push({ label: MONTH_SHORT[m - 1], count, isCurrent: i === 0 });
    }
    return result;
  }, [payslips, thisMonth, thisYear]);

  const maxCount = Math.max(...recentMonths.map(m => m.count), 1);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* ── Greeting ── */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Good {now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'}, {firstName} 👋
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          {dayName}, {now.getDate()} {MONTH_NAMES[now.getMonth()]} {thisYear}
        </p>
      </div>

      {/* ── Getting Started Banner (new users only) ── */}
      {!bannerDismissed && (
        <GettingStartedBanner
          employees={employees}
          payslips={payslips}
          onDismiss={dismissBanner}
        />
      )}

      {/* ── This month's payroll status — the MAIN card ── */}
      <div
        className="rounded-2xl p-5 flex items-center justify-between gap-4"
        style={{
          background: status.bg,
          border: `1.5px solid ${status.border}`,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
            style={{ background: 'rgba(255,255,255,0.7)' }}
          >
            {status.emoji}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold uppercase tracking-wide" style={{ color: status.color }}>
              {status.label}
            </p>
            <p className="text-[15px] font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>
              {status.message}
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate(status.path)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white shrink-0 transition-all hover:opacity-90 active:scale-95"
          style={{ background: status.color }}
        >
          {status.action}
          <ArrowRight size={14} />
        </button>
      </div>

      {/* ── 3 key numbers ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: 'Total Employees',
            value: employees.length,
            sub: employees.length === 0 ? 'Add your team' : `in ${[...new Set(employees.map(e => e.department).filter(Boolean))].length || 0} departments`,
            icon: Users,
            path: '/admin/employees',
            color: '#1A7A4A',
            bg: '#F0FDF4',
          },
          {
            label: 'Monthly Payroll',
            value: fmtShort(totalPayroll),
            sub: employees.length > 0 ? `avg ${fmtShort(totalPayroll / employees.length)} per person` : 'No data yet',
            icon: TrendingUp,
            path: '/admin/analytics',
            color: '#7C3AED',
            bg: '#F5F3FF',
          },
          {
            label: `${MONTH_SHORT[thisMonth - 1]} Payslips`,
            value: `${thisMonthSlips.length} / ${employees.length}`,
            sub: thisMonthSlips.length === 0 ? 'Not generated yet' : `${emailedCount} emailed`,
            icon: FileText,
            path: '/admin/send',
            color: '#D97706',
            bg: '#FFFBEB',
          },
        ].map(({ label, value, sub, icon: Icon, path, color, bg }) => (
          <button
            key={label}
            onClick={() => navigate(path)}
            className="text-left rounded-2xl p-5 transition-all hover:shadow-md active:scale-[0.98]"
            style={{
              background: '#fff',
              border: '1.5px solid var(--border-light)',
              boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
              style={{ background: bg }}
            >
              <Icon size={17} style={{ color }} />
            </div>
            <p className="text-[26px] font-black leading-none" style={{ color: 'var(--text-primary)' }}>
              {value}
            </p>
            <p className="text-[12px] font-semibold mt-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>
          </button>
        ))}
      </div>

      {/* ── Quick actions ── */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
          Quick Actions
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Add / Edit Employees', icon: Users,    path: '/admin/employees', desc: 'Manage your team',     color: '#1A7A4A', bg: '#F0FDF4' },
            { label: 'Import Salaries',       icon: Upload,   path: '/admin/upload',    desc: 'Upload CSV or Excel', color: '#0891B2', bg: '#ECFEFF' },
            { label: 'Generate & Send',        icon: Send,     path: '/admin/send',      desc: 'Create payslips',     color: '#D97706', bg: '#FFFBEB' },
            { label: 'Download Reports',       icon: BarChart3,path: '/admin/reports',   desc: 'PF, ESI, Bank advice', color: '#7C3AED', bg: '#F5F3FF' },
          ].map(({ label, icon: Icon, path, desc, color, bg }) => (
            <button
              key={label}
              onClick={() => navigate(path)}
              className="flex flex-col items-start gap-2.5 p-4 rounded-2xl text-left transition-all hover:shadow-md active:scale-[0.98]"
              style={{
                background: '#fff',
                border: '1.5px solid var(--border-light)',
                boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
              }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon size={17} style={{ color }} />
              </div>
              <div>
                <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Simple 3-month snapshot ── */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: '#fff',
          border: '1.5px solid var(--border-light)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>Payslip Activity</p>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Last 3 months</p>
          </div>
          <button
            onClick={() => navigate('/admin/analytics')}
            className="flex items-center gap-1 text-[12px] font-medium transition-all hover:opacity-70"
            style={{ color: 'var(--brand)' }}
          >
            Full analytics <ArrowRight size={12} />
          </button>
        </div>

        <div className="flex items-end gap-4 h-20">
          {recentMonths.map(({ label, count, isCurrent }) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
              <p className="text-[12px] font-bold" style={{ color: 'var(--text-secondary)' }}>{count}</p>
              <div className="w-full rounded-t-lg transition-all" style={{
                height: `${Math.max((count / maxCount) * 56, count > 0 ? 8 : 3)}px`,
                background: isCurrent ? 'var(--brand)' : 'var(--border-light)',
                minHeight: 3,
              }} />
              <p className="text-[11px]" style={{ color: isCurrent ? 'var(--brand)' : 'var(--text-muted)', fontWeight: isCurrent ? 700 : 400 }}>
                {label}
              </p>
            </div>
          ))}
        </div>

        {recentMonths.every(m => m.count === 0) && (
          <div className="flex items-center gap-2 mt-3">
            <Zap size={14} style={{ color: 'var(--text-muted)' }} />
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              No payslips generated yet — go to <button onClick={() => navigate('/admin/send')} className="underline font-medium" style={{ color: 'var(--brand)' }}>Generate & Send</button> to start
            </p>
          </div>
        )}
      </div>

      {/* ── This month checklist ── */}
      <div
        className="rounded-2xl p-5"
        style={{
          background: '#fff',
          border: '1.5px solid var(--border-light)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}
      >
        <p className="text-[13px] font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
          {MONTH_NAMES[thisMonth - 1]} {thisYear} — Payroll Checklist
        </p>
        <div className="space-y-3">
          {[
            {
              label: 'Employees added to the system',
              done: employees.length > 0,
              detail: employees.length > 0 ? `${employees.length} employees` : 'None yet',
              path: '/admin/employees',
            },
            {
              label: 'Payslips generated for this month',
              done: thisMonthSlips.length > 0,
              detail: thisMonthSlips.length > 0 ? `${thisMonthSlips.length} of ${employees.length} done` : 'Not generated yet',
              path: '/admin/send',
            },
            {
              label: 'Payslips emailed to employees',
              done: emailedCount > 0 && emailedCount === thisMonthSlips.length,
              detail: emailedCount > 0 ? `${emailedCount} sent` : 'Not sent yet',
              path: '/admin/send',
            },
            {
              label: 'Reports downloaded (PF, ESI, Bank)',
              done: false,
              detail: thisMonthSlips.length > 0 ? 'Ready to download' : 'Generate payslips first',
              path: '/admin/reports',
              optional: true,
            },
          ].map(({ label, done, detail, path, optional }) => (
            <button
              key={label}
              onClick={() => navigate(path)}
              className="flex items-center gap-3 w-full text-left p-3 rounded-xl transition-all hover:bg-slate-50"
            >
              {done
                ? <CheckCircle2 size={18} className="shrink-0" style={{ color: '#16A34A' }} />
                : <Clock size={18} className="shrink-0" style={{ color: optional ? '#CBD5E1' : '#F59E0B' }} />
              }
              <div className="flex-1">
                <p className="text-[13px] font-medium" style={{ color: done ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                  {label}
                  {optional && <span className="ml-2 text-[10px] font-normal text-slate-400">(optional)</span>}
                </p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{detail}</p>
              </div>
              <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
