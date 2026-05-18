import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Building2, Users, Settings, CheckCircle2, ChevronRight,
  ChevronLeft, Upload, SkipForward, Sparkles, MapPin,
  Phone, Mail, Globe, Hash, Briefcase,
} from 'lucide-react';
import api from '@/lib/api';

// ── Step definitions ──────────────────────────────────────────────────────
const STEPS = [
  { id: 1, icon: Sparkles,   title: 'Welcome to PayOS',       subtitle: 'Let\'s set up your payroll in 4 quick steps' },
  { id: 2, icon: Building2,  title: 'Company Information',    subtitle: 'Tell us about your company' },
  { id: 3, icon: Settings,   title: 'Payroll Preferences',    subtitle: 'Configure how payroll runs' },
  { id: 4, icon: Users,      title: 'Add Your First Employee', subtitle: 'Import or add employees to get started' },
  { id: 5, icon: CheckCircle2, title: 'All Done!',            subtitle: 'Your PayOS is ready to use' },
];

const INDUSTRIES = [
  'Information Technology', 'Manufacturing', 'Retail & E-commerce', 'Healthcare',
  'Education', 'Finance & Banking', 'Logistics & Transport', 'Construction',
  'Hospitality', 'Media & Entertainment', 'Legal & Consulting', 'Other',
];

const COMPANY_SIZES = ['1–10', '11–50', '51–200', '201–500', '500+'];

