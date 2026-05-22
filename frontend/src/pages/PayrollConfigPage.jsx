import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, Save, Calculator, ChevronDown, ChevronUp,
  GripVertical, ToggleLeft, ToggleRight, AlertCircle, CheckCircle2, Info,
  Upload, Palette, Building2, FileText, Eye, EyeOff, Download,
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// ── Template definitions ──────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: 'classic',
    name: 'Classic',
    desc: 'Traditional navy blue, two-column table layout. Timeless & professional.',
    color: '#1B4F8A',
    preview: (c) => (
      <svg viewBox="0 0 160 110" className="w-full h-full">
        <rect width="160" height="110" fill="#f8fafc"/>
        <rect width="160" height="28" fill={c}/>
        <rect x="8" y="6" width="60" height="5" rx="1" fill="white" opacity="0.9"/>
        <rect x="8" y="14" width="40" height="3" rx="1" fill="white" opacity="0.5"/>
        <rect x="8" y="32" width="144" height="18" fill="#f1f5f9"/>
        <rect x="8" y="54" width="70" height="8" fill={c}/>
        <rect x="82" y="54" width="70" height="8" fill="#991B1B"/>
        {[0,1,2,3].map(i=><g key={i}><rect x="8" y={64+i*8} width="70" height="7" fill={i%2?'#f8fafc':'white'}/><rect x="82" y={64+i*8} width="70" height="7" fill={i%2?'#f8fafc':'white'}/></g>)}
        <rect x="8" y="96" width="144" height="10" fill={c}/>
      </svg>
    ),
  },
  {
    id: 'modern',
    name: 'Modern',
    desc: 'Brand-colored header, card-style layout. Clean and contemporary.',
    color: '#E85C2F',
    preview: (c) => (
      <svg viewBox="0 0 160 110" className="w-full h-full">
        <rect width="160" height="110" fill="#fff8f6"/>
        <rect width="160" height="30" fill={c}/>
        <rect x="0" y="28" width="160" height="4" fill="#C94A20"/>
        <rect x="8" y="7" width="55" height="5" rx="1" fill="white" opacity="0.9"/>
        <rect x="8" y="15" width="38" height="3" rx="1" fill="white" opacity="0.5"/>
        <rect x="8" y="38" width="144" height="20" fill="white" rx="2"/>
        <rect x="8" y="38" width="4" height="20" fill={c} rx="1"/>
        <rect x="8" y="62" width="70" height="8" fill={c}/>
        <rect x="82" y="62" width="70" height="8" fill="#DC2626"/>
        {[0,1,2,3].map(i=><g key={i}><rect x="8" y={72+i*7} width="70" height="6" fill={i%2?'#fff8f6':'white'}/><rect x="82" y={72+i*7} width="70" height="6" fill={i%2?'#fff8f6':'white'}/></g>)}
        <rect x="8" y="100" width="144" height="8" fill={c}/>
      </svg>
    ),
  },
  {
    id: 'corporate',
    name: 'Corporate',
    desc: 'Dark charcoal header, executive premium look. For formal businesses.',
    color: '#0F172A',
    preview: (c) => (
      <svg viewBox="0 0 160 110" className="w-full h-full">
        <rect width="160" height="110" fill="#f8fafc"/>
        <rect width="160" height="32" fill={c}/>
        <rect x="0" y="30" width="160" height="3" fill="#E85C2F"/>
        <rect x="8" y="7" width="55" height="5" rx="1" fill="white" opacity="0.9"/>
        <rect x="8" y="15" width="38" height="3" rx="1" fill="#475569"/>
        <rect x="8" y="38" width="144" height="16" fill="#1E293B"/>
        {[0,1,2,3].map(i=><rect key={i} x={8+i*36} y="40" width="34" height="3" rx="1" fill="#64748B"/>)}
        {[0,1,2,3].map(i=><rect key={i} x={8+i*36} y="47" width="28" height="3" rx="1" fill="#E85C2F"/>)}
        <rect x="8" y="58" width="70" height="8" fill="#1E293B"/>
        <rect x="82" y="58" width="70" height="8" fill="#1E293B"/>
        {[0,1,2,3].map(i=><g key={i}><rect x="8" y={68+i*7} width="70" height="6" fill={i%2?'#f1f5f9':'white'}/><rect x="82" y={68+i*7} width="70" height="6" fill={i%2?'#f1f5f9':'white'}/></g>)}
        <rect x="8" y="96" width="144" height="11" fill={c}/>
        <rect x="8" y="96" width="5" height="11" fill="#E85C2F"/>
      </svg>
    ),
  },
  {
    id: 'minimal',
    name: 'Minimal',
    desc: 'White background, black text only. Perfect for printing.',
    color: '#000000',
    preview: () => (
      <svg viewBox="0 0 160 110" className="w-full h-full">
        <rect width="160" height="110" fill="white"/>
        <rect x="8" y="8" width="55" height="6" rx="1" fill="#111"/>
        <rect x="8" y="17" width="36" height="3" rx="1" fill="#666"/>
        <line x1="8" y1="26" x2="152" y2="26" stroke="#111" strokeWidth="1.5"/>
        <rect x="8" y="30" width="144" height="16" fill="#f8fafc"/>
        <line x1="8" y1="48" x2="152" y2="48" stroke="#ccc" strokeWidth="0.5"/>
        <rect x="8" y="52" width="66" height="5" rx="0" fill="#f8fafc"/>
        <rect x="80" y="52" width="72" height="5" fill="#f8fafc"/>
        {[0,1,2,3].map(i=><g key={i}><rect x="8" y={59+i*7} width="32" height="4" rx="0" fill="#e2e8f0"/><rect x="78" y={59+i*7} width="32" height="4" fill="#e2e8f0"/></g>)}
        <line x1="8" y1="90" x2="152" y2="90" stroke="#ccc" strokeWidth="0.5"/>
        <rect x="8" y="93" width="144" height="10" fill="white"/>
        <rect x="8" y="93" width="144" height="10" rx="0" fill="none" stroke="#111" strokeWidth="1"/>
      </svg>
    ),
  },
  {
    id: 'premium',
    name: 'Premium',
    desc: 'Side panel layout with dark left, white right. Bold and unique.',
    color: '#E85C2F',
    preview: (c) => (
      <svg viewBox="0 0 160 110" className="w-full h-full">
        <rect width="160" height="110" fill="white"/>
        <rect width="56" height="110" fill="#0F172A"/>
        <rect x="0" y="0" width="4" height="110" fill={c}/>
        <rect x="8" y="10" width="40" height="5" rx="1" fill="white" opacity="0.9"/>
        <rect x="8" y="18" width="28" height="3" rx="1" fill="#475569"/>
        <rect x="8" y="36" width={c?`${40}`:40} height="3" rx="1" fill={c}/>
        <rect x="8" y="48" width="42" height="18" fill="#1E293B" rx="1"/>
        <rect x="8" y="48" width="3" height="18" fill={c}/>
        <rect x="12" y="52" width="28" height="4" rx="1" fill="white" opacity="0.8"/>
        <rect x="12" y="59" width="20" height="3" rx="1" fill="#64748B"/>
        {[0,1,2,3,4].map(i=><rect key={i} x="10" y={70+i*8} width="36" height="5" rx="1" fill="#1E293B"/>)}
        <rect x="62" y="8" width="50" height="4" rx="1" fill="#1E293B"/>
        {[0,1,2,3].map(i=><g key={i}><rect x="62" y={15+i*9} width="88" height="7" fill={i%2?'#fff8f6':'white'}/><rect x="62" y={18+i*9} width="40" height="3" rx="1" fill="#e2e8f0"/></g>)}
        <rect x="62" y="55" width="50" height="4" rx="1" fill="#1E293B"/>
        {[0,1,2,3].map(i=><g key={i}><rect x="62" y={62+i*9} width="88" height="7" fill={i%2?'#fef2f2':'white'}/><rect x="62" y={65+i*9} width="36" height="3" rx="1" fill="#fecaca"/></g>)}
        <rect x="62" y="102" width="88" height="5" fill="#f8fafc"/>
      </svg>
    ),
  },
];

