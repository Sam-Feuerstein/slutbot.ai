import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { SlutbotPayment } from '@/lib/models';
import { getCheckoutPlan } from '@/lib/payments/catalog';
import { paymentAuthRequiredResponse, requireSlutbotUser } from '@/lib/payments/requireAuth';
import { createStarsInvoiceLink, telegramPaymentBotConfigured } from '@/lib/payments/telegram';
import { countryFromHeaders } from '@/lib/starsGeo/detect';
import { resolveCheckoutPriceCoupon } from '@/lib/coupons/store';
import { applyCouponToStars } from '@/lib/coupons/pricing';
import { usdListFromStars } from '@/lib/premiumPlans';
import { isCryptoCouponCode } from '@/lib/payments/cryptoCoupon';

export async function POST(req: NextRequest) {
  if (!telegramPaymentBotConfigured()) {
    console.error('TELEGRAM_PAYMENT_BOT_TOKEN is not set — payments disabled to prevent routing money to wrong account');
    return NextResponse.json({ message: 'Payments are not configured. Contact admin.' }, { status: 503 });
  }

  const user = await requireSlutbotUser(req);
  if (!user) return paymentAuthRequiredResponse();

  const body = (await req.json().catch(() => null)) as { plan?: string; couponCode?: string } | null;
  const planId = body?.plan?.trim() || '';
  const clientId = user.clientId;

  const plan = getCheckoutPlan(planId);
  if (!plan) {
    return NextResponse.json({ message: 'Invalid plan' }, { status: 400 });
  }

  let coupon = null;
  if (body?.couponCode?.trim()) {
    if (isCryptoCouponCode(body.couponCode)) {
      return NextResponse.json(
        { message: 'This coupon only works with USDT crypto payment.' },
        { status: 400 },
      );
    }
    try {
      coupon = await resolveCheckoutPriceCoupon({ code: body.couponCode, userId: user.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid coupon code.';
      return NextResponse.json({ message }, { status: 400 });
    }
  }

  const starsAmount = applyCouponToStars({
    catalogStars: plan.starsAmount,
    geoStars: plan.starsAmount,
    coupon,
    roundUpTo: 1,
  });

  try {
    const created = await createStarsInvoiceLink({
      label: plan.label,
      description: plan.description,
      clientId,
      planId: plan.id,
      starsAmount,
    });

    if (!created.url) {
      console.error('Telegram createInvoiceLink failed:', created.telegram);
      return NextResponse.json({ message: 'Failed to create invoice' }, { status: 500 });
    }

    await connectDB();
    await SlutbotPayment.create({
      clientId,
      userId: user.id,
      planId: plan.id,
      provider: 'telegram_stars',
      status: 'pending',
      usdAmount: usdListFromStars(starsAmount),
      starsAmount,
      // Invoice starsAmount can be discounted. Wallet always gets full pack Stars.
      desires: plan.desires,
      invoiceUrl: created.url,
      country: countryFromHeaders(req.headers),
      couponCode: coupon?.code || '',
      couponType: coupon?.type || '',
      couponDiscountPercent: coupon?.discountPercent || 0,
      couponDiscountUsd: coupon?.discountUsd || 0,
    });

    return NextResponse.json({ url: created.url, starsAmount });
  } catch (err) {
    console.error('Payment error:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
