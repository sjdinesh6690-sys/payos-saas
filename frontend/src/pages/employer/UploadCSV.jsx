import { useState, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const STEPS = ['Select File', 'Choose Month', 'Upload'];

export default function UploadCSV() {
  const [step,      setStep]      = useState(1);
  const [file,      setFile]      = useState(null);
  const [month,     setMonth]     = useState('');
  const [dragOver,  setDragOver]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState(null);
  const fileRef = useRef();
  const { token } = useAuth();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && f.name.endsWith('.csv')) { setFile(f); setStep(2); }
    else toast.error('Please drop a CSV file.');
  };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (f) { setFile(f); setStep(2); }
  };

  const handleUpload = async () => {
    if (!file || !month) return toast.error('File and month required.');
    setLoading(true);
    const form = new FormData();
    form.append('file', file);
    form.append('month', month);
    try {
      const { data } = await axios.post('/api/employer/upload', form, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
      setStep(3);
      toast.success(`✅ ${data.count} payslips uploaded for ${data.month}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => { setStep(1); setFile(null); setMonth(''); setResult(null); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zoho-text">Upload Salaries</h1>
        <p className="text-sm text-zoho-muted mt-0.5">Upload a CSV file to generate payslips</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, idx) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
              step === idx + 1 ? 'bg-zoho-blue text-white' :
              step > idx + 1  ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
            }`}>
              {step > idx + 1 ? <CheckCircle2 size={12} /> : <span>{idx + 1}</span>}
              {label}
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`h-px w-8 ${step > idx + 1 ? 'bg-green-300' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-body space-y-5">
          {/* Step 1 — File select */}
          {step === 1 && (
            <div
              className={`drop-zone p-12 text-center cursor-pointer ${dragOver ? 'drag-over' : ''}`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current.click()}
            >
              <FileSpreadsheet size={40} className="mx-auto mb-3 text-zoho-muted" />
              <p className="font-medium text-zoho-text">Drop your CSV file here</p>
              <p className="text-sm text-zoho-muted mt-1">or click to browse</p>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFile} />
            </div>
          )}

          {/* Step 2 — Choose month */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle2 size={18} className="text-green-600" />
                <div>
                  <p className="text-sm font-medium text-zoho-text">{file?.name}</p>
                  <p className="text-xs text-zoho-muted">{(file?.size / 1024).toFixed(1)} KB</p>
                </div>
                <button onClick={() => { setFile(null); setStep(1); }} className="ml-auto text-gray-400 hover:text-gray-600">
                  <X size={16} />
                </button>
              </div>
              <div>
                <label className="block text-xs font-medium text-zoho-text mb-1.5">Payslip Month</label>
                <input
                  type="month"
                  className="input max-w-xs"
                  value={month}
                  onChange={e => setMonth(e.target.value)}
                />
                <p className="text-xs text-zoho-muted mt-1">Select the month these salaries are for.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="btn-secondary">Back</button>
                <button
                  onClick={() => { if (!month) { toast.error('Select a month.'); return; } setStep(3); }}
                  className="btn-primary" disabled={!month}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Confirm & upload */}
          {step === 3 && !result && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-2">
                <p className="text-sm font-medium text-zoho-text">Ready to upload</p>
                <p className="text-sm text-zoho-muted"><span className="font-medium">File:</span> {file?.name}</p>
                <p className="text-sm text-zoho-muted"><span className="font-medium">Month:</span> {month}</p>
              </div>
              <p className="text-xs text-yellow-700 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                ⚠️ If payslips already exist for {month}, they will be replaced.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setStep(2)} className="btn-secondary">Back</button>
                <button onClick={handleUpload} className="btn-primary" disabled={loading}>
                  <Upload size={16} />{loading ? 'Uploading…' : 'Upload & Generate'}
                </button>
              </div>
            </div>
          )}

          {/* Success */}
          {step === 3 && result && (
            <div className="text-center space-y-4 py-6">
              <CheckCircle2 size={48} className="mx-auto text-green-500" />
              <div>
                <p className="text-lg font-semibold text-zoho-text">Upload Complete!</p>
                <p className="text-sm text-zoho-muted mt-1">
                  {result.count} payslips generated for <strong>{result.month}</strong>
                </p>
              </div>
              <button onClick={reset} className="btn-secondary mx-auto">Upload Another</button>
            </div>
          )}
        </div>
      </div>

      {/* CSV format guide */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-sm font-semibold text-zoho-text">CSV Format</h2>
        </div>
        <div className="card-body">
          <p className="text-sm text-zoho-muted mb-3">Your CSV must have these columns (headers are case-insensitive):</p>
          <table className="table-zoho">
            <thead>
              <tr><th>Column</th><th>Required</th><th>Example</th></tr>
            </thead>
            <tbody>
              {[
                ['employee_id',    'Yes', 'EMP001'],
                ['employee_name',  'Yes', 'John Smith'],
                ['basic_salary',   'Yes', '50000'],
                ['hra',            'No',  '5000'],
                ['food_allowance', 'No',  '2000'],
                ['department',     'No',  'Engineering'],
              ].map(([col, req, ex]) => (
                <tr key={col}>
                  <td><code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{col}</code></td>
                  <td>{req === 'Yes' ? <span className="badge-success">Required</span> : <span className="badge-warning">Optional</span>}</td>
                  <td className="text-zoho-muted">{ex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
