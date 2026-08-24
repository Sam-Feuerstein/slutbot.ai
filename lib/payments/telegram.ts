const BOT_TOKEN = process.env.TELEGRAM_PAYMENT_BOT_TOKEN || '';
const EROGRAM_WEBHOOK = (process.env.EROGRAM_PAYMENTS_WEBHOOK_URL || 'https://erogram.pro/api/payments/webhook').replace(
  /\/$/,
  '',
);
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';

type InvoicePayload = {
  source: 'slutbot';
  clientId: string;
  plan: string;
};

export function parseSlutbotPayload(raw: string): InvoicePayload | null {
  try {
    const parsed = JSON.parse(raw) as Partial<InvoicePayload>;
    if (parsed.source !== 'slutbot') return null;
    if (!parsed.clientId || !parsed.plan) return null;
    return { source: 'slutbot', clientId: parsed.clientId, plan: parsed.plan };
  } catch {
    return null;
  }
}

export async function answerPreCheckoutQuery(id: string, ok: boolean, errorMessage?: string) {
  if (!BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pre_checkout_query_id: id,
      ok,
      ...(errorMessage ? { error_message: errorMessage } : {}),
    }),
  });
}

export async function createStarsInvoiceLink(input: {
  label: string;
  description: string;
  clientId: string;
  planId: string;
  starsAmount: number;
}): Promise<{ url?: string; error?: string; telegram?: unknown }> {
  if (!BOT_TOKEN) {
    return { error: 'Payments are not configured. Contact admin.' };
  }

  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: input.label,
      description: input.description,
      payload: JSON.stringify({
        source: 'slutbot',
        clientId: input.clientId,
        plan: input.planId,
      } satisfies InvoicePayload),
      currency: 'XTR',
      prices: [{ label: input.label, amount: input.starsAmount }],
    }),
  });

  const data = (await res.json()) as { ok?: boolean; result?: string; description?: string };
  if (!data.ok || !data.result) {
    return { error: 'Failed to create invoice', telegram: data };
  }
  return { url: data.result };
}

/** Keep Erogram VIP working if this app ever receives the shared bot webhook. */
export async function forwardNonSlutbotUpdateToErogram(update: unknown, secret: string | null) {
  if (!EROGRAM_WEBHOOK) return;
  await fetch(EROGRAM_WEBHOOK, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { 'x-telegram-bot-api-secret-token': secret } : {}),
      'x-slutbot-forward': 'erogram',
    },
    body: JSON.stringify(update),
  });
}

export function telegramWebhookSecret(): string {
  return WEBHOOK_SECRET;
}

export function telegramPaymentBotConfigured(): boolean {
  return Boolean(BOT_TOKEN);
}
