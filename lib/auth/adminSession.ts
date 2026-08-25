import { NextRequest } from 'next/server';

export const ADMIN_COOKIE = 'slutbot-admin';
const MAX_AGE_SEC = 60 * 60 * 12;

function secret() {
  return process.env.JWT_SECRET || process.env.ADMIN_PASSWORD || 'admin-session';
}

function toBase64Url(bytes: Uint8Array) {
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(padded);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmac(message: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return toBase64Url(new Uint8Array(sig));
}

function safeEq(a: string, b: string) {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i];
  return diff === 0;
}

export async function createAdminToken() {
  const body = toBase64Url(
    new TextEncoder().encode(JSON.stringify({ r: 'admin', e: Date.now() + MAX_AGE_SEC * 1000 })),
  );
  const sig = await hmac(body);
  return `${body}.${sig}`;
}

export async function verifyAdminToken(token?: string | null) {
  if (!token || !token.includes('.')) return false;
  const [body, sig] = token.split('.');
  const expected = await hmac(body);
  if (!safeEq(expected, sig)) return false;
  try {
    const json = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as { r?: string; e?: number };
    return json.r === 'admin' && typeof json.e === 'number' && json.e > Date.now();
  } catch {
    return false;
  }
}

export function adminCookieOptions(clear = false) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: clear ? 0 : MAX_AGE_SEC,
  };
}

export async function adminSessionOk(req: NextRequest) {
  return verifyAdminToken(req.cookies.get(ADMIN_COOKIE)?.value);
}

export function adminCredentialsOk(username: string, password: string) {
  const expectedUser = process.env.ADMIN_USERNAME || '';
  const expectedPass = process.env.ADMIN_PASSWORD || '';
  if (!expectedUser || !expectedPass) return false;
  return safeEq(username.trim(), expectedUser) && safeEq(password, expectedPass);
}
