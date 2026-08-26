'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ChevronRight, Menu, X } from 'lucide-react';
import BrandLogo from './BrandLogo';
import Breadcrumbs from './Breadcrumbs';
import {
  CURRENCY_NAME,
  DESIRES_UPDATED_EVENT,
  formatDesireBalance,
  getDesires,
  getAuthToken,
  openPremiumPlans,
  refreshDesiresFromServer,
} from '@/lib/desires';
import { GENERATOR_PATH, loginHref } from '@/lib/site';

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 22 22"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
        d="M17.852 1.072c-.112.06-.16.16-.288.582-.261.866-.297.943-.574 1.215-.248.243-.3.269-.993.488-.703.222-.734.238-.802.4-.079.188-.043.345.11.48.05.045.339.155.64.243.689.202.852.284 1.103.557.215.233.274.367.517 1.173.143.475.166.518.325.594s.185.075.34 0c.186-.087.208-.134.482-1.02.255-.82.468-1.004 1.551-1.33.61-.185.737-.274.737-.513 0-.285-.132-.376-.847-.583-.983-.285-1.19-.476-1.467-1.358-.246-.784-.273-.849-.393-.933-.13-.09-.267-.09-.44.005M9.97 2.535a.7.7 0 0 0-.206.159c-.06.065-.407.936-.791 1.983-.795 2.17-.879 2.366-1.24 2.906a5.8 5.8 0 0 1-2.088 1.9c-.234.124-1.283.539-2.332.922s-1.958.729-2.02.77c-.373.244-.393.863-.035 1.097.061.04.982.394 2.046.785 1.065.391 2.059.774 2.21.85a6.2 6.2 0 0 1 2.038 1.714c.425.574.64 1.048 1.368 3.035.392 1.068.748 1.996.79 2.061.095.144.373.283.567.283.172 0 .432-.151.537-.313.043-.065.336-.822.65-1.682.315-.86.632-1.72.705-1.911.4-1.058 1.008-1.898 1.83-2.533.82-.632.964-.695 4.718-2.054.588-.213.744-.354.778-.703.026-.274-.069-.511-.25-.628-.062-.04-.728-.295-1.481-.569-2.21-.801-2.498-.913-2.839-1.094a5.9 5.9 0 0 1-2.353-2.27c-.22-.376-.349-.7-1.136-2.852-.608-1.663-.62-1.692-.814-1.81-.159-.096-.476-.119-.652-.046"
      />
    </svg>
  );
}

const MENU_LINKS = [
  { href: '/', label: 'Explore' },
  { href: GENERATOR_PATH, label: 'AI porn generator' },
  { href: '/archive', label: 'My Collection' },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [desires, setDesires] = useState(0);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const load = () => {
      setDesires(getDesires());
      setSignedIn(Boolean(getAuthToken()));
    };
    load();
    void refreshDesiresFromServer().then((amount) => {
      setDesires(amount);
      setSignedIn(Boolean(getAuthToken()));
    });
    window.addEventListener(DESIRES_UPDATED_EVENT, load);
    return () => window.removeEventListener(DESIRES_UPDATED_EVENT, load);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  return (
    <>
      <header className="relative sticky top-0 z-50 overflow-hidden border-b border-[#ff2d78]/25 bg-[#4a122c] pt-[var(--safe-top)] md:bg-[#4a122c]/95 md:backdrop-blur-md">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-[min(52%,28rem)] bg-[linear-gradient(90deg,#000_0%,#000_38%,transparent_100%)]"
        />
        <div className="safe-x relative mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-2 sm:h-20 sm:gap-4">
          <Link href="/" aria-label="AI SLUTBOT home" className="flex min-w-0 items-center gap-3 sm:gap-4">
            <BrandLogo className="h-[44px] w-auto sm:h-[56px]" />

            <div className="hidden h-7 w-px shrink-0 bg-white/20 sm:block" />

            <span className="hidden truncate text-[11px] font-medium uppercase tracking-[0.14em] text-white/55 sm:block">
              #1 Adult Video Generator
            </span>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            <Link
              href="/"
              className={`inline-flex h-9 items-center rounded-full border px-4 text-xs font-bold uppercase tracking-[0.12em] transition-colors ${
                pathname === '/'
                  ? 'border-[#ff2d78]/50 bg-[#ff2d78]/15 text-white'
                  : 'border-white/15 bg-white/[0.06] text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              Explore
            </Link>
            <Link
              href={GENERATOR_PATH}
              className={`inline-flex h-9 items-center rounded-full border px-4 text-xs font-bold uppercase tracking-[0.12em] transition-colors ${
                pathname === GENERATOR_PATH || pathname.startsWith(`${GENERATOR_PATH}/`)
                  ? 'border-[#ff2d78]/50 bg-[#ff2d78]/15 text-white'
                  : 'border-white/15 bg-white/[0.06] text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              AI porn generator
            </Link>
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
            <Link
              href={signedIn ? GENERATOR_PATH : loginHref(pathname)}
              className="hidden h-9 items-center rounded-full border border-white/15 bg-white/[0.06] px-3 text-xs font-bold text-white/80 hover:bg-white/10 sm:inline-flex"
            >
              {signedIn ? 'Account' : 'Sign in'}
            </Link>

            <button
              type="button"
              onClick={openPremiumPlans}
              title={CURRENCY_NAME}
              className="inline-flex h-10 min-h-10 items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:h-9 sm:gap-2 sm:px-3"
            >
              <SparkleIcon className="h-4 w-4 text-[#ff2d78] sm:h-[18px] sm:w-[18px]" />
              <span className="tabular-nums">{formatDesireBalance(desires)}</span>
              <ChevronRight className="hidden h-4 w-4 text-white/70 sm:block" />
            </button>

            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white transition-colors hover:bg-white/10 sm:h-9 sm:w-9"
            >
              <Menu className="h-5 w-5 sm:h-[18px] sm:w-[18px]" />
            </button>
          </div>
        </div>
      </header>
      <Breadcrumbs />

      {menuOpen ? (
        <div className="fixed inset-0 z-[100]">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/70 md:backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="absolute right-0 top-0 flex h-full w-[min(100%,360px)] flex-col border-l border-white/10 bg-[#0a0a0a] px-5 pb-[max(1.25rem,var(--safe-bottom))] pt-[max(1.25rem,var(--safe-top))] shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <span className="text-lg font-bold text-white">Menu</span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="flex flex-col gap-1">
              {MENU_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-xl px-4 py-3.5 text-base font-semibold text-white/85 transition-colors hover:bg-white/[0.06]"
                >
                  {label}
                </Link>
              ))}
              <Link
                href={signedIn ? GENERATOR_PATH : loginHref(pathname)}
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-4 py-3.5 text-base font-semibold text-white/85 transition-colors hover:bg-white/[0.06]"
              >
                {signedIn ? 'Account' : 'Sign in'}
              </Link>
            </nav>

            <div className="mt-auto space-y-2 border-t border-white/10 pt-5">
              <Link
                href={GENERATOR_PATH}
                onClick={() => setMenuOpen(false)}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#ff2d78] px-4 py-3 text-sm font-bold text-white shadow-[0_0_20px_rgba(255,45,120,0.45)]"
              >
                <SparkleIcon className="h-[18px] w-[18px]" />
                Generate now
              </Link>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
