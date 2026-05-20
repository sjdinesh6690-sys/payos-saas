import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  const navigate = useNavigate();
  const LAST_UPDATED = '20 May 2026';
  const COMPANY = 'DinMind Technologies';
  const APP = 'PayLeef';
  const EMAIL = 'privacy@dinmind.com';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Privacy Policy</h1>
            <p className="text-xs text-slate-400">Last updated: {LAST_UPDATED}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10">

        <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-sm text-blue-800 mb-8">
          <strong>Your privacy matters to us.</strong> This policy explains what data we collect, why we collect it, how we protect it, and your rights under Indian law — including the <strong>Digital Personal Data Protection Act, 2023 (DPDPA)</strong> and the <strong>Information Technology Act, 2000</strong>.
        </div>

        <Section title="1. Who We Are">
          <p><strong>{COMPANY}</strong> ("we", "us", "our") operates <strong>{APP}</strong>, a payroll management platform for Indian businesses. We are the Data Fiduciary as defined under the DPDPA 2023.</p>
          <p>Contact: <a href={`mailto:${EMAIL}`} className="text-green-600">{EMAIL}</a></p>
        </Section>

        <Section title="2. What Data We Collect">
          <p><strong>Account data (you provide):</strong></p>
          <ul>
            <li>Company name, email address, password</li>
            <li>Company address, phone, GSTIN, PAN, and other statutory details</li>
            <li>SMTP email configuration (stored encrypted)</li>
          </ul>
          <p><strong>Employee data (you upload on behalf of your employees):</strong></p>
          <ul>
            <li>Employee names, ID numbers, email addresses, phone numbers</li>
            <li>Department, designation, date of joining</li>
            <li>Salary details, bank account numbers, IFSC codes</li>
            <li>PF UAN, ESIC number, PAN (for statutory reports)</li>
            <li>Payslip records and payroll history</li>
          </ul>
          <p><strong>Usage data (collected automatically):</strong></p>
          <ul>
            <li>Login timestamps, IP addresses, browser type</li>
            <li>Actions taken within the platform (for audit logs)</li>
            <li>Error logs for debugging and support</li>
          </ul>
        </Section>

        <Section title="3. Why We Collect This Data">
          <p>We process your data only for the following purposes:</p>
          <ul>
            <li><strong>To provide the Service</strong> — generating payslips, computing payroll, sending emails to employees.</li>
            <li><strong>To provide compliance reports</strong> — PF, ESI, PT, TDS, and bank payment files.</li>
            <li><strong>Account security</strong> — authentication, password resets, fraud detection.</li>
            <li><strong>Customer support</strong> — diagnosing and fixing issues you report.</li>
            <li><strong>Legal obligations</strong> — complying with court orders, audits, or regulatory requirements.</li>
          </ul>
          <p>We do <strong>not</strong> sell your data. We do <strong>not</strong> use your data for advertising.</p>
        </Section>

        <Section title="4. How We Protect Your Data">
          <ul>
            <li><strong>Encryption at rest:</strong> Sensitive fields (SMTP passwords, bank details) are encrypted using AES-256-GCM.</li>
            <li><strong>Encryption in transit:</strong> All data transmitted to/from our servers uses TLS/HTTPS.</li>
            <li><strong>Access controls:</strong> Each admin can only access their own company's data. Employee logins are scoped to their own payslips only.</li>
            <li><strong>Passwords:</strong> Stored using bcrypt hashing — we cannot read your password.</li>
            <li><strong>Audit logs:</strong> All significant actions are logged with timestamps and IP addresses.</li>
            <li><strong>Regular backups:</strong> Data is backed up regularly to prevent loss.</li>
          </ul>
          <p>Despite these measures, <strong>no system can be guaranteed 100% secure</strong>. We encourage you to use strong passwords and keep your credentials private.</p>
        </Section>

        <Section title="5. Data Sharing">
          <p>We share your data only in these limited circumstances:</p>
          <ul>
            <li><strong>Your employees:</strong> We send payslips to employees at your instruction.</li>
            <li><strong>Infrastructure providers:</strong> We use trusted cloud providers (e.g. Render, Neon/PostgreSQL) to host the Service. These providers process data under strict agreements and do not have access to read your data.</li>
            <li><strong>Legal requirements:</strong> We may disclose data if required by a valid court order, government authority, or to comply with applicable Indian law.</li>
          </ul>
          <p>We do <strong>not</strong> share your data with marketers, advertisers, or third parties for commercial purposes.</p>
        </Section>

        <Section title="6. Your Rights Under DPDPA 2023">
          <p>As a Data Principal under the Digital Personal Data Protection Act, 2023, you (and your employees as data principals of their personal data) have the following rights:</p>
          <ul>
            <li><strong>Right to access</strong> — Request a copy of the personal data we hold about you.</li>
            <li><strong>Right to correction</strong> — Request correction of inaccurate or incomplete data.</li>
            <li><strong>Right to erasure</strong> — Request deletion of your account and associated data (subject to legal retention obligations).</li>
            <li><strong>Right to grievance redressal</strong> — Raise a complaint or concern, which we will respond to within 30 days.</li>
            <li><strong>Right to nominate</strong> — Nominate another person to exercise these rights on your behalf.</li>
          </ul>
          <p>To exercise these rights, email us at <a href={`mailto:${EMAIL}`} className="text-green-600">{EMAIL}</a>.</p>
        </Section>

        <Section title="7. Data Retention">
          <ul>
            <li>We retain your account and payroll data for as long as your account is active.</li>
            <li>After account closure, we retain data for <strong>90 days</strong> to allow recovery, then permanently delete it.</li>
            <li>Audit logs may be retained for up to <strong>2 years</strong> for legal and compliance purposes.</li>
            <li>You may request earlier deletion by contacting us at <a href={`mailto:${EMAIL}`} className="text-green-600">{EMAIL}</a>.</li>
          </ul>
        </Section>

        <Section title="8. Cookies">
          <p>We use minimal cookies required for authentication (session tokens stored in browser localStorage). We do not use tracking cookies or third-party advertising cookies.</p>
        </Section>

        <Section title="9. Children's Privacy">
          <p>The Service is not intended for use by anyone under 18 years of age. We do not knowingly collect personal data from minors. If you believe a minor has provided us with personal data, contact us immediately.</p>
        </Section>

        <Section title="10. Changes to This Policy">
          <p>We may update this Privacy Policy as required by law or as our practices change. We will notify you of significant changes by email or prominent notice within the Service. Continued use after such notice constitutes acceptance of the updated Policy.</p>
        </Section>

        <Section title="11. Grievance Officer">
          <p>As required by the Information Technology Act, 2000 and DPDPA 2023, we have appointed a Grievance Officer:</p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-sm text-slate-700">
            <strong>Grievance Officer — {COMPANY}</strong><br />
            Email: <a href={`mailto:${EMAIL}`} className="text-green-600">{EMAIL}</a><br />
            Address: Chennai, Tamil Nadu, India<br />
            <span className="text-slate-500 text-xs mt-1 block">We will respond to your grievance within 30 days of receipt.</span>
          </div>
        </Section>

      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold text-slate-900 mb-3 pb-2 border-b border-slate-200">{title}</h2>
      <div className="text-sm text-slate-700 space-y-3 leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5">
        {children}
      </div>
    </div>
  );
}
