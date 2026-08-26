import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, adminCookieOptions, createAdminToken, adminCredentialsOk } from '@/lib/auth/adminSession';
import { ensureAdminAppUser } from '@/lib/auth/adminUser';
import { setSessionCookie } from '@/lib/auth/sessionCookie';
import { clientIp, rateLimitAllowed } from '@/lib/rateLimit';

export async function POST(req: NextRequest) {
  if (!rateLimitAllowed({ name: 'admin-login', key: clientIp(req), windowMs: 15 * 60_000, max: 5 })) {
    return NextResponse.json({ message: 'Too many login attempts. Try again later.' }, { status: 429 });
  }

  let body: { username?: string; password?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ message: 'Invalid login.' }, { status: 400 });
  }

  if (!adminCredentialsOk(body.username || '', body.password || '')) {
    return NextResponse.json({ message: 'Wrong login or password.' }, { status: 401 });
  }

  const token = await createAdminToken();
  let appUser: Awaited<ReturnType<typeof ensureAdminAppUser>> | null = null;
  try {
    appUser = await ensureAdminAppUser();
  } catch (err) {
    console.error('Admin login: could not ensure app user:', err);
  }

  const res = NextResponse.json({
    ok: true,
    isAdmin: true,
    ...(appUser
      ? {
          clientId: appUser.clientId,
          email: appUser.email,
          name: appUser.name,
          desires: appUser.desires,
        }
      : {}),
  });
  res.cookies.set(ADMIN_COOKIE, token, adminCookieOptions());
  if (appUser) setSessionCookie(res, appUser.token);
  return res;
}
