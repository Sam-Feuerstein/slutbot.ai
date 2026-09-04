import { NextRequest, NextResponse } from 'next/server';
import { loginHref, safeNextPath } from '@/lib/site';
import { OAUTH_LOGIN_COOKIE, TELEGRAM_OAUTH_STATE_COOKIE } from '@/lib/auth/sessionCookie';
import { signSlutbotToken } from '@/lib/auth/slutbotAuth';
import {
  findOrCreateTelegramUser,
  isTelegramLoginConfigured,
  parseTelegramOAuthState,
  verifyTelegramLoginAuth,
} from '@/lib/auth/telegramOAuth';
import { resolveRequestCountry } from '@/lib/geo/tier1';
import { clientIp, rateLimitAllowed } from '@/lib/rateLimit';

function oauthErrorRedirect(message: string, origin: string, redirect = '/') {
  const url = new URL(loginHref(redirect), origin);
  url.searchParams.set('error', message);
  return NextResponse.redirect(url);
}

function clearStateCookie(response: NextResponse) {
  response.cookies.set(TELEGRAM_OAUTH_STATE_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
}

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const parsedState = parseTelegramOAuthState(req.cookies.get(TELEGRAM_OAUTH_STATE_COOKIE)?.value || null);
  const redirect = safeNextPath(parsedState?.redirect);

  if (!rateLimitAllowed({ name: 'telegram-login-callback', key: clientIp(req), windowMs: 15 * 60_000, max: 30 })) {
    const denied = oauthErrorRedirect('Too many sign-in attempts. Try again later.', origin, redirect);
    clearStateCookie(denied);
    return denied;
  }

  if (!isTelegramLoginConfigured()) {
    const denied = oauthErrorRedirect('Telegram sign-in is not configured.', origin, redirect);
    clearStateCookie(denied);
    return denied;
  }

  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const profile = verifyTelegramLoginAuth(params);
  if (!profile) {
    const denied = oauthErrorRedirect('Telegram sign-in was cancelled or expired.', origin, redirect);
    clearStateCookie(denied);
    return denied;
  }

  try {
    const user = await findOrCreateTelegramUser(profile, resolveRequestCountry(req.headers), clientIp(req));
    const token = signSlutbotToken(String(user._id));

    const completeUrl = new URL('/login/oauth-complete', origin);
    completeUrl.searchParams.set('redirect', redirect);

    const response = NextResponse.redirect(completeUrl);
    clearStateCookie(response);
    response.cookies.set(OAUTH_LOGIN_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60,
      path: '/',
    });
    return response;
  } catch (err) {
    console.error('Telegram OAuth callback error:', err);
    const message = err instanceof Error && err.message === 'This account is banned.'
      ? 'This account is banned.'
      : 'Telegram sign-in failed. Please try again.';
    const denied = oauthErrorRedirect(message, origin, redirect);
    clearStateCookie(denied);
    return denied;
  }
}
