'use client';

import { useEffect } from 'react';
import { clearAuthSession, storeAuthSession } from '@/lib/auth/session';
import { cacheUserProfile, clearUserProfile } from '@/lib/auth/profile';
import { refreshDesiresFromServer, setDesires } from '@/lib/desires';
import { identifyPosthogUser } from '@/lib/posthog';
import { getImageToVideoClientId } from '@/app/tool/clientId';

async function bootstrapAdminAppSession(): Promise<boolean> {
  try {
    const res = await fetch('/api/admin/bootstrap-user', { credentials: 'include' });
    if (!res.ok) return false;
    const data = (await res.json()) as {
      clientId?: string;
      email?: string;
      name?: string;
      desires?: number;
    };
    if (!data.clientId) return false;
    storeAuthSession({ clientId: data.clientId });
    cacheUserProfile({
      email: data.email || '',
      name: data.name || 'Admin',
      avatarUrl: '',
    });
    if (typeof data.desires === 'number') setDesires(data.desires);
    identifyPosthogUser(getImageToVideoClientId(), {
      email: data.email || '',
      name: data.name || 'Admin',
      is_admin: true,
    });
    return true;
  } catch {
    return false;
  }
}

/** Keeps wallet balance in sync with the server and clears invalid auth sessions. */
export default function SessionSync() {
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
      }

      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        if (res.ok && !cancelled) {
          const data = (await res.json()) as {
            email?: string;
            name?: string;
            avatarUrl?: string;
            clientId?: string;
          };
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
        } else if (!cancelled) {
          const bootstrapped = await bootstrapAdminAppSession();
          if (!bootstrapped) {
            clearAuthSession();
            clearUserProfile();
          }
        }
      } catch {
        /* offline — keep session flag */
      }

      if (!cancelled) {
        await refreshDesiresFromServer();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
