'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Download, LogOut, User, X } from 'lucide-react';
import FeaturedOn from './FeaturedOn';
import BrandLogo from './BrandLogo';
import Breadcrumbs from './Breadcrumbs';
import UserAvatar from './UserAvatar';
import {
  AUTH_CHANGED_EVENT,
  displayName,
  fetchUserProfile,
  readCachedUserProfile,
  type UserProfile,
} from '@/lib/auth/profile';
import { signOutClient } from '@/lib/auth/session';
import {
  CURRENCY_NAME,
  DESIRES_UPDATED_EVENT,
  getAuthToken,
  getDesires,
  getPaidDesires,
  openPremiumPlans,
  refreshDesiresFromServer,
  remainingGenerations,
  remainingGenerationsCopy,
} from '@/lib/desires';
import GuestSignupOffer from './GuestSignupOffer';
import {
  isStandaloneDisplay,
  promptPwaInstall,
  subscribePwaPrompt,
} from './pwaInstallClient';
import { EXPLORE_PATH, GENERATOR_PATH, loginHref, ACCOUNT_PATH, ARCHIVE_PATH, checkoutHref } from '@/lib/site';

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
  { href: EXPLORE_PATH, label: 'Explore' },
  { href: GENERATOR_PATH, label: 'AI porn generator' },
  { href: ARCHIVE_PATH, label: 'My Collection', signedInOnly: true },
  { href: ACCOUNT_PATH, label: 'Account', signedInOnly: true },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [desires, setDesires] = useState(0);
  const [signedIn, setSignedIn] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showDownloadApp, setShowDownloadApp] = useState(true);
  const [installHint, setInstallHint] = useState('');

  const refreshAuth = useCallback(() => {
    const token = getAuthToken();
    setSignedIn(Boolean(token));
    setDesires(getDesires());

    if (!token) {
      setProfile(null);
      setDesires(0);
      return;
    }

    const cached = readCachedUserProfile();
    if (cached) setProfile(cached);

    void fetchUserProfile().then((fresh) => {
      if (fresh && getAuthToken()) setProfile(fresh);
    });
  }, []);

  useEffect(() => {
    refreshAuth();
    void refreshDesiresFromServer().then((amount) => {
      setDesires(amount);
      refreshAuth();
    });
    window.addEventListener(DESIRES_UPDATED_EVENT, refreshAuth);
    window.addEventListener(AUTH_CHANGED_EVENT, refreshAuth);
    return () => {
      window.removeEventListener(DESIRES_UPDATED_EVENT, refreshAuth);
      window.removeEventListener(AUTH_CHANGED_EVENT, refreshAuth);
    };
  }, [refreshAuth]);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    if (!menuOpen) setInstallHint('');
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    void refreshDesiresFromServer().then((amount) => {
      setDesires(amount);
    });
  }, [menuOpen]);

  useEffect(() => {
    const syncInstall = () => setShowDownloadApp(!isStandaloneDisplay());
    syncInstall();
    return subscribePwaPrompt(syncInstall);
  }, []);

  async function downloadApp() {
    const outcome = await promptPwaInstall();
    if (outcome === 'accepted') {
      setShowDownloadApp(false);
      setInstallHint('');
      return;
    }
    if (outcome === 'ios-help') {
      setInstallHint('On iPhone: tap Share, then Add to Home Screen.');
      return;
    }
    setInstallHint('In your browser menu, tap Install app or Add to Home Screen.');
  }

  async function logOut() {
    setMenuOpen(false);
    await signOutClient();
    refreshAuth();
    router.push('/');
  }

  const paidDesires = getPaidDesires();
  const generations = remainingGenerations(desires, paidDesires);

  return (
    <>
      <header
        className={`relative sticky top-0 z-50 border-b border-[#ff2d78]/20 bg-[#4a122c] bg-[linear-gradient(90deg,#000_0%,#4a122c_72%)] pt-[calc(var(--safe-top)+0.375rem)] transition-shadow duration-200 sm:pt-[calc(var(--safe-top)+0.5rem)] ${
          scrolled ? 'shadow-[0_10px_28px_rgba(0,0,0,0.38)]' : ''
        }`}
      >
        <div className="safe-x relative mx-auto flex min-h-[4.75rem] max-w-[1600px] items-center justify-between gap-2 overflow-hidden py-1.5 sm:min-h-[5.5rem] sm:gap-4 sm:overflow-visible sm:py-2.5">
          <Link href="/" aria-label="AI SLUTBOT home" className="min-w-0 overflow-hidden">
            <BrandLogo className="text-[2.15rem] sm:text-[2.8rem]" />
          </Link>

          <div className="relative z-10 flex shrink-0 items-center gap-1.5 sm:gap-2.5">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                href={GENERATOR_PATH}
                className={`inline-flex h-9 items-center whitespace-nowrap rounded-md border-[2.5px] border-black bg-[#ff2d78] px-2 text-[9px] font-black uppercase tracking-[0.04em] text-white shadow-[3px_3px_0_0_#000] transition-[transform,box-shadow] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_0_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none sm:h-10 sm:px-4 sm:text-[11px] sm:tracking-[0.08em] ${
                  pathname === GENERATOR_PATH || pathname.startsWith(`${GENERATOR_PATH}/`)
                    ? 'bg-[#ff4d90]'
                    : ''
                }`}
              >
                Undress Anyone
              </Link>

              {signedIn ? (
                <Link
                  href={ARCHIVE_PATH}
                  className={`inline-flex h-9 items-center whitespace-nowrap rounded-md border-[2.5px] border-black bg-white/10 px-2 text-[9px] font-black uppercase tracking-[0.04em] text-white shadow-[3px_3px_0_0_#000] transition-[transform,box-shadow,background-color] hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-white/15 hover:shadow-[2px_2px_0_0_#000] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none sm:h-10 sm:px-3 sm:text-[10px] sm:tracking-[0.06em] ${
                    pathname === ARCHIVE_PATH ? 'bg-white/20' : ''
                  }`}
                >
                  My Collection
                </Link>
              ) : (
                <GuestSignupOffer compact />
              )}

              {signedIn ? (
                <button
                  type="button"
                  onClick={() => openPremiumPlans()}
                  className="inline-flex h-9 min-h-9 max-w-[9.5rem] shrink-0 items-center gap-1 rounded-full border border-[#ff2d78]/35 bg-black/25 px-2 text-white transition-colors hover:bg-black/35 sm:h-10 sm:max-w-none sm:gap-1.5 sm:px-2.5"
                  aria-label={`${desires.toLocaleString('en-US')} ${CURRENCY_NAME}, get more`}
                >
                  <SparkleIcon className="h-3.5 w-3.5 shrink-0 text-[#ff2d78] sm:h-4 sm:w-4" />
                  <span className="min-w-0 truncate text-xs font-bold tabular-nums sm:text-sm">
                    {desires.toLocaleString('en-US')}
                  </span>
                  <span className="shrink-0 text-[10px] font-semibold text-white/70 sm:text-[11px]">{CURRENCY_NAME}</span>
                </button>
              ) : null}
            </div>

            <button
              type="button"
              aria-label="Open menu"
              onClick={() => setMenuOpen(true)}
              className="inline-flex h-10 min-h-10 shrink-0 items-center rounded-full border border-white/15 bg-white/[0.06] p-1 text-white transition-colors hover:bg-white/10 sm:h-9"
            >
              {signedIn ? (
                <UserAvatar
                  name={profile?.name || ''}
                  email={profile?.email || ''}
                  avatarUrl={profile?.avatarUrl}
                  size={28}
                  className="ring-1 ring-white/30"
                />
              ) : (
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
                  <User className="h-3.5 w-3.5 text-white/80" />
                </span>
              )}
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
          <aside className="absolute right-0 top-0 flex h-full w-[min(82vw,280px)] flex-col overflow-visible border-l border-[#ff2d78]/25 bg-[#4a122c] px-3 pb-[max(1rem,var(--safe-bottom))] pt-[max(0.875rem,var(--safe-top))] shadow-2xl sm:w-[min(100%,300px)]">
            <div className="relative mb-3 flex items-center justify-between">
              <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/50">Menu</span>
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white/80 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {signedIn && profile ? (
              <Link
                href={ACCOUNT_PATH}
                onClick={() => setMenuOpen(false)}
                className="relative mb-2.5 flex items-center gap-2 rounded-lg border border-white/12 bg-black/20 px-2 py-1.5 transition-colors hover:bg-black/30"
              >
                <UserAvatar
                  name={profile.name}
                  email={profile.email}
                  avatarUrl={profile.avatarUrl}
                  size={28}
                />
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-white">{displayName(profile)}</p>
                  <p className="truncate text-[10px] text-white/45">{profile.email}</p>
                </div>
              </Link>
            ) : null}

            {signedIn ? (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  openPremiumPlans();
                }}
                className="relative mb-2.5 w-full rounded-lg border border-[#ff2d78]/35 bg-black/25 px-2.5 py-2.5 text-left transition-colors hover:bg-black/35"
              >
                <p className="flex items-center gap-1.5 text-[12px] font-bold text-white">
                  <SparkleIcon className="h-3.5 w-3.5 shrink-0 text-[#ff2d78]" />
                  <span className="tabular-nums">{desires.toLocaleString('en-US')}</span>
                  <span className="font-semibold text-white/75">{CURRENCY_NAME} available</span>
                  <span className="ml-auto shrink-0 text-[10px] font-semibold text-[#ff9dbe]">Get more</span>
                </p>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-white/40">Possible generations</p>
                <p className="mt-0.5 text-[12px] font-semibold leading-snug text-white/85">
                  {remainingGenerationsCopy(desires, paidDesires)}
                </p>
                <p className="mt-1 text-[10px] leading-snug text-white/45">
                  {generations.images.toLocaleString('en-US')} images · {generations.videos.toLocaleString('en-US')} videos
                  (480p)
                </p>
              </button>
            ) : (
              <Link
                href={checkoutHref({ plan: 'flirt' })}
                onClick={() => setMenuOpen(false)}
                className="relative mb-2.5 block w-full rounded-lg border border-[#ff2d78]/35 bg-black/25 px-2.5 py-2.5 text-left transition-colors hover:bg-black/35"
              >
                <p className="flex items-center gap-1.5 text-[12px] font-bold text-white">
                  <SparkleIcon className="h-3.5 w-3.5 shrink-0 text-[#ff2d78]" />
                  <span>Buy Stars</span>
                  <span className="ml-auto shrink-0 text-[10px] font-semibold text-[#ff9dbe]">See pricing</span>
                </p>
                <p className="mt-1 text-[10px] leading-snug text-white/45">
                  Choose a pack, then sign in or create an account to pay.
                </p>
              </Link>
            )}

            <Link
              href={GENERATOR_PATH}
              onClick={() => setMenuOpen(false)}
              className="relative mb-3 flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-[#ff2d78] px-3 text-[12px] font-bold text-white shadow-[0_0_16px_rgba(255,45,120,0.4)] transition-opacity hover:opacity-95"
            >
              <SparkleIcon className="h-3.5 w-3.5" />
              Generate now
            </Link>

            <nav className="relative flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto border-t border-white/15 pt-2">
              {MENU_LINKS.filter((link) => !link.signedInOnly || signedIn).map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg px-2 py-1.5 text-[12px] font-semibold text-white/80 transition-colors hover:bg-black/25 hover:text-white"
                >
                  {label}
                </Link>
              ))}
            </nav>

            <div className="relative mt-2 shrink-0 space-y-1.5">
              {showDownloadApp ? (
                <div>
                  <button
                    type="button"
                    onClick={() => void downloadApp()}
                    className="flex h-9 w-full items-center justify-center gap-1.5 rounded-full border border-white/20 bg-white/[0.08] px-3 text-[12px] font-bold text-white transition-colors hover:bg-white/15"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download the app
                  </button>
                  {installHint ? (
                    <p className="mt-1.5 px-1 text-center text-[11px] leading-snug text-white/60">{installHint}</p>
                  ) : null}
                </div>
              ) : null}
              {!signedIn ? (
                <Link
                  href={loginHref(pathname)}
                  onClick={() => setMenuOpen(false)}
                  className="flex h-9 w-full items-center justify-center rounded-full border border-white/15 px-3 text-[12px] font-bold text-white/80 transition-colors hover:bg-black/25 hover:text-white"
                >
                  Sign in
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => void logOut()}
                  className="flex h-9 w-full items-center justify-center gap-1.5 rounded-full px-3 text-[12px] font-semibold text-white/55 transition-colors hover:bg-black/25 hover:text-white"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Log out
                </button>
              )}
            </div>

            <div className="relative mt-1.5 shrink-0">
              <div className="pointer-events-none relative z-10 flex justify-center overflow-visible">
                <div
                  aria-hidden
                  className="absolute bottom-4 left-1/2 h-12 w-[70%] -translate-x-1/2 rounded-full bg-[#ff2d78]/20 blur-2xl"
                />
                <Image
                  src="/brand/menu-mascot.png"
                  alt=""
                  width={504}
                  height={994}
                  className="relative h-[min(13vh,6.75rem)] w-auto max-w-none translate-x-1 select-none object-contain object-bottom drop-shadow-[0_8px_18px_rgba(255,45,120,0.32)] sm:h-[min(20vh,10rem)]"
                  priority={false}
                />
              </div>
              <div className="relative -mt-3 bg-gradient-to-t from-[#090505] via-[#090505]/92 via-40% to-[#4a122c]/0 px-2 pb-[max(0.5rem,var(--safe-bottom))] pt-5">
                <FeaturedOn variant="menu" />
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
