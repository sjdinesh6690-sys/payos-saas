import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import {
  CheckCircle2, AlertCircle, Send, FileText, Users, Mail,
  ChevronLeft, ChevronRight, Search, X, UserMinus, Settings2,
  Plus, Building2, Eye, FileSpreadsheet, Upload, Info, MapPin,
} from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

const MONTHS = ['','January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

function getManualComponents(config) {
  if (!config) return { manualEarnings: [], manualDeductions: [], hasLop: false };
  const manualEarnings   = (config.earnings  || []).filter(c => c.enabled && c.type === 'manual');
  const manualDeductions = (config.deductions || []).filter(c => c.enabled && c.type === 'manual');
  const lopComp          = (config.deductions || []).find(c => c.enabled && c.type === 'lop');
  return { manualEarnings, manualDeductions, hasLop: !!lopComp };
}

// Employee search dropdown
function EmpSearch({ employees, exclude = [], placeholder, onSelect }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const results = q.length >= 1
    ? employees.filter(e =>
        !exclude.includes(e.employee_id) &&
        (e.employee_name.toLowerCase().includes(q.toLowerCase()) ||
         e.employee_id.toLowerCase().includes(q.toLowerCase()) ||
         (e.department || '').toLowerCase().includes(q.toLowerCase()))
      ).slice(0, 8)
    : [];

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          {results.map(e => (
            <button key={e.employee_id} type="button"
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 text-left text-sm transition-colors"
              onMouseDown={() => { onSelect(e); setQ(''); setOpen(false); }}>
              <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                {e.employee_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 truncate">{e.employee_name}</p>
                <p className="text-xs text-slate-400">
                  {e.employee_id}{e.department ? ` · ${e.department}` : ''}
                  {e.status === 'inactive' && <span className="ml-1 text-red-400"> · Left {e.date_of_exit ? e.date_of_exit : ''}</span>}
                </p>
              </div>
              <span className="text-xs text-slate-500 shrink-0">₹{Number(e.salary||0).toLocaleString('en-IN')}</span>
            </button>
          ))}
        </div>
      )}
      {open && q.length >= 1 && results.length === 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg px-4 py-3 text-sm text-slate-400">
          No employees found for "{q}"
        </div>
      )}
    </div>
  );
}

