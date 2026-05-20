import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function Login({ isEmployee = false }) {
  const [identifier, setIdentifier] = useState('');
  const [password,   setPassword]   = useState('');
  const [loading,    setLoading]     = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isEmployee) {
        const { data } = await axios.post('/api/auth/employee-login', { employee_id: identifier, password });
        login(data.token, 'employee');
        navigate('/employee');
      } else {
        const { data } = await axios.post('/api/auth/admin-login', { email: identifier, password });
        login(data.token, 'employer');
        navigate('/employer');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zoho-bg flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-zoho-blue rounded-xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-lg">D</span>
          </div>
          <h1 className="text-2xl font-bold text-zoho-text">
            {isEmployee ? 'Employee Sign In' : 'Admin Sign In'}
          </h1>
          <p className="text-sm text-zoho-muted mt-1">DinMind Payslip Portal</p>
        </div>

        <div className="card card-body space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zoho-text mb-1.5">
                {isEmployee ? 'Employee ID' : 'Email Address'}
              </label>
              <input
                type="text"
                className="input"
                placeholder={isEmployee ? 'e.g. EMP001' : 'admin@company.com'}
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zoho-text mb-1.5">Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="border-t border-gray-100 pt-3 text-center">
            {isEmployee ? (
              <p className="text-xs text-zoho-muted">
                Admin?{' '}
                <Link to="/" className="text-zoho-blue hover:underline font-medium">Admin Login</Link>
              </p>
            ) : (
              <p className="text-xs text-zoho-muted">
                Employee?{' '}
                <Link to="/employee-login" className="text-zoho-blue hover:underline font-medium">Employee Login</Link>
                {' · '}
                <Link to="/register" className="text-zoho-blue hover:underline font-medium">Set up account</Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
