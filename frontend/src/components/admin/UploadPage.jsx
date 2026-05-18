import { useState, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Upload, FileText, CheckCircle2, AlertCircle, X, Download,
  Users, Info, ChevronDown, ChevronUp, Calendar, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import api from '@/lib/api';

// ── CSV parser ────────────────────────────────────────────────────────────────
function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
    const obj = {};
    headers.forEach((h, i) => { obj[h] = vals[i] || ''; });
    return obj;
  });
}

// ── CSV builder ───────────────────────────────────────────────────────────────
function buildCsv(headers, rows) {
  const escape = (v) => {
    const s = String(v ?? '');
    return s.includes(',') ? `"${s}"` : s;
  };
  const headerLine = headers.join(',');
  const dataLines  = rows.map(r => headers.map(h => escape(r[h] ?? '')).join(','));
  return [headerLine, ...dataLines].join('\n');
}

function downloadCsv(content, filename) {
  const blob = new Blob([content], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

// ── Month/Year picker modal ───────────────────────────────────────────────────
function MonthPickerModal({ onConfirm, onClose }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  const years = [];
  for (let y = now.getFullYear() + 1; y >= 2020; y--) years.push(y);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 380, boxShadow: '0 24px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#0F172A' }}>Which month's payslips?</div>
            <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Template will be pre-filled with all your employees for this month.</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Month</label>
            <select
              value={month}
              onChange={e => setMonth(Number(e.target.value))}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', fontSize: 14, color: '#0F172A', background: '#fff', cursor: 'pointer', outline: 'none' }}
            >
              {MONTHS.map((m, i) => (
                <option key={m} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>Year</label>
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #E2E8F0', fontSize: 14, color: '#0F172A', background: '#fff', cursor: 'pointer', outline: 'none' }}
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#475569', marginBottom: 20 }}>
          📋 Downloading template for <strong>{MONTHS[month - 1]} {year}</strong> — all employees will be pre-filled with their current salary.
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid #E2E8F0', background: '#fff', color: '#475569', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            onClick={() => onConfirm(month, year)}
            style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: '#0F4FBF', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            <Download size={14} /> Download Template
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
function Badge({ children, color = 'blue' }) {
  const s = {
    blue:   { background: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' },
    green:  { background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' },
    orange: { background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' },
    purple: { background: '#F5F3FF', color: '#7C3AED', border: '1px solid #DDD6FE' },
    gray:   { background: '#F8FAFC', color: '#475569', border: '1px solid #E2E8F0' },
  };
  return <span style={{ ...s[color], fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, display: 'inline-block' }}>{children}</span>;
}

// ── Column group ──────────────────────────────────────────────────────────────
function ColGroup({ title, cols, badgeColor, badgeLabel }) {
  return (
    <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden', marginBottom: 10 }}>
      <div style={{ background: '#F8FAFC', padding: '9px 14px', display: 'flex', gap: 8, alignItems: 'center', borderBottom: '1px solid #E2E8F0' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#1E293B' }}>{title}</span>
        <Badge color={badgeColor}>{badgeLabel}</Badge>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 0 }}>
        {cols.map((c, i) => (
          <div key={c.key} style={{ padding: '9px 13px', borderBottom: '1px solid #F8FAFC', borderRight: '1px solid #F8FAFC' }}>
            <code style={{ fontSize: 11, fontWeight: 700, color: '#0F4FBF', background: '#EFF6FF', padding: '1px 5px', borderRadius: 3 }}>{c.key}</code>
            {c.req && <span style={{ color: '#DC2626', marginLeft: 2, fontSize: 11 }}>*</span>}
            <div style={{ fontSize: 11, color: '#334155', marginTop: 2, fontWeight: 500 }}>{c.label}</div>
            <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>{c.note}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Mode selector card ────────────────────────────────────────────────────────
function ModeCard({ mode, selected, onSelect, icon, title, subtitle }) {
  const active = selected === mode;
  return (
    <div
      onClick={() => onSelect(mode)}
      style={{
        flex: 1, padding: '14px 18px', borderRadius: 10, cursor: 'pointer', transition: 'all .15s',
        border: active ? '2px solid #0F4FBF' : '2px solid #E2E8F0',
        background: active ? '#EFF6FF' : '#FAFAFA',
      }}
    >
      <div style={{ fontSize: 20, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: active ? '#0F4FBF' : '#1E293B', marginBottom: 3 }}>{title}</div>
      <div style={{ fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>{subtitle}</div>
    </div>
  );
}

// ── Column definitions ────────────────────────────────────────────────────────
const EMP_COLS_REQUIRED = [
  { key: 'employee_id',    label: 'Employee ID',      note: 'Unique ID e.g. EMP001',        req: true },
  { key: 'employee_name',  label: 'Full Name',         note: 'Employee full name',           req: true },
  { key: 'email',          label: 'Email',             note: 'Used for employee login',      req: true },
  { key: 'gross_salary',   label: 'Gross Salary (₹)',  note: 'Total monthly CTC',            req: true },
];
const EMP_COLS_OPTIONAL = [
  { key: 'department',      label: 'Department',       note: 'e.g. Engineering, HR' },
  { key: 'designation',     label: 'Designation',      note: 'e.g. Manager, Executive' },
  { key: 'phone',           label: 'Phone',            note: '10-digit mobile number' },
  { key: 'date_of_joining', label: 'Date of Joining',  note: 'YYYY-MM-DD format' },
];
const EMP_COLS_BREAKUP = [
  { key: 'basic_pay',         label: 'Basic Pay (₹)',         note: 'Usually 40–50% of gross' },
  { key: 'hra',               label: 'HRA (₹)',               note: 'House Rent Allowance' },
  { key: 'conveyance',        label: 'Conveyance (₹)',        note: 'Usually ₹1,600' },
  { key: 'special_allowance', label: 'Special Allowance (₹)', note: 'Balance after above' },
];
const PAY_COLS_REQUIRED = [
  { key: 'employee_id',  label: 'Employee ID',      note: 'Must match existing employee', req: true },
  { key: 'employee_name',label: 'Employee Name',    note: 'For reference only' },
  { key: 'month',        label: 'Month',            note: '1 = Jan, 12 = Dec',           req: true },
  { key: 'year',         label: 'Year',             note: 'e.g. 2026',                   req: true },
  { key: 'gross_salary', label: 'Gross Salary (₹)', note: 'Leave blank to use employee salary' },
];
const PAY_COLS_EARNINGS = [
  { key: 'basic_pay',          label: 'Basic Pay (₹)',         note: 'Basic salary component' },
  { key: 'hra',                label: 'HRA (₹)',               note: 'House Rent Allowance' },
  { key: 'conveyance',         label: 'Conveyance (₹)',        note: 'Travel allowance' },
  { key: 'special_allowance',  label: 'Special Allowance (₹)', note: 'Balance amount' },
  { key: 'bonus',              label: 'Bonus (₹)',             note: 'One-time or monthly bonus' },
  { key: 'overtime_pay',       label: 'Overtime Pay (₹)',      note: 'Extra hours pay' },
  { key: 'lop_days',           label: 'LOP Days',              note: '0 if full month worked' },
];
const PAY_COLS_DEDUCTIONS = [
  { key: 'pf_deduction',      label: 'PF Deduction (₹)',      note: '12% of basic pay' },
  { key: 'esi_deduction',     label: 'ESI Deduction (₹)',     note: '0.75% of gross' },
  { key: 'pt_deduction',      label: 'Prof. Tax (₹)',         note: 'State professional tax' },
  { key: 'tds_deduction',     label: 'TDS (₹)',               note: 'Income tax at source' },
  { key: 'other_deductions',  label: 'Other Deductions (₹)',  note: 'Loan, canteen etc.' },
  { key: 'net_pay',           label: 'Net Pay (₹)',           note: 'Final take-home (auto if blank)' },
];

// ── Upload panel ──────────────────────────────────────────────────────────────
function UploadPanel({ type, mode, employees, empLoading }) {
  const qc      = useQueryClient();
  const fileRef = useRef(null);
  const [file, setFile]       = useState(null);
  const [rows, setRows]       = useState([]);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [dlLoading, setDlLoading] = useState(false);

  const isEmp    = type === 'employees';
  const endpoint = isEmp ? '/employees/upload' : '/payslips/upload';
  const queryKeys = isEmp ? ['employees'] : ['payslips', 'payslip-months'];

  // ── Download template with real data pre-filled ──────────────────────────
  const handleDownloadEmp = () => {
    if (empLoading) { toast('Loading employee data…'); return; }

    const isDetailed = mode === 'detailed';
    const headers = isDetailed
      ? ['employee_id','employee_name','email','department','designation','phone','date_of_joining','gross_salary','basic_pay','hra','conveyance','special_allowance']
      : ['employee_id','employee_name','email','department','designation','phone','date_of_joining','gross_salary'];

    let rows = [];
    if (employees && employees.length > 0) {
      // Pre-fill with real employees
      rows = employees.map(e => ({
        employee_id:        e.employee_id,
        employee_name:      e.employee_name,
        email:              e.email || '',
        department:         e.department || '',
        designation:        e.designation || '',
        phone:              e.phone || '',
        date_of_joining:    e.date_of_joining || '',
        gross_salary:       e.salary || '',
        basic_pay:          '',
        hra:                '',
        conveyance:         '',
        special_allowance:  '',
      }));
    } else {
      // Fallback: blank example rows
      rows = [
        { employee_id: 'EMP001', employee_name: 'John Smith', email: 'john@company.com', department: 'Engineering', designation: 'Engineer', phone: '9876543210', date_of_joining: '2024-01-15', gross_salary: 50000, basic_pay: '', hra: '', conveyance: '', special_allowance: '' },
        { employee_id: 'EMP002', employee_name: 'Jane Doe',   email: 'jane@company.com', department: 'HR',          designation: 'HR Manager', phone: '9876543211', date_of_joining: '2023-06-01', gross_salary: 60000, basic_pay: '', hra: '', conveyance: '', special_allowance: '' },
      ];
    }

    const csv = buildCsv(headers, rows);
    downloadCsv(csv, isDetailed ? 'employee_master_detailed.csv' : 'employee_master.csv');
    toast.success(employees?.length > 0
      ? `Template downloaded with ${employees.length} existing employees pre-filled`
      : 'Template downloaded with example data');
  };

  const handleDownloadPayslip = (month, year) => {
    setShowMonthPicker(false);
    if (empLoading) { toast('Loading employee data…'); return; }

    const isDetailed = mode === 'detailed';
    const headers = isDetailed
      ? ['employee_id','employee_name','month','year','gross_salary','basic_pay','hra','conveyance','special_allowance','bonus','overtime_pay','lop_days','pf_deduction','esi_deduction','pt_deduction','tds_deduction','other_deductions','net_pay']
      : ['employee_id','employee_name','month','year','gross_salary'];

    let rows = [];
    if (employees && employees.length > 0) {
      rows = employees.map(e => ({
        employee_id:     e.employee_id,
        employee_name:   e.employee_name,
        month:           month,
        year:            year,
        gross_salary:    e.salary || '',
        basic_pay:       '',
        hra:             '',
        conveyance:      '',
        special_allowance: '',
        bonus:           '',
        overtime_pay:    '',
        lop_days:        '0',
        pf_deduction:    '',
        esi_deduction:   '',
        pt_deduction:    '',
        tds_deduction:   '',
        other_deductions:'',
        net_pay:         '',
      }));
    } else {
      rows = [
        { employee_id:'EMP001', employee_name:'John Smith', month, year, gross_salary:50000, basic_pay:'', hra:'', conveyance:'', special_allowance:'', bonus:'', overtime_pay:'', lop_days:'0', pf_deduction:'', esi_deduction:'', pt_deduction:'', tds_deduction:'', other_deductions:'', net_pay:'' },
        { employee_id:'EMP002', employee_name:'Jane Doe',   month, year, gross_salary:60000, basic_pay:'', hra:'', conveyance:'', special_allowance:'', bonus:'', overtime_pay:'', lop_days:'0', pf_deduction:'', esi_deduction:'', pt_deduction:'', tds_deduction:'', other_deductions:'', net_pay:'' },
      ];
    }

    const csv = buildCsv(headers, rows);
    const monthName = MONTHS[month - 1];
    downloadCsv(csv, `payslip_${monthName}_${year}${isDetailed ? '_detailed' : ''}.csv`);
    toast.success(employees?.length > 0
      ? `Template for ${monthName} ${year} downloaded with ${employees.length} employees pre-filled`
      : `Template for ${monthName} ${year} downloaded`);
  };

  const handleDownloadClick = () => {
    if (isEmp) handleDownloadEmp();
    else setShowMonthPicker(true);
  };

  // ── File upload ──────────────────────────────────────────────────────────
  const handleFile = (f) => {
    if (!f) return;
    if (!f.name.endsWith('.csv')) { setError('Only CSV files are supported. Save your Excel as CSV (File → Save As → CSV) first.'); return; }
    setError(''); setFile(f); setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseCsv(e.target.result);
      if (!parsed.length) { setError('No data rows found. Check the file has a header row and at least one data row.'); setRows([]); return; }
      setRows(parsed);
    };
    reader.readAsText(f);
  };

  const handleDrop  = (e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); };
  const reset       = () => { setFile(null); setRows([]); setError(''); setResult(null); if (fileRef.current) fileRef.current.value = ''; };

  const handleUpload = async () => {
    if (!rows.length) return;
    setLoading(true);
    try {
      const res = await api.post(endpoint, rows);
      setResult(res.data);
      toast.success(res.data.message || 'Upload successful');
      queryKeys.forEach(k => qc.invalidateQueries({ queryKey: [k] }));
      reset();
    } catch (err) {
      const msg = err.response?.data?.error || 'Upload failed. Check your CSV and try again.';
      toast.error(msg); setError(msg);
    } finally { setLoading(false); }
  };

  const previewCols = rows.length ? Object.keys(rows[0]) : [];

  return (
    <>
      {showMonthPicker && (
        <MonthPickerModal onConfirm={handleDownloadPayslip} onClose={() => setShowMonthPicker(false)} />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Step 1 — Download */}
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#14532D', marginBottom: 4 }}>
                Step 1 — Download Template
              </div>
              {isEmp ? (
                <div style={{ fontSize: 12, color: '#166534', lineHeight: 1.6 }}>
                  {employees?.length > 0
                    ? <>Template will be pre-filled with your <strong>{employees.length} existing employees</strong>. Update any details and re-upload to make changes.</>
                    : 'No employees yet — template will download with example rows. Fill in your employee details.'}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#166534', lineHeight: 1.6 }}>
                  {employees?.length > 0
                    ? <>Template will be pre-filled with all <strong>{employees.length} employees</strong> for the month you choose.</>
                    : 'Add employees first, then download the payslip template.'}
                </div>
              )}
            </div>
            <button
              onClick={handleDownloadClick}
              disabled={empLoading}
              style={{
                background: '#15803D', color: '#fff', border: 'none',
                padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                cursor: empLoading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0,
                opacity: empLoading ? 0.6 : 1,
              }}
            >
              {empLoading
                ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Loading…</>
                : <><Download size={13} /> {isEmp ? 'Download Employee Master' : 'Download Payslip Template'}</>
              }
            </button>
          </div>

          {/* Employee summary chips */}
          {isEmp && employees?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
              {[...new Set(employees.map(e => e.department).filter(Boolean))].map(d => (
                <span key={d} style={{ fontSize: 11, fontWeight: 600, background: '#fff', border: '1px solid #BBF7D0', color: '#15803D', padding: '2px 9px', borderRadius: 4 }}>
                  {d} ({employees.filter(e => e.department === d).length})
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Step 2 — Upload */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>
            Step 2 — Fill in the template and upload
          </div>
          <div style={{ fontSize: 12, color: '#64748B', marginBottom: 10 }}>
            Open the downloaded CSV in Excel → fill in / update the values → save as CSV → upload below.
          </div>
          <div
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            onClick={() => fileRef.current?.click()}
            style={{
              border: `2px dashed ${file ? '#15803D' : '#CBD5E1'}`,
              borderRadius: 10, padding: '28px 20px', textAlign: 'center',
              cursor: 'pointer', transition: 'all .15s',
              background: file ? '#F0FDF4' : '#FAFAFA',
            }}
            onMouseEnter={e => { if (!file) e.currentTarget.style.borderColor = '#0F4FBF'; e.currentTarget.style.background = '#F8FAFF'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = file ? '#15803D' : '#CBD5E1'; e.currentTarget.style.background = file ? '#F0FDF4' : '#FAFAFA'; }}
          >
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
            {file ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <CheckCircle2 size={20} style={{ color: '#15803D' }} />
                <span style={{ fontSize: 13, fontWeight: 700, color: '#14532D' }}>{file.name}</span>
                <span style={{ fontSize: 12, color: '#64748B' }}>— {rows.length} rows ready</span>
                <button onClick={e => { e.stopPropagation(); reset(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 2 }}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <>
                <Upload size={28} style={{ color: '#CBD5E1', margin: '0 auto 8px' }} />
                <div style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Click to choose file or drag & drop</div>
                <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>CSV files only</div>
              </>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ display: 'flex', gap: 8, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, padding: '10px 14px' }}>
            <AlertCircle size={14} style={{ color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 13, color: '#991B1B' }}>{error}</span>
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: result.skippedReasons?.length ? 8 : 0 }}>
              <CheckCircle2 size={15} style={{ color: '#15803D', flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: 13, color: '#14532D', fontWeight: 600 }}>
                {result.message} — <strong style={{ color: '#15803D' }}>{result.inserted} added</strong>, {result.skipped} skipped
              </span>
            </div>
            {result.skippedReasons?.length > 0 && (
              <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#92400E' }}>
                ⚠ Skipped rows: {result.skippedReasons.slice(0, 5).map(r => `${r.employee_id} (${r.reason})`).join(' · ')}
                {result.skippedReasons.length > 5 && ` …and ${result.skippedReasons.length - 5} more`}
              </div>
            )}
          </div>
        )}

        {/* Preview table */}
        {rows.length > 0 && (
          <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ background: '#F8FAFC', padding: '10px 14px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>
                Preview — {rows.length} row{rows.length > 1 ? 's' : ''} ready to upload
              </span>
              <span style={{ fontSize: 11, color: '#94A3B8' }}>Showing first 5</span>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F8FAFC' }}>
                    {previewCols.map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#475569', whiteSpace: 'nowrap', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      {previewCols.map(h => (
                        <td key={h} style={{ padding: '8px 12px', color: '#334155', whiteSpace: 'nowrap' }}>
                          {row[h] || <span style={{ color: '#CBD5E1' }}>—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Upload button */}
        <button
          onClick={handleUpload}
          disabled={!rows.length || loading || !!error}
          style={{
            width: '100%', padding: '12px', borderRadius: 8, border: 'none',
            background: !rows.length || !!error ? '#E2E8F0' : '#0F4FBF',
            color: !rows.length || !!error ? '#94A3B8' : '#fff',
            fontSize: 14, fontWeight: 700,
            cursor: !rows.length || !!error ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          {loading
            ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Uploading…</>
            : rows.length > 0 ? `Upload ${rows.length} rows` : 'Upload File'
          }
        </button>
      </div>
    </>
  );
}

// ── Column reference panel ────────────────────────────────────────────────────
function ColReference({ type, mode }) {
  const [open, setOpen] = useState(false);
  const isEmp = type === 'employees';
  const colCount = isEmp
    ? (mode === 'detailed' ? 12 : 8)
    : (mode === 'detailed' ? 18 : 5);

  return (
    <div style={{ border: '1px solid #E2E8F0', borderRadius: 10, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{ width: '100%', background: '#F8FAFC', border: 'none', padding: '11px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', borderBottom: open ? '1px solid #E2E8F0' : 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Info size={13} style={{ color: '#0F4FBF' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#1E293B' }}>Column Reference</span>
          <Badge color="gray">{colCount} columns</Badge>
        </div>
        {open ? <ChevronUp size={15} style={{ color: '#64748B' }} /> : <ChevronDown size={15} style={{ color: '#64748B' }} />}
      </button>

      {open && (
        <div style={{ padding: 14 }}>
          {isEmp ? (
            <>
              <ColGroup title="Required" cols={EMP_COLS_REQUIRED} badgeColor="orange" badgeLabel="Required" />
              <ColGroup title="Recommended" cols={EMP_COLS_OPTIONAL} badgeColor="blue" badgeLabel="Optional" />
              {mode === 'detailed' && <ColGroup title="Salary Breakup" cols={EMP_COLS_BREAKUP} badgeColor="purple" badgeLabel="Detailed mode" />}
            </>
          ) : (
            <>
              <ColGroup title="Core Columns" cols={PAY_COLS_REQUIRED} badgeColor="orange" badgeLabel="Required" />
              {mode === 'detailed' && (
                <>
                  <ColGroup title="Earnings" cols={PAY_COLS_EARNINGS} badgeColor="green" badgeLabel="Detailed mode" />
                  <ColGroup title="Deductions" cols={PAY_COLS_DEDUCTIONS} badgeColor="purple" badgeLabel="Detailed mode" />
                </>
              )}
            </>
          )}
          <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 8, padding: '9px 13px', fontSize: 12, color: '#92400E', display: 'flex', gap: 8, marginTop: 8 }}>
            <Info size={12} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>
              {mode === 'detailed'
                ? 'Values you enter appear exactly on the payslip. Blank columns are auto-calculated.'
                : 'In auto mode, just provide gross_salary. All components are calculated when you generate payslips.'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function UploadPage() {
  const [empMode, setEmpMode] = useState('auto');
  const [payMode, setPayMode] = useState('auto');
  const [employees, setEmployees]   = useState([]);
  const [empLoading, setEmpLoading] = useState(true);

  // Fetch employees once on mount — used to pre-fill templates
  useEffect(() => {
    api.get('/employees')
      .then(r => setEmployees(r.data || []))
      .catch(() => setEmployees([]))
      .finally(() => setEmpLoading(false));
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', marginBottom: 4 }}>Import Data</h1>
        <p style={{ fontSize: 14, color: '#64748B' }}>
          Download the pre-filled template, update in Excel, and upload the CSV.
          {employees.length > 0 && <span style={{ color: '#0F4FBF', fontWeight: 600 }}> {employees.length} employees loaded.</span>}
        </p>
      </div>

      <Tabs defaultValue="employees">
        <TabsList className="w-fit">
          <TabsTrigger value="employees"><Users size={13} style={{ marginRight: 6 }} /> Employee Master</TabsTrigger>
          <TabsTrigger value="payslips"><FileText size={13} style={{ marginRight: 6 }} /> Payslip Data</TabsTrigger>
        </TabsList>

        {/* ── EMPLOYEES TAB ─────────────────────────────────────────────── */}
        <TabsContent value="employees" style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Mode */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>Choose upload mode</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <ModeCard mode="auto" selected={empMode} onSelect={setEmpMode} icon="⚡"
                  title="Auto-Calculate (Recommended)"
                  subtitle="Enter gross salary only. System auto-splits into Basic, HRA, Conveyance etc. using your Payroll Config." />
                <ModeCard mode="detailed" selected={empMode} onSelect={setEmpMode} icon="📋"
                  title="Custom Salary Breakup"
                  subtitle="Define each component yourself — Basic Pay, HRA, Conveyance, Special Allowance." />
              </div>
            </div>

            <ColReference type="employees" mode={empMode} />
            <UploadPanel type="employees" mode={empMode} employees={employees} empLoading={empLoading} />
          </div>
        </TabsContent>

        {/* ── PAYSLIPS TAB ──────────────────────────────────────────────── */}
        <TabsContent value="payslips" style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Info */}
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '12px 16px', display: 'flex', gap: 10 }}>
              <Info size={15} style={{ color: '#1D4ED8', flexShrink: 0, marginTop: 2 }} />
              <div style={{ fontSize: 13, color: '#1E3A8A', lineHeight: 1.65 }}>
                <strong>How payslip upload works:</strong> Download the template for a specific month — it's pre-filled with all your employees and their salaries. Fill in any adjustments (bonus, LOP, overtime) and upload. Payslips are generated when you click Generate on the Generate & Send page.
              </div>
            </div>

            {/* Mode */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', marginBottom: 8 }}>Choose upload mode</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <ModeCard mode="auto" selected={payMode} onSelect={setPayMode} icon="⚡"
                  title="Auto-Calculate (Recommended)"
                  subtitle="Upload employee list for a month. System calculates all components automatically when generating payslips." />
                <ModeCard mode="detailed" selected={payMode} onSelect={setPayMode} icon="🧮"
                  title="Full Salary Breakup"
                  subtitle="Upload exact values — Basic, HRA, PF, ESI, TDS, Bonus, LOP, Net Pay. These appear exactly on the payslip." />
              </div>
            </div>

            <ColReference type="payslips" mode={payMode} />
            <UploadPanel type="payslips" mode={payMode} employees={employees} empLoading={empLoading} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
