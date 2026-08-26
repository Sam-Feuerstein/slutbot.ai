/* v=2 — installability (no network intercept) */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

/* Empty fetch listener — needed for installability on older Chrome. Does not intercept. */
self.addEventListener('fetch', () => {});
