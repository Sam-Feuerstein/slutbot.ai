'use client';

import { useEffect } from 'react';
import { clearAuthSession, getAuthEpoch, SIGNED_IN_KEY } from '@/lib/auth/session';
import { clearUserProfile, readCachedUserProfile } from '@/lib/auth/profile';
import { refreshDesiresFromServer } from '@/lib/desires';
import { identifyPosthogUser } from '@/lib/posthog';
import { getImageToVideoClientId } from '@/app/tool/clientId';
import { tryRestoreSessionFromCookie } from '@/lib/auth/syncSession';

/**
 * Keeps wallet + profile in sync with the httpOnly session cookie.
 * Never auto-bootstraps an admin app user — that was re-signing people
 * in right after logout whenever an admin cookie was still present.
 */
export default function SessionSync() {
  useEffect(() => {
    let cancelled = false;
    const epoch = getAuthEpoch();

    void (async () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }

      const restored = await tryRestoreSessionFromCookie(epoch);
      if (cancelled || epoch !== getAuthEpoch()) return;

      if (!restored) {
        clearAuthSession();
        clearUserProfile();
      } else {
        const profile = readCachedUserProfile();
        if (profile?.email) {
          identifyPosthogUser(getImageToVideoClientId(), {
            email: profile.email,
            name: profile.name || '',
          });
        }
      }

      if (!cancelled && epoch === getAuthEpoch()) {
        await refreshDesiresFromServer();
      }
    })();

    const onStorage = (event: StorageEvent) => {
      if (event.key !== SIGNED_IN_KEY || event.newValue) return;
      clearAuthSession();
      clearUserProfile();
    };
    window.addEventListener('storage', onStorage);

    return () => {
      cancelled = true;
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  return null;
}
