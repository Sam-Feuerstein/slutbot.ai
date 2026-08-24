import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db/mongodb';
import { SlutbotPayment } from '@/lib/models';
import { getCheckoutPlan, isClientId } from '@/lib/payments/catalog';
import { createStarsInvoiceLink, telegramPaymentBotConfigured } from '@/lib/payments/telegram';

export async function POST(req: NextRequest) {
  if (!telegramPaymentBotConfigured()) {
    console.error('TELEGRAM_PAYMENT_BOT_TOKEN is not set — payments disabled to prevent routing money to wrong account');
    return NextResponse.json({ message: 'Payments are not configured. Contact admin.' }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as { plan?: string; clientId?: string } | null;
  const planId = body?.plan?.trim() || '';
  const clientId = body?.clientId?.trim() || '';
  if (!isClientId(clientId)) {
    return NextResponse.json({ message: 'Missing client id.' }, { status: 400 });
  }

  const plan = getCheckoutPlan(planId);
  if (!plan) {
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
      planId: plan.id,
      provider: 'telegram_stars',
      status: 'pending',
      usdAmount: plan.usdPrice,
      starsAmount,
      desires: plan.desires,
      invoiceUrl: created.url,
    });

    return NextResponse.json({ url: created.url });
  } catch (err) {
    console.error('Payment error:', err);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}
