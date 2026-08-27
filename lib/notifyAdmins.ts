import webpush from 'web-push';
import connectDB from '@/lib/db/mongodb';
import { envValue } from '@/lib/env';
import { AdminPushSubscription } from '@/lib/models';
import { getCheckoutPlan } from '@/lib/payments/catalog';
import { LEGAL_EMAIL } from '@/lib/site';

export type SaleNotificationPayload = {
  planId: string;
  method: 'stars' | 'crypto';
  username?: string;
  usd?: number;
};

function vapidKeys() {
  return {
    publicKey: envValue('VAPID_PUBLIC_KEY'),
    privateKey: envValue('VAPID_PRIVATE_KEY'),
  };
}

export function vapidPublicKey() {
  return vapidKeys().publicKey;
}

function ensureVapid() {
  const { publicKey, privateKey } = vapidKeys();
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(`mailto:${LEGAL_EMAIL}`, publicKey, privateKey);
  return true;
}

async function sendTelegramDM(text: string) {
  const bot = envValue('TELEGRAM_PAYMENT_BOT_TOKEN');
  const chat = envValue('ADMIN_TELEGRAM_CHAT_ID');
  if (!bot || !chat) return;
  try {
    await fetch(`https://api.telegram.org/bot${bot}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text, parse_mode: 'HTML' }),
    });
  } catch (err) {
    console.error('[notifyAdmins] Telegram DM failed:', err);
  }
}

async function sendPushToAdmins(notification: object) {
  if (!ensureVapid()) return;
  try {
    await connectDB();
    const subs = (await AdminPushSubscription.find({}).lean()) as unknown as Array<{
      endpoint: string;
      keys?: { p256dh?: string; auth?: string };
    }>;
    if (!subs.length) return;
    const payload = JSON.stringify(notification);
    await Promise.allSettled(
      subs.map(async (sub) => {
        if (!sub.keys?.p256dh || !sub.keys?.auth) return;
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
            payload,
          );
        } catch (err: unknown) {
          const status = err && typeof err === 'object' && 'statusCode' in err ? Number(err.statusCode) : 0;
          if (status === 404 || status === 410) {
            await AdminPushSubscription.deleteOne({ endpoint: sub.endpoint }).catch(() => {});
          }
        }
      }),
    );
  } catch (err) {
    console.error('[notifyAdmins] Error sending push notifications:', err);
  }
}

export function saleNotificationCopy(payload: SaleNotificationPayload) {
  const plan = getCheckoutPlan(payload.planId);
  const planLabel = plan?.label || payload.planId;
  const methodLabel = payload.method === 'stars' ? 'Stars' : 'Crypto';
  const userLabel = payload.username?.trim() || 'Guest';
  const usdLabel =
    typeof payload.usd === 'number' && payload.usd > 0
      ? ` · $${payload.usd % 1 === 0 ? payload.usd : payload.usd.toFixed(2)}`
      : '';
  return {
    planLabel,
    methodLabel,
    userLabel,
    body: `${planLabel}${usdLabel} · ${methodLabel} · ${userLabel}`,
  };
}

export async function notifyAdminsOfSale(payload: SaleNotificationPayload) {
  const copy = saleNotificationCopy(payload);
  await Promise.allSettled([
    sendPushToAdmins({
      title: 'New sale',
      body: copy.body,
      icon: '/icons/icon-192.png?v=3',
      badge: '/icons/icon-192.png?v=3',
      tag: 'aislutbot-sale',
      data: { url: '/admin' },
    }),
    sendTelegramDM(`<b>New sale</b>\n${copy.body}`),
  ]);
}
