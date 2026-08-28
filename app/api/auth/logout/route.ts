import { NextResponse } from 'next/server';
import { clearAllAuthCookies } from '@/lib/auth/sessionCookie';

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearAllAuthCookies(res);
  return res;
}
