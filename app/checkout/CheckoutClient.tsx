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
import { PREMIUM_PLANS, planBonusPercentLabel, planGenerationCopy, planMoreGenerationsCopy, type PremiumPlan } from '@/lib/premiumPlans';

export type CheckoutMethod = 'stars';

type Props = {
  plan: PremiumPlan;
};

const PACKS = [...PREMIUM_PLANS].sort((a, b) => a.stars - b.stars);
const CHECKOUT_PAY_INTENT_KEY = 'aislutbot-checkout-pay';

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

const CHECKOUT_PROMO_VIDEO = checkoutPromoMediaUrl('swipey-promo.mp4', '/checkout/swipey-promo.mp4');
const CHECKOUT_PROMO_POSTER = checkoutPromoMediaUrl('swipey-promo.jpg', '/checkout/swipey-promo.jpg');

function CheckoutPromoVideo({ className }: { className?: string }) {
  return (
    <div
      className={`-mx-3 -mt-2.5 sm:-mx-6 sm:-mt-5 lg:-mx-8 lg:-mt-6 ${className ?? ''}`}
    >
      <div className="relative aspect-[16/8.1] overflow-hidden bg-[#090505]">
        <video
          src={CHECKOUT_PROMO_VIDEO}
          poster={CHECKOUT_PROMO_POSTER}
          autoPlay
          loop
          muted
          playsInline
          preload="none"
          className="h-full w-full object-cover object-top"
          aria-hidden
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 bg-gradient-to-b from-[#090505]/85 to-transparent px-3 pb-6 pt-2.5 sm:px-4 sm:pt-3" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#090505] via-[#090505]/80 to-transparent px-3 pb-2.5 pt-10 sm:px-4 sm:pb-3 sm:pt-12">
          <p className="text-center text-[9px] font-black uppercase leading-tight tracking-[0.08em] text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] sm:text-[10px] sm:tracking-[0.1em] lg:text-[11px] lg:leading-snug">
            Ready to turn your boring static images to{' '}
            <span className="text-[#ff2d78]">spicy content?</span>
          </p>
        </div>
        <nav className="absolute left-3 top-2.5 z-10 flex items-center gap-1.5 text-[11px] text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] sm:left-4 sm:top-3 sm:text-xs">
          <Link
            href="/tool"
            aria-label="Back"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#141414]/80 text-white backdrop-blur-sm hover:bg-[#141414]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
              <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link href="/" className="inline-block">
            <BrandLogo className="text-[1.25rem] sm:text-[1.3rem]" />
          </Link>
          <span className="text-white/55">/</span>
          <span className="font-medium text-white">Checkout</span>
        </nav>
      </div>
    </div>
  );
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
      className={className ?? 'h-7 w-7 shrink-0 rounded-[7px] sm:h-8 sm:w-8 sm:rounded-lg'}
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

function WalletLogos({ className }: { className?: string }) {
  return (
    <span className={`flex flex-wrap items-center justify-center ${className ?? ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/payments/wallet-logos.png"
        alt="Mastercard, Visa, Google Pay, Apple Pay"
        className="h-5 w-auto sm:h-6"
      />
    </span>
  );
}

function formatCheckoutStars(stars: number) {
  return `${Math.round(stars).toLocaleString('en-US')} Stars`;
}

function PackStarsPrice({ catalogStars, chargedStars }: { catalogStars: number; chargedStars: number }) {
  if (chargedStars === catalogStars) return <>{formatCheckoutStars(chargedStars)}</>;
  return (
    <span className="block leading-tight">
      <span className="block text-[11px] font-normal text-white/35 line-through">{formatCheckoutStars(catalogStars)}</span>
      <span>{formatCheckoutStars(chargedStars)}</span>
    </span>
  );
}

function TelegramPaymentLabel() {
  return (
    <div className="flex w-full min-w-0 items-center justify-center gap-1.5 text-center sm:gap-2">
      <TelegramIcon className="h-5 w-5 shrink-0 rounded-[5px] sm:h-6 sm:w-6 sm:rounded-md" />
      <p className="text-[9px] font-bold uppercase leading-none tracking-[0.02em] text-[#1a1a1a] sm:text-[10px]">
        Payment with credit / debit card using Telegram
      </p>
    </div>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? 'h-4 w-4'} fill="currentColor" aria-hidden>
      <path d="M12 2 4 5v6.5c0 5 3.4 9.4 8 10.5 4.6-1.1 8-5.5 8-10.5V5l-8-3zm-1.1 13.3-3.2-3.2 1.4-1.4 1.8 1.8 3.8-3.8 1.4 1.4-5.2 5.2z" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? 'h-4 w-4'} fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.1 14.3-3.7-3.7 1.4-1.4 2.3 2.3 5.3-5.3 1.4 1.4-6.7 6.7z" />
    </svg>
  );
}

function TrustSignals() {
  return (
    <div role="list" className="text-center text-[11px] leading-snug text-[#1a1a1a] sm:text-[12px]">
      <div role="listitem" className="flex items-center justify-center gap-1.5 font-semibold">
        <LockIcon className="h-3.5 w-3.5 shrink-0" />
        Secure Checkout
      </div>
      <div role="listitem" className="mt-1 flex items-center justify-center gap-1.5">
        <ShieldIcon className="h-3.5 w-3.5 shrink-0" />
        No adult transaction in your bank statement
      </div>
      <div role="listitem" className="mt-1 flex items-center justify-center gap-1.5">
        <CheckCircleIcon className="h-3.5 w-3.5 shrink-0" />
        No hidden fees • 100% Anonymous
      </div>
    </div>
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
    if (buying) return 'Opening…';
    return `CONTINUE · ${formatCheckoutStars(selectedStars)}`;
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

  const scrollToPay = () => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(max-width: 1023px)').matches) return;
    window.requestAnimationFrame(() => {
      payButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  };

  const selectPlan = (id: string) => {
    setPlanId(id);
    trackEvent('checkout_plan', { kind: 'click', plan: id, method });
    replaceCheckout(id);
    scrollToPay();
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
    setToast('Redirecting to Telegram, a secure payment...');
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
        setToast('Complete payment in Telegram. This page updates when Stars land on your wallet.');
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
    <div className="min-h-dvh overflow-x-hidden bg-white" style={{ colorScheme: 'light' }}>
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
              <path d="M5 12.5 9.5 17 19 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
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
      <div className="lg:grid lg:grid-cols-2">
        <div className="flex flex-col lg:min-h-[calc(100dvh-3.5rem)] lg:border-r lg:border-white/5">
          <aside className="flex flex-col bg-[#090505] px-3 py-2.5 text-white sm:px-6 sm:py-5 lg:px-8 lg:py-6">
            <CheckoutPromoVideo />

            <p className="text-[10px] font-medium leading-snug text-[#fde68a] sm:text-[11px]">
              One time payment · ✨ Stars never expire
            </p>

            <div className="mt-2.5 space-y-1 sm:mt-3 sm:space-y-1.5">
          {PACKS.map((pack) => {
            const active = pack.id === selected.id;
            const bonusPercent = planBonusPercentLabel(pack);
            const chargedStars = pack.stars;
            return (
              <div
                key={pack.id}
                className={`rounded-lg border ${
                  active ? 'border-[#ff2d78]/70 bg-[#ff2d78]/10' : 'border-white/20 hover:border-[#ff2d78]/35'
                }`}
              >
                <div className="flex items-start">
                  <button
                    type="button"
                    onClick={() => selectPlan(pack.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left sm:gap-2.5 sm:px-2.5 sm:py-2"
                  >
                    <span
                      className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border sm:h-4 sm:w-4 ${
                        active ? 'border-[#ff2d78]' : 'border-white/45'
                      }`}
                    >
                      {active ? <span className="h-1.5 w-1.5 rounded-full bg-white sm:h-2 sm:w-2" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-1">
                        <span className="text-xs font-medium leading-snug sm:text-[13px]">
                          {planGenerationCopy(pack)}
                        </span>
                        {bonusPercent ? (
                          <span className="inline-flex rounded-full bg-[#22c55e] px-1.5 py-px text-[9px] font-semibold leading-3 text-white sm:text-[10px] sm:leading-4">
                            {bonusPercent}
                          </span>
                        ) : null}
                      </span>
                      {planMoreGenerationsCopy(pack) ? (
                        <span className="mt-px block text-[10px] font-medium leading-snug text-[#86efac] sm:text-[11px]">
                          {planMoreGenerationsCopy(pack)}
                        </span>
                      ) : null}
                    </span>
                  </button>
                  <div className="shrink-0 px-2 py-1.5 text-right text-xs font-medium sm:px-2.5 sm:py-2 sm:text-[13px]">
                    <PackStarsPrice catalogStars={pack.stars} chargedStars={chargedStars} />
                  </div>
                </div>
              </div>
            );
          })}
            </div>
          </aside>
        </div>

        <main className="flex min-h-0 flex-1 items-start bg-white px-3 pb-[max(1.25rem,var(--safe-bottom))] pt-2 text-[#1a1a1a] sm:px-8 sm:pt-3 lg:px-10 lg:pt-4">
        <div className="mx-auto w-full max-w-[440px] text-center">
          <h1 className="sr-only">Checkout</h1>

          <div className="flex flex-col items-center gap-1.5">
            <TelegramPaymentLabel />
            <WalletLogos />
          </div>

          {checkoutBanner ? (
            <p className="mt-2 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-xs text-[#854d0e] sm:px-3.5 sm:py-2.5 sm:text-sm">
              {checkoutBanner}
            </p>
          ) : null}

          <div className="mt-2 flex items-start justify-center gap-2 text-[10px] leading-snug text-[#3d424d] sm:text-[11px]">
            <input
              id="checkout-no-minors"
              type="checkbox"
              checked={agreedNoMinors}
              onChange={(event) => {
                setAgreedNoMinors(event.target.checked);
                if (event.target.checked) setMinorsNote('');
              }}
              className="mt-0.5 h-3.5 w-3.5 shrink-0 cursor-pointer accent-[#ff2d78]"
            />
            <label htmlFor="checkout-no-minors" className="max-w-[22rem] cursor-pointer text-center">
              Using minor photos is strictly forbidden and will lead to instant account termination.
            </label>
          </div>
          {minorsNote ? (
            <p className="mt-1 text-[10px] leading-snug text-[#b42318] sm:text-[11px]">{minorsNote}</p>
          ) : null}

          <div className="mt-1.5 flex items-start justify-center gap-2 text-[10px] leading-snug text-[#3d424d] sm:text-[11px]">
            <input
              id="checkout-age-terms"
              type="checkbox"
              checked={agreed}
              onChange={(event) => {
                setAgreed(event.target.checked);
                if (event.target.checked) setTermsNote('');
              }}
              className="mt-0.5 h-3.5 w-3.5 shrink-0 cursor-pointer accent-[#ff2d78]"
            />
            <label htmlFor="checkout-age-terms" className="max-w-[22rem] cursor-pointer text-center">
              You confirm that you are at least 18 years old and agree to our{' '}
              <Link
                href="/terms"
                className="font-medium text-[#ff2d78] underline underline-offset-2 hover:text-[#ff1a6b]"
                onClick={(event) => event.stopPropagation()}
              >
                Terms of Service
              </Link>
              .
            </label>
          </div>
          {termsNote ? (
            <p className="mt-1 text-[10px] leading-snug text-[#b42318] sm:text-[11px]">{termsNote}</p>
          ) : null}

          <button
            ref={payButtonRef}
            type="button"
            disabled={buying}
            onClick={() => void startCheckout()}
            className="mt-2 inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff2d78] to-[#ff1a6b] px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(255,45,120,0.35)] hover:from-[#ff4d8f] hover:to-[#ff2d78] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-12"
          >
            {payLabel}
            <LockIcon className="h-3.5 w-3.5" />
          </button>

          <div className="mt-2 space-y-1.5">
            <p className="text-[12px] leading-snug text-[#1a1a1a] sm:text-[13px]">
              Complete payment in Telegram. This page updates when you come back — Stars are added as soon as Telegram
              confirms.
            </p>
            <p className="flex justify-center">
              <a
                href="/payments/telegram-stars-tutorial"
                onClick={() => trackEvent('checkout_tutorial', { kind: 'click', plan: planId, method: 'stars' })}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#ff2d78] underline underline-offset-2 hover:text-[#ff1a6b] sm:gap-2 sm:text-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/payments/telegram-stars-icon.webp"
                  alt=""
                  width={20}
                  height={20}
                  loading="lazy"
                  decoding="async"
                  className="h-4 w-auto shrink-0 sm:h-5"
                />
                Telegram Payment Tutorial
              </a>
            </p>
            <p className="text-[12px] leading-snug text-[#1a1a1a] sm:text-[13px]">
              Need help?{' '}
              <a
                href={`mailto:${HELLO_EMAIL}`}
                className="font-medium text-[#1a1a1a] underline underline-offset-2"
              >
                {HELLO_EMAIL}
              </a>
            </p>
          </div>

          {paymentUrl ? (
            <a
              href={paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-[#ff2d78] px-4 text-sm font-semibold text-[#ff2d78] hover:bg-[#ff2d78]/5"
            >
              Open payment page
            </a>
          ) : null}

          <div className="mt-2">
            <TrustSignals />
          </div>

          <div className="mt-3 hidden justify-center lg:flex">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/checkout/ssl-secure-badge.png"
              alt="Fully secured SSL checkout"
              className="h-11 w-auto"
              loading="lazy"
              decoding="async"
            />
          </div>

          {note ? <p className="mt-2 text-center text-xs text-[#b42318]">{note}</p> : null}
        </div>
        </main>
      </div>

      <div className="flex justify-center border-t border-[#eceef2] bg-white px-4 py-4 lg:hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/checkout/ssl-secure-badge.png"
          alt="Fully secured SSL checkout"
          className="h-11 w-auto"
          loading="lazy"
          decoding="async"
        />
      </div>

      <FeaturedOn />
    </div>
  );
}
