import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import SiteHeader from '../components/SiteHeader';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Terms of Service',
  description:
    'Terms of Service for AI SLUTBOT at aislutbot.com — AI porn generator rules, Stars, prohibited content, refunds, and adult-only use.',
  path: '/terms',
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

export default function TermsPage() {
  return (
    <div className="w-full text-white">
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Terms of Service</h1>
        <p className="mt-3 text-sm text-white/45">Last updated on: 07/08/2026</p>
        <p className="mt-6 text-sm font-semibold uppercase tracking-wide text-white/80">
          Please read these terms and conditions carefully before using our Platform. By using our Platform, you agree
          to these Terms of Service.
        </p>

        <div className="mt-10 space-y-10">
          <Section title="1. Introduction">
            <p>
              These Terms of Service govern access to and use of the AI SLUTBOT image and video generation Platform
              (the “Platform”) and the services we offer on the Platform. The Platform is designed and operated by
              AI SLUTBOT at aislutbot.com (“we”, “us”, or “our”).
            </p>
            <p>
              If you are accepting these Terms of Service and using the Platform and services on behalf of a company,
              organization, government, or other legal entity, you represent and warrant that you are authorized to do
              so and have the authority to bind such entity to these Terms of Service, in which case the words “you”
              and “your” as used in these Terms of Service shall refer to such entity.
            </p>
            <p>
              If you do not agree with any of the provisions set below, you should not use, and you are not authorized
              to use, the Platform or any of the services available on the Platform.
            </p>
            <p>
              We reserve the right to modify, change, and update these Terms of Service at any time. All changes are
              effective immediately. We do not guarantee that you can be notified regarding such changes; therefore, it
              is your sole responsibility to stay updated on any changes we may implement to these Terms of Service.
            </p>
            <p>
              Such changes will only affect the relationship with you for the future. Continued use of the Platform
              will signify your acceptance of the revised Terms of Service. If you do not wish to be bound by the
              changes, you must stop using the Platform. If required by applicable law, we will specify the date by
              which the modified Terms of Service will enter into force.
            </p>
            <p>
              If any provision of these Terms of Service is held to be invalid or unenforceable, that provision will
              be limited or eliminated to the minimum extent necessary, and the remaining provisions will remain in
              full force and effect. Any failure to enforce any right or provision of these Terms of Service will not
              be deemed a waiver of such right or provision.
            </p>
            <p>
              To ask a question, resolve a complaint regarding the Platform or the services, or receive further
              information, contact us at <Mail />.
            </p>
          </Section>

          <Section title="2. Description of Services">
            <p>
              The Platform provides users with access to AI-powered image and video generation. Using the Platform,
              users can create images and videos based on custom prompts and uploaded source images they provide. The
              Platform may offer the following services, as displayed at the time of use:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-white/80">AI image and video generation.</strong> Users submit prompts and/or
                source images, and the AI system generates outputs based on those inputs. Video duration, resolution,
                quality, and available tools are as displayed on the Platform before generation. Typical video
                generations are short clips (including approximately 5-second outputs depending on the selected
                settings).
              </li>
              <li>
                <strong className="text-white/80">Explicit or sexual content generation.</strong> The Platform allows
                generation of adult sexual content under these Terms, our Anti-Trafficking &amp; Abuse Policy, and any
                applicable verification or consent requirements. Users must follow the prohibited content rules.
              </li>
              <li>
                <strong className="text-white/80">Stars.</strong> Paid packs grant Stars that can be spent on
                eligible generations. Packs, prices, and included generation estimates are displayed at checkout and
                may change prospectively.
              </li>
              <li>
                <strong className="text-white/80">Affiliate program.</strong> Eligible users may join the Platform’s
                affiliate program to earn commissions by referring new members, subject to the affiliate terms below.
              </li>
            </ul>
            <p>
              Features, models, durations, quality settings, and availability may change. We may add, limit, rename, or
              discontinue features in accordance with these Terms.
            </p>
          </Section>

          <Section title="3. Eligibility">
            <p>
              You must be at least 18 years old, or the age of majority in your jurisdiction if higher, to use the
              Platform. By accessing and using the Platform, you represent and warrant that you meet these age
              requirements. False statements regarding age may result in account suspension and potential legal
              consequences. We reserve the right to deny access if adequate age verification is not provided.
            </p>
          </Section>

          <Section title="4. Prohibited Content">
            <p>
              Users are strictly prohibited from generating, uploading, or disseminating content, or attempting to
              generate AI-generated images or videos, that violate legal, ethical, or community standards.
              Specifically, prohibited content includes, but is not limited to:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Any content that violates applicable local, national, or international laws, including depictions of
                child sexual abuse material, prostitution involving coercion, bestiality, necrophilia, or content that
                incites violence, hate, or criminal activities.
              </li>
              <li>
                Deepfakes or any images or videos that portray real individuals without their explicit consent,
                including non-consensual sexual content, harmful impersonations, or defamation.
              </li>
              <li>
                Content depicting extreme violence, severe beatings, murder, torture, rape, or any imagery that
                promotes self-harm, suicide, or endangerment of minors.
              </li>
              <li>
                Any content that involves minors in any explicit, abusive, or exploitative context, even in fictional
                or simulated forms. This includes any AI-generated content that sexualizes minors or persons who
                appear underage.
              </li>
              <li>
                Content intended to deceive, defraud, mislead, or scam users or third parties, including
                misinformation, false identities, or impersonation of others for malicious purposes.
              </li>
              <li>
                Content that infringes upon the intellectual property rights of others, including copyrighted images,
                trademarks, and logos, without permission from the rights holder.
              </li>
              <li>
                Content that promotes or incites violence or hatred based on race, ethnicity, religion, gender, sexual
                orientation, disability, or any other protected characteristic.
              </li>
              <li>
                Content or activities aimed at disrupting the Platform and/or services or harming other users,
                including malware, phishing, hacking attempts, or spamming.
              </li>
              <li>
                Unauthorized sharing of private or personal information, including personal data, images, or sensitive
                information, without the explicit consent of the individual involved.
              </li>
            </ul>
            <p>
              Violation of these content guidelines may result in immediate account termination, removal of content,
              and potential legal consequences. Report prohibited content through the{' '}
              <Link href="/content-removal" className="text-white underline underline-offset-2 hover:text-white/80">
                content removal form
              </Link>{' '}
              or by emailing <Mail />.
            </p>
            <p>
              We will review reports of prohibited content within 7 (seven) business days, or sooner for urgent safety
              and legal reports, and take appropriate action, including removal of the content and possible suspension
              of the user account.
            </p>
          </Section>

          <Section title="5. Accessing the Platform. Account Creation">
            <p>
              To access and use certain features of the Platform, users may need to create an account by registering
              with a valid email address or through third-party services we make available. During account creation,
              users must provide accurate and up-to-date information. By creating an account, users:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Must complete any identity, email, or age verification we require. Failure to complete verification
                may result in account suspension or restrictions.
              </li>
              <li>
                Are responsible for maintaining the confidentiality of their account credentials and for all activities
                conducted through their account. Sharing or transferring the account to another person is not
                permitted.
              </li>
              <li>
                Are allowed to maintain only one account. Creating multiple accounts to bypass Platform rules,
                restrictions, or limitations is prohibited and may result in account termination.
              </li>
            </ul>
          </Section>

          <Section title="6. Data Protection and Privacy">
            <p>
              Your privacy and the protection of your personal data are important to us. We collect, process, and
              store your personal data in compliance with applicable data protection laws, including the General Data
              Protection Regulation (GDPR) where it applies.
            </p>
            <p>
              For more information on how we handle your personal data and your rights regarding data access,
              rectification, and deletion, please refer to our{' '}
              <Link href="/privacy" className="text-white underline underline-offset-2 hover:text-white/80">
                Privacy Policy
              </Link>
              .
            </p>
          </Section>

          <Section title="7. Using the Platform. Packs, Stars, and Pricing">
            <p>
              The Platform offers paid Stars packs to accommodate different user needs. Each pack provides a number
              of Stars that can be used for generating AI images and videos. Pack names, prices, Stars amounts,
              and estimated image or video counts are displayed at checkout and may change prospectively.
            </p>
            <p>Current packs, as displayed on the Platform, may include:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>Starter: 500 Stars for USD $16.00 crypto, or 500 Telegram Stars (about USD $8 to $13), for 60 image generations or 30 spicy videos.</li>
              <li>Flirt: 1,000 Stars for USD $25.00 crypto, or 1,000 Telegram Stars (about USD $16 to $25), for 120 image generations or 60 spicy videos.</li>
              <li>Desire: 2,500 Stars for USD $63.00 crypto, or 2,500 Telegram Stars (about USD $63), for 300 image generations or 150 spicy videos.</li>
              <li>Passion: 5,000 Telegram Stars or USD $125.00 crypto, for 600 image generations or 300 spicy videos (about USD $80 to $125), including up to 20 concurrent jobs.</li>
              <li>Ecstasy: 10,000 Telegram Stars or USD $250.00 crypto, for 1,200 image generations or 600 spicy videos (about USD $160 to $250), including up to 20 concurrent jobs.</li>
            </ul>
            <p>
              Crypto (USDT) checkout charges the pack USD price, with a USD $12.00 minimum. Telegram Stars checkout charges the matching
              Telegram Stars amount. In both cases the pack credits Stars to your wallet so you can use the generations shown at
              checkout. Promotional coupons may reduce the amount you pay. They do not reduce the Stars credited for that pack.
            </p>
            <p>
              Estimated image and video counts shown with a pack are illustrations based on typical generation costs
              (for example, short videos of about 5 seconds). Actual consumption depends on mode, duration, quality,
              and other settings selected before generation. Taxes, payment-processor fees, and currency conversion
              (including cryptocurrency or Telegram Stars where offered) may apply.
            </p>
            <p>
              We may offer one-time packs rather than, or in addition to, recurring subscriptions. Where a purchase is
              recurring, users can cancel according to the instructions shown at checkout or in their account. Upon
              cancellation, expiration, or any other loss of paid access, unused Stars and access to your
              generation library may be restricted unless and until a new eligible pack is purchased, except where
              otherwise required by law or expressly stated by us.
            </p>
            <p>
              To create images and videos, Stars are necessary. Pricing reflects the computational resources
              required for generation. Video pricing may increase with duration, resolution, and other selected
              settings; the charge is displayed before generation where feasible. We reserve the right to adjust
              pricing prospectively if we identify discrepancies or changes in compute cost.
            </p>
            <p>
              You may cancel or stop further purchases at any time through the payment method you used or by
              contacting <Mail />.
            </p>
          </Section>

          <Section title="8. Additional Features">
            <ul className="list-disc space-y-2 pl-5">
              <li>Higher-value packs may provide more Stars, more generations, and additional feature access as displayed.</li>
              <li>Stars have no cash value and are not transferable except as required by law.</li>
              <li>
                Features such as HD or Ultra-HD rendering, faster generation, priority access, watermark-free exports,
                and generation history duration depend on the pack or account status shown on the Platform.
              </li>
            </ul>
          </Section>

          <Section title="9. Content &amp; AI Generation">
            <p>
              Content generated on the Platform depends on the inputs (prompts, images, and settings) provided by the
              user. The Platform uses AI technology to generate images and videos based on those inputs. Users should
              be aware of the following:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-white/80">Content control and limitations.</strong> The Platform cannot fully
                control the outcome of generated content. Given the probabilistic nature of machine learning, use of
                our services may result in content that does not accurately reflect the intended purpose.
              </li>
              <li>
                <strong className="text-white/80">Content quality.</strong> Quality and accuracy may differ based on
                prompt complexity, model capabilities, resolution, duration, and other settings.
              </li>
              <li>
                <strong className="text-white/80">Non-refundability of used Stars.</strong> Once Stars have been
                used to generate content, we cannot offer refunds based on output quality or accuracy, except as
                required by law or under the Refund Policy below.
              </li>
              <li>
                <strong className="text-white/80">User responsibility for prompts.</strong> Users are responsible for
                the prompts and source images they submit and must follow the prohibited content rules.
              </li>
              <li>
                <strong className="text-white/80">User license and usage rights.</strong> Users may share and use the
                images and videos they generate, including for commercial purposes, as long as that use complies with
                applicable laws and these Terms.
              </li>
            </ul>
            <p>
              You understand that you may be exposed to content that is inaccurate, offensive, indecent, or
              objectionable, and that we are not responsible for screening the entire library of content. You must
              evaluate content for accuracy and appropriateness before using or sharing it.
            </p>
            <p>
              We do not make representations or warranties regarding the quality, origin, or ownership of any content
              found on the Platform. We will not be liable for errors, misrepresentations, or omissions in the
              content, nor for the availability of the content.
            </p>
          </Section>

          <Section title="10. Ownership of Content">
            <p>
              Users retain ownership of the images, videos, and other content they generate through the Platform,
              including the right to use, share, and distribute that content for personal and commercial purposes,
              without royalties payable to the Platform, subject to these Terms.
            </p>
            <p>
              Use of generated content remains subject to the prohibited content guidelines. Content may not be used
              for illegal, harmful, or malicious purposes, including defamation, fraud, harassment, or violations of
              intellectual property or privacy laws.
            </p>
            <p>
              If users upload their own images or content, they must have the necessary rights to those materials,
              including that third-party images do not infringe copyrights, trademarks, publicity, or other
              proprietary rights.
            </p>
            <p>
              By generating content on the Platform, users grant us a non-exclusive, royalty-free license to store,
              display, and distribute the content for the purpose of providing the service. This license is limited to
              operation of the Platform and does not grant us ownership of the content.
            </p>
            <p>
              We reserve the right to review, remove, or restrict access to any user-generated content that violates
              these Terms, infringes third-party rights, or poses legal risks.
            </p>
            <p>
              Users agree to indemnify us and hold us harmless for claims arising from improper use of copyrighted or
              proprietary content, including unauthorized use of third-party images or content uploaded by users.
            </p>
          </Section>

          <Section title="11. Marketing and Promotional Use of Content">
            <p>
              By using the Platform, you agree that content you create, upload, or generate, including AI-generated
              images and videos, may be used by us for marketing, promotional, and advertising purposes. This includes
              displaying your content on the Platform, social media channels, and other marketing materials, without
              additional compensation or prior notice.
            </p>
            <p>
              You grant us a non-exclusive, worldwide, royalty-free license to use, reproduce, distribute, and
              publicly display such content to promote the Platform and its services. This license does not grant us
              ownership of your content.
            </p>
            <p>
              If you do not wish for your content to be used for marketing and promotional purposes, notify us in
              writing at <Mail />, and we will cease such use for future content upon confirmation of your request.
              This cessation will not affect prior or existing use of your content, provided that such use does not
              infringe on your rights.
            </p>
          </Section>

          <Section title="12. Likeness, Consent, and Reference Images">
            <p>
              You may not submit, upload, reference, generate, sell, publish, or distribute content that depicts or
              imitates a real person without the required verification, consent, and rights. This includes
              non-consensual likeness replication, celebrity or public-figure impersonations, images of private
              individuals without consent, content involving minors, content intended to deceive or harass, and
              content that may violate privacy, publicity, intellectual-property, or other rights.
            </p>
            <p>
              We may reject uploads, remove content, suspend or terminate accounts, withhold payouts, and report
              unlawful or abusive activity where appropriate. Our review, approval, moderation, or technical
              restrictions do not waive your responsibility or guarantee that a particular use is lawful in your
              jurisdiction.
            </p>
            <p>
              Report content you believe violates these Terms to <Mail /> or through the{' '}
              <Link href="/content-removal" className="text-white underline underline-offset-2 hover:text-white/80">
                content removal form
              </Link>
              .
            </p>
          </Section>

          <Section title="13. Affiliate Program">
            <p>
              Eligible users may participate in the Platform’s affiliate program and earn commissions from qualifying
              purchases made by users attributed to their affiliate referrals. Unless we approve a different
              arrangement in writing or in the Platform, the standard affiliate commission for qualifying purchases
              starts at 30% of eligible net revenue. Higher rates up to 50% may be approved at our sole discretion.
            </p>
            <p>
              Affiliate commissions are calculated on eligible net revenue actually received by us after deductions
              that may include payment processing fees, taxes, network costs, and similar third-party costs.
              Commissions are not payable on refunded, reversed, cancelled, chargedback, self-referred, or otherwise
              ineligible transactions.
            </p>
            <p>
              We may withhold, refuse, reverse, offset, reduce, or cancel any affiliate commission, payout, or
              participation in cases of fraud, abuse, trademark infringement, misleading practices, prohibited
              traffic, incomplete payout documentation, duplicate attribution, self-referrals, or any violation of
              these Terms.
            </p>
            <p>
              Affiliates may not use AI SLUTBOT, aislutbot.com, or any confusingly similar variation of
              these names or marks in any domain name, subdomain, app name, landing page, ad copy, metadata, social
              media profile, paid search campaign, display URL, redirect URL, or promotional material in a way that
              suggests ownership, official affiliation, endorsement, or control by AI SLUTBOT.
            </p>
            <p>
              Affiliates may refer to AI SLUTBOT only for legitimate affiliate promotion, provided that the promotion
              clearly identifies the affiliate as an independent third-party promoter and does not create confusion
              with the official AI SLUTBOT brand. Unauthorized trademark use, misleading landing pages, or redirect
              abuse may result in suspension or termination of the affiliate account and withholding of commissions.
            </p>
          </Section>

          <Section title="14. Limitation of Liability">
            <p>
              We strive to provide a reliable AI generation experience. Due to server load, maintenance, third-party
              providers, or technical issues, generation may occasionally be delayed or unavailable. You acknowledge
              that we shall not be liable for delays or reduced performance during generation.
            </p>
            <p>
              To the maximum extent permitted by applicable law, in no event shall AI SLUTBOT, or its affiliates,
              officers, directors, agents, partners, suppliers, and employees, be liable for any indirect, punitive,
              incidental, special, consequential, or exemplary damages, including without limitation damages for loss
              of profits, goodwill, use, data, or other intangible losses, arising out of or relating to the use of,
              or inability to use, the services, the content, the features, and/or the Platform.
            </p>
          </Section>

          <Section title="15. Indemnification">
            <p>
              You agree to defend, indemnify, and hold us harmless, and our affiliates, licensors, and service
              providers, from and against any claims, liabilities, damages, judgments, awards, losses, costs,
              expenses, or fees (including reasonable attorneys’ fees) arising out of:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>your use of and access to the Platform, including misuse of the services or of any data or content transmitted or received by you;</li>
              <li>your violation of these Terms of Service, including any representations and warranties herein;</li>
              <li>your violation of any third-party rights, including privacy or intellectual property rights;</li>
              <li>your violation of any statutory law, rule, or regulation;</li>
              <li>any content submitted from your account; or</li>
              <li>your willful misconduct.</li>
            </ul>
          </Section>

          <Section title="16. Refund Policy">
            <p>
              We do not offer refunds because generation is slower than expected. Queue times depend on load, plan,
              and selected settings.
            </p>
            <p>
              We do not offer refunds because generated images or videos do not meet your subjective expectations. The
              outputs are AI-generated and depend on your inputs and model capabilities.
            </p>
            <p>If we determine that you violated these Terms, you lose any applicable right of withdrawal.</p>
            <p>Refunds will only be considered where:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>applicable statutory consumer protection laws mandate a refund;</li>
              <li>we fail to provide the service entirely, and you are unable to use it for its intended purpose;</li>
              <li>double billing or overcharging occurred due to a technical error on our part; or</li>
              <li>
                you have not consumed any Stars provided to you and have not used generation or related paid
                features, and a request is made within 14 days of purchase, except where law provides a longer or
                shorter period.
              </li>
            </ul>
            <p>
              After 14 days from the date of purchase, any contractual right to withdraw expires, regardless of
              whether you have used Stars, except where a longer period is required by law.
            </p>
            <p>Any chargeback associated with your account may result in its immediate termination.</p>
          </Section>

          <Section title="17. Compliance Policy">
            <p>
              Users can report potentially prohibited content through the{' '}
              <Link href="/content-removal" className="text-white underline underline-offset-2 hover:text-white/80">
                content removal form
              </Link>{' '}
              or at <Mail />.
            </p>
            <p>
              Once a complaint is received, we will review it within 7 (seven) business days, or sooner for urgent
              legal or safety reports. Investigations may result in deletion of content and termination of accounts
              for repeated illegal content or attempts to bypass filters. See also our{' '}
              <Link href="/anti-trafficking" className="text-white underline underline-offset-2 hover:text-white/80">
                Anti-Trafficking &amp; Abuse Policy
              </Link>
              .
            </p>
          </Section>

          <Section title="18. Appeal Process">
            <p>
              To appeal, email a written appeal to <Mail /> explaining why you believe the decision on your complaint
              or account action was incorrect, and include supporting evidence.
            </p>
            <p>
              We will review appeals within 5 business days and communicate the outcome within 5 business days. Possible
              outcomes are:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-white/80">Upheld.</strong> The initial decision stands.
              </li>
              <li>
                <strong className="text-white/80">Overturned.</strong> Content may be restored and account actions
                reversed.
              </li>
              <li>
                <strong className="text-white/80">Partial overturn.</strong> We may restore some content or modify the
                action taken.
              </li>
            </ul>
            <p>
              The decision made during the appeal process is final, based on our interpretation of these Terms and
              platform guidelines.
            </p>
          </Section>

          <Section title="19. Applicable Law and Dispute Resolution">
            <p>
              These Terms of Service will be governed by and construed in accordance with applicable law, excluding
              conflict-of-law rules that would require application of another jurisdiction’s laws. Where a court of
              competent jurisdiction must hear a claim, you and we agree that the claim will be brought on an
              individual basis.
            </p>
            <p>
              By using the Platform, you agree to resolve any disputes with us individually. You waive any right to
              participate in a collective, class, or representative action, whether in litigation or arbitration, to
              the extent such waiver is permitted by applicable law.
            </p>
            <p>
              Availability of the Platform in a given country does not, by itself, create general or specific personal
              jurisdiction over us in that country. We retain the right to bring any suit, action, or proceeding
              against you for breach of these Terms in your country of residence or any other relevant country. By
              accessing the Platform, you waive objections to such venue to the extent permitted by law.
            </p>
          </Section>

          <Section title="20. Intellectual Property">
            <p>
              The architecture of the Platform, its graphics, user interfaces, visual interfaces, symbols, logos,
              artwork, and computer code belong to AI SLUTBOT or its licensors and are protected by copyright, patent,
              trademark, and other intellectual property laws.
            </p>
            <p>
              The Platform in whole or in part may not be copied, reproduced, republished, uploaded, posted, publicly
              displayed, encoded, translated, transmitted, or distributed in any way for any commercial purpose
              without our express prior written consent.
            </p>
            <p>
              The Platform incorporates AI functions that generate content as described in these Terms. You understand
              that content generated within the Platform results from algorithms and systems operated by us and our
              providers. We reserve the exclusive right to sell, license, or otherwise commercialize any aspect of
              those AI functions. You agree not to assert intellectual property rights over the Platform against us or
              any third party licensed by us.
            </p>
            <p>
              You may not use the Platform to infringe the rights of others, including copyright, trademark, privacy,
              publicity, or other personal or proprietary rights. We may remove or disable access to the Platform,
              services, or any content found to violate these Terms or third-party rights.
            </p>
          </Section>

          <Section title="21. Termination of Access">
            <p>
              We may change or discontinue any aspect or feature of the Platform at any time. We may suspend or
              terminate your access to any feature, the Platform, or any services, with or without notice, if we
              determine that you have violated these Terms of Service, or for any other legitimate reason, at our sole
              discretion.
            </p>
          </Section>

          <Section title="22. Promotional Credits">
            <p>
              We may award promotional Stars or similar credits at our discretion. Promotional credits have no cash
              value, are not transferable or withdrawable, and may be modified, suspended, or discontinued
              prospectively. We may withhold rewards in cases of abuse, multiple-account circumvention, fraud, policy
              violations, or technical error.
            </p>
          </Section>

          <Section title="23. Contact">
            <p>
              Questions about these Terms of Service may be directed to <Mail />.
            </p>
          </Section>
        </div>
      </main>
    </div>
  );
}
