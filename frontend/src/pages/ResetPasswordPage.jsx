import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';
import api from '@/lib/api';

export default function ResetPasswordPage() {
  const [params]       = useSearchParams();
  const navigate       = useNavigate();
  const token          = params.get('token') || '';

  const [password,    setPassword]    = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [showPwd,     setShowPwd]     = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [done,        setDone]        = useState(false);
  const [error,       setError]       = useState('');
  const [tokenValid,  setTokenValid]  = useState(null); // null = checking

  // Verify token on mount
  useEffect(() => {
    if (!token) { setTokenValid(false); return; }
    api.get(`/auth/verify-reset-token?token=${token}`)
      .then(r  => setTokenValid(r.data?.valid === true))
      .catch(() => setTokenValid(false));
  }, [token]);

  const strength = () => {
    let s = 0;
    if (password.length >= 8)          s++;
    if (/[A-Z]/.test(password))        s++;
    if (/[0-9]/.test(password))        s++;
    if (/[^a-zA-Z0-9]/.test(password)) s++;
    return s;
  };
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColor = ['', 'bg-red-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500'];
  const s = strength();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8)     { setError('Password must be at least 8 characters'); return; }
    if (password !== confirm)     { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold text-lg">P</div>
            <span className="text-2xl font-bold text-white tracking-tight">PayOS</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">

          {/* Checking token */}
          {tokenValid === null && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-sm text-slate-500">Verifying your reset link…</p>
            </div>
          )}

          {/* Invalid / expired token */}
          {tokenValid === false && (
            <div className="text-center py-4">
              <XCircle size={48} className="text-red-400 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-slate-900 mb-2">Link expired or invalid</h2>
              <p className="text-sm text-slate-500 mb-5">
                This password reset link has expired or already been used. Please request a new one.
              </p>
              <Link
                to="/forgot-password"
                className="inline-block bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
              >
                Request new reset link
              </Link>
            </div>
          )}

          {/* Success */}
          {done && (
            <div className="text-center py-4">
              <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
              <h2 className="text-lg font-bold text-slate-900 mb-2">Password reset!</h2>
              <p className="text-sm text-slate-500 mb-1">Your password has been updated successfully.</p>
              <p className="text-xs text-slate-400">Redirecting you to login in 3 seconds…</p>
              <Link to="/login" className="mt-4 inline-block text-sm text-orange-600 hover:underline">
                Go to login now
              </Link>
            </div>
          )}

          {/* Reset form */}
          {tokenValid === true && !done && (
            <>
              <div className="mb-6">
                <h1 className="text-xl font-bold text-slate-900">Set new password</h1>
                <p className="text-sm text-slate-500 mt-1">Choose a strong password for your PayOS account.</p>
              </div>

              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">New password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      autoFocus
                      className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {/* Strength bar */}
                  {password.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex gap-1 flex-1">
                        {[1,2,3,4].map(i => (
                          <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${s >= i ? strengthColor[s] : 'bg-slate-200'}`} />
                        ))}
                      </div>
                      <span className={`text-xs font-medium ${s <= 1 ? 'text-red-500' : s === 2 ? 'text-yellow-500' : s === 3 ? 'text-blue-500' : 'text-green-600'}`}>
                        {strengthLabel[s]}
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm password</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      placeholder="Re-enter your password"
                      className={`w-full pl-9 pr-4 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent ${
                        confirm && confirm !== password ? 'border-red-300 bg-red-50' : 'border-slate-200'
                      }`}
                    />
                  </div>
                  {confirm && confirm !== password && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || password !== confirm || password.length < 8}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition-colors"
                >
                  {loading ? 'Updating password…' : 'Reset password'}
                </button>
              </form>
            </>
          )}

          {/* Back to login */}
          {!done && (
            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <Link to="/login" className="text-sm text-slate-500 hover:text-slate-800 transition-colors">
                ← Back to login
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
