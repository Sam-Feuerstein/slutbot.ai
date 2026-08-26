import type { StarsGeoRule } from './types';

export const DEFAULT_ROUND_UP_TO = 50;
export const MAX_DISCOUNT_PERCENT = 90;

export function clampRoundUpTo(value: number | null | undefined, fallback = DEFAULT_ROUND_UP_TO): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(500, Math.max(1, Math.round(n)));
}

export function roundStarsUp(stars: number, step: number): number {
  const size = clampRoundUpTo(step);
  const value = Math.max(1, stars);
  return Math.max(size, Math.ceil(value / size) * size);
}

/**
 * Convert catalog Stars into the amount to invoice for one country rule.
 * Discount never exceeds catalog. Custom Stars can be any positive integer.
 */
export function applyStarsGeoPrice(
  baseStars: number,
  planId: string,
  rule: StarsGeoRule | null,
  defaultRoundUpTo: number,
): number {
  const catalog = Math.max(1, Math.round(baseStars));
  if (!rule || !rule.enabled) return catalog;

  const step = clampRoundUpTo(rule.roundUpTo, defaultRoundUpTo);

  if (rule.mode === 'custom_stars') {
    const custom = Number(rule.customStars?.[planId]);
    if (Number.isFinite(custom) && custom >= 1) {
      return Math.max(1, Math.round(custom));
    }
    return catalog;
  }

  const pct = Math.min(MAX_DISCOUNT_PERCENT, Math.max(0, Number(rule.discountPercent) || 0));
  if (pct <= 0) return catalog;
  const discounted = (catalog * (100 - pct)) / 100;
  const rounded = roundStarsUp(discounted, step);
  return Math.min(catalog, rounded);
}