// ── Progress bar ─────────────────────────────────────────────────────────
function StepBar({ current, total }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }).map((_, i) => {
        const n = i + 1;
        const done    = n < current;
        const active  = n === current;
        return (
          <div key={n} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
              done   ? 'bg-orange-500 text-white' :
              active ? 'bg-white border-2 border-orange-500 text-orange-600' :
                       'bg-slate-100 text-slate-400'
            }`}>
              {done ? <CheckCircle2 size={14} /> : n}
            </div>
            {n < total && (
              <div className={`h-0.5 flex-1 rounded transition-all ${done ? 'bg-orange-400' : 'bg-slate-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep]     = useState(1);
  const [saving, setSaving] = useState(false);

  const [company, setCompany] = useState({
    company_name: '', company_address: '', company_phone: '',
    company_email: '', company_website: '', company_gstin: '',
    company_industry: '', company_size: '',
  });

  const upd = (k, v) => setCompany(c => ({ ...c, [k]: v }));

  const saveStep = async (data = {}) => {
    try {
      await api.put('/admin-profile/onboarding/step', { ...company, ...data });
    } catch { /* silent — don't block navigation */ }
  };

  const next = async () => {
    setSaving(true);
    await saveStep();
    setSaving(false);
    setStep(s => Math.min(s + 1, STEPS.length));
  };

  const back = () => setStep(s => Math.max(s - 1, 1));

  const skip = async () => {
    if (step >= STEPS.length - 1) {
      await finish();
    } else {
      setStep(s => Math.min(s + 1, STEPS.length));
    }
  };

  const finish = async () => {
    setSaving(true);
    try {
      await api.put('/admin-profile/onboarding/complete');
      toast.success('Setup complete! Welcome to PayOS 🎉');
      navigate('/admin/dashboard');
    } catch {
      toast.error('Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const currentStep = STEPS[step - 1];
  const Icon = currentStep.icon;

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #1B1B2F 0%, #16213E 60%, #0F3460 100%)' }}>

      {/* ── Left panel ─────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-2/5 flex-col justify-between p-12 text-white">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-lg" style={{ background: '#E85C2F' }}>P</div>
          <div>
            <p className="font-bold text-lg leading-tight">PayOS</p>
            <p className="text-xs text-white/50">Smart Payroll OS</p>
          </div>
        </div>

        {/* Steps list */}
        <div className="space-y-6">
          <p className="text-white/60 text-sm font-medium uppercase tracking-widest">Setup Progress</p>
          {STEPS.slice(0, -1).map((s) => {
            const SIcon = s.icon;
            const done   = step > s.id;
            const active = step === s.id;
            return (
              <div key={s.id} className={`flex items-start gap-4 transition-all ${active ? 'opacity-100' : done ? 'opacity-60' : 'opacity-30'}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  done ? 'bg-orange-500' : active ? 'bg-white/20 border border-white/40' : 'bg-white/10'
                }`}>
                  {done ? <CheckCircle2 size={16} className="text-white" /> : <SIcon size={16} className="text-white/80" />}
                </div>
                <div className="pt-1">
                  <p className={`text-sm font-semibold ${active ? 'text-white' : 'text-white/70'}`}>{s.title}</p>
                  <p className="text-xs text-white/40 mt-0.5">{s.subtitle}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom quote */}
        <div className="rounded-2xl p-5 border border-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <p className="text-sm text-white/70 italic leading-relaxed">
            "PayOS helped us cut payroll processing time by 80% and eliminated calculation errors completely."
          </p>
          <p className="text-xs text-orange-400 mt-3 font-semibold">— Priya S., HR Manager, TechFlow Solutions</p>
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-lg">
          <div className="bg-white rounded-3xl shadow-2xl p-8 lg:p-10">

            {/* Step header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: '#FFF4F0' }}>
                <Icon size={22} style={{ color: '#E85C2F' }} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{currentStep.title}</h2>
                <p className="text-sm text-slate-500">{currentStep.subtitle}</p>
              </div>
            </div>

            {/* Progress bar (steps 2-4) */}
            {step < STEPS.length && <StepBar current={step} total={STEPS.length - 1} />}

            {/* ── Step content ───────────────────────────────────────── */}

            {/* Step 1 — Welcome */}
            {step === 1 && (
              <div className="space-y-5">
                <div className="rounded-2xl p-5 border border-orange-100" style={{ background: '#FFF8F5' }}>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    👋 Welcome! We'll help you set up PayOS in just a few minutes. You can skip any step and come back later from <strong>Settings → Company Profile</strong>.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: '⚡', label: 'Automated payroll calculations' },
                    { icon: '📄', label: '5 professional PDF templates' },
                    { icon: '📧', label: 'Bulk payslip distribution' },
                    { icon: '📊', label: 'Analytics & compliance reports' },
                  ].map((f, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-lg">{f.icon}</span>
                      <p className="text-xs text-slate-600 font-medium">{f.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2 — Company Info */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Company Name *</label>
                  <div className="relative">
                    <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={company.company_name} onChange={e => upd('company_name', e.target.value)}
                      placeholder="TechFlow Solutions Pvt Ltd"
                      className="w-full h-10 pl-9 pr-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Industry</label>
                    <select value={company.company_industry} onChange={e => upd('company_industry', e.target.value)}
                      className="w-full h-10 px-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                      <option value="">Select industry</option>
                      {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Company Size</label>
                    <select value={company.company_size} onChange={e => upd('company_size', e.target.value)}
                      className="w-full h-10 px-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white">
                      <option value="">Select size</option>
                      {COMPANY_SIZES.map(s => <option key={s} value={s}>{s} employees</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3 top-3 text-slate-400" />
                    <textarea value={company.company_address} onChange={e => upd('company_address', e.target.value)}
                      placeholder="123 MG Road, Bangalore - 560001"
                      rows={2}
                      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Phone</label>
                    <div className="relative">
                      <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input value={company.company_phone} onChange={e => upd('company_phone', e.target.value)}
                        placeholder="+91 98765 43210" type="tel"
                        className="w-full h-10 pl-9 pr-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">HR Email</label>
                    <div className="relative">
                      <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input value={company.company_email} onChange={e => upd('company_email', e.target.value)}
                        placeholder="hr@company.com" type="email"
                        className="w-full h-10 pl-9 pr-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Website</label>
                    <div className="relative">
                      <Globe size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input value={company.company_website} onChange={e => upd('company_website', e.target.value)}
                        placeholder="www.company.com"
                        className="w-full h-10 pl-9 pr-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">GSTIN (optional)</label>
                    <div className="relative">
                      <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input value={company.company_gstin} onChange={e => upd('company_gstin', e.target.value)}
                        placeholder="29ABCDE1234F1Z5"
                        className="w-full h-10 pl-9 pr-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-400" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 — Payroll Preferences */}
            {step === 3 && (
              <div className="space-y-5">
                <div className="rounded-2xl p-5 border border-blue-100 bg-blue-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings size={16} className="text-blue-600" />
                    <p className="text-sm font-semibold text-blue-800">Default settings applied</p>
                  </div>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    PayOS uses industry-standard settings: monthly payroll, 26 working days, and automatic PF/ESI/PT calculations. You can customise every component from <strong>Payroll Config</strong> any time.
                  </p>
                </div>

                {[
                  { label: '✅ PF (Employee) — 12% of Basic',      desc: 'Provident Fund — statutory deduction' },
                  { label: '✅ ESI — 0.75% of Gross',              desc: 'Employee State Insurance' },
                  { label: '✅ Professional Tax — ₹200/month',     desc: 'State-specific fixed deduction' },
                  { label: '✅ Basic Salary — 40% of CTC',         desc: 'Foundation for all calculations' },
                  { label: '✅ HRA — 40% of Basic',                desc: 'House Rent Allowance' },
                  { label: '✅ Conveyance — ₹1,600/month',         desc: 'Fixed transport allowance' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">{item.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}

                <p className="text-xs text-slate-400 text-center">
                  All components are fully customisable in <strong>Payroll Config → Payroll Rules</strong>
                </p>
              </div>
            )}

            {/* Step 4 — Add Employees */}
            {step === 4 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => { finish(); navigate('/admin/upload'); }}
                    className="flex items-center gap-4 p-5 rounded-2xl border-2 border-orange-200 hover:border-orange-400 hover:bg-orange-50 transition-all text-left group"
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#FFF4F0' }}>
                      <Upload size={22} style={{ color: '#E85C2F' }} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 group-hover:text-orange-700">Import via CSV</p>
                      <p className="text-xs text-slate-500 mt-0.5">Upload a spreadsheet with all employees at once. Fastest option.</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-orange-500 ml-auto shrink-0" />
                  </button>

                  <button
                    onClick={() => { finish(); navigate('/admin/employees'); }}
                    className="flex items-center gap-4 p-5 rounded-2xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left group"
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-slate-100">
                      <Users size={22} className="text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 group-hover:text-slate-700">Add manually</p>
                      <p className="text-xs text-slate-500 mt-0.5">Add employees one by one from the Employees page.</p>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-400 ml-auto shrink-0" />
                  </button>

                  <button
                    onClick={skip}
                    className="flex items-center gap-4 p-5 rounded-2xl border-2 border-dashed border-slate-200 hover:border-slate-300 transition-all text-left group"
                  >
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-slate-50">
                      <SkipForward size={22} className="text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-500 group-hover:text-slate-600">Skip for now</p>
                      <p className="text-xs text-slate-400 mt-0.5">I'll add employees later from the dashboard.</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Step 5 — Done */}
            {step === 5 && (
              <div className="text-center space-y-6">
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto" style={{ background: '#FFF4F0' }}>
                  <CheckCircle2 size={40} style={{ color: '#E85C2F' }} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">You're all set!</h3>
                  <p className="text-sm text-slate-500 mt-2">PayOS is configured and ready. Here's what you can do next:</p>
                </div>
                <div className="grid grid-cols-1 gap-3 text-left">
                  {[
                    { icon: '👥', label: 'Add Employees', path: '/admin/employees',  desc: 'Import or add your team' },
                    { icon: '💰', label: 'Generate Payslips', path: '/admin/send',  desc: 'Create & send payslips' },
                    { icon: '⚙️', label: 'Payroll Config', path: '/admin/payroll-config', desc: 'Customise components' },
                    { icon: '📊', label: 'View Analytics', path: '/admin/analytics', desc: 'Track salary trends' },
                  ].map((item, i) => (
                    <button key={i} onClick={() => navigate(item.path)}
                      className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-orange-50 border border-slate-100 hover:border-orange-200 transition-all text-left">
                      <span className="text-lg">{item.icon}</span>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">{item.label}</p>
                        <p className="text-xs text-slate-500">{item.desc}</p>
                      </div>
                      <ChevronRight size={14} className="text-slate-300 ml-auto" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Action buttons ─────────────────────────────────────── */}
            <div className="flex items-center gap-3 mt-8">
              {step > 1 && step < STEPS.length && (
                <button onClick={back} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">
                  <ChevronLeft size={15} /> Back
                </button>
              )}

              <div className="flex-1" />

              {step < STEPS.length && step !== 4 && (
                <button onClick={skip} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors">
                  <SkipForward size={14} /> Skip
                </button>
              )}

              {step === 1 && (
                <button onClick={next} disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
                  style={{ background: '#E85C2F' }}>
                  Get Started <ChevronRight size={15} />
                </button>
              )}

              {step === 2 && (
                <button onClick={next} disabled={saving || !company.company_name.trim()}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
                  style={{ background: '#E85C2F' }}>
                  {saving ? 'Saving…' : 'Save & Continue'} <ChevronRight size={15} />
                </button>
              )}

              {step === 3 && (
                <button onClick={next} disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
                  style={{ background: '#E85C2F' }}>
                  {saving ? 'Saving…' : 'Looks Good!'} <ChevronRight size={15} />
                </button>
              )}

              {step === 5 && (
                <button onClick={finish} disabled={saving}
                  className="flex items-center gap-2 px-8 py-2.5 rounded-xl text-white text-sm font-semibold transition-all hover:opacity-90 active:scale-95"
                  style={{ background: '#E85C2F' }}>
                  {saving ? 'Loading…' : 'Go to Dashboard'} <ChevronRight size={15} />
                </button>
              )}
            </div>

          </div>

          {/* Footer */}
          <p className="text-center text-white/30 text-xs mt-6">
            PayOS © {new Date().getFullYear()} · Smart Payroll OS · Made in India 🇮🇳
          </p>
        </div>
      </div>
    </div>
  );
}
