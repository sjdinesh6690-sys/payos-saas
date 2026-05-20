import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SimpleButton from '../components/SimpleButton';

export default function UploadSalaries() {
  const [file, setFile]         = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage]   = useState('');
  const navigate  = useNavigate();
  const inputRef  = useRef(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0] || null);
    setMessage('');
  };

  const handleUpload = async (e) => {
    if (e) e.preventDefault();
    if (!file) { setMessage('❌ Please select a file first'); return; }

    setUploading(true);
    setMessage('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/payslips/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('payslip_token')}` },
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage('❌ ' + (data.error || 'Upload failed'));
      } else {
        setMessage(`✅ Success! ${data.count} employees uploaded`);
        setFile(null);
        if (inputRef.current) inputRef.current.value = '';
        setTimeout(() => navigate('/admin-dashboard'), 2000);
      }
    } catch (err) {
      setMessage('❌ Cannot connect to server. Is the backend running?');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 p-4">

      {/* Header */}
      <div className="bg-blue-600 text-white p-6 rounded-2xl mb-8">
        <h1 className="text-4xl font-bold">📤 Upload Salary File</h1>
        <p className="text-xl mt-2 opacity-90">Upload employee salary data — Excel or CSV</p>
      </div>

      <div className="max-w-2xl mx-auto">

        <div className="bg-white rounded-2xl shadow-lg p-8">
          <form onSubmit={handleUpload}>

            {/* Instructions */}
            <div className="bg-blue-50 border-4 border-blue-300 p-6 rounded-xl mb-8">
              <h2 className="text-2xl font-bold mb-4 text-blue-800">📋 Instructions</h2>
              <div className="text-lg space-y-2 text-blue-900">
                <p>✓ Use Excel (.xlsx) or CSV (.csv) file</p>
                <p>✓ Required columns: <strong>employee_id, employee_name, email, salary</strong></p>
                <p>✓ Optional column: <strong>department</strong></p>
                <p>✓ Max file size: 5 MB</p>
              </div>
            </div>

            {/* File picker */}
            <div className="mb-8">
              <label className="block text-2xl font-bold mb-4 text-gray-800">📁 Select File</label>

              {/* Styled drop zone */}
              <label
                htmlFor="fileInput"
                className="flex flex-col items-center justify-center w-full border-4 border-dashed border-blue-300 rounded-xl py-10 cursor-pointer hover:bg-blue-50 transition-colors"
              >
                <span className="text-5xl mb-3">{file ? '📄' : '📎'}</span>
                <span className="text-xl font-semibold text-blue-700">
                  {file ? file.name : 'Click to choose file'}
                </span>
                <span className="text-gray-400 mt-1">CSV, XLS or XLSX</span>
                <input
                  id="fileInput"
                  ref={inputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {file && (
                <p className="mt-3 text-lg text-green-700 font-semibold">
                  ✅ Selected: {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </p>
              )}
            </div>

            {/* Status message */}
            {message && (
              <div className={`p-4 rounded-xl mb-6 text-lg font-bold text-center ${
                message.startsWith('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {message}
              </div>
            )}

            {/* Upload button */}
            <SimpleButton
              onClick={handleUpload}
              text={uploading ? '⏳ Uploading…' : '📤 Upload File'}
              color="green"
              size="large"
            />
          </form>

          {/* Sample format */}
          <div className="mt-10 pt-8 border-t-4 border-gray-200">
            <h3 className="text-2xl font-bold mb-4 text-gray-800">📥 Sample File Format</h3>
            <div className="bg-gray-100 rounded-xl p-5 font-mono text-sm overflow-x-auto">
              <p className="font-bold text-gray-600 mb-2">employee_id, employee_name, email, salary, department</p>
              <p>EMP001, John Smith, john@company.com, 30000, Engineering</p>
              <p>EMP002, Sarah Johnson, sarah@company.com, 25000, HR</p>
              <p>EMP003, Mike Chen, mike@company.com, 35000, Engineering</p>
            </div>
            <p className="text-gray-500 mt-3 text-sm">
              💡 The <strong>email</strong> column is required — employees use their email to log in and receive payslips.
            </p>
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
