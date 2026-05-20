import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    axios.get('/api/employee/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setProfile(r.data))
      .catch(() => toast.error('Failed to load profile.'))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="flex items-center justify-center h-64 text-zoho-muted">Loading…</div>;
  if (!profile) return null;

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <h1 className="text-2xl font-bold text-zoho-text">My Profile</h1>
        <p className="text-sm text-zoho-muted mt-0.5">Your employee information</p>
      </div>

      <div className="card">
        <div className="card-body space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center">
              <User size={24} className="text-zoho-blue" />
            </div>
            <div>
              <p className="font-semibold text-zoho-text text-lg">{profile.employee_name}</p>
              <p className="text-sm text-zoho-muted">{profile.department || 'No department'}</p>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-3">
            {[
              ['Employee ID',  profile.employee_id],
              ['Full Name',    profile.employee_name],
              ['Department',   profile.department || '-'],
              ['Member Since', profile.created_at?.slice(0, 10)],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between items-center">
                <span className="text-xs font-medium text-zoho-muted uppercase tracking-wide">{label}</span>
                <span className="text-sm text-zoho-text font-medium">{val}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
