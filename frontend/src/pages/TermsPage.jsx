import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  const navigate = useNavigate();
  const LAST_UPDATED = '20 May 2026';
  const COMPANY = 'DinMind Technologies';
  const APP = 'PayLeef';
  const EMAIL = 'legal@dinmind.com';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Terms of Service</h1>
            <p className="text-xs text-slate-400">Last updated: {LAST_UPDATED}</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-10 prose prose-slate max-w-none">

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-sm text-amber-800 mb-8">
          <strong>Important:</strong> Please read these Terms of Service carefully before using {APP}. By creating an account or using our service, you agree to be bound by these terms.
        </div>

        <Section title="1. About These Terms">
          <p>These Terms of Service ("Terms") govern your use of {APP}, a payroll management software-as-a-service ("Service") operated by <strong>{COMPANY}</strong> ("we", "us", or "our"), a company registered in India.</p>
          <p>These Terms are governed by the <strong>Information Technology Act, 2000</strong>, the <strong>Information Technology (Amendment) Act, 2008</strong>, the <strong>Digital Personal Data Protection Act, 2023 (DPDPA)</strong>, and all applicable Indian laws.</p>
          <p>By accessing or using the Service, you ("User", "you", or "your") confirm that you have read, understood, and agree to these Terms. If you do not agree, do not use the Service.</p>
        </Section>

        <Section title="2. Description of Service">
          <p>{APP} is a cloud-based payroll management platform designed for Indian businesses. It provides features including but not limited to:</p>
          <ul>
            <li>Employee data management</li>
            <li>Payslip generation and distribution</li>
            <li>Salary computation and payroll processing</li>
            <li>Statutory compliance reports (PF, ESI, PT, TDS)</li>
            <li>Email delivery of payslips to employees</li>
          </ul>
          <p>We reserve the right to modify, suspend, or discontinue any part of the Service at any time with reasonable notice.</p>
        </Section>

        <Section title="3. Account Registration and Eligibility">
          <ul>
            <li>You must be at least 18 years of age to use this Service.</li>
            <li>You must provide accurate, current, and complete information during registration.</li>
            <li>You are responsible for maintaining the security of your account credentials.</li>
            <li>You must immediately notify us of any unauthorised access to your account.</li>
            <li>One person or legal entity may not maintain more than one free account.</li>
            <li>Your account is for business use only. You must be authorised to act on behalf of the organisation you register.</li>
          </ul>
        </Section>

        <Section title="4. Data Responsibility and Ownership">
          <p><strong>Your data belongs to you.</strong> You retain ownership of all employee data, payroll data, and company information you upload or create in the Service.</p>
          <p>By using the Service, you grant us a limited, non-exclusive licence to process and store your data solely for the purpose of providing the Service to you.</p>
          <p><strong>You are responsible for:</strong></p>
          <ul>
            <li>Ensuring the accuracy and legality of the data you input into the Service.</li>
            <li>Obtaining consent from your employees to store and process their personal data.</li>
            <li>Complying with all applicable data protection laws, including the DPDPA 2023.</li>
            <li>Ensuring you have the right to share any data you upload with us.</li>
          </ul>
        </Section>

        <Section title="5. Limitation of Liability — Data Loss and Security">
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-900 mb-4">
            <strong>⚠️ Important Disclaimer:</strong> Please read this section carefully.
          </div>
          <p>To the maximum extent permitted by applicable law:</p>
          <ul>
            <li><strong>{COMPANY} is not responsible for any data loss</strong>, corruption, or accidental deletion of data stored on the Service.</li>
            <li>In the event of a security breach, cyberattack, or unauthorised access to your data — whether caused by our systems or external factors — <strong>{COMPANY} shall not be liable for any direct, indirect, incidental, or consequential damages</strong> arising from such events.</li>
            <li>We implement industry-standard security measures including encryption, secure access controls, and regular backups, but <strong>we cannot guarantee absolute security</strong> of data transmitted over the internet or stored on our servers.</li>
            <li>You agree to maintain your own backups of critical data and not rely solely on the Service for data storage.</li>
            <li>Our total liability to you for any claim arising from the use of the Service shall not exceed the amount you paid us in the three (3) months preceding the claim.</li>
          </ul>
          <p>This limitation applies regardless of the legal theory under which the claim arises, including but not limited to breach of contract, negligence, or statutory liability under the IT Act 2000.</p>
        </Section>

        <Section title="6. Acceptable Use">
          <p>You agree not to use the Service to:</p>
          <ul>
            <li>Upload or transmit false, fraudulent, or misleading employee or payroll data.</li>
            <li>Violate any applicable Indian law, including labour laws, tax laws, or data protection regulations.</li>
            <li>Attempt to gain unauthorised access to other users' accounts or data.</li>
            <li>Reverse engineer, decompile, or attempt to extract the source code of the Service.</li>
            <li>Use the Service to send spam, phishing, or unsolicited communications.</li>
            <li>Overload, damage, or disrupt the infrastructure of the Service.</li>
          </ul>
        </Section>

        <Section title="7. Payment and Subscription">
          <ul>
            <li>We offer a free trial period as stated on our website. After the trial, continued access requires a paid subscription.</li>
            <li>Subscription fees are billed in advance and are non-refundable unless required by law.</li>
            <li>We reserve the right to change our pricing with 30 days' notice.</li>
            <li>Failure to pay may result in suspension or termination of your account.</li>
          </ul>
        </Section>

        <Section title="8. Termination">
          <p>You may terminate your account at any time by contacting us at <a href={`mailto:${EMAIL}`} className="text-green-600">{EMAIL}</a>.</p>
          <p>We may suspend or terminate your access immediately if:</p>
          <ul>
            <li>You breach these Terms.</li>
            <li>You engage in fraudulent or illegal activity.</li>
            <li>Payment is overdue and not remedied within 14 days of notice.</li>
          </ul>
          <p>Upon termination, you may request an export of your data within 30 days. After this period, we may permanently delete your data.</p>
        </Section>

        <Section title="9. Intellectual Property">
          <p>The Service, including all software, designs, trademarks, and content (excluding your data), is owned by {COMPANY} and protected under applicable Indian intellectual property laws.</p>
          <p>You may not copy, modify, distribute, or create derivative works of the Service without our express written consent.</p>
        </Section>

        <Section title="10. Governing Law and Dispute Resolution">
          <p>These Terms shall be governed by and construed in accordance with the laws of India.</p>
          <p>Any dispute arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts in <strong>Chennai, Tamil Nadu, India</strong>.</p>
          <p>Before initiating legal proceedings, both parties agree to attempt good-faith resolution for a period of 30 days.</p>
        </Section>

        <Section title="11. Changes to These Terms">
          <p>We may update these Terms from time to time. We will notify you of material changes via email or prominent notice on the Service.</p>
          <p>Continued use of the Service after changes are effective constitutes acceptance of the revised Terms.</p>
        </Section>

        <Section title="12. Contact Us">
          <p>For questions, concerns, or legal notices regarding these Terms, contact us at:</p>
          <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 text-sm text-slate-700">
            <strong>{COMPANY}</strong><br />
            Chennai, Tamil Nadu, India<br />
            Email: <a href={`mailto:${EMAIL}`} className="text-green-600">{EMAIL}</a>
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
