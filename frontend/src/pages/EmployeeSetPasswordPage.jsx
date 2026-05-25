/**
 * EmployeeSetPasswordPage — shown after first login when is_temp_password = true
 * Employee must set their own password before accessing payslips.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Eye, EyeOff } from 'lucide-react';

const RupeeLeaf = ({ size = 20 }) => (
  <svg viewBox="0 0 20 24" fill="none" style={{ width: size, height: size }}>
    <path d="M10,1 C16,1 19,7 18,13 C17,19 14,22 10,23 C6,22 3,19 2,13 C1,7 4,1 10,1 Z" fill="white"/>
    <line x1="10" y1="2" x2="10" y2="22" stroke="#1A7A4A" strokeWidth="1.7" strokeLinecap="round"/>
    <line x1="4" y1="7" x2="16" y2="7" stroke="#1A7A4A" strokeWidth="1.7" strokeLinecap="round"/>
    <line x1="4" y1="11" x2="16" y2="11" stroke="#1A7A4A" strokeWidth="1.7" strokeLinecap="round"/>
    <line x1="4" y1="11" x2="14" y2="20" stroke="#1A7A4A" strokeWidth="1.7" strokeLinecap="round"/>
  </svg>
);

export default function EmployeeSetPasswordPage() {
  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);
  const navigate = useNavigate();

  const token = localStorage.getItem('payslip_token');
  const name  = localStorage.getItem('employee_name') || 'Employee';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');

    setLoading(true);
    try {
      const res  = await fetch('/api/auth/employee-set-password', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ new_password: password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to set password.'); return; }
      navigate('/employee/payslips');
    } catch { setError('Cannot connect to server.'); }
    finally { setLoading(false); }
  };

  if (!token) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F4F5F7' }}>
      <div style={{ width: '100%', maxWidth: 440, background: '#fff', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.10)', padding: '40px 36px' }}>

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#1A7A4A', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(26,122,74,0.3)' }}>
            <RupeeLeaf size={22} />
          </div>
          <div>
            <div style={{ lineHeight: 1.1 }}>
              <span style={{ fontSize: 17, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.04em' }}>Pay</span>
              <span style={{ fontSize: 17, fontWeight: 900, color: '#1A7A4A', letterSpacing: '-0.04em' }}>Leef</span>
            </div>
            <span style={{ fontSize: 9, color: '#94A3B8', letterSpacing: '0.12em' }}>PAYROLL PORTAL</span>
          </div>
        </div>

        {/* Icon + Heading */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div style={{ width: 44, height: 44, background: '#DCFCE7', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={22} style={{ color: '#1A7A4A' }} />
          </div>
          <div>
            <p style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', margin: 0 }}>Set your password</p>
            <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>Welcome, {name}!</p>
          </div>
        </div>
        <p style={{ fontSize: 13, color: '#64748B', marginBottom: 24, lineHeight: 1.6 }}>
          You're using a temporary password. Please set a new password to secure your account before accessing your payslips.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
              New Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                style={{ width: '100%', border: '1.5px solid #E2E8F0', borderRadius: 10, padding: '10px 40px 10px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#F8FAFC' }}
                onFocus={e => e.target.style.borderColor = '#1A7A4A'}
                onBlur={e => e.target.style.borderColor = '#E2E8F0'}
              />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', alignItems: 'center' }}>
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {password && (
              <div style={{ marginTop: 6, display: 'flex', gap: 4 }}>
                {[
                  { label: 'Weak', color: password.length >= 1 ? '#EF4444' : '#E2E8F0' },
                  { label: 'Fair', color: password.length >= 6 ? '#F59E0B' : '#E2E8F0' },
                  { label: 'Good', color: password.length >= 8 ? '#10B981' : '#E2E8F0' },
                  { label: 'Strong', color: password.length >= 12 ? '#1A7A4A' : '#E2E8F0' },
                ].map(s => (
                  <div key={s.label} style={{ flex: 1, height: 4, borderRadius: 2, background: s.color }} />
                ))}
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>
              Confirm New Password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Re-enter password"
              required
              style={{ width: '100%', border: `1.5px solid ${confirm && confirm !== password ? '#EF4444' : '#E2E8F0'}`, borderRadius: 10, padding: '10px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#F8FAFC' }}
              onFocus={e => e.target.style.borderColor = '#1A7A4A'}
              onBlur={e => { if (!confirm || confirm === password) e.target.style.borderColor = '#E2E8F0'; }}
            />
            {confirm && confirm !== password && (
              <p style={{ fontSize: 11, color: '#EF4444', marginTop: 4 }}>Passwords do not match</p>
            )}
          </div>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: '100%', background: '#1A7A4A', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Setting password…' : 'Set Password & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
