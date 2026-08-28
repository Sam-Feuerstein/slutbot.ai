import { countryFromHeaders } from '@/lib/starsGeo/detect';
import { normalizeCountryCode } from '@/lib/starsGeo/countries';
import { envValue } from '@/lib/env';

/**
 * High-income allowlist for the free trial. Everyone else (including unknown)
 * pays for Stars with no trial grant.
 */
export const TIER1_COUNTRIES = new Set([
  'US',
  'CA',
  'GB',
  'IE',
  'FR',
  'DE',
  'NL',
  'BE',
  'LU',
  'AT',
  'CH',
  'LI',
  'SE',
  'NO',
  'DK',
  'FI',
  'IS',
  'AU',
  'NZ',
  'JP',
  'KR',
  'SG',
  'HK',
  'TW',
  'IL',
  'AE',
  'QA',
  'KW',
  'BH',
  'SA',
  'MC',
  'AD',
]);

export function isTier1Country(code?: string | null): boolean {
  const normalized = normalizeCountryCode(code || '');
  return normalized.length === 2 && TIER1_COUNTRIES.has(normalized);
}

/** CDN country in production. Local/dev can override with TRIAL_DEV_COUNTRY (default US). */
export function resolveRequestCountry(headers: Headers): string {
  const fromHeaders = countryFromHeaders(headers);
  if (fromHeaders) return fromHeaders;
  if (process.env.NODE_ENV === 'production') return '';
  const dev = normalizeCountryCode(envValue('TRIAL_DEV_COUNTRY') || 'US');
  return dev.length === 2 ? dev : 'US';
}
