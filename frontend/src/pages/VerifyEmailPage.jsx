import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function VerifyEmailPage() {
  const [params]    = useSearchParams();
  const navigate    = useNavigate();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('error'); setMessage('Invalid verification link.'); return; }

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setStatus('error'); setMessage(data.error); }
        else            { setStatus('success'); setMessage(data.message || 'Email verified!'); }
      })
      .catch(() => { setStatus('error'); setMessage('Verification failed. Please try again.'); });
  }, [params]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0A1F13 0%, #0D2B1A 60%, #0F3D25 100%)' }}>
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-md text-center">

        {status === 'loading' && (
          <>
            <Loader2 className="w-14 h-14 text-green-600 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Verifying your email…</h2>
            <p className="text-slate-500 text-sm">Please wait a moment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Email Verified!</h2>
            <p className="text-slate-500 text-sm mb-6">{message}</p>
            <div className="bg-green-50 border border-green-100 rounded-xl px-5 py-3 text-sm text-green-800 mb-6">
              🎉 Your account is now active. You can log in and start managing payroll.
            </div>
            <button onClick={() => navigate('/login')}
              className="w-full py-3 rounded-xl font-bold text-white text-sm"
              style={{ background: '#1A7A4A' }}>
              Continue to Login
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Verification Failed</h2>
            <p className="text-slate-500 text-sm mb-6">{message}</p>
            <div className="space-y-3">
              <button onClick={() => navigate('/register')}
                className="w-full py-3 rounded-xl font-bold text-white text-sm"
                style={{ background: '#1A7A4A' }}>
                Back to Sign Up
              </button>
              <button onClick={() => navigate('/login')}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50">
                Go to Login
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
