import { NextResponse } from 'next/server';
import { clearAllAuthCookies } from '@/lib/auth/sessionCookie';

/** Admin logout is a full sign-out — clears admin + site user + OAuth cookies. */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearAllAuthCookies(res);
  return res;
}
