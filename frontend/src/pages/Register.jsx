import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function Register() {
  const [employeeId, setEmployeeId] = useState('');
  const [password,   setPassword]   = useState('');
  const [confirm,    setConfirm]    = useState('');
  const [loading,    setLoading]    = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) return toast.error('Passwords do not match.');
    if (password.length < 6)  return toast.error('Password must be at least 6 characters.');
    setLoading(true);
    try {
      await axios.post('/api/auth/create-employee-account', {
        employee_id: employeeId.toUpperCase(),
        password,
      });
      toast.success('Account created! Please sign in.');
      navigate('/employee-login');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Account creation failed.');
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
          <h1 className="text-2xl font-bold text-zoho-text">Set Up Your Account</h1>
          <p className="text-sm text-zoho-muted mt-1">Create your employee password</p>
        </div>

        <div className="card card-body space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zoho-text mb-1.5">Employee ID</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. EMP001"
                value={employeeId}
                onChange={e => setEmployeeId(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zoho-text mb-1.5">Password</label>
              <input
                type="password"
                className="input"
                placeholder="Min 6 characters"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zoho-text mb-1.5">Confirm Password</label>
              <input
                type="password"
                className="input"
                placeholder="Repeat password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn-primary w-full justify-center" disabled={loading}>
              {loading ? 'Creating…' : 'Create Account'}
            </button>
          </form>
          <div className="border-t border-gray-100 pt-3 text-center">
            <p className="text-xs text-zoho-muted">
              Already have an account?{' '}
              <Link to="/employee-login" className="text-zoho-blue hover:underline font-medium">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
