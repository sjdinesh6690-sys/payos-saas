import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Mail, RefreshCw, Eye, EyeOff } from 'lucide-react';

const RupeeLeaf = ({ size = 20 }) => (
  <svg viewBox="0 0 20 24" fill="none" style={{ width: size, height: size }}>
    <path d="M10,1 C16,1 19,7 18,13 C17,19 14,22 10,23 C6,22 3,19 2,13 C1,7 4,1 10,1 Z" fill="white"/>
    <line x1="10" y1="2" x2="10" y2="22" stroke="#1A7A4A" strokeWidth="1.7" strokeLinecap="round"/>
    <line x1="4" y1="7" x2="16" y2="7" stroke="#1A7A4A" strokeWidth="1.7" strokeLinecap="round"/>
    <line x1="4" y1="11" x2="16" y2="11" stroke="#1A7A4A" strokeWidth="1.7" strokeLinecap="round"/>
    <line x1="4" y1="11" x2="14" y2="20" stroke="#1A7A4A" strokeWidth="1.7" strokeLinecap="round"/>
  </svg>
);

function CheckEmailScreen({ email, onResend, resending, resendMsg }) {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0A1F13 0%, #0D2B1A 60%, #0F3D25 100%)' }}>
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-5">
            <Mail className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Check your email</h1>
          <p className="text-slate-500 text-sm mb-1">We sent a verification link to</p>
          <p className="font-semibold text-slate-800 text-base mb-6 bg-slate-50 rounded-lg px-4 py-2 inline-block">{email}</p>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-left text-sm text-blue-800 mb-6 space-y-1">
            <p className="font-semibold mb-2">What to do next:</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700">
              <li>Open your email inbox</li>
              <li>Find the email from PayLeef</li>
              <li>Click <strong>"Verify My Email"</strong></li>
              <li>Come back here and log in</li>
            </ol>
          </div>

          {resendMsg && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2 mb-4">
              {resendMsg}
            </div>
          )}

          <p className="text-xs text-slate-400 mb-5">Link expires in 24 hours. Check spam if you don't see it.</p>

          <div className="space-y-3">
            <button onClick={() => navigate('/login')}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm"
              style={{ background: '#1A7A4A' }}>
              Go to Login
            </button>
            <button onClick={onResend} disabled={resending}
              className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 flex items-center justify-center gap-2 disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
              {resending ? 'Sending…' : 'Resend verification email'}
            </button>
          </div>

          <p className="text-xs text-slate-400 mt-4">
            Wrong email?{' '}
            <button onClick={() => window.location.reload()} className="text-green-600 hover:underline">Start over</button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const [form, setForm]         = useState({ company_name: '', email: '', password: '' });
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [verified, setVerified] = useState(null);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const navigate = useNavigate();

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res  = await fetch('/api/auth/admin-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Registration failed');
      } else if (data.needs_verification) {
        setVerified(data.email || form.email);
      } else {
        navigate('/login');
      }
    } catch {
      setError('Cannot connect to server. Please try again.');
    } finally { setLoading(false); }
  };

  const handleResend = async () => {
    setResending(true); setResendMsg('');
    try {
      const res  = await fetch('/api/auth/resend-verification', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verified }),
      });
      const data = await res.json();
      setResendMsg(data.message || 'Sent!');
    } catch { setResendMsg('Failed to resend. Please try again.'); }
    finally { setResending(false); }
  };

  if (verified) {
    return <CheckEmailScreen email={verified} onResend={handleResend} resending={resending} resendMsg={resendMsg} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0A1F13 0%, #0D2B1A 60%, #0F3D25 100%)' }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div style={{ width: 42, height: 42, borderRadius: 13, background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RupeeLeaf size={24} />
          </div>
          <div>
            <div style={{ lineHeight: 1.1 }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em' }}>Pay</span>
              <span style={{ fontSize: 20, fontWeight: 900, color: '#4ADE80', letterSpacing: '-0.04em' }}>Leef</span>
            </div>
            <span style={{ display: 'block', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>PAYROLL FOR INDIA</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-1">Create your account</h2>
          <p className="text-sm text-slate-500 mb-6">Start your 30-day free trial</p>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
              <AlertCircle size={14} className="shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Company Name *</label>
              <input value={form.company_name} onChange={set('company_name')} placeholder="Acme Pvt. Ltd." required
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Work Email *</label>
              <input type="email" value={form.email} onChange={set('email')} placeholder="admin@yourcompany.com" required
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password *</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={form.password} onChange={set('password')}
                  placeholder="Min. 8 characters" required minLength={8}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none pr-10" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              By creating an account you agree to our{' '}
              <a href="/terms" target="_blank" className="text-green-600 hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="/privacy" target="_blank" className="text-green-600 hover:underline">Privacy Policy</a>.
            </p>

            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-bold text-white text-sm disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: '#1A7A4A' }}>
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating account…</>
                : 'Create Free Account'}
            </button>

            <p className="text-center text-xs text-slate-500 pt-1">
              Already have an account?{' '}
              <button type="button" onClick={() => navigate('/login')} className="text-green-600 hover:underline font-medium">Sign in</button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
