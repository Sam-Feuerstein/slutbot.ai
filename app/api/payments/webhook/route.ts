import { NextRequest, NextResponse } from 'next/server';
import { getCheckoutPlan } from '@/lib/payments/catalog';
import { creditDesires } from '@/lib/payments/fulfill';
import {
  answerPreCheckoutQuery,
  forwardNonSlutbotUpdateToErogram,
  parseSlutbotPayload,
  telegramWebhookSecret,
} from '@/lib/payments/telegram';

type TelegramUpdate = {
  pre_checkout_query?: {
    id: string;
    invoice_payload?: string;
    total_amount?: number;
  };
  message?: {
    text?: string;
    successful_payment?: {
      invoice_payload?: string;
      total_amount?: number;
      telegram_payment_charge_id?: string;
      provider_payment_charge_id?: string;
    };
  };
};

export async function POST(req: NextRequest) {
  try {
    const secret = telegramWebhookSecret();
    if (!secret) {
      console.error('TELEGRAM_WEBHOOK_SECRET not set — blocking all webhook requests');
      return NextResponse.json({ ok: false }, { status: 503 });
    }

    const headerSecret = req.headers.get('x-telegram-bot-api-secret-token');
    if (headerSecret !== secret) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }

    const update = (await req.json()) as TelegramUpdate;
    const fromErogram = req.headers.get('x-erogram-forward') === 'slutbot';

    if (update.message?.text && !update.message?.successful_payment) {
      return NextResponse.json({ ok: true });
    }

    if (update.pre_checkout_query) {
      const query = update.pre_checkout_query;
      const payload = parseSlutbotPayload(query.invoice_payload || '');
      if (!payload) {
        if (!fromErogram) {
          await forwardNonSlutbotUpdateToErogram(update, headerSecret);
        }
        return NextResponse.json({ ok: true });
      }

      const plan = getCheckoutPlan(payload.plan);
      if (!plan) {
        await answerPreCheckoutQuery(query.id, false, 'Invalid payment data');
        return NextResponse.json({ ok: true });
      }
      if (typeof query.total_amount === 'number' && query.total_amount !== plan.starsAmount) {
        await answerPreCheckoutQuery(query.id, false, 'This pack price changed. Open checkout again.');
        return NextResponse.json({ ok: true });
      }

      await answerPreCheckoutQuery(query.id, true);
      return NextResponse.json({ ok: true });
    }

    if (update.message?.successful_payment) {
      const payment = update.message.successful_payment;
      const payload = parseSlutbotPayload(payment.invoice_payload || '');
      if (!payload) {
        if (!fromErogram) {
          await forwardNonSlutbotUpdateToErogram(update, headerSecret);
        }
        return NextResponse.json({ ok: true });
      }

      const plan = getCheckoutPlan(payload.plan);
      const chargeId = payment.provider_payment_charge_id || payment.telegram_payment_charge_id || '';
      if (!plan || !chargeId) {
        return NextResponse.json({ ok: true });
      }

      await creditDesires({
        clientId: payload.clientId,
        planId: payload.plan,
        provider: 'telegram_stars',
        chargeId,
        usdAmount: plan.usdPrice,
        starsAmount: payment.total_amount ?? 0,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ ok: true });
  }
}
