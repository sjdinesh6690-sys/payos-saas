import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Download, Trash2, FileDown, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

export default function PayslipHistory() {
  const [payslips, setPayslips] = useState([]);
  const [months,   setMonths]   = useState([]);
  const [month,    setMonth]    = useState('');
  const [loading,  setLoading]  = useState(true);
  const [delId,    setDelId]    = useState(null);
  const { token } = useAuth();

  const load = async () => {
    setLoading(true);
    try {
      const [pm, pp] = await Promise.all([
        axios.get('/api/employer/payslips/months',              { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`/api/employer/payslips${month ? `?month=${month}` : ''}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setMonths(pm.data);
      setPayslips(pp.data);
    } catch {
      toast.error('Failed to load payslips.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [month]);

  const download = async (id, empId, m) => {
    try {
      const res = await axios.get(`/api/employer/payslips/${id}/download`, {
        headers: { Authorization: `Bearer ${token}` }, responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a   = document.createElement('a');
      a.href = url; a.download = `Payslip_${empId}_${m}.pdf`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Download failed.'); }
  };

  const downloadAll = async () => {
    if (!month) return toast.error('Select a month first.');
    try {
      const res = await axios.get(`/api/employer/payslips/download-all?month=${month}`, {
        headers: { Authorization: `Bearer ${token}` }, responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a   = document.createElement('a');
      a.href = url; a.download = `Payslips_${month}.zip`; a.click();
      URL.revokeObjectURL(url);
      toast.success('ZIP downloaded!');
    } catch { toast.error('ZIP download failed.'); }
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`/api/employer/payslips/${delId}`, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Payslip deleted.');
      setDelId(null);
      load();
    } catch { toast.error('Delete failed.'); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zoho-text">Payslip History</h1>
        <p className="text-sm text-zoho-muted mt-0.5">View and download all generated payslips</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          className="input w-auto"
          value={month}
          onChange={e => setMonth(e.target.value)}
        >
          <option value="">All Months</option>
          {months.map(m => <option key={m} value={m}>{m}</option>)}
        </select>

        {month && (
          <button onClick={downloadAll} className="btn-secondary">
            <FileDown size={15} /> Download All (ZIP)
          </button>
        )}

        {month && (
          <button onClick={() => setMonth('')} className="btn-secondary">
            <X size={15} /> Clear Filter
          </button>
        )}
      </div>

      <div className="card">
        {loading ? (
          <div className="p-10 text-center text-zoho-muted">Loading…</div>
        ) : payslips.length === 0 ? (
          <div className="p-10 text-center text-zoho-muted">
            No payslips found{month ? ` for ${month}` : ''}.
          </div>
        ) : (
          <table className="table-zoho">
            <thead>
              <tr>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Department</th>
                <th>Month</th>
                <th>Total Salary</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {payslips.map(p => (
                <tr key={p.id}>
                  <td><span className="badge-info">{p.employee_id}</span></td>
                  <td className="font-medium">{p.employee_name}</td>
                  <td className="text-zoho-muted">{p.department || '-'}</td>
                  <td><span className="badge-warning">{p.month}</span></td>
                  <td className="font-semibold">{fmt(p.total_salary)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => download(p.id, p.employee_id, p.month)}
                        className="text-zoho-blue hover:text-blue-800 p-1"
                        title="Download PDF"
                      >
                        <Download size={15} />
                      </button>
                      <button
                        onClick={() => setDelId(p.id)}
                        className="text-red-400 hover:text-red-600 p-1"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Delete confirm modal */}
      {delId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h3 className="font-semibold text-zoho-text">Delete Payslip?</h3>
              <button onClick={() => setDelId(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-zoho-muted">This action cannot be undone. The payslip will be permanently deleted.</p>
              <div className="flex gap-2">
                <button onClick={() => setDelId(null)} className="btn-secondary flex-1 justify-center">Cancel</button>
                <button onClick={confirmDelete} className="btn-danger flex-1 justify-center">Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
