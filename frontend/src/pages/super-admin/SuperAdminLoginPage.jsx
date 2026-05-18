import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Lock, Mail, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import api from '@/lib/api';

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
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: '#E85C2F' }}>
            <ShieldCheck size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">PayOS Master</h1>
          <p className="text-sm text-slate-400 mt-1">Super Admin Control Panel</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <div className="mb-6 p-4 rounded-xl border border-orange-100" style={{ background: '#FFF8F5' }}>
            <p className="text-xs text-orange-700 font-medium text-center">
              🔒 This area is restricted to PayOS administrators only
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Admin Email</label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="admin@payos.com"
                  className="w-full h-11 pl-10 pr-4 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
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
                  className="w-full h-11 pl-10 pr-10 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full h-11 rounded-xl text-white text-sm font-bold transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 mt-2"
              style={{ background: '#E85C2F' }}>
              {loading ? 'Signing in…' : 'Sign In to Master Panel'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-6">
            <a href="/login" className="hover:text-slate-600 transition-colors">← Back to Client Login</a>
          </p>
        </div>

        <p className="text-center text-white/20 text-xs mt-6">PayOS Master Control © {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}
