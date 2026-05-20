import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SimpleButton from '../components/SimpleButton';

export default function SendEmail() {
  const navigate = useNavigate();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const handleSend = async () => {
    setLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('payslip_token');
      const res = await fetch('/api/employer/send-payslips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ month }),
      });
      const data = await res.json();
      if (!res.ok) setMessage('❌ ' + (data.error || 'Send failed'));
      else setMessage('✅ Emails sent! ' + (data.message || ''));
    } catch {
      setMessage('❌ Cannot connect to server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 p-6">
      <div className="max-w-xl mx-auto">
        <button onClick={() => navigate('/admin-dashboard')} className="text-blue-600 hover:underline font-bold text-lg mb-6 block">
          ← Back to Dashboard
        </button>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-6xl mb-4 text-center">📧</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">Send Payslips by Email</h1>
          <p className="text-gray-500 text-center mb-8">Select a month and send payslips to all employees via email</p>

          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2 text-lg">Select Month</label>
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg focus:border-blue-500 focus:outline-none"
            />
          </div>

          {message && (
            <div className={`p-4 rounded-xl text-center font-semibold text-lg mb-4 ${message.startsWith('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {message}
            </div>
          )}

          <SimpleButton
            onClick={handleSend}
            text={loading ? 'Sending…' : '📨 Send Emails Now'}
            color="orange"
            size="large"
          />
        </div>
      </div>
    </div>
  );
}
