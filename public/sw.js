// نسخه و فهرست فایل‌ها هنگام Build به‌صورت خودکار جایگزین می‌شوند (vite.config.js).
const VERSION = '__BUILD_VERSION__';
const CACHE = `tosan-bundling-v6-${VERSION}`;
const PRECACHE = /*PRECACHE*/[]/*END*/;
const scopeUrl = (p) => new URL(p, self.registration.scope).href;
const INDEX = scopeUrl('./');

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.all(PRECACHE.map((p) => cache.add(new Request(scopeUrl(p), { cache: 'reload' })))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('tosan-bundling-v6-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || !req.url.startsWith(self.registration.scope)) return;

  // صفحه: اول شبکه (برای نسخه‌ی تازه)، در قطعی اینترنت نسخه‌ی کش‌شده
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(INDEX, copy)); }
          return res;
        })
        .catch(() => caches.match(INDEX, { ignoreSearch: true }).then((r) => r || Response.error()))
    );
    return;
  }

  // فایل‌ها: اول کش، در صورت نبود از شبکه
  event.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    }))
  );
});
