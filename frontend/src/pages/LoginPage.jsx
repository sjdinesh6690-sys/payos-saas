import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Mail, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const RupeeLeaf = ({ size = 20 }) => (
  <svg viewBox="0 0 20 24" fill="none" style={{ width: size, height: size }}>
    <path d="M10,1 C16,1 19,7 18,13 C17,19 14,22 10,23 C6,22 3,19 2,13 C1,7 4,1 10,1 Z" fill="white"/>
    <line x1="10" y1="2" x2="10" y2="22" stroke="#1A7A4A" strokeWidth="1.7" strokeLinecap="round"/>
    <line x1="4" y1="7" x2="16" y2="7" stroke="#1A7A4A" strokeWidth="1.7" strokeLinecap="round"/>
    <line x1="4" y1="11" x2="16" y2="11" stroke="#1A7A4A" strokeWidth="1.7" strokeLinecap="round"/>
    <line x1="4" y1="11" x2="14" y2="20" stroke="#1A7A4A" strokeWidth="1.7" strokeLinecap="round"/>
  </svg>
);

export default function LoginPage() {
  const [tab, setTab]                     = useState('admin');
  const [adminEmail, setAdminEmail]       = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [empId, setEmpId]                 = useState('');
  const [empEmail, setEmpEmail]           = useState('');
  const [error, setError]                 = useState('');
  const [loading, setLoading]             = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resending, setResending]         = useState(false);
  const [resendMsg, setResendMsg]         = useState('');
  const navigate = useNavigate();

  const loginAdmin = async (e) => {
    e.preventDefault();
    setError(''); setUnverifiedEmail(''); setResendMsg(''); setLoading(true);
    try {
      const res  = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword }),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('payslip_token', data.token);
        localStorage.setItem('payslip_role', 'employer');
        // Store sub-user info if applicable
        if (data.is_sub_user) {
          localStorage.setItem('payslip_is_sub_user', 'true');
          localStorage.setItem('payslip_sub_user_name', data.sub_user_name || '');
          localStorage.setItem('payslip_permissions', JSON.stringify(data.permissions || {}));
        } else {
          localStorage.removeItem('payslip_is_sub_user');
          localStorage.removeItem('payslip_sub_user_name');
          localStorage.removeItem('payslip_permissions');
        }
        navigate(data.onboarding_completed === false ? '/onboarding' : '/admin/dashboard');
      } else if (data.needs_verification) {
        setUnverifiedEmail(data.email || adminEmail);
      } else { setError(data.error || 'Login failed'); }
    } catch { setError('Cannot connect to server.'); }
    finally { setLoading(false); }
  };

  const handleResendFromLogin = async () => {
    setResending(true); setResendMsg('');
    try {
      const res  = await fetch('/api/auth/resend-verification', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: unverifiedEmail }),
      });
      const data = await res.json();
      setResendMsg(data.message || 'Verification email sent!');
    } catch { setResendMsg('Failed to resend. Please try again.'); }
    finally { setResending(false); }
  };

  const loginEmployee = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res  = await fetch('/api/auth/employee-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: empId, email: empEmail }),
      });
      const data = await res.json();
      if (data.token) {
        localStorage.setItem('payslip_token', data.token);
        localStorage.setItem('payslip_role', 'employee');
        localStorage.setItem('employee_name', data.employee_name || '');
        navigate('/employee/payslips');
      } else { setError(data.error || 'Login failed'); }
    } catch { setError('Cannot connect to server.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#F4F5F7' }}>
      {/* Left panel - brand */}
      <div className="hidden lg:flex w-80 flex-col items-center justify-center p-10 text-white" style={{ background: '#1A7A4A' }}>
        {/* Logo lockup on dark background */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ width: 52, height: 52, borderRadius: 15, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RupeeLeaf size={30} />
          </div>
          <div>
            <div style={{ lineHeight: 1.1 }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em' }}>Pay</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: '#4ADE80', letterSpacing: '-0.04em' }}>Leef</span>
            </div>
            <span style={{ display: 'block', fontSize: 10, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em' }}>PAYROLL FOR INDIA</span>
          </div>
        </div>
        <p className="text-sm text-green-100 text-center leading-relaxed">
          Smart payroll management for modern businesses. Generate payslips, manage employees, stay compliant — all in one place.
        </p>
        <div className="mt-10 space-y-3 w-full">
          {['PF, ESI & statutory compliance', 'Auto payslip generation', 'Bulk email delivery', 'Custom payroll components'].map(f => (
            <div key={f} className="flex items-center gap-2 text-sm text-green-100">
              <div className="w-1.5 h-1.5 bg-white rounded-full shrink-0" />
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Mobile brand */}
          <div className="lg:hidden text-center mb-8">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: '#1A7A4A', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(26,122,74,0.3)' }}>
                <RupeeLeaf size={22} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ lineHeight: 1.1 }}>
                  <span style={{ fontSize: 17, fontWeight: 900, color: '#0F172A', letterSpacing: '-0.04em' }}>Pay</span>
                  <span style={{ fontSize: 17, fontWeight: 900, color: '#1A7A4A', letterSpacing: '-0.04em' }}>Leef</span>
                </div>
                <span style={{ display: 'block', fontSize: 9.5, color: '#94A3B8', letterSpacing: '0.1em' }}>PAYROLL FOR INDIA</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-100">
              {['admin', 'employee'].map(t => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(''); }}
                  className={`flex-1 py-3.5 text-sm font-medium transition-colors ${
                    tab === t
                      ? 'border-b-2 text-white'
                      : 'text-slate-500 hover:text-slate-700 bg-slate-50'
                  }`}
                  style={tab === t ? { borderBottomColor: '#1A7A4A', color: '#1A7A4A', background: '#F0FDF4' } : {}}
                >
                  {t === 'admin' ? 'Admin Login' : 'Employee Login'}
                </button>
              ))}
            </div>

            <div className="px-6 py-6 space-y-4">
              {error && (
                <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              {unverifiedEmail && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 text-sm space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 font-semibold">
                    <Mail size={15} className="shrink-0" /> Email not verified
                  </div>
                  <p className="text-amber-700 text-xs leading-relaxed">
                    We sent a verification link to <strong>{unverifiedEmail}</strong>. Please check your inbox and click the link to activate your account.
                  </p>
                  {resendMsg && (
                    <p className="text-green-700 text-xs bg-green-50 border border-green-200 rounded px-2 py-1">{resendMsg}</p>
                  )}
                  <button onClick={handleResendFromLogin} disabled={resending}
                    className="flex items-center gap-1.5 text-xs font-medium text-amber-800 hover:text-amber-900 disabled:opacity-50">
                    <RefreshCw size={12} className={resending ? 'animate-spin' : ''} />
                    {resending ? 'Sending…' : 'Resend verification email'}
                  </button>
                </div>
              )}

              {tab === 'admin' ? (
                <form onSubmit={loginAdmin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
                    <Input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="admin@company.com" required />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-700">Password</label>
                      <button type="button" onClick={() => navigate('/forgot-password')} className="text-xs hover:underline" style={{ color: '#1A7A4A' }}>
                        Forgot password?
                      </button>
                    </div>
                    <Input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="••••••••" required />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full h-10 text-white" style={{ background: '#1A7A4A' }}>
                    {loading ? 'Signing in…' : 'Sign In'}
                  </Button>
                  <p className="text-center text-xs text-slate-500 pt-1">
                    No account?{' '}
                    <button type="button" onClick={() => navigate('/register')} className="font-medium hover:underline" style={{ color: '#1A7A4A' }}>
                      Create one
                    </button>
                  </p>
                </form>
              ) : (
                <form onSubmit={loginEmployee} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Employee ID</label>
                    <Input value={empId} onChange={e => setEmpId(e.target.value)} placeholder="EMP001" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
                    <Input type="email" value={empEmail} onChange={e => setEmpEmail(e.target.value)} placeholder="your@email.com" required />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full h-10 text-white" style={{ background: '#1A7A4A' }}>
                    {loading ? 'Signing in…' : 'Sign In'}
                  </Button>
                  <p className="text-center text-xs text-slate-500 pt-1">Contact your HR for your Employee ID</p>
                </form>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            © {new Date().getFullYear()} PayLeef · Payroll for India
          </p>
        </div>
      </div>
    </div>
  );
}
