/**
 * EmployeeResetPasswordPage — employee clicks link in email to reset password
 */
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, AlertCircle, Eye, EyeOff } from 'lucide-react';

const RupeeLeaf = ({ size = 20 }) => (
  <svg viewBox="0 0 20 24" fill="none" style={{ width: size, height: size }}>
    <path d="M10,1 C16,1 19,7 18,13 C17,19 14,22 10,23 C6,22 3,19 2,13 C1,7 4,1 10,1 Z" fill="white"/>
    <line x1="10" y1="2" x2="10" y2="22" stroke="#1A7A4A" strokeWidth="1.7" strokeLinecap="round"/>
    <line x1="4" y1="7" x2="16" y2="7" stroke="#1A7A4A" strokeWidth="1.7" strokeLinecap="round"/>
    <line x1="4" y1="11" x2="16" y2="11" stroke="#1A7A4A" strokeWidth="1.7" strokeLinecap="round"/>
    <line x1="4" y1="11" x2="14" y2="20" stroke="#1A7A4A" strokeWidth="1.7" strokeLinecap="round"/>
  </svg>
);

export default function EmployeeResetPasswordPage() {
  const [searchParams]  = useSearchParams();
  const token           = searchParams.get('token') || '';
  const [valid, setValid]       = useState(null); // null=checking, true, false
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) { setValid(false); return; }
    fetch(`/api/auth/employee-verify-reset-token?token=${token}`)
      .then(r => r.json())
      .then(d => setValid(d.valid))
      .catch(() => setValid(false));
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setLoading(true);
    try {
      const res  = await fetch('/api/auth/employee-reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Reset failed.'); return; }
      setSuccess(data.message || 'Password reset! You can now log in.');
      setTimeout(() => navigate('/login'), 2500);
    } catch { setError('Cannot connect to server.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#F4F5F7' }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 20, boxShadow: '0 8px 40px rgba(0,0,0,0.10)', padding: '40px 36px' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#1A7A4A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RupeeLeaf size={22} />
          </div>
          <div>
            <div><span style={{ fontSize: 17, fontWeight: 900, color: '#0F172A' }}>Pay</span><span style={{ fontSize: 17, fontWeight: 900, color: '#1A7A4A' }}>Leef</span></div>
            <span style={{ fontSize: 9, color: '#94A3B8', letterSpacing: '0.12em' }}>PAYROLL PORTAL</span>
          </div>
        </div>

        {valid === null && (
          <p style={{ color: '#64748B', fontSize: 13, textAlign: 'center' }}>Verifying your reset link…</p>
        )}

        {valid === false && (
          <div style={{ textAlign: 'center' }}>
            <AlertCircle size={40} style={{ color: '#EF4444', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Link expired or invalid</p>
            <p style={{ fontSize: 13, color: '#64748B', marginBottom: 20 }}>This reset link has expired or already been used. Request a new one from the login page.</p>
            <button onClick={() => navigate('/login')}
              style={{ background: '#1A7A4A', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Back to Login
            </button>
          </div>
        )}

        {valid === true && !success && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 44, height: 44, background: '#DCFCE7', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldCheck size={22} style={{ color: '#1A7A4A' }} />
              </div>
              <div>
                <p style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', margin: 0 }}>Set new password</p>
                <p style={{ fontSize: 12, color: '#64748B', margin: 0 }}>Choose a password you'll remember</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 characters" required
                    style={{ width: '100%', border: '1.5px solid #E2E8F0', borderRadius: 10, padding: '10px 40px 10px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#F8FAFC' }}
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', alignItems: 'center' }}>
                    {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Confirm Password</label>
                <input
                  type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                  placeholder="Re-enter password" required
                  style={{ width: '100%', border: `1.5px solid ${confirm && confirm !== password ? '#EF4444' : '#E2E8F0'}`, borderRadius: 10, padding: '10px 14px', fontSize: 14, outline: 'none', boxSizing: 'border-box', background: '#F8FAFC' }}
                />
              </div>
              {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#DC2626' }}>{error}</div>}
              <button type="submit" disabled={loading}
                style={{ width: '100%', background: '#1A7A4A', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 0', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                {loading ? 'Setting password…' : 'Reset Password'}
              </button>
            </form>
          </>
        )}

        {success && (
          <div style={{ textAlign: 'center' }}>
            <ShieldCheck size={44} style={{ color: '#1A7A4A', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>Password set!</p>
            <p style={{ fontSize: 13, color: '#64748B' }}>{success}</p>
            <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 8 }}>Redirecting to login…</p>
          </div>
        )}
      </div>
    </div>
  );
}
