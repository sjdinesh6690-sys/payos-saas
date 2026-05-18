import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SimpleButton from '../components/SimpleButton';

const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                 'July', 'August', 'September', 'October', 'November', 'December'];

export default function GeneratePayslips() {
  const [generating, setGenerating] = useState(false);
  const [message, setMessage]       = useState('');
  const navigate = useNavigate();

  const now       = new Date();
  const curMonth  = now.getMonth() + 1;
  const curYear   = now.getFullYear();

  const handleGenerate = async () => {
    if (!window.confirm(`Generate payslips for all employees for ${MONTHS[curMonth]} ${curYear}?`)) return;

    setGenerating(true);
    setMessage('⏳ Generating payslips…');

    try {
      const response = await fetch('/api/payslips/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('payslip_token')}`,
        },
        body: JSON.stringify({ month: curMonth, year: curYear }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage('❌ ' + (data.error || 'Generation failed'));
      } else {
        setMessage(`✅ Success! ${data.count} payslips generated for ${MONTHS[curMonth]} ${curYear}`);
        setTimeout(() => navigate('/admin-dashboard'), 2500);
      }
    } catch {
      setMessage('❌ Cannot connect to server. Is the backend running?');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 p-4">

      {/* Header */}
      <div className="bg-green-600 text-white p-6 rounded-2xl mb-8">
        <h1 className="text-4xl font-bold">📄 Generate Payslips</h1>
        <p className="text-xl mt-2 opacity-90">Create payslips for all employees</p>
      </div>

      <div className="max-w-2xl mx-auto">

        {/* Checklist */}
        <div className="bg-white border-4 border-blue-300 p-8 rounded-2xl mb-6">
          <h2 className="text-2xl font-bold mb-5 text-gray-800">📋 Before Generating</h2>
          <div className="text-lg space-y-3 text-gray-700">
            <p>✅ Upload salary file (Step 1) done</p>
            <p>✅ All employee data is correct</p>
            <p>✅ Confirm month and year below</p>
          </div>

          <div className="bg-green-50 border-4 border-green-300 p-6 rounded-xl mt-6 text-center">
            <p className="text-lg font-semibold text-gray-600 mb-1">Generating for:</p>
            <p className="text-4xl font-bold text-green-700">
              {MONTHS[curMonth]} {curYear}
            </p>
          </div>
        </div>

        {/* Status message */}
        {message && (
          <div className={`p-5 rounded-xl mb-6 text-xl font-bold text-center ${
            message.startsWith('✅') ? 'bg-green-100 text-green-700'
            : message.startsWith('⏳') ? 'bg-yellow-100 text-yellow-700'
            : 'bg-red-100 text-red-700'
          }`}>
            {message}
          </div>
        )}

        {/* Big generate button */}
        <SimpleButton
          onClick={handleGenerate}
          text={generating ? '⏳ Generating…' : '📄 GENERATE PAYSLIPS NOW'}
          color="green"
          size="large"
        />

        {/* What happens next */}
        <div className="bg-blue-50 border-4 border-blue-200 p-8 rounded-2xl mt-6">
          <h3 className="text-2xl font-bold mb-4 text-blue-800">ℹ️ What Happens Next</h3>
          <div className="text-lg space-y-3 text-blue-900">
            <p>✓ Payslips created for every employee</p>
            <p>✓ PDFs ready to download</p>
            <p>✓ Employees can view them in the portal</p>
            <p>✓ Go to "Send Emails" to notify employees</p>
          </div>
        </div>

        {/* Back button */}
        <div className="mt-6">
          <SimpleButton
            onClick={() => navigate('/admin-dashboard')}
            text="🔙 Back to Dashboard"
            color="gray"
            size="medium"
          />
        </div>

      </div>
    </div>
  );
}
