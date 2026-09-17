/* v=4 — push + installability (no network intercept) */
const NOTIFICATION_ICON = '/icons/icon-192.png?v=3';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

/* Empty fetch listener — needed for installability on older Chrome. Does not intercept. */
self.addEventListener('fetch', () => {});

self.addEventListener('push', (event) => {
  const fallback = {
    title: 'New sale',
    body: 'A paid pack just came in.',
  };
  event.waitUntil(
    (async () => {
      let data = fallback;
      try {
        if (event.data) data = { ...fallback, ...event.data.json() };
      } catch (e) {
        console.error('[SW] Push parse error:', e);
      }
      await self.registration.showNotification(data.title || fallback.title, {
        body: data.body || fallback.body,
        icon: data.icon || NOTIFICATION_ICON,
        badge: data.badge || NOTIFICATION_ICON,
        tag: data.tag || `aislutbot-sale-${Date.now()}`,
        data: data.data || { url: '/admin' },
        vibrate: [200, 100, 200],
        requireInteraction: true,
        renotify: true,
      });
    })()
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/admin';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) return client.focus();
      }
      return self.clients.openWindow(url);
    })
  );
});
