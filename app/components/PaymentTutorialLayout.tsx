import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';
import SiteHeader from './SiteHeader';
import { PAYMENT_SUPPORT_EMAIL, type PaymentTutorial } from '@/lib/paymentTutorials';

type Props = {
  tutorial: PaymentTutorial;
  alternateHref?: string;
  alternateLabel?: string;
};

export default function PaymentTutorialLayout({ tutorial, alternateHref, alternateLabel }: Props) {
  return (
    <div className="w-full text-white">
      <SiteHeader />

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <Link
          href="/tool"
          className="inline-flex items-center gap-2 text-sm font-semibold text-white/55 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to generator
        </Link>

        <p className="mt-8 text-xs font-extrabold uppercase tracking-[0.18em] text-[#ff2d78]">
          {tutorial.badge}
        </p>
        <h1 className="mt-3 text-2xl font-black leading-tight tracking-tight sm:text-4xl">{tutorial.title}</h1>

        {tutorial.intro.length > 0 ? (
          <div className="mt-6 space-y-3 text-sm leading-relaxed text-white/70 sm:text-base">
            {tutorial.intro.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        ) : null}

        <div className="mt-10 space-y-12">
          {tutorial.steps.map((step) => (
            <section key={step.title} className="space-y-4">
              <h2 className="text-lg font-black text-white sm:text-xl">{step.title}</h2>

              {step.paragraphs?.map((paragraph) => (
                <p key={paragraph} className="text-sm leading-relaxed text-white/70 sm:text-base">
                  {paragraph}
                </p>
              ))}

              {step.listItems && step.listItems.length > 0 ? (
                <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-white/70 sm:text-base">
                  {step.listItems.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              ) : null}

              {step.tips && step.tips.length > 0 ? (
                <ol className="list-decimal space-y-5 pl-5">
                  {step.tips.map((tip) => (
                    <li key={tip.title} className="space-y-2">
                      <p className="text-sm font-semibold text-white sm:text-base">{tip.title}</p>
                      {tip.paragraphs.map((paragraph) => (
                        <p key={paragraph} className="text-sm leading-relaxed text-white/70 sm:text-base">
                          {paragraph}
                        </p>
                      ))}
                    </li>
                  ))}
                </ol>
              ) : null}

              {step.images && step.images.length > 0 ? (
                <div className="space-y-4 pt-2">
                  {(() => {
                    const storeBadges = step.images.filter((src) => {
                      const filename = src.split('/').pop() ?? src;
                      return ['appstore.avif', 'play-market.avif', 'chrome.avif'].includes(filename);
                    });
                    const screenshots = step.images.filter((src) => !storeBadges.includes(src));

                    return (
                      <>
                        {storeBadges.length > 0 ? (
                          <div className="flex flex-wrap gap-3">
                            {storeBadges.map((src) => (
                              <div
                                key={src}
                                className="overflow-hidden rounded-xl border border-white/10 bg-white/5"
                              >
                                <Image
                                  src={src}
                                  alt=""
                                  width={180}
                                  height={56}
                                  className="h-14 w-auto object-contain"
                                  unoptimized
                                />
                              </div>
                            ))}
                          </div>
                        ) : null}
                        {screenshots.map((src) => (
                          <div
                            key={src}
                            className="mx-auto w-1/2 overflow-hidden rounded-xl border border-white/10 bg-black/20"
                          >
                            <Image
                              src={src}
                              alt=""
                              width={720}
                              height={1280}
                              className="h-auto w-full object-contain"
                              unoptimized
                            />
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>
              ) : null}
            </section>
          ))}
        </div>

        <section className="mt-14 rounded-2xl border border-[#ff2d78]/25 bg-[#ff2d78]/10 p-6 sm:p-8">
          <h2 className="text-lg font-black text-white sm:text-xl">{tutorial.supportTitle}</h2>
          <p className="mt-3 text-sm leading-relaxed text-white/75 sm:text-base">{tutorial.supportText}</p>
          <a
            href={`mailto:${PAYMENT_SUPPORT_EMAIL}`}
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#ff2d78] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#ff1a6b]"
          >
            <Mail className="h-4 w-4" />
            Contact Support — {PAYMENT_SUPPORT_EMAIL}
          </a>
        </section>

        {alternateHref && alternateLabel ? (
          <p className="mt-8 text-center text-sm text-white/50">
            Prefer the other method?{' '}
            <Link href={alternateHref} className="font-semibold text-[#ff2d78] underline underline-offset-2">
              {alternateLabel}
            </Link>
          </p>
        ) : null}
      </main>
    </div>
  );
}
