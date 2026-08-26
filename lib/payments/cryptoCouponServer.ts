import { resolveCheckoutPriceCoupon } from '@/lib/coupons/store';
import type { PriceCoupon } from '@/lib/coupons/types';

export async function resolveCheckoutCouponAsync(
  code: string,
  userId?: string | null,
): Promise<PriceCoupon | null> {
  try {
    return await resolveCheckoutPriceCoupon({ code, userId });
  } catch {
    return null;
  }
}

export async function validateCryptoCouponAsync(input: {
  code?: string;
  userId?: string | null;
}): Promise<boolean> {
  return Boolean(await resolveCheckoutCouponAsync(input.code || '', input.userId));
}
