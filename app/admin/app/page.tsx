'use client';

import { useCallback, useEffect, useState } from 'react';
import { adminHeaders } from '@/lib/adminApi';
import { PageHeader, Panel } from '../components/AdminUi';

type InstallRow = {
  id: string;
  clientId: string;
  createdAt: string;
  email: string | null;
  name: string | null;
  status: 'guest' | 'free' | 'paid';
};

type Snapshot = {
  total: number;
  linked: number;
  guests: number;
  paid: number;
  free: number;
  installs: InstallRow[];
  push?: { vapidConfigured?: boolean };
};

export default function AdminAppPage() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushNote, setPushNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/pwa/installs', { headers: adminHeaders(), credentials: 'same-origin' });
      const json = (await res.json()) as Snapshot & { message?: string };
      if (!res.ok) {
        setError(json.message || 'Could not load installs.');
        setData(null);
        return;
      }
      setData(json);
    } catch {
      setError('Could not load installs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function enablePush() {
    setPushBusy(true);
    setPushNote('');
    try {
      if (!('Notification' in window) || !('serviceWorker' in navigator)) {
        setPushNote('This browser does not support push notifications.');
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setPushNote('Notifications were blocked. Allow them in the browser or installed app, then try again.');
        return;
      }
      const sw = await navigator.serviceWorker.register('/sw.js?v=3');
      await navigator.serviceWorker.ready;
      const keyRes = await fetch('/api/admin/push/vapid-key', { credentials: 'same-origin' });
      if (!keyRes.ok) {
        setPushNote('Push keys are not configured on the server yet.');
        return;
      }
      const { publicKey } = (await keyRes.json()) as { publicKey?: string };
      if (!publicKey) {
        setPushNote('Push keys are not configured on the server yet.');
        return;
      }
      const padding = '='.repeat((4 - (publicKey.length % 4)) % 4);
      const base64 = (publicKey + padding).replace(/-/g, '+').replace(/_/g, '/');
      const raw = atob(base64);
      const keyBytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i += 1) keyBytes[i] = raw.charCodeAt(i);
      const existing = await sw.pushManager.getSubscription();
      const sub =
        existing ||
        (await sw.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyBytes,
        }));
      const save = await fetch('/api/admin/push/subscribe', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      });
      if (!save.ok) {
        setPushNote('Could not save this device for alerts.');
        return;
      }
      setPushNote('This device will get a notification on each paid pack.');
    } catch {
      setPushNote('Could not enable notifications on this device.');
    } finally {
      setPushBusy(false);
    }
  }

  async function sendTest() {
    setPushBusy(true);
    setPushNote('');
    try {
      const res = await fetch('/api/admin/push/test', {
        method: 'POST',
        credentials: 'same-origin',
        headers: adminHeaders(),
      });
      if (!res.ok) {
        setPushNote('Could not send a test alert.');
        return;
      }
      window.dispatchEvent(
        new CustomEvent('slutbot:admin-sale-toast', {
          detail: { planLabel: 'AI SLUTBOT Flirt', method: 'crypto', username: 'test', usd: 9.99 },
        }),
      );
      setPushNote('Test alert sent. Check this browser or the installed app.');
    } catch {
      setPushNote('Could not send a test alert.');
    } finally {
      setPushBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        kicker="App"
        title="Mobile app installs"
        description="Unique PWA installs. Sale alerts go to this admin session on the site, and as a phone notification after you allow them in the installed app."
        action={
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-2xl border border-white/10 px-3 py-2 text-xs font-semibold text-white/60 hover:text-white"
          >
            Refresh
          </button>
        }
      />

      {error ? <p className="mb-4 text-sm text-rose-300">{error}</p> : null}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total installs', value: data?.total ?? 0 },
          { label: 'Guests', value: data?.guests ?? 0 },
          { label: 'Accounts', value: data?.linked ?? 0 },
          { label: 'Paid in this list', value: data?.paid ?? 0 },
        ].map((item) => (
          <Panel key={item.label} className="!p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">{item.label}</p>
            <p className="mt-3 text-3xl font-black tracking-tight">{loading ? '—' : item.value.toLocaleString()}</p>
          </Panel>
        ))}
      </div>

      <Panel className="mb-8">
        <h2 className="text-lg font-black">Sale notifications</h2>
        <p className="mt-1 text-sm text-white/45">
          On the website, a toast appears while you are logged into admin. On the phone, install the app, open it while
          logged into admin, and allow notifications. iPhone only delivers push after Add to Home Screen.
        </p>
        {data && !data.push?.vapidConfigured ? (
          <p className="mt-3 text-sm text-amber-300">VAPID keys are missing. Add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to the server env.</p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={pushBusy}
            onClick={() => void enablePush()}
            className="rounded-full bg-[#ff2d78] px-6 py-2.5 text-sm font-bold text-white shadow-[0_10px_30px_rgba(255,45,120,0.35)] transition hover:bg-[#ff1a6b] disabled:opacity-50"
          >
            {pushBusy ? 'Working…' : 'Enable on this device'}
          </button>
          <button
            type="button"
            disabled={pushBusy}
            onClick={() => void sendTest()}
            className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-white/70 hover:text-white disabled:opacity-50"
          >
            Send test alert
          </button>
        </div>
        {pushNote ? <p className="mt-3 text-sm text-white/60">{pushNote}</p> : null}
      </Panel>

      <Panel>
        <h2 className="text-lg font-black">Recent installs</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead className="text-[11px] uppercase tracking-[0.14em] text-white/35">
              <tr>
                <th className="pb-2 font-semibold">When</th>
                <th className="pb-2 font-semibold">Status</th>
                <th className="pb-2 font-semibold">User</th>
                <th className="pb-2 font-semibold">Client</th>
              </tr>
            </thead>
            <tbody>
              {(data?.installs || []).length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-4 text-white/40">
                    {loading ? 'Loading…' : 'No installs yet.'}
                  </td>
                </tr>
              ) : (
                data?.installs.map((row) => (
                  <tr key={row.id} className="border-t border-white/8">
                    <td className="py-2 whitespace-nowrap text-white/70">
                      {row.createdAt ? new Date(row.createdAt).toLocaleString() : '—'}
                    </td>
                    <td className="py-2">
                      {row.status === 'paid' ? 'Paid' : row.status === 'free' ? 'Free' : 'Guest'}
                    </td>
                    <td className="py-2">
                      {row.email || row.name ? (
                        <span>
                          {row.name || row.email}
                          {row.name && row.email ? <span className="block text-[11px] text-white/35">{row.email}</span> : null}
                        </span>
                      ) : (
                        <span className="text-white/35">Not signed in</span>
                      )}
                    </td>
                    <td className="max-w-[180px] truncate py-2 font-mono text-[11px] text-white/35" title={row.clientId}>
                      {row.clientId || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
