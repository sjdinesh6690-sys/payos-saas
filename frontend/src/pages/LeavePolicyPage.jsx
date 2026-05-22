import { useState, useEffect } from 'react';
import { Save, RefreshCw, Info, CalendarDays, Briefcase, Heart, Award } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

const Field = ({ label, value, onChange, min = 0, max = 365, suffix = 'days/year', description }) => (
  <div style={{ background: '#fff', border: '1.5px solid var(--border-light)', borderRadius: 14, padding: '18px 20px' }}>
    <div className="flex items-start justify-between mb-3">
      <div>
        <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 3 }}>{label}</p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>{description}</p>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <input
        type="number"
        value={value}
        onChange={e => onChange(Math.max(min, Math.min(max, parseInt(e.target.value) || 0)))}
        min={min}
        max={max}
        style={{
          width: 80,
          padding: '8px 12px',
          border: '1.5px solid var(--border-light)',
          borderRadius: 8,
          fontSize: 18,
          fontWeight: 800,
          color: 'var(--text-primary)',
          textAlign: 'center',
          outline: 'none',
        }}
        onFocus={e => e.target.style.borderColor = '#1A7A4A'}
        onBlur={e => e.target.style.borderColor = 'var(--border-light)'}
      />
      <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{suffix}</span>
    </div>
  </div>
);

export default function LeavePolicyPage() {
  const [policy, setPolicy] = useState({
    casual_leave_days:      12,
    sick_leave_days:        12,
    earned_leave_days:      15,
    working_days_per_month: 26,
    leave_year_start_month: 4,
  });
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);

  useEffect(() => {
    api.get('/leave-policy')
      .then(r => setPolicy(r.data))
      .catch(() => toast.error('Could not load leave policy'))
      .finally(() => setLoading(false));
  }, []);

  const set = (key, val) => setPolicy(p => ({ ...p, [key]: val }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/leave-policy', policy);
      toast.success('Leave policy saved successfully!');
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const totalLeaves = policy.casual_leave_days + policy.sick_leave_days + policy.earned_leave_days;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={22} className="animate-spin text-green-600" />
    </div>
  );

  return (
    <div className="p-6 max-w-3xl space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
            Leave Policy
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            Set your company's annual leave entitlement. Used to calculate LOP in attendance.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#1A7A4A', color: '#fff',
            border: 'none', borderRadius: 10,
            padding: '10px 20px', fontSize: 14, fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? <><RefreshCw size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Save Policy</>}
        </button>
      </div>

      {/* Summary strip */}
      <div style={{ background: '#F0FFF4', border: '1.5px solid #bbf7d0', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <CalendarDays size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
        <span style={{ fontSize: 13, color: '#15803d', fontWeight: 600 }}>
          Total annual leave entitlement per employee: <strong>{totalLeaves} days</strong>
          &nbsp;·&nbsp; Leave year starts: <strong>{MONTH_NAMES[(policy.leave_year_start_month - 1)]} 1</strong>
          &nbsp;·&nbsp; Working days/month: <strong>{policy.working_days_per_month}</strong>
        </span>
      </div>

      {/* Leave type fields */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          Leave Entitlements (per employee per year)
        </p>
        <div className="grid grid-cols-1 gap-3">

          <Field
            label="Casual Leave (CL)"
            value={policy.casual_leave_days}
            onChange={v => set('casual_leave_days', v)}
            description="For personal reasons, emergencies, or short unplanned absences. Usually 12 days/year. Cannot be carried forward."
          />

          <Field
            label="Sick Leave (SL)"
            value={policy.sick_leave_days}
            onChange={v => set('sick_leave_days', v)}
            description="For illness or medical appointments with a doctor's certificate. Usually 12 days/year. Cannot be carried forward."
          />

          <Field
            label="Earned / Privilege Leave (EL / PL)"
            value={policy.earned_leave_days}
            onChange={v => set('earned_leave_days', v)}
            description="Earned through service. Usually 15 days/year (1.25 days per month worked). Can be carried forward (up to limits per company policy)."
          />
        </div>
      </div>

      {/* Working days + leave year */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          Payroll Defaults
        </p>
        <div className="grid grid-cols-2 gap-3">

          <Field
            label="Working Days per Month"
            value={policy.working_days_per_month}
            onChange={v => set('working_days_per_month', v)}
            min={1}
            max={31}
            suffix="days/month"
            description="Default working days used in each month for salary calculation. Common: 26 (6-day week) or 22 (5-day week)."
          />

          <div style={{ background: '#fff', border: '1.5px solid var(--border-light)', borderRadius: 14, padding: '18px 20px' }}>
            <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)', marginBottom: 3 }}>Leave Year Start</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12 }}>
              Month when annual leave balance resets. April for Indian financial year, January for calendar year.
            </p>
            <select
              value={policy.leave_year_start_month}
              onChange={e => set('leave_year_start_month', parseInt(e.target.value))}
              style={{
                padding: '8px 12px',
                border: '1.5px solid var(--border-light)',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--text-primary)',
                background: '#fff',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              {MONTH_NAMES.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* How LOP is calculated */}
      <div style={{ background: '#EFF6FF', border: '1.5px solid #bfdbfe', borderRadius: 12, padding: '16px 18px' }}>
        <div className="flex items-start gap-3">
          <Info size={16} style={{ color: '#3b82f6', flexShrink: 0, marginTop: 1 }} />
          <div>
            <p style={{ fontWeight: 700, fontSize: 13, color: '#1e40af', marginBottom: 6 }}>How LOP is calculated in Attendance</p>
            <p style={{ fontSize: 13, color: '#1d4ed8', lineHeight: 1.7 }}>
              <strong>Absent days</strong> = Working Days − Present Days<br />
              <strong>Leaves used</strong> = CL taken + SL taken + EL taken (entered in Attendance)<br />
              <strong>LOP</strong> = MAX(0, Absent days − Leaves used)<br />
              <br />
              Example: 26 working days, 22 present → 4 absent. Employee takes 2 CL + 1 SL = 3 leaves.
              LOP = 4 − 3 = <strong>1 day LOP</strong>. Salary is deducted for 1 day only.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
