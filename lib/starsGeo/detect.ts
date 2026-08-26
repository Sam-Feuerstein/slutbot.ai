import { normalizeCountryCode } from './countries';

const HEADER_KEYS = [
  'x-vercel-ip-country',
  'cf-ipcountry',
  'cloudfront-viewer-country',
  'x-country-code',
  'x-appengine-country',
] as const;

function readHeader(headers: Headers, key: string): string {
  return headers.get(key)?.trim() || '';
}

/** Best-effort ISO country from CDN / edge headers. Empty if unknown. */
export function countryFromHeaders(headers: Headers): string {
  for (const key of HEADER_KEYS) {
    const raw = readHeader(headers, key);
    if (!raw || raw === 'XX' || raw === 'T1' || raw === 'ZZ') continue;
    const code = normalizeCountryCode(raw);
    if (code.length === 2) return code;
  }
  return '';
}
