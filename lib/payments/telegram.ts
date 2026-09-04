import { envValue } from '@/lib/env';
import { GENERATOR_PATH, getAppUrl } from '@/lib/site';
import { isTelegramStarAmount } from '@/lib/premiumPlans';

/** Never point this app's webhook at these bots — they belong to Erogram. */
const BLOCKED_BOT_USERNAMES = new Set(['erogramvipbot']);

function botToken() {
  return envValue('TELEGRAM_PAYMENT_BOT_TOKEN');
}

function webhookSecret() {
  return envValue('TELEGRAM_WEBHOOK_SECRET');
}

export function slutbotStarsWebhookUrl() {
  return `${getAppUrl()}/api/payments/webhook`;
}

export function isBlockedErogramBot(username?: string | null) {
  const name = (username || '').trim().replace(/^@/, '').toLowerCase();
  return Boolean(name) && BLOCKED_BOT_USERNAMES.has(name);
}

type InvoicePayload = {
  source: 'slutbot';
  clientId: string;
  plan: string;
  stars?: number;
};

export function parseSlutbotPayload(raw: string): InvoicePayload | null {
  try {
    const parsed = JSON.parse(raw) as Partial<InvoicePayload>;
    if (parsed.source !== 'slutbot') return null;
    if (!parsed.clientId || !parsed.plan) return null;
    const stars = Number(parsed.stars);
    return {
      source: 'slutbot',
      clientId: parsed.clientId,
      plan: parsed.plan,
      stars: Number.isFinite(stars) && stars >= 1 ? Math.round(stars) : undefined,
    };
  } catch {
    return null;
  }
}

export async function sendTelegramText(chatId: number, text: string) {
  const token = botToken();
  if (!token || !Number.isFinite(chatId)) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });
}

export async function notifyTelegramPaymentReceived(chatId: number, stars: number) {
  const url = `${getAppUrl()}${GENERATOR_PATH}`;
  const amount = Math.max(0, Math.round(stars)).toLocaleString('en-US');
  await sendTelegramText(
    chatId,
    `Payment received. ${amount} Stars were added to your AI SLUTBOT wallet.\n\nOpen the app:\n${url}`,
  );
}

export async function answerPreCheckoutQuery(id: string, ok: boolean, errorMessage?: string) {
  const token = botToken();
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/answerPreCheckoutQuery`, {
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
  if (!botToken()) {
    return { error: 'Payments are not configured. Contact admin.' };
  }

  const identity = await getTelegramBotIdentity();
  if ('error' in identity) {
    return { error: identity.error };
  }
  if (isBlockedErogramBot(identity.username)) {
    return {
      error: 'Stars checkout needs a dedicated AI SLUTBOT bot. The Erogram bot token is blocked.',
    };
  }

  const starsAmount = Math.round(input.starsAmount);
  if (!isTelegramStarAmount(starsAmount)) {
    return { error: 'This pack is not a Telegram Stars payment option. Open checkout again.' };
  }

  const res = await fetch(`https://api.telegram.org/bot${botToken()}/createInvoiceLink`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: input.label,
      description: input.description,
      payload: JSON.stringify({
        source: 'slutbot',
        clientId: input.clientId,
        plan: input.planId,
        stars: starsAmount,
      } satisfies InvoicePayload),
      currency: 'XTR',
      prices: [{ label: input.label, amount: starsAmount }],
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
  const target = (envValue('EROGRAM_PAYMENTS_WEBHOOK_URL') || '').replace(/\/$/, '');
  if (!target) return;
  await fetch(target, {
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
  return webhookSecret();
}

export function telegramPaymentBotConfigured(): boolean {
  return Boolean(botToken());
}

type TelegramApiResult<T> = { ok: boolean; result?: T; description?: string };

async function telegramApi<T>(method: string, body?: Record<string, unknown>): Promise<TelegramApiResult<T>> {
  const token = botToken();
  if (!token) return { ok: false, description: 'TELEGRAM_PAYMENT_BOT_TOKEN is missing.' };
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return (await res.json()) as TelegramApiResult<T>;
}

export async function getTelegramBotIdentity(): Promise<{ username: string; id: number } | { error: string }> {
  const data = await telegramApi<{ username?: string; id?: number }>('getMe');
  if (!data.ok || !data.result?.username || !data.result.id) {
    return { error: data.description || 'Could not read bot identity.' };
  }
  return { username: data.result.username, id: data.result.id };
}

export async function getTelegramWebhookInfo(): Promise<{
  url: string;
  pendingUpdateCount: number;
  lastErrorMessage: string;
} | { error: string }> {
  const data = await telegramApi<{
    url?: string;
    pending_update_count?: number;
    last_error_message?: string;
  }>('getWebhookInfo');
  if (!data.ok || !data.result) {
    return { error: data.description || 'Could not read webhook.' };
  }
  return {
    url: data.result.url || '',
    pendingUpdateCount: data.result.pending_update_count || 0,
    lastErrorMessage: data.result.last_error_message || '',
  };
}

export async function setSlutbotTelegramWebhook(): Promise<
  | { ok: true; username: string; url: string }
  | { ok: false; error: string }
> {
  const identity = await getTelegramBotIdentity();
  if ('error' in identity) return { ok: false, error: identity.error };
  if (isBlockedErogramBot(identity.username)) {
    return {
      ok: false,
      error: `@${identity.username} is the Erogram bot. Put a NEW AI SLUTBOT bot token in TELEGRAM_PAYMENT_BOT_TOKEN. Erogramx is not touched.`,
    };
  }

  const secret = webhookSecret();
  if (!secret) return { ok: false, error: 'TELEGRAM_WEBHOOK_SECRET is missing.' };
  if (!/^[A-Za-z0-9_-]{1,256}$/.test(secret)) {
    return {
      ok: false,
      error: 'TELEGRAM_WEBHOOK_SECRET must be 1–256 letters, numbers, _ or - (Telegram rule).',
    };
  }

  const url = slutbotStarsWebhookUrl();
  const data = await telegramApi<true>('setWebhook', {
    url,
    secret_token: secret,
    allowed_updates: ['message', 'pre_checkout_query'],
    drop_pending_updates: false,
  });
  if (!data.ok) {
    return { ok: false, error: data.description || 'setWebhook failed.' };
  }
  return { ok: true, username: identity.username, url };
}
