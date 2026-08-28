'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { rememberBalanceBeforePayment } from '@/app/components/PaymentSuccessBanner';
import { CURRENCY_NAME, getAuthToken, getDesires, setDesires, syncPurchasedDesires } from '@/lib/desires';
import { storeAuthSession } from '@/lib/auth/session';
import { cacheUserProfile } from '@/lib/auth/profile';
import { loginHref, HELLO_EMAIL, checkoutBannerCopy } from '@/lib/site';
import { capturePosthogEvent, capturePosthogException } from '@/lib/posthog';
import { trackEvent } from '@/lib/trackClient';
import { formatUsdPrice, CRYPTO_DISCOUNT_PERCENT, PREMIUM_PLANS, planBonusGenerationCopy, planBonusPercentLabel, planGenerationCopy, type PremiumPlan } from '@/lib/premiumPlans';
import {
  CRYPTO_COUPON_APPLIED_KEY,
  CRYPTO_COUPON_CODE,
  CRYPTO_COUPON_DURATION_MS,
  CHECKOUT_COUPON_KEY,
  formatCouponCountdown,
  isCouponOfferDisplayExpired,
  normalizeCryptoCouponCode,
  resolveCheckoutCoupon,
} from '@/lib/payments/cryptoCoupon';
import { applyCouponToUsd, couponRewardLabel } from '@/lib/coupons/pricing';
import type { PriceCoupon } from '@/lib/coupons/types';

function readAppliedCoupon(): PriceCoupon | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(CHECKOUT_COUPON_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PriceCoupon;
      if (parsed?.code && (parsed.type === 'percent_off' || parsed.type === 'amount_off')) {
        return parsed;
      }
    }
  } catch {
    /* ignore */
  }
  if (sessionStorage.getItem(CRYPTO_COUPON_APPLIED_KEY) === '1') {
    return resolveCheckoutCoupon(CRYPTO_COUPON_CODE);
  }
  return null;
}

function writeAppliedCoupon(coupon: PriceCoupon | null) {
  if (typeof window === 'undefined') return;
  if (!coupon) {
    sessionStorage.removeItem(CHECKOUT_COUPON_KEY);
    sessionStorage.removeItem(CRYPTO_COUPON_APPLIED_KEY);
    return;
  }
  sessionStorage.setItem(CHECKOUT_COUPON_KEY, JSON.stringify(coupon));
  sessionStorage.setItem(CRYPTO_COUPON_APPLIED_KEY, '1');
}

