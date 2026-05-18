import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SimpleButton from '../components/SimpleButton';

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState('');

  const downloadReport = async (reportType) => {
    setDownloading(true);
    setDownloadStatus(`⏳ Downloading ${reportType}...`);
    try {
      const response = await fetch(
        `/api/analytics/${reportType}?format=pdf`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem('payslip_token')}` },
        }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setDownloadStatus('❌ ' + (data.error || 'Failed to download report'));
        setTimeout(() => setDownloadStatus(''), 3000);
        setDownloading(false);
        return;
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}_report.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setDownloadStatus(`✅ Downloaded: ${reportType}`);
      setTimeout(() => setDownloadStatus(''), 3000);
    } catch (error) {
      setDownloadStatus('❌ Error: ' + error.message);
      setTimeout(() => setDownloadStatus(''), 3000);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 p-4">

      {/* Header */}
      <div className="bg-purple-600 text-white p-6 rounded-2xl mb-8">
        <h1 className="text-4xl font-bold">📊 Analytics &amp; Insights</h1>
        <p className="text-xl mt-2 opacity-90">Management Reports &amp; Business Insights</p>
      </div>

      {/* Status message */}
      {downloadStatus && (
        <div className={`max-w-4xl mx-auto mb-6 p-4 rounded-xl text-lg font-bold text-center ${
          downloadStatus.includes('✅') ? 'bg-green-100 text-green-700'
          : downloadStatus.includes('❌') ? 'bg-red-100 text-red-700'
          : 'bg-yellow-100 text-yellow-700'
        }`}>
          {downloadStatus}
        </div>
      )}

      {/* ── Business Analytics ── */}
      <div className="max-w-4xl mx-auto mb-8">
        <h2 className="text-3xl font-bold mb-4 pb-2 border-b-4 border-blue-600">💼 Business Analytics</h2>
        <div className="space-y-3">
          <AnalyticsButton
            onClick={() => downloadReport('salary-cost-analysis')}
            title="💰 Salary Cost Analysis"
            description="Total cost to company, per employee, by department"
            disabled={downloading}
          />
          <AnalyticsButton
            onClick={() => downloadReport('department-performance')}
            title="🏢 Department Performance"
            description="Employees, salary spend, cost efficiency by department"
            disabled={downloading}
          />
          <AnalyticsButton
            onClick={() => downloadReport('salary-distribution')}
            title="📈 Salary Distribution"
            description="Who earns what, salary ranges, distribution analysis"
            disabled={downloading}
          />
        </div>
      </div>

      {/* ── Employee Insights ── */}
      <div className="max-w-4xl mx-auto mb-8">
        <h2 className="text-3xl font-bold mb-4 pb-2 border-b-4 border-green-600">👥 Employee Insights</h2>
        <div className="space-y-3">
          <AnalyticsButton
            onClick={() => downloadReport('top-earners')}
            title="🏆 Top Earners Report"
            description="Top 10 highest paid employees"
            disabled={downloading}
          />
          <AnalyticsButton
            onClick={() => downloadReport('employee-turnover')}
            title="📊 Employee Turnover"
            description="Headcount trends, new joiners, retention metrics"
            disabled={downloading}
          />
          <AnalyticsButton
            onClick={() => downloadReport('departmental-comparison')}
            title="🔄 Departmental Comparison"
            description="Compare departments: headcount, salary, costs"
            disabled={downloading}
          />
        </div>
      </div>

      {/* ── Financial Planning ── */}
      <div className="max-w-4xl mx-auto mb-8">
        <h2 className="text-3xl font-bold mb-4 pb-2 border-b-4 border-yellow-500">💵 Financial Planning</h2>
        <div className="space-y-3">
          <AnalyticsButton
            onClick={() => downloadReport('deduction-analytics')}
            title="💸 Deduction Analytics"
            description="Where money goes (PF, ESI, PT, TDS breakdown)"
            disabled={downloading}
          />
          <AnalyticsButton
            onClick={() => downloadReport('cash-flow-forecast')}
            title="📅 Cash Flow Forecast"
            description="Payment schedule and upcoming liabilities"
            disabled={downloading}
          />
          <AnalyticsButton
            onClick={() => downloadReport('tax-planning')}
            title="🏛️ Tax Planning Report"
            description="Tax liability analysis and saving opportunities"
            disabled={downloading}
          />
        </div>
      </div>

      {/* ── Comparative Analysis ── */}
      <div className="max-w-4xl mx-auto mb-8">
        <h2 className="text-3xl font-bold mb-4 pb-2 border-b-4 border-purple-600">📉 Comparative Analysis</h2>
        <div className="space-y-3">
          <AnalyticsButton
            onClick={() => downloadReport('month-comparison')}
            title="📊 Month vs Month"
            description="This month compared to last month"
            disabled={downloading}
          />
          <AnalyticsButton
            onClick={() => downloadReport('quarter-comparison')}
            title="📊 Quarter vs Quarter"
            description="This quarter compared to last quarter"
            disabled={downloading}
          />
          <AnalyticsButton
            onClick={() => downloadReport('year-comparison')}
            title="📊 Year vs Year"
            description="This year compared to same period last year"
            disabled={downloading}
          />
        </div>
      </div>

      {/* Back button */}
      <div className="max-w-4xl mx-auto mt-8">
        <SimpleButton
          onClick={() => navigate('/admin-dashboard')}
          text="🔙 Back to Dashboard"
          color="gray"
          size="medium"
        />
      </div>

    </div>
  );
}

/* ── Reusable analytics row button ── */
function AnalyticsButton({ onClick, title, description, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full bg-white border-4 border-purple-300 rounded-xl p-4 text-left hover:bg-purple-50 hover:border-purple-600 transition-all disabled:opacity-50 active:scale-95"
    >
      <p className="text-2xl font-bold text-gray-900">{title}</p>
      <p className="text-lg text-gray-600 mt-1">{description}</p>
    </button>
  );
}
