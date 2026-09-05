export type AccountTier = 'free' | 'paid' | 'ultra';

export const VIEW_AS_KEY = 'slutbot-admin-view-as';
export const VIEW_AS_CHANGED_EVENT = 'slutbot:view-as-changed';

export function isAccountTier(value: string | null | undefined): value is AccountTier {
  return value === 'free' || value === 'paid' || value === 'ultra';
}

export function readViewAsTier(): AccountTier | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(VIEW_AS_KEY);
  return isAccountTier(raw) ? raw : null;
}

export function writeViewAsTier(tier: AccountTier) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(VIEW_AS_KEY, tier);
  window.dispatchEvent(new CustomEvent(VIEW_AS_CHANGED_EVENT, { detail: tier }));
}

export function effectiveAccountTier(realTier: AccountTier, preview: AccountTier | null, canPreview: boolean): AccountTier {
  if (canPreview && preview) return preview;
  return realTier;
}
