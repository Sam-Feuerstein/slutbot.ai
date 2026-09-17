'use client';

export const ADMIN_SW_URL = '/sw.js?v=4';
export const ADMIN_PUSH_ICON = '/icons/icon-192.png?v=3';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i);
  return arr;
}

export type AdminPushClientStatus = {
  supported: boolean;
  permission: NotificationPermission | 'unsupported';
  subscribed: boolean;
  vapidConfigured: boolean;
};

export function pushSupported() {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

export async function getAdminPushClientStatus(): Promise<AdminPushClientStatus> {
  if (!pushSupported()) {
    return {
      supported: false,
      permission: 'unsupported',
      subscribed: false,
      vapidConfigured: false,
    };
  }

  let vapidConfigured = false;
  try {
    const res = await fetch('/api/admin/push/vapid-key', { credentials: 'same-origin' });
    vapidConfigured = res.ok;
  } catch {
    vapidConfigured = false;
  }

  let subscribed = false;
  try {
    await navigator.serviceWorker.register(ADMIN_SW_URL);
    const reg = await navigator.serviceWorker.ready;
    subscribed = Boolean(await reg.pushManager.getSubscription());
  } catch {
    subscribed = false;
  }

  return {
    supported: true,
    permission: Notification.permission,
    subscribed,
    vapidConfigured,
  };
}

export async function subscribeAdminPush(options?: { forceRefresh?: boolean }): Promise<{
  ok: boolean;
  message: string;
  subscribed: boolean;
}> {
  if (!pushSupported()) {
    return { ok: false, subscribed: false, message: 'This browser does not support push notifications.' };
  }

  await navigator.serviceWorker.register(ADMIN_SW_URL);
  const reg = await navigator.serviceWorker.ready;

  const perm =
    Notification.permission === 'granted'
      ? 'granted'
      : await Notification.requestPermission();
  if (perm !== 'granted') {
    return {
      ok: false,
      subscribed: false,
      message: 'Notifications were blocked. Allow them in the browser or installed app, then try again.',
    };
  }

  const keyRes = await fetch('/api/admin/push/vapid-key', { credentials: 'same-origin' });
  if (!keyRes.ok) {
    return {
      ok: true,
      subscribed: false,
      message: 'Alerts will show while this site is open. Add VAPID keys on the server for background push.',
    };
  }
  const { publicKey } = (await keyRes.json()) as { publicKey?: string };
  if (!publicKey) {
    return {
      ok: true,
      subscribed: false,
      message: 'Alerts will show while this site is open. Add VAPID keys on the server for background push.',
    };
  }

  let existing = await reg.pushManager.getSubscription();
  if (existing && options?.forceRefresh) {
    try {
      await existing.unsubscribe();
    } catch {
      /* continue with a fresh subscribe */
    }
    existing = null;
  }

  try {
    const sub =
      existing ||
      (await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }));

    const save = await fetch('/api/admin/push/subscribe', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON() }),
    });
    if (!save.ok) {
      return {
        ok: true,
        subscribed: false,
        message: 'Permission granted. Could not save this device for background push; alerts still work while the site is open.',
      };
    }

    return { ok: true, subscribed: true, message: 'This device will get a notification on each paid pack.' };
  } catch {
    return {
      ok: true,
      subscribed: false,
      message: 'Permission granted. Background push failed; alerts still work while this site is open.',
    };
  }
}

export async function sendAdminPushTest(): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch('/api/admin/push/test', {
      method: 'POST',
      credentials: 'same-origin',
    });
    if (!res.ok) return { ok: false, message: 'Could not send a test alert.' };
    return { ok: true, message: 'Test alert sent. Check this browser or the installed app.' };
  } catch {
    return { ok: false, message: 'Could not send a test alert.' };
  }
}

export async function showLocalSaleNotification(input: {
  title?: string;
  body: string;
  tag?: string;
}) {
  if (!pushSupported() || Notification.permission !== 'granted') return;
  try {
    await navigator.serviceWorker.register(ADMIN_SW_URL);
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(input.title || 'New sale', {
      body: input.body,
      icon: ADMIN_PUSH_ICON,
      badge: ADMIN_PUSH_ICON,
      tag: input.tag || `aislutbot-sale-${Date.now()}`,
      data: { url: '/admin' },
      requireInteraction: true,
      renotify: true,
    } as NotificationOptions);
  } catch {
    try {
      new Notification(input.title || 'New sale', {
        body: input.body,
        icon: ADMIN_PUSH_ICON,
        tag: input.tag || `aislutbot-sale-${Date.now()}`,
      });
    } catch {
      /* ignore */
    }
  }
}
