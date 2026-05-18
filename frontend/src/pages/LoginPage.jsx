import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const [tab, setTab]                     = useState('admin');
  const [adminEmail, setAdminEmail]       = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [empId, setEmpId]                 = useState('');
  const [empEmail, setEmpEmail]           = useState('');
  const [error, setError]                 = useState('');
  const [loading, setLoading]             = useState(false);
  const navigate = useNavigate();

  const loginAdmin = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
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
        // New clients go to onboarding, existing go to dashboard
        navigate(data.onboarding_completed === false ? '/onboarding' : '/admin/dashboard');
      } else { setError(data.error || 'Login failed'); }
    } catch { setError('Cannot connect to server.'); }
    finally { setLoading(false); }
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
      <div className="hidden lg:flex w-80 flex-col items-center justify-center p-10 text-white" style={{ background: '#1B4FBF' }}>
        <div className="w-16 h-16 bg-white bg-opacity-20 rounded-2xl flex items-center justify-center mb-6">
          <FileText size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-center">PayOS</h1>
        <p className="text-sm text-blue-100 text-center leading-relaxed">
          Smart payroll management for modern businesses. Generate payslips, manage employees, stay compliant — all in one place.
        </p>
        <div className="mt-10 space-y-3 w-full">
          {['PF, ESI & statutory compliance', 'Auto payslip generation', 'Bulk email delivery', 'Custom payroll components'].map(f => (
            <div key={f} className="flex items-center gap-2 text-sm text-blue-100">
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
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: '#1B4FBF' }}>
              <FileText size={22} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">PayOS</h1>
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
                  style={tab === t ? { borderBottomColor: '#1B4FBF', color: '#1B4FBF', background: '#EEF3FF' } : {}}
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

              {tab === 'admin' ? (
                <form onSubmit={loginAdmin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
                    <Input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="admin@company.com" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
                    <Input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="••••••••" required />
                  </div>
                  <Button type="submit" disabled={loading} className="w-full h-10 text-white" style={{ background: '#1B4FBF' }}>
                    {loading ? 'Signing in…' : 'Sign In'}
                  </Button>
                  <p className="text-center text-xs text-slate-500 pt-1">
                    No account?{' '}
                    <button type="button" onClick={() => navigate('/register')} className="font-medium hover:underline" style={{ color: '#1B4FBF' }}>
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
                  <Button type="submit" disabled={loading} className="w-full h-10 text-white" style={{ background: '#1B4FBF' }}>
                    {loading ? 'Signing in…' : 'Sign In'}
                  </Button>
                  <p className="text-center text-xs text-slate-500 pt-1">Contact your HR for your Employee ID</p>
                </form>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-slate-400 mt-6">
            © {new Date().getFullYear()} PayOS · Smart Payroll OS
          </p>
        </div>
      </div>
    </div>
  );
}
