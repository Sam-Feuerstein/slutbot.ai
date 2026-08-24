import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import SiteHeader from '../components/SiteHeader';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: '18 U.S.C. §2257 Compliance Statement',
  description:
    '18 U.S.C. §2257 record-keeping compliance statement for SLUTBOT AI. AI-generated content, user uploads, and contact at legal@slutbot.ai.',
  path: '/2257',
});

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-black text-white">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-white/65 sm:text-base">{children}</div>
    </section>
  );
}

const Mail = ({ children = 'legal@slutbot.ai' }: { children?: string }) => (
  <a href={`mailto:${children}`} className="text-white underline underline-offset-2 hover:text-white/80">
    {children}
  </a>
);

export default function Usc2257Page() {
  return (
    <div className="w-full text-white">
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
          18 U.S.C. §2257 Record-Keeping Requirements Compliance Statement
        </h1>
        <p className="mt-3 text-sm text-white/45">Last updated on: 08/24/2026</p>
        <p className="mt-1 text-sm text-white/45">Platform: Slutbot.ai</p>

        <div className="mt-10 space-y-10">
          <Section title="1. Nature of content on the Platform">
            <p>
              SLUTBOT AI operates an AI image and video generation platform at Slutbot.ai (the “Platform”). Content
              available on the Platform is AI-generated and is provided for entertainment purposes only. It does not
              depict real individuals or events, except where a user uploads their own source image.
            </p>
          </Section>

          <Section title="2. Producer status">
            <p>
              SLUTBOT AI is not the primary or secondary producer (as defined in 18 U.S.C. § 2257) of third-party
              user-uploaded source materials. With respect to such materials, SLUTBOT AI’s activities are limited to
              the transmission, storage, retrieval, hosting, and/or formatting of content submitted by users.
            </p>
          </Section>

          <Section title="3. Requests regarding §2257 records">
            <p>
              Requests about §2257 records for any user-uploaded material should be directed to the user who uploaded
              it. For assistance contacting that user, or for questions about this notice, email <Mail />.
            </p>
          </Section>

          <Section title="4. Compliance procedures">
            <p>
              SLUTBOT AI abides by the following compliance procedures regarding generation, uploads, and related
              content:
            </p>
            <p>
              All users must be at least eighteen (18) years of age (or the age required by their state, jurisdiction,
              or country if higher than 18) and are identified and verified as the Platform requires before they may
              generate, upload, share, or sell content on Slutbot.ai.
            </p>
            <p>
              Before any upload or generation involving a real person’s likeness, users must provide evidence or
              certify that:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                all depicted persons are over the age of 18 years old (or the minimum age required to appear in such
                content by their state, jurisdiction, or country if higher than 18); that they freely consented to
                appear in the content at the time of its production; and that they agree to its use on Slutbot.ai;
              </li>
              <li>
                as producer of said content, the user certifies being compliant with record-keeping requirements under
                18 U.S.C. § 2257 for all such content on Slutbot.ai, and agrees to deliver such documentation promptly
                upon request; and
              </li>
              <li>
                the content does not violate our{' '}
                <Link href="/terms" className="text-white underline underline-offset-2 hover:text-white/80">
                  Terms of Service
                </Link>
                , our{' '}
                <Link href="/anti-trafficking" className="text-white underline underline-offset-2 hover:text-white/80">
                  Anti-Trafficking &amp; Abuse Policy
                </Link>
                , or our{' '}
                <Link href="/content-removal" className="text-white underline underline-offset-2 hover:text-white/80">
                  content-removal
                </Link>{' '}
                and non-consensual content policies.
              </li>
            </ul>
          </Section>

          <Section title="5. Related policies and contact">
            <p>
              Questions about this statement may be directed to <Mail />. See also our{' '}
              <Link href="/privacy" className="text-white underline underline-offset-2 hover:text-white/80">
                Privacy Policy
              </Link>
              .
            </p>
          </Section>
        </div>
      </main>
    </div>
  );
}
