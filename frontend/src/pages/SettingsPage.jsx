import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Settings, Mail, Building2, Server, Send, Eye, EyeOff,
  CheckCircle2, AlertCircle, Palette, Save, ExternalLink,
  ChevronDown, ChevronUp, ArrowRight, Loader2, Info
} from 'lucide-react';
import api from '../lib/api';

/* ─── Email provider guide data ─────────────────────────────────────── */
const PROVIDERS = [
  {
    id: 'gmail',
    name: 'Gmail',
    logo: '📧',
    color: '#EA4335',
    bgColor: '#FEF2F2',
    hint: 'Most popular — works with any Gmail account',
    smtp_host: 'smtp.gmail.com',
    smtp_port: '587',
    steps: [
      {
        title: 'Open your Google Account security page',
        desc: 'Click the button below to open Google in a new tab.',
        link: { label: 'Open Google Account Security →', url: 'https://myaccount.google.com/security' },
      },
      {
        title: 'Turn on 2-Step Verification',
        desc: 'Scroll down to "How you sign in to Google". Click 2-Step Verification and turn it ON. (If it already shows a green tick, skip this step.)',
        tip: 'You only need to do this once.',
      },
      {
        title: 'Create an App Password',
        desc: 'After turning on 2-Step Verification, search for "App passwords" in the Google search bar at the top of the page. Click it.',
        link: { label: 'Or click here — App Passwords →', url: 'https://myaccount.google.com/apppasswords' },
      },
      {
        title: 'Name it and copy the password',
        desc: 'In the "App name" box type "PayOS" and click Create. Google will show you a 16-letter password like "abcd efgh ijkl mnop". Copy that password.',
        tip: '⚠️ Copy it now — Google will never show it again.',
      },
      {
        title: 'Paste your details below',
        desc: 'Enter your Gmail address and paste the 16-letter App Password in the fields below. Then click Save & Test.',
      },
    ],
  },
  {
    id: 'outlook',
    name: 'Outlook / Microsoft 365',
    logo: '📨',
    color: '#0078D4',
    bgColor: '#EFF6FF',
    hint: 'For Outlook, Hotmail, Live, or company Microsoft 365',
    smtp_host: 'smtp.office365.com',
    smtp_port: '587',
    steps: [
      {
        title: 'Open Microsoft Security settings',
        desc: 'Click the button below to go to your Microsoft account security page.',
        link: { label: 'Open Microsoft Account Security →', url: 'https://account.microsoft.com/security' },
      },
      {
        title: 'Find "App passwords"',
        desc: 'Click "Advanced security options". Scroll down to "App passwords" and click "Create a new app password".',
        tip: 'If you do not see this option, your IT admin may have disabled it. Contact your IT team.',
      },
      {
        title: 'Copy the password',
        desc: 'Microsoft will show you a password. Copy it — you will need it in the next step.',
        tip: '⚠️ Save this password somewhere safe — Microsoft only shows it once.',
      },
      {
        title: 'Enter your details below',
        desc: 'Type your full Outlook email address and paste the app password in the fields below. Then click Save & Test.',
      },
    ],
  },
  {
    id: 'zoho',
    name: 'Zoho Mail',
    logo: '📬',
    color: '#E42527',
    bgColor: '#FFF5F5',
    hint: 'For Zoho Mail or Zoho One accounts',
    smtp_host: 'smtp.zoho.in',
    smtp_port: '587',
    steps: [
      {
        title: 'Log in to Zoho Mail',
        desc: 'Open Zoho Mail and go to Settings.',
        link: { label: 'Open Zoho Mail →', url: 'https://mail.zoho.in' },
      },
      {
        title: 'Go to Security → App Passwords',
        desc: 'In Zoho Mail settings, click "Security" in the left menu. Then click "App Passwords". Click "Generate New Password", name it "PayOS" and click Generate.',
      },
      {
        title: 'Copy the password',
        desc: 'Copy the generated password shown on screen.',
        tip: '⚠️ This password is shown only once.',
      },
      {
        title: 'Enter your details below',
        desc: 'Type your Zoho email address and paste the password in the fields below. Click Save & Test.',
      },
    ],
  },
  {
    id: 'hostinger',
    name: 'Hostinger / Business Email',
    logo: '🌐',
    color: '#7C3AED',
    bgColor: '#F5F3FF',
    hint: 'For Hostinger or any custom business email (yourname@yourdomain.com)',
    smtp_host: 'smtp.hostinger.com',
    smtp_port: '587',
    steps: [
      {
        title: 'Log in to Hostinger',
        desc: 'Open your Hostinger control panel and go to the Email section.',
        link: { label: 'Open Hostinger →', url: 'https://hpanel.hostinger.com' },
      },
      {
        title: 'Find your email account',
        desc: 'Go to Emails → Email Accounts. Find the email address you want to use for sending payslips.',
      },
      {
        title: 'Use your email password',
        desc: 'For Hostinger business email, you use your regular email account password — no app password needed.',
        tip: 'If you forgot your email password, reset it from the Hostinger control panel.',
      },
      {
        title: 'Enter your details below',
        desc: 'Type your full business email address and your email account password in the fields below. Click Save & Test.',
      },
    ],
  },
  {
    id: 'other',
    name: 'Other / Custom SMTP',
    logo: '⚙️',
    color: '#374151',
    bgColor: '#F9FAFB',
    hint: 'For SendGrid, Mailgun, or any custom SMTP server',
    smtp_host: '',
    smtp_port: '587',
    steps: [
      {
        title: 'Get your SMTP credentials from your provider',
        desc: 'Log in to your email or SMTP service. Find the SMTP settings — usually under Account Settings, API Settings, or Email Configuration.',
      },
      {
        title: 'You need 4 things',
        desc: 'SMTP Host (e.g. smtp.sendgrid.net), Port (usually 587), Username (your email or API username), Password (your email password or API key).',
      },
      {
        title: 'Fill in all fields below',
        desc: 'Enter all the SMTP details you found. Click Save & Test to verify everything works.',
      },
    ],
  },
];

