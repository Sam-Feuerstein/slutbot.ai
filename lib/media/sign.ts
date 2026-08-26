import { createHmac, timingSafeEqual } from 'crypto';
import { requireJwtSecret } from '@/lib/auth/secrets';
import { getAppUrl } from '@/lib/site';

export const USER_UPLOAD_PREFIX = 'image-to-video/';
const DEFAULT_TTL_SEC = 15 * 60;

export function isUserUploadKey(key: string): boolean {
  return Boolean(key) && key.startsWith(USER_UPLOAD_PREFIX) && !key.includes('..') && !key.includes('\\');
}

export function signMediaKey(key: string, ttlSec = DEFAULT_TTL_SEC) {
  if (!isUserUploadKey(key)) {
    throw new Error('Invalid media key.');
  }
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const sig = createHmac('sha256', requireJwtSecret()).update(`${key}:${exp}`).digest('base64url');
  return { key, exp, sig };
}

export function mediaSourcePath(key: string) {
  const { exp, sig } = signMediaKey(key);
  const params = new URLSearchParams({ key, exp: String(exp), sig });
  return `/api/media/source?${params.toString()}`;
}

export function absoluteMediaUrl(key: string) {
  return `${getAppUrl()}${mediaSourcePath(key)}`;
}

export function verifyMediaSignature(key: string, exp: number, sig: string): boolean {
  if (!isUserUploadKey(key) || !sig) return false;
  if (!Number.isFinite(exp) || exp * 1000 < Date.now()) return false;
  const expected = createHmac('sha256', requireJwtSecret()).update(`${key}:${exp}`).digest('base64url');
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** URL WaveSpeed's servers can fetch. Never put WAVESPEED_API_KEY on this URL. */
export function wavespeedFetchUrl(key: string): string {
  if (!isUserUploadKey(key)) {
    throw new Error('Invalid media key.');
  }
  const app = getAppUrl();
  const publicBase = (
    process.env.R2_UPLOAD_PUBLIC_URL ||
    process.env.NEXT_PUBLIC_PRESET_MEDIA_BASE ||
    process.env.R2_PUBLIC_URL ||
    ''
  ).replace(/\/$/, '');
  if (/localhost|127\.0\.0\.1/.test(app) && publicBase) {
    return `${publicBase}/${key}`;
  }
  return absoluteMediaUrl(key);
}

export function displayMediaUrl(stored: string): string {
  const key = stored.startsWith('r2:') ? stored.slice(3) : stored;
  if (isUserUploadKey(key)) return mediaSourcePath(key);
  return stored;
}
