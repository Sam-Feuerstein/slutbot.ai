'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

const SW_URL = '/sw.js?v=3';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i);
  return arr;
}

type ToastData = {
  planLabel: string;
  method: string;
  username?: string | null;
  usd?: number;
};

function methodLabel(method?: string) {
  return method === 'stars' ? 'Stars' : 'Crypto';
}

async function subscribeAdminPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  await navigator.serviceWorker.register(SW_URL);
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    await fetch('/api/admin/push/subscribe', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: existing.toJSON() }),
    });
    return true;
  }

  const perm = await Notification.requestPermission();
  if (perm !== 'granted') return false;

  const res = await fetch('/api/admin/push/vapid-key', { credentials: 'same-origin' });
  if (!res.ok) return false;
  const { publicKey } = (await res.json()) as { publicKey?: string };
  if (!publicKey) return false;

  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  await fetch('/api/admin/push/subscribe', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: sub.toJSON() }),
  });
  return true;
}

export default function AdminSaleAlert() {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const lastPollRef = useRef(Date.now());
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    void subscribeAdminPush().catch((err) => {
      console.warn('[AdminSaleAlert] Push setup failed:', err);
    });
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

  const pollForEvents = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch(`/api/admin/sales/latest?since=${lastPollRef.current}`, {
        credentials: 'same-origin',
      });
      if (!res.ok) return;
      const data = (await res.json()) as {
        sale?: {
          planLabel?: string;
          method?: string;
          username?: string | null;
          usd?: number;
        } | null;
      };
      if (data.sale) {
        lastPollRef.current = Date.now();
        addToast({
          planLabel: data.sale.planLabel || 'Pack',
          method: data.sale.method || 'crypto',
          username: data.sale.username,
          usd: data.sale.usd,
        });
      }
    } catch {
      /* ignore */
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    lastPollRef.current = Date.now();
    pollIntervalRef.current = setInterval(pollForEvents, 15_000);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [isAdmin, pollForEvents]);

  if (!isAdmin || toasts.length === 0) return null;

  return (
    <>
      {toasts.map((toast, i) => (
        <div
          key={`${toast.planLabel}-${i}`}
          className="fixed right-4 z-[9999] max-w-xs rounded-2xl border border-white/10 bg-[#111] px-4 py-3 text-white shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
          style={{ top: `${16 + i * 84}px` }}
        >
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white">New sale</p>
              <p className="mt-0.5 text-xs text-white/70">
                {toast.planLabel}
                {toast.usd ? ` · $${toast.usd % 1 === 0 ? toast.usd : toast.usd.toFixed(2)}` : ''}
                {' · '}
                {methodLabel(toast.method)}
                {toast.username ? ` · ${toast.username}` : ''}
              </p>
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
      ))}
    </>
  );
}
