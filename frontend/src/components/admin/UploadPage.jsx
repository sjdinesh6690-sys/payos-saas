import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Upload, FileText, CheckCircle2, AlertCircle, X, Download,
  Users, Loader2, ChevronRight, Info,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

// ── CSV helpers ───────────────────────────────────────────────────────────────
function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { rows: [], headers: [] };
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(line => {
    const vals = parseCsvLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
    return obj;
  });
  return { rows, headers };
}

function buildCsv(headers, rows) {
  const esc = v => { const s = String(v ?? ''); return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s; };
  return [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h] ?? '')).join(','))].join('\n');
}

function downloadCsv(content, filename) {
  const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ── Required columns for employees ───────────────────────────────────────────
const REQUIRED_COLS = ['employee_id', 'employee_name', 'email', 'gross_salary'];
const ALL_EMP_COLS  = ['employee_id', 'employee_name', 'email', 'gross_salary', 'department', 'designation', 'phone', 'date_of_joining'];

const COL_INFO = {
  employee_id:      { label: 'Employee ID',      eg: 'EMP001',            note: 'Unique ID — must be unique per employee', req: true },
  employee_name:    { label: 'Full Name',         eg: 'Arjun Sharma',      note: 'Employee full name',                      req: true },
  email:            { label: 'Email Address',     eg: 'arjun@company.com', note: 'Used for payslip emails and login',        req: true },
  gross_salary:     { label: 'Gross Salary (₹)',  eg: '45000',             note: 'Total monthly CTC in rupees',              req: true },
  department:       { label: 'Department',        eg: 'Engineering',       note: 'Optional — e.g. HR, Sales, Accounts' },
  designation:      { label: 'Designation',       eg: 'Software Engineer', note: 'Optional — job title' },
  phone:            { label: 'Phone Number',      eg: '9876543210',        note: 'Optional — 10-digit mobile' },
  date_of_joining:  { label: 'Date of Joining',   eg: '2024-01-15',        note: 'Optional — YYYY-MM-DD format' },
};

// ── Step indicator ────────────────────────────────────────────────────────────
function StepBadge({ n, active, done }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 800, flexShrink: 0,
      background: done ? '#DCFCE7' : active ? '#1A7A4A' : '#F1F5F9',
      color: done ? '#166534' : active ? '#fff' : '#94A3B8',
      border: done ? '2px solid #86EFAC' : active ? 'none' : '2px solid #E2E8F0',
    }}>
      {done ? '✓' : n}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function UploadPage() {
  const qc = useQueryClient();
  const fileRef = useRef(null);

  const [employees, setEmployees]   = useState([]);
  const [empLoading, setEmpLoading] = useState(true);
  const [file, setFile]             = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [headers, setHeaders]       = useState([]);
  const [parseError, setParseError] = useState('');
  const [uploading, setUploading]   = useState(false);
  const [result, setResult]         = useState(null);
  const [activeStep, setActiveStep] = useState(1);

  const G = '#1A7A4A';

  useEffect(() => {
    api.get('/employees')
      .then(r => setEmployees(r.data || []))
      .catch(() => setEmployees([]))
      .finally(() => setEmpLoading(false));
  }, []);

  // ── Download template ─────────────────────────────────────────────────────
  const handleDownload = () => {
    const rows = employees.length > 0
      ? employees.map(e => ({
          employee_id:     e.employee_id,
          employee_name:   e.employee_name,
          email:           e.email || '',
          gross_salary:    e.salary || '',
          department:      e.department || '',
          designation:     e.designation || '',
          phone:           e.phone || '',
          date_of_joining: e.date_of_joining || '',
        }))
      : [
          { employee_id: 'EMP001', employee_name: 'Arjun Sharma',  email: 'arjun@company.com',  gross_salary: 45000, department: 'Engineering', designation: 'Software Engineer', phone: '9876543210', date_of_joining: '2024-01-15' },
          { employee_id: 'EMP002', employee_name: 'Priya Nair',    email: 'priya@company.com',   gross_salary: 52000, department: 'Operations',   designation: 'Manager',          phone: '9876543211', date_of_joining: '2023-06-01' },
          { employee_id: 'EMP003', employee_name: 'Rohan Mehta',   email: 'rohan@company.com',   gross_salary: 38000, department: 'Accounts',     designation: 'Accountant',       phone: '9876543212', date_of_joining: '2024-03-10' },
        ];

    const csv = buildCsv(ALL_EMP_COLS, rows);
    downloadCsv(csv, 'payleef_employee_import.csv');

    toast.success(
      employees.length > 0
        ? `Template downloaded with ${employees.length} employees pre-filled`
        : 'Template downloaded with 3 example rows — replace with your actual data'
    );
    setActiveStep(2);
  };

  // ── File handling ─────────────────────────────────────────────────────────
  const handleFile = (f) => {
    if (!f) return;
    setResult(null);
    setParseError('');

    if (!f.name.toLowerCase().endsWith('.csv')) {
      setParseError('Please upload a CSV file. In Excel: File → Save As → CSV (Comma delimited).');
      return;
    }

    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const { rows, headers } = parseCsv(e.target.result);

      if (!rows.length) {
        setParseError('No data rows found. Make sure the file has a header row and at least one employee row.');
        setParsedRows([]); setHeaders([]);
        return;
      }

      // Check for required columns
      const fileHeaders = headers.map(h => h.toLowerCase().trim());
      const missing = REQUIRED_COLS.filter(r => !fileHeaders.includes(r));
      if (missing.length > 0) {
        setParseError(`Missing required columns: ${missing.join(', ')}. Download the template to get the correct format.`);
        setParsedRows([]); setHeaders([]);
        return;
      }

      setParsedRows(rows);
      setHeaders(headers);
      setActiveStep(3);
    };
    reader.readAsText(f);
  };

  const handleDrop  = (e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); };
  const resetFile   = () => { setFile(null); setParsedRows([]); setHeaders([]); setParseError(''); setResult(null); if (fileRef.current) fileRef.current.value = ''; setActiveStep(2); };

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!parsedRows.length) return;
    setUploading(true);
    try {
      const res = await api.post('/employees/upload', parsedRows);
      setResult(res.data);
      if (res.data.inserted > 0) {
        toast.success(`${res.data.inserted} employee${res.data.inserted > 1 ? 's' : ''} added successfully!`);
        qc.invalidateQueries({ queryKey: ['employees'] });
        setActiveStep(1);
        resetFile();
      } else {
        toast.warning(res.data.message || 'No new employees were added.');
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Upload failed. Please try again.';
      toast.error(msg);
      setParseError(msg);
    } finally {
      setUploading(false);
    }
  };

  // ── Validation summary ────────────────────────────────────────────────────
  const validRows   = parsedRows.filter(r => r.employee_id && r.employee_name && r.email);
  const invalidRows = parsedRows.filter(r => !r.employee_id || !r.employee_name || !r.email);

  return (
    <div style={{ padding: 24, maxWidth: 860, margin: '0 auto' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>Import Employees</h1>
        <p style={{ fontSize: 14, color: '#64748B' }}>
          Add multiple employees at once using a CSV file. Follow the 3 steps below.
          {employees.length > 0 && (
            <span style={{ marginLeft: 6, color: G, fontWeight: 600 }}>
              You currently have {employees.length} employee{employees.length !== 1 ? 's' : ''}.
            </span>
          )}
        </p>
      </div>

      {/* ── STEP 1 — Download Template ── */}
      <div style={{ background: '#fff', border: `1px solid ${activeStep === 1 ? '#86EFAC' : '#E2E8F0'}`, borderRadius: 14, padding: 24, marginBottom: 16, boxShadow: activeStep === 1 ? '0 0 0 3px rgba(26,122,74,0.08)' : 'none' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <StepBadge n={1} active={activeStep === 1} done={activeStep > 1} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Download the Template</div>
            <div style={{ fontSize: 13, color: '#64748B', marginBottom: 16, lineHeight: 1.6 }}>
              {employees.length > 0
                ? <>Your <strong>{employees.length} existing employees</strong> are pre-filled in the template. You can update details or add new rows.</>
                : 'Get the CSV template with the correct column format. We\'ve added 3 example rows to show you how to fill it in.'}
            </div>

            {/* Column guide */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16 }}>
              {ALL_EMP_COLS.map(col => {
                const info = COL_INFO[col];
                const isReq = REQUIRED_COLS.includes(col);
                return (
                  <div key={col} style={{ background: isReq ? '#F0FDF4' : '#F8FAFC', border: `1px solid ${isReq ? '#DCFCE7' : '#E2E8F0'}`, borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <code style={{ fontSize: 11, fontWeight: 700, color: isReq ? G : '#475569', background: isReq ? '#DCFCE7' : '#E2E8F0', padding: '1px 6px', borderRadius: 4 }}>{col}</code>
                      {isReq && <span style={{ fontSize: 10, fontWeight: 700, color: '#DC2626' }}>REQUIRED</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>{info.label}</div>
                    <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>e.g. {info.eg}</div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleDownload}
              disabled={empLoading}
              style={{
                background: G, color: '#fff', border: 'none',
                padding: '11px 24px', borderRadius: 8, fontSize: 14, fontWeight: 700,
                cursor: empLoading ? 'not-allowed' : 'pointer', opacity: empLoading ? 0.6 : 1,
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}
            >
              {empLoading
                ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Loading…</>
                : <><Download size={14} /> Download Template (CSV)</>
              }
            </button>
            <span style={{ marginLeft: 12, fontSize: 12, color: '#94A3B8' }}>Opens in Excel — fill in your employees and save</span>
          </div>
        </div>
      </div>

      {/* ── STEP 2 — Fill & Upload ── */}
      <div style={{ background: '#fff', border: `1px solid ${activeStep === 2 ? '#86EFAC' : '#E2E8F0'}`, borderRadius: 14, padding: 24, marginBottom: 16, boxShadow: activeStep === 2 ? '0 0 0 3px rgba(26,122,74,0.08)' : 'none', opacity: activeStep < 2 ? 0.5 : 1 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <StepBadge n={2} active={activeStep === 2} done={activeStep > 2} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Fill in Excel and Upload the CSV</div>
            <div style={{ fontSize: 13, color: '#64748B', marginBottom: 16, lineHeight: 1.6 }}>
              Open the downloaded file in Excel or Google Sheets. Fill in your employee details.
              Then <strong>Save As → CSV</strong> and upload it here.
            </div>

            {/* Tips */}
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#92400E', lineHeight: 1.6 }}>
              <strong>Tips:</strong> Don't rename the column headers · Gross salary should be the full monthly CTC in ₹ · Date format: YYYY-MM-DD (e.g. 2024-01-15) · Employee ID must be unique
            </div>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => activeStep >= 2 && fileRef.current?.click()}
              style={{
                border: `2px dashed ${file ? G : parseError ? '#FECACA' : '#CBD5E1'}`,
                borderRadius: 10, padding: '32px 24px', textAlign: 'center',
                cursor: activeStep >= 2 ? 'pointer' : 'default',
                background: file ? '#F0FDF4' : parseError ? '#FEF2F2' : '#FAFAFA',
                transition: 'all .15s',
              }}
            >
              <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
              {file ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <CheckCircle2 size={20} style={{ color: G }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#14532D' }}>{file.name}</span>
                  <span style={{ fontSize: 13, color: '#64748B' }}>— {parsedRows.length} rows found</span>
                  <button onClick={e => { e.stopPropagation(); resetFile(); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 2 }}>
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <Upload size={32} style={{ color: parseError ? '#FCA5A5' : '#CBD5E1', margin: '0 auto 10px' }} />
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>Click to choose your CSV file</div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>or drag and drop it here · CSV files only</div>
                </>
              )}
            </div>

            {/* Parse error */}
            {parseError && (
              <div style={{ display: 'flex', gap: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '12px 14px', marginTop: 12 }}>
                <AlertCircle size={16} style={{ color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#991B1B', marginBottom: 3 }}>Cannot read this file</div>
                  <div style={{ fontSize: 13, color: '#B91C1C' }}>{parseError}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── STEP 3 — Review & Confirm ── */}
      {parsedRows.length > 0 && (
        <div style={{ background: '#fff', border: `1px solid ${activeStep === 3 ? '#86EFAC' : '#E2E8F0'}`, borderRadius: 14, padding: 24, marginBottom: 16, boxShadow: '0 0 0 3px rgba(26,122,74,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <StepBadge n={3} active={activeStep === 3} done={false} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>Review and Confirm</div>

              {/* Summary chips */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                <div style={{ background: '#F0FDF4', border: '1px solid #DCFCE7', borderRadius: 8, padding: '8px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: G }}>{validRows.length}</div>
                  <div style={{ fontSize: 12, color: '#166534', fontWeight: 600 }}>Ready to import</div>
                </div>
                {invalidRows.length > 0 && (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '8px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#DC2626' }}>{invalidRows.length}</div>
                    <div style={{ fontSize: 12, color: '#991B1B', fontWeight: 600 }}>Will be skipped</div>
                  </div>
                )}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '8px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A' }}>{parsedRows.length}</div>
                  <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>Total rows</div>
                </div>
              </div>

              {/* Skipped rows warning */}
              {invalidRows.length > 0 && (
                <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#92400E' }}>
                  <strong>⚠ {invalidRows.length} row{invalidRows.length > 1 ? 's' : ''} missing required fields</strong> — these will be skipped:
                  <ul style={{ margin: '6px 0 0 16px', lineHeight: 1.8 }}>
                    {invalidRows.slice(0, 5).map((r, i) => (
                      <li key={i}>Row {parsedRows.indexOf(r) + 2}: {r.employee_name || '(no name)'} — missing {!r.employee_id ? 'employee_id' : !r.employee_name ? 'employee_name' : 'email'}</li>
                    ))}
                    {invalidRows.length > 5 && <li>…and {invalidRows.length - 5} more</li>}
                  </ul>
                </div>
              )}

              {/* Preview table */}
              <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ background: '#F8FAFC', padding: '10px 16px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>Preview</span>
                  {parsedRows.length > 5 && <span style={{ fontSize: 12, color: '#94A3B8' }}>Showing first 5 of {parsedRows.length}</span>}
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#F8FAFC' }}>
                        {headers.filter(h => ALL_EMP_COLS.includes(h)).map(h => (
                          <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap', borderBottom: '1px solid #E2E8F0', borderRight: '1px solid #F1F5F9' }}>
                            {COL_INFO[h]?.label || h}
                            {REQUIRED_COLS.includes(h) && <span style={{ color: '#DC2626', marginLeft: 3 }}>*</span>}
                          </th>
                        ))}
                        <th style={{ padding: '8px 14px', textAlign: 'left', fontWeight: 600, color: '#475569', borderBottom: '1px solid #E2E8F0' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedRows.slice(0, 5).map((row, i) => {
                        const ok = row.employee_id && row.employee_name && row.email;
                        return (
                          <tr key={i} style={{ background: ok ? '#fff' : '#FEF2F2', borderBottom: '1px solid #F1F5F9' }}>
                            {headers.filter(h => ALL_EMP_COLS.includes(h)).map(h => (
                              <td key={h} style={{ padding: '8px 14px', color: '#334155', whiteSpace: 'nowrap', borderRight: '1px solid #F8FAFC' }}>
                                {row[h] ? (
                                  h === 'gross_salary' || h === 'salary'
                                    ? <strong>₹{Number(row[h]).toLocaleString('en-IN')}</strong>
                                    : row[h]
                                ) : (
                                  REQUIRED_COLS.includes(h)
                                    ? <span style={{ color: '#DC2626', fontWeight: 600 }}>⚠ Missing</span>
                                    : <span style={{ color: '#CBD5E1' }}>—</span>
                                )}
                              </td>
                            ))}
                            <td style={{ padding: '8px 14px' }}>
                              {ok
                                ? <span style={{ fontSize: 11, fontWeight: 700, color: G, background: '#DCFCE7', padding: '2px 8px', borderRadius: 4 }}>✓ Ready</span>
                                : <span style={{ fontSize: 11, fontWeight: 700, color: '#DC2626', background: '#FEE2E2', padding: '2px 8px', borderRadius: 4 }}>⚠ Skip</span>
                              }
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Import button */}
              <button
                onClick={handleUpload}
                disabled={uploading || validRows.length === 0}
                style={{
                  width: '100%', padding: '13px', borderRadius: 9, border: 'none',
                  background: validRows.length === 0 ? '#E2E8F0' : G,
                  color: validRows.length === 0 ? '#94A3B8' : '#fff',
                  fontSize: 15, fontWeight: 700,
                  cursor: validRows.length === 0 || uploading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                }}
              >
                {uploading
                  ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Importing employees…</>
                  : <><Users size={16} /> Import {validRows.length} Employee{validRows.length !== 1 ? 's' : ''}</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Result ── */}
      {result && (
        <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 14, padding: 20 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <CheckCircle2 size={22} style={{ color: G, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#14532D', marginBottom: 4 }}>Import Complete!</div>
              <div style={{ fontSize: 14, color: '#166534' }}>
                <strong>{result.inserted}</strong> employee{result.inserted !== 1 ? 's' : ''} added.
                {result.skipped > 0 && <span style={{ color: '#D97706', marginLeft: 8 }}>{result.skipped} skipped.</span>}
              </div>
              {result.skippedReasons?.length > 0 && (
                <div style={{ marginTop: 10, background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400E' }}>
                  <strong>Skipped rows:</strong>
                  <ul style={{ margin: '4px 0 0 16px', lineHeight: 1.8 }}>
                    {result.skippedReasons.map((r, i) => (
                      <li key={i}>{r.employee_id}: {r.reason}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div style={{ marginTop: 12, fontSize: 13, color: G }}>
                → Go to <strong>Employees</strong> page to review the imported employees.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Help box ── */}
      <div style={{ marginTop: 24, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Info size={14} style={{ color: '#64748B' }} /> Common Questions
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { q: 'What is the default password?', a: 'The employee\'s ID (e.g. EMP001). They can change it after logging in.' },
            { q: 'Can I upload duplicate employees?', a: 'Duplicate Employee IDs are skipped. Use the Employees page to edit existing employees.' },
            { q: 'What if my salary column is named differently?', a: 'Use "gross_salary" in the header. The template already has the correct column names.' },
            { q: 'How do I update existing employees?', a: 'CSV import only adds new employees. To edit existing ones, go to the Employees page.' },
          ].map((item, i) => (
            <div key={i} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#1E293B', marginBottom: 4 }}>{item.q}</div>
              <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.6 }}>{item.a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
