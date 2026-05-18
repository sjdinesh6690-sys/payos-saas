import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, LogOut } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

const MONTHS = ['','January','February','March','April','May','June','July','August','September','October','November','December'];

export default function EmployeePayslipsPage() {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const navigate = useNavigate();
  const name = localStorage.getItem('employee_name') || 'Employee';

  useEffect(() => {
    fetch('/api/payslips/employee-payslips', {
      headers: { Authorization: `Bearer ${localStorage.getItem('payslip_token')}` },
    })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setPayslips(data); else setError(data.error || 'Error'); })
      .catch(() => setError('Cannot connect to server'))
      .finally(() => setLoading(false));
  }, []);

  const downloadPdf = async (id, month, year) => {
    const res = await fetch(`/api/payslips/${id}/download`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('payslip_token')}` },
    });
    if (!res.ok) { alert('Download failed'); return; }
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `Payslip_${MONTHS[month]}_${year}.pdf`;
    document.body.appendChild(a); a.click();
    URL.revokeObjectURL(url); document.body.removeChild(a);
  };

  const logout = () => {
    localStorage.removeItem('payslip_token');
    localStorage.removeItem('payslip_role');
    localStorage.removeItem('employee_name');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <div>
          <span className="text-base font-semibold text-slate-900">DinMind Payroll</span>
          <span className="ml-3 text-sm text-slate-500">Welcome, {name}</span>
        </div>
        <Button variant="outline" size="sm" onClick={logout}>
          <LogOut size={14} /> Logout
        </Button>
      </div>

      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-slate-900">Your Payslips</h1>
          <p className="text-sm text-slate-500 mt-0.5">Download your monthly payslips below</p>
        </div>

        <Card>
          {loading && (
            <div className="px-6 py-12 text-center text-slate-400 text-sm">Loading…</div>
          )}
          {error && (
            <div className="px-6 py-8 text-center text-red-600 text-sm">{error}</div>
          )}
          {!loading && !error && payslips.length === 0 && (
            <div className="px-6 py-12 text-center text-slate-400 text-sm">
              No payslips available yet. Contact HR for more information.
            </div>
          )}
          {!loading && payslips.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period</TableHead>
                  <TableHead>Employee ID</TableHead>
                  <TableHead className="text-right">Net Salary</TableHead>
                  <TableHead className="text-right">Download</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payslips.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-slate-900">{MONTHS[p.month]} {p.year}</TableCell>
                    <TableCell><Badge variant="secondary">{p.employee_id}</Badge></TableCell>
                    <TableCell className="text-right font-semibold text-slate-900">
                      ₹{(p.salary || 0).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => downloadPdf(p.id, p.month, p.year)}>
                        <Download size={13} /> PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
