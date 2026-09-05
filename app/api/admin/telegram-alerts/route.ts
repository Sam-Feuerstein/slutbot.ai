import { NextRequest, NextResponse } from 'next/server';
import { adminSessionOk } from '@/lib/auth/adminSession';
import { envValue } from '@/lib/env';
import { getTelegramBotIdentity } from '@/lib/payments/telegram';
import { getAdminTelegramChatId, setAdminTelegramChatId } from '@/lib/adminAlerts';

function botToken() {
  return envValue('TELEGRAM_PAYMENT_BOT_TOKEN');
}

async function botInfo(): Promise<{ username: string } | null> {
  const identity = await getTelegramBotIdentity();
  if ('error' in identity) return null;
  return { username: identity.username };
}

/** Status: is a chat ID saved, and what bot should the admin message. */
export async function GET(req: NextRequest) {
  if (!(await adminSessionOk(req))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  if (!botToken()) {
    return NextResponse.json({ configured: false, botConfigured: false });
  }
  const chatId = await getAdminTelegramChatId();
  const info = await botInfo();
  return NextResponse.json({
    configured: Boolean(chatId),
    botConfigured: true,
    chatId,
    botUsername: info?.username || '',
    botLink: info?.username ? `https://t.me/${info.username}` : '',
  });
}

type TgUpdate = {
  message?: { chat?: { id?: number; type?: string; first_name?: string; username?: string } };
};

/**
 * Auto-detect the admin chat ID: the admin taps the bot and sends any message,
 * then hits this. We read the most recent private chat from getUpdates and save it.
 */
export async function POST(req: NextRequest) {
  if (!(await adminSessionOk(req))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const token = botToken();
  if (!token) {
    return NextResponse.json({ message: 'Telegram bot token is not configured.' }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as { chatId?: string } | null;
  const manual = body?.chatId?.trim();

  if (manual) {
    if (!/^-?\d{3,20}$/.test(manual)) {
      return NextResponse.json({ message: 'Chat ID must be a number.' }, { status: 400 });
    }
    const saved = await setAdminTelegramChatId(manual);
    return NextResponse.json({ ok: true, chatId: saved });
  }

  // Auto-detect from recent messages to the bot.
  const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=20`, {
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => null)) as { ok?: boolean; result?: TgUpdate[] } | null;
  if (!data?.ok || !Array.isArray(data.result)) {
    return NextResponse.json({ message: 'Could not read Telegram updates. Try again.' }, { status: 502 });
  }

  const privateChats = data.result
    .map((u) => u.message?.chat)
    .filter((c): c is NonNullable<TgUpdate['message']>['chat'] => Boolean(c && c.type === 'private' && c.id));

  const latest = privateChats[privateChats.length - 1];
  if (!latest?.id) {
    return NextResponse.json(
      { message: 'No message found yet. Open the bot, tap Start or send any message, then try again.' },
      { status: 404 },
    );
  }

  const saved = await setAdminTelegramChatId(String(latest.id));
  const name = latest.first_name || latest.username || 'you';

  // Immediately confirm in the chat so the admin knows it worked.
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: latest.id,
      text: '✅ Sale alerts are now on for this chat. You will get a DM on every paid pack.',
    }),
  }).catch(() => {});

  return NextResponse.json({ ok: true, chatId: saved, name });
}

/** Send a test DM to the saved chat. */
export async function PUT(req: NextRequest) {
  if (!(await adminSessionOk(req))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  const token = botToken();
  if (!token) {
    return NextResponse.json({ message: 'Telegram bot token is not configured.' }, { status: 503 });
  }
  const chatId = await getAdminTelegramChatId();
  if (!chatId) {
    return NextResponse.json({ message: 'No chat linked yet. Connect Telegram first.' }, { status: 400 });
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      parse_mode: 'HTML',
      text: '<b>Test alert</b>\nAI SLUTBOT 1,500 Stars · $19.94 · Crypto · test',
    }),
  });
  const data = (await res.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
  if (!data?.ok) {
    return NextResponse.json(
      { message: data?.description || 'Telegram rejected the message. Re-link the chat.' },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true });
}

/** Unlink the chat. */
export async function DELETE(req: NextRequest) {
  if (!(await adminSessionOk(req))) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  await setAdminTelegramChatId('');
  return NextResponse.json({ ok: true });
}
