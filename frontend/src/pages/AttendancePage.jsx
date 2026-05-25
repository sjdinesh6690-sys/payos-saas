/**
 * AttendancePage — Scales to 1000+ employees
 * Three modes:
 *   1. Upload File  — primary for large companies (biometric/any system export)
 *                     Supports: CSV, TSV, TXT, XLSX, XLS
 *   2. All Full     — one click when everyone worked full month
 *   3. Manual Grid  — separate CL / SL / EL inputs with live balance display
 */
import { useState, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Upload, Users, CheckCircle2, RefreshCw, Download,
  AlertCircle, Search, X,
  FileSpreadsheet, Pencil, Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

function calcLOP(wd, pd, cl = 0, sl = 0, el = 0) {
  const absent = Math.max(0, parseInt(wd) - parseInt(pd));
  const leaves = (parseInt(cl) || 0) + (parseInt(sl) || 0) + (parseInt(el) || 0);
  return Math.max(0, absent - leaves);
}

// ── Mode selector card ────────────────────────────────────────────────────────
function ModeCard({ icon: Icon, title, desc, chosen, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 text-left p-5 rounded-2xl border-2 transition-all"
      style={{
        borderColor: chosen ? 'var(--brand)' : 'var(--border-light)',
        background:  chosen ? 'var(--brand-light)' : '#fff',
      }}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: chosen ? 'var(--brand)' : 'var(--border-light)' }}>
          <Icon size={18} style={{ color: chosen ? '#fff' : 'var(--text-muted)' }} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[13.5px] font-bold" style={{ color: 'var(--text-primary)' }}>{title}</p>
            {badge && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">{badge}</span>
            )}
          </div>
          <p className="text-[12px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{desc}</p>
        </div>
      </div>
    </button>
  );
}

// ── Tiny leave balance chip ───────────────────────────────────────────────────
function BalChip({ label, used, available, color }) {
  const remaining = Math.max(0, available - used);
  const isOver    = remaining === 0 && used > 0;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div
        className="w-full text-center border-2 rounded-lg px-1 py-1.5 text-[14px] font-bold focus:outline-none"
        style={{ borderColor: `var(--${color}-200, #c7d2fe)`, background: `var(--${color}-50, #eef2ff)`, color: `var(--${color}-700, #4338ca)` }}
      />
      <span className={`text-[9.5px] font-semibold ${isOver ? 'text-red-500' : 'text-slate-400'}`}>
        {remaining} left / {available} allot
      </span>
    </div>
  );
}

