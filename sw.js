// Ledger — service worker
// Caches the local app shell so the app still opens offline / when
// reinstalled to a home screen. It does NOT try to cache the esm.sh CDN
// modules (React, lucide-react, recharts) — those are left to the browser's
// normal HTTP cache, since aggressively caching third-party ESM urls here
// tends to pin the app to stale dependency versions.

const CACHE_NAME = "ledger-shell-v1";
const APP_SHELL = ["./", "index.html", "manifest.json", "icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

// Cache-first for same-origin app-shell files, network-first fallback for
// everything else (so a stale cached shell doesn't block new deploys, and
// third-party CDN requests just go straight to the network/browser cache).
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  if (!isSameOrigin) return; // let CDN requests pass through untouched

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match("index.html"));
    })
  );
});
