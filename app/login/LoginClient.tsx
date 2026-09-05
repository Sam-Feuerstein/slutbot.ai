'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import FeaturedOn from '@/app/components/FeaturedOn';
import BrandLogo from '@/app/components/BrandLogo';
import TelegramLoginButton from '@/app/components/TelegramLoginButton';
import { storeAuthSession, clearAuthSession } from '@/lib/auth/session';
import { checkoutPromoMediaUrl } from '@/lib/presetMedia';
import { safeNextPath } from '@/lib/site';

export { storeAuthSession, clearAuthSession };

const LOGIN_BG_VIDEO = checkoutPromoMediaUrl('AISLUTBOT-NUDE GENERATOR.mp4');
const LOGIN_BG_POSTER = checkoutPromoMediaUrl('swipey-promo.jpg', '/checkout/swipey-promo.jpg');


function GoogleMark() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function loginModeHref(mode: 'signin' | 'signup', redirect: string) {
  const params = new URLSearchParams({ redirect });
  if (mode === 'signin') {
    params.set('mode', 'signin');
  }
  return `/login?${params.toString()}`;
}

function loginBackPath(redirect: string) {
  const pathname = redirect.split('?')[0];
  if (
    pathname === '/login' ||
    pathname.startsWith('/login/') ||
    pathname.startsWith('/account') ||
    pathname.startsWith('/admin')
  ) {
    return '/';
  }
  return redirect || '/';
}

