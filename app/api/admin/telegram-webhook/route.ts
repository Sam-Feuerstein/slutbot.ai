import { NextRequest, NextResponse } from 'next/server';
import { adminSessionOk } from '@/lib/auth/adminSession';
import {
  getTelegramBotIdentity,
  getTelegramWebhookInfo,
  isBlockedErogramBot,
  setSlutbotTelegramWebhook,
  slutbotStarsWebhookUrl,
  telegramPaymentBotConfigured,
} from '@/lib/payments/telegram';

export async function GET(req: NextRequest) {
  if (!(await adminSessionOk(req))) {
    return NextResponse.json({ message: 'Admin login required.' }, { status: 401 });
  }

  const configured = telegramPaymentBotConfigured();
  const targetUrl = slutbotStarsWebhookUrl();
  if (!configured) {
    return NextResponse.json({
      configured: false,
      blocked: false,
      username: '',
      webhookUrl: '',
      targetUrl,
      webhookIsOurs: false,
    });
  }

  const identity = await getTelegramBotIdentity();
  const hook = await getTelegramWebhookInfo();
  const username = 'username' in identity ? identity.username : '';
  const webhookUrl = 'url' in hook ? hook.url : '';
  const blocked = isBlockedErogramBot(username);

  return NextResponse.json({
    configured: true,
    blocked,
    username,
    webhookUrl,
    targetUrl,
    webhookIsOurs: Boolean(webhookUrl) && webhookUrl === targetUrl,
    identityError: 'error' in identity ? identity.error : '',
    webhookError: 'error' in hook ? hook.error : '',
    lastErrorMessage: 'lastErrorMessage' in hook ? hook.lastErrorMessage : '',
  });
}

export async function POST(req: NextRequest) {
  if (!(await adminSessionOk(req))) {
    return NextResponse.json({ message: 'Admin login required.' }, { status: 401 });
  }

  const result = await setSlutbotTelegramWebhook();
  if (!result.ok) {
    return NextResponse.json({ message: result.error }, { status: 400 });
  }
  return NextResponse.json({
    ok: true,
    username: result.username,
    url: result.url,
  });
}
