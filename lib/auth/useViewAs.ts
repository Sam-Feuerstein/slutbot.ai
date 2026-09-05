'use client';

import { useEffect, useState } from 'react';
import { useAdminSession } from '@/lib/auth/useAdminSession';
import { getAuthToken } from '@/lib/desires';
import {
  effectiveAccountTier,
  readViewAsTier,
  writeViewAsTier,
  VIEW_AS_CHANGED_EVENT,
  type AccountTier,
} from '@/lib/viewAs';

export function useViewAs() {
  const panelAdmin = useAdminSession();
  const [appAdmin, setAppAdmin] = useState(false);
  const [realTier, setRealTier] = useState<AccountTier>('free');
  const [preview, setPreview] = useState<AccountTier | null>(null);

  useEffect(() => {
    setPreview(readViewAsTier());
    const onChange = () => setPreview(readViewAsTier());
    window.addEventListener(VIEW_AS_CHANGED_EVENT, onChange);
    window.addEventListener('storage', onChange);
    return () => {
      window.removeEventListener(VIEW_AS_CHANGED_EVENT, onChange);
      window.removeEventListener('storage', onChange);
    };
  }, []);

  useEffect(() => {
    if (!getAuthToken()) {
      setAppAdmin(false);
      setRealTier('free');
      return;
    }
    let cancelled = false;
    void fetch('/api/wallet', { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { isAdmin?: boolean; tier?: AccountTier };
        if (cancelled) return;
        setAppAdmin(Boolean(data.isAdmin));
        if (data.tier === 'free' || data.tier === 'paid' || data.tier === 'ultra') {
          setRealTier(data.tier);
        }
      })
      .catch(() => {
        if (!cancelled) setAppAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const canPreview = panelAdmin || appAdmin;
  const tier = effectiveAccountTier(realTier, preview, canPreview);

  return {
    canPreview,
    realTier,
    preview: canPreview ? preview ?? 'ultra' : null,
    tier,
    setPreview: (next: AccountTier) => {
      writeViewAsTier(next);
      setPreview(next);
    },
  };
}
