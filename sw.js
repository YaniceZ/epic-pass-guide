const CACHE = 'epic-guide-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Network-first for the page shell itself, so a stale cached copy never
  // hides a newer deployed version when the network is actually available.
  // Falls back to the cache (then the cached index.html) only when offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          caches.open(CACHE).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
    );
    return;
  }

  // Cache-first for same-origin static assets (manifest, icon). Cross-origin
  // requests — map tiles, weather/AQI/avalanche APIs, Google Fonts, Leaflet —
  // are left alone so live data is never served stale from the cache.
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            caches.open(CACHE).then((c) => c.put(req, res.clone()));
            return res;
          })
      )
    );
  }
});
