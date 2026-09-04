export const SITE_DOMAIN = 'aislutbot.com';
export const SITE_URL = `https://${SITE_DOMAIN}`;
export const GENERATOR_PATH = '/ai-porn-generator';
export const EXPLORE_PATH = '/explore';
export const ACCOUNT_PATH = '/account';
export const ARCHIVE_PATH = '/archive';
export const GENERATOR_CANONICAL = `${SITE_URL}${GENERATOR_PATH}`;

/** Public contact addresses — always @aislutbot.com */
export const SUPPORT_EMAIL = 'support@aislutbot.com';
export const HELLO_EMAIL = 'hello@aislutbot.com';
export const LEGAL_EMAIL = 'legal@aislutbot.com';
export const OFFERS_EMAIL = 'offers@aislutbot.com';

export function generatorPresetPath(presetId: string): string {
  return `${GENERATOR_PATH}/${presetId}`;
}

export function generatorModePath(mode: 'image' | 'video', sampleId?: string): string {
  const params = new URLSearchParams({ mode });
  const id = sampleId?.trim();
  if (id) params.set('sample', id);
  return `${GENERATOR_PATH}?${params.toString()}`;
}

export function safeNextPath(path?: string | null): string {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return '/';
  return path;
}

export function loginHref(next?: string | null): string {
  return `/login?redirect=${encodeURIComponent(safeNextPath(next))}`;
}

export function checkoutHref(input?: {
  plan?: string;
  method?: string;
  /** Short machine code, e.g. low_balance — never put long sentences in the URL. */
  reason?: string;
}) {
  const params = new URLSearchParams({ plan: input?.plan?.trim() || 'flirt' });
  params.set('method', 'stars');
  const reason = input?.reason?.trim();
  if (reason) {
    // Keep codes short so login → checkout redirects stay readable.
    params.set('reason', reason.slice(0, 40));
  }
  return `/checkout?${params.toString()}`;
}

export function checkoutBannerCopy(reason?: string | null): string | null {
  const value = (reason || '').trim();
  if (!value) return null;
  if (value === 'unlock_preview') {
    return 'Pay for a pack to unlock your video. Stars land on your account right after payment.';
  }
  if (value === 'low_balance' || /available|required|more .+coins/i.test(value)) {
    return 'You’re out of Stars for this generation. Pick a pack below — Stars land on your account right after payment.';
  }
  if (value === 'sign_in') {
    return 'Sign in, then choose a pack. Stars are added to your account after payment.';
  }
  // Unknown short codes / legacy — keep only if it isn’t the old accounting dump.
  if (value.length <= 80 && !/\d+\s+available/i.test(value)) return value;
  return 'Pick a pack below to add Stars and keep generating.';
}

export function getAppUrl() {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || SITE_URL).trim().replace(/\/$/, '');
  if (!raw || /localhost|127\.0\.0\.1/i.test(raw)) return SITE_URL;
  return raw;
}
