import { NextResponse } from 'next/server';
import { telegramPaymentBotConfigured } from '@/lib/payments/telegram';

export async function GET() {
  return NextResponse.json({
    nowpayments: Boolean(process.env.NOWPAYMENTS_API_KEY),
    telegram: telegramPaymentBotConfigured(),
    webhookForward: Boolean(process.env.EROGRAM_PAYMENTS_WEBHOOK_URL),
    source: 'erogram-env',
  });
}
