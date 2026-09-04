import { NextRequest, NextResponse } from 'next/server';
import { loginHref, safeNextPath } from '@/lib/site';
import { OAUTH_LOGIN_COOKIE, TELEGRAM_OAUTH_STATE_COOKIE } from '@/lib/auth/sessionCookie';
import { signSlutbotToken } from '@/lib/auth/slutbotAuth';
import {
  findOrCreateTelegramUser,
  isTelegramLoginConfigured,
  normalizeTelegramLoginParams,
  parseTelegramAuthResult,
  parseTelegramOAuthState,
  verifyTelegramLoginAuth,
} from '@/lib/auth/telegramOAuth';
import { resolveRequestCountry } from '@/lib/geo/tier1';
import { clientIp, rateLimitAllowed } from '@/lib/rateLimit';

function oauthError(message: string, origin: string, redirect = '/', respondWithJson = false) {
  if (respondWithJson) {
    return NextResponse.json({ message }, { status: 400 });
  }
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

function readRedirect(req: NextRequest, bodyRedirect?: string | null) {
  if (bodyRedirect) return safeNextPath(bodyRedirect);
  const parsedState = parseTelegramOAuthState(req.cookies.get(TELEGRAM_OAUTH_STATE_COOKIE)?.value || null);
  return safeNextPath(parsedState?.redirect);
}

async function readTelegramParams(
  req: NextRequest,
): Promise<{ params: Record<string, string> | null; redirect?: string }> {
  const query = normalizeTelegramLoginParams(req.nextUrl.searchParams);
  if (query) return { params: query };

  if (req.method === 'GET') return { params: null };

  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const body = (await req.json().catch(() => null)) as {
      tgAuthResult?: string;
      params?: Record<string, string | number>;
      redirect?: string;
    } | null;
    if (body?.params) {
      const normalized = normalizeTelegramLoginParams(body.params);
      if (normalized) return { params: normalized, redirect: body.redirect };
    }
    if (body?.tgAuthResult) {
      return { params: parseTelegramAuthResult(body.tgAuthResult), redirect: body.redirect };
    }
    return { params: null, redirect: body?.redirect };
  }

  const form = await req.formData().catch(() => null);
  if (!form) return { params: null };

  const tgAuthResult = form.get('tgAuthResult');
  if (typeof tgAuthResult === 'string' && tgAuthResult.trim()) {
    return { params: parseTelegramAuthResult(tgAuthResult) };
  }

  const fields: Record<string, string> = {};
  form.forEach((value, key) => {
    if (typeof value === 'string' && value) fields[key] = value;
  });
  return { params: normalizeTelegramLoginParams(fields) };
}

async function finishTelegramLogin(
  req: NextRequest,
  params: Record<string, string> | null,
  respondWithJson = false,
  redirectOverride?: string,
) {
  const origin = req.nextUrl.origin;
  const redirect = redirectOverride ?? readRedirect(req);

  if (!rateLimitAllowed({ name: 'telegram-login-callback', key: clientIp(req), windowMs: 15 * 60_000, max: 30 })) {
    const denied = oauthError('Too many sign-in attempts. Try again later.', origin, redirect, respondWithJson);
    clearStateCookie(denied);
    return denied;
  }

  if (!isTelegramLoginConfigured()) {
    const denied = oauthError('Telegram sign-in is not configured.', origin, redirect, respondWithJson);
    clearStateCookie(denied);
    return denied;
  }

  const profile = params ? verifyTelegramLoginAuth(params) : null;
  if (!profile) {
    console.error('Telegram login verify failed', {
      hasParams: Boolean(params),
      keys: params ? Object.keys(params) : [],
    });
    const denied = oauthError('Telegram sign-in was cancelled or expired.', origin, redirect, respondWithJson);
    clearStateCookie(denied);
    return denied;
  }

  try {
    const user = await findOrCreateTelegramUser(profile, resolveRequestCountry(req.headers), clientIp(req));
    const token = signSlutbotToken(String(user._id));

    const completeUrl = new URL('/login/oauth-complete', origin);
    completeUrl.searchParams.set('redirect', redirect);

    if (respondWithJson) {
      const response = NextResponse.json({ redirect: `${completeUrl.pathname}${completeUrl.search}` });
      clearStateCookie(response);
      response.cookies.set(OAUTH_LOGIN_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60,
        path: '/',
      });
      return response;
    }

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
    const denied = oauthError(message, origin, redirect, respondWithJson);
    clearStateCookie(denied);
    return denied;
  }
}

export async function GET(req: NextRequest) {
  const { params } = await readTelegramParams(req);
  return finishTelegramLogin(req, params);
}

export async function POST(req: NextRequest) {
  const { params, redirect } = await readTelegramParams(req);
  const respondWithJson = (req.headers.get('content-type') || '').includes('application/json');
  return finishTelegramLogin(req, params, respondWithJson, redirect);
}