// ── Type labels ───────────────────────────────────────────────────────────────
const EARN_TYPES = [
  { value: 'pct_of_gross',     label: '% of Gross Salary' },
  { value: 'pct_of_basic',     label: '% of Basic Salary' },
  { value: 'pct_of_component', label: '% of Another Component' },
  { value: 'fixed',            label: 'Fixed Amount (₹)' },
  { value: 'remainder',        label: 'Auto Remainder (fills gap)' },
  { value: 'manual',           label: 'Manual Entry per Payslip' },
];
const DEDUCT_TYPES = [
  { value: 'pct_of_gross',     label: '% of Gross Salary' },
  { value: 'pct_of_basic',     label: '% of Basic Salary' },
  { value: 'pct_of_component', label: '% of Another Component' },
  { value: 'fixed',            label: 'Fixed Amount (₹)' },
  { value: 'manual',           label: 'Manual Entry per Payslip' },
  { value: 'lop',              label: 'Loss of Pay (auto from attendance)' },
];

const TYPE_BADGE = {
  pct_of_gross:     { label: '% Gross',    color: 'bg-blue-100 text-orange-700 border-orange-200' },
  pct_of_basic:     { label: '% Basic',    color: 'bg-purple-100 text-purple-700 border-purple-200' },
  pct_of_component: { label: '% Other',    color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  fixed:            { label: 'Fixed ₹',    color: 'bg-green-100 text-green-700 border-green-200' },
  remainder:        { label: 'Remainder',  color: 'bg-orange-100 text-orange-700 border-orange-200' },
  manual:           { label: 'Manual',     color: 'bg-slate-100 text-slate-600 border-slate-200' },
  lop:              { label: 'LOP',        color: 'bg-red-100 text-red-700 border-red-200' },
};

const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);

