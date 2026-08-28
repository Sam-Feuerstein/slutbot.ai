import { CRYPTO_DISCOUNT_PERCENT, cryptoInvoiceUsd, cryptoUsdPrice } from '@/lib/premiumPlans';
import type { PriceCoupon } from '@/lib/coupons/types';

export const CRYPTO_COUPON_CODE = 'I-DESERVE-IT483';
/** Display loop length for the checkout countdown (evergreen — resets visually). */
export const CRYPTO_COUPON_DURATION_MS = 14 * 60 * 1000;
export const CRYPTO_COUPON_APPLIED_KEY = 'slutbot-crypto-coupon-applied';
export const CHECKOUT_COUPON_KEY = 'slutbot-checkout-coupon';

export function normalizeCryptoCouponCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '');
}

export function resolveCheckoutCoupon(code: string): PriceCoupon | null {
  const normalized = normalizeCryptoCouponCode(code);
  if (normalized === CRYPTO_COUPON_CODE) {
    return {
      code: CRYPTO_COUPON_CODE,
      type: 'percent_off',
      discountPercent: CRYPTO_DISCOUNT_PERCENT,
      discountUsd: 0,
    };
  }
  return null;
}

export function isCryptoCouponCode(value: string): boolean {
  return Boolean(resolveCheckoutCoupon(value));
}

export function validateCryptoCoupon(input: { code?: string }): boolean {
  return Boolean(resolveCheckoutCoupon(input.code || ''));
}

export function cryptoCheckoutUsd(usd: number, discountApplied: boolean): number {
  return cryptoInvoiceUsd(discountApplied ? cryptoUsdPrice(usd) : usd);
}

export function formatCouponCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function isCouponOfferDisplayExpired(secondsLeft: number): boolean {
  return secondsLeft <= 0;
}

export { CRYPTO_DISCOUNT_PERCENT };
