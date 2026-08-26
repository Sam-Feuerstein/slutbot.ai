import { NextRequest, NextResponse } from 'next/server';
import { authenticateSlutbotUser } from '@/lib/auth/slutbotAuth';
import { resolveCheckoutPriceCoupon } from '@/lib/coupons/store';
import { couponRewardLabel } from '@/lib/coupons/pricing';

export async function POST(req: NextRequest) {
  const user = await authenticateSlutbotUser(req);
  if (!user) return NextResponse.json({ message: 'Sign in required.' }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { code?: string } | null;
  try {
    const coupon = await resolveCheckoutPriceCoupon({ code: body?.code || '', userId: user.id });
    return NextResponse.json({
      code: coupon.code,
      type: coupon.type,
      discountPercent: coupon.discountPercent,
      discountUsd: coupon.discountUsd,
      label: couponRewardLabel(coupon),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid coupon code.';
    return NextResponse.json({ message }, { status: 400 });
  }
}