// ── Single component row ──────────────────────────────────────────────────────
function ComponentRow({ comp, types, earningKeys, onChange, onDelete, isCustom }) {
  const [open, setOpen] = useState(false);
  const badge = TYPE_BADGE[comp.type] || TYPE_BADGE.manual;
  const showValue = ['pct_of_gross', 'pct_of_basic', 'pct_of_component', 'fixed'].includes(comp.type);
  const showCap   = ['pct_of_basic', 'pct_of_gross', 'pct_of_component'].includes(comp.type);
  const showThreshold = comp.type === 'pct_of_gross';
  const showOf    = comp.type === 'pct_of_component';

  const upd = (k, v) => onChange({ ...comp, [k]: v });

  return (
    <div className={`border rounded-lg transition-colors ${comp.enabled ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50'}`}>
      {/* Summary row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <GripVertical size={14} className="text-slate-300 shrink-0 cursor-grab" />

        {/* Enable toggle */}
        <button
          type="button"
          onClick={() => upd('enabled', !comp.enabled)}
          className={`shrink-0 transition-colors ${comp.enabled ? 'text-green-500' : 'text-slate-300'}`}
          title={comp.enabled ? 'Click to disable' : 'Click to enable'}
        >
          {comp.enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
        </button>

        {/* Label */}
        <span className={`flex-1 text-sm font-medium ${comp.enabled ? 'text-slate-800' : 'text-slate-400'}`}>
          {comp.label}
        </span>

        {/* Type badge */}
        <Badge className={`text-xs shrink-0 ${badge.color}`}>{badge.label}</Badge>

        {/* Value summary */}
        {showValue && (
          <span className="text-xs text-slate-500 shrink-0 w-16 text-right">
            {comp.type === 'fixed' ? fmt(comp.value) : `${comp.value}%`}
          </span>
        )}

        {/* Edit / delete */}
        <button type="button" onClick={() => setOpen(o => !o)} className="text-slate-400 hover:text-slate-600 shrink-0">
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>
        {isCustom && (
          <button type="button" onClick={onDelete} className="text-slate-300 hover:text-red-500 shrink-0 transition-colors">
            <Trash2 size={14} />
          </button>
        )}
      </div>

      {/* Expanded edit form */}
      {open && (
        <div className="border-t border-slate-100 px-4 py-4 grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 rounded-b-lg">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Label</label>
            <Input value={comp.label} onChange={e => upd('label', e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Calculation Type</label>
            <select
              value={comp.type}
              onChange={e => upd('type', e.target.value)}
              className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          {showValue && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {comp.type === 'fixed' ? 'Amount (₹)' : 'Percentage (%)'}
              </label>
              <Input
                type="number"
                value={comp.value}
                onChange={e => upd('value', parseFloat(e.target.value) || 0)}
                className="h-8 text-xs"
                min={0}
                step={comp.type === 'fixed' ? 100 : 0.01}
              />
            </div>
          )}
          {showOf && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Based On Component</label>
              <select
                value={comp.of || ''}
                onChange={e => upd('of', e.target.value)}
                className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Select component…</option>
                {earningKeys.filter(k => k !== comp.key).map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
          )}
          {showCap && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Max Cap (₹) <span className="font-normal text-slate-400">optional</span></label>
              <Input
                type="number"
                value={comp.cap || ''}
                onChange={e => upd('cap', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="e.g. 1800"
                className="h-8 text-xs"
              />
            </div>
          )}
          {showThreshold && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Apply only if gross ≤ (₹)</label>
              <Input
                type="number"
                value={comp.threshold || ''}
                onChange={e => upd('threshold', e.target.value ? parseFloat(e.target.value) : undefined)}
                placeholder="e.g. 21000"
                className="h-8 text-xs"
              />
              {comp.threshold && (
                <input type="hidden" value="max_gross" onChange={() => upd('threshold_type', 'max_gross')} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Add component mini-form ───────────────────────────────────────────────────
function AddComponentForm({ types, onAdd, onCancel }) {
  const [label, setLabel]   = useState('');
  const [type,  setType]    = useState(types[0].value);
  const [value, setValue]   = useState('');

  const handleAdd = () => {
    if (!label.trim()) { toast.error('Label is required'); return; }
    const key = label.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();
    onAdd({ key, label: label.trim(), type, value: parseFloat(value) || 0, enabled: true });
    setLabel(''); setValue('');
  };

  const showValue = ['pct_of_gross','pct_of_basic','pct_of_component','fixed'].includes(type);

  return (
    <div className="border border-dashed border-blue-300 rounded-lg px-4 py-3 bg-orange-50 space-y-3">
      <p className="text-xs font-semibold text-orange-700">New Component</p>
      <div className="flex flex-wrap gap-2">
        <Input value={label} onChange={e => setLabel(e.target.value)} placeholder="Label (e.g. Transport Allowance)" className="h-8 text-xs flex-1 min-w-[160px]" />
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          {types.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        {showValue && (
          <Input
            type="number"
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={type === 'fixed' ? '₹ Amount' : '% Value'}
            className="h-8 text-xs w-28"
          />
        )}
        <Button type="button" onClick={handleAdd} className="h-8 text-xs bg-orange-600 hover:bg-orange-700 text-white">Add</Button>
        <Button type="button" variant="outline" onClick={onCancel} className="h-8 text-xs">Cancel</Button>
      </div>
    </div>
  );
}

// ── Preview result ────────────────────────────────────────────────────────────
function PreviewResult({ result }) {
  if (!result) return null;
  return (
    <div className="space-y-3 mt-4">
      <div className="grid grid-cols-2 gap-3">
        {/* Earnings */}
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-2">Earnings Breakdown</p>
          <div className="rounded-lg border border-slate-200 overflow-hidden text-xs">
            {Object.entries(result.earnings || {}).map(([k, v]) => (
              <div key={k} className="flex justify-between px-3 py-1.5 odd:bg-slate-50">
                <span className="text-slate-600">{result.earningLabels?.[k] || k}</span>
                <span className="font-semibold text-slate-800">{fmt(v)}</span>
              </div>
            ))}
            <div className="flex justify-between px-3 py-2 bg-orange-50 font-bold text-orange-700">
              <span>Total Earnings</span>
              <span>{fmt(result.total_earnings)}</span>
            </div>
          </div>
        </div>
        {/* Deductions */}
        <div>
          <p className="text-xs font-semibold text-slate-600 mb-2">Deductions Breakdown</p>
          <div className="rounded-lg border border-slate-200 overflow-hidden text-xs">
            {Object.entries(result.deductions || {}).map(([k, v]) => (
              <div key={k} className="flex justify-between px-3 py-1.5 odd:bg-slate-50">
                <span className="text-slate-600">{result.deductionLabels?.[k] || k}</span>
                <span className="font-semibold text-slate-800">{fmt(v)}</span>
              </div>
            ))}
            <div className="flex justify-between px-3 py-2 bg-red-50 font-bold text-red-700">
              <span>Total Deductions</span>
              <span>{fmt(result.total_deductions)}</span>
            </div>
          </div>
        </div>
      </div>
      {/* Net salary highlight */}
      <div className="flex items-center justify-between rounded-xl bg-orange-600 px-5 py-4 text-white">
        <div>
          <p className="text-xs opacity-80">NET SALARY (Take Home)</p>
          <p className="text-2xl font-bold mt-0.5">{fmt(result.net_salary)}</p>
        </div>
        <div className="text-right text-xs opacity-80 space-y-0.5">
          <p>Gross: {fmt(result.gross_salary)}</p>
          <p>Working: {result.working_days}d  Present: {result.present_days}d  LOP: {result.lop_days}d</p>
          {result.employer_contributions?.pf_employer > 0 && (
            <p>Employer PF: {fmt(result.employer_contributions.pf_employer)}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PayrollConfigPage() {
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState('payroll');
  const logoInputRef = useRef(null);

  const { data: loaded, isLoading } = useQuery({
    queryKey: ['payroll-config'],
    queryFn: () => api.get('/payroll-config').then(r => r.data),
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: brandingLoaded } = useQuery({
    queryKey: ['payroll-branding'],
    queryFn: () => api.get('/payroll-config/branding').then(r => r.data),
    staleTime: 0,          // always re-fetch so saved template never reverts
    refetchOnWindowFocus: true,
  });

  const [earnings,   setEarnings]   = useState([]);
  const [deductions, setDeductions] = useState([]);

  // Branding state
  const [branding, setBranding] = useState({
    template: 'modern', company_name: '', company_address: '',
    company_phone: '', company_email: '', company_website: '',
    company_gstin: '', logo_base64: '', primary_color: '#E85C2F',
    show_employer_contributions: true, show_signature_line: true,
    custom_footer_text: 'This is a computer-generated payslip and does not require a signature.',
  });
  const [savingBranding, setSavingBranding] = useState(false);
  const [previewingPdf,  setPreviewingPdf]  = useState(false);

  useEffect(() => {
    if (brandingLoaded?.branding) {
      const b = brandingLoaded.branding;
      setBranding(prev => ({ ...prev, ...b }));
      // If company_name not set in branding, auto-fill from Settings
      if (!b.company_name) {
        api.get('/settings').then(r => {
          const s = r.data.settings || {};
          setBranding(prev => ({
            ...prev,
            company_name:    prev.company_name    || s.company_name    || '',
            company_address: prev.company_address || s.company_address || '',
            company_phone:   prev.company_phone   || s.company_phone   || '',
            company_email:   prev.company_email   || s.company_email   || '',
          }));
        }).catch(() => {});
      }
    } else if (brandingLoaded !== undefined) {
      // Branding not saved yet — pre-fill from Settings
      api.get('/settings').then(r => {
        const s = r.data.settings || {};
        setBranding(prev => ({
          ...prev,
          company_name:    s.company_name    || '',
          company_address: s.company_address || '',
          company_phone:   s.company_phone   || '',
          company_email:   s.company_email   || '',
        }));
      }).catch(() => {});
    }
  }, [brandingLoaded]);
  const [saving, setSaving]         = useState(false);
  const [showAddEarn,  setShowAddEarn]  = useState(false);
  const [showAddDeduct, setShowAddDeduct] = useState(false);

  // Preview state
  const [previewSalary,  setPreviewSalary]  = useState('50000');
  const [previewAdj,     setPreviewAdj]     = useState({ overtime: '', incentive: '', bonus: '', tds: '', lop_override: '' });
  const [previewResult,  setPreviewResult]  = useState(null);
  const [previewing,     setPreviewing]     = useState(false);
  const [previewOpen,    setPreviewOpen]    = useState(false);

  useEffect(() => {
    if (loaded?.config) {
      setEarnings([...(loaded.config.earnings   || [])]);
      setDeductions([...(loaded.config.deductions || [])]);
    }
  }, [loaded]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/payroll-config', { earnings, deductions });
      toast.success('Payroll configuration saved');
      qc.invalidateQueries({ queryKey: ['payroll-config'] });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBranding = async () => {
    setSavingBranding(true);
    try {
      await api.put('/payroll-config/branding', branding);
      toast.success('Branding saved — will apply to future PDF downloads');
      qc.invalidateQueries({ queryKey: ['payroll-branding'] });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Save failed');
    } finally {
      setSavingBranding(false);
    }
  };

  const handlePreviewPdf = async () => {
    setPreviewingPdf(true);
    try {
      const res = await api.post('/payroll-config/preview-pdf', branding, { responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'PayLeef_Sample_Payslip.pdf';
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Sample payslip downloaded');
    } catch (err) {
      toast.error('Could not generate preview — check server logs');
    } finally {
      setPreviewingPdf(false);
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2_000_000) { toast.error('Logo must be under 2MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setBranding(b => ({ ...b, logo_base64: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handlePreview = async () => {
    if (!previewSalary) { toast.error('Enter a test salary'); return; }
    setPreviewing(true);
    try {
      const adj = {};
      Object.entries(previewAdj).forEach(([k, v]) => { if (v !== '') adj[k] = parseFloat(v) || 0; });
      const res = await api.post('/payroll-config/preview', {
        salary: parseFloat(previewSalary),
        adjustments: adj,
        config: { earnings, deductions },
      });
      setPreviewResult(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Preview failed');
    } finally {
      setPreviewing(false);
    }
  };

  const updateEarning  = (i, comp) => setEarnings(prev => prev.map((c, idx) => idx === i ? comp : c));
  const updateDeduction = (i, comp) => setDeductions(prev => prev.map((c, idx) => idx === i ? comp : c));
  const deleteEarning  = (i) => setEarnings(prev => prev.filter((_, idx) => idx !== i));
  const deleteDeduction = (i) => setDeductions(prev => prev.filter((_, idx) => idx !== i));

  const addEarning  = (comp) => { setEarnings(prev => [...prev, { ...comp, order: prev.length + 1 }]); setShowAddEarn(false); };
  const addDeduction = (comp) => { setDeductions(prev => [...prev, { ...comp, order: prev.length + 1 }]); setShowAddDeduct(false); };

  const DEFAULT_KEYS = ['basic','hra','da','conveyance','medical','special','overtime','incentive','bonus',
                        'pf_employee','esi_employee','pt','tds','lop','other_deduction'];
  const isCustom = (key) => !DEFAULT_KEYS.includes(key);

  const earningKeys = earnings.map(e => e.key);
  const manualEarnComps = earnings.filter(e => e.enabled && e.type === 'manual');
  const manualDedComps  = deductions.filter(d => d.enabled && d.type === 'manual');

  if (isLoading) {
    return <div className="p-6 text-slate-400 text-sm">Loading configuration…</div>;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payroll Configuration</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure payroll rules, payslip templates, and company branding.
          </p>
        </div>
        {activeTab === 'payroll' && (
          <Button onClick={handleSave} disabled={saving} className="h-10 bg-orange-600 hover:bg-orange-700 text-white shrink-0">
            <Save size={15} className="mr-2" /> {saving ? 'Saving…' : 'Save Configuration'}
          </Button>
        )}
        {activeTab === 'branding' && (
          <div className="flex items-center gap-2">
            <Button onClick={handlePreviewPdf} disabled={previewingPdf} variant="outline" className="h-10 shrink-0">
              <Download size={15} className="mr-2" /> {previewingPdf ? 'Generating…' : 'Preview PDF'}
            </Button>
            <Button onClick={handleSaveBranding} disabled={savingBranding} className="h-10 bg-orange-600 hover:bg-orange-700 text-white shrink-0">
              <Save size={15} className="mr-2" /> {savingBranding ? 'Saving…' : 'Save Branding'}
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {[
          { id: 'payroll',  label: 'Payroll Rules',         icon: Calculator },
          { id: 'branding', label: 'Payslip Templates',     icon: FileText },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === id
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {activeTab === 'branding' && (
        <div className="space-y-6">
          {/* Template Selector */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <FileText size={16} className="text-orange-500" />
                <h2 className="text-base font-semibold text-slate-900">Choose Payslip Template</h2>
              </div>
              <p className="text-xs text-slate-500 mb-5">Select how your payslips will look when downloaded as PDF.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => setBranding(b => ({ ...b, template: tpl.id }))}
                    className={`relative rounded-xl border-2 overflow-hidden transition-all text-left ${
                      branding.template === tpl.id
                        ? 'border-orange-500 shadow-md shadow-orange-100'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {branding.template === tpl.id && (
                      <div className="absolute top-2 right-2 z-10 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                        <CheckCircle2 size={12} className="text-white" />
                      </div>
                    )}
                    <div className="w-full aspect-[160/110] bg-slate-50">
                      {tpl.preview(branding.primary_color || tpl.color)}
                    </div>
                    <div className="p-2.5 bg-white border-t border-slate-100">
                      <p className="text-xs font-bold text-slate-800">{tpl.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{tpl.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Company Info */}
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <Building2 size={16} className="text-orange-500" />
                  <h2 className="text-base font-semibold text-slate-900">Company Information</h2>
                </div>
                <p className="text-xs text-slate-500">This info appears on every payslip PDF header.</p>

                {[
                  { key: 'company_name',    label: 'Company Name',     placeholder: 'TechFlow Solutions Pvt Ltd' },
                  { key: 'company_address', label: 'Address',          placeholder: '123 MG Road, Bangalore - 560001' },
                  { key: 'company_phone',   label: 'Phone',            placeholder: '+91 98765 43210' },
                  { key: 'company_email',   label: 'Email',            placeholder: 'hr@company.com' },
                  { key: 'company_website', label: 'Website',          placeholder: 'www.company.com' },
                  { key: 'company_gstin',   label: 'GSTIN (optional)', placeholder: '29ABCDE1234F1Z5' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
                    <Input
                      value={branding[key] || ''}
                      onChange={e => setBranding(b => ({ ...b, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="h-9 text-sm"
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Branding & Display */}
            <div className="space-y-4">
              {/* Logo Upload */}
              <Card>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Upload size={16} className="text-orange-500" />
                    <h2 className="text-base font-semibold text-slate-900">Company Logo</h2>
                  </div>
                  <p className="text-xs text-slate-500 mb-4">PNG or JPG, max 2MB. Appears top-left on every payslip.</p>

                  <div className="flex items-center gap-4">
                    {branding.logo_base64 ? (
                      <div className="relative w-20 h-20 border border-slate-200 rounded-lg overflow-hidden bg-slate-50 flex items-center justify-center">
                        <img src={branding.logo_base64} alt="Logo" className="max-w-full max-h-full object-contain p-1" />
                        <button
                          onClick={() => setBranding(b => ({ ...b, logo_base64: '' }))}
                          className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs flex items-center justify-center rounded-bl"
                          title="Remove logo"
                        >×</button>
                      </div>
                    ) : (
                      <div
                        onClick={() => logoInputRef.current?.click()}
                        className="w-20 h-20 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors"
                      >
                        <Upload size={18} className="text-slate-400" />
                        <span className="text-[10px] text-slate-400 mt-1">Upload</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <Button variant="outline" className="h-9 text-sm" onClick={() => logoInputRef.current?.click()}>
                        <Upload size={13} className="mr-1.5" />
                        {branding.logo_base64 ? 'Change Logo' : 'Upload Logo'}
                      </Button>
                      <p className="text-xs text-slate-400 mt-2">Recommended: 200×200px square PNG with transparent background</p>
                    </div>
                    <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={handleLogoUpload} />
                  </div>
                </CardContent>
              </Card>

              {/* Color & Options */}
              <Card>
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Palette size={16} className="text-orange-500" />
                    <h2 className="text-base font-semibold text-slate-900">Style & Display Options</h2>
                  </div>

                  {/* Primary color */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2">Primary Colour</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={branding.primary_color || '#E85C2F'}
                        onChange={e => setBranding(b => ({ ...b, primary_color: e.target.value }))}
                        className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer p-0.5"
                      />
                      <Input
                        value={branding.primary_color || '#E85C2F'}
                        onChange={e => setBranding(b => ({ ...b, primary_color: e.target.value }))}
                        placeholder="#E85C2F"
                        className="h-9 text-sm w-32 font-mono"
                        maxLength={7}
                      />
                      <div className="flex gap-2">
                        {['#E85C2F','#1B4F8A','#0F172A','#059669','#7C3AED'].map(c => (
                          <button key={c} onClick={() => setBranding(b => ({...b,primary_color:c}))}
                            className="w-6 h-6 rounded-full border-2 transition-all"
                            style={{ background: c, borderColor: branding.primary_color===c ? '#000':'transparent' }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Toggle options */}
                  {[
                    { key: 'show_employer_contributions', label: 'Show employer contributions (PF, ESI, CTC)' },
                    { key: 'show_signature_line',         label: 'Show signature lines at bottom' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between py-2 border-t border-slate-100">
                      <span className="text-sm text-slate-700">{label}</span>
                      <button onClick={() => setBranding(b => ({ ...b, [key]: !b[key] }))} className="shrink-0">
                        {branding[key]
                          ? <ToggleRight size={26} className="text-orange-500" />
                          : <ToggleLeft  size={26} className="text-slate-300" />}
                      </button>
                    </div>
                  ))}

                  {/* Footer text */}
                  <div className="border-t border-slate-100 pt-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Custom Footer Text</label>
                    <Input
                      value={branding.custom_footer_text || ''}
                      onChange={e => setBranding(b => ({ ...b, custom_footer_text: e.target.value }))}
                      placeholder="This is a computer-generated payslip…"
                      className="h-9 text-sm"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Save branding */}
          <div className="flex justify-end gap-3">
            <Button onClick={handlePreviewPdf} disabled={previewingPdf} variant="outline" className="h-10">
              <Download size={15} className="mr-2" /> {previewingPdf ? 'Generating…' : 'Preview PDF'}
            </Button>
            <Button onClick={handleSaveBranding} disabled={savingBranding} className="h-10 bg-orange-600 hover:bg-orange-700 text-white">
              <Save size={15} className="mr-2" /> {savingBranding ? 'Saving…' : 'Save Branding & Template'}
            </Button>
          </div>
        </div>
      )}

      {activeTab === 'payroll' && (<div className="space-y-6">

      {/* Info banner */}
      <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 px-5 py-4">
        <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <strong>How it works:</strong> Set up your components below. When you generate payslips,
          the system automatically calculates every component for every employee based on their gross salary.
          Manual components (Overtime, Incentive, Bonus, TDS) are entered per employee at payslip generation time.
          Changes here only affect future payslips — existing ones are not changed.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Earnings ───────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Earnings Components</h2>
              <p className="text-xs text-slate-500">{earnings.filter(e => e.enabled).length} active</p>
            </div>
            <Button variant="outline" className="h-8 text-xs" onClick={() => setShowAddEarn(v => !v)}>
              <Plus size={13} className="mr-1" /> Add Earning
            </Button>
          </div>

          {showAddEarn && (
            <AddComponentForm types={EARN_TYPES} onAdd={addEarning} onCancel={() => setShowAddEarn(false)} />
          )}

          <div className="space-y-2">
            {earnings.map((comp, i) => (
              <ComponentRow
                key={comp.key}
                comp={comp}
                types={EARN_TYPES}
                earningKeys={earningKeys}
                onChange={(c) => updateEarning(i, c)}
                onDelete={() => deleteEarning(i)}
                isCustom={isCustom(comp.key)}
              />
            ))}
          </div>
        </div>

        {/* ── Deductions ─────────────────────────────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Deduction Components</h2>
              <p className="text-xs text-slate-500">{deductions.filter(d => d.enabled).length} active</p>
            </div>
            <Button variant="outline" className="h-8 text-xs" onClick={() => setShowAddDeduct(v => !v)}>
              <Plus size={13} className="mr-1" /> Add Deduction
            </Button>
          </div>

          {showAddDeduct && (
            <AddComponentForm types={DEDUCT_TYPES} onAdd={addDeduction} onCancel={() => setShowAddDeduct(false)} />
          )}

          <div className="space-y-2">
            {deductions.map((comp, i) => (
              <ComponentRow
                key={comp.key}
                comp={comp}
                types={DEDUCT_TYPES}
                earningKeys={earningKeys}
                onChange={(c) => updateDeduction(i, c)}
                onDelete={() => deleteDeduction(i)}
                isCustom={isCustom(comp.key)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Live Preview calculator ──────────────────────────────────────── */}
      <Card>
        <div
          className="px-5 py-4 border-b border-slate-100 flex items-center justify-between cursor-pointer"
          onClick={() => setPreviewOpen(v => !v)}
        >
          <div className="flex items-center gap-2">
            <Calculator size={16} className="text-orange-600" />
            <h3 className="text-sm font-semibold text-slate-900">Test Your Configuration</h3>
            <span className="text-xs text-slate-400">— Enter a sample salary to see the full breakdown</span>
          </div>
          {previewOpen ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
        </div>

        {previewOpen && (
          <CardContent className="py-5 space-y-4">
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Gross Salary (₹) *</label>
                <Input
                  type="number"
                  value={previewSalary}
                  onChange={e => setPreviewSalary(e.target.value)}
                  placeholder="50000"
                  className="h-9 w-36"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Working Days</label>
                <Input
                  type="number"
                  value={previewAdj.working_days || 26}
                  onChange={e => setPreviewAdj(p => ({ ...p, working_days: e.target.value }))}
                  className="h-9 w-24"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">LOP Days</label>
                <Input
                  type="number"
                  value={previewAdj.lop_override || ''}
                  onChange={e => setPreviewAdj(p => ({ ...p, lop_override: e.target.value }))}
                  placeholder="0"
                  className="h-9 w-24"
                />
              </div>
              {/* Manual earning fields */}
              {manualEarnComps.map(c => (
                <div key={c.key}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{c.label} (₹)</label>
                  <Input
                    type="number"
                    value={previewAdj[c.key] || ''}
                    onChange={e => setPreviewAdj(p => ({ ...p, [c.key]: e.target.value }))}
                    placeholder="0"
                    className="h-9 w-28"
                  />
                </div>
              ))}
              {/* Manual deduction fields */}
              {manualDedComps.map(c => (
                <div key={c.key}>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">{c.label} (₹)</label>
                  <Input
                    type="number"
                    value={previewAdj[c.key] || ''}
                    onChange={e => setPreviewAdj(p => ({ ...p, [c.key]: e.target.value }))}
                    placeholder="0"
                    className="h-9 w-28"
                  />
                </div>
              ))}
              <Button onClick={handlePreview} disabled={previewing} className="h-9 bg-orange-600 hover:bg-orange-700 text-white">
                <Calculator size={14} className="mr-1.5" />
                {previewing ? 'Calculating…' : 'Calculate'}
              </Button>
            </div>

            <PreviewResult result={previewResult} />
          </CardContent>
        )}
      </Card>

      {/* Save at bottom too */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="h-10 bg-orange-600 hover:bg-orange-700 text-white">
          <Save size={15} className="mr-2" />
          {saving ? 'Saving…' : 'Save Configuration'}
        </Button>
      </div>
      </div>)}
    </div>
  );
}
