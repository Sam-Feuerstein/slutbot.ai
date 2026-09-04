'use client';

import { useEffect, useState } from 'react';

export function useAdminSession() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/admin/me', { credentials: 'same-origin', cache: 'no-store' })
      .then((res) => {
        if (!cancelled) setIsAdmin(res.ok);
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return isAdmin;
}
