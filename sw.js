/* Service worker: precache, network-first navigation with offline fallback,
   stale-while-revalidate for assets. Paths resolve against the SW scope so it
   works at /barangaycaptainguide/ on GitHub Pages and at / on a local server. */
const VERSION = 'v1.0.0';
const PRECACHE = 'bcg-precache-' + VERSION;
const RUNTIME = 'bcg-runtime-' + VERSION;

const CORE = [
  './', 'index.html', 'offline.html', 'manifest.webmanifest', 'css/styles.css', 'js/app.js',
  'favicon.ico', 'favicon.svg', 'apple-touch-icon.png',
  'icons/favicon-16x16.png', 'icons/favicon-32x32.png', 'icons/icon-72.png', 'icons/icon-96.png',
  'icons/icon-128.png', 'icons/icon-144.png', 'icons/icon-152.png', 'icons/icon-192.png',
  'icons/icon-384.png', 'icons/icon-512.png', 'icons/icon-maskable-192.png', 'icons/icon-maskable-512.png',
  'images/og-image.png', 'screenshots/screenshot-wide.png', 'screenshots/screenshot-narrow.png'
].map((p) => new URL(p, self.registration.scope).href);

const OFFLINE_URL = new URL('offline.html', self.registration.scope).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE).then((cache) =>
      Promise.all(CORE.map((url) => cache.add(url).catch(() => null)))
    )
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((k) => k.startsWith('bcg-') && k !== PRECACHE && k !== RUNTIME)
        .map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() =>
          caches.match(req)
            .then((hit) => hit || caches.match(new URL('index.html', self.registration.scope).href))
            .then((hit) => hit || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(RUNTIME).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
