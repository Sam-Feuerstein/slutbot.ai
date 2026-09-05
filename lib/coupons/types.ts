export type CouponType = 'percent_off' | 'amount_off' | 'credits' | 'crypto_discount';

export type PriceCoupon = {
  code: string;
  type: 'percent_off' | 'amount_off';
  discountPercent: number;
  discountUsd: number;
};

export type Coupon = {
  id: string;
  code: string;
  label: string;
  type: CouponType;
  creditsAmount: number;
  discountPercent: number;
  discountUsd: number;
  enabled: boolean;
  newUsersOnly: boolean;
  oncePerUser: boolean;
  maxRedemptions: number | null;
  redemptionCount: number;
  expiresAt: string | null;
  note: string;
  createdAt: string;
  updatedAt: string;
};

export type CouponInput = {
  code: string;
  label?: string;
  type?: CouponType;
  creditsAmount?: number;
  discountPercent?: number;
  discountUsd?: number;
  enabled?: boolean;
  newUsersOnly?: boolean;
  oncePerUser?: boolean;
  maxRedemptions?: number | null;
  expiresAt?: string | null;
  note?: string;
};

export function normalizeCouponCode(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '');
}

/** Crypto launch coupon — 25% off the three highest packs only. */
export const EROGRAM_CRYPTO_COUPON_CODE = 'EROGRAM25OFF';
const EROGRAM_CRYPTO_COUPON_ALIASES = ['EROGRAM30OFF'] as const;
export const EROGRAM_CRYPTO_COUPON_PLAN_IDS = ['desire', 'passion', 'legend'] as const;

export function isErogramCryptoCoupon(code: string | undefined | null): boolean {
  const normalized = normalizeCouponCode(code || '');
  return (
    normalized === EROGRAM_CRYPTO_COUPON_CODE ||
    (EROGRAM_CRYPTO_COUPON_ALIASES as readonly string[]).includes(normalized)
  );
}

export function couponLookupCode(code: string): string {
  const normalized = normalizeCouponCode(code);
  return isErogramCryptoCoupon(normalized) ? EROGRAM_CRYPTO_COUPON_CODE : normalized;
}

export function couponAppliesToPlan(code: string | undefined | null, planId: string): boolean {
  if (!code) return false;
  if (!isErogramCryptoCoupon(code)) return true;
  return (EROGRAM_CRYPTO_COUPON_PLAN_IDS as readonly string[]).includes(planId);
}

export function isPriceCouponType(type?: string | null): type is 'percent_off' | 'amount_off' | 'crypto_discount' {
  return type === 'percent_off' || type === 'amount_off' || type === 'crypto_discount';
}

export function asPriceCouponType(type?: string | null): 'percent_off' | 'amount_off' {
  return type === 'amount_off' ? 'amount_off' : 'percent_off';
}
