import { useState, useRef, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Upload, FileText, CheckCircle2, AlertCircle, X, Download, Loader2, Plus, Trash2, TableIcon } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import api from '@/lib/api';

const G = '#1A7A4A';

/* ── Column definitions ─────────────────────────────────────────────────── */
const COLS = [
  { key: 'employee_id',     label: 'Employee ID',     eg: 'EMP001',              req: true,  note: 'Unique ID for each employee' },
  { key: 'employee_name',   label: 'Full Name',        eg: 'Arjun Sharma',        req: true,  note: 'Employee full name' },
  { key: 'gross_salary',    label: 'Gross Salary (₹)', eg: '45000',               req: true,  note: 'Monthly CTC in ₹' },
  { key: 'email',           label: 'Email',            eg: 'arjun@company.com',   req: false, note: 'Optional — for sending payslips' },
  { key: 'department',      label: 'Department',       eg: 'Engineering',         req: false, note: 'e.g. HR, Sales, Accounts' },
  { key: 'designation',     label: 'Designation',      eg: 'Software Engineer',   req: false, note: 'Job title' },
  { key: 'phone',           label: 'Phone',            eg: '9876543210',          req: false, note: '10-digit mobile number' },
  { key: 'date_of_joining', label: 'Date of Joining',  eg: '2024-01-15',          req: false, note: 'YYYY-MM-DD format' },
];
const COL_KEYS = COLS.map(c => c.key);

/* ── Smart column mapper — tries to match any column name to our fields ─── */
const ALIASES = {
  employee_id:     ['emp id', 'emp_id', 'employee id', 'employeeid', 'id', 'staff id', 'staff_id', 'empid', 'employee no', 'emp no'],
  employee_name:   ['name', 'full name', 'employee name', 'staff name', 'emp name', 'fullname'],
  gross_salary:    ['salary', 'gross', 'ctc', 'monthly ctc', 'gross salary', 'monthly salary', 'basic', 'pay', 'amount'],
  email:           ['email', 'email id', 'email address', 'mail', 'e-mail'],
  department:      ['dept', 'department', 'division', 'team', 'unit'],
  designation:     ['designation', 'title', 'job title', 'role', 'position', 'post'],
  phone:           ['phone', 'mobile', 'contact', 'mobile no', 'phone no', 'contact no', 'tel'],
  date_of_joining: ['doj', 'joining date', 'date of joining', 'join date', 'joining', 'start date'],
};

function smartMapHeader(rawHeader) {
  const h = rawHeader.toLowerCase().trim();
  for (const [field, aliases] of Object.entries(ALIASES)) {
    if (aliases.includes(h) || h === field) return field;
  }
  return null;
}

/* ── Parse date into YYYY-MM-DD ─────────────────────────────────────────── */
function normaliseDate(val) {
  if (!val) return '';
  const s = String(val).trim();
  // Already correct
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY or DD-MM-YYYY
  const m1 = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m1) return `${m1[3]}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`;
  // Excel serial date
  if (/^\d+$/.test(s)) {
    const d = new Date(Math.round((parseInt(s) - 25569) * 86400 * 1000));
    if (!isNaN(d)) return d.toISOString().slice(0, 10);
  }
  // Try native parse
  const d = new Date(s);
  if (!isNaN(d)) return d.toISOString().slice(0, 10);
  return s;
}

/* ── Parse any file (xlsx / csv) and return normalised rows ─────────────── */
function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array', cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
        if (raw.length < 2) return reject('File is empty or has no data rows.');

        // Find header row (first non-empty row)
        let headerRowIdx = 0;
        for (let i = 0; i < Math.min(5, raw.length); i++) {
          if (raw[i].some(cell => String(cell).trim() !== '')) { headerRowIdx = i; break; }
        }

        const rawHeaders = raw[headerRowIdx].map(h => String(h));
        // Map headers to our fields
        const colMap = rawHeaders.map(h => smartMapHeader(h));

        const rows = [];
        for (let i = headerRowIdx + 1; i < raw.length; i++) {
          const cells = raw[i];
          // Skip completely empty rows
          if (cells.every(c => String(c).trim() === '')) continue;

          const row = {};
          COL_KEYS.forEach(k => { row[k] = ''; });

          colMap.forEach((field, ci) => {
            if (field && cells[ci] !== undefined) {
              let v = String(cells[ci]).trim();
              if (field === 'date_of_joining') v = normaliseDate(v);
              if (field === 'employee_id') v = v.toUpperCase();
              row[field] = v;
            }
          });

          // If no mapping found at all, try positional fallback (3+ columns = id, name, salary)
          const mapped = colMap.filter(Boolean).length;
          if (mapped === 0 && cells.length >= 2) {
            row.employee_id   = String(cells[0] || '').trim().toUpperCase();
            row.employee_name = String(cells[1] || '').trim();
            row.gross_salary  = String(cells[2] || '').trim();
          }

          rows.push(row);
        }

        resolve({ rows, unmappedHeaders: rawHeaders.filter((h, i) => !colMap[i] && h.trim()) });
      } catch (err) {
        reject('Could not read this file. Please try a different format.');
      }
    };
    reader.onerror = () => reject('File read error.');
    reader.readAsArrayBuffer(file);
  });
}

