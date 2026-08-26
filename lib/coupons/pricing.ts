import { MAX_DISCOUNT_PERCENT, roundStarsUp } from '@/lib/starsGeo/pricing';
import { starsFromUsd, usdFromStars } from '@/lib/premiumPlans';
import type { PriceCoupon } from './types';

export { MAX_DISCOUNT_PERCENT };

/** Country 20% + coupon 10% = 30% off catalog. Never above 90%. */
export function stackedDiscountPercent(geoPercent: number, couponPercent: number): number {
  const geo = Math.max(0, Number(geoPercent) || 0);
  const extra = Math.max(0, Number(couponPercent) || 0);
  return Math.min(MAX_DISCOUNT_PERCENT, geo + extra);
}

export function impliedGeoPercent(catalogStars: number, geoStars: number): number {
  const catalog = Math.max(1, Math.round(catalogStars));
  const geo = Math.max(1, Math.round(geoStars));
  if (geo >= catalog) return 0;
  return ((catalog - geo) / catalog) * 100;
}

export function applyPercentOffStars(catalogStars: number, percent: number, roundUpTo: number): number {
  const catalog = Math.max(1, Math.round(catalogStars));
  const pct = Math.min(MAX_DISCOUNT_PERCENT, Math.max(0, Number(percent) || 0));
  if (pct <= 0) return catalog;
  const discounted = (catalog * (100 - pct)) / 100;
  return Math.min(catalog, roundStarsUp(discounted, roundUpTo));
}

export function applyCouponToStars(input: {
  catalogStars: number;
  geoStars: number;
  coupon: PriceCoupon | null;
  roundUpTo: number;
}): number {
  const catalog = Math.max(1, Math.round(input.catalogStars));
  const geo = Math.min(catalog, Math.max(1, Math.round(input.geoStars)));
  if (!input.coupon) return geo;

  if (input.coupon.type === 'amount_off') {
    const off = Math.max(0, Number(input.coupon.discountUsd) || 0);
    if (off <= 0) return geo;
    const nextUsd = Math.max(usdFromStars(1), usdFromStars(geo) - off);
    const nextStars = roundStarsUp(starsFromUsd(nextUsd), input.roundUpTo);
    return Math.min(geo, Math.max(1, nextStars));
  }

  const total = stackedDiscountPercent(impliedGeoPercent(catalog, geo), input.coupon.discountPercent);
  return applyPercentOffStars(catalog, total, input.roundUpTo);
}

export function applyCouponToUsd(catalogUsd: number, coupon: PriceCoupon | null): number {
  const price = Math.max(0, Number(catalogUsd) || 0);
  if (!coupon) return Math.round(price * 100) / 100;

  if (coupon.type === 'amount_off') {
    const off = Math.max(0, Number(coupon.discountUsd) || 0);
    return Math.round(Math.max(0.5, price - off) * 100) / 100;
  }

  const pct = Math.min(MAX_DISCOUNT_PERCENT, Math.max(0, Number(coupon.discountPercent) || 0));
  if (pct <= 0) return Math.round(price * 100) / 100;
  return Math.round(price * (100 - pct)) / 100;
}

export function couponRewardLabel(coupon: {
  type: string;
  discountPercent?: number;
  discountUsd?: number;
  creditsAmount?: number;
}): string {
  if (coupon.type === 'amount_off') {
    const usd = Number(coupon.discountUsd) || 0;
    return `$${usd.toFixed(2)} off`;
  }
  if (coupon.type === 'credits') {
    return `${Math.round(Number(coupon.creditsAmount) || 0).toLocaleString('en-US')} Slutcoins`;
  }
  return `${Math.round(Number(coupon.discountPercent) || 0)}% off`;
}
