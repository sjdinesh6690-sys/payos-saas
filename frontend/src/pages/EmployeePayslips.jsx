import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                 'July', 'August', 'September', 'October', 'November', 'December'];

export default function EmployeePayslips() {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const navigate       = useNavigate();
  const employeeName   = localStorage.getItem('employee_name') || 'Employee';

  useEffect(() => { fetchPayslips(); }, []);

  const fetchPayslips = async () => {
    try {
      const res  = await fetch('/api/payslips/employee-payslips', {
        headers: { Authorization: `Bearer ${localStorage.getItem('payslip_token')}` },
      });
      const data = await res.json();
      if (!res.ok) { setError('❌ ' + (data.error || 'Could not load payslips')); }
      else { setPayslips(data); }
    } catch {
      setError('❌ Cannot connect to server');
    } finally {
      setLoading(false);
    }
  };

  const downloadPayslip = async (id, month, year) => {
    try {
      const res = await fetch(`/api/payslips/${id}/download`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('payslip_token')}` },
      });
      if (!res.ok) { alert('Could not download payslip'); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `Payslip_${MONTHS[month]}_${year}.pdf`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      alert('Error downloading payslip');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('payslip_token');
    localStorage.removeItem('payslip_role');
    localStorage.removeItem('employee_name');
    navigate('/employee-login');
  };

  return (
    <div className="min-h-screen bg-green-50 p-4">

      {/* Header */}
      <div className="bg-green-600 text-white p-6 rounded-2xl mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">👋 Hi, {employeeName}!</h1>
          <p className="text-lg mt-1 opacity-90">Your Payslips</p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white font-bold px-5 py-3 rounded-xl text-lg transition-colors"
        >
          🚪 Logout
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="text-center text-2xl text-gray-400 mt-20">Loading your payslips…</div>
      )}

      {/* Error */}
      {error && (
        <div className="max-w-2xl mx-auto bg-red-100 text-red-700 p-4 rounded-xl text-lg font-semibold text-center">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && payslips.length === 0 && (
        <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow p-10 text-center">
          <div className="text-6xl mb-4">📭</div>
          <p className="text-2xl font-bold text-gray-600">No payslips yet</p>
          <p className="text-gray-400 mt-2 text-lg">HR will upload your payslips soon</p>
        </div>
      )}

      {/* Payslip list */}
      {!loading && payslips.length > 0 && (
        <div className="max-w-2xl mx-auto space-y-4">
          {payslips.map((p) => (
            <div key={p.id} className="bg-white border-4 border-green-200 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-2xl font-bold text-gray-800">
                    {MONTHS[p.month]} {p.year}
                  </p>
                  <p className="text-gray-500 mt-1">ID: {p.employee_id}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Net Salary</p>
                  <p className="text-3xl font-bold text-green-600">
                    ₹{(p.salary || 0).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => downloadPayslip(p.id, p.month, p.year)}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 text-xl rounded-xl transition-all active:scale-95"
              >
                📥 Download PDF
              </button>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
