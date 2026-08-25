import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_COOKIE, adminCookieOptions, createAdminToken, adminCredentialsOk } from '@/lib/auth/adminSession';

export async function POST(req: NextRequest) {
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
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, adminCookieOptions());
  return res;
}
