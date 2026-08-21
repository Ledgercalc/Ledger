// Minimal offline cache for the app shell (this repo's own files).
// CDN scripts (React, Babel, Tailwind, lucide-react, recharts, live FX
// rates) are left to the network — caching them here would risk serving a
// stale/broken combination of library versions. Bump CACHE_NAME whenever
// you change index.html/LedgerApp.jsx/manifest.json so old clients pick up
// the new files instead of a stale cache.
const CACHE_NAME = "ledger-shell-v1";
const SHELL_FILES = [
  "./",
  "./index.html",
  "./LedgerApp.jsx",
  "./manifest.json",
  "./icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))))
  );
  self.clients.claim();
});

// Network-first for the app shell files (so a redeploy is picked up
// immediately when online), falling back to cache when offline.
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isShellFile = url.origin === self.location.origin;
  if (!isShellFile || event.request.method !== "GET") return;

  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        return res;
      })
      .catch(() => caches.match(event.request))
  );
});
