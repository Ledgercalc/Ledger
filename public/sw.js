// Service worker for the Tredzi app
// Bump this version string whenever you ship new files to force a cache refresh

const CACHE_VERSION = 'tredzi-v3';
const CACHE_NAME = `tredzi-cache-${CACHE_VERSION}`;

// Core files required for the app shell.
// Paths are resolved against the service worker's own scope, so this works whether the app
// is hosted at the domain root or under a sub-path (e.g. GitHub Pages /Tredzi/).
// Every file must exist: a single 404 used to fail the whole install, so each one is
// added on its own and a missing file is skipped instead of breaking the cache.
const PRECACHE_ASSETS = ['./', 'index.html', 'manifest.json', 'icon.png'];

const scopeUrl = (path) => new URL(path, self.registration.scope).href;

// Install: pre-cache core app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.allSettled(
        PRECACHE_ASSETS.map((path) => cache.add(scopeUrl(path)))
      )
    )
  );

  self.skipWaiting();
});

// Activate: clean up old Tredzi caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith('tredzi-cache-') &&
              key !== CACHE_NAME
          )
          .map((key) => caches.delete(key))
      )
    )
  );

  self.clients.claim();
});

// Fetch strategy:
// - Navigation requests: network-first, then cached app shell
// - Other GET requests: cache-first, then network

self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  // Only handle this app's own files. Cross-origin requests (the community worker,
  // market data for the Backtest tab, fonts) go straight to the network untouched.
  if (new URL(request.url).origin !== self.location.origin) return;

  // Navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();

          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, clone));

          return response;
        })
        .catch(() => caches.match(scopeUrl('index.html')))
    );

    return;
  }

  // Other GET requests
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request)
        .then((response) => {
          // Only cache successful same-origin responses
          if (
            response.ok &&
            new URL(request.url).origin === self.location.origin
          ) {
            const clone = response.clone();

            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, clone));
          }

          return response;
        })
        .catch(() => {
          return new Response('', {
            status: 504,
            statusText: 'Offline'
          });
        });
    })
  );
});
