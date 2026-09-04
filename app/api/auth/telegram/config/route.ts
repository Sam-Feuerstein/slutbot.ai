import { NextResponse } from 'next/server';
import {
  assertTelegramLoginBotAllowed,
  isTelegramLoginConfigured,
} from '@/lib/auth/telegramOAuth';
import { getTelegramBotIdentity } from '@/lib/payments/telegram';

export async function GET() {
  if (!isTelegramLoginConfigured()) {
    return NextResponse.json({ enabled: false }, { status: 503 });
  }

  try {
    await assertTelegramLoginBotAllowed();
    const identity = await getTelegramBotIdentity();
    if ('error' in identity) {
      return NextResponse.json({ enabled: false, message: identity.error }, { status: 503 });
    }
    return NextResponse.json({
      enabled: true,
      botUsername: identity.username,
      authUrl: `${process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'https://aislutbot.com'}/api/auth/telegram/callback`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Telegram sign-in is not configured.';
    return NextResponse.json({ enabled: false, message }, { status: 503 });
  }
}
