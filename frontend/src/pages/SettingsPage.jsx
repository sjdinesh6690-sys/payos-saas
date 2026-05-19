import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Settings, Mail, Building2, Server, Send, Eye, EyeOff,
  CheckCircle2, AlertCircle, Palette, Save, TestTube
} from 'lucide-react';
import api from '../lib/api';

const MONTH_VARS = ['{month}', '{company}', '{employee}', '{employee_id}', '{net_salary}'];

const DEFAULT_BODY = `<p>Dear {employee},</p>

<p>Please find attached your payslip for <strong>{month}</strong>.</p>

<p>
  Employee ID: <strong>{employee_id}</strong><br/>
  Net Salary: <strong>{net_salary}</strong>
</p>

<p>For any questions, please contact your HR department.</p>

<p>Regards,<br/>{company} Payroll Team</p>`;

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [testing, setTesting]     = useState(false);
  const [showPass, setShowPass]   = useState(false);
  const [testEmail, setTestEmail] = useState('');

  const [form, setForm] = useState({
    company_name: '', company_email: '', company_phone: '', company_address: '',
    company_industry: '', company_size: '',
    smtp_host: '', smtp_port: '587', smtp_user: '', smtp_pass: '', smtp_from: '',
    email_subject: 'Your Payslip for {month} — {company}',
    email_body: DEFAULT_BODY,
    brand_color: '#1B4F8A', logo_url: '',
  });

  useEffect(() => {
    api.get('/settings').then(r => {
      const s = r.data.settings || {};
      setForm(prev => ({
        ...prev,
        company_name:     s.company_name     || '',
        company_email:    s.company_email    || '',
        company_phone:    s.company_phone    || '',
        company_address:  s.company_address  || '',
        company_industry: s.company_industry || '',
        company_size:     s.company_size     || '',
        smtp_host:        s.smtp_host        || '',
        smtp_port:        s.smtp_port        || '587',
        smtp_user:        s.smtp_user        || '',
        smtp_pass:        s.smtp_pass        || '',
        smtp_from:        s.smtp_from        || '',
        email_subject:    s.email_subject    || 'Your Payslip for {month} — {company}',
        email_body:       s.email_body       || DEFAULT_BODY,
        brand_color:      s.brand_color      || '#1B4F8A',
        logo_url:         s.logo_url         || '',
      }));
    }).catch(e => toast.error('Failed to load settings')).finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/settings', form);
      toast.success('Settings saved successfully!');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save settings');
    } finally { setSaving(false); }
  };

  const testSmtp = async () => {
    if (!form.smtp_host || !form.smtp_user) {
      toast.error('Enter SMTP host and username first');
      return;
    }
    if (form.smtp_pass === '••••••••') {
      toast.error('Re-enter your SMTP password to test');
      return;
    }
    setTesting(true);
    try {
      const res = await api.post('/settings/test-smtp', {
        smtp_host: form.smtp_host, smtp_port: form.smtp_port,
        smtp_user: form.smtp_user, smtp_pass: form.smtp_pass,
        smtp_from: form.smtp_from, test_to: testEmail || form.smtp_user,
      });
      toast.success(res.data.message);
    } catch (e) {
      toast.error(e.response?.data?.error || 'SMTP test failed');
    } finally { setTesting(false); }
  };

  const insertVar = (v) => {
    setForm(prev => ({ ...prev, email_body: (prev.email_body || '') + v }));
  };

  const SMTP_PRESETS = [
    { name: 'Gmail',   host: 'smtp.gmail.com',      port: '587', note: 'Use App Password (not your Gmail password)' },
    { name: 'Outlook', host: 'smtp.office365.com',  port: '587', note: 'Use your Microsoft 365 account credentials' },
    { name: 'Zoho',    host: 'smtp.zoho.in',        port: '587', note: 'Use your Zoho Mail credentials' },
    { name: 'Hostinger', host: 'smtp.hostinger.com', port: '587', note: 'Use your Hostinger email credentials' },
  ];

  const tabs = [
    { id: 'company',  label: 'Company Profile', icon: Building2 },
    { id: 'smtp',     label: 'SMTP / Email',    icon: Server },
    { id: 'template', label: 'Email Template',  icon: Mail },
    { id: 'branding', label: 'Branding',        icon: Palette },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Settings className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-500">Configure email, SMTP, templates and branding</p>
          </div>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save All Settings'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 flex-1 justify-center py-2 px-3 rounded-md text-sm font-medium transition-all ${
              activeTab === t.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">

        {/* ── COMPANY PROFILE TAB ── */}
        {activeTab === 'company' && (
          <div className="space-y-5">
            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" /> Company Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Company Name" required>
                <input value={form.company_name} onChange={e => set('company_name', e.target.value)}
                  placeholder="Acme Pvt. Ltd." className={inputCls} />
              </Field>
              <Field label="Company Email">
                <input value={form.company_email} onChange={e => set('company_email', e.target.value)}
                  type="email" placeholder="hr@company.com" className={inputCls} />
              </Field>
              <Field label="Phone Number">
                <input value={form.company_phone} onChange={e => set('company_phone', e.target.value)}
                  placeholder="+91-XXXXX-XXXXX" className={inputCls} />
              </Field>
              <Field label="Industry">
                <select value={form.company_industry} onChange={e => set('company_industry', e.target.value)} className={inputCls}>
                  <option value="">Select Industry</option>
                  {['Manufacturing','Logistics','IT & Software','Healthcare','Education',
                    'Retail','Construction','Finance','Hospitality','Other'].map(i => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </Field>
              <Field label="Company Size">
                <select value={form.company_size} onChange={e => set('company_size', e.target.value)} className={inputCls}>
                  <option value="">Select Size</option>
                  {['1–10','11–50','51–200','201–500','500+'].map(s => (
                    <option key={s} value={s}>{s} employees</option>
                  ))}
                </select>
              </Field>
              <Field label="Address" className="sm:col-span-2">
                <textarea value={form.company_address} onChange={e => set('company_address', e.target.value)}
                  rows={2} placeholder="Full company address…" className={inputCls} />
              </Field>
            </div>
          </div>
        )}

        {/* ── SMTP TAB ── */}
        {activeTab === 'smtp' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-1">
                <Server className="w-4 h-4 text-blue-600" /> SMTP Email Configuration
              </h2>
              <p className="text-sm text-gray-500">
                Configure your email server so payslips can be sent directly from your company email.
              </p>
            </div>

            {/* Quick presets */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Quick Setup — Click to fill host &amp; port:</p>
              <div className="flex flex-wrap gap-2">
                {SMTP_PRESETS.map(p => (
                  <button
                    key={p.name}
                    onClick={() => { set('smtp_host', p.host); set('smtp_port', p.port); toast.success(`${p.name} preset loaded. ${p.note}`); }}
                    className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-blue-50 hover:border-blue-300 transition-colors"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="SMTP Host" required>
                <input value={form.smtp_host} onChange={e => set('smtp_host', e.target.value)}
                  placeholder="smtp.gmail.com" className={inputCls} />
              </Field>
              <Field label="SMTP Port">
                <select value={form.smtp_port} onChange={e => set('smtp_port', e.target.value)} className={inputCls}>
                  <option value="587">587 (TLS — recommended)</option>
                  <option value="465">465 (SSL)</option>
                  <option value="25">25 (plain)</option>
                </select>
              </Field>
              <Field label="Email Username (Login)" required>
                <input value={form.smtp_user} onChange={e => set('smtp_user', e.target.value)}
                  placeholder="payroll@yourcompany.com" className={inputCls} />
              </Field>
              <Field label="Email Password / App Password" required>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={form.smtp_pass}
                    onChange={e => set('smtp_pass', e.target.value)}
                    placeholder="Your email password or app password"
                    className={`${inputCls} pr-10`}
                  />
                  <button onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </Field>
              <Field label="From Name / Address" className="sm:col-span-2">
                <input value={form.smtp_from} onChange={e => set('smtp_from', e.target.value)}
                  placeholder="HR Payroll <payroll@yourcompany.com>" className={inputCls} />
              </Field>
            </div>

            {/* Test connection */}
            <div className="bg-gray-50 rounded-lg p-4 border border-dashed border-gray-300">
              <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <TestTube className="w-4 h-4" /> Test SMTP Connection
              </p>
              <div className="flex gap-3">
                <input
                  value={testEmail}
                  onChange={e => setTestEmail(e.target.value)}
                  placeholder="Send test to (leave blank = use your SMTP username)"
                  className={`${inputCls} flex-1`}
                />
                <button
                  onClick={testSmtp}
                  disabled={testing}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium whitespace-nowrap disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {testing ? 'Testing…' : 'Send Test Email'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 For Gmail: use an <strong>App Password</strong> (not your main password). Go to Google Account → Security → 2-Step Verification → App passwords.
              </p>
            </div>

            {/* Status indicator */}
            <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${form.smtp_host && form.smtp_user ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
              {form.smtp_host && form.smtp_user
                ? <><CheckCircle2 className="w-4 h-4" /> SMTP configured — payslips will be sent via your email server</>
                : <><AlertCircle className="w-4 h-4" /> SMTP not configured — payslips will be <strong>simulated</strong> (not actually sent)</>
              }
            </div>
          </div>
        )}

        {/* ── EMAIL TEMPLATE TAB ── */}
        {activeTab === 'template' && (
          <div className="space-y-5">
            <div>
              <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-1">
                <Mail className="w-4 h-4 text-blue-600" /> Email Template
              </h2>
              <p className="text-sm text-gray-500">
                Customise the email your employees receive when their payslip is sent.
              </p>
            </div>

            <Field label="Email Subject">
              <input value={form.email_subject} onChange={e => set('email_subject', e.target.value)}
                placeholder="Your Payslip for {month} — {company}" className={inputCls} />
              <p className="text-xs text-gray-400 mt-1">Variables: {MONTH_VARS.map(v => <code key={v} className="mx-0.5 bg-gray-100 px-1 rounded">{v}</code>)}</p>
            </Field>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Body (HTML supported)</label>
              <div className="flex flex-wrap gap-1 mb-2">
                <span className="text-xs text-gray-500 self-center mr-1">Insert variable:</span>
                {MONTH_VARS.map(v => (
                  <button key={v} onClick={() => insertVar(v)}
                    className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-xs hover:bg-blue-100">
                    {v}
                  </button>
                ))}
              </div>
              <textarea
                value={form.email_body}
                onChange={e => set('email_body', e.target.value)}
                rows={14}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-y"
                placeholder="Enter your custom email body here…"
              />
            </div>

            {/* Preview */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Eye className="w-4 h-4" /> Live Preview
              </p>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 text-xs text-gray-500 border-b border-gray-200">
                  Subject: <span className="font-medium text-gray-700">
                    {form.email_subject.replace('{month}', 'May 2026').replace('{company}', 'Your Company').replace('{employee}', 'Rajesh Kumar')}
                  </span>
                </div>
                <div className="p-4 bg-white text-sm"
                  dangerouslySetInnerHTML={{ __html:
                    (form.email_body || '')
                      .replace(/{month}/g, 'May 2026')
                      .replace(/{company}/g, 'Your Company')
                      .replace(/{employee}/g, 'Rajesh Kumar')
                      .replace(/{employee_id}/g, 'EMP001')
                      .replace(/{net_salary}/g, '₹52,400')
                  }}
                />
              </div>
            </div>

            <button onClick={() => set('email_body', DEFAULT_BODY)}
              className="text-xs text-gray-500 hover:text-gray-700 underline">
              Reset to default template
            </button>
          </div>
        )}

        {/* ── BRANDING TAB ── */}
        {activeTab === 'branding' && (
          <div className="space-y-5">
            <div>
              <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-1">
                <Palette className="w-4 h-4 text-blue-600" /> Branding &amp; Appearance
              </h2>
              <p className="text-sm text-gray-500">
                Your brand colour and logo appear on generated payslip PDFs.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Field label="Primary Brand Colour">
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={form.brand_color}
                    onChange={e => set('brand_color', e.target.value)}
                    className="h-10 w-16 rounded cursor-pointer border border-gray-200"
                  />
                  <input
                    value={form.brand_color}
                    onChange={e => set('brand_color', e.target.value)}
                    placeholder="#1B4F8A"
                    className={`${inputCls} flex-1`}
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {['#1B4F8A','#16a34a','#dc2626','#7c3aed','#ea580c','#0891b2'].map(c => (
                    <button key={c} onClick={() => set('brand_color', c)}
                      className="w-7 h-7 rounded-full border-2 transition-all hover:scale-110"
                      style={{ backgroundColor: c, borderColor: form.brand_color === c ? '#374151' : 'transparent' }}
                    />
                  ))}
                </div>
              </Field>

              <Field label="Logo URL (optional)">
                <input value={form.logo_url} onChange={e => set('logo_url', e.target.value)}
                  placeholder="https://yoursite.com/logo.png" className={inputCls} />
                <p className="text-xs text-gray-400 mt-1">PNG or JPG. Will appear on payslip PDFs.</p>
              </Field>
            </div>

            {/* Brand preview */}
            <div className="mt-4 p-4 rounded-xl border border-gray-200">
              <p className="text-xs text-gray-400 mb-3">Payslip header preview:</p>
              <div className="rounded-lg overflow-hidden border border-gray-200">
                <div className="h-2" style={{ backgroundColor: form.brand_color }} />
                <div className="p-4 flex items-center gap-3" style={{ backgroundColor: form.brand_color + '12' }}>
                  {form.logo_url
                    ? <img src={form.logo_url} alt="logo" className="h-10 object-contain" />
                    : <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: form.brand_color }}>
                        {(form.company_name || 'C').charAt(0)}
                      </div>
                  }
                  <div>
                    <p className="font-bold text-base" style={{ color: form.brand_color }}>
                      {form.company_name || 'Your Company Name'}
                    </p>
                    <p className="text-xs text-gray-500">SALARY SLIP</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom save bar */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save All Settings'}
        </button>
      </div>
    </div>
  );
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent';

function Field({ label, children, required, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}
