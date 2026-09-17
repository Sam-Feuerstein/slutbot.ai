'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  getAdminPushClientStatus,
  sendAdminPushTest,
  showLocalSaleNotification,
  subscribeAdminPush,
  type AdminPushClientStatus,
} from '@/lib/adminPushClient';
import { Panel } from './AdminUi';

export default function SaleAlertSetup() {
  const [status, setStatus] = useState<AdminPushClientStatus | null>(null);
  const [serverSubs, setServerSubs] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const refresh = useCallback(async () => {
    const next = await getAdminPushClientStatus();
    setStatus(next);
    try {
      const res = await fetch('/api/admin/push/status', { credentials: 'same-origin' });
      if (res.ok) {
        const json = (await res.json()) as { subscriptionCount?: number };
        setServerSubs(typeof json.subscriptionCount === 'number' ? json.subscriptionCount : 0);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function enable() {
    setBusy(true);
    setNote('');
    try {
      const result = await subscribeAdminPush({ forceRefresh: true });
      setNote(result.message);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setNote('');
    try {
      const result = await sendAdminPushTest();
      window.dispatchEvent(
        new CustomEvent('slutbot:admin-sale-toast', {
          detail: { planLabel: 'AI SLUTBOT 1,500 Stars', method: 'crypto', username: 'test', usd: 9.99 },
        }),
      );
      await showLocalSaleNotification({
        body: 'AI SLUTBOT 1,500 Stars · $9.99 · Crypto · test',
        tag: `aislutbot-sale-test-${Date.now()}`,
      });
      setNote(result.message);
    } finally {
      setBusy(false);
    }
  }

  const ready = Boolean(status?.permission === 'granted');
  const denied = status?.permission === 'denied';

  return (
    <Panel className="mb-6 !p-4 sm:!p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-black sm:text-base">Sale push alerts</h2>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
                ready ? 'bg-emerald-400/15 text-emerald-300' : 'bg-amber-400/15 text-amber-200'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${ready ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {ready ? 'On this device' : 'Not enabled'}
            </span>
          </div>
          <p className="mt-1 text-sm text-white/50">
            Allow notifications here so new paid packs ping your phone or browser even when this tab is in the background.
            {typeof serverSubs === 'number' ? ` ${serverSubs} device${serverSubs === 1 ? '' : 's'} registered.` : ''}
          </p>
          {status && !status.vapidConfigured ? (
            <p className="mt-2 text-sm text-amber-300">
              VAPID keys are missing. Add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY on the server.
            </p>
          ) : null}
          {status && status.permission === 'granted' && !status.subscribed ? (
            <p className="mt-2 text-sm text-amber-300">
              Browser alerts are on while this site is open. Tap Enable again if background push did not register.
            </p>
          ) : null}
          {denied ? (
            <p className="mt-2 text-sm text-amber-300">
              Notifications are blocked for this site. Allow them in the browser or installed app, then tap Enable.
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void enable()}
            className="rounded-full bg-[#ff2d78] px-5 py-2.5 text-sm font-bold text-white shadow-[0_10px_30px_rgba(255,45,120,0.35)] transition hover:bg-[#ff1a6b] disabled:opacity-50"
          >
            {busy ? 'Working…' : ready ? 'Re-enable on this device' : 'Enable sale alerts'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void test()}
            className="rounded-2xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-white/70 hover:text-white disabled:opacity-50"
          >
            Send test
          </button>
        </div>
      </div>
      {note ? <p className="mt-3 text-sm text-white/60">{note}</p> : null}
    </Panel>
  );
}
