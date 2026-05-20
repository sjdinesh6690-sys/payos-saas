import { useNavigate } from 'react-router-dom';
import SimpleButton from '../components/SimpleButton';

export default function AdminDashboard() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('payslip_token');
    localStorage.removeItem('payslip_role');
    navigate('/admin-login');
  };

  return (
    <div className="min-h-screen bg-blue-50 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-bold text-gray-800">👋 Welcome Admin</h1>
          <p className="text-gray-500 text-xl mt-1">What would you like to do today?</p>
        </div>
        <button
          onClick={handleLogout}
          className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-6 py-3 rounded-xl text-lg transition-colors"
        >
          🚪 Logout
        </button>
      </div>

      {/* Big action buttons */}
      <div className="grid grid-cols-1 gap-6 max-w-xl mx-auto">

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="text-5xl mb-3">📂</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Upload Salary File</h2>
          <p className="text-gray-500 mb-4">Upload your Excel or CSV file with employee salaries</p>
          <SimpleButton
            onClick={() => navigate('/upload-salaries')}
            text="Upload File"
            color="blue"
            size="large"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="text-5xl mb-3">📄</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Generate Payslips</h2>
          <p className="text-gray-500 mb-4">Create PDF payslips for all employees</p>
          <SimpleButton
            onClick={() => navigate('/generate-payslips')}
            text="Generate Payslips"
            color="green"
            size="large"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="text-5xl mb-3">📧</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Send Payslips by Email</h2>
          <p className="text-gray-500 mb-4">Email payslips directly to all employees</p>
          <SimpleButton
            onClick={() => navigate('/send-email')}
            text="Send Emails"
            color="orange"
            size="large"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="text-5xl mb-3">📊</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Download Reports</h2>
          <p className="text-gray-500 mb-4">Government compliance reports — PF, ESI, PT, Quarterly, Annual</p>
          <SimpleButton
            onClick={() => navigate('/reports')}
            text="📊 Download Reports"
            color="purple"
            size="large"
            description="Government compliance reports"
          />
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="text-5xl mb-3">📈</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Analytics &amp; Insights</h2>
          <p className="text-gray-500 mb-4">Business insights, salary analysis, department reports</p>
          <SimpleButton
            onClick={() => navigate('/analytics')}
            text="📊 Analytics & Insights"
            color="purple"
            size="large"
            description="Business insights & management reports"
          />
        </div>

      </div>
    </div>
  );
}
