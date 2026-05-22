import { useState, useEffect } from 'react';
import { Save, RefreshCw, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

const MONTH_NAMES = ['January','February','March','April','May','June',
                     'July','August','September','October','November','December'];

// Simple big-number input card
const LeaveCard = ({ emoji, title, subtitle, value, onChange, min = 0, max = 60 }) => (
  <div style={{
    background: '#fff',
    border: '2px solid #E2E8F0',
    borderRadius: 16,
    padding: '20px 22px',
    display: 'flex',
    alignItems: 'center',
    gap: 20,
    transition: 'border-color 0.15s',
  }}
    onMouseEnter={e => e.currentTarget.style.borderColor = '#1A7A4A'}
    onMouseLeave={e => e.currentTarget.style.borderColor = '#E2E8F0'}
  >
    <div style={{ fontSize: 32, lineHeight: 1 }}>{emoji}</div>
    <div style={{ flex: 1 }}>
      <p style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', marginBottom: 2 }}>{title}</p>
      <p style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.5 }}>{subtitle}</p>
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <input
        type="number"
        value={value}
        onChange={e => {
          const v = parseInt(e.target.value);
          if (!isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
        }}
        min={min}
        max={max}
        style={{
          width: 72,
          padding: '10px 8px',
          border: '2px solid #E2E8F0',
          borderRadius: 12,
          fontSize: 22,
          fontWeight: 800,
          color: '#0F172A',
          textAlign: 'center',
          outline: 'none',
        }}
        onFocus={e => e.target.style.borderColor = '#1A7A4A'}
        onBlur={e => e.target.style.borderColor = '#E2E8F0'}
      />
      <span style={{ fontSize: 13, color: '#94A3B8', whiteSpace: 'nowrap' }}>days / year</span>
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
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

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
      setSaved(true);
      toast.success('Leave policy saved!');
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const total = policy.casual_leave_days + policy.sick_leave_days + policy.earned_leave_days;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={22} className="animate-spin text-green-600" />
    </div>
  );

  return (
    <div className="p-6 max-w-2xl space-y-6">

      {/* Header */}
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>
          Leave Policy
        </h1>
        <p style={{ fontSize: 14, color: '#64748B' }}>
          Set this once. These rules apply to every employee when you track attendance.
        </p>
      </div>

      {/* Big summary pill */}
      <div style={{
        background: 'linear-gradient(135deg, #1A7A4A 0%, #16a34a 100%)',
        borderRadius: 16,
        padding: '18px 24px',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
      }}>
        <div>
          <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 4 }}>Every employee gets per year</p>
          <p style={{ fontSize: 28, fontWeight: 900 }}>{total} leave days</p>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {[
            { label: 'Casual',   val: policy.casual_leave_days },
            { label: 'Sick',     val: policy.sick_leave_days },
            { label: 'Privilege', val: policy.earned_leave_days },
          ].map(({ label, val }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 20, fontWeight: 800 }}>{val}</p>
              <p style={{ fontSize: 11, opacity: 0.75 }}>{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Leave type cards */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          How many days off does each employee get per year?
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

          <LeaveCard
            emoji="🏠"
            title="Casual Leave"
            subtitle="For personal work, family events, or unexpected situations. Employee can take without medical certificate."
            value={policy.casual_leave_days}
            onChange={v => set('casual_leave_days', v)}
          />

          <LeaveCard
            emoji="🤒"
            title="Sick Leave"
            subtitle="When the employee is unwell or needs medical attention. Usually requires a doctor's note."
            value={policy.sick_leave_days}
            onChange={v => set('sick_leave_days', v)}
          />

          <LeaveCard
            emoji="🌴"
            title="Privilege / Earned Leave"
            subtitle="Planned holidays that employees earn over time. Can usually be carried forward to next year."
            value={policy.earned_leave_days}
            onChange={v => set('earned_leave_days', v)}
          />

        </div>
      </div>

      {/* Working days + year start */}
      <div>
        <p style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
          Payroll settings
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

          {/* Working days */}
          <div style={{ background: '#fff', border: '2px solid #E2E8F0', borderRadius: 16, padding: '20px 22px' }}>
            <p style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', marginBottom: 4 }}>📅 Working Days per Month</p>
            <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 14 }}>
              Used as the default when you open attendance each month.<br />
              <strong>26</strong> = 6-day week &nbsp;·&nbsp; <strong>22</strong> = 5-day week
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                type="number"
                value={policy.working_days_per_month}
                onChange={e => {
                  const v = parseInt(e.target.value);
                  if (!isNaN(v)) set('working_days_per_month', Math.max(1, Math.min(31, v)));
                }}
                min={1} max={31}
                style={{
                  width: 72,
                  padding: '10px 8px',
                  border: '2px solid #E2E8F0',
                  borderRadius: 12,
                  fontSize: 22,
                  fontWeight: 800,
                  color: '#0F172A',
                  textAlign: 'center',
                  outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = '#1A7A4A'}
                onBlur={e => e.target.style.borderColor = '#E2E8F0'}
              />
              <span style={{ fontSize: 13, color: '#94A3B8' }}>days / month</span>
            </div>
          </div>

          {/* Leave year start */}
          <div style={{ background: '#fff', border: '2px solid #E2E8F0', borderRadius: 16, padding: '20px 22px' }}>
            <p style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', marginBottom: 4 }}>🔄 Leave Year Starts In</p>
            <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 14 }}>
              When leave balances reset each year.<br />
              Most Indian companies use <strong>April</strong> (financial year).
            </p>
            <select
              value={policy.leave_year_start_month}
              onChange={e => set('leave_year_start_month', parseInt(e.target.value))}
              style={{
                padding: '10px 14px',
                border: '2px solid #E2E8F0',
                borderRadius: 12,
                fontSize: 14,
                fontWeight: 700,
                color: '#0F172A',
                background: '#fff',
                outline: 'none',
                cursor: 'pointer',
                width: '100%',
              }}
              onFocus={e => e.target.style.borderColor = '#1A7A4A'}
              onBlur={e => e.target.style.borderColor = '#E2E8F0'}
            >
              {MONTH_NAMES.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          width: '100%',
          padding: '14px 24px',
          background: saved ? '#16a34a' : '#1A7A4A',
          color: '#fff',
          border: 'none',
          borderRadius: 14,
          fontSize: 15,
          fontWeight: 700,
          cursor: saving ? 'not-allowed' : 'pointer',
          opacity: saving ? 0.8 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          transition: 'background 0.2s',
        }}
      >
        {saving
          ? <><RefreshCw size={16} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</>
          : saved
          ? <><CheckCircle size={16} /> Policy Saved!</>
          : <><Save size={16} /> Save Leave Policy</>}
      </button>

      {/* Simple explainer */}
      <div style={{ background: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: 14, padding: '16px 20px' }}>
        <p style={{ fontWeight: 700, fontSize: 13, color: '#374151', marginBottom: 10 }}>
          ℹ️ How this works with Attendance
        </p>
        <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.9 }}>
          When you record attendance each month, enter how many days the employee was present and how many approved leaves they took.
          <br />
          <strong style={{ color: '#0F172A' }}>LOP (Loss of Pay)</strong> = Days absent − Approved leaves taken.
          <br />
          <em>Example: Employee absent 4 days, took 3 approved leaves → LOP = 1 day → salary cut for 1 day only.</em>
        </div>
      </div>

    </div>
  );
}
