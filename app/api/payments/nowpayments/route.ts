import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { SlutbotPayment } from '@/lib/models';
import { getCheckoutPlan } from '@/lib/payments/catalog';
import { applyCouponToUsd, couponRewardLabel } from '@/lib/coupons/pricing';
import { CRYPTO_MIN_USD, cryptoInvoiceUsd } from '@/lib/premiumPlans';
import { resolveCheckoutPriceCoupon } from '@/lib/coupons/store';
import { paymentAuthRequiredResponse, requireSlutbotUser } from '@/lib/payments/requireAuth';
import { getAppUrl } from '@/lib/site';

const API_KEY = process.env.NOWPAYMENTS_API_KEY || '';
const NP_BASE = 'https://api.nowpayments.io/v1';

export async function POST(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ message: 'Crypto payments are not configured.' }, { status: 503 });
  }

  const user = await requireSlutbotUser(req);
  if (!user) return paymentAuthRequiredResponse();

  const body = (await req.json().catch(() => null)) as {
    plan?: string;
    couponCode?: string;
  } | null;
  const planId = body?.plan?.trim() || '';
  const clientId = user.clientId;

  const plan = getCheckoutPlan(planId);
  if (!plan) {
    return NextResponse.json({ message: 'Invalid plan.' }, { status: 400 });
  }

  let coupon = null;
  if (body?.couponCode?.trim()) {
    try {
      coupon = await resolveCheckoutPriceCoupon({ code: body.couponCode, userId: user.id });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid coupon code.';
      return NextResponse.json({ message }, { status: 400 });
    }
  }

  const usdPrice = cryptoInvoiceUsd(applyCouponToUsd(plan.usdPrice, coupon));
  if (usdPrice < CRYPTO_MIN_USD) {
    return NextResponse.json(
      { message: `Crypto checkout is $${CRYPTO_MIN_USD.toFixed(2)} minimum.` },
      { status: 400 },
    );
  }
  const orderId = `sb1__${clientId}__${plan.id}__${Date.now()}`;
  const siteUrl = getAppUrl();

  try {
    const res = await fetch(`${NP_BASE}/invoice`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount: usdPrice,
        price_currency: 'usd',
        pay_currency: 'usdttrc20',
        order_id: orderId,
        order_description: coupon
          ? `${plan.description} · ${couponRewardLabel(coupon)} (${coupon.code})`
          : plan.description,
        ipn_callback_url: `${siteUrl}/api/payments/nowpayments/webhook`,
        success_url: `${siteUrl}/?payment=crypto_success`,
        cancel_url: `${siteUrl}/checkout?plan=${plan.id}&method=crypto`,
      }),
    });

    const data = (await res.json()) as { id?: string | number; invoice_url?: string; message?: string };

    if (!res.ok || !data.invoice_url) {
      console.error('NowPayments invoice error:', data);
      return NextResponse.json({ message: data?.message || 'Failed to create crypto invoice.' }, { status: 500 });
    }

    if (data.id != null) {
      await fetch(`${NP_BASE}/invoice-payment`, {
        method: 'POST',
        headers: {
          'x-api-key': API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ iid: data.id, pay_currency: 'usdttrc20' }),
      }).catch((err) => {
        console.error('NowPayments invoice-payment lock error:', err);
      });
    }

    await connectDB();
    await SlutbotPayment.create({
      clientId,
      userId: user.id,
      planId: plan.id,
      provider: 'nowpayments',
      status: 'pending',
      usdAmount: usdPrice,
      starsAmount: plan.starsAmount,
      // Coupon only reduces usdAmount. Wallet always gets full pack Stars.
      desires: plan.desires,
      orderId,
      invoiceUrl: data.invoice_url,
      couponCode: coupon?.code || '',
      couponType: coupon?.type || '',
      couponDiscountPercent: coupon?.discountPercent || 0,
      couponDiscountUsd: coupon?.discountUsd || 0,
    });

    return NextResponse.json({ url: data.invoice_url, usdAmount: usdPrice });
  } catch (err) {
    console.error('NowPayments error:', err);
    return NextResponse.json({ message: 'Server error.' }, { status: 500 });
  }
}
