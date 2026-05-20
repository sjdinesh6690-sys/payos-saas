import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Users, FileText, Upload, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    axios.get('/api/employer/stats', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setStats(r.data))
      .catch(() => toast.error('Failed to load dashboard.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="flex items-center justify-center h-64 text-zoho-muted">Loading…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zoho-text">Dashboard</h1>
        <p className="text-sm text-zoho-muted mt-0.5">Overview of your payslip portal</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Employees', value: stats?.totalEmployees ?? 0, icon: Users,    color: 'bg-blue-100 text-zoho-blue' },
          { label: 'Total Payslips',  value: stats?.totalPayslips  ?? 0, icon: FileText, color: 'bg-green-100 text-green-700' },
          { label: 'Total Uploads',   value: stats?.totalUploads   ?? 0, icon: Upload,   color: 'bg-purple-100 text-purple-700' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
              <Icon size={20} />
            </div>
            <div>
              <p className="text-xs text-zoho-muted">{label}</p>
              <p className="text-2xl font-bold text-zoho-text">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent uploads */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-zoho-muted" />
            <h2 className="text-sm font-semibold text-zoho-text">Recent Uploads</h2>
          </div>
          <Link to="/employer/upload" className="btn-primary text-xs py-1.5">Upload Salaries</Link>
        </div>
        {stats?.recentUploads?.length ? (
          <table className="table-zoho">
            <thead>
              <tr>
                <th>Month</th>
                <th>Filename</th>
                <th>Employees</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentUploads.map(u => (
                <tr key={u.id}>
                  <td><span className="badge-info">{u.month}</span></td>
                  <td className="text-zoho-muted">{u.filename}</td>
                  <td>{u.total_employees}</td>
                  <td className="text-zoho-muted text-xs">{u.created_at?.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="card-body text-center text-zoho-muted text-sm py-10">
            No uploads yet.{' '}
            <Link to="/employer/upload" className="text-zoho-blue hover:underline">Upload now →</Link>
          </div>
        )}
      </div>
    </div>
  );
}
