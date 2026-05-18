import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SimpleButton from '../components/SimpleButton';

export default function ReportsPage() {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState('');

  const downloadReport = async (reportType) => {
    setDownloading(true);
    setDownloadStatus(`⏳ Downloading ${reportType}...`);

    try {
      const response = await fetch(
        `/api/reports/${reportType}?format=pdf`,
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
      <div className="bg-blue-600 text-white p-6 rounded-2xl mb-8">
        <h1 className="text-4xl font-bold">📊 Download Reports</h1>
        <p className="text-xl mt-2 opacity-90">Government &amp; Compliance Reports — PDF Format</p>
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

      {/* ── Monthly Compliance Reports ── */}
      <div className="max-w-4xl mx-auto mb-8">
        <h2 className="text-3xl font-bold mb-4 pb-2 border-b-4 border-blue-600">
          📋 Monthly Compliance Reports
        </h2>
        <div className="grid grid-cols-1 gap-3">
          <ReportButton
            onClick={() => downloadReport('monthly-compliance')}
            title="📋 Monthly Compliance Report"
            description="Complete salary summary, deductions, and compliance checklist for the month"
            disabled={downloading}
          />
          <ReportButton
            onClick={() => downloadReport('pf-contribution')}
            title="💰 PF / EPF Contribution Report"
            description="Employee & Employer PF contributions (12% + 12%). Ready for EPFO portal filing"
            disabled={downloading}
          />
          <ReportButton
            onClick={() => downloadReport('esi-contribution')}
            title="🏥 ESI Contribution Report"
            description="ESI contributions (0.75% employee + 3.25% employer). Only for salary < ₹21,000. Ready for ESIC"
            disabled={downloading}
          />
          <ReportButton
            onClick={() => downloadReport('pt-contribution')}
            title="🏛️ Professional Tax (PT) Report"
            description="State-wise PT deductions. Varies by state. Ready for government filing"
            disabled={downloading}
          />
        </div>
      </div>

      {/* ── Quarterly Reports ── */}
      <div className="max-w-4xl mx-auto mb-8">
        <h2 className="text-3xl font-bold mb-4 pb-2 border-b-4 border-green-600">
          📅 Quarterly Reports (Filing-Focused)
        </h2>
        <div className="grid grid-cols-1 gap-3">
          <ReportButton
            onClick={() => downloadReport('quarterly-q1')}
            title="📊 Q1 Report (Jan – Mar)"
            description="Quarterly summary for Q1 filing with all totals and compliance details"
            disabled={downloading}
          />
          <ReportButton
            onClick={() => downloadReport('quarterly-q2')}
            title="📊 Q2 Report (Apr – Jun)"
            description="Quarterly summary for Q2 filing with all totals and compliance details"
            disabled={downloading}
          />
          <ReportButton
            onClick={() => downloadReport('quarterly-q3')}
            title="📊 Q3 Report (Jul – Sep)"
            description="Quarterly summary for Q3 filing with all totals and compliance details"
            disabled={downloading}
          />
          <ReportButton
            onClick={() => downloadReport('quarterly-q4')}
            title="📊 Q4 Report (Oct – Dec)"
            description="Quarterly summary for Q4 filing with all totals and compliance details"
            disabled={downloading}
          />
        </div>
      </div>

      {/* ── Annual Reports ── */}
      <div className="max-w-4xl mx-auto mb-8">
        <h2 className="text-3xl font-bold mb-4 pb-2 border-b-4 border-purple-600">
          📆 Annual Reports (Year-End Critical)
        </h2>
        <div className="grid grid-cols-1 gap-3">
          <ReportButton
            onClick={() => downloadReport('annual-summary')}
            title="📈 Annual Summary Report"
            description="Complete year salary summary, total deductions, and year-end analysis"
            disabled={downloading}
          />
          <ReportButton
            onClick={() => downloadReport('annual-pf')}
            title="💼 Annual PF Statement"
            description="Full year PF contributions and balance statement"
            disabled={downloading}
          />
          <ReportButton
            onClick={() => downloadReport('annual-tax')}
            title="🏛️ Annual Tax Report"
            description="Yearly TDS and PT totals. For income tax filing and Form 16 generation"
            disabled={downloading}
          />
          <ReportButton
            onClick={() => downloadReport('annual-compliance')}
            title="✅ Annual Compliance Checklist"
            description="Complete year-end compliance verification checklist"
            disabled={downloading}
          />
        </div>
      </div>

      {/* Back button */}
      <div className="max-w-4xl mx-auto">
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

/* ── Reusable report row button ── */
function ReportButton({ onClick, title, description, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full bg-white border-4 border-blue-300 rounded-xl p-4 text-left hover:bg-blue-50 hover:border-blue-600 transition-all disabled:opacity-50 active:scale-95"
    >
      <p className="text-2xl font-bold text-gray-900">{title}</p>
      <p className="text-lg text-gray-600 mt-1">{description}</p>
    </button>
  );
}
