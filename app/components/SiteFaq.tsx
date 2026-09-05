import Link from 'next/link';
import { SITE_FAQ } from '@/lib/siteFaq';
import { GENERATOR_PATH, HELLO_EMAIL } from '@/lib/site';

type Props = {
  title?: string;
  className?: string;
  variant?: 'light' | 'checkout';
};

function FaqAnswer({ question, answer }: { question: string; answer: string }) {
  if (question === 'Can I use AISLUTBOT on my phone?') {
    return (
      <>
        Yes! AISLUTBOT works on your phone, and we even have an app.{' '}
        <Link href={GENERATOR_PATH} className="text-[#ff2d78] underline underline-offset-2 hover:text-[#c81e5a]">
          Download it here
        </Link>
        .
      </>
    );
  }

  if (question === 'How do I contact support if payment or generation fails?') {
    return (
      <>
        Just email our support team at{' '}
        <a href={`mailto:${HELLO_EMAIL}`} className="text-[#ff2d78] underline underline-offset-2 hover:text-[#c81e5a]">
          {HELLO_EMAIL}
        </a>{' '}
        and we will be happy to help.
      </>
    );
  }

  return answer;
}

export default function SiteFaq({ title = 'FAQ', className = '', variant = 'light' }: Props) {
  const isCheckout = variant === 'checkout';

  return (
    <section className={className}>
      <h2
        className={
          isCheckout
            ? 'text-center text-sm font-black uppercase tracking-[0.16em] text-zinc-900'
            : 'text-center text-[12px] font-black uppercase tracking-[0.14em] text-zinc-700'
        }
      >
        {title}
      </h2>
      <div className={isCheckout ? 'mt-4 space-y-2' : 'mt-2 space-y-1.5'}>
        {SITE_FAQ.map(({ question, answer }) => (
          <details
            key={question}
            className={
              isCheckout
                ? 'group rounded-xl border border-zinc-200 bg-white open:border-zinc-300 open:bg-zinc-50'
                : 'rounded-xl border border-zinc-200 bg-zinc-50 open:border-[#ff2d78]/40'
            }
          >
            <summary
              className={
                isCheckout
                  ? 'flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[13px] font-semibold text-zinc-900 [&::-webkit-details-marker]:hidden'
                  : 'cursor-pointer list-none px-3 py-2 text-[12px] font-semibold text-zinc-800 [&::-webkit-details-marker]:hidden'
              }
            >
              <span>{question}</span>
              {isCheckout ? (
                <svg
                  viewBox="0 0 20 20"
                  className="h-4 w-4 shrink-0 text-zinc-400 transition group-open:rotate-180"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="m5 8 5 5 5-5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}
            </summary>
            <p
              className={
                isCheckout
                  ? 'border-t border-zinc-200 px-4 py-3 text-[12px] leading-relaxed text-zinc-600'
                  : 'border-t border-zinc-200 px-3 py-2 text-[11px] leading-relaxed text-zinc-600'
              }
            >
              <FaqAnswer question={question} answer={answer} />
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}
