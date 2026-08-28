import { cacheUserProfile } from '@/lib/auth/profile';
import { getAuthEpoch, isSessionRestoreBlocked, storeAuthSession } from '@/lib/auth/session';

type MePayload = {
  email?: string;
  name?: string;
  avatarUrl?: string;
  clientId?: string;
};

/** Restore local signed-in state from the httpOnly session cookie. Respects sign-out epoch. */
export async function tryRestoreSessionFromCookie(epoch = getAuthEpoch()): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (isSessionRestoreBlocked()) return false;
  if (epoch !== getAuthEpoch()) return false;

  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (epoch !== getAuthEpoch()) return false;
    if (!res.ok) return false;

    const data = (await res.json()) as MePayload;
    if (epoch !== getAuthEpoch()) return false;

    if (data.clientId) storeAuthSession({ clientId: data.clientId });
    if (data.email) {
      cacheUserProfile({
        email: data.email,
        name: data.name || '',
        avatarUrl: data.avatarUrl || '',
      });
    }
    return Boolean(data.clientId);
  } catch {
    return false;
  }
}
