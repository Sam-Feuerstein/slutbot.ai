import { NextRequest, NextResponse } from 'next/server';
import { authenticateSlutbotUser } from '@/lib/auth/slutbotAuth';
import { redeemCouponForUser } from '@/lib/coupons/store';

export async function POST(req: NextRequest) {
  const user = await authenticateSlutbotUser(req);
  if (!user) {
    return NextResponse.json({ message: 'Sign in required.' }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { code?: string } | null;
  try {
    const result = await redeemCouponForUser({ code: body?.code || '', userId: user.id });
    return NextResponse.json({
      message: `Added ${result.creditsGranted.toLocaleString('en-US')} Slutcoins.`,
      desires: result.desires,
      creditsGranted: result.creditsGranted,
      code: result.coupon.code,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Could not redeem coupon.';
    return NextResponse.json({ message }, { status: 400 });
  }
}
