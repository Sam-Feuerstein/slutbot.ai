'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { rememberBalanceBeforePayment } from '@/app/components/PaymentSuccessBanner';
import { CURRENCY_NAME, getAuthToken, getDesires, setDesires, syncPurchasedDesires } from '@/lib/desires';
import { getAuthEpoch } from '@/lib/auth/session';
import { tryRestoreSessionFromCookie } from '@/lib/auth/syncSession';
import { loginHref, HELLO_EMAIL, checkoutBannerCopy } from '@/lib/site';
import { capturePosthogEvent, capturePosthogException } from '@/lib/posthog';
import { trackEvent } from '@/lib/trackClient';
import { checkoutPromoMediaUrl } from '@/lib/presetMedia';
import { formatUsdPrice, formatAroundUsd, CRYPTO_DISCOUNT_PERCENT, CRYPTO_MIN_USD, PREMIUM_PLANS, planBonusPercentLabel, planGenerationCopy, planMoreGenerationsCopy, type PremiumPlan } from '@/lib/premiumPlans';
import {
  CRYPTO_COUPON_APPLIED_KEY,
  CRYPTO_COUPON_CODE,
  CRYPTO_COUPON_DURATION_MS,
  CHECKOUT_COUPON_KEY,
  formatCouponCountdown,
  isCouponOfferDisplayExpired,
  isCryptoCouponCode,
  normalizeCryptoCouponCode,
  resolveCheckoutCoupon,
} from '@/lib/payments/cryptoCoupon';
import { applyCouponToStars, applyCouponToUsd, couponRewardLabel } from '@/lib/coupons/pricing';
import type { PriceCoupon } from '@/lib/coupons/types';

export type CheckoutMethod = 'stars' | 'crypto';

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
  className,
}: {
  secondsLeft: number;
  onCopyCode: () => void;
  copyLabel: string;
  className?: string;
}) {
  const offerExpired = isCouponOfferDisplayExpired(secondsLeft);

  return (
    <div
      className={`border-b px-3 py-2 sm:px-6 sm:py-2.5 ${
        offerExpired
          ? 'border-[#a3a3a3]/30 bg-gradient-to-r from-[#e5e5e5] via-[#d4d4d4] to-[#c9c9c9]'
          : 'border-[#c9a000]/40 bg-gradient-to-r from-[#fff176] via-[#ffea00] to-[#ffc400] shadow-[inset_0_-1px_0_rgba(255,255,255,0.45)]'
      } ${className ?? ''}`}
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
                <span className="shrink-0">SAVE</span>
                <span className="shrink-0 rounded-md bg-[#ff5a00] px-1.5 py-0.5 text-[11px] font-black uppercase leading-none tracking-wide text-white shadow-[0_2px_8px_rgba(255,90,0,0.45)] sm:px-2 sm:py-1 sm:text-xs">
                  {CRYPTO_DISCOUNT_PERCENT}%
                </span>
                <span className="min-w-0">
                  BY PAYING WITH USDT USING ={' '}
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
                ? 'border-[#86efac]/50 bg-[#f0fdf4] pr-8 text-[#14532d] focus:border-[#86efac] focus:ring-[#86efac]/20'
                : 'border-white/80 bg-white text-[#1a1a1a] placeholder:text-[#6b6f7a] focus:border-white focus:ring-white/40'
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
            className="shrink-0 rounded-md bg-white px-2.5 py-1.5 text-xs font-semibold text-[#ff2d78] hover:bg-white/90"
          >
            Apply
          </button>
        ) : null}
      </div>
      {couponApplied && savingsLabel ? (
        <p className="mt-1 text-[10px] font-medium leading-tight text-[#86efac]">{savingsLabel}</p>
      ) : savingsLabel ? (
        <p className="mt-1 text-[10px] font-medium leading-tight text-[#fde68a]">{savingsLabel}</p>
      ) : couponNote ? (
        <p className="mt-1 text-[10px] leading-tight text-[#fecaca]">{couponNote}</p>
      ) : null}
    </div>
  );
}

type Props = {
  plan: PremiumPlan;
  initialMethod: CheckoutMethod;
};

