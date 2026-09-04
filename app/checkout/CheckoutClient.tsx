'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { rememberBalanceBeforePayment, BALANCE_BEFORE_KEY } from '@/app/components/PaymentSuccessBanner';
import { CURRENCY_NAME, getAuthToken, getDesires, syncPurchasedDesires } from '@/lib/desires';
import { getAuthEpoch } from '@/lib/auth/session';
import { tryRestoreSessionFromCookie } from '@/lib/auth/syncSession';
import { loginHref, HELLO_EMAIL, checkoutBannerCopy, GENERATOR_PATH } from '@/lib/site';
import { capturePosthogEvent, capturePosthogException } from '@/lib/posthog';
import { trackEvent } from '@/lib/trackClient';
import FeaturedOn from '@/app/components/FeaturedOn';
import BrandLogo from '@/app/components/BrandLogo';
import { checkoutPromoMediaUrl } from '@/lib/presetMedia';
import {
  PREMIUM_PLANS,
  planOfferBaseline,
  planOfferMoreBadgeLabel,
  planStarsLabel,
  type PremiumPlan,
} from '@/lib/premiumPlans';

export type CheckoutMethod = 'stars';

type Props = {
  plan: PremiumPlan;
};

const PACKS = [...PREMIUM_PLANS].sort((a, b) => a.stars - b.stars);
const CHECKOUT_PAY_INTENT_KEY = 'aislutbot-checkout-pay';
const CHECKOUT_PROMO_VIDEO = checkoutPromoMediaUrl('swipey-promo.mp4', '/checkout/swipey-promo.mp4');
const CHECKOUT_PROMO_POSTER = checkoutPromoMediaUrl('swipey-promo.jpg', '/checkout/swipey-promo.jpg');

type CheckoutPayIntent = {
  plan: string;
  agreed: boolean;
  agreedNoMinors: boolean;
};

function readPayIntent(): CheckoutPayIntent | null {
  try {
    const raw = sessionStorage.getItem(CHECKOUT_PAY_INTENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CheckoutPayIntent>;
    if (!parsed.plan || typeof parsed.plan !== 'string') return null;
    return {
      plan: parsed.plan,
      agreed: Boolean(parsed.agreed),
      agreedNoMinors: Boolean(parsed.agreedNoMinors),
    };
  } catch {
    return null;
  }
}

function writePayIntent(intent: CheckoutPayIntent) {
  sessionStorage.setItem(CHECKOUT_PAY_INTENT_KEY, JSON.stringify(intent));
}

function clearPayIntent() {
  sessionStorage.removeItem(CHECKOUT_PAY_INTENT_KEY);
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/payments/telegram-icon.png"
      alt=""
      width={32}
      height={32}
      loading="lazy"
      decoding="async"
      className={className ?? 'h-6 w-6 shrink-0 rounded-md'}
    />
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? 'h-3.5 w-3.5'} fill="currentColor" aria-hidden>
      <path d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-7-2a2 2 0 1 1 4 0v2h-4V6z" />
    </svg>
  );
}

function openPaymentUrl(url: string): 'popup' | 'same-tab' | 'blocked' {
  const isMobile = window.matchMedia('(max-width: 767px)').matches;
  if (isMobile) {
    window.location.assign(url);
    return 'same-tab';
  }
  const popup = window.open(url, '_blank', 'noopener,noreferrer');
  if (!popup) return 'blocked';
  return 'popup';
}