function CryptoOfferPromoBanner({
  secondsLeft,
  onCopyCode,
  copyLabel,
}: {
  secondsLeft: number;
  onCopyCode: () => void;
  copyLabel: string;
}) {
  const offerExpired = isCouponOfferDisplayExpired(secondsLeft);

  return (
    <div
      className={`border-b px-3 py-2 sm:px-6 sm:py-2.5 ${
        offerExpired
          ? 'border-[#a3a3a3]/30 bg-gradient-to-r from-[#e5e5e5] via-[#d4d4d4] to-[#c9c9c9]'
          : 'border-[#c9a000]/40 bg-gradient-to-r from-[#fff176] via-[#ffea00] to-[#ffc400] shadow-[inset_0_-1px_0_rgba(255,255,255,0.45)]'
      }`}
    >
      <div
        className={`mx-auto flex max-w-6xl items-stretch overflow-hidden rounded-xl border border-dashed ${
          offerExpired
            ? 'border-[#737373]/50 bg-[#e5e5e5] shadow-none'
            : 'border-[#8a6d00]/70 bg-[#ffea00] shadow-[0_4px_18px_rgba(255,193,7,0.45)]'
        }`}
      >
        <div className="min-w-0 flex-1 px-2.5 py-2 sm:px-3 sm:py-2.5">
          <p
            className={`flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[9px] font-bold uppercase leading-snug tracking-wide sm:gap-x-1.5 sm:text-[10px] ${
              offerExpired ? 'text-[#525252]' : 'text-[#3d2f00]'
            }`}
          >
            {offerExpired ? (
              <>
                <span className="shrink-0 rounded-md bg-[#737373] px-1.5 py-0.5 text-[11px] font-black uppercase leading-none tracking-wide text-white sm:px-2 sm:py-1 sm:text-xs">
                  Offer ended
                </span>
                <span className="min-w-0 normal-case">Refresh the page to reveal the next crypto offer.</span>
              </>
            ) : (
              <>
                <span className="shrink-0">Get</span>
                <span className="shrink-0 rounded-md bg-[#ff5a00] px-1.5 py-0.5 text-[11px] font-black uppercase leading-none tracking-wide text-white shadow-[0_2px_8px_rgba(255,90,0,0.45)] sm:px-2 sm:py-1 sm:text-xs">
                  {CRYPTO_DISCOUNT_PERCENT}% OFF
                </span>
                <span className="min-w-0">
                  with crypto payment. using ={' '}
                  <button
                    type="button"
                    onClick={onCopyCode}
                    className="inline rounded bg-white px-1.5 py-0.5 font-mono text-[11px] font-bold normal-case tracking-wide text-[#2d2200] underline decoration-[#b8860b] underline-offset-2 shadow-sm transition hover:bg-[#fffde7] sm:text-xs"
                    title={copyLabel}
                  >
                    {CRYPTO_COUPON_CODE}
                  </button>
                </span>
              </>
            )}
          </p>
        </div>

        <div
          className={`flex shrink-0 flex-col items-center justify-center self-stretch border-l border-dashed px-1 ${
            offerExpired
              ? 'w-[3.6rem] border-[#737373]/40 bg-[#d4d4d4] sm:w-[4rem]'
              : 'w-[3.1rem] border-[#8a6d00]/50 bg-[#fff59d] sm:w-[3.4rem]'
          }`}
          aria-label={offerExpired ? 'Offer ended' : 'Offer countdown'}
        >
          {offerExpired ? (
            <span className="text-center text-[8px] font-black uppercase leading-tight tracking-wide text-[#7f1d1d] sm:text-[9px]">
              Offer
              <br />
              ended
            </span>
          ) : (
            <span className="font-mono text-[15px] font-black tabular-nums leading-none text-[#d50000] drop-shadow-[0_1px_0_rgba(255,255,255,0.65)] sm:text-base">
              {formatCouponCountdown(secondsLeft)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function CryptoCouponApplyField({
  couponInput,
  couponApplied,
  couponNote,
  savingsLabel,
  onInputChange,
  onApply,
  onRemove,
}: {
  couponInput: string;
  couponApplied: boolean;
  couponNote: string;
  savingsLabel: string | null;
  onInputChange: (value: string) => void;
  onApply: () => void | Promise<void>;
  onRemove: () => void;
}) {
  return (
    <div className="mt-2">
      <div className="flex items-center gap-1.5">
        <div className="relative min-w-0 flex-1">
          <input
            id="checkout-coupon"
            type="text"
            value={couponInput}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                if (!couponApplied) onApply();
              }
            }}
            placeholder="Coupon code"
            readOnly={couponApplied}
            aria-readonly={couponApplied}
            className={`w-full rounded-md border px-2 py-1.5 text-xs uppercase outline-none placeholder:normal-case focus:ring-1 ${
              couponApplied
                ? 'border-[#86efac]/50 bg-[#f0fdf4]/95 pr-8 text-[#14532d] focus:border-[#86efac] focus:ring-[#86efac]/20'
                : 'border-white/30 bg-white/10 text-white placeholder:text-white/45 focus:border-white focus:ring-white/20'
            }`}
          />
          {couponApplied ? (
            <button
              type="button"
              onClick={onRemove}
              aria-label="Remove coupon"
              title="Remove coupon"
              className="absolute right-1 top-1/2 inline-flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-[#14532d]/55 transition hover:bg-[#1a1a1a]/8 hover:text-[#14532d]"
            >
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" aria-hidden>
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          ) : null}
        </div>
        {!couponApplied ? (
          <button
            type="button"
            onClick={onApply}
            className="shrink-0 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-[#635bff] hover:bg-white/90"
          >
            Apply
          </button>
        ) : null}
      </div>
      {couponApplied && savingsLabel ? (
        <p className="mt-1 text-[10px] font-medium leading-tight text-[#86efac]">{savingsLabel}</p>
      ) : couponNote ? (
        <p className="mt-1 text-[10px] leading-tight text-[#fecaca]">{couponNote}</p>
      ) : null}
    </div>
  );
}

type Props = {
  plan: PremiumPlan;
};

const PACKS = [...PREMIUM_PLANS].sort((a, b) => a.price - b.price);
const PRODUCT_THUMB = '/checkout/product.jpg';

function LockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? 'h-3.5 w-3.5'} fill="currentColor" aria-hidden>
      <path d="M17 8h-1V6a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2zm-7-2a2 2 0 1 1 4 0v2h-4V6z" />
    </svg>
  );
}