const PACKS = [...PREMIUM_PLANS].sort((a, b) => a.price - b.price);
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
          <Link href="/" className="font-medium hover:text-white">
            AI SLUTBOT
          </Link>
          <span className="text-white/55">/</span>
          <span className="font-medium text-white">Checkout</span>
        </nav>
      </div>
    </div>
  );
}

function TelegramIcon() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/payments/telegram-icon.png"
      alt=""
      width={32}
      height={32}
      loading="lazy"
      decoding="async"
      className="h-7 w-7 shrink-0 rounded-[7px] sm:h-8 sm:w-8 sm:rounded-lg"
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

function SamsungPayMark() {
  return (
    <span className="inline-flex h-5 items-center rounded-[4px] bg-black px-1.5 text-[9px] font-semibold tracking-tight text-white sm:h-7 sm:px-2 sm:text-[11px]">
      Samsung Pay
    </span>
  );
}

function WalletLogos() {
  return (
    <span className="flex flex-wrap items-center gap-1 pl-7 sm:gap-2 sm:pl-8">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/payments/wallet-logos.png"
        alt="Mastercard, Visa, Google Pay, Apple Pay"
        className="h-[18px] w-auto sm:h-7"
      />
      <SamsungPayMark />
    </span>
  );
}

function PackAroundUsdPrice({ catalogStars, chargedStars }: { catalogStars: number; chargedStars: number }) {
  if (chargedStars === catalogStars) return <>{formatAroundUsd(chargedStars)}</>;
  return (
    <span className="block leading-tight">
      <span className="block text-[11px] font-normal text-white/35 line-through">{formatAroundUsd(catalogStars)}</span>
      <span>{formatAroundUsd(chargedStars)}</span>
    </span>
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

export default function CheckoutClient({ plan, initialMethod }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const checkoutReason = searchParams.get('reason')?.trim() || '';
  const checkoutBanner = checkoutBannerCopy(checkoutReason);
  const [authReady, setAuthReady] = useState(false);
  const [planId, setPlanId] = useState(plan.id);
  const [method, setMethod] = useState<CheckoutMethod>(initialMethod);
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
  // USDT coupon is crypto-only — never discount Telegram Stars invoices with it.
  const pricingCoupon =
    appliedCoupon && !(method === 'stars' && isCryptoCouponCode(appliedCoupon.code)) ? appliedCoupon : null;
  const selectedStars = applyCouponToStars({
    catalogStars: selected.stars,
    geoStars: selected.stars,
    coupon: pricingCoupon,
    roundUpTo: 1,
  });
  const couponApplied = Boolean(pricingCoupon);
  const dueTodayUsd = applyCouponToUsd(selected.price, pricingCoupon);
  const couponSavingsLabel = pricingCoupon
    ? method === 'crypto' && dueTodayUsd >= selected.price - 0.001
      ? `Crypto checkout is ${formatUsdPrice(CRYPTO_MIN_USD)} minimum — you still get ${selected.desires.toLocaleString('en-US')} Stars`
      : `${couponRewardLabel(pricingCoupon)} the price you pay — you still get ${selected.desires.toLocaleString('en-US')} Stars`
    : appliedCoupon && method === 'stars' && isCryptoCouponCode(appliedCoupon.code)
      ? `USDT-only code — switch to Crypto to save ${CRYPTO_DISCOUNT_PERCENT}%`
      : null;
  const payLabel = useMemo(() => {
    if (buying) return 'Opening…';
    if (method === 'stars') {
      const catalogStars = selected.stars;
      if (couponApplied && selectedStars < catalogStars) {
        return `CONTINUE · ${formatAroundUsd(selectedStars)} · You Saved ${formatAroundUsd(catalogStars - selectedStars)}`;
      }
      return `CONTINUE · ${formatAroundUsd(selectedStars)}`;
    }
    if (couponApplied) {
      const savedUsd = Math.max(0, selected.price - dueTodayUsd);
      if (savedUsd >= 0.01) {
        return `CONTINUE · ${formatUsdPrice(dueTodayUsd)} · You Saved ${formatUsdPrice(savedUsd)}`;
      }
    }
    return `CONTINUE · ${formatUsdPrice(dueTodayUsd)}`;
  }, [buying, couponApplied, dueTodayUsd, method, selected.price, selected.stars, selectedStars]);

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
    trackEvent('checkout_view', { kind: 'view', plan: plan.id, method: initialMethod });
  }, [plan.id, initialMethod]);

  const replaceCheckout = (nextPlan: string, nextMethod: CheckoutMethod) => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.set('plan', nextPlan);
    params.set('method', nextMethod);
    const next = `/checkout?${params.toString()}`;
    window.history.replaceState(window.history.state, '', next);
  };

  const applyCheckoutCoupon = async () => {
    const normalized = normalizeCryptoCouponCode(couponInput);
    if (!normalized) {
      setCouponNote('Invalid coupon code.');
      return;
    }
    if (isCryptoCouponCode(normalized) && method === 'stars') {
      setCouponNote('This code only works with USDT crypto payment.');
      return;
    }
    const builtin = resolveCheckoutCoupon(normalized);
    if (builtin) {
      setCouponInput(builtin.code);
      setAppliedCoupon(builtin);
      setCouponNote('');
      writeAppliedCoupon(builtin);
      trackEvent('checkout_coupon', { kind: 'click', plan: planId, method });
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
      trackEvent('checkout_coupon', { kind: 'click', plan: planId, method });
    } catch {
      setCouponNote('Could not validate coupon.');
    }
  };

  const removeCheckoutCoupon = () => {
    setAppliedCoupon(null);
    setCouponNote('');
    writeAppliedCoupon(null);
    trackEvent('checkout_coupon', { kind: 'click', plan: planId, method });
  };

  const copyCryptoCouponCode = async () => {
    try {
      await navigator.clipboard.writeText(CRYPTO_COUPON_CODE);
    } catch {
      // Clipboard may be blocked; still prefill the field below.
    }
    setCouponInput(CRYPTO_COUPON_CODE);
    if (method !== 'crypto') {
      setMethod('crypto');
      replaceCheckout(planId, 'crypto');
    }
    const builtin = resolveCheckoutCoupon(CRYPTO_COUPON_CODE);
    if (builtin) {
      setAppliedCoupon(builtin);
      setCouponNote('');
      writeAppliedCoupon(builtin);
    }
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
    trackEvent('checkout_plan', { kind: 'click', plan: id, method });
    replaceCheckout(id, method);
    scrollToPay();
  };

  const chooseMethod = (next: CheckoutMethod) => {
    setMethod(next);
    if (next === 'stars' && appliedCoupon && isCryptoCouponCode(appliedCoupon.code)) {
      setCouponNote('USDT-only code — switch to Crypto to use it.');
    } else if (couponNote.includes('USDT')) {
      setCouponNote('');
    }
    trackEvent('checkout_method', { kind: 'click', plan: planId, method: next });
    replaceCheckout(planId, next);
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
    trackEvent('checkout_pay', { kind: 'click', plan: selected.id, method });
    setBuying(true);
    setNote('');
    setTermsNote('');
    setMinorsNote('');
    setToast(
      method === 'stars'
        ? 'Redirecting to Telegram, a secure payment...'
        : 'Redirecting to NOWPayments, a secure payment...',
    );
    try {
      const endpoint = method === 'stars' ? '/api/payments/stars' : '/api/payments/nowpayments';
      const res = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: selected.id,
          couponCode:
            method === 'stars' && appliedCoupon && isCryptoCouponCode(appliedCoupon.code)
              ? undefined
              : appliedCoupon?.code,
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
        setToast('Popup blocked. Tap “Open payment page” below to continue.');
        capturePosthogEvent('checkout_error', {
          stage: 'popup_blocked',
          plan: selected.id,
          method,
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
      capturePosthogException(error, { source: 'checkout', stage: 'start_checkout', plan: selected.id, method });
      capturePosthogEvent('checkout_error', { stage: 'start_checkout', plan: selected.id, method });
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
      <div className="lg:grid lg:grid-cols-2">
      <aside className="flex flex-col border-white/5 bg-[#090505] px-3 py-2.5 text-white sm:px-6 sm:py-5 lg:min-h-[calc(100dvh-3.5rem)] lg:border-r lg:px-8 lg:py-6">
        <CheckoutPromoVideo />
        <CryptoOfferPromoBanner
          secondsLeft={secondsLeft}
          onCopyCode={() => void copyCryptoCouponCode()}
          copyLabel={copyLabel}
          className="-mx-3 mb-2.5 border-b-0 px-0 py-0 sm:-mx-6 lg:-mx-8"
        />

        <p className="text-[10px] font-medium leading-snug text-[#fde68a] sm:text-[11px]">
          One time payment · ✨ Stars never expire
        </p>

        <div className="mt-2.5 space-y-1 sm:mt-3 sm:space-y-1.5">
          {PACKS.map((pack) => {
            const active = pack.id === selected.id;
            const bonusPercent = planBonusPercentLabel(pack);
            const chargedStars = applyCouponToStars({
              catalogStars: pack.stars,
              geoStars: pack.stars,
              coupon: pricingCoupon,
              roundUpTo: 1,
            });
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
                    {method !== 'stars' ? (
                      <span className="shrink-0 text-right text-xs font-medium sm:text-[13px]">
                        {formatUsdPrice(applyCouponToUsd(pack.price, pricingCoupon))}
                      </span>
                    ) : null}
                  </button>
                  {method === 'stars' ? (
                    <div className="shrink-0 px-2 py-1.5 text-right text-xs font-medium sm:px-2.5 sm:py-2 sm:text-[13px]">
                      <PackAroundUsdPrice catalogStars={pack.stars} chargedStars={chargedStars} />
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
          <CryptoCouponApplyField
            couponInput={couponInput}
            couponApplied={Boolean(appliedCoupon)}
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
      </aside>

      <main className="flex min-h-0 flex-1 items-start bg-white px-3 py-3 pb-[max(1.25rem,var(--safe-bottom))] text-[#1a1a1a] sm:px-10 sm:py-8 lg:min-h-dvh lg:px-12 lg:py-10">
        <div className="w-full max-w-[440px]">
          <h1 className="mt-2.5 text-[17px] font-semibold tracking-tight text-[#1a1a1a] sm:mt-3 sm:text-[22px] lg:mt-8">
            Payment method
          </h1>

          <p className="mt-1 hidden text-sm text-[#6b6f7a] sm:mt-3 sm:block">
            Stars are added to your account right after payment.
          </p>

          {checkoutBanner ? (
            <p className="mt-2 rounded-lg border border-[#fde68a] bg-[#fffbeb] px-3 py-2 text-xs text-[#854d0e] sm:mt-3 sm:px-3.5 sm:py-3 sm:text-sm">
              {checkoutBanner}
            </p>
          ) : null}

          <div className="mt-2.5 space-y-2 sm:mt-5 sm:space-y-3">
            <button
              type="button"
              onClick={() => chooseMethod('stars')}
              className={`flex w-full flex-col gap-1.5 rounded-lg border px-3 py-2.5 sm:gap-2.5 sm:rounded-xl sm:px-4 sm:py-3.5 ${
                method === 'stars' ? 'border-[#ff2d78] ring-1 ring-[#ff2d78]' : 'border-[#d7dbe3] hover:border-[#b8becb]'
              }`}
            >
              <span className="flex w-full items-center gap-2.5 sm:gap-3">
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border sm:h-5 sm:w-5 ${
                    method === 'stars' ? 'border-[#ff2d78]' : 'border-[#c9ccd6]'
                  }`}
                >
                  {method === 'stars' ? <span className="h-2 w-2 rounded-full bg-[#ff2d78] sm:h-2.5 sm:w-2.5" /> : null}
                </span>
                <TelegramIcon />
                <MethodCopy
                  title="Credit / Debit Card"
                  subtitle={method === 'stars' ? formatAroundUsd(selectedStars) : 'Apple Pay, Google Pay, cards'}
                />
              </span>
              <WalletLogos />
            </button>

            {method === 'stars' ? (
              <>
                <p className="text-[12px] leading-snug text-[#1a1a1a] sm:text-[13px]">
                  You&apos;ll be redirected to Telegram app, to pay using Stars. If any trouble please email our support
                  team at{' '}
                  <a
                    href={`mailto:${HELLO_EMAIL}`}
                    className="font-medium text-[#1a1a1a] underline underline-offset-2"
                  >
                    {HELLO_EMAIL}
                  </a>
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
              </>
            ) : null}

            <button
              type="button"
              onClick={() => chooseMethod('crypto')}
              className={`flex w-full items-start gap-2.5 rounded-lg border px-3 py-2.5 sm:gap-3 sm:rounded-xl sm:px-4 sm:py-3.5 ${
                method === 'crypto' ? 'border-[#ff2d78] ring-1 ring-[#ff2d78]' : 'border-[#d7dbe3] hover:border-[#b8becb]'
              }`}
            >
              <span
                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border sm:mt-1 sm:h-5 sm:w-5 ${
                  method === 'crypto' ? 'border-[#ff2d78]' : 'border-[#c9ccd6]'
                }`}
              >
                {method === 'crypto' ? <span className="h-2 w-2 rounded-full bg-[#ff2d78] sm:h-2.5 sm:w-2.5" /> : null}
              </span>
              <span className="mt-0.5 shrink-0 sm:mt-1">
                <UsdtIcon />
              </span>
              <MethodCopy title="Crypto" subtitle="USDT TRC20" />
            </button>

            {method === 'crypto' ? (
              <>
                <p className="text-[12px] leading-snug text-[#1a1a1a] sm:text-[13px]">
                  You&apos;ll be redirected to NOWpayments secure checkout to pay with USDT TRC20. If any trouble please
                  email our support team at{' '}
                  <a
                    href={`mailto:${HELLO_EMAIL}`}
                    className="font-medium text-[#1a1a1a] underline underline-offset-2"
                  >
                    {HELLO_EMAIL}
                  </a>
                </p>
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
                    className="ml-1.5 text-[11px] font-medium text-[#ff2d78] underline underline-offset-2 hover:text-[#ff1a6b] sm:ml-2 sm:text-xs"
                  >
                    (Tutorial)
                  </a>
                </div>
              </>
            ) : null}
          </div>

          <div className="mt-2.5 flex items-start gap-2 text-[10px] leading-snug text-[#3d424d] sm:mt-5 sm:gap-2 sm:text-[11px]">
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
            <label htmlFor="checkout-no-minors" className="cursor-pointer">
              Using minor photos is strictly forbidden and will lead to instant account termination.
            </label>
          </div>
          {minorsNote ? (
            <p className="mt-1.5 text-[10px] leading-snug text-[#b42318] sm:text-[11px]">{minorsNote}</p>
          ) : null}

          <div className="mt-2 flex items-start gap-2 text-[10px] leading-snug text-[#3d424d] sm:mt-2.5 sm:gap-2 sm:text-[11px]">
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
            <label htmlFor="checkout-age-terms" className="cursor-pointer">
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
            <p className="mt-1.5 text-[10px] leading-snug text-[#b42318] sm:text-[11px]">{termsNote}</p>
          ) : null}

          <button
            ref={payButtonRef}
            type="button"
            disabled={buying}
            onClick={() => void startCheckout()}
            className="mt-3 inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff2d78] to-[#ff1a6b] px-4 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(255,45,120,0.35)] hover:from-[#ff4d8f] hover:to-[#ff2d78] disabled:cursor-not-allowed disabled:opacity-50 sm:mt-5 sm:min-h-12"
          >
            {payLabel}
            <LockIcon className="h-3.5 w-3.5" />
          </button>

          {paymentUrl ? (
            <a
              href={paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-[#ff2d78] px-4 text-sm font-semibold text-[#ff2d78] hover:bg-[#ff2d78]/5"
            >
              Open payment page
            </a>
          ) : null}

          <div className="mt-3 sm:mt-4">
            <TrustSignals />
          </div>

          <div className="mt-4 hidden justify-center lg:flex lg:mt-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/checkout/ssl-secure-badge.png"
              alt="Fully secured SSL checkout"
              className="h-11 w-auto"
              loading="lazy"
              decoding="async"
            />
          </div>

          {note ? <p className="mt-2 text-center text-xs text-[#b42318] sm:mt-3">{note}</p> : null}
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
    </div>
  );
}
