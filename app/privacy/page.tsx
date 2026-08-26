import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import SiteHeader from '../components/SiteHeader';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Privacy Policy',
  description:
    'Privacy Policy for AI SLUTBOT. How we collect, use, and protect personal data, GDPR rights, cookies, and contact details at legal@aislutbot.com.',
  path: '/privacy',
});

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-black text-white">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-white/65 sm:text-base">{children}</div>
    </section>
  );
}

const Mail = ({ children = 'legal@aislutbot.com' }: { children?: string }) => (
  <a href={`mailto:${children}`} className="text-white underline underline-offset-2 hover:text-white/80">
    {children}
  </a>
);

export default function PrivacyPage() {
  return (
    <div className="w-full text-white">
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Privacy Policy</h1>
        <p className="mt-3 text-sm text-white/45">Last updated on: 07/12/2024</p>

        <div className="mt-10 space-y-10">
          <Section title="1. Introduction">
            <p>
              Your privacy is important to us, and we are committed to protecting your personal data and respecting
              your privacy rights. This Privacy Policy explains how we collect, use, disclose, and safeguard your
              personal information when you visit our Platform and use our services.
            </p>
          </Section>

          <Section title="2. Company Information and Data Controller">
            <p>
              AI SLUTBOT, operating the Platform at aislutbot.com, is the data controller responsible for the processing
              of personal data described in this Privacy Policy (“we”, “us”, or “our”).
            </p>
            <p>
              For privacy requests, contact <Mail />.
            </p>
          </Section>

          <Section title="3. Purpose of this Policy">
            <p>This Privacy Policy aims to provide clear information about:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>the types of personal data we collect from you;</li>
              <li>how and why we collect, use, and store your personal data;</li>
              <li>
                your rights regarding your personal data under the General Data Protection Regulation (GDPR) and other
                applicable laws; and
              </li>
              <li>how you can manage your preferences and exercise your rights.</li>
            </ul>
            <p>
              By accessing or using the AI SLUTBOT image and video generation Platform and associated services
              (collectively, the “Platform”), you acknowledge that you have read and understood this Privacy Policy. If
              you do not agree with our practices, please do not use our Platform.
            </p>
          </Section>

          <Section title="4. Scope of this Policy">
            <p>This Privacy Policy applies to users of our Platform, including:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-white/80">Registered users:</strong> individuals who create an account to access
                generation, Slutcoins, and other features.
              </li>
              <li>
                <strong className="text-white/80">Uploaders:</strong> individuals who submit source images, prompts, or
                other content for generation.
              </li>
              <li>
                <strong className="text-white/80">Purchasers:</strong> users who buy Slutcoin packs or other paid
                features.
              </li>
              <li>
                <strong className="text-white/80">Affiliates:</strong> users who participate in the affiliate program.
              </li>
              <li>
                <strong className="text-white/80">Visitors:</strong> individuals who browse the Platform or submit
                reports without creating an account.
              </li>
            </ul>
            <p>
              This Privacy Policy does not apply to third-party websites, services, or applications that may be linked
              from our Platform. We are not responsible for those third parties’ privacy practices, and you should
              review their policies before providing them with personal data.
            </p>
          </Section>

          <Section title="5. Our Commitment to Privacy">
            <p>We process personal data according to these principles:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-white/80">Lawfulness, fairness, and transparency.</strong> We process personal
                data lawfully and fairly, and we explain how we use it.
              </li>
              <li>
                <strong className="text-white/80">Purpose limitation.</strong> We collect personal data for specified,
                explicit, and legitimate purposes and do not further process it in incompatible ways.
              </li>
              <li>
                <strong className="text-white/80">Data minimization.</strong> We collect only what is adequate, relevant,
                and limited to what is necessary.
              </li>
              <li>
                <strong className="text-white/80">Accuracy.</strong> We take reasonable steps to keep personal data
                accurate and, where necessary, up to date.
              </li>
              <li>
                <strong className="text-white/80">Storage limitation.</strong> We retain personal data only as long as
                needed for the purposes in this Policy and as required by law.
              </li>
              <li>
                <strong className="text-white/80">Integrity and confidentiality.</strong> We implement appropriate
                technical and organizational measures to protect personal data.
              </li>
              <li>
                <strong className="text-white/80">Accountability.</strong> We are responsible for demonstrating
                compliance with the GDPR and other applicable data protection laws.
              </li>
            </ul>
          </Section>

          <Section title="6. Contact Information">
            <p>
              Questions, concerns, or requests about this Privacy Policy or our data processing practices should be
              sent to <Mail />.
            </p>
          </Section>

          <Section title="7. Categories of Data Subjects">
            <p>
              We generally collect personal data directly from you when you use the Platform. If we receive personal
              data from third-party sources (for example, payment or authentication providers), we take steps to
              confirm those parties have a lawful basis to share it with us.
            </p>
          </Section>

          <Section title="7.1. Registered Users and Purchasers">
            <p>Types of personal data we may collect:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-white/80">Identification data:</strong> email address, display name, and similar
                account details.
              </li>
              <li>
                <strong className="text-white/80">Account and usage data:</strong> username, password or authentication
                tokens, preferences, generation history, prompts, source images, output URLs, Slutcoin balances, and
                activity logs.
              </li>
              <li>
                <strong className="text-white/80">Financial data:</strong> payment records, pack purchased, amount,
                provider (for example cryptocurrency or Telegram Stars), order identifiers, and invoices. We do not
                store full payment-card numbers on the Platform when payments are handled by a processor.
              </li>
              <li>
                <strong className="text-white/80">Technical data:</strong> IP address, browser type and version, device
                identifiers, cookies, and similar technologies.
              </li>
              <li>
                <strong className="text-white/80">Communication data:</strong> emails, support messages, and content
                removal or complaint submissions.
              </li>
            </ul>
            <p>Purposes and legal bases include:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Account creation and management — performance of a contract (Article 6(1)(b) GDPR).
              </li>
              <li>
                Providing image and video generation and personalizing features — performance of a contract (Article
                6(1)(b) GDPR).
              </li>
              <li>
                Processing Slutcoin purchases and related transactions — performance of a contract (Article 6(1)(b)
                GDPR) and legal obligation for tax or accounting records (Article 6(1)(c) GDPR).
              </li>
              <li>
                Account security and authentication — legitimate interests (Article 6(1)(f) GDPR).
              </li>
              <li>
                Customer support — performance of a contract (Article 6(1)(b) GDPR).
              </li>
              <li>
                Service updates and essential notices — legitimate interests (Article 6(1)(f) GDPR).
              </li>
              <li>
                Enforcing our Terms and preventing fraud or abuse — legitimate interests (Article 6(1)(f) GDPR).
              </li>
              <li>
                Marketing communications, if you opt in — consent (Article 6(1)(a) GDPR).
              </li>
              <li>
                Legal compliance — legal obligation (Article 6(1)(c) GDPR).
              </li>
            </ul>
          </Section>

          <Section title="7.2. Uploaders and Generated Content">
            <p>
              If you upload images or submit prompts, we process that content to generate outputs, store history where
              the feature is available, moderate for prohibited content, and operate the Platform.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Uploaded images, videos, prompts, and associated metadata — performance of a contract (Article 6(1)(b)
                GDPR).
              </li>
              <li>
                Identity, age, or consent materials if we request verification for likeness or safety reasons — legal
                obligation (Article 6(1)(c) GDPR) and, where biometric or other special-category data is involved,
                explicit consent (Article 9(2)(a) GDPR).
              </li>
              <li>
                Use of generated or uploaded content for Platform marketing, as described in our Terms — legitimate
                interests (Article 6(1)(f) GDPR) and consent where required (Article 6(1)(a) GDPR), with an opt-out
                available by emailing <Mail />.
              </li>
            </ul>
          </Section>

          <Section title="7.3. Affiliates">
            <p>
              If you join the affiliate program, we may process identification data, payout details (such as wallet or
              banking information you provide), traffic-source information, commission records, and related
              communications. Legal bases include performance of a contract (Article 6(1)(b) GDPR), legal obligation
              for payment and tax records (Article 6(1)(c) GDPR), and legitimate interests in preventing fraud
              (Article 6(1)(f) GDPR).
            </p>
          </Section>

          <Section title="7.4. Visitors and Reporters">
            <p>For visitors and people who submit reports without an account, we may collect:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>technical data (IP address, browser, device, cookies);</li>
              <li>communication data (email and the content of reports or inquiries); and</li>
              <li>interaction data (pages visited and timestamps).</li>
            </ul>
            <p>
              We use this data to operate the Platform, respond to reports (including through our{' '}
              <Link href="/content-removal" className="text-white underline underline-offset-2 hover:text-white/80">
                content removal form
              </Link>
              ), enforce our Terms, keep the Platform secure, and comply with law. Legal bases include legitimate
              interests (Article 6(1)(f) GDPR), legal obligation (Article 6(1)(c) GDPR), and consent for non-essential
              cookies (Article 6(1)(a) GDPR).
            </p>
          </Section>

          <Section title="7.5. Special Considerations">
            <p>
              <strong className="text-white/80">Minors.</strong> The Platform is not intended for anyone under 18. We
              do not knowingly collect personal data from minors. If we learn that a minor has provided personal data,
              we will take steps to delete it.
            </p>
            <p>
              <strong className="text-white/80">Sensitive data.</strong> If we process sensitive data (for example
              biometric data from a selfie or identity document during verification), we do so with enhanced security
              and only for the stated purpose.
            </p>
          </Section>

          <Section title="8. Data Sharing and Disclosure">
            <p>
              We keep personal data confidential, but we may share it with third parties as described below. Recipients
              are expected to protect it in line with this Policy and applicable law.
            </p>
            <p>
              <strong className="text-white/80">8.1. Service providers.</strong> We use providers for payment
              processing, identity or age checks where used, cloud storage and hosting, analytics, customer support,
              and email or other communications.
            </p>
            <p>
              <strong className="text-white/80">8.2. Legal obligations and protection of rights.</strong> We may
              disclose personal data to comply with law or legal process; to enforce our Terms; or to protect the
              rights, property, or safety of AI SLUTBOT, our users, or others, including fraud prevention.
            </p>
            <p>
              <strong className="text-white/80">8.3. Business transfers.</strong> If we are involved in a merger,
              acquisition, reorganization, asset sale, or similar transaction, personal data may be transferred as
              part of that deal. We will require the successor to provide an equivalent level of protection and will
              notify you of a change in ownership where required.
            </p>
            <p>
              <strong className="text-white/80">8.4. Affiliates.</strong> We may share personal data with companies
              under common control for purposes consistent with this Policy.
            </p>
            <p>
              <strong className="text-white/80">8.5. With your consent.</strong> We may share personal data with other
              parties when you ask us to or otherwise consent.
            </p>
            <p>
              <strong className="text-white/80">8.6. Public information.</strong> If you post or share content publicly
              on the Platform, that information may be visible to others. Be careful when sharing personal data in
              public areas.
            </p>
          </Section>

          <Section title="9. Data Retention">
            <p>
              We retain personal data only as long as needed for the purposes in this Policy and to meet legal,
              accounting, or reporting requirements.
            </p>
            <p>Retention depends on legal and contractual obligations, withdrawn consent, disputes, and operational needs.</p>
            <p>
              When personal data is no longer required, we delete it securely or anonymize it. Anonymized data may be
              used indefinitely for research or planning.
            </p>
            <p>
              You may request deletion of your account and personal data by contacting <Mail />. We aim to process
              requests within one (1) month, or longer if the request is complex. We may retain information needed to
              comply with law, resolve disputes, enforce agreements, or prevent fraud.
            </p>
          </Section>

          <Section title="10. Data Security">
            <p>
              We use technical and organizational measures to protect personal data, which may include encryption in
              transit, access controls, secure hosting, network protections, monitoring, backups, staff training, and
              due diligence on processors.
            </p>
            <p>
              You should keep your credentials confidential, use a strong unique password, secure your devices, and
              notify us at <Mail /> if you suspect unauthorized access or another security issue.
            </p>
          </Section>

          <Section title="11. Rights of Data Subjects">
            <p>Where applicable data protection laws (including the GDPR) apply, you may have the right to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>access your personal data;</li>
              <li>rectify inaccurate or incomplete data;</li>
              <li>erase data in certain circumstances (the “right to be forgotten”);</li>
              <li>restrict processing;</li>
              <li>receive data in a portable format and transmit it to another controller;</li>
              <li>object to processing based on legitimate interests;</li>
              <li>withdraw consent where processing is based on consent; and</li>
              <li>
                lodge a complaint with a supervisory authority in your place of residence, work, or alleged
                infringement.
              </li>
            </ul>
            <p>
              To exercise these rights, email <Mail /> with enough information for us to verify your identity. We may
              request additional confirmation. We aim to respond within one month and may extend by up to two further
              months for complex or numerous requests.
            </p>
            <p>
              Exercising these rights is usually free. We may charge a reasonable fee or refuse a request that is
              unfounded, repetitive, or excessive. Some rights are limited where we must retain data for legal claims
              or other legal duties.
            </p>
          </Section>

          <Section title="12. Children's Privacy">
            <p>
              The Platform is not intended for anyone under 18. We do not knowingly collect personal data from
              children. If you are under 18, do not register or send us personal information.
            </p>
            <p>
              If we learn we collected personal data from a child under 18, we will delete it. If you believe we have
              such information, contact <Mail />. If we suspect a user is under 18, we may request verification and may
              disable the account and delete associated personal data if verification is not provided.
            </p>
          </Section>

          <Section title="13. International Data Transfers">
            <p>
              Personal data may be transferred to, stored, and processed in countries other than your country of
              residence, including countries that may not have equivalent data protection laws. By using the Platform
              and providing personal data, you acknowledge such transfers.
            </p>
            <p>
              Where we transfer personal data from the EEA to a country without an adequacy decision, we use
              appropriate safeguards such as Standard Contractual Clauses approved by the European Commission, and in
              some cases we may request explicit consent. Recipients are bound by contractual and security obligations
              to protect the data.
            </p>
          </Section>

          <Section title="14. Changes to the Privacy Policy">
            <p>
              We may update this Privacy Policy to reflect changes in our practices, technology, or legal
              requirements. Please review it regularly. The date at the top shows when it was last updated.
            </p>
          </Section>

          <Section title="15. Notification of Changes">
            <p>
              If we make material changes that affect your rights or how we process personal data, we will post a
              notice on the Platform and, where we have an email on file, may also email you. Changes are effective
              when posted unless we say otherwise. Continued use of the Platform after changes take effect means you
              accept the revised Policy.
            </p>
            <p>
              Questions about updates can be sent to <Mail />.
            </p>
          </Section>

          <Section title="16. Definitions">
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-white/80">Platform:</strong> the AI SLUTBOT image and video generation services
                operated at aislutbot.com, including related features such as Slutcoins, generation history, and
                affiliate tools.
              </li>
              <li>
                <strong className="text-white/80">User:</strong> anyone accessing or using the Platform.
              </li>
              <li>
                <strong className="text-white/80">Personal data:</strong> information relating to an identified or
                identifiable natural person, as defined under the GDPR.
              </li>
              <li>
                <strong className="text-white/80">Processing:</strong> any operation performed on personal data, whether
                or not by automated means.
              </li>
              <li>
                <strong className="text-white/80">GDPR:</strong> Regulation (EU) 2016/679.
              </li>
              <li>
                <strong className="text-white/80">Generated content:</strong> images, videos, or other media created
                using the Platform. Users retain ownership subject to our Terms of Service and this Policy.
              </li>
              <li>
                <strong className="text-white/80">Data controller:</strong> AI SLUTBOT, which determines the purposes
                and means of processing personal data collected through the Platform.
              </li>
              <li>
                <strong className="text-white/80">Cookies:</strong> small files stored on your device that help operate
                and improve the Platform. See our{' '}
                <Link href="/cookies" className="text-white underline underline-offset-2 hover:text-white/80">
                  Cookie Policy
                </Link>
                .
              </li>
            </ul>
            <p>
              Related policies:{' '}
              <Link href="/terms" className="text-white underline underline-offset-2 hover:text-white/80">
                Terms of Service
              </Link>
              ,{' '}
              <Link href="/cookies" className="text-white underline underline-offset-2 hover:text-white/80">
                Cookie Policy
              </Link>
              ,{' '}
              <Link href="/anti-trafficking" className="text-white underline underline-offset-2 hover:text-white/80">
                Anti-Trafficking &amp; Abuse Policy
              </Link>
              , and{' '}
              <Link href="/content-removal" className="text-white underline underline-offset-2 hover:text-white/80">
                Content Removal
              </Link>
              .
            </p>
          </Section>
        </div>
      </main>
    </div>
  );
}