const MONTH_VARS = ['{month}', '{company}', '{employee}', '{employee_id}', '{net_salary}'];

// ── Pre-built email templates (plain language, converted to HTML) ──────────
const EMAIL_TEMPLATES = [
  {
    id: 'friendly',
    name: '😊 Friendly',
    desc: 'Warm, personal tone',
    subject: 'Your Payslip for {month} is Ready!',
    preview: 'Hi {employee}, your {month} payslip is attached. Net salary: {net_salary}.',
    body: `<p>Hi {employee},</p><p>Your payslip for <strong>{month}</strong> is ready. Please find it attached to this email.</p><p>Employee ID: <strong>{employee_id}</strong><br/>Net Salary: <strong>{net_salary}</strong></p><p>If you have any questions, please reach out to your HR team.</p><p>Best regards,<br/>{company} HR Team</p>`,
  },
  {
    id: 'professional',
    name: '💼 Professional',
    desc: 'Formal business tone',
    subject: 'Payslip for {month} — {company}',
    preview: 'Dear {employee}, please find your salary statement for {month} attached.',
    body: `<p>Dear {employee},</p><p>Please find attached your salary statement for <strong>{month}</strong>.</p><p>Employee ID: <strong>{employee_id}</strong><br/>Net Salary: <strong>{net_salary}</strong></p><p>For any queries related to your payslip, please contact the HR department.</p><p>Regards,<br/>{company} Payroll Team</p>`,
  },
  {
    id: 'simple',
    name: '✉️ Short & Simple',
    desc: 'Quick, no extra words',
    subject: '{month} Payslip — {company}',
    preview: 'Hi {employee}, your payslip for {month} is attached.',
    body: `<p>Hi {employee},</p><p>Your payslip for <strong>{month}</strong> is attached.</p><p>Net Salary: <strong>{net_salary}</strong></p><p>– {company} HR</p>`,
  },
  {
    id: 'custom',
    name: '✏️ Write My Own',
    desc: 'Type your own message',
    subject: 'Your Payslip for {month} — {company}',
    preview: 'Write your own custom message in plain English.',
    body: null, // uses form.email_body
  },
];

const DEFAULT_BODY = `<p>Dear {employee},</p><p>Please find attached your payslip for <strong>{month}</strong>.</p><p>Employee ID: <strong>{employee_id}</strong><br/>Net Salary: <strong>{net_salary}</strong></p><p>For any questions, please contact your HR department.</p><p>Regards,<br/>{company} Payroll Team</p>`;

