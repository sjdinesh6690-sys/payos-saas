import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function EmployeeLogin() {
  const [employeeId, setEmployeeId] = useState('');
  const [email, setEmail]           = useState('');
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch('/api/auth/employee-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: employeeId, email }),
      });
      const data = await response.json();
      if (data.token) {
        localStorage.setItem('payslip_token', data.token);
        localStorage.setItem('payslip_role',  'employee');
        localStorage.setItem('employee_name', data.employee_name || '');
        navigate('/employee-payslips');
      } else {
        setError('❌ ' + (data.error || 'Login failed'));
      }
    } catch (err) {
      setError('❌ Cannot connect to server. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-400 to-green-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl">

        <div className="text-center mb-8">
          <div className="text-6xl mb-2">👤</div>
          <h2 className="text-3xl font-bold text-gray-800">DinMind Payslip</h2>
          <p className="text-gray-500 mt-1 text-lg">Employee Payslip Portal</p>
        </div>

        {error && (
          <div className="bg-red-100 border-2 border-red-400 text-red-700 p-4 rounded-xl mb-6 text-lg font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xl font-bold mb-2 text-gray-700">Employee ID</label>
            <input
              type="text"
              value={employeeId}
              onChange={e => setEmployeeId(e.target.value)}
              placeholder="e.g. EMP001"
              className="w-full px-4 py-4 text-xl border-4 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xl font-bold mb-2 text-gray-700">📧 Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-4 text-xl border-4 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold py-4 text-2xl rounded-xl transition-all shadow-lg active:scale-95"
          >
            {loading ? 'Signing in…' : '🔓 Login'}
          </button>
        </form>

        <p className="text-center mt-6 text-gray-500 text-lg">
          Contact HR for your Employee ID &amp; registered email
        </p>

        <div className="text-center mt-4">
          <button
            onClick={() => navigate('/admin-login')}
            className="text-green-600 hover:underline font-semibold"
          >
            Admin? Click here →
          </button>
        </div>
      </div>
    </div>
  );
}
