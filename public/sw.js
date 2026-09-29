// Service worker for the Tredzi app
// Bump this version string whenever you ship new files to force a cache refresh

const CACHE_VERSION = 'tredzi-v2';
const CACHE_NAME = `tredzi-cache-${CACHE_VERSION}`;

// Core files required for the app shell
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/TredziApp.jsx',
  '/icons/icon.png'
];

// Install: pre-cache core app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
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
        .catch(() => caches.match('/index.html'))
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