function UsdtIcon() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/payments/usdt-icon.png"
      alt=""
      width={32}
      height={32}
      loading="lazy"
      decoding="async"
      className="h-7 w-7 shrink-0 rounded-[7px] sm:h-8 sm:w-8 sm:rounded-lg"
    />
  );
}

function MethodCopy({
  title,
  subtitle,
  badge,
  subtitleInline,
}: {
  title: string;
  subtitle: string;
  badge?: string;
  subtitleInline?: boolean;
}) {
  if (badge) {
    return (
      <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5 text-left">
        <span className="inline-flex w-fit rounded-md bg-[#ff5a00] px-2 py-1 text-[11px] font-black uppercase leading-none tracking-wide text-white shadow-sm sm:px-2.5 sm:py-1 sm:text-xs">
          {badge}
        </span>
        <span className="flex min-w-0 w-full items-baseline gap-1.5 sm:gap-2">
          <span className="shrink-0 text-[13px] font-semibold sm:text-sm">{title}</span>
          <span className="min-w-0 text-[10px] leading-tight text-[#6b6f7a] sm:text-[11px]">{subtitle}</span>
        </span>
      </span>
    );
  }

  if (subtitleInline) {
    return (
      <span className="min-w-0 flex-1 text-left text-[13px] font-semibold leading-snug sm:text-sm">
        {title}
        <span className="text-[#6b6f7a]"> / {subtitle}</span>
      </span>
    );
  }

  return (
    <span className="flex min-w-0 flex-1 items-center gap-1.5 text-left sm:gap-2">
      <span className="shrink-0 text-[13px] font-semibold sm:text-sm">{title}</span>
      <span className="min-w-0 truncate text-[11px] text-[#6b6f7a] sm:text-xs">{subtitle}</span>
    </span>
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
    <div role="list" className="text-[11px] leading-snug text-[#1a1a1a] sm:text-[12px]">
      <div role="listitem" className="flex items-center gap-1.5 font-semibold">
        <LockIcon className="h-3.5 w-3.5 shrink-0" />
        Secure Checkout
      </div>
      <div role="listitem" className="mt-1 flex items-center gap-1.5 sm:mt-1.5">
        <ShieldIcon className="h-3.5 w-3.5 shrink-0" />
        No adult transaction in your bank statement
      </div>
      <div role="listitem" className="mt-1 flex items-center gap-1.5 sm:mt-1.5">
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
  const [planId, setPlanId] = useState(plan.id);
  const [agreed, setAgreed] = useState(false);
  const [agreedNoMinors, setAgreedNoMinors] = useState(false);
  const [buying, setBuying] = useState(false);
  const [note, setNote] = useState('');
  const [termsNote, setTermsNote] = useState('');
  const [minorsNote, setMinorsNote] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<PriceCoupon | null>(null);
  const [couponNote, setCouponNote] = useState('');
  const [copyLabel, setCopyLabel] = useState('Tap to copy');
  const [secondsLeft, setSecondsLeft] = useState(CRYPTO_COUPON_DURATION_MS / 1000);
  const balanceBeforePayment = useRef(0);
  const pollRef = useRef<number | null>(null);
  const payButtonRef = useRef<HTMLButtonElement>(null);

  const selected = PREMIUM_PLANS.find((item) => item.id === planId) ?? plan;
  const couponApplied = Boolean(appliedCoupon);
  const dueToday = applyCouponToUsd(selected.price, appliedCoupon);
  const couponSavingsLabel = appliedCoupon ? `${couponRewardLabel(appliedCoupon)} applied` : null;
  const payLabel = useMemo(
    () =>
      buying
        ? 'Opening…'
        : couponApplied
          ? `CONTINUE · ${formatUsdPrice(dueToday)} · You Saved ${formatUsdPrice(Math.max(0, selected.price - dueToday))}`
          : `CONTINUE · ${formatUsdPrice(dueToday)}`,
    [buying, couponApplied, dueToday, selected.price],
  );

  const checkoutPath = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('plan', planId);
    params.set('method', 'crypto');
    return `/checkout?${params.toString()}`;
  }, [searchParams, planId]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      let signedIn = Boolean(getAuthToken());
      if (!signedIn) {
        try {
          const me = await fetch('/api/auth/me', { credentials: 'include' });
          if (me.ok) {
            const data = (await me.json()) as { clientId?: string; email?: string; name?: string; avatarUrl?: string };
            if (data.clientId) storeAuthSession({ clientId: data.clientId });
            if (data.email) {
              cacheUserProfile({
                email: data.email,
                name: data.name || '',
                avatarUrl: data.avatarUrl || '',
              });
            }
            signedIn = true;
          }
        } catch {
          /* ignore */
        }
      }
      if (!signedIn) {
        try {
          const res = await fetch('/api/admin/bootstrap-user', { credentials: 'include' });
          if (res.ok) {
            const data = (await res.json()) as {
              clientId?: string;
              email?: string;
              name?: string;
              desires?: number;
            };
            if (data.clientId) {
              storeAuthSession({ clientId: data.clientId });
              cacheUserProfile({
                email: data.email || '',
                name: data.name || 'Admin',
                avatarUrl: '',
              });
              if (typeof data.desires === 'number') setDesires(data.desires);
              signedIn = true;
            }
          }
        } catch {
          /* not an admin session */
        }
      }

      if (cancelled) return;
      if (!signedIn) {
        router.replace(loginHref(checkoutPath));
        return;
      }
      setAuthReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [router, checkoutPath]);

  useEffect(() => {
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  useEffect(() => {
    const stored = readAppliedCoupon();
    setAppliedCoupon(stored);
    if (stored?.code) setCouponInput(stored.code);
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => (prev <= 0 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    trackEvent('checkout_view', { kind: 'view', plan: plan.id, method: 'crypto' });
  }, [plan.id]);

  const replaceCheckout = (nextPlan: string) => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('plan', nextPlan);
    params.set('method', 'crypto');
    const next = `/checkout?${params.toString()}`;
    window.history.replaceState(window.history.state, '', next);
  };

  const applyCheckoutCoupon = async () => {
    const normalized = normalizeCryptoCouponCode(couponInput);
    if (!normalized) {
      setCouponNote('Invalid coupon code.');
      return;
    }
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: normalized }),
      });
      const data = (await res.json()) as {
        message?: string;
        code?: string;
        type?: PriceCoupon['type'];
        discountPercent?: number;
        discountUsd?: number;
      };
      if (!res.ok || !data.code || (data.type !== 'percent_off' && data.type !== 'amount_off')) {
        setCouponNote(data.message || 'Invalid coupon code.');
        return;
      }
      const coupon: PriceCoupon = {
        code: data.code,
        type: data.type,
        discountPercent: data.discountPercent || 0,
        discountUsd: data.discountUsd || 0,
      };
      setCouponInput(coupon.code);
      setAppliedCoupon(coupon);
      setCouponNote('');
      writeAppliedCoupon(coupon);
      trackEvent('checkout_coupon', { kind: 'click', plan: planId, method: 'crypto' });
    } catch {
      setCouponNote('Could not validate coupon.');
    }
  };

  const removeCheckoutCoupon = () => {
    setAppliedCoupon(null);
    setCouponNote('');
    writeAppliedCoupon(null);
    trackEvent('checkout_coupon', { kind: 'click', plan: planId, method: 'crypto' });
  };

  const copyCryptoCouponCode = async () => {
    try {
      await navigator.clipboard.writeText(CRYPTO_COUPON_CODE);
    } catch {
      // Clipboard may be blocked; still prefill the field below.
    }
    setCouponInput(CRYPTO_COUPON_CODE);
    setCopyLabel('Copied!');
    window.setTimeout(() => setCopyLabel('Tap to copy'), 2000);
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
    trackEvent('checkout_plan', { kind: 'click', plan: id, method: 'crypto' });
    replaceCheckout(id);
    scrollToPay();
  };

  const startCheckout = async () => {
    const token = getAuthToken();
    if (!token) {
      router.replace(loginHref(checkoutPath));
      return;
    }
    if (!agreedNoMinors) {
      setMinorsNote('Please confirm you will not use minor photos.');
      document.getElementById('checkout-no-minors')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!agreed) {
      setTermsNote('Please tick the box to confirm you are 18+ and agree to the Terms of Service.');
      document.getElementById('checkout-age-terms')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    trackEvent('checkout_pay', { kind: 'click', plan: selected.id, method: 'crypto' });
    setBuying(true);
    setNote('');
    setTermsNote('');
    setMinorsNote('');
    setToast('Redirecting to NOWPayments, a secure payment...');
    try {
      const res = await fetch('/api/payments/nowpayments', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: selected.id,
          couponCode: appliedCoupon?.code,
        }),
      });
      const data = (await res.json()) as { url?: string; message?: string };
      if (res.status === 401) {
        setToast(null);
        router.replace(loginHref(checkoutPath));
        return;
      }
      if (!res.ok || !data.url) {
        setToast(null);
        setNote(data.message || 'Could not start checkout.');
        capturePosthogEvent('checkout_error', {
          stage: 'start_checkout',
          plan: selected.id,
          method: 'crypto',
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
        setToast('Popup blocked. Tap “Open payment page” below to continue.');
        capturePosthogEvent('checkout_error', {
          stage: 'popup_blocked',
          plan: selected.id,
          method: 'crypto',
        });
      } else if (opened === 'same-tab') {
        return;
      } else {
        setPaymentUrl(null);
        setToast('Complete payment in the new tab. We will update your balance here automatically.');
      }

      if (pollRef.current) window.clearInterval(pollRef.current);
      let ticks = 0;
      pollRef.current = window.setInterval(() => {
        ticks += 1;
        void syncPurchasedDesires().then((balance) => {
          const before = balanceBeforePayment.current;
          if (balance > before) {
            const added = balance - before;
            setToast(
              `Payment received — ${added.toLocaleString('en-US')} ${CURRENCY_NAME} added. Balance: ${balance.toLocaleString('en-US')}.`,
            );
            balanceBeforePayment.current = balance;
            if (pollRef.current) {
              window.clearInterval(pollRef.current);
              pollRef.current = null;
            }
          }
        });
        if (ticks >= 120 && pollRef.current) {
          window.clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }, 4000);
    } catch (error) {
      setToast(null);
      setNote('Could not start checkout.');
      capturePosthogException(error, { source: 'checkout', stage: 'start_checkout', plan: selected.id, method: 'crypto' });
      capturePosthogEvent('checkout_error', { stage: 'start_checkout', plan: selected.id, method: 'crypto' });
    } finally {
      setBuying(false);
    }
  };

  if (!authReady) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-white text-[#1a1a1a]">
        <p className="text-sm text-[#6b6f7a]">Checking sign-in…</p>
      </div>
    );
  }

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
          </div>
        </div>
      ) : null}
      <CryptoOfferPromoBanner
        secondsLeft={secondsLeft}
        onCopyCode={() => void copyCryptoCouponCode()}
        copyLabel={copyLabel}
      />
      <div className="lg:grid lg:grid-cols-2">
      <aside className="flex flex-col bg-[#635bff] px-3 py-2.5 text-white sm:px-6 sm:py-5 lg:min-h-[calc(100dvh-3.5rem)] lg:px-8 lg:py-6">
        <nav className="flex items-center gap-1.5 text-[11px] text-white/75 sm:text-xs">
          <Link
            href="/tool"
            aria-label="Back"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-white hover:bg-white/10"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" aria-hidden>
              <path d="M15 6 9 12l6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link href="/" className="hover:text-white">
            AI SLUTBOT
          </Link>
          <span className="text-white/40">/</span>
          <span className="text-white">Checkout</span>
        </nav>

        <div className="mt-2.5 flex items-start gap-2.5 sm:mt-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={PRODUCT_THUMB}
            alt=""
            className="h-10 w-10 shrink-0 rounded-md object-cover sm:h-11 sm:w-11"
          />
          <div className="min-w-0">
            <p className="text-[10px] font-medium text-[#fde68a] sm:text-[11px]">✨ Slutcoins never expire</p>
            <p className="mt-0.5 text-[10px] leading-snug text-white/80 sm:text-[11px]">
              {planGenerationCopy(selected)}
            </p>
            {planBonusGenerationCopy(selected) ? (
              <p className="mt-0.5 text-[10px] font-medium leading-snug text-[#86efac] sm:text-[11px]">
                Bonus: {planBonusGenerationCopy(selected)}
              </p>
            ) : null}
            <p className="mt-0.5 text-xs font-semibold tabular-nums sm:text-[13px]">
              {selected.desires.toLocaleString('en-US')} Slutcoins
            </p>
          </div>
        </div>

        <div className="mt-2.5 space-y-1 sm:mt-4 sm:space-y-1.5">
          {PACKS.map((pack) => {
            const active = pack.id === selected.id;
            const bonusPercent = planBonusPercentLabel(pack);
            return (
              <button
                key={pack.id}
                type="button"
                onClick={() => selectPlan(pack.id)}
                className={`flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left sm:gap-2.5 sm:px-2.5 sm:py-2 ${
                  active ? 'border-white bg-white/10' : 'border-white/25 hover:border-white/45'
                }`}
              >
                <span
                  className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border sm:h-4 sm:w-4 ${
                    active ? 'border-white' : 'border-white/50'
                  }`}
                >
                  {active ? <span className="h-1.5 w-1.5 rounded-full bg-white sm:h-2 sm:w-2" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-1">
                    <span className="text-xs font-medium sm:text-[13px]">
                      {pack.tier} · {pack.desires.toLocaleString('en-US')} Slutcoins
                    </span>
                    {bonusPercent ? (
                      <span className="inline-flex rounded-full bg-[#22c55e] px-1.5 py-px text-[9px] font-semibold leading-3 text-white sm:text-[10px] sm:leading-4">
                        {bonusPercent}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-px block text-[10px] leading-snug text-white/65 sm:text-[11px]">
                    {planGenerationCopy(pack)}
                  </span>
                </span>
                <span className="shrink-0 text-right text-xs font-medium sm:text-[13px]">
                  {formatUsdPrice(applyCouponToUsd(pack.price, appliedCoupon))}
                </span>
              </button>
            );
          })}
          <CryptoCouponApplyField
            couponInput={couponInput}
            couponApplied={couponApplied}
            couponNote={couponNote}
            savingsLabel={couponSavingsLabel}
            onInputChange={(value) => {
              setCouponInput(value);
              if (couponNote) setCouponNote('');
            }}
            onApply={applyCheckoutCoupon}
            onRemove={removeCheckoutCoupon}
          />
        </div>

        <p className="mt-3 text-[10px] leading-snug text-white/60 sm:mt-auto sm:pt-6 sm:text-[11px]">
          Support:{' '}
          <a
            href={`mailto:${HELLO_EMAIL}`}
            className="font-medium text-white/90 underline underline-offset-2 hover:text-white"
          >
            {HELLO_EMAIL}
          </a>
        </p>
      </aside>

      <main className="flex min-h-0 flex-1 items-start bg-white px-3 py-3 pb-[max(1.25rem,var(--safe-bottom))] text-[#1a1a1a] sm:px-10 sm:py-8 lg:min-h-dvh lg:px-12 lg:py-10">
        <div className="w-full max-w-[440px]">
          <h1 className="mt-2.5 text-[17px] font-semibold tracking-tight text-[#1a1a1a] sm:mt-3 sm:text-[22px] lg:mt-8">
            Pay with crypto
          </h1>

          <p className="mt-1 hidden text-sm text-[#6b6f7a] sm:mt-3 sm:block">
            Slutcoins are added to your account right after payment.
          </p>

          {checkoutBanner ? (
            <p className="mt-2 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-xs text-[#854d0e] sm:mt-3 sm:px-3.5 sm:py-3 sm:text-sm">
              {checkoutBanner}
            </p>
          ) : null}

          <div className="mt-2.5 space-y-2 sm:mt-5 sm:space-y-3">
            <div className="flex w-full items-start gap-2.5 rounded-lg border border-[#635bff] px-3 py-2.5 ring-1 ring-[#635bff] sm:gap-3 sm:rounded-xl sm:px-4 sm:py-3.5">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#635bff] sm:mt-1 sm:h-5 sm:w-5">
                <span className="h-2 w-2 rounded-full bg-[#635bff] sm:h-2.5 sm:w-2.5" />
              </span>
              <span className="mt-0.5 shrink-0 sm:mt-1">
                <UsdtIcon />
              </span>
              <MethodCopy title="Crypto" subtitle="USDT TRC20" />
            </div>

            <div className="flex items-center justify-center pt-0.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/payments/nowpayments-logo.png"
                alt="NOWPayments"
                className="h-4 w-auto sm:h-5"
              />
              <a
                href="/payments/crypto-tutorial"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackEvent('checkout_tutorial', { kind: 'click', plan: planId, method: 'crypto' })}
                className="ml-1.5 text-[11px] font-medium text-[#635bff] underline underline-offset-2 hover:text-[#4f3dff] sm:ml-2 sm:text-xs"
              >
                (Tutorial)
              </a>
            </div>
          </div>

          <p className="mt-2 text-[12px] leading-snug text-[#1a1a1a] sm:mt-4 sm:text-[13px]">
            You&apos;ll be redirected to NOWpayments secure checkout to pay with USDT TRC20. If any trouble please email
            our support team at{' '}
            <a href={`mailto:${HELLO_EMAIL}`} className="font-medium text-[#1a1a1a] underline underline-offset-2">
              {HELLO_EMAIL}
            </a>
          </p>

          <div className="mt-2.5 overflow-x-auto [scrollbar-width:none] sm:mt-5 [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max items-center gap-2 whitespace-nowrap text-[9px] leading-none text-[#3d424d] sm:text-[10px]">
              <input
                id="checkout-no-minors"
                type="checkbox"
                checked={agreedNoMinors}
                onChange={(event) => {
                  setAgreedNoMinors(event.target.checked);
                  if (event.target.checked) setMinorsNote('');
                }}
                className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-[#635bff]"
              />
              <label htmlFor="checkout-no-minors" className="cursor-pointer">
                Using minor photos is strictly forbidden and will lead to instant account termination.
              </label>
            </div>
          </div>
          {minorsNote ? (
            <p className="mt-1.5 text-[10px] leading-snug text-[#b42318] sm:text-[11px]">{minorsNote}</p>
          ) : null}

          <div className="mt-2 overflow-x-auto [scrollbar-width:none] sm:mt-2.5 [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max items-center gap-2 whitespace-nowrap text-[9px] leading-none text-[#3d424d] sm:text-[10px]">
              <input
                id="checkout-age-terms"
                type="checkbox"
                checked={agreed}
                onChange={(event) => {
                  setAgreed(event.target.checked);
                  if (event.target.checked) setTermsNote('');
                }}
                className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-[#635bff]"
              />
              <label htmlFor="checkout-age-terms" className="cursor-pointer">
                You confirm that you are at least 18 years old and agree to our{' '}
                <Link
                  href="/terms"
                  className="font-medium text-[#635bff] underline underline-offset-2 hover:text-[#4f3dff]"
                  onClick={(event) => event.stopPropagation()}
                >
                  Terms of Service
                </Link>
                .
              </label>
            </div>
          </div>
          {termsNote ? (
            <p className="mt-1.5 text-[10px] leading-snug text-[#b42318] sm:text-[11px]">{termsNote}</p>
          ) : null}

          <button
            ref={payButtonRef}
            type="button"
            disabled={buying}
            onClick={() => void startCheckout()}
            className="mt-3 inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7a72ff] to-[#4f3dff] px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(99,91,255,0.35)] hover:from-[#6e66f8] hover:to-[#4636f0] disabled:cursor-not-allowed disabled:opacity-50 sm:mt-5 sm:min-h-12"
          >
            {payLabel}
            <LockIcon className="h-3.5 w-3.5" />
          </button>

          {paymentUrl ? (
            <a
              href={paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-[#635bff] px-4 text-sm font-semibold text-[#635bff] hover:bg-[#635bff]/5"
            >
              Open payment page
            </a>
          ) : null}

          <div className="mt-3 sm:mt-4">
            <TrustSignals />
          </div>

          {note ? <p className="mt-2 text-center text-xs text-[#b42318] sm:mt-3">{note}</p> : null}
        </div>
      </main>
      </div>
    </div>
  );
}
