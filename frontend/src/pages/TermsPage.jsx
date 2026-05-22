export default function TermsPage() {
  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', padding: '48px 16px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto', background: '#fff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '48px 56px', boxShadow: '0 4px 24px rgba(0,0,0,.06)' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 40, paddingBottom: 32, borderBottom: '2px solid #e2e8f0' }}>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-.04em', marginBottom: 8 }}>
            <span style={{ color: '#0f172a' }}>Pay</span><span style={{ color: '#1A7A4A' }}>Leef</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', margin: '0 0 8px' }}>Terms of Service &amp; Privacy Policy</h1>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>
            Effective Date: 1 January 2025 &nbsp;|&nbsp; Last Updated: 21 May 2025 &nbsp;|&nbsp;
            Governed by the laws of India
          </p>
        </div>

        {/* Legal body — small font */}
        <div style={{ fontSize: 10.5, color: '#475569', lineHeight: 1.75 }}>

          <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
            PLEASE READ THESE TERMS CAREFULLY BEFORE USING PAYLEEF.
          </p>
          <p style={{ marginBottom: 20 }}>
            By accessing or using the PayLeef platform ("Service"), you ("Client", "User", "Subscriber") unconditionally accept
            and agree to be bound by these Terms of Service ("Terms"), the Privacy Policy, and all policies referenced herein.
            If you do not agree, you must immediately cease all use of the Service.
          </p>

          <Section title="1. Provider Identity">
            The Service is provided by <strong>Dinmind Infotech Private Limited (OPC)</strong>, a company incorporated under the
            Companies Act, 2013, with its registered office in Chennai, Tamil Nadu, India ("Dinmind", "We", "Us", "Company").
            Contact: <strong>support@dinmind.com</strong>.
          </Section>

          <Section title="2. Description of Service">
            PayLeef is a Software-as-a-Service (SaaS) payroll management platform that enables businesses to process employee
            salaries, generate payslips, manage employee records, and produce statutory reports. The Service is provided on an
            "as-is" and "as-available" basis. Dinmind reserves the absolute right to modify, suspend, discontinue, or change
            any aspect of the Service at any time without prior notice or liability.
          </Section>

          <Section title="3. Account Registration &amp; Eligibility">
            3.1 You must be at least 18 years of age and legally authorised to enter contracts under Indian law to register.<br/>
            3.2 You are solely responsible for maintaining the confidentiality of your login credentials. All activities under
            your account are your sole responsibility.<br/>
            3.3 Dinmind reserves the right to suspend or terminate any account at its sole discretion, without prior notice,
            for any reason including but not limited to suspected misuse, non-payment, or breach of these Terms.
          </Section>

          <Section title="4. Subscription, Pricing &amp; Payment">
            4.1 Subscription fees are billed monthly or annually as selected at sign-up. All prices are inclusive of applicable
            GST unless stated otherwise.<br/>
            4.2 A 30-day free trial is provided for new accounts. Dinmind may modify or withdraw the trial offer at any time.<br/>
            4.3 Subscriptions auto-renew unless cancelled before the renewal date. Refunds are issued solely at Dinmind's
            discretion and are not guaranteed.<br/>
            4.4 Dinmind may revise pricing at any time. Existing subscribers will receive 30 days' notice of price changes.
            Continued use after the notice period constitutes acceptance of the new pricing.<br/>
            4.5 Dinmind shall not be liable for any payment errors, double charges, or failed transactions caused by third-party
            payment gateways.
          </Section>

          <Section title="5. Data Ownership &amp; Usage">
            5.1 You retain ownership of the employee and payroll data you input into the Service ("Client Data").<br/>
            5.2 You grant Dinmind a non-exclusive, worldwide, royalty-free licence to store, process, and use Client Data
            solely to provide and improve the Service.<br/>
            5.3 Dinmind may use anonymised, aggregated, non-personally identifiable data derived from Service usage for
            analytics, product improvement, and business intelligence purposes without restriction.<br/>
            5.4 Dinmind does not sell personally identifiable Client Data to third parties.
          </Section>

          <Section title="6. Data Security &amp; Confidentiality">
            6.1 Dinmind employs industry-standard security measures including encryption and access controls. However, no
            system is 100% secure. Dinmind does not guarantee absolute security of Client Data.<br/>
            6.2 Dinmind shall not be liable for any data breach, unauthorised access, or data loss caused by factors beyond
            its reasonable control including cyberattacks, third-party infrastructure failures, or force majeure events.<br/>
            6.3 You are responsible for ensuring that your use of the Service complies with applicable data protection laws
            including the Digital Personal Data Protection Act, 2023.
          </Section>

          <Section title="7. Accuracy of Payroll Calculations">
            7.1 PayLeef calculates payroll based on the configuration and data you provide. The accuracy of all payroll
            outputs depends entirely on the accuracy of the inputs you supply.<br/>
            7.2 Dinmind does not guarantee that payroll calculations will be free from errors caused by incorrect data entry,
            misconfiguration, or changes in statutory regulations not yet reflected in the platform.<br/>
            7.3 <strong>You are solely responsible for verifying all salary calculations, statutory deductions, and payslips
            before distributing them to employees or submitting to government authorities.</strong><br/>
            7.4 Dinmind shall not be held liable for any financial loss, statutory penalties, employee disputes, or legal
            proceedings arising from payroll errors or miscalculations, howsoever caused.
          </Section>

          <Section title="8. Statutory Compliance Disclaimer">
            8.1 PayLeef generates reports and calculations to assist with PF, ESI, PT, and TDS compliance. These are
            provided as a convenience tool only and do not constitute professional legal, tax, or accounting advice.<br/>
            8.2 Tax laws, statutory rates, and compliance requirements change frequently. Dinmind endeavours to keep the
            platform updated but does not guarantee that all calculations will always reflect the latest legal requirements.<br/>
            8.3 <strong>You must independently verify all statutory compliance obligations with a qualified Chartered
            Accountant, HR professional, or legal advisor. Dinmind accepts no liability for any non-compliance, penalties,
            interest, or legal action by any government authority.</strong>
          </Section>

          <Section title="9. Limitation of Liability">
            9.1 TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, DINMIND INFOTECH PRIVATE LIMITED (OPC), ITS DIRECTORS,
            EMPLOYEES, AGENTS, AND AFFILIATES SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
            PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, LOSS OF DATA, LOSS OF GOODWILL,
            OR ANY OTHER INTANGIBLE LOSSES, ARISING OUT OF OR IN CONNECTION WITH THE SERVICE.<br/>
            9.2 Dinmind's total aggregate liability to you for any claim arising from or related to the Service shall not
            exceed the total subscription fees paid by you in the three (3) months immediately preceding the claim.<br/>
            9.3 Dinmind shall not be liable for any service interruptions, downtime, or data unavailability caused by
            third-party hosting providers, internet service providers, or force majeure events.
          </Section>

          <Section title="10. Indemnification">
            You agree to indemnify, defend, and hold harmless Dinmind Infotech Private Limited (OPC), its directors, officers,
            employees, and agents from and against any and all claims, damages, losses, liabilities, costs, and expenses
            (including reasonable legal fees) arising from: (a) your use of the Service; (b) your violation of these Terms;
            (c) your violation of any applicable law; (d) any data you input into the Service; or (e) any dispute between you
            and your employees arising from payroll processing.
          </Section>

          <Section title="11. Prohibited Use">
            You must not use the Service for any unlawful purpose, to process payroll for employees not legally employed by
            you, to generate fraudulent payslips, or to evade statutory obligations. Dinmind reserves the right to report
            suspected fraudulent activity to appropriate authorities without prior notice to you.
          </Section>

          <Section title="12. Intellectual Property">
            All software, code, designs, algorithms, trade names, trademarks ("PayLeef", "Dinmind"), and content forming
            part of the Service are the exclusive property of Dinmind Infotech Private Limited (OPC) and are protected under
            applicable intellectual property laws. You acquire no rights in Dinmind's intellectual property by virtue of
            these Terms or use of the Service.
          </Section>

          <Section title="13. Third-Party Services">
            The Service integrates with third-party services (email delivery, cloud hosting, payment gateways). Dinmind is
            not responsible for the availability, security, or performance of third-party services. Your use of third-party
            services is governed by those parties' own terms and policies.
          </Section>

          <Section title="14. Service Modifications &amp; Discontinuation">
            Dinmind may modify, enhance, reduce, or discontinue any feature of the Service at any time without liability.
            In the event of discontinuation of the Service, Dinmind will provide at least 30 days' notice to allow data
            export. After the notice period, Dinmind may delete all Client Data without further obligation.
          </Section>

          <Section title="15. Termination">
            15.1 Either party may terminate the subscription at any time. Upon termination, your access to the Service
            ceases immediately.<br/>
            15.2 Dinmind may terminate your account immediately and without notice for breach of these Terms.<br/>
            15.3 Upon termination, Dinmind may delete all Client Data after 30 days. You are responsible for exporting
            your data before termination.
          </Section>

          <Section title="16. Governing Law &amp; Dispute Resolution">
            16.1 These Terms are governed exclusively by the laws of India, without regard to conflict of law principles.<br/>
            16.2 Any dispute arising from or relating to the Service or these Terms shall first be attempted to be resolved
            through good-faith negotiation between the parties.<br/>
            16.3 If negotiation fails, disputes shall be subject to the exclusive jurisdiction of the courts of Chennai,
            Tamil Nadu, India. You irrevocably submit to the jurisdiction of these courts and waive any objection to venue.<br/>
            16.4 Dinmind may seek urgent injunctive or equitable relief in any court of competent jurisdiction without
            prejudice to the above dispute resolution mechanism.
          </Section>

          <Section title="17. Amendments">
            Dinmind reserves the right to amend these Terms at any time by posting the updated Terms on the platform. Your
            continued use of the Service after posting constitutes your acceptance of the amended Terms. It is your
            responsibility to review these Terms periodically.
          </Section>

          <Section title="18. Entire Agreement &amp; Severability">
            These Terms constitute the entire agreement between you and Dinmind regarding the Service and supersede all prior
            agreements, representations, or understandings. If any provision is found invalid or unenforceable, the remaining
            provisions continue in full force and effect.
          </Section>

          <Section title="19. No Waiver">
            Failure by Dinmind to enforce any right or provision of these Terms shall not be construed as a waiver of such
            right or provision.
          </Section>

          <Section title="20. Contact &amp; Grievance">
            For any questions, support, or legal notices, contact:<br/>
            <strong>Dinmind Infotech Private Limited (OPC)</strong><br/>
            Chennai, Tamil Nadu, India<br/>
            Email: <strong>support@dinmind.com</strong>
          </Section>

          <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid #e2e8f0', textAlign: 'center', fontSize: 10, color: '#94a3b8' }}>
            © 2025 Dinmind Infotech Private Limited (OPC). All rights reserved. PayLeef is a registered product of Dinmind Infotech Private Limited (OPC).
            These Terms are legally binding. By using PayLeef you acknowledge that you have read, understood, and agreed to be bound by these Terms in their entirety.
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#1A7A4A', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.06em' }}>{title}</div>
      <div style={{ fontSize: 10.5, color: '#475569', lineHeight: 1.75 }}>{children}</div>
    </div>
  );
}
