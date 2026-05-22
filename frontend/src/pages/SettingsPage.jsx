import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Settings, Mail, Building2, Send,
  CheckCircle2, AlertCircle, Palette, Save,
  Loader2, Info
} from 'lucide-react';
import api from '../lib/api';

/* ─── Email provider guide data — kept for reference, not displayed ─── */
const _PROVIDERS_UNUSED = [
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
        desc: 'In the "App name" box type "PayLeef" and click Create. Google will show you a 16-letter password like "abcd efgh ijkl mnop". Copy that password.',
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
        desc: 'In Zoho Mail settings, click "Security" in the left menu. Then click "App Passwords". Click "Generate New Password", name it "PayLeef" and click Generate.',
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
  const [testEmailTo, setTestEmailTo]   = useState('');
  const [emailTested, setEmailTested]   = useState(false);
  const [selectedTpl, setSelectedTpl]   = useState('professional'); // active email template
  const [customNote, setCustomNote]     = useState('');             // plain-text custom message

  const [form, setForm] = useState({
    company_name: '', company_email: '', company_phone: '', company_address: '',
    company_industry: '', company_size: '',
    // Statutory registration
    pan_number: '', tan_number: '', epfo_code: '', esic_code: '', pt_reg_number: '', state: '',
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
        pan_number:       s.pan_number       || '',
        tan_number:       s.tan_number       || '',
        epfo_code:        s.epfo_code        || '',
        esic_code:        s.esic_code        || '',
        pt_reg_number:    s.pt_reg_number    || '',
        state:            s.state            || '',
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

  const sendTestEmail = async () => {
    const to = testEmailTo || form.company_email;
    if (!to) {
      toast.error('Please enter an email address to send the test to');
      return;
    }
    setTesting(true);
    try {
      const res = await api.post('/settings/test-email', { test_to: to });
      toast.success('🎉 ' + res.data.message);
      setEmailTested(true);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to send test email — contact PayLeef support');
    } finally { setTesting(false); }
  };

  const insertVar = (v) => set('email_body', (form.email_body || '') + v);

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

            {/* Statutory registration numbers */}
            <div className="pt-4 border-t border-gray-100">
              <div className="mb-3">
                <h3 className="font-semibold text-gray-800 text-sm">📋 Statutory Registration Numbers</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  These appear on PF, ESI, PT, TDS, and Compliance reports. Required for official filing.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Company PAN">
                  <input value={form.pan_number} onChange={e => set('pan_number', e.target.value)}
                    placeholder="e.g. AABCA1234Z" className={inp} />
                </Field>
                <Field label="TAN (Tax Deduction Account Number)">
                  <input value={form.tan_number} onChange={e => set('tan_number', e.target.value)}
                    placeholder="e.g. CHET00000A" className={inp} />
                </Field>
                <Field label="EPFO Establishment Code (for PF Report)">
                  <input value={form.epfo_code} onChange={e => set('epfo_code', e.target.value)}
                    placeholder="e.g. TN/CHN/1234567" className={inp} />
                </Field>
                <Field label="ESIC Establishment Code (for ESI Report)">
                  <input value={form.esic_code} onChange={e => set('esic_code', e.target.value)}
                    placeholder="e.g. 41000123456789000" className={inp} />
                </Field>
                <Field label="Professional Tax Registration No.">
                  <input value={form.pt_reg_number} onChange={e => set('pt_reg_number', e.target.value)}
                    placeholder="e.g. PT/TN/12345" className={inp} />
                </Field>
                <Field label="State (for PT Report)">
                  <select value={form.state} onChange={e => set('state', e.target.value)} className={inp}>
                    <option value="">Select state…</option>
                    {['Andhra Pradesh','Assam','Bihar','Chhattisgarh','Delhi','Goa','Gujarat',
                      'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
                      'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
                      'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
                      'Uttarakhand','West Bengal'].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          </div>
        )}

        {/* ── EMAIL SETUP TAB ── */}
        {activeTab === 'smtp' && (
          <div className="space-y-6">

            <div>
              <h2 className="font-semibold text-gray-900 text-lg">Email Setup</h2>
              <p className="text-sm text-gray-500 mt-1">
                PayLeef sends payslips to your employees automatically. No setup needed — it just works.
              </p>
            </div>

            {/* Info card */}
            <div className="flex gap-4 p-5 rounded-xl bg-green-50 border border-green-200">
              <div className="text-3xl">✅</div>
              <div>
                <p className="font-semibold text-green-900">Email delivery is active</p>
                <p className="text-sm text-green-700 mt-1">
                  All payslips are sent via <strong>payroll@dinmind.com</strong> through PayLeef's built-in email system.
                  Employees reply to <strong>{form.company_email || 'your company email'}</strong>.
                </p>
                <p className="text-xs text-green-600 mt-2">
                  No SMTP configuration required. Emails are delivered reliably on every platform.
                </p>
              </div>
            </div>

            {/* Test email */}
            <div className="p-5 rounded-xl border border-gray-200 space-y-3">
              <p className="font-medium text-gray-800">Send a test email to verify delivery</p>
              <p className="text-sm text-gray-500">
                Enter any email address below and click Send Test. You should receive it within 30 seconds.
              </p>
              <div className="flex gap-3">
                <input
                  type="email"
                  value={testEmailTo || form.company_email}
                  onChange={e => setTestEmailTo(e.target.value)}
                  placeholder={form.company_email || 'yourname@company.com'}
                  className={`${inp} flex-1`}
                />
                <button
                  onClick={sendTestEmail}
                  disabled={testing}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 disabled:opacity-50 shrink-0"
                >
                  {testing
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                    : <><Send className="w-4 h-4" /> Send Test</>
                  }
                </button>
              </div>
              {emailTested && (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  <p className="text-sm text-green-800">Test email sent! Check your inbox.</p>
                </div>
              )}
            </div>

            {/* Reply-to info */}
            <div className="flex gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm text-blue-800">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Reply-To address:</strong> When employees reply to their payslip email, replies go to
                <strong> {form.company_email || 'your company email (set it in the Company tab)'}</strong>.
                Make sure your company HR / payroll email is set correctly in the Company tab.
              </div>
            </div>

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
