import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SimpleButton from '../components/SimpleButton';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const currentYear  = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const YEARS = [currentYear - 1, currentYear, currentYear + 1];

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [downloading, setDownloading]     = useState(false);
  const [downloadStatus, setDownloadStatus] = useState('');
  const [month, setMonth] = useState(currentMonth);
  const [year, setYear]   = useState(currentYear);

  const downloadReport = async (reportType) => {
    setDownloading(true);
    setDownloadStatus(`⏳ Downloading ${reportType}...`);
    try {
      // For comparison reports (month/quarter/year), no month param needed
      const needsMonth = !['month-comparison','quarter-comparison','year-comparison','employee-turnover'].includes(reportType);
      const params = needsMonth ? `?month=${month}&year=${year}` : '';

      const response = await fetch(
        `/api/analytics/${reportType}${params}`,
        { headers: { Authorization: `Bearer ${localStorage.getItem('payslip_token')}` } }
      );
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setDownloadStatus('❌ ' + (data.error || 'Failed to download report'));
        setTimeout(() => setDownloadStatus(''), 4000);
        setDownloading(false);
        return;
      }
      const blob = await response.blob();
      const url  = window.URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${reportType}_${MONTHS[month-1]}_${year}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setDownloadStatus(`✅ Downloaded successfully!`);
      setTimeout(() => setDownloadStatus(''), 3000);
    } catch (error) {
      setDownloadStatus('❌ Error: ' + error.message);
      setTimeout(() => setDownloadStatus(''), 4000);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 p-4">

      {/* Header */}
      <div className="bg-purple-600 text-white p-6 rounded-2xl mb-6">
        <h1 className="text-4xl font-bold">📊 Analytics &amp; Insights</h1>
        <p className="text-xl mt-2 opacity-90">Management Reports &amp; Business Insights</p>
      </div>

      {/* Month / Year Picker */}
      <div className="max-w-4xl mx-auto mb-6 bg-white border-4 border-purple-200 rounded-2xl p-5">
        <p className="text-xl font-bold text-gray-700 mb-3">📅 Select Report Month</p>
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-500">Month</label>
            <select
              value={month}
              onChange={e => setMonth(parseInt(e.target.value))}
              className="border-2 border-purple-300 rounded-xl px-4 py-2 text-lg font-bold focus:outline-none focus:border-purple-600"
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-gray-500">Year</label>
            <select
              value={year}
              onChange={e => setYear(parseInt(e.target.value))}
              className="border-2 border-purple-300 rounded-xl px-4 py-2 text-lg font-bold focus:outline-none focus:border-purple-600"
            >
              {YEARS.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <div className="bg-purple-100 text-purple-700 font-bold text-lg px-5 py-2 rounded-xl border-2 border-purple-300">
              📋 Reports will be for: <strong>{MONTHS[month-1]} {year}</strong>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-500 mt-2">⚠️ Comparison reports (Month vs Month, Quarter, Year) always use the most recent data.</p>
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
          <AnalyticsButton onClick={() => downloadReport('salary-cost-analysis')} disabled={downloading}
            title="💰 Salary Cost Analysis"
            description="Total cost to company, per employee, by department" />
          <AnalyticsButton onClick={() => downloadReport('department-performance')} disabled={downloading}
            title="🏢 Department Performance"
            description="Employees, salary spend, cost efficiency by department" />
          <AnalyticsButton onClick={() => downloadReport('salary-distribution')} disabled={downloading}
            title="📈 Salary Distribution"
            description="Who earns what, salary ranges, distribution analysis" />
        </div>
      </div>

      {/* ── Employee Insights ── */}
      <div className="max-w-4xl mx-auto mb-8">
        <h2 className="text-3xl font-bold mb-4 pb-2 border-b-4 border-green-600">👥 Employee Insights</h2>
        <div className="space-y-3">
          <AnalyticsButton onClick={() => downloadReport('top-earners')} disabled={downloading}
            title="🏆 Top Earners Report"
            description="Top 10 highest paid employees" />
          <AnalyticsButton onClick={() => downloadReport('employee-turnover')} disabled={downloading}
            title="📊 Employee Turnover"
            description="Headcount trends over last 6 months" />
          <AnalyticsButton onClick={() => downloadReport('departmental-comparison')} disabled={downloading}
            title="🔄 Departmental Comparison"
            description="Compare departments: headcount, salary, costs" />
        </div>
      </div>

      {/* ── Financial Planning ── */}
      <div className="max-w-4xl mx-auto mb-8">
        <h2 className="text-3xl font-bold mb-4 pb-2 border-b-4 border-yellow-500">💵 Financial Planning</h2>
        <div className="space-y-3">
          <AnalyticsButton onClick={() => downloadReport('deduction-analytics')} disabled={downloading}
            title="💸 Deduction Analytics"
            description="Where money goes (PF, ESI, PT, TDS breakdown)" />
          <AnalyticsButton onClick={() => downloadReport('cash-flow-forecast')} disabled={downloading}
            title="📅 Cash Flow Forecast"
            description="Payment schedule and upcoming liabilities" />
          <AnalyticsButton onClick={() => downloadReport('tax-planning')} disabled={downloading}
            title="🏛️ Tax Planning Report"
            description="Tax liability analysis and saving opportunities" />
        </div>
      </div>

      {/* ── Comparative Analysis ── */}
      <div className="max-w-4xl mx-auto mb-8">
        <h2 className="text-3xl font-bold mb-4 pb-2 border-b-4 border-purple-600">📉 Comparative Analysis</h2>
        <p className="text-base text-gray-500 mb-4">These reports compare current month/quarter/year automatically.</p>
        <div className="space-y-3">
          <AnalyticsButton onClick={() => downloadReport('month-comparison')} disabled={downloading}
            title="📊 Month vs Month"
            description="This month compared to last month" />
          <AnalyticsButton onClick={() => downloadReport('quarter-comparison')} disabled={downloading}
            title="📊 Quarter vs Quarter"
            description="This quarter compared to last quarter" />
          <AnalyticsButton onClick={() => downloadReport('year-comparison')} disabled={downloading}
            title="📊 Year vs Year"
            description="This year compared to same period last year" />
        </div>
      </div>

      {/* Back button */}
      <div className="max-w-4xl mx-auto mt-8">
        <SimpleButton onClick={() => navigate('/admin-dashboard')} text="🔙 Back to Dashboard" color="gray" size="medium" />
      </div>

    </div>
  );
}

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
