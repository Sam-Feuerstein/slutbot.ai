'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  getAdminPushClientStatus,
  showLocalSaleNotification,
  subscribeAdminPush,
} from '@/lib/adminPushClient';

type ToastData = {
  id?: string;
  planLabel: string;
  method: string;
  username?: string | null;
  usd?: number;
  body?: string;
};

function methodLabel(method?: string) {
  return method === 'stars' ? 'Stars' : 'Crypto';
}

function toastBody(toast: ToastData) {
  if (toast.body) return toast.body;
  return [
    toast.planLabel,
    toast.usd ? `$${toast.usd % 1 === 0 ? toast.usd : toast.usd.toFixed(2)}` : '',
    methodLabel(toast.method),
    toast.username || '',
  ]
    .filter(Boolean)
    .join(' · ');
}

export default function AdminSaleAlert() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [needsEnable, setNeedsEnable] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [enableNote, setEnableNote] = useState('');
  const lastPollRef = useRef(Date.now());
  const seenIdsRef = useRef(new Set<string>());

  const addToast = (toast: ToastData) => {
    setToasts((prev) => [...prev, toast]);
    setTimeout(() => setToasts((prev) => prev.slice(1)), 8000);
  };

  useEffect(() => {
    let cancelled = false;
    void fetch('/api/admin/me', { credentials: 'same-origin' })
      .then((res) => {
        if (cancelled) return;
        setIsAdmin(res.ok);
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    void (async () => {
      const status = await getAdminPushClientStatus();
      if (cancelled) return;
      if (status.permission === 'granted') {
        await subscribeAdminPush();
        if (!cancelled) setNeedsEnable(Notification.permission !== 'granted');
        return;
      }
      if (!cancelled) setNeedsEnable(true);
    })().catch((err) => {
      console.warn('[AdminSaleAlert] Push setup failed:', err);
      if (!cancelled) setNeedsEnable(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  useEffect(() => {
    const onToast = (event: Event) => {
      const detail = (event as CustomEvent<ToastData>).detail;
      if (!detail?.planLabel) return;
      addToast(detail);
    };
    window.addEventListener('slutbot:admin-sale-toast', onToast);
    return () => window.removeEventListener('slutbot:admin-sale-toast', onToast);
  }, []);

  const handleSales = useCallback(async (sales: ToastData[]) => {
    for (const sale of sales) {
      const id = sale.id || `${sale.planLabel}-${sale.usd}-${sale.username || ''}`;
      if (seenIdsRef.current.has(id)) continue;
      seenIdsRef.current.add(id);
      if (seenIdsRef.current.size > 200) {
        const first = seenIdsRef.current.values().next().value;
        if (first) seenIdsRef.current.delete(first);
      }
      addToast(sale);
      if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        await showLocalSaleNotification({
          body: toastBody(sale),
          tag: `aislutbot-sale-${id}`,
        });
      }
    }
  }, []);

  const pollForEvents = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`/api/admin/sales/latest?since=${lastPollRef.current}`, {
        credentials: 'same-origin',
      });
      if (!res.ok) return;
      const data = (await res.json()) as { sale?: ToastData | null; sales?: ToastData[] };
      const sales = data.sales?.length ? data.sales : data.sale ? [data.sale] : [];
      lastPollRef.current = Date.now() - 2_000;
      if (sales.length) await handleSales(sales);
    } catch {
      /* ignore */
    }
  }, [handleSales, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    lastPollRef.current = Date.now();
    const timer = window.setInterval(() => {
      void pollForEvents();
    }, 8_000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void pollForEvents();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [isAdmin, pollForEvents]);

  async function enableFromBanner() {
    setEnabling(true);
    setEnableNote('');
    try {
      const result = await subscribeAdminPush({ forceRefresh: true });
      setEnableNote(result.message);
      setNeedsEnable(Notification.permission !== 'granted');
    } finally {
      setEnabling(false);
    }
  }

  const onAdmin = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const showBanner = isAdmin && onAdmin && pathname !== '/admin' && needsEnable;

  return (
    <>
      {showBanner ? (
        <div className="fixed inset-x-0 bottom-0 z-[9998] border-t border-white/10 bg-[#12060c]/95 px-4 py-3 pb-[max(0.75rem,var(--safe-bottom))] backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-white/80">
              Sale push alerts are off on this device. Enable them to get pinged on every paid pack.
            </p>
            <button
              type="button"
              disabled={enabling}
              onClick={() => void enableFromBanner()}
              className="rounded-full bg-[#ff2d78] px-5 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {enabling ? 'Enabling…' : 'Enable alerts'}
            </button>
          </div>
          {enableNote ? <p className="mx-auto mt-2 max-w-3xl text-xs text-white/50">{enableNote}</p> : null}
        </div>
      ) : null}

      {isAdmin
        ? toasts.map((toast, i) => (
            <div
              key={`${toast.id || toast.planLabel}-${i}`}
              className="fixed right-4 z-[9999] max-w-xs rounded-2xl border border-white/10 bg-[#111] px-4 py-3 text-white shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
              style={{ top: `${16 + i * 84}px` }}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white">New sale</p>
                  <p className="mt-0.5 text-xs text-white/70">{toastBody(toast)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setToasts((prev) => prev.filter((_, j) => j !== i))}
                  className="text-lg leading-none text-white/50 hover:text-white"
                  aria-label="Dismiss"
                >
                  ×
                </button>
              </div>
            </div>
          ))
        : null}
    </>
  );
}
