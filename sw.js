/* Kapitan Guide service worker.
   - Precaches every core asset (including sitemap.xml and robots.txt).
   - Navigations are network-first; offline they resolve to the cached index.html,
     ignoring the query string and #hash, so deep links such as
     ./index.html#eligibility, #directory and #checklist always open offline.
   - Same-origin assets use stale-while-revalidate; only successful, non-opaque
     same-origin responses are cached. Cross-origin requests (fonts, CDNs) are never
     intercepted or cached.
   Paths resolve against the SW scope: /barangaycaptainguide/ on GitHub Pages, / locally. */
const VERSION = 'v1.2.0';
const PRECACHE = 'bcg-precache-' + VERSION;
const RUNTIME = 'bcg-runtime-' + VERSION;

const PRECACHE_ASSETS = [
  './', 'index.html', 'offline.html', 'manifest.webmanifest', 'manifest.json',
  'sitemap.xml', 'robots.txt', 'css/styles.css', 'js/app.js',
  'favicon.ico', 'favicon.svg', 'apple-touch-icon.png',
  'icons/favicon-16x16.png', 'icons/favicon-32x32.png', 'icons/icon-72.png', 'icons/icon-96.png',
  'icons/icon-128.png', 'icons/icon-144.png', 'icons/icon-152.png', 'icons/icon-192.png',
  'icons/icon-384.png', 'icons/icon-512.png', 'icons/icon-maskable-192.png', 'icons/icon-maskable-512.png',
  'images/og-image.png', 'screenshots/screenshot-wide.png', 'screenshots/screenshot-narrow.png'
].map((p) => new URL(p, self.registration.scope).href);

const INDEX_URL = new URL('index.html', self.registration.scope).href;
const OFFLINE_URL = new URL('offline.html', self.registration.scope).href;
const SCOPE_URL = new URL('./', self.registration.scope).href;

/* strip #hash and ?query so every deep link maps to one cache entry */
function normalize(url) {
  const u = new URL(url, self.registration.scope);
  u.hash = '';
  u.search = '';
  return u.href;
}
function isCacheable(res) {
  return !!res && res.ok && res.status === 200 && res.type === 'basic';
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(PRECACHE).then((cache) =>
      Promise.all(PRECACHE_ASSETS.map((url) =>
        fetch(new Request(url, { cache: 'reload' }))
          .then((res) => (isCacheable(res) ? cache.put(url, res) : null))
          .catch(() => null)
      ))
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

async function matchCached(url) {
  const key = normalize(url);
  return (await caches.match(key, { ignoreSearch: true })) || null;
}

async function handleNavigation(request) {
  const key = normalize(request.url);
  try {
    const res = await fetch(request);
    if (isCacheable(res)) {
      const copy = res.clone();
      caches.open(RUNTIME).then((c) => c.put(key, copy)).catch(() => null);
    }
    return res;
  } catch (err) {
    const hit = (await matchCached(request.url))
      || (key === SCOPE_URL ? await matchCached(INDEX_URL) : null)
      || (await matchCached(INDEX_URL))
      || (await matchCached(OFFLINE_URL));
    return hit || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}

async function staleWhileRevalidate(request) {
  const key = normalize(request.url);
  const cached = await matchCached(request.url);
  const network = fetch(request)
    .then((res) => {
      if (isCacheable(res)) {
        const copy = res.clone();
        caches.open(RUNTIME).then((c) => c.put(key, copy)).catch(() => null);
      }
      return res;
    })
    .catch(() => null);
  if (cached) { network.catch(() => null); return cached; }
  const res = await network;
  return res || new Response('', { status: 504, statusText: 'Offline' });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; /* never touch cross-origin (fonts, CDNs) */
  if (!url.href.startsWith(SCOPE_URL)) return;

  if (req.mode === 'navigate') { event.respondWith(handleNavigation(req)); return; }
  event.respondWith(staleWhileRevalidate(req));
});
