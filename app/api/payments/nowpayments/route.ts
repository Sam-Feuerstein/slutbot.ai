import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { SlutbotPayment } from '@/lib/models';
import { getCheckoutPlan } from '@/lib/payments/catalog';
import { paymentAuthRequiredResponse, requireSlutbotUser } from '@/lib/payments/requireAuth';
import { cryptoUsdForStars, isCryptoAvailableForStars } from '@/lib/premiumPlans';
import { getAppUrl } from '@/lib/site';
import { countryFromHeaders } from '@/lib/starsGeo/detect';

const API_KEY = process.env.NOWPAYMENTS_API_KEY || '';
const NP_BASE = 'https://api.nowpayments.io/v1';

export async function POST(req: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json({ message: 'Crypto payments are not configured.' }, { status: 503 });
  }

  const user = await requireSlutbotUser(req);
  if (!user) return paymentAuthRequiredResponse();

  const body = (await req.json().catch(() => null)) as { plan?: string } | null;
  const planId = body?.plan?.trim() || '';
  const clientId = user.clientId;

  const plan = getCheckoutPlan(planId);
  if (!plan) {
    return NextResponse.json({ message: 'Invalid plan.' }, { status: 400 });
  }

  if (!isCryptoAvailableForStars(plan.starsAmount)) {
    return NextResponse.json(
      { message: 'This pack is card-only. Pick a larger pack to pay with crypto.' },
      { status: 400 },
    );
  }

  // Crypto price matches the Telegram Stars USD value exactly — no discount, no coupon.
  const usdPrice = cryptoUsdForStars(plan.starsAmount);
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
        order_description: plan.description,
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
      desires: plan.desires,
      orderId,
      invoiceUrl: data.invoice_url,
      country: countryFromHeaders(req.headers),
    });

    return NextResponse.json({ url: data.invoice_url, usdAmount: usdPrice });
  } catch (err) {
    console.error('NowPayments error:', err);
    return NextResponse.json({ message: 'Server error.' }, { status: 500 });
  }
}