export default function LoginClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = safeNextPath(searchParams.get('redirect'));
  const fromCheckout = redirect.startsWith('/checkout');
  const backPath = loginBackPath(redirect);
  const isSignup = searchParams.get('mode') !== 'signin';

  const [error, setError] = useState('');

  const googleHref = useMemo(
    () => `/api/auth/google?redirect=${encodeURIComponent(redirect)}`,
    [redirect],
  );

  useEffect(() => {
    const oauthError = searchParams.get('error');
    if (oauthError) {
      setError(oauthError);
    }
  }, [searchParams]);

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-[#0a0208] text-white">
      {/* Desktop: full-bleed background video */}
      <video
        src={LOGIN_BG_VIDEO}
        poster={LOGIN_BG_POSTER}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        className="absolute inset-0 hidden h-full w-full object-cover object-top md:block"
        aria-hidden
      />
      <div className="absolute inset-0 hidden bg-[#0a0208]/18 md:block" aria-hidden />
      <div
        className="absolute inset-0 hidden bg-[radial-gradient(ellipse_120%_80%_at_50%_0%,rgba(255,45,120,0.1),transparent_55%),radial-gradient(ellipse_90%_60%_at_100%_100%,rgba(120,18,72,0.1),transparent_50%),linear-gradient(180deg,rgba(74,18,44,0.28)_0%,rgba(26,6,18,0.34)_45%,rgba(10,2,8,0.4)_100%)] md:block"
        aria-hidden
      />
      <div
        className="absolute inset-0 hidden opacity-[0.025] [background-image:repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,45,120,0.65)_2px,rgba(255,45,120,0.65)_3px)] md:block"
        aria-hidden
      />
      <div
        className="absolute inset-0 hidden bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(10,2,8,0.18)_100%)] md:block"
        aria-hidden
      />

      {/* Mobile: full-width top video (checkout-style) */}
      <div className="relative shrink-0 md:hidden">
        <div className="relative aspect-[16/8.1] overflow-hidden bg-[#090505]">
          <video
            src={LOGIN_BG_VIDEO}
            poster={LOGIN_BG_POSTER}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            className="h-full w-full object-cover object-top"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-[#090505]/85 to-transparent px-3 pb-6 pt-[max(0.625rem,var(--safe-top))]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0a0208] via-[#0a0208]/80 to-transparent px-3 pb-2.5 pt-10"
            aria-hidden
          />
          <button
            type="button"
            aria-label="Back"
            onClick={() => router.push(backPath)}
            className="absolute left-3 top-[max(0.625rem,var(--safe-top))] z-10 inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#141414]/80 text-white backdrop-blur-sm hover:bg-[#141414]"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      {/* Desktop back button */}
      <button
        type="button"
        aria-label="Back"
        onClick={() => router.push(backPath)}
        className="absolute left-4 top-[max(1rem,var(--safe-top))] z-50 hidden h-10 items-center gap-0.5 rounded-full border border-white/15 bg-black/40 px-3 text-sm font-semibold text-white/90 backdrop-blur-md hover:bg-black/55 hover:text-white md:left-6 md:inline-flex"
      >
        <ChevronLeft className="h-5 w-5" aria-hidden />
        Back
      </button>

      <div className="relative z-10 flex flex-1 items-start justify-center px-4 pb-6 pt-4 md:items-center md:py-[max(1.5rem,var(--safe-top))]">
        <div className="mx-auto flex w-full max-w-[420px] flex-col items-center">
          <div className="relative w-full overflow-hidden rounded-2xl border border-[#ff2d78]/35 bg-[#140810]/75 p-6 shadow-[0_0_40px_rgba(255,45,120,0.18),0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-md">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ff2d78]/80 to-transparent"
              aria-hidden
            />

            <div className="mb-5 grid grid-cols-2 gap-1 rounded-full border border-white/10 bg-black/35 p-1">
              <Link
                href={loginModeHref('signup', redirect)}
                className={`rounded-full px-3 py-2.5 text-center text-xs font-bold transition sm:text-sm ${
                  isSignup
                    ? 'bg-[#ff2d78] text-white shadow-[0_0_16px_rgba(255,45,120,0.35)]'
                    : 'text-white/55 hover:text-white/80'
                }`}
                aria-current={isSignup ? 'page' : undefined}
              >
                Create account
              </Link>
              <Link
                href={loginModeHref('signin', redirect)}
                className={`rounded-full px-3 py-2.5 text-center text-xs font-bold transition sm:text-sm ${
                  !isSignup
                    ? 'bg-[#ff2d78] text-white shadow-[0_0_16px_rgba(255,45,120,0.35)]'
                    : 'text-white/55 hover:text-white/80'
                }`}
                aria-current={!isSignup ? 'page' : undefined}
              >
                Sign in
              </Link>
            </div>

            <div>
              <h1 className="text-center text-2xl font-black tracking-tight text-white drop-shadow-[0_0_12px_rgba(255,45,120,0.35)]">
                {isSignup
                  ? fromCheckout
                    ? 'Create account to complete payment'
                    : 'Create your account'
                  : fromCheckout
                    ? 'Sign in to complete payment'
                    : 'Welcome back'}
              </h1>
              {fromCheckout ? (
                <p className="mt-2 text-center text-sm text-white/55">
                  Then we’ll send you back to checkout to finish.
                </p>
              ) : null}
            </div>

            {error ? <p className="mt-4 text-center text-sm text-[#ffb0c8]">{error}</p> : null}

            <Link
              href={googleHref}
              className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-full border border-[#dadce0] bg-white py-3.5 text-sm font-bold text-[#3c4043] shadow-[0_1px_3px_rgba(60,64,67,0.15)] transition hover:bg-[#f8f9fa] hover:shadow-[0_2px_6px_rgba(60,64,67,0.2)]"
            >
              <GoogleMark />
              {isSignup ? 'Create account with Google' : 'Continue with Google'}
            </Link>

            <TelegramLoginButton
              redirect={redirect}
              label={isSignup ? 'Create account with Telegram' : 'Continue with Telegram'}
            />

            <p className="mt-4 text-center text-[11px] leading-relaxed text-white/35">
              By continuing, you agree to our{' '}
              <Link href="/terms" className="underline underline-offset-2 hover:text-white/55">
                Terms
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="underline underline-offset-2 hover:text-white/55">
                Privacy Policy
              </Link>
              . 18+ only.
            </p>
          </div>
        </div>
      </div>

      <footer className="relative z-10 shrink-0 border-t border-[#ff2d78]/25 bg-gradient-to-t from-[#0a0208]/75 via-[#140810]/45 to-transparent backdrop-blur-md">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ff2d78]/70 to-transparent"
          aria-hidden
        />
        <div className="safe-x mx-auto flex max-w-[720px] flex-col items-center px-4 py-6 pb-[max(1.25rem,var(--safe-bottom))] sm:py-8">
          <FeaturedOn variant="login-content" />
          <BrandLogo className="mt-5 text-[2rem] sm:mt-6 sm:text-[2.3rem]" />
        </div>
      </footer>
    </div>
  );
}
