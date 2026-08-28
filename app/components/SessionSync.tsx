'use client';

import { useEffect } from 'react';
import { clearAuthSession, getAuthEpoch, storeAuthSession } from '@/lib/auth/session';
import { cacheUserProfile, clearUserProfile } from '@/lib/auth/profile';
import { refreshDesiresFromServer } from '@/lib/desires';
import { identifyPosthogUser } from '@/lib/posthog';
import { getImageToVideoClientId } from '@/app/tool/clientId';

/**
 * Keeps wallet + profile in sync with the httpOnly session cookie.
 * Does NOT auto-bootstrap an admin app user — that was re-signing people
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

      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (cancelled || epoch !== getAuthEpoch()) return;

        if (res.ok) {
          const data = (await res.json()) as {
            email?: string;
            name?: string;
            avatarUrl?: string;
            clientId?: string;
          };
          if (cancelled || epoch !== getAuthEpoch()) return;

          if (data.clientId) storeAuthSession({ clientId: data.clientId });
          if (data.email) {
            cacheUserProfile({
              email: data.email,
              name: data.name || '',
              avatarUrl: data.avatarUrl || '',
            });
            identifyPosthogUser(getImageToVideoClientId(), {
              email: data.email,
              name: data.name || '',
            });
          }
        } else {
          clearAuthSession();
          clearUserProfile();
        }
      } catch {
        /* offline — keep session flag */
      }

      if (!cancelled && epoch === getAuthEpoch()) {
        await refreshDesiresFromServer();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
