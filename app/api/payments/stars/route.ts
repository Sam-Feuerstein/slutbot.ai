import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { SlutbotPayment } from '@/lib/models';
import { getCheckoutPlan } from '@/lib/payments/catalog';
import { paymentAuthRequiredResponse, requireSlutbotUser } from '@/lib/payments/requireAuth';
import { createStarsInvoiceLink, telegramPaymentBotConfigured } from '@/lib/payments/telegram';
import { countryFromHeaders } from '@/lib/starsGeo/detect';
import { isTelegramStarAmount, usdTelegramFromStars } from '@/lib/premiumPlans';

export async function POST(req: NextRequest) {
  if (!telegramPaymentBotConfigured()) {
    console.error('TELEGRAM_PAYMENT_BOT_TOKEN is not set — payments disabled to prevent routing money to wrong account');
    return NextResponse.json({ message: 'Payments are not configured. Contact admin.' }, { status: 503 });
  }

  const user = await requireSlutbotUser(req);
  if (!user) return paymentAuthRequiredResponse();

  const body = (await req.json().catch(() => null)) as { plan?: string } | null;
  const planId = body?.plan?.trim() || '';
  const clientId = user.clientId;

  const plan = getCheckoutPlan(planId);
  if (!plan) {
    return NextResponse.json({ message: 'Invalid plan' }, { status: 400 });
  }

  if (!isTelegramStarAmount(plan.starsAmount)) {
    return NextResponse.json({ message: 'Invalid plan' }, { status: 400 });
  }

  const starsAmount = plan.starsAmount;

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
      usdAmount: usdTelegramFromStars(starsAmount),
      starsAmount,
      desires: plan.desires,
      invoiceUrl: created.url,
      country: countryFromHeaders(req.headers),
    });

    return NextResponse.json({ url: created.url, starsAmount });
  } catch (err) {
    console.error('Payment error:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
