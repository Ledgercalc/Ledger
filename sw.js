// Service worker for the Ledger app
// Bump this version string whenever you ship new files to force a cache refresh
const CACHE_VERSION = 'ledger-v1';
const CACHE_NAME = `ledger-cache-${CACHE_VERSION}`;

// Adjust this list to match your actual file names/paths
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/LedgerApp.jsx',
  '/icons/icon.png'
];

// Install: pre-cache core app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('ledger-cache-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch strategy:
// - Navigation requests: network-first, fall back to cached app shell (works offline)
// - Other GET requests: cache-first, fall back to network, then cache the response
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((response) => {
          // Only cache successful, same-origin responses
          if (response.ok && new URL(request.url).origin === self.location.origin) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Optional: return a fallback for images/etc. if desired
          return new Response('', { status: 504, statusText: 'Offline' });
        });
    })
  );
});
