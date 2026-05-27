/**
 * SessionTimeoutModal — shown 5 minutes before auto-logout
 */
import { Clock, LogOut, RefreshCw } from 'lucide-react';

export default function SessionTimeoutModal({ countdown, fmtTime, onKeepAlive, onLogout }) {
  if (countdown <= 0) return null;

  const urgent = countdown <= 60;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}>
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: '#fff', border: urgent ? '2px solid #EF4444' : '2px solid #F59E0B' }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center gap-3"
          style={{ background: urgent ? '#FEF2F2' : '#FFFBEB' }}
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: urgent ? '#FEE2E2' : '#FEF3C7' }}
          >
            <Clock size={20} style={{ color: urgent ? '#EF4444' : '#D97706' }} />
          </div>
          <div>
            <p className="text-sm font-bold" style={{ color: urgent ? '#DC2626' : '#92400E' }}>
              {urgent ? '⚠️  Session Expiring Soon!' : '🕒  Session Timeout Warning'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: urgent ? '#EF4444' : '#B45309' }}>
              You will be logged out automatically
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 text-center">
          <p className="text-xs text-slate-500 mb-2">Time remaining</p>
          <div
            className="text-5xl font-black tracking-tight mb-4"
            style={{ color: urgent ? '#EF4444' : '#1A7A4A', fontVariantNumeric: 'tabular-nums' }}
          >
            {fmtTime(countdown)}
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            Your session will expire due to inactivity.
            Click <strong>Stay Logged In</strong> to continue working.
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onKeepAlive}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: '#1A7A4A' }}
          >
            <RefreshCw size={15} />
            Stay Logged In
          </button>
          <button
            onClick={onLogout}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all active:scale-95"
          >
            <LogOut size={15} />
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
