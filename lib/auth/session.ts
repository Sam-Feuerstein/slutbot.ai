import { clearUserProfile } from '@/lib/auth/profile';
import { resetPosthog } from '@/lib/posthog';

export const TOKEN_KEY = 'token';
export const USER_CLIENT_KEY = 'slutbot-user-client-id';
export const SIGNED_IN_KEY = 'slutbot-signed-in';

/** Bumped on sign-out so in-flight /api/auth/me syncs cannot restore the session. */
let authEpoch = 0;

export function getAuthEpoch(): number {
  return authEpoch;
}

export function bumpAuthEpoch(): number {
  authEpoch += 1;
  return authEpoch;
}

export function storeAuthSession(input: { clientId: string; token?: string }) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SIGNED_IN_KEY, '1');
  localStorage.setItem(USER_CLIENT_KEY, input.clientId);
  localStorage.removeItem(TOKEN_KEY);
}

export function clearAuthSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SIGNED_IN_KEY);
  localStorage.removeItem(USER_CLIENT_KEY);
  clearUserProfile();
}

export async function signOutClient() {
  if (typeof window === 'undefined') return;
  bumpAuthEpoch();
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  } catch {
    /* still clear local state */
  }
  clearAuthSession();
  localStorage.removeItem('slutbot-desires');
  localStorage.removeItem('slutbot-desires-server');
  localStorage.removeItem('slutbot-trial-credits');
  window.dispatchEvent(new CustomEvent('slutbot:desires-updated'));
  resetPosthog();
}

export function isSignedIn(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SIGNED_IN_KEY) === '1';
}

/** Presence of an httpOnly session — never a JWT. */
export function getStoredAuthToken(): string | null {
  return isSignedIn() ? 'cookie' : null;
}
