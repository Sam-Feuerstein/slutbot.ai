import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ADMIN_COOKIE, adminCookieOptions } from '@/lib/auth/adminSession';

export const USER_SESSION_COOKIE = 'slutbot-session';
export const OAUTH_LOGIN_COOKIE = 'slutbot_oauth_login';
const MAX_AGE_SEC = 60 * 60 * 24 * 30;

export function sessionCookieOptions(clear = false) {
  return {
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: clear ? 0 : MAX_AGE_SEC,
  };
}

export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(USER_SESSION_COOKIE, token, sessionCookieOptions());
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(USER_SESSION_COOKIE, '', sessionCookieOptions(true));
}

export function clearOAuthLoginCookie(res: NextResponse) {
  res.cookies.set(OAUTH_LOGIN_COOKIE, '', sessionCookieOptions(true));
}

export function clearAdminSessionCookie(res: NextResponse) {
  res.cookies.set(ADMIN_COOKIE, '', adminCookieOptions(true));
}

/** Wipe every auth cookie so logout cannot be undone by a stale admin or OAuth handoff. */
export function clearAllAuthCookies(res: NextResponse) {
  clearSessionCookie(res);
  clearOAuthLoginCookie(res);
  clearAdminSessionCookie(res);
}

export function sessionTokenFromRequest(req: NextRequest): string | null {
  return req.cookies.get(USER_SESSION_COOKIE)?.value?.trim() || null;
}
