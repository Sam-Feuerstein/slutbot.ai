import Link from 'next/link';
import { ArrowRight, Shield, Sparkles, Upload, Zap } from 'lucide-react';
import SiteHeader from './SiteHeader';
import { SEO_LANDING_BENEFITS, type SeoLandingPage as SeoLandingPageData } from '@/lib/seoLandingPages';
import { GENERATOR_PATH } from '@/lib/site';

const BENEFIT_ICONS = [Zap, Sparkles, Shield, Sparkles, Zap] as const;

function UploadButton({ label = 'Upload photo' }: { label?: string }) {
  return (
    <Link
      href={GENERATOR_PATH}
      className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#ff2d78] px-6 py-3.5 text-sm font-bold uppercase tracking-wide text-white shadow-[0_0_28px_rgba(255,45,120,0.55)] transition-transform hover:bg-[#ff1a6b] sm:w-auto sm:hover:scale-[1.02]"
    >
      <Upload className="h-4 w-4" />
      {label}
      <ArrowRight className="h-4 w-4" />
    </Link>
  );
}

export default function SeoLandingPage({ page }: { page: SeoLandingPageData }) {
  return (
    <div className="w-full text-white">
      <SiteHeader />

      <main className="mx-auto max-w-4xl px-4 pb-[max(4rem,var(--safe-bottom))] pt-6 sm:px-6 sm:pt-10">
        <section className="rounded-2xl border border-[#ff2d78]/25 bg-black/40 px-5 py-8 text-center shadow-[0_0_40px_rgba(255,45,120,0.15)] sm:rounded-[28px] sm:px-10 sm:py-14">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#ff2d78]">SLUTBOT AI</p>
          <h1 className="mt-4 text-[1.75rem] font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">
            {page.name}: {page.heroTagline}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">{page.heroIntro}</p>
          <div className="mt-8">
            <UploadButton />
          </div>
        </section>

        <section className="mt-14">
          <h2>{`SLUTBOT.ai vs. ${page.name}`}</h2>
          <p>{page.vsCompetitor}</p>
        </section>

        <section className="mt-14">
          <h2 className="text-center text-2xl font-black sm:text-3xl">What&apos;s {page.name} good for?</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SEO_LANDING_BENEFITS.map(({ title, body }, index) => {
              const Icon = BENEFIT_ICONS[index] ?? Sparkles;
              return (
                <article
                  key={title}
                  className="rounded-2xl border border-white/10 bg-[#141414] p-5 transition-colors hover:border-[#ff2d78]/30"
                >
                  <Icon className="h-5 w-5 text-[#ff2d78]" aria-hidden />
                  <h3 className="mt-3 text-base font-bold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/60">{body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-14 space-y-6 rounded-2xl border border-white/10 bg-[#141414] p-6 sm:p-8">
          <h2 className="text-2xl font-black sm:text-3xl">What is {page.name}?</h2>
          <p className="text-sm leading-relaxed text-white/65 sm:text-base">{page.whatIs}</p>
          <UploadButton label="Try it now" />
        </section>

        <section className="mt-14 space-y-5">
          <h2 className="text-2xl font-black sm:text-3xl">Why {page.name} is cool</h2>
          <ul className="space-y-3">
            {page.whyCool.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-relaxed text-white/65 sm:text-base">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#ff2d78]" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
          <UploadButton />
        </section>

        <section className="mt-14 space-y-6">
          <h2 className="text-2xl font-black sm:text-3xl">How to use {page.name}</h2>
          <ol className="space-y-4">
            {page.steps.map((step, index) => (
              <li
                key={step}
                className="flex gap-4 rounded-2xl border border-white/10 bg-[#141414] p-4 sm:p-5"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#ff2d78] text-sm font-black text-white">
                  {index + 1}
                </span>
                <p className="pt-1 text-sm leading-relaxed text-white/70 sm:text-base">{step}</p>
              </li>
            ))}
          </ol>
          <UploadButton label="Open generator" />
        </section>

        <section className="mt-14 rounded-[28px] border border-[#ff2d78]/30 bg-gradient-to-br from-[#1a0810] to-[#141414] px-6 py-10 text-center sm:px-10">
          <h2 className="text-2xl font-black sm:text-3xl">{page.ctaTitle}</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/65 sm:text-base">{page.ctaSubtitle}</p>
          <div className="mt-7">
            <UploadButton />
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-2xl font-black sm:text-3xl">FAQ</h2>
          <div className="mt-6 space-y-3">
            {page.faq.map(({ question, answer }) => (
              <details
                key={question}
                className="group rounded-2xl border border-white/10 bg-[#141414] open:border-[#ff2d78]/30"
              >
                <summary className="min-h-12 cursor-pointer list-none px-5 py-4 text-sm font-semibold text-white sm:text-base [&::-webkit-details-marker]:hidden">
                  {question}
                </summary>
                <p className="border-t border-white/10 px-5 py-4 text-sm leading-relaxed text-white/60">{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <p className="mt-10 text-center text-xs text-white/40">
          18+ only. AI-generated entertainment. See our{' '}
          <Link href="/terms" className="text-white/60 underline underline-offset-2 hover:text-white">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/anti-trafficking" className="text-white/60 underline underline-offset-2 hover:text-white">
            Anti-Trafficking Policy
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
