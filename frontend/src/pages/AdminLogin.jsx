import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SimpleButton from '../components/SimpleButton';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' or 'signup'
  const [form, setForm] = useState({ email: '', password: '', company_name: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    setLoading(true);
    setMessage('');
    try {
      const endpoint = mode === 'login' ? '/api/auth/admin-login' : '/api/auth/admin-signup';
      const body = mode === 'login'
        ? { email: form.email, password: form.password }
        : { email: form.email, password: form.password, company_name: form.company_name };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage('❌ ' + (data.error || 'Something went wrong'));
      } else if (mode === 'signup') {
        setMessage('✅ Account created! Please log in.');
        setMode('login');
      } else {
        localStorage.setItem('payslip_token', data.token);
        localStorage.setItem('payslip_role', 'employer');
        navigate('/admin-dashboard');
      }
    } catch {
      setMessage('❌ Cannot connect to server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-4xl">D</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">DinMind Payslip</h1>
          <p className="text-gray-500 mt-1">Admin Portal</p>
        </div>

        {/* Toggle */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200 mb-6">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-3 font-bold text-lg transition-colors ${mode === 'login' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
          >
            Login
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 py-3 font-bold text-lg transition-colors ${mode === 'signup' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600'}`}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-gray-700 font-semibold mb-2 text-lg">Company Name</label>
              <input
                name="company_name"
                value={form.company_name}
                onChange={handleChange}
                placeholder="Your Company Ltd"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg focus:border-blue-500 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-gray-700 font-semibold mb-2 text-lg">Email</label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="admin@company.com"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2 text-lg">Password</label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          {message && (
            <div className={`p-3 rounded-xl text-center font-semibold ${message.startsWith('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message}
            </div>
          )}

          <SimpleButton
            onClick={handleSubmit}
            text={loading ? 'Please wait…' : mode === 'login' ? '🔑 Sign In' : '🚀 Create Account'}
            color="blue"
            size="large"
          />
        </div>

        {/* Employee link */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/employee-login')}
            className="text-blue-600 hover:underline font-semibold text-lg"
          >
            Employee? Click here →
          </button>
        </div>
      </div>
    </div>
  );
}
