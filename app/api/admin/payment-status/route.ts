import { NextRequest, NextResponse } from 'next/server';
import { adminSessionOk } from '@/lib/auth/adminSession';
import { telegramPaymentBotConfigured } from '@/lib/payments/telegram';

export async function GET(req: NextRequest) {
  if (!(await adminSessionOk(req))) {
    return NextResponse.json({ message: 'Admin login required.' }, { status: 401 });
  }

  return NextResponse.json({
    nowpayments: Boolean(process.env.NOWPAYMENTS_API_KEY),
    telegram: telegramPaymentBotConfigured(),
    webhookForward: Boolean(process.env.EROGRAM_PAYMENTS_WEBHOOK_URL),
    source: 'erogram-env',
  });
}