export default function AttendancePage() {
  const qc = useQueryClient();
  const now = new Date();
  const [month, setMonth]   = useState(now.getMonth() + 1);
  const [year,  setYear]    = useState(now.getFullYear());
  const [mode,  setMode]    = useState('upload');
  const [globalWD, setGlobalWD] = useState(26);

  // Upload mode state
  const [csvRows,    setCsvRows]    = useState(null);
  const [uploading,  setUploading]  = useState(false);
  const [dragOver,   setDragOver]   = useState(false);
  const fileRef = useRef(null);

  // Manual mode state
  const [search,     setSearch]     = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [manualRows, setManualRows] = useState(null);

  // Saving state
  const [saving, setSaving] = useState(false);

  // Load employees + policy
  const { data: attData, isLoading: attLoading } = useQuery({
    queryKey: ['attendance', month, year],
    queryFn: () => api.get(`/attendance?month=${month}&year=${year}`).then(r => r.data),
  });

  const employees = attData?.records || [];
  const policy    = attData?.policy;
  const depts     = [...new Set(employees.map(e => e.department).filter(Boolean))];

  // ── Init manual rows ───────────────────────────────────────────────────────
  const initManual = () => {
    if (manualRows) return;
    setManualRows(employees.map(r => ({
      ...r,
      working_days:  r.working_days || globalWD,
      present_days:  r.present_days ?? (r.working_days || globalWD),
      cl:            r.casual_leave  || 0,
      sl:            r.sick_leave    || 0,
      el:            r.earned_leave  || 0,
      lop_days:      r.lop_days      || 0,
      notes:         r.notes         || '',
      // For live balance: available before this month = cl_balance + current saved
      cl_ytd_max:    (policy?.casual_leave_days  || 12) - (r.cl_used_ytd || 0),
      sl_ytd_max:    (policy?.sick_leave_days     || 12) - (r.sl_used_ytd || 0),
      el_ytd_max:    (policy?.earned_leave_days   || 15) - (r.el_used_ytd || 0),
    })));
  };

  // ── File processing (CSV / TSV / TXT / XLSX / XLS) ───────────────────────
  const processFile = useCallback(async (file) => {
    if (!file) return;

    const ext = (file.name.split('.').pop() || '').toLowerCase();
    const allowed = ['csv', 'tsv', 'txt', 'xlsx', 'xls'];
    if (!allowed.includes(ext))
      return toast.error('Unsupported file format. Use CSV, TSV, TXT, XLSX, or XLS.');

    setUploading(true);
    setCsvRows(null);

    try {
      let res;

      if (ext === 'xlsx' || ext === 'xls') {
        // Read as base64, send to parse-excel endpoint
        const buffer    = await file.arrayBuffer();
        const bytes     = new Uint8Array(buffer);
        let   binary    = '';
        for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
        const b64       = btoa(binary);
        res = await api.post('/attendance/parse-excel', {
          fileData: b64, month, year, working_days: globalWD,
        });
      } else {
        // Text-based: CSV, TSV, TXT
        const text = await file.text();
        res = await api.post('/attendance/parse-csv', {
          csv: text, month, year, working_days: globalWD,
        });
      }

      const all = [...res.data.matched, ...res.data.not_in_csv];
      setCsvRows(all);
      const m  = res.data.matched_count;
      const nm = res.data.unmatched?.length || 0;
      toast.success(`Matched ${m} employees${nm > 0 ? ` · ${nm} IDs not found in system` : ''}`);
      if (nm > 0) toast.warning(`${nm} Employee IDs in the file were not found — they will be skipped`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to parse file. Check the format.');
    } finally {
      setUploading(false);
    }
  }, [month, year, globalWD]);

  const onFileInput = (e) => { processFile(e.target.files[0]); e.target.value = ''; };
  const onDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    processFile(e.dataTransfer.files[0]);
  };

  // ── Download template ──────────────────────────────────────────────────────
  const downloadTemplate = async () => {
    try {
      const res = await api.get('/attendance/template-csv', { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a   = document.createElement('a');
      a.href = url; a.download = `PayLeef_Attendance_${month}_${year}.csv`;
      a.click(); URL.revokeObjectURL(url);
    } catch { toast.error('Could not download template'); }
  };

  // ── Save handlers ──────────────────────────────────────────────────────────
  const saveRecords = async (records) => {
    setSaving(true);
    try {
      const res = await api.post('/attendance', { month, year, records });
      toast.success(res.data.message || 'Attendance saved!');
      qc.invalidateQueries({ queryKey: ['attendance'] });
      setCsvRows(null);
      setManualRows(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  };

  const saveUpload = () => {
    if (!csvRows?.length) return;
    const records = csvRows.map(r => ({
      employee_id:  r.employee_id,
      working_days: globalWD,
      present_days: r.present_days,
      casual_leave: r.casual_leave  || 0,
      sick_leave:   r.sick_leave    || 0,
      earned_leave: r.earned_leave  || 0,
      lop_days:     r.lop_days,
      notes:        r.notes || '',
    }));
    saveRecords(records);
  };

  const saveAllFull = async () => {
    const records = employees.map(e => ({
      employee_id:  e.employee_id,
      working_days: globalWD,
      present_days: globalWD,
      casual_leave: 0,
      sick_leave:   0,
      earned_leave: 0,
      lop_days:     0,
      notes:        '',
    }));
    await saveRecords(records);
  };

  const saveManual = () => {
    if (!manualRows) return;
    const records = manualRows.map(r => ({
      employee_id:  r.employee_id,
      working_days: r.working_days || globalWD,
      present_days: parseInt(r.present_days) ?? globalWD,
      casual_leave: parseInt(r.cl)  || 0,
      sick_leave:   parseInt(r.sl)  || 0,
      earned_leave: parseInt(r.el)  || 0,
      lop_days:     r.lop_days,
      notes:        r.notes || '',
    }));
    saveRecords(records);
  };

  // Update manual row — recalc LOP whenever any relevant field changes
  const updateManual = (eid, field, val) => {
    setManualRows(prev => prev.map(r => {
      if (r.employee_id !== eid) return r;
      const updated = { ...r, [field]: val };
      if (['present_days','cl','sl','el','working_days'].includes(field)) {
        updated.lop_days = calcLOP(updated.working_days, updated.present_days, updated.cl, updated.sl, updated.el);
      }
      return updated;
    }));
  };

  const visibleManual = (manualRows || []).filter(r => {
    if (filterDept && r.department !== filterDept) return false;
    if (search && !r.employee_name.toLowerCase().includes(search.toLowerCase())
               && !r.employee_id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const withLOP  = (manualRows || []).filter(r => r.lop_days > 0).length;
  const totalLOP = (manualRows || []).reduce((s, r) => s + (r.lop_days || 0), 0);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">

      {/* ── Header ── */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Attendance</h1>
        <p className="text-[13px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
          Mark attendance for {employees.length} employees · LOP auto-calculated · CL / SL / EL tracked separately
        </p>
      </div>

      {/* ── Month + Working Days ── */}
      <div className="flex items-center gap-4 flex-wrap p-4 rounded-2xl" style={{ background: '#fff', border: '1.5px solid var(--border-light)' }}>
        <div className="flex items-center gap-2">
          <label className="text-[12px] font-semibold" style={{ color: 'var(--text-muted)' }}>Month</label>
          <select value={month} onChange={e => { setMonth(+e.target.value); setCsvRows(null); setManualRows(null); }}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold outline-none">
            {MONTHS.map((n, i) => <option key={i} value={i+1}>{n}</option>)}
          </select>
          <select value={year} onChange={e => { setYear(+e.target.value); setCsvRows(null); setManualRows(null); }}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-semibold outline-none w-24">
            {[2023,2024,2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[12px] font-semibold" style={{ color: 'var(--text-muted)' }}>Working days this month</label>
          <input
            type="number" value={globalWD} min={1} max={31}
            onChange={e => setGlobalWD(+e.target.value)}
            className="w-16 text-center border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-bold outline-none"
          />
        </div>
        {policy && (
          <span className="text-[11px] ml-auto" style={{ color: 'var(--text-muted)' }}>
            Policy: <strong>CL {policy.casual_leave_days}</strong> / <strong>SL {policy.sick_leave_days}</strong> / <strong>EL {policy.earned_leave_days}</strong> days/year
          </span>
        )}
      </div>

      {/* ── Mode selector ── */}
      <div className="flex gap-3 flex-wrap">
        <ModeCard
          icon={FileSpreadsheet} chosen={mode==='upload'} onClick={() => setMode('upload')}
          title="Upload from Biometric / Any System"
          desc="CSV, TSV, TXT, XLSX, XLS — all formats supported"
          badge="Best for large teams"
        />
        <ModeCard
          icon={Zap} chosen={mode==='full'} onClick={() => setMode('full')}
          title="Everyone worked full month"
          desc="All employees present for all working days. No LOP."
        />
        <ModeCard
          icon={Pencil} chosen={mode==='manual'} onClick={() => { setMode('manual'); initManual(); }}
          title="Enter manually"
          desc="CL / SL / EL entries per employee with live leave balance."
        />
      </div>

      {/* ════════════════ MODE: UPLOAD ════════════════ */}
      {mode === 'upload' && (
        <div className="space-y-4">
          {/* Step 1 */}
          <div className="p-4 rounded-2xl" style={{ background: '#fff', border: '1.5px solid var(--border-light)' }}>
            <p className="text-[12px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
              Step 1 — Download our template
            </p>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'var(--brand)' }}
            >
              <Download size={15} /> Download Attendance Template (.csv)
            </button>
            <p className="text-[12px] mt-2" style={{ color: 'var(--text-muted)' }}>
              Template has separate columns: <strong>Present Days · CL · SL · EL · Notes</strong>
            </p>
            <div className="mt-3 p-3 rounded-xl text-[11.5px]" style={{ background: 'var(--bg-warm)' }}>
              <strong>Biometric tip:</strong> If your system exports a report, just match the Employee ID column and fill in Present Days + leave type split. We accept CSV, TSV, TXT, XLSX, and XLS.
            </div>
          </div>

          {/* Step 2 — Upload */}
          <div className="p-4 rounded-2xl" style={{ background: '#fff', border: '1.5px solid var(--border-light)' }}>
            <p className="text-[12px] font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>
              Step 2 — Upload your file
            </p>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              className="flex flex-col items-center justify-center gap-3 rounded-2xl cursor-pointer transition-all"
              style={{
                border: `2px dashed ${dragOver ? 'var(--brand)' : 'var(--border)'}`,
                background: dragOver ? 'var(--brand-light)' : 'var(--bg-warm)',
                padding: '32px 20px',
              }}
            >
              <input ref={fileRef} type="file" accept=".csv,.tsv,.txt,.xlsx,.xls" onChange={onFileInput} style={{ display: 'none' }} />
              {uploading
                ? <><RefreshCw size={24} className="animate-spin" style={{ color: 'var(--brand)' }} /><p className="text-[13px]" style={{ color: 'var(--brand)' }}>Parsing your file…</p></>
                : <>
                    <Upload size={28} style={{ color: 'var(--text-muted)' }} />
                    <p className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                      {dragOver ? 'Drop file here' : 'Drop your file here, or click to browse'}
                    </p>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      Supported: <strong>CSV · TSV · TXT · XLSX · XLS</strong>
                    </p>
                  </>
              }
            </div>
          </div>

          {/* Step 3 — Preview */}
          {csvRows && (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid var(--border-light)' }}>
              <div className="px-5 py-3 flex items-center justify-between" style={{ background: '#fff', borderBottom: '1px solid var(--border-light)' }}>
                <div>
                  <p className="text-[13px] font-bold" style={{ color: 'var(--text-primary)' }}>
                    Step 3 — Review &amp; Confirm
                  </p>
                  <p className="text-[11.5px]" style={{ color: 'var(--text-muted)' }}>
                    {csvRows.length} employees · {csvRows.filter(r => r.lop_days > 0).length} with LOP
                    {csvRows.filter(r => r.not_in_csv).length > 0 && ` · ${csvRows.filter(r => r.not_in_csv).length} not in file (set to full)`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setCsvRows(null)} className="px-3 py-1.5 rounded-lg text-[12px] text-slate-500 hover:bg-slate-100 transition-all">
                    <X size={13} className="inline mr-1" /> Clear
                  </button>
                  <button
                    onClick={saveUpload}
                    disabled={saving}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90"
                    style={{ background: 'var(--brand)' }}
                  >
                    {saving ? <><RefreshCw size={13} className="animate-spin" /> Saving…</> : <><CheckCircle2 size={13} /> Save All {csvRows.length} Records</>}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto" style={{ maxHeight: 400, overflowY: 'auto' }}>
                <table className="w-full text-sm">
                  <thead className="sticky top-0" style={{ background: '#F8FAFC' }}>
                    <tr>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase">Employee</th>
                      <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-green-700 uppercase">Present</th>
                      <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-blue-600 uppercase">CL</th>
                      <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-indigo-600 uppercase">SL</th>
                      <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-purple-600 uppercase">EL</th>
                      <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-red-500 uppercase">LOP</th>
                      <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {csvRows.map(r => (
                      <tr key={r.employee_id} style={{ background: r.not_in_csv ? '#F8FAFC' : r.lop_days > 0 ? '#FFF8F8' : '#fff' }}>
                        <td className="px-4 py-2.5">
                          <p className="font-semibold text-[13px]" style={{ color: 'var(--text-primary)' }}>{r.employee_name}</p>
                          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            {r.employee_id}
                            {r.not_in_csv && <span className="ml-1 text-amber-500 font-semibold">· not in file</span>}
                          </p>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="font-bold text-green-700">{r.present_days}</span>
                          <span className="text-[11px] text-slate-400"> / {globalWD}</span>
                        </td>
                        <td className="px-3 py-2.5 text-center font-semibold text-blue-700">{r.casual_leave || 0}</td>
                        <td className="px-3 py-2.5 text-center font-semibold text-indigo-700">{r.sick_leave || 0}</td>
                        <td className="px-3 py-2.5 text-center font-semibold text-purple-700">{r.earned_leave || 0}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`font-bold ${r.lop_days > 0 ? 'text-red-600' : 'text-green-600'}`}>{r.lop_days}</span>
                        </td>
                        <td className="px-4 py-2.5 text-[11px] text-slate-500">{r.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════ MODE: ALL FULL ════════════════ */}
      {mode === 'full' && (
        <div className="p-8 rounded-2xl text-center" style={{ background: '#fff', border: '1.5px solid var(--border-light)' }}>
          <CheckCircle2 size={48} className="mx-auto mb-4" style={{ color: 'var(--brand)' }} />
          <p className="text-[17px] font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Mark All {employees.length} Employees as Full Attendance
          </p>
          <p className="text-[13px] mb-6" style={{ color: 'var(--text-muted)' }}>
            Everyone will be set to <strong>{globalWD} days present</strong> with 0 LOP for {MONTHS[month-1]} {year}.
          </p>
          <button
            onClick={saveAllFull}
            disabled={saving || employees.length === 0}
            className="flex items-center gap-2 px-8 py-3 rounded-xl text-[14px] font-bold text-white mx-auto transition-all hover:opacity-90 disabled:opacity-50"
            style={{ background: 'var(--brand)' }}
          >
            {saving
              ? <><RefreshCw size={15} className="animate-spin" /> Saving…</>
              : <><CheckCircle2 size={15} /> Confirm Full Attendance for All</>}
          </button>
          {employees.length === 0 && (
            <p className="text-[12px] mt-3 text-amber-600">No employees found. Add employees first.</p>
          )}
        </div>
      )}

      {/* ════════════════ MODE: MANUAL ════════════════ */}
      {mode === 'manual' && (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid var(--border-light)' }}>
          {/* Toolbar */}
          <div className="px-4 py-3 flex items-center gap-3 flex-wrap" style={{ background: '#fff', borderBottom: '1px solid var(--border-light)' }}>
            <div className="relative flex-1 min-w-48">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name or ID…"
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-[13px] outline-none"
              />
            </div>
            {depts.length > 0 && (
              <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-1.5 text-[13px] outline-none">
                <option value="">All Departments</option>
                {depts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            )}
            <div className="flex items-center gap-2 ml-auto text-[12px]" style={{ color: 'var(--text-muted)' }}>
              {withLOP > 0 && <span className="text-red-500 font-semibold">{withLOP} with LOP ({totalLOP} days)</span>}
            </div>
            <button
              onClick={saveManual}
              disabled={saving || !manualRows}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: 'var(--brand)' }}
            >
              {saving ? <><RefreshCw size={13} className="animate-spin" /> Saving…</> : 'Save Attendance'}
            </button>
          </div>

          {/* Legend */}
          <div className="px-4 py-2 flex items-center gap-4 text-[11px] font-semibold" style={{ background: '#F8FAFC', borderBottom: '1px solid var(--border-light)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Leave types:</span>
            <span className="text-blue-700">🔵 CL = Casual Leave</span>
            <span className="text-indigo-700">🟣 SL = Sick Leave</span>
            <span className="text-purple-700">🟤 EL = Earned Leave</span>
            <span className="text-slate-500 ml-auto">Balance shown = remaining days for the year</span>
          </div>

          {attLoading ? (
            <div className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>
              <RefreshCw size={20} className="animate-spin mx-auto mb-2" />Loading employees…
            </div>
          ) : !manualRows || visibleManual.length === 0 ? (
            <div className="py-16 text-center" style={{ color: 'var(--text-muted)' }}>
              {employees.length === 0 ? 'No employees found. Add employees first.' : 'No employees match your search.'}
            </div>
          ) : (
            <div style={{ maxHeight: 560, overflowY: 'auto', overflowX: 'auto' }}>
              <table className="w-full text-sm" style={{ minWidth: 820 }}>
                <thead className="sticky top-0" style={{ background: '#F8FAFC', zIndex: 10 }}>
                  <tr>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase sticky left-0" style={{ background: '#F8FAFC', minWidth: 160 }}>Employee</th>
                    <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-green-700 uppercase w-28">
                      Present Days
                      <div className="text-[9.5px] font-normal text-slate-400 normal-case">of {globalWD}</div>
                    </th>
                    <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-blue-600 uppercase w-28">
                      CL
                      <div className="text-[9.5px] font-normal text-slate-400 normal-case">Casual Leave</div>
                    </th>
                    <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-indigo-600 uppercase w-28">
                      SL
                      <div className="text-[9.5px] font-normal text-slate-400 normal-case">Sick Leave</div>
                    </th>
                    <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-purple-600 uppercase w-28">
                      EL
                      <div className="text-[9.5px] font-normal text-slate-400 normal-case">Earned Leave</div>
                    </th>
                    <th className="px-3 py-2.5 text-center text-[11px] font-semibold text-red-500 uppercase w-24">
                      LOP
                      <div className="text-[9.5px] font-normal text-slate-400 normal-case">auto-calc</div>
                    </th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400 uppercase">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {visibleManual.map(row => {
                    const lop     = row.lop_days;
                    const clLeft  = Math.max(0, (row.cl_ytd_max || 0) - (row.cl || 0));
                    const slLeft  = Math.max(0, (row.sl_ytd_max || 0) - (row.sl || 0));
                    const elLeft  = Math.max(0, (row.el_ytd_max || 0) - (row.el || 0));
                    const clOver  = (row.cl || 0) > (row.cl_ytd_max || 0);
                    const slOver  = (row.sl || 0) > (row.sl_ytd_max || 0);
                    const elOver  = (row.el || 0) > (row.el_ytd_max || 0);

                    return (
                      <tr key={row.employee_id} style={{ background: lop > 0 ? '#FFF8F8' : '#fff' }}>
                        {/* Employee */}
                        <td className="px-4 py-2 sticky left-0" style={{ background: lop > 0 ? '#FFF8F8' : '#fff' }}>
                          <p className="font-semibold text-[13px]" style={{ color: 'var(--text-primary)' }}>{row.employee_name}</p>
                          <p className="text-[10.5px]" style={{ color: 'var(--text-muted)' }}>{row.department || row.employee_id}</p>
                        </td>

                        {/* Present Days */}
                        <td className="px-3 py-2 text-center">
                          <input type="number"
                            value={row.present_days ?? globalWD}
                            onChange={e => updateManual(row.employee_id, 'present_days', +e.target.value)}
                            min={0} max={globalWD}
                            className="w-16 text-center border-2 border-green-200 rounded-lg px-1 py-1.5 text-[14px] font-bold text-green-700 focus:border-green-400 outline-none bg-green-50"
                          />
                        </td>

                        {/* CL — Casual Leave */}
                        <td className="px-3 py-2 text-center">
                          <input type="number"
                            value={row.cl || 0}
                            onChange={e => updateManual(row.employee_id, 'cl', +e.target.value)}
                            min={0}
                            className={`w-16 text-center border-2 rounded-lg px-1 py-1.5 text-[14px] font-bold outline-none ${clOver ? 'border-red-300 bg-red-50 text-red-700 focus:border-red-400' : 'border-blue-200 bg-blue-50 text-blue-700 focus:border-blue-400'}`}
                          />
                          <div className={`text-[9.5px] font-semibold mt-0.5 ${clOver ? 'text-red-500' : 'text-slate-400'}`}>
                            {clOver ? `⚠ over by ${(row.cl || 0) - (row.cl_ytd_max || 0)}` : `${clLeft} left`}
                          </div>
                        </td>

                        {/* SL — Sick Leave */}
                        <td className="px-3 py-2 text-center">
                          <input type="number"
                            value={row.sl || 0}
                            onChange={e => updateManual(row.employee_id, 'sl', +e.target.value)}
                            min={0}
                            className={`w-16 text-center border-2 rounded-lg px-1 py-1.5 text-[14px] font-bold outline-none ${slOver ? 'border-red-300 bg-red-50 text-red-700 focus:border-red-400' : 'border-indigo-200 bg-indigo-50 text-indigo-700 focus:border-indigo-400'}`}
                          />
                          <div className={`text-[9.5px] font-semibold mt-0.5 ${slOver ? 'text-red-500' : 'text-slate-400'}`}>
                            {slOver ? `⚠ over by ${(row.sl || 0) - (row.sl_ytd_max || 0)}` : `${slLeft} left`}
                          </div>
                        </td>

                        {/* EL — Earned Leave */}
                        <td className="px-3 py-2 text-center">
                          <input type="number"
                            value={row.el || 0}
                            onChange={e => updateManual(row.employee_id, 'el', +e.target.value)}
                            min={0}
                            className={`w-16 text-center border-2 rounded-lg px-1 py-1.5 text-[14px] font-bold outline-none ${elOver ? 'border-red-300 bg-red-50 text-red-700 focus:border-red-400' : 'border-purple-200 bg-purple-50 text-purple-700 focus:border-purple-400'}`}
                          />
                          <div className={`text-[9.5px] font-semibold mt-0.5 ${elOver ? 'text-red-500' : 'text-slate-400'}`}>
                            {elOver ? `⚠ over by ${(row.el || 0) - (row.el_ytd_max || 0)}` : `${elLeft} left`}
                          </div>
                        </td>

                        {/* LOP */}
                        <td className="px-3 py-2 text-center">
                          <span className={`inline-block w-14 text-center rounded-lg py-1.5 text-[15px] font-bold border-2 ${lop > 0 ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
                            {lop}
                          </span>
                        </td>

                        {/* Notes */}
                        <td className="px-4 py-2">
                          <input type="text"
                            value={row.notes || ''}
                            onChange={e => updateManual(row.employee_id, 'notes', e.target.value)}
                            placeholder="Optional…"
                            maxLength={100}
                            className="w-full border border-slate-200 rounded-lg px-2 py-1 text-[12px] outline-none"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {manualRows && manualRows.length > 0 && (
            <div className="px-4 py-3 flex items-center justify-between text-[12px]" style={{ background: '#F8FAFC', borderTop: '1px solid var(--border-light)' }}>
              <span style={{ color: 'var(--text-muted)' }}>
                Showing {visibleManual.length} of {manualRows.length} employees
                {withLOP > 0 && <span className="ml-3 text-red-500 font-semibold">· {withLOP} with LOP ({totalLOP} days total)</span>}
              </span>
              <button
                onClick={saveManual}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-[12px] font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                style={{ background: 'var(--brand)' }}
              >
                {saving ? 'Saving…' : `Save ${manualRows.length} Records`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── How LOP works ── */}
      <details className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid var(--border-light)' }}>
        <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer text-[12px] font-semibold select-none"
          style={{ background: '#fff', color: 'var(--text-muted)' }}>
          <AlertCircle size={14} /> How is LOP calculated? (click to expand)
        </summary>
        <div className="px-5 py-4 text-[12.5px] leading-relaxed" style={{ background: 'var(--bg-warm)', color: 'var(--text-secondary)' }}>
          <p><strong>Absent Days</strong> = Working Days − Present Days</p>
          <p className="mt-1"><strong>LOP (Loss of Pay)</strong> = Absent Days − (CL + SL + EL used) — minimum 0</p>
          <p className="mt-2">
            Example: 26 working days, employee came 22 days (4 absent) → took 2 CL + 1 SL = 3 approved leaves → <strong>LOP = 1 day</strong>
          </p>
          <p className="mt-2 text-[12px]" style={{ color: 'var(--text-muted)' }}>
            Leave balances shown are per the policy set in Leave Policy settings. CL/SL/EL are tracked year-to-date so you see remaining balance for each employee.
          </p>
        </div>
      </details>
    </div>
  );
}
