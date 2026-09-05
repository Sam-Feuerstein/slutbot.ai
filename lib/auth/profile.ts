import { getAuthEpoch, isSignedIn } from '@/lib/auth/session';
import { isTelegramPlaceholderEmail } from '@/lib/auth/signInMethod';

export type UserProfile = {
  name: string;
  email: string;
  avatarUrl?: string;
};

const PROFILE_KEY = 'slutbot-user-profile';
export const AUTH_CHANGED_EVENT = 'slutbot:auth-changed';

export function displayName(profile: Pick<UserProfile, 'name' | 'email'>): string {
  const name = profile.name?.trim();
  if (name) return name;
  const email = profile.email?.trim();
  if (!email || isTelegramPlaceholderEmail(email)) return 'Account';
  const local = email.split('@')[0]?.trim();
  return local || 'Account';
}

export function profileInitial(profile: Pick<UserProfile, 'name' | 'email'>): string {
  const label = displayName(profile);
  const char = label.charAt(0).toUpperCase();
  return /[A-Z0-9]/i.test(char) ? char : '?';
}

export function cacheUserProfile(profile: UserProfile) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT));
}

export function readCachedUserProfile(): UserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as UserProfile;
    if (!data?.email) return null;
    return {
      name: data.name || '',
      email: data.email,
      avatarUrl: data.avatarUrl || '',
    };
  } catch {
    return null;
  }
}

export function clearUserProfile() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PROFILE_KEY);
  window.dispatchEvent(new CustomEvent(AUTH_CHANGED_EVENT));
}

export async function fetchUserProfile(): Promise<(UserProfile & { isAdmin?: boolean }) | null> {
  const epoch = getAuthEpoch();
  if (!isSignedIn()) return null;

  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (epoch !== getAuthEpoch() || !isSignedIn() || !res.ok) return null;
    const data = (await res.json()) as UserProfile & { isAdmin?: boolean };
    if (epoch !== getAuthEpoch() || !isSignedIn() || !data.email) return null;
    const profile: UserProfile = {
      name: data.name || '',
      email: data.email,
      avatarUrl: data.avatarUrl || '',
    };
    cacheUserProfile(profile);
    return { ...profile, isAdmin: Boolean(data.isAdmin) };
  } catch {
    return readCachedUserProfile();
  }
}
