import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Download, FileText } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

export default function EmployeeDashboard() {
  const [payslips, setPayslips] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const { token } = useAuth();

  useEffect(() => {
    axios.get('/api/employee/payslips', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setPayslips(r.data))
      .catch(() => toast.error('Failed to load payslips.'))
      .finally(() => setLoading(false));
  }, [token]);

  const download = async (id, month) => {
    try {
      const res = await axios.get(`/api/employee/payslips/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` }, responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a   = document.createElement('a');
      a.href = url; a.download = `Payslip_${month}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Download failed.'); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zoho-text">My Payslips</h1>
        <p className="text-sm text-zoho-muted mt-0.5">Download your payslips below</p>
      </div>

      <div className="card">
        {loading ? (
          <div className="p-10 text-center text-zoho-muted">Loading…</div>
        ) : payslips.length === 0 ? (
          <div className="p-10 text-center">
            <FileText size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-zoho-muted">No payslips available yet.</p>
            <p className="text-xs text-zoho-muted mt-1">Payslips are available from the 1st of the following month.</p>
          </div>
        ) : (
          <table className="table-zoho">
            <thead>
              <tr>
                <th>Month</th>
                <th>Basic Salary</th>
                <th>HRA</th>
                <th>Food Allowance</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payslips.map(p => (
                <tr key={p.id}>
                  <td><span className="badge-info">{p.month}</span></td>
                  <td>{fmt(p.basic_salary)}</td>
                  <td>{fmt(p.hra)}</td>
                  <td>{fmt(p.food_allowance)}</td>
                  <td className="font-semibold text-zoho-blue">{fmt(p.total_salary)}</td>
                  <td>
                    <button
                      onClick={() => download(p.id, p.month)}
                      className="btn-secondary py-1 text-xs"
                    >
                      <Download size={13} /> Download PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
