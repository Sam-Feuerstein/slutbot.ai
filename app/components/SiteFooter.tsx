import Link from 'next/link';
import { Instagram } from 'lucide-react';
import BrandLogo from './BrandLogo';
import { SEO_LANDING_PAGES } from '@/lib/seoLandingPages';

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function RedditIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.03 4.87-7.004 4.87-3.974 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
    </svg>
  );
}

const LEGAL_LINKS = [
  { label: 'Terms of service', href: '/terms' },
  { label: 'Privacy policy', href: '/privacy' },
  { label: 'Cookie policy', href: '/cookies' },
  { label: 'Anti-Trafficking & Abuse Policy', href: '/anti-trafficking' },
  { label: '18 U.S.C. 2257 Record-Keeping Requirements Compliance Statement', href: '/2257' },
  { label: 'Content removal', href: '/content-removal' },
];

export default function SiteFooter() {
  return (
    <footer className="relative mt-auto border-t border-white/10 bg-[#121212] pb-[var(--safe-bottom)] text-white">
      <div className="safe-x mx-auto max-w-[1600px] py-8 sm:py-12 lg:py-14">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
          <div>
            <Link href="/" aria-label="AISLUTBOT home" className="inline-block">
              <BrandLogo className="text-[2.4rem] sm:text-[2.6rem]" />
            </Link>
            <p className="mt-3 max-w-[22rem] text-sm leading-relaxed text-white/55">
              Experience AI SLUTBOT the cutting edge of AI nude video and image generation. Bring
              your AI SLUT BOT to life in just a few clicks.
            </p>
            <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Follow us
            </p>
            <div className="mt-3 flex items-center gap-3">
              {[
                { label: 'X', Icon: XIcon },
                { label: 'Reddit', Icon: RedditIcon },
                { label: 'Instagram', Icon: Instagram },
              ].map(({ label, Icon }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/70 transition-colors hover:border-white/40 hover:text-white"
                >
                  <Icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">Tools</p>
            <ul className="mt-4 space-y-2">
              {SEO_LANDING_PAGES.map(({ slug, name }) => (
                <li key={slug}>
                  <Link href={`/${slug}`} className="text-sm text-white/65 transition-colors hover:text-white">
                    {name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
              Legal &amp; safety
            </p>
            <ul className="mt-4 space-y-2">
              {LEGAL_LINKS.map(({ label, href }) => (
                <li key={label}>
                  {href.startsWith('/') ? (
                    <Link href={href} className="text-sm text-white/65 transition-colors hover:text-white">
                      {label}
                    </Link>
                  ) : (
                    <a href={href} className="text-sm text-white/65 transition-colors hover:text-white">
                      {label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="safe-x mx-auto grid max-w-[1600px] gap-6 py-8 text-xs leading-relaxed text-white/45 lg:grid-cols-2 lg:gap-10">
          <div className="space-y-3">
            <a
              href="https://www.rtalabel.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block"
            >
              <img
                src="/rta-label.jpg"
                alt="RTA — Restricted to Adults"
                width={120}
                height={48}
                loading="lazy"
                decoding="async"
                className="h-10 w-auto bg-white"
              />
            </a>
            <p>© 2023–2026 AI SLUTBOT</p>
            <p>
              AI SLUTBOT and related marks are trademarks. Unauthorized use is prohibited.
            </p>
          </div>
          <div>
            <p>
              All content on this website is AI-generated. It is for entertainment purposes only
              and does not depict real individuals or events. By using this site, you agree that you
              are solely responsible for your use and any content you create.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
