import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users, FileText, Send, Upload, BarChart3,
  CheckCircle2, Clock, ArrowRight, Zap, TrendingUp,
  ChevronDown, ChevronUp, Settings2, CalendarCheck,
  UserPlus, Sparkles, Lock,
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

const G = '#1A7A4A';

// ── Step data ────────────────────────────────────────────────────────────────
const WORKFLOW_STEPS = [
  {
    num: 1,
    icon: UserPlus,
    title: 'Add Your Employees',
    desc: 'Enter employee names, emails, and salary details. Takes 2 minutes.',
    tip: 'You can also import a CSV or Excel file to add multiple employees at once.',
    path: '/admin/employees',
    color: '#1A7A4A',
    bg: '#F0FDF4',
    border: '#BBF7D0',
  },
  {
    num: 2,
    icon: Settings2,
    title: 'Configure Payroll Rules',
    desc: 'Set up earnings (HRA, allowances) and deductions (PF, ESI, TDS). Only needed once.',
    tip: 'Default India statutory values are pre-filled. You just review and save.',
    path: '/admin/payroll-config',
    color: '#0891B2',
    bg: '#ECFEFF',
    border: '#A5F3FC',
  },
  {
    num: 3,
    icon: CalendarCheck,
    title: 'Enter Attendance',
    desc: 'Mark present, absent, or half-day for each employee this month.',
    tip: 'LOP (Loss of Pay) is auto-calculated based on attendance you enter.',
    path: '/admin/attendance',
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#C4B5FD',
  },
  {
    num: 4,
    icon: Send,
    title: 'Generate & Send Payslips',
    desc: 'One click generates PDF payslips and emails them to all employees.',
    tip: 'Employees receive a professional payslip with all earning/deduction details.',
    path: '/admin/send',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#FCD34D',
  },
  {
    num: 5,
    icon: BarChart3,
    title: 'Download Reports',
    desc: 'Get PF, ESI, Bank advice, and Form 16 reports ready for compliance.',
    tip: 'All reports are government-format ready — no manual reformatting needed.',
    path: '/admin/reports',
    color: '#DC2626',
    bg: '#FEF2F2',
    border: '#FECACA',
  },
];