/* ── Download CSV template ──────────────────────────────────────────────── */
function downloadTemplate(employees) {
  const header = COL_KEYS;
  const sampleRows = employees.length > 0
    ? employees.map(e => COL_KEYS.map(k => {
        if (k === 'gross_salary') return e.salary || '';
        return e[k] || '';
      }))
    : [
        ['EMP001', 'Arjun Sharma',  '45000', 'arjun@company.com',  'Engineering', 'Software Engineer', '9876543210', '2024-01-15'],
        ['EMP002', 'Priya Nair',    '52000', 'priya@company.com',   'Operations',  'Manager',           '9876543211', '2023-06-01'],
        ['EMP003', 'Rohan Mehta',   '38000', '',                    'Accounts',    'Accountant',        '9876543212', '2024-03-10'],
      ];

  const ws = XLSX.utils.aoa_to_sheet([header, ...sampleRows]);
  // Column widths
  ws['!cols'] = [12,22,16,28,16,22,14,16].map(w => ({ wch: w }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Employees');
  XLSX.writeFile(wb, 'PayLeef_Employee_Template.xlsx');
}

/* ── Empty grid row ─────────────────────────────────────────────────────── */
const emptyRow = () => Object.fromEntries(COL_KEYS.map(k => [k, '']));

/* ── Inline Grid Editor ─────────────────────────────────────────────────── */
function GridEditor({ rows, onChange }) {
  const handleCell = (ri, key, val) => {
    const next = rows.map((r, i) => i === ri ? { ...r, [key]: val } : r);
    onChange(next);
  };
  const addRow = () => onChange([...rows, emptyRow()]);
  const delRow = (ri) => onChange(rows.filter((_, i) => i !== ri));

  const inputStyle = (req, val) => ({
    width: '100%', boxSizing: 'border-box',
    border: req && !val ? '1.5px solid #FCA5A5' : '1px solid transparent',
    borderRadius: 4, padding: '5px 7px', fontSize: 12.5,
    background: 'transparent', outline: 'none', color: '#0F172A',
    fontFamily: 'inherit',
  });

  return (
    <div>
      <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #E2E8F0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 860 }}>
          <thead>
            <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
              <th style={{ width: 36, padding: '8px 6px', textAlign: 'center', color: '#94A3B8', fontWeight: 600 }}>#</th>
              {COLS.map(c => (
                <th key={c.key} style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 700, color: c.req ? '#0F172A' : '#475569', whiteSpace: 'nowrap', borderRight: '1px solid #F1F5F9' }}>
                  {c.label}
                  {c.req && <span style={{ color: '#DC2626', marginLeft: 3 }}>*</span>}
                  {!c.req && <span style={{ fontSize: 10, color: '#94A3B8', marginLeft: 4, fontWeight: 400 }}>optional</span>}
                </th>
              ))}
              <th style={{ width: 36 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} style={{ borderBottom: '1px solid #F1F5F9', background: ri % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                <td style={{ textAlign: 'center', color: '#CBD5E1', fontSize: 11, padding: '4px 6px' }}>{ri + 1}</td>
                {COLS.map(c => (
                  <td key={c.key} style={{ padding: '3px 4px', borderRight: '1px solid #F1F5F9' }}>
                    <input
                      value={row[c.key] || ''}
                      onChange={e => handleCell(ri, c.key, e.target.value)}
                      placeholder={c.eg}
                      style={inputStyle(c.req, row[c.key])}
                      onFocus={e => { e.target.style.background = '#EFF6FF'; e.target.style.borderColor = '#93C5FD'; }}
                      onBlur={e => { e.target.style.background = 'transparent'; e.target.style.borderColor = c.req && !e.target.value ? '#FCA5A5' : 'transparent'; }}
                    />
                  </td>
                ))}
                <td style={{ textAlign: 'center', padding: '4px 6px' }}>
                  <button onClick={() => delRow(ri)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#CBD5E1', padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center' }}
                    onMouseOver={e => e.currentTarget.style.color = '#EF4444'}
                    onMouseOut={e => e.currentTarget.style.color = '#CBD5E1'}>
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={addRow} style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: `1.5px dashed ${G}`, color: G, borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
        <Plus size={14} /> Add row
      </button>
    </div>
  );
}

/* ── Upload summary chips ───────────────────────────────────────────────── */
function Chip({ val, label, color, bg }) {
  return (
    <div style={{ background: bg, borderRadius: 10, padding: '10px 18px', textAlign: 'center', minWidth: 80 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{val}</div>
      <div style={{ fontSize: 11, color, fontWeight: 600, opacity: 0.8, marginTop: 2 }}>{label}</div>
    </div>
  );
}

/* ── Tab button ─────────────────────────────────────────────────────────── */
function Tab({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px',
      background: active ? G : 'transparent',
      color: active ? '#fff' : '#64748B',
      border: 'none', borderRadius: 10, cursor: 'pointer',
      fontSize: 13.5, fontWeight: active ? 700 : 500,
      transition: 'all .15s',
    }}>
      {icon}{label}
    </button>
  );
}

/* ═══════════════════════════ MAIN PAGE ════════════════════════════════════ */
export default function UploadPage() {
  const qc = useQueryClient();
  const fileRef = useRef(null);

  const [tab, setTab] = useState('grid'); // 'grid' | 'file'
  const [employees, setEmployees] = useState([]);

  // Grid editor state
  const [gridRows, setGridRows] = useState(() => Array.from({ length: 5 }, emptyRow));

  // File import state
  const [file, setFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [unmapped, setUnmapped] = useState([]);
  const [parseError, setParseError] = useState('');
  const [parsing, setParsing] = useState(false);

  // Shared
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.get('/employees').then(r => setEmployees(r.data || [])).catch(() => {});
  }, []);

  /* ── File handling ──────────────────────────────────────────────────── */
  const handleFile = useCallback(async (f) => {
    if (!f) return;
    setResult(null); setParseError(''); setFile(f); setParsing(true);
    try {
      const { rows, unmappedHeaders } = await parseFile(f);
      setParsedRows(rows);
      setUnmapped(unmappedHeaders);
      if (rows.length === 0) setParseError('No data rows found in this file.');
    } catch (err) {
      setParseError(typeof err === 'string' ? err : 'Could not read this file.');
      setParsedRows([]);
    } finally {
      setParsing(false);
    }
  }, []);

  const handleDrop = (e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); };
  const resetFile  = () => { setFile(null); setParsedRows([]); setUnmapped([]); setParseError(''); setResult(null); if (fileRef.current) fileRef.current.value = ''; };

  /* ── Submit ─────────────────────────────────────────────────────────── */
  const handleSubmit = async () => {
    const rows = tab === 'grid'
      ? gridRows.filter(r => r.employee_id.trim() && r.employee_name.trim())
      : parsedRows.filter(r => r.employee_id && r.employee_name);

    if (!rows.length) { toast.error('No valid rows to import.'); return; }

    setUploading(true);
    try {
      const res = await api.post('/employees/upload', rows);
      setResult(res.data);
      if (res.data.inserted > 0) {
        toast.success(`${res.data.inserted} employee${res.data.inserted !== 1 ? 's' : ''} added!`);
        qc.invalidateQueries({ queryKey: ['employees'] });
        if (tab === 'grid') setGridRows(Array.from({ length: 5 }, emptyRow));
        else resetFile();
      } else {
        toast.warning(res.data.message || 'No new employees added — they may already exist.');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  /* ── Validation ─────────────────────────────────────────────────────── */
  const activeRows  = tab === 'grid' ? gridRows : parsedRows;
  const validRows   = activeRows.filter(r => r.employee_id?.trim() && r.employee_name?.trim());
  const invalidRows = activeRows.filter(r => !(r.employee_id?.trim() && r.employee_name?.trim()));

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1000, margin: '0 auto' }}>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        input::placeholder { color: #CBD5E1; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0, marginBottom: 6 }}>Import Employees</h1>
        <p style={{ fontSize: 14, color: '#64748B', margin: 0 }}>
          Add multiple employees at once. Type directly in the grid below, or upload an Excel / CSV file — any format works.
          {employees.length > 0 && <span style={{ color: G, fontWeight: 600, marginLeft: 6 }}>You already have {employees.length} employees.</span>}
        </p>
      </div>

      {/* Tab selector */}
      <div style={{ display: 'flex', gap: 6, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: 5, marginBottom: 24, width: 'fit-content' }}>
        <Tab active={tab === 'grid'} onClick={() => setTab('grid')} icon={<TableIcon size={15} />} label="Type directly (like Excel)" />
        <Tab active={tab === 'file'} onClick={() => setTab('file')} icon={<Upload size={15} />} label="Upload file (Excel / CSV)" />
      </div>

      {/* ══ TAB: GRID EDITOR ══════════════════════════════════════════════ */}
      {tab === 'grid' && (
        <div>
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#1E40AF' }}>
            <strong>Tip:</strong> Just fill in Employee ID, Full Name and Salary — that's all you need. Email is optional. Press Tab to move between cells.
          </div>
          <GridEditor rows={gridRows} onChange={setGridRows} />
        </div>
      )}

      {/* ══ TAB: FILE UPLOAD ══════════════════════════════════════════════ */}
      {tab === 'file' && (
        <div>
          {/* Download template */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, background: '#F0FDF4', border: '1px solid #DCFCE7', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 22 }}>📥</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#14532D' }}>Download our Excel template</div>
              <div style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>
                {employees.length > 0 ? `Your ${employees.length} existing employees are pre-filled.` : 'Includes 3 sample rows to guide you.'}
                {' '}Or upload your own file — we'll figure out the columns automatically.
              </div>
            </div>
            <button onClick={() => downloadTemplate(employees)} style={{ background: G, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
              <Download size={14} /> Download Template
            </button>
          </div>

          {/* Drop zone */}
          {!file ? (
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              style={{ border: `2px dashed ${parseError ? '#FCA5A5' : '#CBD5E1'}`, borderRadius: 12, padding: '40px 24px', textAlign: 'center', cursor: 'pointer', background: parseError ? '#FEF2F2' : '#FAFAFA', transition: 'all .15s' }}
              onMouseOver={e => { e.currentTarget.style.borderColor = G; e.currentTarget.style.background = '#F0FDF4'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = parseError ? '#FCA5A5' : '#CBD5E1'; e.currentTarget.style.background = parseError ? '#FEF2F2' : '#FAFAFA'; }}
            >
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
              <div style={{ fontSize: 36, marginBottom: 10 }}>📂</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#334155', marginBottom: 4 }}>Drop your file here, or click to browse</div>
              <div style={{ fontSize: 13, color: '#94A3B8' }}>Supports Excel (.xlsx, .xls) and CSV — any column order — any format</div>
              <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center', gap: 8 }}>
                {['.xlsx', '.xls', '.csv'].map(ext => (
                  <span key={ext} style={{ fontSize: 11, fontWeight: 700, color: '#64748B', background: '#F1F5F9', padding: '3px 10px', borderRadius: 20 }}>{ext}</span>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <CheckCircle2 size={22} style={{ color: G, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#14532D' }}>{file.name}</div>
                <div style={{ fontSize: 12, color: '#166534', marginTop: 2 }}>{parsedRows.length} rows detected</div>
              </div>
              <button onClick={resetFile} style={{ background: 'none', border: '1px solid #86EFAC', borderRadius: 8, cursor: 'pointer', color: '#166534', padding: '6px 12px', fontSize: 12, fontWeight: 600 }}>
                Change file
              </button>
            </div>
          )}

          {/* Parsing spinner */}
          {parsing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, color: '#64748B', fontSize: 13 }}>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
              Reading your file…
            </div>
          )}

          {/* Parse error */}
          {parseError && (
            <div style={{ display: 'flex', gap: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', marginTop: 12 }}>
              <AlertCircle size={16} style={{ color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
              <div style={{ fontSize: 13, color: '#991B1B' }}>{parseError}</div>
            </div>
          )}

          {/* Unmapped columns notice */}
          {unmapped.length > 0 && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 14px', marginTop: 12, fontSize: 12, color: '#92400E' }}>
              <strong>Columns we didn't recognise:</strong> {unmapped.join(', ')} — these were ignored. We matched everything else automatically.
            </div>
          )}
        </div>
      )}

      {/* ── Preview table (file tab) ───────────────────────────────────── */}
      {tab === 'file' && parsedRows.length > 0 && (
        <div style={{ marginTop: 20, border: '1px solid #E2E8F0', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ background: '#F8FAFC', padding: '10px 16px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>Preview — first 8 rows</span>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>{parsedRows.length} total rows found</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {COLS.map(c => (
                    <th key={c.key} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap', borderBottom: '1px solid #E2E8F0', borderRight: '1px solid #F1F5F9' }}>
                      {c.label} {c.req && <span style={{ color: '#DC2626' }}>*</span>}
                    </th>
                  ))}
                  <th style={{ padding: '8px 12px', borderBottom: '1px solid #E2E8F0' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, 8).map((row, i) => {
                  const ok = row.employee_id && row.employee_name;
                  return (
                    <tr key={i} style={{ background: ok ? (i % 2 === 0 ? '#fff' : '#FAFAFA') : '#FEF2F2', borderBottom: '1px solid #F1F5F9' }}>
                      {COLS.map(c => (
                        <td key={c.key} style={{ padding: '7px 12px', color: '#334155', whiteSpace: 'nowrap', borderRight: '1px solid #F8FAFC', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.key === 'gross_salary' && row[c.key]
                            ? `₹${Number(row[c.key]).toLocaleString('en-IN')}`
                            : row[c.key] || <span style={{ color: '#CBD5E1' }}>—</span>}
                        </td>
                      ))}
                      <td style={{ padding: '7px 12px' }}>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: ok ? '#DCFCE7' : '#FEE2E2', color: ok ? '#166534' : '#991B1B' }}>
                          {ok ? '✓ Ready' : '✗ Missing ID or Name'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Summary + Import button ────────────────────────────────────── */}
      {(validRows.length > 0 || (tab === 'grid' && gridRows.some(r => r.employee_id || r.employee_name))) && (
        <div style={{ marginTop: 24, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '20px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
            <Chip val={validRows.length}   label="Ready to import" color={G}       bg="#F0FDF4" />
            {invalidRows.length > 0 && <Chip val={invalidRows.length} label="Will be skipped" color="#DC2626" bg="#FEF2F2" />}
            <Chip val={activeRows.length}  label="Total rows"       color="#475569" bg="#F8FAFC" />
          </div>

          {invalidRows.length > 0 && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12.5, color: '#92400E' }}>
              <strong>⚠ Rows skipped:</strong> Employee ID and Full Name are required. Email is optional.
            </div>
          )}

          {/* Result */}
          {result && (
            <div style={{ marginBottom: 16 }}>
              {result.inserted > 0 && (
                <div style={{ display: 'flex', gap: 8, background: '#F0FDF4', border: '1px solid #DCFCE7', borderRadius: 8, padding: '12px 14px', marginBottom: 8 }}>
                  <CheckCircle2 size={16} style={{ color: G, flexShrink: 0, marginTop: 1 }} />
                  <div style={{ fontSize: 13, color: '#166534' }}><strong>{result.inserted} employees added</strong> successfully!</div>
                </div>
              )}
              {result.skipped > 0 && result.skippedReasons?.length > 0 && (
                <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#92400E' }}>
                  {result.skipped} row{result.skipped > 1 ? 's' : ''} skipped: {result.skippedReasons.slice(0, 3).map(r => `${r.employee_id} — ${r.reason}`).join(' · ')}
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={uploading || validRows.length === 0}
            style={{ background: validRows.length === 0 ? '#E2E8F0' : G, color: validRows.length === 0 ? '#94A3B8' : '#fff', border: 'none', borderRadius: 10, padding: '12px 28px', fontSize: 14, fontWeight: 700, cursor: validRows.length === 0 ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            {uploading
              ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />Importing…</>
              : <><CheckCircle2 size={15} />Import {validRows.length} Employee{validRows.length !== 1 ? 's' : ''}</>
            }
          </button>
        </div>
      )}

      {/* ── Monthly headcount tip ──────────────────────────────────────── */}
      <div style={{ marginTop: 28, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginBottom: 8 }}>💡 Managing monthly headcount changes?</div>
        <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>
          <strong>New joiner this month?</strong> Type their details in the grid above and click Import. They'll be added instantly.
          <br />
          <strong>Someone left?</strong> Go to the <strong>Employees</strong> page → find the employee → click the three-dot menu → <strong>Mark as Inactive</strong>. They won't appear in the next payroll run.
          <br />
          <strong>Salary changed?</strong> Go to Employees → Edit employee → update the salary. Takes effect immediately on next payslip generation.
        </div>
      </div>
    </div>
  );
}
