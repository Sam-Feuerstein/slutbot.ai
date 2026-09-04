import { countryFromHeaders } from '@/lib/starsGeo/detect';
import { normalizeCountryCode } from '@/lib/starsGeo/countries';
import { envValue } from '@/lib/env';

/**
 * High-income country allowlist (legacy trial geo). Trial grants are disabled;
 * generation requires paid Stars for every country.
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

/**
 * Southern / Eastern Europe for the signup trial.
 * LatAm, Asia, Africa, and Turkey are not included.
 */
export const TIER2_COUNTRIES = new Set([
  'ES',
  'IT',
  'PT',
  'GR',
  'CY',
  'MT',
  'CZ',
  'PL',
  'SK',
  'SI',
  'HU',
  'HR',
  'EE',
  'LV',
  'LT',
  'RO',
  'BG',
]);

export function isTier2Country(code?: string | null): boolean {
  const normalized = normalizeCountryCode(code || '');
  return normalized.length === 2 && TIER2_COUNTRIES.has(normalized);
}

/** Countries that receive signup trial credits (T1 + T2). */
export function isTrialEligibleCountry(code?: string | null): boolean {
  return isTier1Country(code) || isTier2Country(code);
}

/** CDN country in production. Local/dev can override with TRIAL_DEV_COUNTRY (default US). */
export function resolveRequestCountry(headers: Headers): string {
  const fromHeaders = countryFromHeaders(headers);
  if (fromHeaders) return fromHeaders;
  if (process.env.NODE_ENV === 'production') return '';
  const dev = normalizeCountryCode(envValue('TRIAL_DEV_COUNTRY') || 'US');
  return dev.length === 2 ? dev : 'US';
}
