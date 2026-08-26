import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import SiteHeader from '../components/SiteHeader';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Anti-Trafficking & Abuse Policy',
  description:
    'AI SLUTBOT zero-tolerance policy on trafficking, abuse, coercion, and non-consensual content. Reporting via legal@aislutbot.com and our content removal form.',
  path: '/anti-trafficking',
});

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-black text-white">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-white/65 sm:text-base">{children}</div>
    </section>
  );
}

export default function AntiTraffickingPage() {
  return (
    <div className="w-full text-white">
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Anti-Trafficking &amp; Abuse Policy</h1>
        <p className="mt-3 text-sm text-white/45">Effective Date: 23.06.2026</p>
        <p className="mt-1 text-sm text-white/45">Platform: aislutbot.com</p>

        <div className="mt-10 space-y-10">
          <Section title="1. Purpose">
            <p>
              AI SLUTBOT maintains a strict zero-tolerance policy toward slavery, human trafficking, sex trafficking,
              forced labor, coercion, exploitation, physical abuse, and any form of non-consensual or abusive conduct.
            </p>
            <p>
              This Policy sets out our standards, controls, and enforcement measures designed to prevent our platform,
              services, content, systems, or business relationships from being used to facilitate, promote, depict,
              monetize, or conceal human exploitation in any form.
            </p>
          </Section>

          <Section title="2. Scope">
            <p>This Policy applies to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>all users of AI SLUTBOT;</li>
              <li>all uploaded, submitted, generated, published, shared, or promoted content;</li>
              <li>all verified models, creators, affiliates, contractors, vendors, and business partners;</li>
              <li>all internal staff, moderators, support agents, compliance personnel, and service providers;</li>
              <li>
                all platform features, including AI-generated content, model verification, image uploads, public
                content areas, private user areas, affiliate activity, and promotional materials.
              </li>
            </ul>
          </Section>

          <Section title="3. Zero-Tolerance Statement">
            <p>
              AI SLUTBOT strictly prohibits any content, conduct, transaction, account activity, or business
              relationship involving or suggesting:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>slavery or servitude;</li>
              <li>human trafficking;</li>
              <li>sex trafficking;</li>
              <li>forced prostitution or sexual exploitation;</li>
              <li>physical abuse, violence, torture, restraint, captivity, or coercion;</li>
              <li>forced labor or involuntary services;</li>
              <li>non-consensual sexual activity;</li>
              <li>exploitation of vulnerable persons;</li>
              <li>threats, intimidation, blackmail, extortion, or control of another person;</li>
              <li>abuse involving minors or any person who cannot legally consent;</li>
              <li>
                content depicting or implying that a person is being forced, harmed, trafficked, abused, incapacitated,
                restrained against their will, or sexually exploited.
              </li>
            </ul>
            <p>
              Any suspected violation may result in immediate content removal, account suspension or termination,
              payment blocking, reporting to appropriate authorities, preservation of evidence, and cooperation with law
              enforcement or payment/compliance partners where legally required or appropriate.
            </p>
          </Section>

          <Section title="4. Prohibited Content and Conduct">
            <p>
              Users may not upload, generate, request, publish, promote, sell, distribute, or otherwise make available
              any content that depicts, encourages, normalizes, or appears to involve:
            </p>
          </Section>

          <Section title="4.1 Human Trafficking or Sex Trafficking">
            <p>Content or activity involving:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>recruitment, transportation, harboring, transfer, control, or exploitation of a person for sexual purposes;</li>
              <li>
                sexual services obtained through force, fraud, coercion, abuse of power, debt, threats, deception, or
                manipulation;
              </li>
              <li>any suggestion that a person is being sold, traded, controlled, owned, forced, or exploited;</li>
              <li>
                advertisements, coded language, links, instructions, or communications facilitating trafficking,
                prostitution by coercion, or sexual exploitation;
              </li>
              <li>
                references to “ownership” of a person, forced sexual access, captive sexual service, or commercial
                exploitation of a person without free and informed consent.
              </li>
            </ul>
          </Section>

          <Section title="4.2 Slavery, Forced Labor or Servitude">
            <p>Content or activity involving:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>forced work or forced sexual services;</li>
              <li>debt bondage or coercive labor arrangements;</li>
              <li>confinement, captivity, restraint, imprisonment, or control of movement;</li>
              <li>
                threats of violence, deportation, exposure, financial harm, reputational harm, or other pressure used to
                compel compliance;
              </li>
              <li>any depiction or promotion of a person being treated as property.</li>
            </ul>
          </Section>

          <Section title="4.3 Physical Abuse and Coercive Violence">
            <p>Content or activity involving:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>physical assault, torture, beating, choking, strangulation, or bodily harm;</li>
              <li>
                visible injury, bruising, bleeding, wounds, or distress presented in a sexualized or exploitative
                context;
              </li>
              <li>non-consensual restraint, kidnapping, captivity, forced confinement, or abduction;</li>
              <li>threats, intimidation, humiliation, degradation, or fear used to obtain sexual compliance;</li>
              <li>
                scenarios where consent is absent, unclear, withdrawn, impossible, or contradicted by the depicted
                context.
              </li>
            </ul>
          </Section>

          <Section title="4.4 Exploitation of Vulnerable Persons">
            <p>Content or activity involving exploitation of:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>minors;</li>
              <li>persons who appear underage;</li>
              <li>persons who are unconscious, asleep, intoxicated, drugged, incapacitated, or otherwise unable to consent;</li>
              <li>persons with impaired ability to consent;</li>
              <li>persons under duress, dependency, financial pressure, coercion, or control;</li>
              <li>victims or survivors of abuse, trafficking, violence, or exploitation.</li>
            </ul>
          </Section>

          <Section title="5. Consent and Verification Standards">
            <p>
              AI SLUTBOT requires that any real person represented in uploaded or training-related content must be
              properly verified according to the platform’s applicable verification procedures.
            </p>
            <p>Where applicable, this may include:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>identity verification;</li>
              <li>confirmation that the person is of legal age;</li>
              <li>clear and documented consent;</li>
              <li>a model release or equivalent authorization;</li>
              <li>consent verification materials, such as a consent selfie or other required documentation;</li>
              <li>human review before approval.</li>
            </ul>
            <p>
              No person may be submitted, trained, depicted, impersonated, or represented on the platform without proper
              authorization where such authorization is required.
            </p>
            <p>
              AI SLUTBOT does not accept outdated, unrelated, misleading, altered, or fraudulent verification materials.
              The person shown in the identity document, consent material, and submitted content must match the
              individual being verified.
            </p>
          </Section>

          <Section title="6. AI-Generated Content">
            <p>
              Because AI SLUTBOT provides AI-generated content tools, this Policy applies equally to prompts, generated
              images, generated videos, character creation, model training, public content, private content, and any
              other AI-assisted output.
            </p>
            <p>Users may not use AI tools to create, request, simulate, or distribute content that depicts or implies:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>trafficking;</li>
              <li>forced sexual activity;</li>
              <li>sexual slavery;</li>
              <li>physical abuse;</li>
              <li>non-consensual sexual conduct;</li>
              <li>coerced or threatened participation;</li>
              <li>captivity, abduction, or forced restraint;</li>
              <li>exploitation of minors or vulnerable persons;</li>
              <li>sexualized abuse or violence.</li>
            </ul>
            <p>
              Attempts to evade detection through coded language, misspellings, euphemisms, prompt manipulation, visual
              workarounds, or indirect instructions are prohibited.
            </p>
          </Section>

          <Section title="7. Moderation and Enforcement">
            <p>
              AI SLUTBOT may use a combination of automated systems, keyword detection, AI moderation tools, human
              review, user reporting, and compliance checks to detect and prevent prohibited content and activity.
            </p>
            <p>Enforcement actions may include, without limitation:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>rejecting a prompt, upload, model submission, or generated output;</li>
              <li>removing content;</li>
              <li>restricting public visibility;</li>
              <li>suspending or terminating accounts;</li>
              <li>disabling specific platform features;</li>
              <li>blocking payments or payouts;</li>
              <li>terminating affiliate, creator, vendor, or partner relationships;</li>
              <li>preserving relevant account, content, and transaction data;</li>
              <li>reporting suspected illegal activity to appropriate authorities where required or appropriate;</li>
              <li>
                cooperating with law enforcement, regulators, payment processors, card networks, banks, or compliance
                partners.
              </li>
            </ul>
            <p>
              AI SLUTBOT reserves the right to take action based on reasonable suspicion, contextual indicators,
              repeated attempts to violate policy, or risk to users, the platform, payment partners, or the public.
            </p>
          </Section>

          <Section title="8. User Reporting">
            <p>
              Users, partners, or third parties may report suspected violations of this Policy, including suspected
              trafficking, abuse, coercion, non-consensual content, or exploitation.
            </p>
            <p>Reports may be submitted through:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                Email:{' '}
                <a href="mailto:legal@aislutbot.com" className="text-white underline underline-offset-2 hover:text-white/80">
                  legal@aislutbot.com
                </a>
              </li>
              <li>
                Content removal form:{' '}
                <Link href="/content-removal" className="text-white underline underline-offset-2 hover:text-white/80">
                  aislutbot.com/content-removal
                </Link>
              </li>
            </ul>
            <p>Reports should include, where available:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>the relevant username, account, URL, image, video, prompt, or content ID;</li>
              <li>a description of the concern;</li>
              <li>any evidence or context supporting the report;</li>
              <li>whether there is an immediate safety concern.</li>
            </ul>
            <p>
              AI SLUTBOT reviews reports seriously and may prioritize reports involving possible trafficking, abuse,
              minors, coercion, or imminent harm.
            </p>
          </Section>

          <Section title="9. Business Partners, Affiliates and Vendors">
            <p>
              AI SLUTBOT expects all affiliates, vendors, contractors, payment partners, service providers, and other
              business partners to comply with this Policy and with all applicable laws prohibiting slavery, human
              trafficking, sex trafficking, forced labor, exploitation, and abuse.
            </p>
            <p>
              Partners may not use AI SLUTBOT to promote, monetize, redirect traffic from, or associate with any
              content, website, individual, organization, or activity involving trafficking, coercion, exploitation,
              abuse, or illegal sexual services.
            </p>
            <p>
              AI SLUTBOT may terminate any business relationship immediately if a partner is suspected of violating this
              Policy or creating unacceptable legal, compliance, reputational, or safety risk.
            </p>
          </Section>

          <Section title="10. Internal Responsibilities">
            <p>AI SLUTBOT personnel, contractors, moderators, and support staff are expected to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>escalate suspected trafficking, abuse, coercion, or exploitation concerns;</li>
              <li>follow internal moderation and reporting procedures;</li>
              <li>avoid approving content or accounts where consent, age, or identity is unclear;</li>
              <li>preserve relevant evidence when legally appropriate;</li>
              <li>maintain confidentiality when handling sensitive reports;</li>
              <li>cooperate with compliance reviews, audits, and investigations.</li>
            </ul>
            <p>
              Failure by internal personnel or contractors to follow this Policy may result in disciplinary action,
              contract termination, or other appropriate measures.
            </p>
          </Section>

          <Section title="11. Recordkeeping and Compliance Review">
            <p>
              AI SLUTBOT may maintain records relating to verification, moderation, reports, enforcement actions, user
              submissions, account activity, and compliance decisions as required or permitted by law.
            </p>
            <p>
              This Policy may be reviewed periodically and updated to reflect changes in applicable law, platform
              functionality, payment processor requirements, moderation standards, or operational risk.
            </p>
          </Section>

          <Section title="12. No Retaliation">
            <p>
              AI SLUTBOT prohibits retaliation against any person who, in good faith, reports suspected trafficking,
              abuse, coercion, exploitation, or violation of this Policy.
            </p>
            <p>False, malicious, or abusive reports may result in enforcement action against the reporting party.</p>
          </Section>

          <Section title="13. Consequences of Violation">
            <p>Violation of this Policy may result in immediate and permanent removal from AI SLUTBOT, including:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>content deletion;</li>
              <li>account suspension or termination;</li>
              <li>loss of access to platform features;</li>
              <li>cancellation of payouts or partner arrangements where permitted by law and contract;</li>
              <li>reporting to authorities or third-party compliance partners;</li>
              <li>legal action where appropriate.</li>
            </ul>
          </Section>

          <Section title="14. Contact">
            <p>Questions or reports regarding this Policy may be directed to:</p>
            <p>
              Email:{' '}
              <a href="mailto:legal@aislutbot.com" className="text-white underline underline-offset-2 hover:text-white/80">
                legal@aislutbot.com
              </a>
            </p>
          </Section>
        </div>
      </main>
    </div>
  );
}
