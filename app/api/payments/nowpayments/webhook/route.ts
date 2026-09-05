import { NextRequest, NextResponse } from 'next/server';
import { verifyNowPaymentsSignature } from '@/lib/payments/nowpaymentsSignature';
import { creditDesires } from '@/lib/payments/fulfill';
import { getCheckoutPlan } from '@/lib/payments/catalog';

const IPN_SECRET = process.env.NOWPAYMENTS_IPN_SECRET || '';

export async function POST(req: NextRequest) {
  if (!IPN_SECRET) {
    console.error('NOWPAYMENTS_IPN_SECRET not set — rejecting webhook');
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const sig = req.headers.get('x-nowpayments-sig');
  if (!verifyNowPaymentsSignature(body, sig, IPN_SECRET)) {
    console.error('NowPayments webhook: invalid signature');
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const paymentStatus = String(body.payment_status ?? '');
  if (paymentStatus !== 'finished' && paymentStatus !== 'confirmed') {
    return NextResponse.json({ ok: true });
  }

  const payCurrency = String(body.pay_currency ?? '').toLowerCase();
  if (payCurrency !== 'usdttrc20') {
    console.error('NowPayments webhook: ignored non-USDT-TRC20 payment', {
      payCurrency,
      orderId: body.order_id,
      paymentId: body.payment_id,
    });
    return NextResponse.json({ ok: true });
  }

  const orderId = String(body.order_id ?? '');
  const paymentId = String(body.payment_id ?? '');
  const parts = orderId.split('__');
  if (parts[0] !== 'sb1' || parts.length < 4 || !paymentId) {
    return NextResponse.json({ ok: true });
  }

  const clientId = parts[1];
  const planId = parts[2];
  const plan = getCheckoutPlan(planId);
  if (!plan) {
    return NextResponse.json({ ok: false, error: 'Unknown plan' }, { status: 400 });
  }

  const priceAmount = Number(body.price_amount);
  const usdAmount =
    Number.isFinite(priceAmount) && priceAmount > 0 ? priceAmount : plan.usdPrice;

  const result = await creditDesires({
    clientId,
    planId,
    provider: 'nowpayments',
    chargeId: paymentId,
    orderId,
    usdAmount,
    starsAmount: plan.starsAmount,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
