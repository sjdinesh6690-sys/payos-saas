import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Download, ChevronDown, CheckCircle2, AlertCircle,
  Clock, Users, X, Save, Info, Settings,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const INR = (n) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

// ── Financial year helpers ────────────────────────────────────────────────────
function getFinancialYears() {
  const now  = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  // Current FY start year
  const curFYStart = month >= 4 ? year : year - 1;
  const fys = [];
  for (let y = curFYStart; y >= curFYStart - 4; y--) {
    fys.push(`${y}-${String(y + 1).slice(-2)}`);
  }
  return fys;
}

// ── Declaration Dialog ────────────────────────────────────────────────────────
function DeclarationDialog({ employee, fy, onClose, onSaved }) {
  const [form, setForm] = useState({
    tax_regime:       employee.declarations?.tax_regime       || 'new',
    hra_exemption:    employee.declarations?.hra_exemption    || '',
    other_section10:  employee.declarations?.other_section10  || '',
    investment_80c:   employee.declarations?.investment_80c   || '',
    mediclaim_80d:    employee.declarations?.mediclaim_80d    || '',
    other_deductions: employee.declarations?.other_deductions || '',
    tds_override:     employee.declarations?.tds_override     || '',
    tan:              employee.declarations?.tan              || '',
    company_pan:      employee.declarations?.company_pan      || '',
  });
  const [saving, setSaving] = useState(false);

  const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/form16/declarations', {
        employee_id:   employee.employee_id,
        financial_year: fy,
        ...form,
      });
      toast.success(`Declarations saved for ${employee.employee_name}`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div
        className="relative rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto"
        style={{ background: 'var(--bg-main)', border: '1px solid var(--border-light)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border-light)' }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Tax Declarations — {employee.employee_name}
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              F.Y. {fy} · Employee ID: {employee.employee_id}
              {employee.pan_number && ` · PAN: ${employee.pan_number}`}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">

          {/* Employer TAN / PAN */}
          <div className="rounded-xl p-4 space-y-3" style={{ background: '#EFF4FB', border: '1px solid #BFDBFE' }}>
            <p className="text-xs font-bold text-blue-900 flex items-center gap-1">
              <Settings size={12} /> Employer Details (one-time setup)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">TAN Number</label>
                <Input value={form.tan} onChange={e => upd('tan', e.target.value.toUpperCase())}
                  placeholder="e.g. CHEN12345A" className="h-8 text-sm font-mono" maxLength={10} />
                <p className="text-[10px] text-slate-400 mt-1">10-character Tax Deduction Account Number</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company PAN</label>
                <Input value={form.company_pan} onChange={e => upd('company_pan', e.target.value.toUpperCase())}
                  placeholder="e.g. ABCDE1234F" className="h-8 text-sm font-mono" maxLength={10} />
                <p className="text-[10px] text-slate-400 mt-1">Permanent Account Number of the company</p>
              </div>
            </div>
          </div>

          {/* Tax Regime */}
          <div>
            <label className="block text-xs font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Tax Regime (F.Y. {fy})
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'new',  label: 'New Regime', desc: 'Standard deduction ₹75,000. No 80C/80D. Default from FY 2024-25.', tag: 'Recommended' },
                { id: 'old',  label: 'Old Regime', desc: 'Standard deduction ₹50,000. Allows 80C, 80D, HRA & other deductions.', tag: '' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => upd('tax_regime', opt.id)}
                  className={`text-left p-3 rounded-xl border-2 transition-all ${
                    form.tax_regime === opt.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-slate-800">{opt.label}</p>
                    {opt.tag && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">{opt.tag}</span>}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Exemptions — always shown */}
          <div className="space-y-3">
            <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
              Section 10 Exemptions
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  HRA Exemption u/s 10(13A) (₹)
                </label>
                <Input type="number" value={form.hra_exemption}
                  onChange={e => upd('hra_exemption', e.target.value)}
                  placeholder="0" className="h-8 text-sm" />
                <p className="text-[10px] text-slate-400 mt-1">
                  Enter the HRA exempt amount based on rent paid by employee
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Other Sec 10 Exemptions — LTA etc. (₹)
                </label>
                <Input type="number" value={form.other_section10}
                  onChange={e => upd('other_section10', e.target.value)}
                  placeholder="0" className="h-8 text-sm" />
              </div>
            </div>
          </div>

          {/* Chapter VI-A — only for old regime */}
          {form.tax_regime === 'old' && (
            <div className="rounded-xl p-4 space-y-3" style={{ background: '#FFFBEB', border: '1px solid #FCD34D' }}>
              <p className="text-xs font-bold text-amber-800 flex items-center gap-1">
                <Info size={12} /> Chapter VI-A Deductions (Old Regime Only)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    80C Investments (₹) — Max ₹1,50,000
                  </label>
                  <Input type="number" value={form.investment_80c}
                    onChange={e => upd('investment_80c', e.target.value)}
                    placeholder="0" className="h-8 text-sm" />
                  <p className="text-[10px] text-slate-400 mt-1">LIC, PPF, ELSS, home loan principal, etc. PF auto-included.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    80D Medical Insurance (₹)
                  </label>
                  <Input type="number" value={form.mediclaim_80d}
                    onChange={e => upd('mediclaim_80d', e.target.value)}
                    placeholder="0" className="h-8 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Other Deductions — 80G, 80E, 80TTA (₹)
                  </label>
                  <Input type="number" value={form.other_deductions}
                    onChange={e => upd('other_deductions', e.target.value)}
                    placeholder="0" className="h-8 text-sm" />
                </div>
              </div>
            </div>
          )}

          {/* TDS Override */}
          <div>
            <label className="block text-xs font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              TDS Deducted (₹) — Override
            </label>
            <Input type="number" value={form.tds_override}
              onChange={e => upd('tds_override', e.target.value)}
              placeholder={`Leave blank to use TDS from payslips (${INR(employee.tds_from_slips || 0)})`}
              className="h-9 text-sm" />
            <p className="text-[10px] text-slate-400 mt-1">
              Only fill if the TDS amount differs from what's in payslips.
              Auto-value from payslips: <strong>{INR(employee.tds_from_slips || 0)}</strong>
            </p>
          </div>

          {!employee.pan_number && (
            <div className="flex items-start gap-2 rounded-xl p-3" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
              <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">
                <strong>PAN missing!</strong> The employee's PAN number is not in the system.
                Please update it in <strong>Employees → Edit</strong> before issuing Form 16.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 pb-5">
          <Button variant="outline" onClick={onClose} className="h-9 text-sm">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="h-9 text-sm bg-blue-600 hover:bg-blue-700 text-white">
            <Save size={14} className="mr-1.5" />
            {saving ? 'Saving…' : 'Save Declarations'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function Form16Page() {
  const qc = useQueryClient();
  const [fy, setFY] = useState(() => {
    const now = new Date();
    const m = now.getMonth() + 1;
    const y = now.getFullYear();
    const start = m >= 4 ? y : y - 1;
    return `${start}-${String(start + 1).slice(-2)}`;
  });
  const [editEmp, setEditEmp]       = useState(null);
  const [downloading, setDownloading] = useState({});
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [search, setSearch]           = useState('');

  const FYS = getFinancialYears();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['form16', fy],
    queryFn:  () => api.get(`/form16?fy=${fy}`).then(r => r.data),
    staleTime: 0,
  });

  const employees  = data?.employees || [];
  const filtered   = employees.filter(e =>
    e.employee_name.toLowerCase().includes(search.toLowerCase()) ||
    e.employee_id.toLowerCase().includes(search.toLowerCase())
  );

  const canGenerateCount = employees.filter(e => e.can_generate).length;
  const declarationCount = employees.filter(e => e.has_declaration).length;

  const handleDownload = async (emp) => {
    setDownloading(d => ({ ...d, [emp.employee_id]: true }));
    try {
      const res = await api.get(`/form16/download/${emp.employee_id}?fy=${fy}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Form16_PartB_${emp.employee_id}_FY${fy}.pdf`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`Form 16 downloaded for ${emp.employee_name}`);
    } catch (err) {
      const msg = err.response?.data?.error || 'Download failed';
      toast.error(msg);
    } finally {
      setDownloading(d => ({ ...d, [emp.employee_id]: false }));
    }
  };

  const handleBulkDownload = async () => {
    setBulkDownloading(true);
    try {
      const res = await api.get(`/form16/download-all?fy=${fy}`, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Form16_PartB_FY${fy}.zip`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('All Form 16s downloaded as ZIP');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Bulk download failed');
    } finally {
      setBulkDownloading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Form 16 Part B</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Generate and download Form 16 Part B for all employees. Covers annual salary, exemptions, and tax computation.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {/* FY selector */}
          <div className="relative">
            <select
              value={fy}
              onChange={e => setFY(e.target.value)}
              className="h-10 pl-3 pr-8 rounded-xl border text-sm font-medium appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ background: 'var(--bg-main)', borderColor: 'var(--border-light)', color: 'var(--text-primary)' }}
            >
              {FYS.map(f => (
                <option key={f} value={f}>F.Y. {f} (A.Y. {f.split('-')[0] * 1 + 1}-{String(f.split('-')[0] * 1 + 2).slice(-2)})</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-3.5 text-slate-400 pointer-events-none" />
          </div>
          <Button
            onClick={handleBulkDownload}
            disabled={bulkDownloading || canGenerateCount === 0}
            className="h-10 text-sm bg-blue-700 hover:bg-blue-800 text-white"
          >
            <Download size={15} className="mr-2" />
            {bulkDownloading ? 'Preparing ZIP…' : `Download All (ZIP)`}
          </Button>
        </div>
      </div>

      {/* ── Info banner ── */}
      <div className="flex items-start gap-3 rounded-xl px-4 py-3" style={{ background: '#EFF4FB', border: '1px solid #BFDBFE' }}>
        <Info size={15} className="text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <strong>How it works:</strong> Form 16 Part B is generated from your monthly payslip data.
          Click <strong>Edit Declarations</strong> to enter each employee's HRA exemption, investment declarations (80C, 80D),
          and tax regime. Then click <strong>Download PDF</strong> to get the Form 16.
          Form 16 <strong>Part A</strong> must be downloaded from the TRACES portal separately.
        </div>
      </div>

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Employees', value: employees.length, icon: Users, color: '#1B3F72', bg: '#EFF4FB' },
          { label: 'Payslip Data Available', value: canGenerateCount, icon: CheckCircle2, color: '#166534', bg: '#DCFCE7' },
          { label: 'Declarations Saved', value: declarationCount, icon: FileText, color: '#D97706', bg: '#FFFBEB' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="rounded-2xl p-4" style={{ background: 'var(--bg-main)', border: '1.5px solid var(--border-light)' }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-2" style={{ background: bg }}>
              <Icon size={15} style={{ color }} />
            </div>
            <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{value}</p>
            <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-muted)' }}>{label}</p>
          </div>
        ))}
      </div>

      {/* ── Search ── */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search employees…"
        className="w-full h-10 px-4 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        style={{ background: 'var(--bg-main)', borderColor: 'var(--border-light)', color: 'var(--text-primary)' }}
      />

      {/* ── Employee table ── */}
      {isLoading ? (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--text-muted)' }}>Loading employees…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 rounded-2xl" style={{ background: 'var(--bg-main)', border: '1.5px solid var(--border-light)' }}>
          <FileText size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>No employees found</p>
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1.5px solid var(--border-light)' }}>
          {/* Table header */}
          <div
            className="grid text-xs font-bold uppercase tracking-wider px-5 py-3"
            style={{
              gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto',
              background: 'var(--bg-warm)',
              borderBottom: '1px solid var(--border-light)',
              color: 'var(--text-muted)',
            }}
          >
            <span>Employee</span>
            <span>PAN</span>
            <span className="text-right">Payslips</span>
            <span className="text-right">TDS in Payslips</span>
            <span className="text-center">Status</span>
            <span className="text-right">Actions</span>
          </div>

          {/* Rows */}
          {filtered.map((emp, idx) => {
            const isEven = idx % 2 === 0;
            const hasData = emp.can_generate;
            const hasDecl = emp.has_declaration;
            const isDown  = downloading[emp.employee_id];

            return (
              <div
                key={emp.employee_id}
                className="grid items-center px-5 py-3 transition-colors"
                style={{
                  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto',
                  background: isEven ? 'var(--bg-main)' : 'var(--bg-warm)',
                  borderBottom: '1px solid var(--border-light)',
                }}
              >
                {/* Employee */}
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{emp.employee_name}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {emp.employee_id} · {emp.department || '—'}
                  </p>
                  {emp.declarations?.tax_regime && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold mt-0.5 inline-block ${
                      emp.declarations.tax_regime === 'new' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {emp.declarations.tax_regime === 'new' ? 'New Regime' : 'Old Regime'}
                    </span>
                  )}
                </div>

                {/* PAN */}
                <div>
                  {emp.pan_number ? (
                    <span className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{emp.pan_number}</span>
                  ) : (
                    <span className="text-[11px] text-red-500 font-semibold">Missing PAN</span>
                  )}
                </div>

                {/* Payslips */}
                <div className="text-right">
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {emp.payslip_count} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>/ 12</span>
                  </span>
                </div>

                {/* TDS */}
                <div className="text-right">
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {INR(emp.tds_from_slips)}
                  </span>
                </div>

                {/* Status */}
                <div className="text-center">
                  {!hasData ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                      <Clock size={11} /> No Payslips
                    </span>
                  ) : hasDecl ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-600">
                      <CheckCircle2 size={11} /> Ready
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-500">
                      <AlertCircle size={11} /> No Declarations
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 justify-end">
                  <button
                    onClick={() => setEditEmp(emp)}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all hover:opacity-80"
                    style={{
                      background: '#EFF4FB',
                      color: '#1B3F72',
                      border: '1px solid #BFDBFE',
                    }}
                  >
                    {hasDecl ? 'Edit' : 'Declare'}
                  </button>
                  <button
                    onClick={() => hasData && handleDownload(emp)}
                    disabled={!hasData || isDown}
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${
                      hasData ? 'hover:opacity-80 active:scale-95' : 'opacity-40 cursor-not-allowed'
                    }`}
                    style={{
                      background: hasData ? '#1B3F72' : '#E2E8F0',
                      color: hasData ? 'white' : '#94A3B8',
                    }}
                  >
                    {isDown ? '…' : (
                      <span className="flex items-center gap-1">
                        <Download size={11} /> PDF
                      </span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Bottom bulk download ── */}
      {canGenerateCount > 0 && (
        <div
          className="flex items-center justify-between rounded-2xl p-4"
          style={{ background: '#EFF4FB', border: '1px solid #BFDBFE' }}
        >
          <div>
            <p className="text-sm font-semibold text-blue-900">
              Ready to generate Form 16 for {canGenerateCount} employee{canGenerateCount !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-blue-600 mt-0.5">
              Downloads all as a single ZIP file. Edit declarations first for accurate tax computation.
            </p>
          </div>
          <Button
            onClick={handleBulkDownload}
            disabled={bulkDownloading}
            className="h-9 text-sm bg-blue-700 hover:bg-blue-800 text-white shrink-0"
          >
            <Download size={14} className="mr-1.5" />
            {bulkDownloading ? 'Preparing…' : 'Download All ZIP'}
          </Button>
        </div>
      )}

      {/* ── Disclaimer ── */}
      <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
        Form 16 Part B generated by PayLeef from payslip data. Part A must be downloaded from the TRACES portal (traces.gov.in).
        Always verify the TDS figures with your Chartered Accountant before issuing to employees.
      </p>

      {/* ── Declaration dialog ── */}
      {editEmp && (
        <DeclarationDialog
          employee={editEmp}
          fy={fy}
          onClose={() => setEditEmp(null)}
          onSaved={() => { refetch(); }}
        />
      )}
    </div>
  );
}