export default function CheckoutClient({ plan }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkoutReason = searchParams.get('reason')?.trim() || '';
  const checkoutBanner = checkoutBannerCopy(checkoutReason);
  const [authReady, setAuthReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [planId, setPlanId] = useState(plan.id);
  const method: CheckoutMethod = 'stars';
  const [agreed, setAgreed] = useState(false);
  const [agreedNoMinors, setAgreedNoMinors] = useState(false);
  const [buying, setBuying] = useState(false);
  const [note, setNote] = useState('');
  const [termsNote, setTermsNote] = useState('');
  const [minorsNote, setMinorsNote] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentReceived, setPaymentReceived] = useState(false);
  const balanceBeforePayment = useRef(0);
  const pollRef = useRef<number | null>(null);
  const payButtonRef = useRef<HTMLButtonElement>(null);
  const resumePayRef = useRef(false);
  const watchForPaymentRef = useRef<(beforeOverride?: number) => void>(() => {});

  const selected = PREMIUM_PLANS.find((item) => item.id === planId) ?? plan;
  const selectedStars = selected.stars;
  const payLabel = useMemo(() => {
    if (buying) return 'Opening Telegram…';
    return `Pay ${planStarsLabel(selectedStars)}`;
  }, [buying, selectedStars]);

  const checkoutPath = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('plan', planId);
    params.set('method', 'stars');
    return `/checkout?${params.toString()}`;
  }, [searchParams, planId]);

  useEffect(() => {
    let cancelled = false;
    const epoch = getAuthEpoch();

    void (async () => {
      let signedIn = Boolean(getAuthToken());
      if (!signedIn) {
        signedIn = await tryRestoreSessionFromCookie(epoch);
      }

      if (cancelled || epoch !== getAuthEpoch()) return;
      setSignedIn(signedIn);
      setAuthReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const markPaymentReceived = (balance: number, before: number) => {
    const added = balance - before;
    setPaymentReceived(true);
    setToast(
      `Payment received — ${added.toLocaleString('en-US')} ${CURRENCY_NAME} added. Balance: ${balance.toLocaleString('en-US')}.`,
    );
    balanceBeforePayment.current = balance;
    try {
      sessionStorage.removeItem(BALANCE_BEFORE_KEY);
    } catch {
      /* ignore */
    }
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const watchForPayment = (beforeOverride?: number) => {
    const stored = Number(sessionStorage.getItem(BALANCE_BEFORE_KEY) || '');
    const before =
      typeof beforeOverride === 'number' && Number.isFinite(beforeOverride)
        ? beforeOverride
        : Number.isFinite(stored)
          ? stored
          : balanceBeforePayment.current;
    balanceBeforePayment.current = before;

    const check = () =>
      void syncPurchasedDesires().then((balance) => {
        if (balance > before) markPaymentReceived(balance, before);
      });

    check();
    if (pollRef.current) window.clearInterval(pollRef.current);
    let ticks = 0;
    pollRef.current = window.setInterval(() => {
      ticks += 1;
      check();
      if (ticks >= 120 && pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }, 4000);
  };
  watchForPaymentRef.current = watchForPayment;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const waiting = sessionStorage.getItem(BALANCE_BEFORE_KEY);
    if (waiting) watchForPaymentRef.current();

    const onResume = () => {
      if (document.visibilityState !== 'visible') return;
      const beforeRaw = sessionStorage.getItem(BALANCE_BEFORE_KEY);
      if (!beforeRaw) {
        void syncPurchasedDesires();
        return;
      }
      watchForPaymentRef.current();
    };
    document.addEventListener('visibilitychange', onResume);
    window.addEventListener('focus', onResume);
    return () => {
      document.removeEventListener('visibilitychange', onResume);
      window.removeEventListener('focus', onResume);
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    trackEvent('checkout_view', { kind: 'view', plan: plan.id, method: 'stars' });
  }, [plan.id]);

  const replaceCheckout = (nextPlan: string) => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('plan', nextPlan);
    params.set('method', 'stars');
    const next = `/checkout?${params.toString()}`;
    window.history.replaceState(window.history.state, '', next);
  };

  const selectPlan = (id: string) => {
    setPlanId(id);
    trackEvent('checkout_plan', { kind: 'click', plan: id, method });
    replaceCheckout(id);
  };

  const startCheckout = async (opts?: { agreed?: boolean; agreedNoMinors?: boolean }) => {
    const termsOk = opts?.agreed ?? agreed;
    const minorsOk = opts?.agreedNoMinors ?? agreedNoMinors;
    if (!minorsOk) {
      setMinorsNote('Please confirm you will not use minor photos.');
      document.getElementById('checkout-no-minors')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!termsOk) {
      setTermsNote('Please tick the box to confirm you are 18+ and agree to the Terms of Service.');
      document.getElementById('checkout-age-terms')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!getAuthToken()) {
      writePayIntent({ plan: selected.id, agreed: true, agreedNoMinors: true });
      router.push(loginHref(checkoutPath));
      return;
    }
    clearPayIntent();
    trackEvent('checkout_pay', { kind: 'click', plan: selected.id, method });
    setBuying(true);
    setNote('');
    setTermsNote('');
    setMinorsNote('');
    setToast('Opening Telegram for a secure card payment…');
    try {
      const res = await fetch('/api/payments/stars', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: selected.id,
        }),
      });
      const data = (await res.json()) as { url?: string; message?: string };
      if (res.status === 401) {
        setToast(null);
        router.push(loginHref(checkoutPath));
        return;
      }
      if (!res.ok || !data.url) {
        setToast(null);
        setNote(data.message || 'Could not start checkout.');
        capturePosthogEvent('checkout_error', {
          stage: 'start_checkout',
          plan: selected.id,
          method,
          status: res.status,
          message: data.message || 'Could not start checkout.',
        });
        return;
      }

      balanceBeforePayment.current = getDesires();
      rememberBalanceBeforePayment();

      const opened = openPaymentUrl(data.url);
      if (opened === 'blocked') {
        setPaymentUrl(data.url);
        setToast(null);
        capturePosthogEvent('checkout_error', {
          stage: 'popup_blocked',
          plan: selected.id,
          method,
        });
      } else if (opened === 'same-tab') {
        return;
      } else {
        setPaymentUrl(null);
        setToast('Finish in Telegram. This page updates when Stars land.');
      }

      watchForPayment(balanceBeforePayment.current);
    } catch (error) {
      setToast(null);
      setNote('Could not start checkout.');
      capturePosthogException(error, { source: 'checkout', stage: 'start_checkout', plan: selected.id, method });
      capturePosthogEvent('checkout_error', { stage: 'start_checkout', plan: selected.id, method });
    } finally {
      setBuying(false);
    }
  };

  useEffect(() => {
    if (!authReady || !signedIn || resumePayRef.current) return;
    const intent = readPayIntent();
    if (!intent?.agreed || !intent?.agreedNoMinors) return;
    resumePayRef.current = true;
    setAgreed(true);
    setAgreedNoMinors(true);
    void startCheckout({ agreed: true, agreedNoMinors: true });
  }, [authReady, signedIn]);

  return (
    <div className="relative flex min-h-dvh flex-col overflow-x-hidden bg-[#0a0208] text-white">
      <video
        src={CHECKOUT_PROMO_VIDEO}
        poster={CHECKOUT_PROMO_POSTER}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover object-top"
        aria-hidden
      />
      <div className="absolute inset-0 bg-[#0a0208]/38" aria-hidden />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_0%,rgba(255,45,120,0.12),transparent_55%),linear-gradient(180deg,rgba(10,2,8,0.2)_0%,rgba(10,2,8,0.55)_100%)]"
        aria-hidden
      />

      {toast ? (
        <div className="fixed right-4 top-4 z-[220] max-w-[min(92vw,360px)]">
          <div
            role="status"
            className="relative flex items-center gap-3 rounded-xl border border-[#c8e6c9] bg-[#e8f5e9] px-4 py-3 pr-5 shadow-[0_8px_24px_rgba(46,125,50,0.18)]"
          >
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => setToast(null)}
              className="absolute -left-2 -top-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#c8e6c9] bg-[#e8f5e9] text-[11px] text-[#2e7d32]"
            >
              ×
            </button>
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#2e7d32] text-white">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" aria-hidden>
                <path
                  d="M5 12.5 9.5 17 19 7.5"
                  stroke="currentColor"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <p className="text-sm font-medium text-[#1b5e20]">{toast}</p>
            {paymentReceived ? (
              <Link
                href={GENERATOR_PATH}
                className="ml-1 shrink-0 text-sm font-semibold text-[#1b5e20] underline underline-offset-2"
              >
                Start generating
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      <nav className="relative z-20 flex items-center gap-2 px-4 pt-[max(0.75rem,var(--safe-top))] sm:px-6">
        <Link
          href="/tool"
          aria-label="Back"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur-md hover:bg-black/55"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
            <path
              d="M15 6 9 12l6 6"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <Link href="/" className="inline-block">
          <BrandLogo className="text-[1.25rem] sm:text-[1.35rem]" />
        </Link>
        <span className="text-white/40">/</span>
        <span className="text-sm font-medium text-white/90">Checkout</span>
      </nav>

      <main className="relative z-10 flex flex-1 items-start justify-center px-4 py-5 sm:items-center sm:py-8">
        <div className="relative w-full max-w-[560px] overflow-hidden rounded-2xl border border-[#ff2d78]/35 bg-[#140810]/82 p-4 shadow-[0_0_40px_rgba(255,45,120,0.18),0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-md sm:p-5">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ff2d78]/80 to-transparent"
            aria-hidden
          />

          <h1 className="text-center text-xl font-black tracking-tight text-white sm:text-2xl">Choose a pack</h1>
          <p className="mt-1 text-center text-sm text-white/60">
            One-time payment. Stars never expire. Pay by card in Telegram.
          </p>

          {checkoutBanner ? (
            <p className="mt-3 rounded-xl border border-[#fde68a]/40 bg-[#fffbeb]/95 px-3 py-2 text-center text-sm text-[#854d0e]">
              {checkoutBanner}
            </p>
          ) : null}

          <div className="mt-4 rounded-xl bg-white p-3 sm:p-4">
            <div className="grid grid-cols-1 gap-1.5" role="radiogroup" aria-label="Packs">
              {PACKS.map((pack) => {
                const active = pack.id === selected.id;
                const moreBadge = planOfferMoreBadgeLabel(pack);
                const baseline = planOfferBaseline(pack);
                const extraImages = Math.max(0, pack.imageGenerations - baseline.images);
                const extraVideos = Math.max(0, pack.videoGenerations - baseline.videos);
                const showImages = pack.imageGenerations + extraImages;
                const showVideos = pack.videoGenerations + extraVideos;
                return (
                  <button
                    key={pack.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => selectPlan(pack.id)}
                    className={`relative flex w-full items-center gap-2.5 rounded-xl border px-3 py-1.5 text-left transition ${
                      active
                        ? 'border-[#ff2d78] bg-[#ff2d78]/10 shadow-[0_0_0_1px_rgba(255,45,120,0.25)]'
                        : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300'
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        active ? 'border-[#ff2d78]' : 'border-zinc-400'
                      }`}
                    >
                      {active ? <span className="h-2 w-2 rounded-full bg-[#ff2d78]" /> : null}
                    </span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="flex min-w-0 items-center gap-1 whitespace-nowrap">
                        <span className="min-w-0 truncate text-[12px] font-bold text-zinc-900 sm:text-[13px]">
                          {pack.name} {showImages.toLocaleString('en-US')} images or{' '}
                          {showVideos.toLocaleString('en-US')} videos
                        </span>
                        {moreBadge ? (
                          <span className="shrink-0 rounded-md bg-[#ff2d78] px-1.5 py-px text-[7px] font-black uppercase tracking-wide text-white shadow-[0_1px_0_rgba(255,255,255,0.25)_inset] sm:text-[8px]">
                            {moreBadge}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-[12px] font-bold text-zinc-900 sm:text-[13px]">
                      {planStarsLabel(pack.stars)}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 border-t border-zinc-200 pt-3">
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase leading-tight text-zinc-900">
                <TelegramIcon className="h-[22px] w-[22px] shrink-0 rounded-md" />
                Secure debit/credit card payment via Telegram
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/payments/wallet-logos.png"
                alt="Mastercard, Visa, Google Pay, Apple Pay"
                className="mx-auto mt-2 block h-[31px] w-auto max-w-[220px] object-contain sm:h-[36px] sm:max-w-[260px]"
              />
            </div>

            <label
              htmlFor="checkout-no-minors"
              className="mt-3 flex cursor-pointer items-start gap-2.5 text-left text-[11px] leading-snug text-zinc-600 sm:text-xs"
            >
              <input
                id="checkout-no-minors"
                type="checkbox"
                checked={agreedNoMinors}
                onChange={(event) => {
                  setAgreedNoMinors(event.target.checked);
                  if (event.target.checked) setMinorsNote('');
                }}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#ff2d78]"
              />
              Using photos of minors is forbidden and will terminate your account.
            </label>
            {minorsNote ? <p className="mt-1 text-xs text-[#c81e5a]">{minorsNote}</p> : null}

            <label
              htmlFor="checkout-age-terms"
              className="mt-2 flex cursor-pointer items-start gap-2.5 text-left text-[11px] leading-snug text-zinc-600 sm:text-xs"
            >
              <input
                id="checkout-age-terms"
                type="checkbox"
                checked={agreed}
                onChange={(event) => {
                  setAgreed(event.target.checked);
                  if (event.target.checked) setTermsNote('');
                }}
                className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#ff2d78]"
              />
              <span>
                I am 18+ and agree to the{' '}
                <Link
                  href="/terms"
                  className="font-semibold text-[#ff2d78] underline underline-offset-2 hover:text-[#c81e5a]"
                  onClick={(event) => event.stopPropagation()}
                >
                  Terms of Service
                </Link>
                .
              </span>
            </label>
            {termsNote ? <p className="mt-1 text-xs text-[#c81e5a]">{termsNote}</p> : null}

            <button
              ref={payButtonRef}
              type="button"
              disabled={buying}
              onClick={() => void startCheckout()}
              className="mt-3 inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff2d78] to-[#ff1a6b] px-4 text-sm font-bold text-white shadow-[0_8px_20px_rgba(255,45,120,0.35)] hover:from-[#ff4d8f] hover:to-[#ff2d78] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {payLabel}
              <LockIcon className="h-3.5 w-3.5" />
            </button>

            {paymentUrl ? (
              <a
                href={paymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[#ff2d78] px-4 text-sm font-semibold text-[#ff2d78] hover:bg-[#ff2d78]/10"
              >
                Open payment page
              </a>
            ) : null}

            {note ? <p className="mt-2 text-center text-xs text-[#c81e5a]">{note}</p> : null}

            <p className="mt-3 text-center text-sm leading-relaxed text-zinc-600">
              Complete payment in Telegram. This page updates when you come back — Stars are added as soon as Telegram
              confirms.
            </p>
            <p className="mt-2 text-center text-sm">
              <a
                href="/payments/telegram-stars-tutorial"
                onClick={() => trackEvent('checkout_tutorial', { kind: 'click', plan: planId, method: 'stars' })}
                className="font-semibold text-[#ff2d78] underline underline-offset-2 hover:text-[#c81e5a]"
              >
                Telegram Payment Tutorial
              </a>
              {' · '}
              <a href={`mailto:${HELLO_EMAIL}`} className="text-zinc-500 underline underline-offset-2 hover:text-zinc-800">
                {HELLO_EMAIL}
              </a>
            </p>

            <p className="mt-3 text-center text-[11px] text-black">
              Secure · No adult line on your bank statement · No hidden fees
            </p>
          </div>
        </div>
      </main>

      <footer className="relative z-10 shrink-0 border-t border-[#ff2d78]/20 bg-[#0a0208]/50 px-4 py-3 pb-[max(0.75rem,var(--safe-bottom))] backdrop-blur-md">
        <div className="mx-auto max-w-[720px] scale-90">
          <FeaturedOn variant="login-content" />
        </div>
      </footer>
    </div>
  );
}