// ── Preview Dialog ────────────────────────────────────────────────────────────
function PreviewDialog({ open, onClose, data, month, year, onApplyAdjustments, onGenerateSelected }) {
  const [localSelected, setLocalSelected] = useState(() => new Set());

  // Initialise all employees as selected whenever preview data changes
  useEffect(() => {
    if (data?.previews) setLocalSelected(new Set(data.previews.map(p => p.employee_id)));
  }, [data]);

  if (!open || !data) return null;
  const { previews = [] } = data;

  const selectedPreviews = previews.filter(p => localSelected.has(p.employee_id));
  const allChecked       = localSelected.size === previews.length;

  const toggleAll = () => {
    setLocalSelected(allChecked ? new Set() : new Set(previews.map(p => p.employee_id)));
  };
  const toggleOne = (empId) => {
    setLocalSelected(prev => {
      const next = new Set(prev);
      next.has(empId) ? next.delete(empId) : next.add(empId);
      return next;
    });
  };

  const totalGross = selectedPreviews.reduce((s, p) => s + (p.gross_salary || 0), 0);
  const totalNet   = selectedPreviews.reduce((s, p) => s + (p.net_salary   || 0), 0);
  const totalDed   = selectedPreviews.reduce((s, p) => s + (p.total_deductions || 0), 0);

  const downloadExcel = () => {
    const rows = previews.map((p, idx) => {
      const earn = p.earnings || {};
      const ded  = p.deductions || {};
      const ec   = p.employer_contributions || {};
      return {
        '#':              idx + 1,
        'Employee ID':    p.employee_id,
        'Employee Name':  p.employee_name,
        'Department':     p.department || '',
        'Status':         p.status === 'inactive' ? `Left (${p.date_of_exit || ''})` : 'Active',
        'Working Days':   p.working_days,
        'Present Days':   p.present_days,
        'LOP Days':       p.lop_days || 0,
        // Earnings
        'Basic (₹)':        Number(earn.basic       || 0),
        'HRA (₹)':          Number(earn.hra         || 0),
        'DA (₹)':           Number(earn.da          || 0),
        'Conveyance (₹)':   Number(earn.conveyance  || 0),
        'Medical (₹)':      Number(earn.medical     || 0),
        'Special (₹)':      Number(earn.special     || 0),
        'Overtime (₹)':     Number(earn.overtime    || 0),
        'Bonus (₹)':        Number(earn.bonus       || 0),
        'Incentive (₹)':    Number(earn.incentive   || 0),
        'Total Earnings (₹)': Number(p.total_earnings || 0),
        'Gross Salary (₹)': Number(p.gross_salary   || 0),
        // Deductions
        'PF Employee (₹)':  Number(ded.pf_employee  || 0),
        'ESI Employee (₹)': Number(ded.esi_employee || 0),
        'Professional Tax (₹)': Number(ded.pt       || 0),
        'TDS (₹)':          Number(ded.tds          || 0),
        'LOP Deduction (₹)': Number(ded.lop         || 0),
        'Total Deductions (₹)': Number(p.total_deductions || 0),
        // Net
        'Net Salary / Take-Home (₹)': Number(p.net_salary || 0),
        // Employer cost
        'PF Employer (₹)':  Number(ec.pf_employer   || 0),
        'ESI Employer (₹)': Number(ec.esi_employer  || 0),
      };
    });

    // Totals row
    rows.push({
      '#': '', 'Employee ID': 'TOTAL', 'Employee Name': `${previews.length} employees`,
      'Department': '', 'Status': '', 'Working Days': '', 'Present Days': '', 'LOP Days': '',
      'Basic (₹)': previews.reduce((s,p)=>s+(p.earnings?.basic||0),0),
      'HRA (₹)': previews.reduce((s,p)=>s+(p.earnings?.hra||0),0),
      'DA (₹)': previews.reduce((s,p)=>s+(p.earnings?.da||0),0),
      'Conveyance (₹)': previews.reduce((s,p)=>s+(p.earnings?.conveyance||0),0),
      'Medical (₹)': previews.reduce((s,p)=>s+(p.earnings?.medical||0),0),
      'Special (₹)': previews.reduce((s,p)=>s+(p.earnings?.special||0),0),
      'Overtime (₹)': previews.reduce((s,p)=>s+(p.earnings?.overtime||0),0),
      'Bonus (₹)': previews.reduce((s,p)=>s+(p.earnings?.bonus||0),0),
      'Incentive (₹)': previews.reduce((s,p)=>s+(p.earnings?.incentive||0),0),
      'Total Earnings (₹)': previews.reduce((s,p)=>s+(p.total_earnings||0),0),
      'Gross Salary (₹)': totalGross,
      'PF Employee (₹)': previews.reduce((s,p)=>s+(p.deductions?.pf_employee||0),0),
      'ESI Employee (₹)': previews.reduce((s,p)=>s+(p.deductions?.esi_employee||0),0),
      'Professional Tax (₹)': previews.reduce((s,p)=>s+(p.deductions?.pt||0),0),
      'TDS (₹)': previews.reduce((s,p)=>s+(p.deductions?.tds||0),0),
      'LOP Deduction (₹)': previews.reduce((s,p)=>s+(p.deductions?.lop||0),0),
      'Total Deductions (₹)': totalDed,
      'Net Salary / Take-Home (₹)': totalNet,
      'PF Employer (₹)': previews.reduce((s,p)=>s+((p.employer_contributions||{}).pf_employer||0),0),
      'ESI Employer (₹)': previews.reduce((s,p)=>s+((p.employer_contributions||{}).esi_employer||0),0),
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [
      {wch:4},{wch:12},{wch:24},{wch:16},{wch:16},{wch:12},{wch:12},{wch:10},
      {wch:12},{wch:10},{wch:10},{wch:13},{wch:11},{wch:11},{wch:11},{wch:10},{wch:11},
      {wch:16},{wch:14},
      {wch:14},{wch:14},{wch:18},{wch:10},{wch:15},{wch:18},
      {wch:22},{wch:13},{wch:13},
    ];

    // Instructions sheet for editing and re-uploading
    const instrData = [
      ['ADJUSTMENT UPLOAD GUIDE'],
      [''],
      ['You can edit LOP Days, Bonus, Overtime, TDS etc in this sheet and re-upload it.'],
      ['Re-upload this file in the "Upload Adjustments from Excel" section on the Generate page.'],
      [''],
      ['Column', 'What you can edit'],
      ['LOP Days', 'Enter number of absent days. System will recalculate proportional deduction.'],
      ['Bonus (₹)', 'One-time bonus amount for this month.'],
      ['Overtime (₹)', 'Overtime pay for this month.'],
      ['Incentive (₹)', 'Incentive / commission for this month.'],
      ['TDS (₹)', 'Manual TDS amount to deduct.'],
      ['Net Salary / Take-Home (₹)', 'DO NOT EDIT — this is calculated by the system.'],
      ['Gross Salary (₹)', 'DO NOT EDIT — this is calculated by the system.'],
    ];
    const instrWs = XLSX.utils.aoa_to_sheet(instrData);
    instrWs['!cols'] = [{wch:30},{wch:60}];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Payroll Preview ${MONTH_SHORT[month]} ${year}`);
    XLSX.utils.book_append_sheet(wb, instrWs, 'How to Edit & Re-upload');

    XLSX.writeFile(wb, `Payroll_Preview_${MONTHS[month]}_${year}.xlsx`);
    toast.success('Excel downloaded — edit and re-upload to apply changes');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const wb    = XLSX.read(ev.target.result, { type: 'binary' });
        const ws    = wb.Sheets[wb.SheetNames[0]];
        const rows  = XLSX.utils.sheet_to_json(ws);
        // Build adjustments from the uploaded rows (exclude TOTAL row)
        const adj = {};
        const overrides = {};
        rows.filter(r => r['Employee ID'] && r['Employee ID'] !== 'TOTAL').forEach(r => {
          const empId = String(r['Employee ID'] || '').trim().toUpperCase();
          if (!empId) return;
          const lopDays = parseFloat(r['LOP Days'] || 0);
          const bonus     = parseFloat(r['Bonus (₹)']      || 0);
          const overtime  = parseFloat(r['Overtime (₹)']   || 0);
          const incentive = parseFloat(r['Incentive (₹)']  || 0);
          const tds       = parseFloat(r['TDS (₹)']        || 0);
          const wp        = parseFloat(r['Working Days']    || 26);

          adj[empId] = {
            present_days: Math.max(0, wp - lopDays),
            ...(bonus     > 0 ? { bonus }     : {}),
            ...(overtime  > 0 ? { overtime }  : {}),
            ...(incentive > 0 ? { incentive } : {}),
            ...(tds       > 0 ? { tds }       : {}),
          };
        });
        onApplyAdjustments(adj, overrides);
        toast.success('Adjustments loaded from Excel — click Preview again to recalculate');
        onClose();
        e.target.value = '';
      } catch (err) {
        toast.error('Could not read Excel file: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.55)', zIndex:1000, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'24px 16px', overflowY:'auto' }}>
      <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:1100, boxShadow:'0 24px 80px rgba(0,0,0,0.25)', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#1E293B,#0F172A)', padding:'20px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h2 style={{ color:'#fff', fontSize:18, fontWeight:700, margin:0 }}>
              📊 Payroll Preview — {MONTHS[month]} {year}
            </h2>
            <p style={{ color:'rgba(255,255,255,0.6)', fontSize:13, margin:'4px 0 0' }}>
              Review each employee's salary · {previews.length} employees total
              {previews.filter(p=>p.status==='inactive').length > 0
                ? ` · ${previews.filter(p=>p.status==='inactive').length} recently-left included`
                : ''}
            </p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.5)' }}>
              {localSelected.size} / {previews.length} selected
            </span>
            <button onClick={onClose} style={{ background:'rgba(255,255,255,0.1)', border:'none', color:'#fff', borderRadius:8, padding:'6px 12px', cursor:'pointer', fontSize:13 }}>✕ Close</button>
          </div>
        </div>

        {/* Instruction banner */}
        <div style={{ background:'#EFF6FF', borderBottom:'1px solid #BFDBFE', padding:'10px 20px', fontSize:12, color:'#1D4ED8' }}>
          ✅ <strong>All employees checked by default.</strong> Uncheck any employee you want to skip → then click <strong>"Generate Payslips"</strong> below.
        </div>

        {/* Summary bar */}
        <div style={{ display:'flex', gap:0, background:'#F8FAFC', borderBottom:'1px solid #E2E8F0' }}>
          {[
            { label:'Selected', value: `${localSelected.size} of ${previews.length}`, color:'#1E293B' },
            { label:'Total Gross', value: fmt(totalGross), color:'#1E293B' },
            { label:'Total Deductions', value: fmt(totalDed), color:'#DC2626' },
            { label:'Total Net Pay', value: fmt(totalNet), color:'#16A34A' },
          ].map((s, i) => (
            <div key={i} style={{ flex:1, padding:'12px 20px', borderRight: i < 3 ? '1px solid #E2E8F0' : 'none' }}>
              <p style={{ fontSize:11, color:'#64748B', margin:0 }}>{s.label}</p>
              <p style={{ fontSize:17, fontWeight:700, color:s.color, margin:'2px 0 0' }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Table */}
        <div style={{ overflowX:'auto', maxHeight:'48vh', overflowY:'auto' }}>
          <table style={{ width:'100%', fontSize:12, borderCollapse:'collapse' }}>
            <thead style={{ position:'sticky', top:0, zIndex:2 }}>
              <tr style={{ background:'#1E293B', color:'#fff' }}>
                {/* Select-all checkbox */}
                <th style={{ padding:'10px 12px', width:36, textAlign:'center' }}>
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    style={{ width:15, height:15, cursor:'pointer', accentColor:'#F97316' }}
                    title={allChecked ? 'Deselect all' : 'Select all'}
                  />
                </th>
                {['#','Employee','Dept','Status','Gross (₹)','Earnings','Deductions','Net Pay (₹)','PF EE','ESI EE','PT','TDS','LOP Days'].map(h => (
                  <th key={h} style={{ padding:'10px 12px', textAlign: h==='#'?'center':'left', fontWeight:600, fontSize:11, whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previews.map((p, idx) => {
                const ded       = p.deductions || {};
                const isLeft    = p.status === 'inactive';
                const isChecked = localSelected.has(p.employee_id);
                return (
                  <tr key={p.employee_id}
                    style={{
                      background: !isChecked ? '#FFF7F7' : idx%2===0?'#fff':'#F8FAFC',
                      borderBottom:'1px solid #F1F5F9',
                      opacity: isChecked ? 1 : 0.55,
                      cursor:'pointer',
                    }}
                    onClick={() => toggleOne(p.employee_id)}
                  >
                    <td style={{ padding:'9px 12px', textAlign:'center' }} onClick={e => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleOne(p.employee_id)}
                        style={{ width:15, height:15, cursor:'pointer', accentColor:'#F97316' }}
                      />
                    </td>
                    <td style={{ padding:'9px 12px', textAlign:'center', color:'#94A3B8' }}>{idx+1}</td>
                    <td style={{ padding:'9px 12px' }}>
                      <p style={{ fontWeight:600, color:'#0F172A', margin:0 }}>{p.employee_name}</p>
                      <p style={{ fontSize:10, color:'#94A3B8', margin:0 }}>{p.employee_id}{p.designation ? ` · ${p.designation}` : ''}</p>
                    </td>
                    <td style={{ padding:'9px 12px', color:'#475569' }}>{p.department || '—'}</td>
                    <td style={{ padding:'9px 12px' }}>
                      {isLeft
                        ? <span style={{ fontSize:10, fontWeight:700, background:'#FEE2E2', color:'#991B1B', padding:'2px 7px', borderRadius:20 }}>LEFT{p.date_of_exit ? ` ${p.date_of_exit}` : ''}</span>
                        : <span style={{ fontSize:10, fontWeight:700, background:'#DCFCE7', color:'#166534', padding:'2px 7px', borderRadius:20 }}>ACTIVE</span>
                      }
                    </td>
                    <td style={{ padding:'9px 12px', textAlign:'right', fontWeight:600, color:'#0F172A' }}>{fmt(p.gross_salary)}</td>
                    <td style={{ padding:'9px 12px', textAlign:'right', color:'#166534' }}>{fmt(p.total_earnings)}</td>
                    <td style={{ padding:'9px 12px', textAlign:'right', color:'#DC2626' }}>{fmt(p.total_deductions)}</td>
                    <td style={{ padding:'9px 12px', textAlign:'right', fontWeight:700, color:'#0F172A', background: isChecked ? '#F0FDF4' : 'transparent' }}>{fmt(p.net_salary)}</td>
                    <td style={{ padding:'9px 12px', textAlign:'right', color:'#64748B', fontSize:11 }}>{fmt(ded.pf_employee)}</td>
                    <td style={{ padding:'9px 12px', textAlign:'right', color:'#64748B', fontSize:11 }}>{fmt(ded.esi_employee)}</td>
                    <td style={{ padding:'9px 12px', textAlign:'right', color:'#64748B', fontSize:11 }}>{fmt(ded.pt)}</td>
                    <td style={{ padding:'9px 12px', textAlign:'right', color:'#64748B', fontSize:11 }}>{fmt(ded.tds)}</td>
                    <td style={{ padding:'9px 12px', textAlign:'center', color: p.lop_days>0?'#DC2626':'#94A3B8', fontWeight: p.lop_days>0?700:400 }}>{p.lop_days || 0}</td>
                  </tr>
                );
              })}
            </tbody>
            {/* Totals */}
            <tfoot>
              <tr style={{ background:'#FFF7ED', borderTop:'2px solid #FCD34D' }}>
                <td colSpan={5} style={{ padding:'10px 12px', fontWeight:700, color:'#92400E', fontSize:12 }}>
                  TOTAL — {localSelected.size} selected ({previews.length - localSelected.size} skipped)
                </td>
                <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:700, color:'#0F172A' }}>{fmt(totalGross)}</td>
                <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:700, color:'#166534' }}>{fmt(selectedPreviews.reduce((s,p)=>s+(p.total_earnings||0),0))}</td>
                <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:700, color:'#DC2626' }}>{fmt(totalDed)}</td>
                <td style={{ padding:'10px 12px', textAlign:'right', fontWeight:700, color:'#166534', background:'#F0FDF4' }}>{fmt(totalNet)}</td>
                <td colSpan={5} />
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Footer actions */}
        <div style={{ padding:'16px 24px', background:'#F8FAFC', borderTop:'1px solid #E2E8F0', display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' }}>

          {/* PRIMARY — Generate selected */}
          <button
            onClick={() => { onGenerateSelected(localSelected); onClose(); }}
            disabled={localSelected.size === 0}
            style={{
              display:'flex', alignItems:'center', gap:7,
              background: localSelected.size === 0 ? '#CBD5E1' : 'linear-gradient(135deg,#F97316,#EA580C)',
              color:'#fff', border:'none', borderRadius:9,
              padding:'10px 22px', fontSize:14, fontWeight:700, cursor: localSelected.size === 0 ? 'not-allowed' : 'pointer',
              boxShadow: localSelected.size === 0 ? 'none' : '0 3px 12px rgba(234,88,12,0.35)',
            }}
          >
            <FileText size={15} />
            🚀 Generate {localSelected.size} Payslips — {MONTHS[month]} {year}
          </button>

          <div style={{ display:'flex', gap:8 }}>
            <button
              onClick={downloadExcel}
              style={{ display:'flex', alignItems:'center', gap:6, background:'#16A34A', color:'#fff', border:'none', borderRadius:9, padding:'9px 16px', fontSize:13, fontWeight:600, cursor:'pointer' }}
            >
              <FileSpreadsheet size={14} /> Download Excel
            </button>

            <label style={{ display:'flex', alignItems:'center', gap:6, background:'#2563EB', color:'#fff', border:'none', borderRadius:9, padding:'9px 16px', fontSize:13, fontWeight:600, cursor:'pointer' }}>
              <Upload size={14} /> Upload Adjusted
              <input type="file" accept=".xlsx,.xls" style={{ display:'none' }} onChange={handleFileUpload} />
            </label>
          </div>

          <span style={{ fontSize:11, color:'#64748B', flex:1 }}>
            💡 Uncheck employees to skip them → Generate only the checked ones
          </span>

          <button onClick={onClose} style={{ background:'none', border:'1px solid #CBD5E1', borderRadius:9, padding:'9px 16px', fontSize:13, cursor:'pointer', color:'#475569' }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main SendPage ─────────────────────────────────────────────────────────────
export default function SendPage() {
  const qc  = useQueryClient();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  const [workingDays, setWorkingDays] = useState(26);
  const [genLoading,  setGenLoading]  = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // Single-employee quick mode
  const [singleEmp, setSingleEmp] = useState(null);
  const [singleLoading, setSingleLoading] = useState(false);

  // Exceptions — only these are stored; everyone else is normal
  const [lopList,         setLopList]         = useState([]);
  const [excludeList,     setExcludeList]     = useState([]);
  const [extrasList,      setExtrasList]       = useState([]);
  const [salaryOverrides, setSalaryOverrides]  = useState([]);

  // Fetch employees who were active DURING the selected month
  // This includes: active employees + inactive employees who left AFTER the selected month
  const { data: employees = [] } = useQuery({
    queryKey: ['employees', 'as_of', month, year],
    queryFn: () => api.get(`/employees?as_of_month=${month}&as_of_year=${year}`).then(r => r.data),
  });

  const { data: allPayslips = [] } = useQuery({
    queryKey: ['payslips'],
    queryFn: () => api.get('/payslips').then(r => r.data),
  });
  const { data: configData } = useQuery({
    queryKey: ['payroll-config'],
    queryFn: () => api.get('/payroll-config').then(r => r.data),
  });

  const config = configData?.config;
  const { manualEarnings, manualDeductions, hasLop } = getManualComponents(config);
  const extraCols = [
    ...manualEarnings.map(c  => ({ key: c.key, label: c.label, type: 'earning' })),
    ...manualDeductions.map(c => ({ key: c.key, label: c.label, type: 'deduction' })),
  ];
  const hasExtras = extraCols.length > 0;

  const thisMonthSlips = allPayslips.filter(
    p => String(p.month) === String(month) && String(p.year) === String(year)
  );
  const emailedCount = thisMonthSlips.filter(p => p.emailed).length;
  const pendingEmail = thisMonthSlips.filter(p => !p.emailed);
  const totalPayroll = thisMonthSlips.reduce((s, p) => s + (Number(p.net_salary || p.salary) || 0), 0);

  const maxMonth = now.getMonth() + 1;
  const maxYear  = now.getFullYear();
  const isFuture = (m, y) => y > maxYear || (y === maxYear && m > maxMonth);

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => {
    const nm = month === 12 ? 1 : month + 1;
    const ny = month === 12 ? year + 1 : year;
    if (isFuture(nm, ny)) { toast.error('Cannot navigate beyond the current month'); return; }
    setMonth(nm); setYear(ny);
  };

  // Derived counts
  const excludedIds   = new Set(excludeList.map(e => e.employee_id));
  const lopIds        = new Set(lopList.map(l => l.emp.employee_id));
  const activeEmps    = employees.filter(e => e.status !== 'inactive');
  const leftEmps      = employees.filter(e => e.status === 'inactive');
  const selectedCount = employees.length - excludeList.length;

  // Department summary
  const deptMap = {};
  employees.forEach(e => {
    const d = e.department || 'No Dept';
    deptMap[d] = (deptMap[d] || 0) + 1;
  });

  // Location summary
  const locMap = {};
  employees.forEach(e => {
    if (e.location) locMap[e.location] = (locMap[e.location] || 0) + 1;
  });

  // Build adjustments object for API
  const buildAdjustments = () => {
    const adj = {};
    lopList.forEach(({ emp, absentDays }) => {
      adj[emp.employee_id] = {
        ...(adj[emp.employee_id] || {}),
        present_days: Math.max(0, workingDays - Number(absentDays || 0)),
      };
    });
    extrasList.forEach(({ emp, ...vals }) => {
      adj[emp.employee_id] = { ...(adj[emp.employee_id] || {}), ...vals };
    });
    return adj;
  };

  const buildSalaryOverrides = () => {
    const overrides = {};
    salaryOverrides.forEach(({ emp, salary }) => {
      if (salary) overrides[emp.employee_id] = Number(salary);
    });
    return overrides;
  };

  // Apply adjustments from Excel re-upload
  const applyAdjustmentsFromExcel = (adj) => {
    // Convert adj object to lopList entries
    const newLopList = [];
    Object.entries(adj).forEach(([empId, empAdj]) => {
      const emp = employees.find(e => e.employee_id === empId);
      if (!emp) return;
      const absentDays = workingDays - (empAdj.present_days || workingDays);
      if (absentDays > 0) newLopList.push({ emp, absentDays: String(absentDays) });
      // Handle extras
      const extraKeys = ['bonus','overtime','incentive','tds'];
      const hasAnyExtra = extraKeys.some(k => empAdj[k] > 0);
      if (hasAnyExtra) {
        const extrasEntry = { emp };
        extraKeys.forEach(k => { if (empAdj[k] > 0) extrasEntry[k] = String(empAdj[k]); });
        setExtrasList(prev => {
          const filtered = prev.filter(e => e.emp.employee_id !== empId);
          return [...filtered, extrasEntry];
        });
      }
    });
    if (newLopList.length > 0) setLopList(newLopList);
  };

  const previewSalaries = async () => {
    setPreviewLoading(true);
    try {
      const selectedIds = employees
        .filter(e => !excludedIds.has(e.employee_id))
        .map(e => e.employee_id);
      const res = await api.post('/payslips/preview', {
        month, year,
        working_days: workingDays,
        adjustments: buildAdjustments(),
        employee_ids: selectedIds,
        salary_overrides: buildSalaryOverrides(),
      });
      setPreviewData(res.data);
      setPreviewOpen(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Preview failed');
    } finally {
      setPreviewLoading(false);
    }
  };

  const generate = async () => {
    if (selectedCount === 0) { toast.error('No employees selected'); return; }
    if (thisMonthSlips.length > 0) {
      const ok = window.confirm(
        `This will overwrite existing payslips for ${MONTHS[month]} ${year}.\n\nContinue?`
      );
      if (!ok) return;
    }
    setGenLoading(true);
    try {
      const selectedIds = employees
        .filter(e => !excludedIds.has(e.employee_id))
        .map(e => e.employee_id);
      await api.post('/payslips/generate', {
        month, year,
        working_days: workingDays,
        adjustments: buildAdjustments(),
        employee_ids: selectedIds,
        salary_overrides: buildSalaryOverrides(),
      });
      toast.success(`Payslips generated for ${selectedIds.length} employees — ${MONTHS[month]} ${year}`);
      qc.invalidateQueries({ queryKey: ['payslips'] });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Generation failed');
    } finally {
      setGenLoading(false);
    }
  };

  // Generate only the employees selected inside the PreviewDialog
  const generateFromPreview = async (selectedEmpIds) => {
    const ids = Array.from(selectedEmpIds);
    if (ids.length === 0) { toast.error('No employees selected in preview'); return; }
    setGenLoading(true);
    try {
      await api.post('/payslips/generate', {
        month, year,
        working_days: workingDays,
        adjustments: buildAdjustments(),
        employee_ids: ids,
        salary_overrides: buildSalaryOverrides(),
      });
      toast.success(`✅ ${ids.length} payslip${ids.length !== 1 ? 's' : ''} generated — ${MONTHS[month]} ${year}`);
      qc.invalidateQueries({ queryKey: ['payslips'] });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Generation failed');
    } finally {
      setGenLoading(false);
    }
  };

  // Generate payslip for a single specific employee
  const generateSingleEmployee = async (emp) => {
    if (!emp) return;
    setSingleLoading(true);
    try {
      await api.post('/payslips/generate', {
        month, year,
        working_days: workingDays,
        adjustments: buildAdjustments(),
        employee_ids: [emp.employee_id],
        salary_overrides: buildSalaryOverrides(),
      });
      toast.success(`✅ Payslip generated for ${emp.employee_name} — ${MONTHS[month]} ${year}`);
      qc.invalidateQueries({ queryKey: ['payslips'] });
      setSingleEmp(null);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Generation failed');
    } finally {
      setSingleLoading(false);
    }
  };

  const sendEmails = async () => {
    if (!pendingEmail.length) { toast('No pending payslips to email'); return; }
    setSendLoading(true);
    try {
      const res = await api.post('/email/send', { month, year });
      toast.success(res.data.message || 'Emails sent');
      qc.invalidateQueries({ queryKey: ['payslips'] });
    } catch (err) {
      toast.error(err.response?.data?.error || err.message || 'Email send failed');
    } finally {
      setSendLoading(false);
    }
  };

  // LOP helpers
  const addLop = (emp) => {
    if (lopIds.has(emp.employee_id)) return;
    setLopList(prev => [...prev, { emp, absentDays: '' }]);
  };
  const removeLop  = (empId) => setLopList(prev => prev.filter(l => l.emp.employee_id !== empId));
  const setLopDays = (empId, val) =>
    setLopList(prev => prev.map(l => l.emp.employee_id === empId ? { ...l, absentDays: val } : l));

  // Exclude helpers
  const addExclude    = (emp) => { if (excludedIds.has(emp.employee_id)) return; setExcludeList(prev => [...prev, emp]); };
  const removeExclude = (empId) => setExcludeList(prev => prev.filter(e => e.employee_id !== empId));

  // Extras helpers
  const extrasIds  = new Set(extrasList.map(e => e.emp.employee_id));
  const addExtras  = (emp) => { if (extrasIds.has(emp.employee_id)) return; setExtrasList(prev => [...prev, { emp }]); };
  const removeExtras = (empId) => setExtrasList(prev => prev.filter(e => e.emp.employee_id !== empId));
  const setExtrasVal = (empId, key, val) =>
    setExtrasList(prev => prev.map(e => e.emp.employee_id === empId ? { ...e, [key]: val } : e));

  // Salary override helpers
  const overrideIds      = new Set(salaryOverrides.map(e => e.emp.employee_id));
  const addOverride      = (emp) => { if (overrideIds.has(emp.employee_id)) return; setSalaryOverrides(prev => [...prev, { emp, salary: emp.salary || '' }]); };
  const removeOverride   = (empId) => setSalaryOverrides(prev => prev.filter(e => e.emp.employee_id !== empId));
  const setOverrideSalary = (empId, val) =>
    setSalaryOverrides(prev => prev.map(e => e.emp.employee_id === empId ? { ...e, salary: val } : e));

  return (
    <div className="p-6 space-y-5">
      <PreviewDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        data={previewData}
        month={month}
        year={year}
        onApplyAdjustments={applyAdjustmentsFromExcel}
        onGenerateSelected={generateFromPreview}
      />

      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold text-white" style={{ background: '#1A7A4A' }}>
            STEP 3 OF 4
          </span>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Generate &amp; Send Payslips</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Select month → Preview salaries → Generate payslips → Email to staff
        </p>
      </div>

      {/* Month selector */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between max-w-xs mx-auto">
            <button type="button" onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
              <ChevronLeft size={20} />
            </button>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">{MONTHS[month]}</p>
              <p className="text-slate-500 text-sm">{year}</p>
            </div>
            <button type="button" onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
              <ChevronRight size={20} />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Employees this month', value: employees.length,          color: 'text-slate-900', sub: leftEmps.length > 0 ? `${leftEmps.length} recently left included` : null },
          { label: 'Will Get Payslip',     value: selectedCount,            color: 'text-green-700', sub: excludeList.length > 0 ? `${excludeList.length} excluded` : null },
          { label: 'Emails Sent',          value: emailedCount,             color: 'text-blue-700'  },
          { label: 'Total Payroll',        value: fmt(totalPayroll),        color: 'text-slate-900' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="py-3 px-4">
              <p className="text-xs text-slate-500">{s.label}</p>
              <p className={`text-xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
              {s.sub && <p className="text-xs text-amber-600 mt-0.5">{s.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Single Employee Quick Run ─────────────────────────────────── */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center shrink-0">
              <Users size={14} />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Generate Payslip for a Single Employee</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Use this to run payroll for just one specific person — useful for re-runs, last-month payslips for employees who left, or new joiners.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[220px]">
              <EmpSearch
                employees={employees}
                exclude={singleEmp ? [] : []}
                placeholder="Search employee name or ID…"
                onSelect={(emp) => setSingleEmp(emp)}
              />
            </div>
            {singleEmp && (
              <div className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-xl px-4 py-2.5 flex-1 min-w-[260px]">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">{singleEmp.employee_name}</p>
                  <p className="text-xs text-slate-500">
                    {singleEmp.employee_id} · ₹{Number(singleEmp.salary||0).toLocaleString('en-IN')}/mo
                    {singleEmp.status === 'inactive' && <span className="ml-1 text-red-500">(Left: {singleEmp.date_of_exit || 'unknown'})</span>}
                  </p>
                </div>
                <button
                  onClick={() => generateSingleEmployee(singleEmp)}
                  disabled={singleLoading}
                  style={{
                    background: singleLoading ? '#CBD5E1' : 'linear-gradient(135deg,#7C3AED,#6D28D9)',
                    color:'#fff', border:'none', borderRadius:9,
                    padding:'8px 16px', fontSize:13, fontWeight:700,
                    cursor: singleLoading ? 'not-allowed' : 'pointer',
                    whiteSpace:'nowrap',
                  }}
                >
                  {singleLoading ? '⏳ Generating…' : `🚀 Generate for ${singleEmp.employee_name.split(' ')[0]} — ${MONTHS[month]} ${year}`}
                </button>
                <button onClick={() => setSingleEmp(null)}
                  className="p-1.5 rounded-lg hover:bg-purple-100 text-purple-400 hover:text-purple-600">
                  <X size={14} />
                </button>
              </div>
            )}
            {!singleEmp && (
              <p className="text-xs text-slate-400">← Search to pick an employee, then generate for that person only</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recently left employee notice */}
      {leftEmps.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 space-y-2">
          <div className="flex items-start gap-2">
            <Info size={15} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-amber-800">
              {leftEmps.length} recently-left employee{leftEmps.length > 1 ? 's' : ''} automatically included for {MONTHS[month]} {year}
            </p>
          </div>
          <div className="space-y-1.5 pl-5">
            {leftEmps.map(e => (
              <div key={e.employee_id} className="flex items-center gap-3 text-xs text-amber-700 bg-amber-100 rounded-lg px-3 py-2">
                <span className="font-semibold">{e.employee_name}</span>
                <span className="text-amber-500">Left: {e.date_of_exit || 'unknown'}</span>
                <span className="flex-1 text-amber-500">— included because they were active during {MONTHS[month]} {year}</span>
                <span className="text-amber-600 font-medium">Use ⛔ Skip below to exclude them</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-600 pl-5">
            💡 Need a payslip for a <strong>past month</strong> (e.g. their last month before leaving)?
            Use the <strong>Single Employee</strong> card above — select the employee, navigate to the correct past month using ← → arrows at the top, then generate.
          </p>
        </div>
      )}

      {/* Step 1 — Generate */}
      <Card>
        <CardContent className="py-5 space-y-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center shrink-0">1</div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900">Set Up Payroll</p>
              <p className="text-sm text-slate-500 mt-0.5">
                All employees active in {MONTHS[month]} {year} are included by default.
                Only action the exceptions below if any employee has absent days, bonus, or should be skipped.
                {thisMonthSlips.length > 0 && <span className="text-amber-600 ml-1">({thisMonthSlips.length} already generated — will overwrite if you generate again.)</span>}
              </p>
            </div>
            {thisMonthSlips.length > 0 && <Badge className="bg-green-100 text-green-700 border-green-200 ml-auto shrink-0">Done</Badge>}
          </div>

          {employees.length === 0 && (
            <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <AlertCircle size={15} /> No employees found for {MONTHS[month]} {year}. Add employees first.
            </div>
          )}

          {employees.length > 0 && (
            <>
              {/* Working days + summary */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-slate-700 whitespace-nowrap">Working Days in {MONTHS[month]}:</label>
                    <Input
                      type="number"
                      value={workingDays}
                      onChange={e => setWorkingDays(parseInt(e.target.value) || 26)}
                      className="h-8 w-20 text-sm"
                      min={1} max={31}
                    />
                    <span className="text-xs text-slate-400">(adjust for this month's actual working days)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-green-700 font-medium bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
                    <CheckCircle2 size={14} />
                    {selectedCount} employees included
                    {excludeList.length > 0 && <span className="text-red-500 ml-1">· {excludeList.length} excluded</span>}
                    {lopList.length > 0 && <span className="text-amber-600 ml-1">· {lopList.length} with LOP</span>}
                  </div>
                </div>
                {/* Department chips */}
                <div className="flex flex-wrap gap-2">
                  {Object.entries(deptMap).map(([dept, count]) => (
                    <span key={dept} className="inline-flex items-center gap-1.5 text-xs bg-white border border-slate-200 rounded-full px-2.5 py-1 text-slate-600">
                      <Building2 size={10} className="text-slate-400" />
                      {dept} <span className="font-semibold text-slate-800">{count}</span>
                    </span>
                  ))}
                </div>
                {/* Location chips */}
                {Object.keys(locMap).length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(locMap).map(([loc, count]) => (
                      <span key={loc} className="inline-flex items-center gap-1.5 text-xs bg-green-50 border border-green-200 rounded-full px-2.5 py-1 text-green-700">
                        <MapPin size={10} className="text-green-400" />
                        {loc} <span className="font-semibold">{count}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION A — LOP */}
              {hasLop && (
                <div className="rounded-xl border border-red-100 overflow-hidden">
                  <div className="bg-red-50 px-4 py-3 border-b border-red-100">
                    <p className="text-sm font-semibold text-red-800">🔴 LOP — Mark Absent Days</p>
                    <p className="text-xs text-red-600 mt-0.5">
                      Only add employees who were absent. Leave everyone else — they get full salary.
                      System automatically calculates proportional deduction: (absent days ÷ working days) × gross salary.
                    </p>
                  </div>
                  <div className="p-4 space-y-3">
                    <EmpSearch
                      employees={employees}
                      exclude={[...lopIds, ...excludedIds]}
                      placeholder="Search employee name or ID to mark absent days…"
                      onSelect={addLop}
                    />
                    {lopList.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-2">No LOP marked — all employees at full attendance</p>
                    )}
                    {lopList.length > 0 && (
                      <div className="space-y-2">
                        {lopList.map(({ emp, absentDays }) => {
                          const present = absentDays !== '' ? Math.max(0, workingDays - Number(absentDays)) : workingDays;
                          return (
                            <div key={emp.employee_id}
                              className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800 truncate">{emp.employee_name}</p>
                                <p className="text-xs text-slate-500">{emp.employee_id}{emp.department ? ` · ${emp.department}` : ''}
                                  {emp.status === 'inactive' && <span className="ml-1 text-red-400">(Left)</span>}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <div className="text-right">
                                  <label className="text-xs text-slate-500 block">Absent Days</label>
                                  <Input
                                    type="number"
                                    value={absentDays}
                                    onChange={e => setLopDays(emp.employee_id, e.target.value)}
                                    className="h-8 w-20 text-sm text-center border-red-300 bg-white"
                                    min={0} max={workingDays} placeholder="0"
                                  />
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-slate-400">Present</p>
                                  <p className="text-sm font-bold text-slate-700">{present} days</p>
                                </div>
                                <button type="button" onClick={() => removeLop(emp.employee_id)}
                                  className="p-1.5 rounded-lg hover:bg-red-200 text-red-400 hover:text-red-600 transition-colors">
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION B — Exclude */}
              <div className="rounded-xl border border-amber-100 overflow-hidden">
                <div className="bg-amber-50 px-4 py-3 border-b border-amber-100">
                  <p className="text-sm font-semibold text-amber-800">⛔ Skip Employees — Don't generate payslip for these</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    Use this for: new joiner paid from mid-month separately, employee on unpaid leave, or if you want to hold a payslip.
                    Excluded employees will not appear in the generated list.
                  </p>
                </div>
                <div className="p-4 space-y-3">
                  <EmpSearch
                    employees={employees}
                    exclude={[...excludedIds]}
                    placeholder="Search to exclude an employee from this month's payroll…"
                    onSelect={addExclude}
                  />
                  {excludeList.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-2">No exclusions — all employees included</p>
                  )}
                  {excludeList.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {excludeList.map(emp => (
                        <div key={emp.employee_id}
                          className="flex items-center gap-2 bg-amber-100 border border-amber-200 rounded-full pl-3 pr-2 py-1.5">
                          <div>
                            <p className="text-xs font-semibold text-amber-900">{emp.employee_name}</p>
                            <p className="text-xs text-amber-600">{emp.employee_id}</p>
                          </div>
                          <button type="button" onClick={() => removeExclude(emp.employee_id)}
                            className="w-5 h-5 rounded-full bg-amber-200 hover:bg-amber-300 flex items-center justify-center text-amber-700 transition-colors">
                            <X size={11} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION C — Extras */}
              {hasExtras && (
                <div className="rounded-xl border border-orange-100 overflow-hidden">
                  <div className="bg-orange-50 px-4 py-3 border-b border-orange-100">
                    <p className="text-sm font-semibold text-orange-800">
                      <Settings2 size={14} className="inline mr-1.5" />
                      Extra Earnings / Deductions — Bonus, Overtime, Incentive, TDS
                    </p>
                    <p className="text-xs text-orange-600 mt-0.5">
                      Add this only for employees who have extra earnings or special deductions this month.
                    </p>
                  </div>
                  <div className="p-4 space-y-3">
                    <EmpSearch
                      employees={employees}
                      exclude={[...extrasIds]}
                      placeholder="Search employee to add bonus / overtime / TDS…"
                      onSelect={addExtras}
                    />
                    {extrasList.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-2">No extra adjustments this month</p>
                    )}
                    {extrasList.length > 0 && (
                      <div className="space-y-2">
                        {extrasList.map(item => (
                          <div key={item.emp.employee_id}
                            className="flex flex-wrap items-center gap-3 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2.5">
                            <div className="min-w-[140px]">
                              <p className="text-sm font-medium text-slate-800">{item.emp.employee_name}</p>
                              <p className="text-xs text-slate-500">{item.emp.employee_id}</p>
                            </div>
                            {extraCols.map(col => (
                              <div key={col.key} className="text-center">
                                <label className="text-xs text-slate-500 block">{col.label} (₹)</label>
                                <Input
                                  type="number"
                                  value={item[col.key] || ''}
                                  onChange={e => setExtrasVal(item.emp.employee_id, col.key, e.target.value)}
                                  className="h-8 w-24 text-sm text-center"
                                  placeholder="0" min={0}
                                />
                              </div>
                            ))}
                            <button type="button" onClick={() => removeExtras(item.emp.employee_id)}
                              className="p-1.5 rounded-lg hover:bg-orange-200 text-orange-400 hover:text-orange-600 ml-auto">
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SECTION D — Salary Override */}
              <div className="rounded-xl border border-purple-100 overflow-hidden">
                <div className="bg-purple-50 px-4 py-3 border-b border-purple-100">
                  <p className="text-sm font-semibold text-purple-800">💰 Different Salary This Month?</p>
                  <p className="text-xs text-purple-600 mt-0.5">
                    Use for retroactive payslips where the employee was paid a different amount that month.
                    Leave blank unless the salary was actually different — system uses master salary by default.
                  </p>
                </div>
                <div className="p-4 space-y-3">
                  <EmpSearch
                    employees={employees}
                    exclude={[...overrideIds, ...excludedIds]}
                    placeholder="Search employee to enter a different salary for this month…"
                    onSelect={addOverride}
                  />
                  {salaryOverrides.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-2">No overrides — all employees use master salary</p>
                  )}
                  {salaryOverrides.length > 0 && (
                    <div className="space-y-2">
                      {salaryOverrides.map(({ emp, salary }) => (
                        <div key={emp.employee_id}
                          className="flex items-center gap-3 bg-purple-50 border border-purple-200 rounded-lg px-3 py-2.5">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{emp.employee_name}</p>
                            <p className="text-xs text-slate-500">
                              {emp.employee_id} · Master salary: ₹{Number(emp.salary||0).toLocaleString('en-IN')}/mo
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <label className="text-xs text-slate-500 block mb-1">Gross Salary for this month (₹)</label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">₹</span>
                              <Input
                                type="number"
                                value={salary}
                                onChange={e => setOverrideSalary(emp.employee_id, e.target.value)}
                                className="h-8 w-36 text-sm pl-6 text-right border-purple-300 bg-white"
                                placeholder="e.g. 25000" min={0}
                              />
                            </div>
                          </div>
                          <button type="button" onClick={() => removeOverride(emp.employee_id)}
                            className="p-1.5 rounded-lg hover:bg-purple-200 text-purple-400 hover:text-purple-600 transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Summary before generate */}
              <div className="rounded-xl border-2 border-slate-800 bg-slate-900 text-white p-4">
                <p className="text-sm font-semibold mb-2">📋 Summary — {MONTHS[month]} {year}</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-400">{selectedCount}</p>
                    <p className="text-xs text-slate-400">Will get payslip</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-400">{lopList.length}</p>
                    <p className="text-xs text-slate-400">With LOP / absent days</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-400">{excludeList.length}</p>
                    <p className="text-xs text-slate-400">Excluded this month</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-blue-400">{extrasList.length}</p>
                    <p className="text-xs text-slate-400">With bonus / overtime</p>
                  </div>
                </div>
                {leftEmps.length > 0 && (
                  <p className="text-xs text-amber-400 mt-3 text-center">
                    ⚠ {leftEmps.filter(e => !excludedIds.has(e.employee_id)).length} recently-left employee(s) included — generating payslip for their last working month.
                  </p>
                )}
              </div>

              {/* Preview + Generate buttons */}
              <div className="flex flex-col gap-3">
                {/* Preview button */}
                <button
                  onClick={previewSalaries}
                  disabled={previewLoading || selectedCount === 0}
                  style={{
                    width: '100%',
                    padding: '12px 20px',
                    background: previewLoading || selectedCount === 0 ? '#F1F5F9' : 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                    color: previewLoading || selectedCount === 0 ? '#94A3B8' : '#fff',
                    border: '2px solid ' + (previewLoading || selectedCount === 0 ? '#E2E8F0' : '#1D4ED8'),
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: previewLoading || selectedCount === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Eye size={17} />
                  {previewLoading ? '⏳ Calculating preview…' : `📊 Preview Salaries — See breakdown before generating`}
                </button>

                {/* Generate button */}
                <button
                  onClick={generate}
                  disabled={genLoading || selectedCount === 0}
                  style={{
                    width: '100%',
                    padding: '14px 20px',
                    background: genLoading || selectedCount === 0 ? '#CBD5E1' : 'linear-gradient(135deg, #F97316, #EA580C)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 12,
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: genLoading || selectedCount === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    boxShadow: genLoading || selectedCount === 0 ? 'none' : '0 4px 14px rgba(234,88,12,0.35)',
                    transition: 'all 0.15s ease',
                    letterSpacing: '0.01em',
                  }}
                  onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = 'linear-gradient(135deg, #EA580C, #C2410C)'; }}
                  onMouseLeave={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = 'linear-gradient(135deg, #F97316, #EA580C)'; }}
                >
                  <FileText size={18} />
                  {genLoading
                    ? '⏳ Generating Payslips…'
                    : selectedCount === 0
                      ? 'No employees selected'
                      : `🚀 Generate ${selectedCount} Payslips — ${MONTHS[month]} ${year}`}
                </button>
                <p className="text-xs text-center text-slate-400">
                  💡 Tip: Preview first to review salary breakdown, then generate. You can regenerate to correct mistakes.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Step 2 — Send Emails */}
      <Card>
        <CardContent className="py-5 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 text-sm font-bold flex items-center justify-center shrink-0">2</div>
            <div className="flex-1">
              <p className="font-semibold text-slate-900">Send Payslips by Email</p>
              <p className="text-sm text-slate-500 mt-0.5">
                {pendingEmail.length > 0
                  ? `${pendingEmail.length} payslip${pendingEmail.length > 1 ? 's' : ''} ready to email. Each employee gets a PDF of their payslip.`
                  : emailedCount > 0 ? 'All emails sent for this month.' : 'Generate payslips first (Step 1), then send emails.'}
              </p>
            </div>
            {emailedCount > 0 && emailedCount === thisMonthSlips.length && (
              <Badge className="bg-green-100 text-green-700 border-green-200 shrink-0">All Sent</Badge>
            )}
          </div>

          {thisMonthSlips.length > 0 && (
            <div className="rounded-lg border border-slate-100 overflow-hidden max-h-56 overflow-y-auto">
              <div className="bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 border-b border-slate-100">
                {MONTHS[month]} {year} — {thisMonthSlips.length} payslips generated
              </div>
              {thisMonthSlips.map(p => (
                <div key={p.id} className="px-4 py-2 flex items-center justify-between text-sm border-b border-slate-50 last:border-0">
                  <div>
                    <span className="font-medium text-slate-800">{p.employee_name}</span>
                    <span className="text-slate-400 ml-2 text-xs">{p.employee_id}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right text-xs">
                      <p className="font-semibold text-slate-700">{fmt(p.net_salary || p.salary)}</p>
                      {p.lop_days > 0 && <p className="text-red-500">LOP: {p.lop_days}d</p>}
                    </div>
                    {p.emailed
                      ? <Badge className="bg-green-100 text-green-700 border-green-200 text-xs"><CheckCircle2 size={10} className="mr-1" />Sent</Badge>
                      : <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-xs">Pending</Badge>
                    }
                  </div>
                </div>
              ))}
            </div>
          )}

          <Button
            onClick={sendEmails}
            disabled={sendLoading || thisMonthSlips.length === 0 || pendingEmail.length === 0}
            className="w-full bg-green-600 hover:bg-green-700 text-white h-10"
          >
            <Mail size={15} className="mr-2" />
            {sendLoading ? 'Sending…' : `Send ${pendingEmail.length || ''} Emails — ${MONTHS[month]} ${year}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
