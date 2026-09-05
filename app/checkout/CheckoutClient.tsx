'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
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
import SiteFaq from '@/app/components/SiteFaq';
import AdminViewAsSwitch from '@/app/components/AdminViewAsSwitch';
import { checkoutPromoMediaUrl } from '@/lib/presetMedia';
import {
  PREMIUM_PLANS,
  planOfferBaseline,
  planOfferBonusPercent,
  planOfferMoreBadgeLabel,
  planStarsLabel,
  cryptoUsdForStars,
  applyCryptoCouponUsd,
  isCryptoAvailableForStars,
  formatUsdPrice,
  type PremiumPlan,
} from '@/lib/premiumPlans';
import { couponAppliesToPlan } from '@/lib/coupons';

type AppliedCoupon = {
  code: string;
  type: 'percent_off' | 'amount_off';
  discountPercent: number;
  discountUsd: number;
  label: string;
};

export type CheckoutMethod = 'stars' | 'crypto';

type Props = {
  plan: PremiumPlan;
};

const PACKS = [...PREMIUM_PLANS].sort((a, b) => a.stars - b.stars);
const CHECKOUT_PAY_INTENT_KEY = 'aislutbot-checkout-pay';
const CHECKOUT_PROMO_VIDEO = checkoutPromoMediaUrl('AISLUTBOT-NUDE GENERATOR.mp4');
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
  const [method, setMethod] = useState<CheckoutMethod>(
    searchParams.get('method') === 'crypto' ? 'crypto' : 'stars',
  );
  const [agreed, setAgreed] = useState(false);
  const [agreedNoMinors, setAgreedNoMinors] = useState(false);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);
  const [couponNote, setCouponNote] = useState('');
  const [couponBusy, setCouponBusy] = useState(false);
  const [couponCelebrate, setCouponCelebrate] = useState(false);
  const [buying, setBuying] = useState(false);
  const [note, setNote] = useState('');
  const [termsNote, setTermsNote] = useState('');
  const [minorsNote, setMinorsNote] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [paymentReceived, setPaymentReceived] = useState(false);
  const balanceBeforePayment = useRef(0);
  const pollRef = useRef<number | null>(null);
  const couponCelebrateRef = useRef<number | null>(null);
  const payButtonRef = useRef<HTMLButtonElement>(null);
  const resumePayRef = useRef(false);
  const watchForPaymentRef = useRef<(beforeOverride?: number) => void>(() => {});

  const selected = PREMIUM_PLANS.find((item) => item.id === planId) ?? plan;
  const selectedStars = selected.stars;
  const isCrypto = method === 'crypto';
  const cryptoUnavailable = isCrypto && !isCryptoAvailableForStars(selectedStars);
  // Coupons apply to crypto only.
  const activeCoupon = isCrypto ? appliedCoupon : null;
  const selectedCoupon =
    activeCoupon && couponAppliesToPlan(activeCoupon.code, selected.id) ? activeCoupon : null;
  const cryptoListUsd = cryptoUsdForStars(selectedStars);
  const cryptoFinalUsd = applyCryptoCouponUsd(cryptoListUsd, selectedCoupon);
  const cryptoSavedUsd = Math.round((cryptoListUsd - cryptoFinalUsd) * 100) / 100;
  const payLabel = useMemo(() => {
    if (buying) return isCrypto ? 'Opening crypto checkout…' : 'Opening Telegram…';
    if (isCrypto) return `Pay ${formatUsdPrice(cryptoFinalUsd)} in crypto`;
    return `Pay ${planStarsLabel(selectedStars)}`;
  }, [buying, selectedStars, isCrypto, cryptoFinalUsd]);

  const checkoutPath = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('plan', planId);
    params.set('method', method);
    return `/checkout?${params.toString()}`;
  }, [searchParams, planId, method]);

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
    // Poll every 6s for ~8 minutes. The page also re-checks the balance on
    // focus/visibilitychange, so returning from Telegram updates instantly —
    // this interval is just the fallback, so a slower cadence is fine and cuts
    // /api/wallet invocations by a third.
    pollRef.current = window.setInterval(() => {
      ticks += 1;
      check();
      if (ticks >= 80 && pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }, 6000);
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
      if (couponCelebrateRef.current) {
        window.clearTimeout(couponCelebrateRef.current);
        couponCelebrateRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    trackEvent('checkout_view', { kind: 'view', plan: plan.id, method: 'stars' });
  }, [plan.id]);

  const replaceCheckout = (nextPlan: string, nextMethod: CheckoutMethod) => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('plan', nextPlan);
    params.set('method', nextMethod);
    const next = `/checkout?${params.toString()}`;
    window.history.replaceState(window.history.state, '', next);
  };

  const selectPlan = (id: string) => {
    setPlanId(id);
    trackEvent('checkout_plan', { kind: 'click', plan: id, method });
    replaceCheckout(id, method);
  };

  const selectMethod = (next: CheckoutMethod) => {
    if (next === method) return;
    setMethod(next);
    setNote('');
    trackEvent('checkout_method', { kind: 'click', plan: planId, method: next });
    // Crypto starts at the novice — bump off the sold-out Starter automatically.
    let nextPlan = planId;
    if (next === 'crypto' && !isCryptoAvailableForStars(selectedStars)) {
      const fallback = PACKS.find((pack) => isCryptoAvailableForStars(pack.stars));
      if (fallback) {
        nextPlan = fallback.id;
        setPlanId(fallback.id);
      }
    }
    replaceCheckout(nextPlan, next);
  };

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) {
      setCouponNote('Enter a coupon code.');
      return;
    }
    if (!getAuthToken()) {
      writePayIntent({ plan: selected.id, agreed, agreedNoMinors });
      router.push(loginHref(checkoutPath));
      return;
    }
    setCouponBusy(true);
    setCouponNote('');
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json()) as {
        code?: string;
        type?: 'percent_off' | 'amount_off';
        discountPercent?: number;
        discountUsd?: number;
        label?: string;
        message?: string;
      };
      if (!res.ok || !data.code || !data.type) {
        setAppliedCoupon(null);
        setCouponNote(data.message || 'Invalid coupon code.');
        return;
      }
      setAppliedCoupon({
        code: data.code,
        type: data.type,
        discountPercent: data.discountPercent || 0,
        discountUsd: data.discountUsd || 0,
        label: data.label || '',
      });
      if (method === 'crypto') {
        setCouponCelebrate(true);
        if (couponCelebrateRef.current) window.clearTimeout(couponCelebrateRef.current);
        couponCelebrateRef.current = window.setTimeout(() => setCouponCelebrate(false), 1400);
      } else {
        setCouponCelebrate(false);
      }
      trackEvent('checkout_coupon', { kind: 'click', plan: planId, method });
    } catch {
      setAppliedCoupon(null);
      setCouponNote('Could not check that coupon. Try again.');
    } finally {
      setCouponBusy(false);
    }
  };

  const clearCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponNote('');
    setCouponCelebrate(false);
    if (couponCelebrateRef.current) {
      window.clearTimeout(couponCelebrateRef.current);
      couponCelebrateRef.current = null;
    }
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
    if (isCrypto && !isCryptoAvailableForStars(selected.stars)) {
      setNote('This pack is card-only. Pick a larger pack to pay with crypto.');
      return;
    }
    clearPayIntent();
    trackEvent('checkout_pay', { kind: 'click', plan: selected.id, method });
    setBuying(true);
    setNote('');
    setTermsNote('');
    setMinorsNote('');
    setToast(
      isCrypto
        ? 'Opening secure crypto checkout…'
        : 'Opening Telegram for a secure card payment…',
    );
    try {
      const endpoint = isCrypto ? '/api/payments/nowpayments' : '/api/payments/stars';
      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: selected.id,
          ...(isCrypto && appliedCoupon ? { couponCode: appliedCoupon.code } : {}),
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
        setToast(
          isCrypto
            ? 'Finish the crypto payment. This page updates when your balance lands.'
            : 'Finish in Telegram. This page updates when Stars land.',
        );
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
      <div className="absolute inset-0 z-[1] hidden bg-[#0a0208]/38 sm:block" aria-hidden />
      <div
        className="absolute inset-0 z-[1] hidden bg-[radial-gradient(ellipse_120%_80%_at_50%_0%,rgba(255,45,120,0.12),transparent_55%),linear-gradient(180deg,rgba(10,2,8,0.2)_0%,rgba(10,2,8,0.55)_100%)] sm:block"
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

      <div className="relative z-10 h-[32vh] w-full sm:absolute sm:inset-0 sm:z-0 sm:h-full">
        <video
          src={CHECKOUT_PROMO_VIDEO}
          poster={CHECKOUT_PROMO_POSTER}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="h-full w-full object-cover object-top"
          aria-hidden
        />
        <div className="absolute inset-0 bg-[#0a0208]/38 sm:hidden" aria-hidden />
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_0%,rgba(255,45,120,0.12),transparent_55%),linear-gradient(180deg,rgba(10,2,8,0.2)_0%,rgba(10,2,8,0.55)_100%)] sm:hidden"
          aria-hidden
        />
        <p className="absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-black/80 via-black/35 to-transparent px-3 pb-5 pt-8 text-center sm:hidden">
          <span className="block text-[0.72rem] font-black uppercase leading-snug tracking-[0.04em] text-white sm:text-sm">
            Ready to turn your boring static images to{' '}
            <span className="text-[#ff2d78]">spicy content?</span>
          </span>
        </p>
      </div>

      <nav className="absolute inset-x-0 top-0 z-20 flex items-center gap-2 bg-gradient-to-b from-black/70 to-transparent px-3 pb-6 pt-[max(0.75rem,var(--safe-top))] sm:relative sm:bg-none sm:px-6 sm:pb-0">
        <Link
          href="/tool"
          aria-label="Back"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur-md hover:bg-black/55"
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
        <Link href="/" className="text-sm font-medium text-white/45 hover:text-white/70">
          Home
        </Link>
        <span className="text-sm font-medium text-white/25">/</span>
        <span className="text-sm font-medium text-white/45">Checkout</span>
        <div className="ml-auto min-w-0">
          <AdminViewAsSwitch compact />
        </div>
      </nav>

      <main className="relative z-10 -mt-4 flex flex-1 items-start justify-center px-4 py-3 sm:mt-0 sm:items-center sm:py-8">
        <div className="relative w-full max-w-[560px] overflow-hidden rounded-2xl border border-[#ff2d78]/35 bg-[#140810]/82 bg-gradient-to-b from-[#140810]/55 via-[#140810]/82 to-[#140810]/88 p-4 shadow-[0_0_40px_rgba(255,45,120,0.18),0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-md sm:bg-[#140810]/82 sm:bg-none sm:p-5">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#ff2d78]/80 to-transparent"
            aria-hidden
          />

          {checkoutBanner ? (
            <p className="mt-3 rounded-xl border border-[#fde68a]/40 bg-[#fffbeb]/95 px-3 py-2 text-center text-sm text-[#854d0e]">
              {checkoutBanner}
            </p>
          ) : null}

          <p className="mt-3 text-center text-[10px] font-medium leading-snug text-[#fde68a] sm:mt-4 sm:text-[11px]">
            One time payment · ✨ Stars never expire
          </p>

          {/* Payment method toggle */}
          <div
            className="mt-3 grid grid-cols-2 gap-1 rounded-full border border-white/10 bg-black/35 p-1 sm:mt-4"
            role="tablist"
            aria-label="Payment method"
          >
            <button
              type="button"
              role="tab"
              aria-selected={!isCrypto}
              onClick={() => selectMethod('stars')}
              className={`rounded-full px-3 py-2.5 text-center text-xs font-bold transition sm:text-sm ${
                !isCrypto
                  ? 'bg-[#ff2d78] text-white shadow-[0_0_16px_rgba(255,45,120,0.35)]'
                  : 'text-white/55 hover:text-white/80'
              }`}
            >
              Credit/Debit Card
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isCrypto}
              onClick={() => selectMethod('crypto')}
              className={`rounded-full px-3 py-2.5 text-center text-xs font-bold transition sm:text-sm ${
                isCrypto
                  ? 'bg-[#ff2d78] text-white shadow-[0_0_16px_rgba(255,45,120,0.35)]'
                  : 'text-white/55 hover:text-white/80'
              }`}
            >
              Crypto
            </button>
          </div>

          <div className="mt-3 rounded-xl bg-white p-3 sm:p-4">
            <div className="grid grid-cols-1 gap-1.5" role="radiogroup" aria-label="Packs">
              {PACKS.map((pack) => {
                const active = pack.id === selected.id;
                const moreBadge = planOfferMoreBadgeLabel(pack);
                const baseline = planOfferBaseline(pack);
                const extraImages = Math.max(0, pack.imageGenerations - baseline.images);
                const extraVideos = Math.max(0, pack.videoGenerations - baseline.videos);
                const showHonestOffer = planOfferBonusPercent(pack) >= 30;
                const showImages = showHonestOffer
                  ? pack.imageGenerations
                  : pack.imageGenerations + extraImages;
                const showVideos = showHonestOffer
                  ? pack.videoGenerations
                  : pack.videoGenerations + extraVideos;
                const soldOut = isCrypto && !isCryptoAvailableForStars(pack.stars);
                const listUsd = cryptoUsdForStars(pack.stars);
                const packCoupon =
                  activeCoupon && couponAppliesToPlan(activeCoupon.code, pack.id) ? activeCoupon : null;
                const saleUsd = applyCryptoCouponUsd(listUsd, packCoupon);
                const showSale = Boolean(isCrypto && !soldOut && packCoupon && saleUsd < listUsd);
                const priceLabel = isCrypto ? formatUsdPrice(listUsd) : planStarsLabel(pack.stars);
                return (
                  <button
                    key={pack.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    aria-disabled={soldOut}
                    disabled={soldOut}
                    onClick={() => {
                      if (soldOut) return;
                      selectPlan(pack.id);
                    }}
                    className={`relative flex w-full items-center gap-2.5 rounded-xl border px-3 py-1.5 text-left transition ${
                      soldOut
                        ? 'cursor-not-allowed border-zinc-200 bg-zinc-100 opacity-60'
                        : active
                          ? 'border-[#ff2d78] bg-[#ff2d78]/10 shadow-[0_0_0_1px_rgba(255,45,120,0.25)]'
                          : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300'
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                        active && !soldOut ? 'border-[#ff2d78]' : 'border-zinc-400'
                      }`}
                    >
                      {active && !soldOut ? <span className="h-2 w-2 rounded-full bg-[#ff2d78]" /> : null}
                    </span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="flex min-w-0 items-center gap-1.5 whitespace-nowrap">
                        <span className="min-w-0 truncate text-[12px] font-bold text-zinc-900 sm:text-[13px]">
                          {showImages.toLocaleString('en-US')} images or {showVideos.toLocaleString('en-US')} videos
                        </span>
                        {soldOut ? (
                          <span className="inline-flex h-[15px] shrink-0 items-center rounded bg-[#dc2626] px-1.5 text-[8px] font-black uppercase leading-none tracking-[0.06em] text-white">
                            Sold out
                          </span>
                        ) : (
                          <>
                            {pack.id === 'legend' ? (
                              <span className="inline-flex h-[15px] shrink-0 items-center rounded bg-zinc-900 px-1.5 text-[8px] font-black uppercase leading-none tracking-[0.06em] text-white">
                                ULTRA
                              </span>
                            ) : null}
                            {moreBadge ? (
                              <span className="inline-flex h-[15px] shrink-0 items-center rounded bg-[#ff2d78] px-1.5 text-[8px] font-black uppercase leading-none tracking-[0.06em] text-white">
                                {moreBadge}
                              </span>
                            ) : null}
                          </>
                        )}
                      </span>
                      {!soldOut && pack.id === 'legend' ? (
                        <span className="mt-0.5 block text-[9px] leading-snug text-zinc-500">
                          + Unlock custom prompts
                        </span>
                      ) : null}
                    </span>
                    <span className="shrink-0 text-right leading-tight">
                      {showSale ? (
                        <span className="flex flex-col items-end">
                          <span className="text-[10px] font-semibold text-zinc-400 line-through">
                            {formatUsdPrice(listUsd)}
                          </span>
                          <span className="text-[12px] font-bold text-[#16a34a] sm:text-[13px]">
                            {formatUsdPrice(saleUsd)}
                          </span>
                        </span>
                      ) : (
                        <span
                          className={`text-[12px] font-bold sm:text-[13px] ${
                            soldOut ? 'text-zinc-400 line-through' : 'text-zinc-900'
                          }`}
                        >
                          {priceLabel}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Coupon */}
            <div className="mt-3">
              {appliedCoupon && isCrypto ? (
                <div
                  className={`relative overflow-hidden rounded-xl border border-[#86efac] bg-[#ecfdf5] px-3 py-2.5 ${
                    couponCelebrate ? 'coupon-applied-celebrate' : 'coupon-applied'
                  }`}
                >
                  {couponCelebrate ? (
                    <span className="pointer-events-none absolute inset-0" aria-hidden>
                      {[
                        ['-42px', '-28px'],
                        ['36px', '-32px'],
                        ['48px', '8px'],
                        ['-50px', '14px'],
                        ['8px', '-38px'],
                        ['-18px', '32px'],
                        ['28px', '30px'],
                        ['-6px', '-18px'],
                      ].map(([dx, dy], i) => (
                        <span
                          key={i}
                          className="coupon-spark absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-[#22c55e]"
                          style={{ '--dx': dx, '--dy': dy, animationDelay: `${i * 35}ms` } as CSSProperties}
                        />
                      ))}
                    </span>
                  ) : null}
                  <div className="relative flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-2 text-[12px] font-bold text-[#14532d] sm:text-[13px]">
                      <span className="coupon-check inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#22c55e] text-white">
                        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" fill="currentColor" aria-hidden>
                          <path d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.2 7.2a1 1 0 0 1-1.4 0L3.3 9.1a1 1 0 1 1 1.4-1.4l3.1 3.1 6.5-6.5a1 1 0 0 1 1.4 0z" />
                        </svg>
                      </span>
                      <span className="min-w-0">
                        Coupon{' '}
                        <span className={couponCelebrate ? 'coupon-code-shimmer' : 'text-[#15803d]'}>
                          {appliedCoupon.code}
                        </span>{' '}
                        applied
                        {appliedCoupon.label ? `. ${appliedCoupon.label}` : ''}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={clearCoupon}
                      className="shrink-0 text-[11px] font-semibold text-[#166534] underline underline-offset-2 hover:text-[#14532d]"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : appliedCoupon ? (
                <div className="flex items-center justify-between gap-2 rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2.5">
                  <p className="min-w-0 text-[12px] font-semibold leading-snug text-zinc-700 sm:text-[13px]">
                    This coupon is valid for crypto payment.
                  </p>
                  <button
                    type="button"
                    onClick={clearCoupon}
                    className="shrink-0 text-[11px] font-semibold text-zinc-500 underline underline-offset-2 hover:text-zinc-800"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex items-stretch gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(event) => setCouponInput(event.target.value.toUpperCase())}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        void applyCoupon();
                      }
                    }}
                    placeholder="Coupon code"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    className="min-w-0 flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-[13px] font-semibold uppercase tracking-wide text-zinc-900 placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-zinc-400 focus:border-[#ff2d78] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void applyCoupon()}
                    disabled={couponBusy}
                    className="shrink-0 rounded-xl border border-[#ff2d78] px-4 text-[13px] font-bold text-[#ff2d78] transition hover:bg-[#ff2d78]/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {couponBusy ? 'Checking…' : 'Apply'}
                  </button>
                </div>
              )}
              {couponNote ? <p className="mt-1 text-xs text-[#c81e5a]">{couponNote}</p> : null}
            </div>

            {!isCrypto ? (
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
            ) : null}

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
                {' '}and{' '}
                <Link
                  href="/privacy"
                  className="font-semibold text-[#ff2d78] underline underline-offset-2 hover:text-[#c81e5a]"
                  onClick={(event) => event.stopPropagation()}
                >
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
            {termsNote ? <p className="mt-1 text-xs text-[#c81e5a]">{termsNote}</p> : null}

            {isCrypto && selectedCoupon && cryptoSavedUsd > 0 ? (
              <p className="mt-3 text-center text-sm font-semibold text-zinc-700">
                <span className="text-zinc-400 line-through">{formatUsdPrice(cryptoListUsd)}</span>{' '}
                <span className="text-[#16a34a]">
                  {formatUsdPrice(cryptoFinalUsd)} with {selectedCoupon.code}
                </span>
                {' · '}
                <span className="text-[#16a34a]">YOU JUST SAVED {formatUsdPrice(cryptoSavedUsd)}</span>
              </p>
            ) : isCrypto && activeCoupon && !selectedCoupon ? (
              <p className="mt-3 text-center text-sm font-semibold text-zinc-600">
                This coupon applies to the 4 highest packs.
              </p>
            ) : null}

            <button
              ref={payButtonRef}
              type="button"
              disabled={buying || cryptoUnavailable}
              onClick={() => void startCheckout()}
              className="mt-3 inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff2d78] to-[#ff1a6b] px-4 text-sm font-bold text-white shadow-[0_8px_20px_rgba(255,45,120,0.35)] hover:from-[#ff4d8f] hover:to-[#ff2d78] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {payLabel}
              <LockIcon className="h-3.5 w-3.5" />
            </button>

            {isCrypto ? (
              <div className="mt-3">
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase leading-tight text-zinc-900">
                  Secure payment using NOWPayments
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/payments/nowpayments-logo.png"
                  alt="NOWPayments"
                  className="mx-auto mt-2 block h-[28px] w-auto max-w-[180px] object-contain sm:h-[32px] sm:max-w-[220px]"
                />
              </div>
            ) : null}

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

            <p className="mt-3 text-center text-[11px] leading-relaxed text-zinc-600">
              {isCrypto
                ? 'Your account will be credited once you complete the payment.'
                : 'Complete payment on Telegram using a credit or debit card. Your account will be credited instantly after you make the payment.'}
            </p>
            <p className="mt-2 text-center text-[11px] text-zinc-500">
              Need help? Email our support at{' '}
              <a
                href={`mailto:${HELLO_EMAIL}`}
                className="underline underline-offset-2 hover:text-zinc-800"
              >
                {HELLO_EMAIL}
              </a>
            </p>
            {isCrypto ? null : (
              <p className="mt-2 text-center text-[11px]">
                <a
                  href="/payments/telegram-stars-tutorial"
                  onClick={() => trackEvent('checkout_tutorial', { kind: 'click', plan: planId, method: 'stars' })}
                  className="font-semibold text-[#ff2d78] underline underline-offset-2 hover:text-[#c81e5a]"
                >
                  Telegram Payment Tutorial
                </a>
              </p>
            )}

            <div className="mt-4 border-t border-zinc-200 pt-4">
              <div className="space-y-2 text-center text-[11px] leading-snug text-zinc-900 sm:text-[12px]">
                <p className="flex items-center justify-center gap-2 font-bold">
                  <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0" fill="currentColor" aria-hidden>
                    <path d="M10 2a3 3 0 0 0-3 3v2H6a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1h-1V5a3 3 0 0 0-3-3zm1 5H9V5a1 1 0 1 1 2 0v2z" />
                  </svg>
                  Secure Checkout
                </p>
                <p className="flex items-center justify-center gap-2 font-medium">
                  <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0" fill="currentColor" aria-hidden>
                    <path d="M10 1.5 3 4.5v5.8c0 4.1 2.9 7.9 7 9.2 4.1-1.3 7-5.1 7-9.2V4.5L10 1.5zm-1.2 9.8-2.3-2.3 1.1-1.1 1.2 1.2 3.4-3.4 1.1 1.1-4.5 4.5z" />
                  </svg>
                  No adult transaction in your bank statement
                </p>
                <p className="flex items-center justify-center gap-2 font-medium">
                  <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 shrink-0" fill="currentColor" aria-hidden>
                    <path d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm3.7 6.3-4.2 4.2a1 1 0 0 1-1.4 0l-2-2a1 1 0 1 1 1.4-1.4l1.3 1.3 3.5-3.5a1 1 0 0 1 1.4 1.4z" />
                  </svg>
                  No hidden fees · 100% Anonymous
                </p>
              </div>
              <div className="mt-4 border-t border-zinc-200 pt-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/checkout/ssl-secure-badge.png"
                  alt="Fully secured SSL checkout"
                  className="mx-auto h-9 w-auto max-w-[160px] object-contain sm:h-10 sm:max-w-[180px]"
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="relative z-10 mx-auto mt-12 w-full max-w-[560px] px-4 pb-10 sm:mt-16 sm:pb-12">
        <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_12px_40px_rgba(0,0,0,0.18)] sm:p-6">
          <SiteFaq variant="checkout" />
        </div>
      </div>

      <footer className="relative z-10 shrink-0 border-t border-[#ff2d78]/20 bg-[#0a0208]/50 px-4 pt-8 pb-[max(0.75rem,var(--safe-bottom))] backdrop-blur-md">
        <div className="mx-auto max-w-[720px]">
          <FeaturedOn variant="login-content" />
        </div>
      </footer>
    </div>
  );
}
