export const SITE_DOMAIN = 'aislutbot.com';
export const SITE_URL = `https://${SITE_DOMAIN}`;
export const GENERATOR_PATH = '/ai-porn-generator';
export const ACCOUNT_PATH = '/account';
export const GENERATOR_CANONICAL = `${SITE_URL}${GENERATOR_PATH}`;

/** Public contact addresses — always @aislutbot.com */
export const SUPPORT_EMAIL = 'support@aislutbot.com';
export const HELLO_EMAIL = 'hello@aislutbot.com';
export const LEGAL_EMAIL = 'legal@aislutbot.com';
export const OFFERS_EMAIL = 'offers@aislutbot.com';

export function generatorPresetPath(presetId: string): string {
  return `${GENERATOR_PATH}/${presetId}`;
}

export function safeNextPath(path?: string | null): string {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return '/';
  return path;
}

export function loginHref(next?: string | null): string {
  return `/login?redirect=${encodeURIComponent(safeNextPath(next))}`;
}

export function checkoutHref(input?: { plan?: string; method?: string; reason?: string }) {
  const params = new URLSearchParams({ plan: input?.plan?.trim() || 'flirt' });
  if (input?.method === 'crypto' || input?.method === 'stars') {
    params.set('method', input.method);
  }
  if (input?.reason?.trim()) {
    params.set('reason', input.reason.trim());
  }
  return `/checkout?${params.toString()}`;
}

export function getAppUrl() {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || SITE_URL).trim().replace(/\/$/, '');
  if (!raw || /localhost|127\.0\.0\.1/i.test(raw)) return SITE_URL;
  return raw;
}
