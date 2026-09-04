import { NextRequest, NextResponse } from 'next/server';
import { getCheckoutPlan } from '@/lib/payments/catalog';
import { creditDesires } from '@/lib/payments/fulfill';
import {
  answerPreCheckoutQuery,
  forwardNonSlutbotUpdateToErogram,
  notifyTelegramPaymentReceived,
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
    chat?: { id?: number };
    from?: { id?: number };
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
      if (payload.stars != null && payload.stars !== plan.starsAmount) {
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
        console.error('Telegram successful_payment missing plan or charge id', {
          plan: payload.plan,
          chargeId,
        });
        return NextResponse.json({ ok: false }, { status: 500 });
      }
      if (typeof payment.total_amount === 'number' && payment.total_amount !== plan.starsAmount) {
        console.error('Telegram paid amount does not match catalog Stars — still crediting pack', {
          plan: payload.plan,
          paid: payment.total_amount,
          expected: plan.starsAmount,
        });
      }

      try {
        const result = await creditDesires({
          clientId: payload.clientId,
          planId: payload.plan,
          provider: 'telegram_stars',
          chargeId,
          usdAmount: plan.usdPrice,
          starsAmount: plan.starsAmount,
        });
        if (!result.ok) {
          console.error('Telegram fulfill failed:', result.error);
          return NextResponse.json({ ok: false }, { status: 500 });
        }

        const chatId = update.message.chat?.id ?? update.message.from?.id;
        if (chatId && !result.already) {
          try {
            await notifyTelegramPaymentReceived(chatId, result.desires ?? plan.desires);
          } catch (err) {
            console.error('Could not send Telegram payment confirmation:', err);
          }
        }
      } catch (err) {
        console.error('Webhook fulfill error:', err);
        return NextResponse.json({ ok: false }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Webhook error:', err);
    return NextResponse.json({ ok: true });
  }
}