// ── Single step card ─────────────────────────────────────────────────────────
function StepCard({ step, status, onAction }) {
  const { num, icon: Icon, title, desc, tip, color, bg, border } = step;
  const [showTip, setShowTip] = useState(false);

  const isDone    = status === 'done';
  const isCurrent = status === 'current';
  const isLocked  = status === 'locked';

  return (
    <div
      className="rounded-2xl p-4 transition-all relative"
      style={{
        background: isDone ? '#F8FAFC' : isCurrent ? '#fff' : '#FAFAFA',
        border: `2px solid ${isCurrent ? color : isDone ? '#E2E8F0' : '#F1F5F9'}`,
        boxShadow: isCurrent ? `0 4px 20px ${color}22` : '0 1px 4px rgba(0,0,0,0.04)',
        opacity: isLocked ? 0.55 : 1,
      }}
    >
      {/* Step number badge */}
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
          style={{
            background: isDone ? '#DCFCE7' : isCurrent ? bg : '#F1F5F9',
          }}
        >
          {isDone
            ? <CheckCircle2 size={18} style={{ color: '#16A34A' }} />
            : isLocked
            ? <Lock size={16} style={{ color: '#94A3B8' }} />
            : <Icon size={17} style={{ color: isCurrent ? color : '#94A3B8' }} />
          }
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span
              className="text-[10px] font-black uppercase tracking-widest"
              style={{ color: isCurrent ? color : isDone ? '#16A34A' : '#94A3B8' }}
            >
              Step {num}
            </span>
            {isDone && (
              <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full">
                ✓ Done
              </span>
            )}
            {isCurrent && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white"
                style={{ background: color }}
              >
                Do this now
              </span>
            )}
          </div>

          <p
            className="text-[14px] font-bold leading-snug"
            style={{ color: isDone ? '#64748B' : isCurrent ? 'var(--text-primary)' : '#94A3B8' }}
          >
            {title}
          </p>
          <p
            className="text-[12px] mt-1 leading-relaxed"
            style={{ color: isDone ? '#94A3B8' : isCurrent ? 'var(--text-muted)' : '#CBD5E1' }}
          >
            {desc}
          </p>

          {/* Tip section */}
          {(isCurrent || isDone) && (
            <button
              onClick={() => setShowTip(!showTip)}
              className="flex items-center gap-1 mt-2 text-[11px] font-medium transition-colors"
              style={{ color: isCurrent ? color : '#94A3B8' }}
            >
              💡 Helpful tip
              {showTip ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
          {showTip && (
            <p
              className="text-[11px] mt-1.5 leading-relaxed px-2 py-1.5 rounded-lg"
              style={{ color: '#64748B', background: bg, border: `1px solid ${border}` }}
            >
              {tip}
            </p>
          )}
        </div>

        {/* CTA button */}
        {isCurrent && (
          <button
            onClick={onAction}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[12px] font-bold text-white shrink-0 transition-all hover:opacity-90 active:scale-95 self-start"
            style={{ background: color }}
          >
            Go <ArrowRight size={13} />
          </button>
        )}
        {isDone && (
          <button
            onClick={onAction}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold shrink-0 self-start transition-all hover:bg-slate-100"
            style={{ color: '#64748B', border: '1px solid #E2E8F0' }}
          >
            Edit
          </button>
        )}
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

  const [stepsCollapsed, setStepsCollapsed] = useState(false);

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

  // ── Determine which step is "current" ────────────────────────────────────────
  const currentStep = useMemo(() => {
    if (employees.length === 0) return 1;
    if (thisMonthSlips.length === 0) return 4; // skip to generate (steps 2,3 assumed done or optional)
    if (pendingEmail > 0) return 4;
    return 5; // all payslips sent, next is reports
  }, [employees, thisMonthSlips, pendingEmail]);

  const getStepStatus = (stepNum) => {
    if (stepNum === 1) return employees.length > 0 ? 'done' : 'current';
    if (stepNum === 2) return employees.length > 0 ? 'done' : stepNum <= currentStep ? 'current' : 'locked';
    if (stepNum === 3) return employees.length > 0 ? 'done' : 'locked';
    if (stepNum === 4) {
      if (thisMonthSlips.length > 0 && emailedCount === thisMonthSlips.length) return 'done';
      if (employees.length > 0) return 'current';
      return 'locked';
    }
    if (stepNum === 5) {
      if (thisMonthSlips.length > 0 && emailedCount === thisMonthSlips.length) return 'current';
      if (thisMonthSlips.length > 0) return 'done'; // can still use reports
      return 'locked';
    }
    return 'locked';
  };

  // ── Smart "what to do now" status ────────────────────────────────────────────
  const status = useMemo(() => {
    if (employees.length === 0) return {
      emoji: '👋', label: 'Start Here — Add Your First Employee',
      message: 'PayLeef is ready! Just add your team and you\'re 3 clicks away from your first payslip.',
      action: 'Add Employees Now', path: '/admin/employees',
      color: G, bg: '#F0FDF4', border: '#BBF7D0',
    };
    if (thisMonthSlips.length === 0) return {
      emoji: '🚀', label: `Ready to Run ${MONTH_SHORT[thisMonth - 1]} ${thisYear} Payroll`,
      message: `${employees.length} employees are set up. Generate payslips in one click.`,
      action: 'Generate Payslips', path: '/admin/send',
      color: '#D97706', bg: '#FFFBEB', border: '#FCD34D',
    };
    if (pendingEmail > 0) return {
      emoji: '📧', label: `${pendingEmail} Payslips Ready to Send`,
      message: `${thisMonthSlips.length} payslips generated · Send emails to employees now.`,
      action: 'Send Emails Now', path: '/admin/send',
      color: '#7C3AED', bg: '#F5F3FF', border: '#C4B5FD',
    };
    return {
      emoji: '✅', label: `${MONTH_SHORT[thisMonth - 1]} Payroll Complete!`,
      message: `All ${thisMonthSlips.length} payslips sent. Download compliance reports next.`,
      action: 'Download Reports', path: '/admin/reports',
      color: '#16A34A', bg: '#F0FDF4', border: '#86EFAC',
    };
  }, [employees, thisMonthSlips, pendingEmail, thisMonth, thisYear]);

  // ── Last 3 months bar data ───────────────────────────────────────────────────
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

  const doneSteps = [1,2,3,4,5].filter(n => getStepStatus(n) === 'done').length;
  const isNewUser = employees.length === 0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* ── Greeting ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            {isNewUser ? `Welcome to PayLeef, ${firstName}! 🎉` : `Good ${now.getHours() < 12 ? 'morning' : now.getHours() < 17 ? 'afternoon' : 'evening'}, ${firstName} 👋`}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {dayName}, {now.getDate()} {MONTH_NAMES[now.getMonth()]} {thisYear}
          </p>
        </div>
        {!isNewUser && (
          <div className="text-right hidden sm:block">
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Setup Progress
            </p>
            <p className="text-2xl font-black" style={{ color: G }}>{doneSteps}/5</p>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>steps complete</p>
          </div>
        )}
      </div>

      {/* ── Primary CTA — "What to do now" ── */}
      <div
        className="rounded-2xl p-5 flex items-center justify-between gap-4"
        style={{
          background: status.bg,
          border: `2px solid ${status.border}`,
          boxShadow: `0 4px 20px ${status.color}18`,
        }}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0"
            style={{ background: 'rgba(255,255,255,0.8)' }}>
            {status.emoji}
          </div>
          <div className="min-w-0">
            <p className="text-[12px] font-black uppercase tracking-widest mb-1" style={{ color: status.color }}>
              Your Next Step
            </p>
            <p className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>{status.label}</p>
            <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{status.message}</p>
          </div>
        </div>
        <button
          onClick={() => navigate(status.path)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl text-[13px] font-bold text-white shrink-0 transition-all hover:opacity-90 active:scale-95"
          style={{ background: status.color }}
        >
          {status.action}
          <ArrowRight size={14} />
        </button>
      </div>

      {/* ── How PayLeef Works — Step Guide ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: '1.5px solid var(--border-light)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
      >
        {/* Section header */}
        <button
          onClick={() => setStepsCollapsed(!stepsCollapsed)}
          className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-slate-50"
          style={{ background: '#fff' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: '#F0FDF4' }}>
              <Sparkles size={15} style={{ color: G }} />
            </div>
            <div className="text-left">
              <p className="text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>
                How to Use PayLeef — 5 Simple Steps
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {doneSteps === 0
                  ? 'Follow these steps in order to process payroll'
                  : `${doneSteps} of 5 steps complete · ${doneSteps === 5 ? 'All done! 🎉' : 'Keep going!'}`
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Progress pills */}
            <div className="hidden sm:flex gap-1">
              {[1,2,3,4,5].map(n => (
                <div
                  key={n}
                  className="w-5 h-1.5 rounded-full transition-colors"
                  style={{
                    background: getStepStatus(n) === 'done'
                      ? '#16A34A'
                      : getStepStatus(n) === 'current'
                      ? G
                      : '#E2E8F0',
                  }}
                />
              ))}
            </div>
            {stepsCollapsed ? <ChevronDown size={16} style={{ color: 'var(--text-muted)' }} /> : <ChevronUp size={16} style={{ color: 'var(--text-muted)' }} />}
          </div>
        </button>

        {/* Steps grid */}
        {!stepsCollapsed && (
          <div className="px-4 pb-4 pt-1 space-y-2.5" style={{ background: '#FAFBFC' }}>
            {WORKFLOW_STEPS.map((step) => (
              <StepCard
                key={step.num}
                step={step}
                status={getStepStatus(step.num)}
                onAction={() => navigate(step.path)}
              />
            ))}

            {/* Bottom helper text */}
            <p className="text-center text-[11px] pt-1 pb-1" style={{ color: 'var(--text-muted)' }}>
              💡 Steps 1–3 are one-time setup. Steps 4–5 repeat every month.
            </p>
          </div>
        )}
      </div>

      {/* ── 3 key stats ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: 'Total Employees',
            value: employees.length || '—',
            sub: employees.length === 0 ? 'None added yet' : `across ${[...new Set(employees.map(e => e.department).filter(Boolean))].length || 0} departments`,
            icon: Users,
            path: '/admin/employees',
            color: G,
            bg: '#F0FDF4',
          },
          {
            label: 'Monthly Payroll',
            value: employees.length > 0 ? fmtShort(totalPayroll) : '—',
            sub: employees.length > 0 ? `avg ${fmtShort(totalPayroll / employees.length)}/person` : 'Add employees first',
            icon: TrendingUp,
            path: '/admin/analytics',
            color: '#7C3AED',
            bg: '#F5F3FF',
          },
          {
            label: `${MONTH_SHORT[thisMonth - 1]} Payslips`,
            value: employees.length > 0 ? `${thisMonthSlips.length}/${employees.length}` : '—',
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
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: bg }}>
              <Icon size={17} style={{ color }} />
            </div>
            <p className="text-[26px] font-black leading-none" style={{ color: 'var(--text-primary)' }}>{value}</p>
            <p className="text-[12px] font-semibold mt-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>
          </button>
        ))}
      </div>

      {/* ── Quick actions ── */}
      <div>
        <p className="text-[11px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
          Quick Actions
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Add / Edit Employees', icon: Users,     path: '/admin/employees', desc: 'Manage your team',        color: G,        bg: '#F0FDF4' },
            { label: 'Import Salaries',       icon: Upload,    path: '/admin/upload',    desc: 'Upload CSV or Excel',     color: '#0891B2', bg: '#ECFEFF' },
            { label: 'Generate & Send',        icon: Send,      path: '/admin/send',      desc: 'Create & email payslips', color: '#D97706', bg: '#FFFBEB' },
            { label: 'Download Reports',       icon: BarChart3, path: '/admin/reports',   desc: 'PF, ESI, Bank advice',    color: '#7C3AED', bg: '#F5F3FF' },
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

      {/* ── This month checklist ── */}
      <div
        className="rounded-2xl p-5"
        style={{ background: '#fff', border: '1.5px solid var(--border-light)', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
              {MONTH_NAMES[thisMonth - 1]} {thisYear} — Payroll Checklist
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Track this month's payroll tasks</p>
          </div>
          {/* Mini bar chart — last 3 months */}
          <div className="hidden sm:flex items-end gap-2 h-10">
            {recentMonths.map(({ label, count, isCurrent }) => (
              <div key={label} className="flex flex-col items-center gap-0.5">
                <div className="w-6 rounded-t-md transition-all" style={{
                  height: `${Math.max((count / maxCount) * 28, count > 0 ? 4 : 2)}px`,
                  background: isCurrent ? G : '#E2E8F0',
                  minHeight: 2,
                }} />
                <p className="text-[9px]" style={{ color: isCurrent ? G : 'var(--text-muted)', fontWeight: isCurrent ? 700 : 400 }}>
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {[
            {
              label: 'Employees added to the system',
              done: employees.length > 0,
              detail: employees.length > 0 ? `${employees.length} employees` : 'None yet — add employees first',
              path: '/admin/employees',
              critical: true,
            },
            {
              label: `Payslips generated for ${MONTH_SHORT[thisMonth - 1]}`,
              done: thisMonthSlips.length > 0 && thisMonthSlips.length === employees.length,
              partial: thisMonthSlips.length > 0 && thisMonthSlips.length < employees.length,
              detail: thisMonthSlips.length > 0
                ? `${thisMonthSlips.length} of ${employees.length} generated`
                : 'Not generated yet',
              path: '/admin/send',
              critical: true,
            },
            {
              label: `Payslips emailed to all employees`,
              done: emailedCount > 0 && emailedCount === thisMonthSlips.length,
              partial: emailedCount > 0 && emailedCount < thisMonthSlips.length,
              detail: emailedCount > 0 ? `${emailedCount} of ${thisMonthSlips.length} sent` : 'Not sent yet',
              path: '/admin/send',
              critical: true,
            },
            {
              label: 'Reports downloaded (PF, ESI, Bank)',
              done: false,
              detail: thisMonthSlips.length > 0 ? 'Ready to download' : 'Generate payslips first',
              path: '/admin/reports',
              optional: true,
            },
          ].map(({ label, done, detail, path, optional, partial, critical }) => (
            <button
              key={label}
              onClick={() => navigate(path)}
              className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-xl transition-all hover:bg-slate-50"
            >
              <div className="shrink-0">
                {done
                  ? <CheckCircle2 size={18} style={{ color: '#16A34A' }} />
                  : partial
                  ? <Clock size={18} style={{ color: '#F59E0B' }} />
                  : <Clock size={18} style={{ color: optional ? '#CBD5E1' : '#F59E0B' }} />
                }
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-medium" style={{ color: done ? '#94A3B8' : 'var(--text-primary)' }}>
                  {done && '✓ '}{label}
                  {optional && <span className="ml-2 text-[10px] font-normal text-slate-400">(optional)</span>}
                </p>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{detail}</p>
              </div>
              <ArrowRight size={13} style={{ color: 'var(--text-muted)' }} className="shrink-0" />
            </button>
          ))}
        </div>

        {recentMonths.every(m => m.count === 0) && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#F8FAFC' }}>
            <Zap size={13} style={{ color: 'var(--text-muted)' }} />
            <p className="text-[12px]" style={{ color: 'var(--text-muted)' }}>
              No payslips generated yet.{' '}
              <button onClick={() => navigate('/admin/send')} className="underline font-semibold" style={{ color: G }}>
                Generate now →
              </button>
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
