export const SITE_DOMAIN = 'aislutbot.com';
export const SITE_URL = `https://${SITE_DOMAIN}`;
export const GENERATOR_PATH = '/ai-porn-generator';
export const GENERATOR_CANONICAL = `${SITE_URL}${GENERATOR_PATH}`;

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

export function getAppUrl() {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || SITE_URL).trim();
  return raw.replace(/\/$/, '') || SITE_URL;
}
