import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Lock, Mail, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import api from '@/lib/api';

const RupeeLeaf = ({ size = 20 }) => (
  <svg viewBox="0 0 20 24" fill="none" style={{ width: size, height: size }}>
    <path d="M10,1 C16,1 19,7 18,13 C17,19 14,22 10,23 C6,22 3,19 2,13 C1,7 4,1 10,1 Z" fill="white"/>
    <line x1="10" y1="2" x2="10" y2="22" stroke="#1A7A4A" strokeWidth="1.7" strokeLinecap="round"/>
    <line x1="4" y1="7" x2="16" y2="7" stroke="#1A7A4A" strokeWidth="1.7" strokeLinecap="round"/>
    <line x1="4" y1="11" x2="16" y2="11" stroke="#1A7A4A" strokeWidth="1.7" strokeLinecap="round"/>
    <line x1="4" y1="11" x2="14" y2="20" stroke="#1A7A4A" strokeWidth="1.7" strokeLinecap="round"/>
  </svg>
);

export default function SuperAdminLoginPage() {
  const navigate = useNavigate();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Enter email and password'); return; }
    setLoading(true);
    try {
      const res = await api.post('/super-admin/login', { email, password });
      localStorage.setItem('payos_super_token', res.data.token);
      localStorage.setItem('payos_super_role', 'super_admin');
      toast.success('Welcome, Master Admin');
      navigate('/super-admin/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)' }}>
      <div className="w-full max-w-md px-6">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: '#1A7A4A', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(26,122,74,0.4)' }}>
              <RupeeLeaf size={28} />
            </div>
            <div>
              <div style={{ lineHeight: 1.1 }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.04em' }}>Pay</span>
                <span style={{ fontSize: 22, fontWeight: 900, color: '#4ADE80', letterSpacing: '-0.04em' }}>Leef</span>
              </div>
              <span style={{ display: 'block', fontSize: 9.5, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em' }}>PAYROLL FOR INDIA</span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <ShieldCheck size={14} className="text-slate-400" />
            <p className="text-sm text-slate-400">Super Admin Control Panel</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="mb-6 p-4 rounded-xl border border-green-100" style={{ background: '#F0FDF4' }}>
            <p className="text-xs font-medium text-center" style={{ color: '#155C38' }}>
              🔒 This area is restricted to PayLeef administrators only
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Admin Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="admin@payleef.com"
                  className="w-full h-11 pl-10 pr-4 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': '#1A7A4A' }}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full h-11 pl-10 pr-10 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:border-transparent"
                  style={{ '--tw-ring-color': '#1A7A4A' }}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full h-11 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 mt-2"
              style={{ background: '#1A7A4A' }}>
              {loading ? 'Signing in…' : 'Sign In to Master Panel'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">
            <a href="/login" className="hover:text-slate-600 transition-colors">← Back to Client Login</a>
          </p>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">PayLeef Master Control © {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
