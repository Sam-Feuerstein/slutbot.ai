import { NextRequest, NextResponse } from 'next/server';
import { loginHref, safeNextPath } from '@/lib/site';
import { TELEGRAM_OAUTH_STATE_COOKIE } from '@/lib/auth/sessionCookie';
import {
  assertTelegramLoginBotAllowed,
  buildTelegramAuthUrl,
  isTelegramLoginConfigured,
  signTelegramOAuthState,
} from '@/lib/auth/telegramOAuth';
import { clientIp, rateLimitAllowed } from '@/lib/rateLimit';

function oauthErrorRedirect(message: string, origin: string, redirect = '/') {
  const url = new URL(loginHref(redirect), origin);
  url.searchParams.set('error', message);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const redirect = safeNextPath(req.nextUrl.searchParams.get('redirect'));

  if (!rateLimitAllowed({ name: 'telegram-login', key: clientIp(req), windowMs: 15 * 60_000, max: 20 })) {
    return oauthErrorRedirect('Too many sign-in attempts. Try again later.', origin, redirect);
  }

  if (!isTelegramLoginConfigured()) {
    return oauthErrorRedirect('Telegram sign-in is not configured.', origin, redirect);
  }

  try {
    await assertTelegramLoginBotAllowed();
    const url = buildTelegramAuthUrl(origin);
    const response = NextResponse.redirect(url);
    response.cookies.set(TELEGRAM_OAUTH_STATE_COOKIE, signTelegramOAuthState(redirect), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 10,
      path: '/',
    });
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Telegram sign-in failed. Please try again.';
    console.error('Telegram OAuth start error:', err);
    return oauthErrorRedirect(message, origin, redirect);
  }
}
