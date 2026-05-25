import { Clock, AlertTriangle, CheckCircle, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTrial } from '@/lib/TrialContext';

export default function TrialBanner() {
  const { trialActive, daysRemaining, isReadOnly, isPaid, loading } = useTrial();
  const navigate = useNavigate();

  // Don't show if loading or if paid plan
  if (loading || isPaid) return null;

  // ── Trial EXPIRED (read-only mode) ──────────────────────────────────────
  if (isReadOnly) {
    return (
      <div
        className="mx-4 mt-3 rounded-2xl px-5 py-3 flex items-center gap-3 border"
        style={{ background: '#FFF1F1', borderColor: '#FECACA' }}
      >
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#FEE2E2' }}>
          <Lock size={16} className="text-red-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-red-800">Your free trial has ended</p>
          <p className="text-xs text-red-600 mt-0.5">
            You can still <strong>view</strong> all your data. To add employees, generate payslips, or send emails — please upgrade your plan.
          </p>
        </div>
        <a
          href="/admin/billing"
          className="shrink-0 text-xs font-bold text-white px-4 py-2 rounded-xl transition-opacity hover:opacity-90"
          style={{ background: '#E85C2F' }}
        >
          Upgrade Now →
        </a>
      </div>
    );
  }

  // ── Trial ends TODAY or tomorrow ────────────────────────────────────────
  if (daysRemaining <= 1) {
    return (
      <div
        className="mx-4 mt-3 rounded-2xl px-5 py-3 flex items-center gap-3 border"
        style={{ background: '#FFFBEB', borderColor: '#FCD34D' }}
      >
        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#FEF3C7' }}>
          <AlertTriangle size={16} className="text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-amber-800">
            {daysRemaining === 0 ? '⚡ Trial ends today!' : '⚡ Only 1 day left!'}
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            After your trial, you can still view your data but some features will be locked.
          </p>
        </div>
        <a
          href="/admin/billing"
          className="shrink-0 text-xs font-bold text-white px-4 py-2 rounded-xl transition-opacity hover:opacity-90"
          style={{ background: '#E85C2F' }}
        >
          Upgrade Now →
        </a>
      </div>
    );
  }

  // ── Running low (≤ 7 days) ──────────────────────────────────────────────
  if (daysRemaining <= 7) {
    return (
      <div
        className="mx-4 mt-3 rounded-2xl px-5 py-2.5 flex items-center gap-3 border"
        style={{ background: '#FFF7ED', borderColor: '#FED7AA' }}
      >
        <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#FFEDD5' }}>
          <Clock size={14} className="text-orange-600" />
        </div>
        <p className="text-xs text-orange-800 flex-1">
          <strong>{daysRemaining} days</strong> left in your free trial
          &nbsp;·&nbsp; After that, you can still view your data while you decide.
        </p>
        <a
          href="/admin/billing"
          className="shrink-0 text-xs font-semibold hover:underline"
          style={{ color: '#E85C2F' }}
        >
          Upgrade →
        </a>
      </div>
    );
  }

  // ── Healthy trial (> 7 days) — show compact green banner ───────────────
  return (
    <div
      className="mx-4 mt-3 rounded-2xl px-5 py-2.5 flex items-center gap-3"
      style={{ background: '#F0FDF4' }}
    >
      <CheckCircle size={15} className="text-green-500 shrink-0" />
      <p className="text-xs text-green-800 flex-1">
        🎉 <strong>{daysRemaining} days</strong> left in your free trial — enjoy all features!
      </p>
    </div>
  );
}
