const CACHE = 'dcalog-v2';

// App shell files to pre-cache
const PRECACHE = [
  '/',
  '/app',
  '/favicon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/logo-horizontal.svg',
  '/logo-horizontal-light.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never intercept API calls or cross-origin requests
  if (url.pathname.startsWith('/api') || url.origin !== location.origin) return;

  // For navigation requests: network first, fall back to cached '/' for offline SPA support
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('/').then((r) => r ?? Response.error()))
    );
    return;
  }

  // JS and CSS: network-first (Next.js uses hashed filenames, stale cache causes bugs)
  if (url.pathname.match(/\.(js|css)$/)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((r) => r ?? Response.error()))
    );
    return;
  }

  // Images and fonts: cache-first (these never change)
  if (url.pathname.match(/\.(png|svg|ico|webp|woff2?)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // Everything else: network only
});