// Convert plain text to simple HTML (for custom mode)
function plainToHtml(text) {
  return text.split('\n').map(l => l.trim() ? `<p>${l}</p>` : '').join('');
}
// Strip HTML tags for display in plain text area
function htmlToPlain(html) {
  return (html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n').replace(/<[^>]+>/g, '').trim();
}

/* ─── Main Page ─────────────────────────────────────────────────────── */
export default function SettingsPage() {
  const [activeTab, setActiveTab]       = useState('company');
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [testing, setTesting]           = useState(false);
  const [showPass, setShowPass]         = useState(false);
  const [selectedProvider, setProvider] = useState(null);
  const [showAdvanced, setAdvanced]     = useState(false);
  const [smtpSaved, setSmtpSaved]       = useState(false);
  const [selectedTpl, setSelectedTpl]   = useState('professional'); // active email template
  const [customNote, setCustomNote]     = useState('');             // plain-text custom message

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
      // Auto-detect provider from saved smtp_host
      if (s.smtp_host) {
        const found = PROVIDERS.find(p => p.smtp_host && s.smtp_host.includes(p.smtp_host.split('.').slice(-2).join('.')));
        if (found) setProvider(found.id);
        setSmtpSaved(true);
      }
    }).catch(() => toast.error('Failed to load settings')).finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/settings', form);
      toast.success('Settings saved!');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  const saveAndTest = async () => {
    if (!form.smtp_host || !form.smtp_user || !form.smtp_pass) {
      toast.error('Please fill in your email address and password first');
      return;
    }
    if (form.smtp_pass === '••••••••') {
      toast.error('Please re-enter your password to test');
      return;
    }
    setSaving(true);
    try {
      await api.put('/settings', form);
      toast.success('Settings saved!');
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save');
      setSaving(false);
      return;
    }
    setSaving(false);
    setTesting(true);
    try {
      const res = await api.post('/settings/test-smtp', {
        smtp_host: form.smtp_host, smtp_port: form.smtp_port,
        smtp_user: form.smtp_user, smtp_pass: form.smtp_pass,
        smtp_from: form.smtp_from || form.smtp_user,
        test_to: form.smtp_user,
      });
      toast.success('🎉 ' + res.data.message);
      setSmtpSaved(true);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Connection failed — check your password and try again');
    } finally { setTesting(false); }
  };

  const pickProvider = (p) => {
    setProvider(p.id);
    setAdvanced(p.id === 'other');
    setSmtpSaved(false);
    if (p.smtp_host) set('smtp_host', p.smtp_host);
    set('smtp_port', p.smtp_port);
  };

  const insertVar = (v) => set('email_body', (form.email_body || '') + v);

  const provider = PROVIDERS.find(p => p.id === selectedProvider);

  const tabs = [
    { id: 'company',  label: 'Company',       icon: Building2 },
    { id: 'smtp',     label: 'Email Setup',   icon: Mail },
    { id: 'template', label: 'Email Message', icon: Send },
    { id: 'branding', label: 'Branding',      icon: Palette },
  ];

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
    </div>
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <Settings className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Settings</h1>
            <p className="text-sm text-gray-400">Manage your company, email and branding</p>
          </div>
        </div>
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50">
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`flex items-center gap-2 flex-1 justify-center py-2 px-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            <t.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">

        {/* ── COMPANY TAB ── */}
        {activeTab === 'company' && (
          <div className="space-y-4">
            <h2 className="font-semibold text-gray-800">Company Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Company Name" required>
                <input value={form.company_name} onChange={e => set('company_name', e.target.value)}
                  placeholder="e.g. Acme Pvt. Ltd." className={inp} />
              </Field>
              <Field label="HR / Payroll Email">
                <input value={form.company_email} onChange={e => set('company_email', e.target.value)}
                  type="email" placeholder="hr@company.com" className={inp} />
              </Field>
              <Field label="Phone">
                <input value={form.company_phone} onChange={e => set('company_phone', e.target.value)}
                  placeholder="+91 98765 43210" className={inp} />
              </Field>
              <Field label="Industry">
                <select value={form.company_industry} onChange={e => set('company_industry', e.target.value)} className={inp}>
                  <option value="">Select…</option>
                  {['Manufacturing','Logistics','IT & Software','Healthcare','Education',
                    'Retail','Construction','Finance','Hospitality','Other'].map(i => (
                    <option key={i} value={i}>{i}</option>
                  ))}
                </select>
              </Field>
              <Field label="Company Size">
                <select value={form.company_size} onChange={e => set('company_size', e.target.value)} className={inp}>
                  <option value="">Select…</option>
                  {['1–10','11–50','51–200','201–500','500+'].map(s => (
                    <option key={s} value={s}>{s} employees</option>
                  ))}
                </select>
              </Field>
              <Field label="Address" className="sm:col-span-2">
                <textarea value={form.company_address} onChange={e => set('company_address', e.target.value)}
                  rows={2} placeholder="Full company address…" className={inp} />
              </Field>
            </div>
          </div>
        )}

        {/* ── SMTP TAB ── */}
        {activeTab === 'smtp' && (
          <div className="space-y-6">

            <div>
              <h2 className="font-semibold text-gray-900 text-lg">Set Up Email Sending</h2>
              <p className="text-sm text-gray-500 mt-1">
                This lets PayOS send payslips directly to your employees from your own email address.
              </p>
            </div>

            {/* Step 1 — Pick provider */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">1</div>
                <p className="font-medium text-gray-800">Which email service do you use?</p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {PROVIDERS.map(p => (
                  <button key={p.id} onClick={() => pickProvider(p)}
                    className={`p-3 rounded-xl border-2 text-left transition-all hover:shadow-sm ${
                      selectedProvider === p.id
                        ? 'border-blue-500 shadow-md'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={selectedProvider === p.id ? { backgroundColor: p.bgColor } : {}}>
                    <div className="text-2xl mb-1">{p.logo}</div>
                    <div className="font-semibold text-sm text-gray-900">{p.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5 leading-tight">{p.hint}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2 — Guide + form */}
            {provider && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">2</div>
                  <p className="font-medium text-gray-800">Follow these steps to get your password</p>
                </div>

                {/* Step cards */}
                <div className="space-y-3 mb-6">
                  {provider.steps.map((step, i) => (
                    <div key={i} className="flex gap-3 p-4 rounded-xl border border-gray-100 bg-gray-50">
                      <div className="w-7 h-7 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: provider.color }}>
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800 text-sm">{step.title}</p>
                        <p className="text-gray-600 text-sm mt-1 leading-relaxed">{step.desc}</p>
                        {step.link && (
                          <a href={step.link.url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg text-sm font-medium text-white"
                            style={{ backgroundColor: provider.color }}>
                            {step.link.label}
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {step.tip && (
                          <div className="flex items-start gap-1.5 mt-2 text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            {step.tip}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Step 3 — Enter credentials */}
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">3</div>
                  <p className="font-medium text-gray-800">Enter your email details</p>
                </div>

                <div className="space-y-3 p-4 rounded-xl border-2 border-blue-100 bg-blue-50">
                  <Field label={`Your ${provider.name} Email Address`} required>
                    <input value={form.smtp_user} onChange={e => { set('smtp_user', e.target.value); if (!form.smtp_from) set('smtp_from', e.target.value); }}
                      type="email" placeholder="yourname@gmail.com" className={inp} />
                  </Field>

                  <Field label={provider.id === 'gmail' ? 'App Password (16 letters from Google)' : provider.id === 'hostinger' ? 'Your Email Password' : 'App Password'} required>
                    <div className="relative">
                      <input type={showPass ? 'text' : 'password'} value={form.smtp_pass}
                        onChange={e => set('smtp_pass', e.target.value)}
                        placeholder={provider.id === 'gmail' ? 'Paste the 16-letter app password here' : 'Paste your password here'}
                        className={`${inp} pr-10`} />
                      <button onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </Field>

                  {/* Advanced — hidden by default */}
                  <button onClick={() => setAdvanced(!showAdvanced)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mt-1">
                    {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    Advanced settings (SMTP host / port / from address)
                  </button>

                  {showAdvanced && (
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-blue-200">
                      <Field label="SMTP Host">
                        <input value={form.smtp_host} onChange={e => set('smtp_host', e.target.value)}
                          placeholder="smtp.gmail.com" className={inp} />
                      </Field>
                      <Field label="Port">
                        <select value={form.smtp_port} onChange={e => set('smtp_port', e.target.value)} className={inp}>
                          <option value="587">587 (recommended)</option>
                          <option value="465">465 (SSL)</option>
                          <option value="25">25</option>
                        </select>
                      </Field>
                      <Field label="From Name / Address" className="col-span-2">
                        <input value={form.smtp_from} onChange={e => set('smtp_from', e.target.value)}
                          placeholder="HR Payroll <payroll@yourcompany.com>" className={inp} />
                      </Field>
                    </div>
                  )}
                </div>

                {/* Step 4 — Save & Test */}
                <div className="flex items-center gap-2 mt-5 mb-4">
                  <div className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">4</div>
                  <p className="font-medium text-gray-800">Save and send a test email</p>
                </div>

                <button onClick={saveAndTest} disabled={saving || testing}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: provider.color }}>
                  {(saving || testing)
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> {saving ? 'Saving…' : 'Sending test email…'}</>
                    : <><Send className="w-4 h-4" /> Save Settings &amp; Send Test Email <ArrowRight className="w-4 h-4" /></>
                  }
                </button>

                <p className="text-xs text-gray-400 text-center mt-2">
                  This will save your settings and send a test email to <strong>{form.smtp_user || 'your email'}</strong> to confirm everything is working.
                </p>

                {/* Success badge */}
                {smtpSaved && (
                  <div className="flex items-center gap-2 mt-3 p-3 bg-green-50 rounded-xl border border-green-200">
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-green-800">Email is connected!</p>
                      <p className="text-xs text-green-600">Payslips will now be sent from your {provider.name} account.</p>
                    </div>
                  </div>
                )}

                {/* Warning if not set */}
                {!smtpSaved && !form.smtp_host && (
                  <div className="flex items-center gap-2 mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-700">Email not yet configured. Payslips will be <strong>simulated</strong> (not actually sent to employees).</p>
                  </div>
                )}
              </div>
            )}

            {!provider && (
              <div className="text-center py-6 text-gray-400 text-sm">
                ☝️ Select your email provider above to get started
              </div>
            )}
          </div>
        )}

        {/* ── EMAIL TEMPLATE TAB ── */}
        {activeTab === 'template' && (
          <div className="space-y-5">
            <div>
              <h2 className="font-semibold text-gray-900">Email Message</h2>
              <p className="text-sm text-gray-500 mt-1">
                Choose how your email will sound. Click a style to select it.
              </p>
            </div>

            {/* Subject line */}
            <Field label="Email Subject Line">
              <input value={form.email_subject} onChange={e => set('email_subject', e.target.value)}
                placeholder="Your Payslip for {month} — {company}" className={inp} />
              <p className="text-xs text-gray-400 mt-1">
                <strong>{'{month}'}</strong> becomes "May 2026", <strong>{'{company}'}</strong> becomes your company name, <strong>{'{employee}'}</strong> becomes the employee's name.
              </p>
            </Field>

            {/* Template picker cards */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Choose a message style:</p>
              <div className="grid grid-cols-2 gap-3">
                {EMAIL_TEMPLATES.map(tpl => (
                  <button key={tpl.id} type="button"
                    onClick={() => {
                      setSelectedTpl(tpl.id);
                      if (tpl.body) {
                        set('email_body', tpl.body);
                        set('email_subject', tpl.subject);
                      }
                    }}
                    className={`text-left p-4 rounded-xl border-2 transition-all ${
                      selectedTpl === tpl.id
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}>
                    <p className="font-semibold text-sm text-gray-900">{tpl.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{tpl.desc}</p>
                    <p className="text-xs text-gray-600 mt-2 leading-relaxed italic">
                      "{tpl.preview.replace(/{employee}/g,'Ravi').replace(/{month}/g,'May 2026').replace(/{net_salary}/g,'₹42,500')}"
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom message area — only shown for "Write My Own" */}
            {selectedTpl === 'custom' && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Write your message in plain English:</p>
                <textarea
                  value={customNote || htmlToPlain(form.email_body)}
                  onChange={e => {
                    setCustomNote(e.target.value);
                    set('email_body', plainToHtml(e.target.value));
                  }}
                  rows={7}
                  placeholder={`Hi {employee},\n\nYour payslip for {month} is attached. Your net salary is {net_salary}.\n\nFor questions, contact HR.\n\nRegards,\n{company} HR Team`}
                  className={`${inp} resize-y text-sm`}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Just type normally. Use <strong>{'{employee}'}</strong>, <strong>{'{month}'}</strong>, <strong>{'{net_salary}'}</strong>, <strong>{'{company}'}</strong> where you want them auto-filled.
                </p>
              </div>
            )}

            {/* Live preview */}
            <div className="border border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-gray-100 px-4 py-2.5 text-xs text-gray-600 border-b flex items-center gap-2">
                <span>📧</span>
                <div>
                  <span className="text-gray-400">Subject: </span>
                  <span className="font-medium text-gray-800">
                    {(form.email_subject || '')
                      .replace('{month}','May 2026')
                      .replace('{company}', form.company_name || 'Your Company')
                      .replace('{employee}','Ravi Kumar')}
                  </span>
                </div>
              </div>
              <div className="p-5 text-sm text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html:
                  (form.email_body || '')
                    .replace(/{month}/g, 'May 2026')
                    .replace(/{company}/g, form.company_name || 'Your Company')
                    .replace(/{employee}/g, 'Ravi Kumar')
                    .replace(/{employee_id}/g, 'EMP001')
                    .replace(/{net_salary}/g, '₹42,500')
                }} />
              <div className="bg-gray-50 border-t border-dashed border-gray-200 px-5 py-3 text-xs text-gray-400">
                📎 Payslip_Ravi_Kumar_May_2026.pdf (attached automatically)
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center">
              The payslip PDF is always attached automatically. You don't need to mention it unless you want to.
            </p>
          </div>
        )}

        {/* ── BRANDING TAB ── */}
        {activeTab === 'branding' && (
          <div className="space-y-5">
            <div>
              <h2 className="font-semibold text-gray-900">Branding</h2>
              <p className="text-sm text-gray-500 mt-1">Your colour and logo appear on payslip PDFs sent to employees.</p>
            </div>

            <Field label="Your Brand Colour">
              <div className="flex gap-3 items-center">
                <input type="color" value={form.brand_color} onChange={e => set('brand_color', e.target.value)}
                  className="h-10 w-16 rounded cursor-pointer border border-gray-200" />
                <input value={form.brand_color} onChange={e => set('brand_color', e.target.value)}
                  placeholder="#1B4F8A" className={`${inp} flex-1`} />
              </div>
              <div className="flex gap-2 mt-2">
                {['#1B4F8A','#16a34a','#dc2626','#7c3aed','#ea580c','#0891b2'].map(c => (
                  <button key={c} onClick={() => set('brand_color', c)}
                    className="w-8 h-8 rounded-full border-2 transition-all hover:scale-110"
                    style={{ backgroundColor: c, borderColor: form.brand_color === c ? '#374151' : 'transparent' }} />
                ))}
              </div>
            </Field>

            <Field label="Company Logo URL (optional)">
              <input value={form.logo_url} onChange={e => set('logo_url', e.target.value)}
                placeholder="https://yoursite.com/logo.png" className={inp} />
              <p className="text-xs text-gray-400 mt-1">Link to your logo image. Will show on payslip PDFs. (PNG or JPG)</p>
            </Field>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Payslip header preview:</p>
              <div className="rounded-xl overflow-hidden border border-gray-200">
                <div className="h-2" style={{ backgroundColor: form.brand_color }} />
                <div className="p-4 flex items-center gap-3" style={{ backgroundColor: form.brand_color + '15' }}>
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
                    <p className="text-xs text-gray-400">SALARY SLIP — MAY 2026</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex justify-end">
        <button onClick={save} disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50">
          <Save className="w-4 h-4" />
          {saving ? 'Saving…' : 'Save All Settings'}
        </button>
      </div>
    </div>
  );
}

const inp = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none';

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
