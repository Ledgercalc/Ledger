// Ledger service worker
//
// Strategy: stale-while-revalidate for everything, same-origin or not.
// This lets the app (index.html + manifest + icons) and the CDN modules it
// imports at runtime (React, lucide-react, recharts from esm.sh) get cached
// as they're fetched, so a repeat launch works even with a flaky or absent
// connection, while a fresh copy is still pulled in the background whenever
// the network is available.
const CACHE_NAME = "ledger-cache-v1";

const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
      .catch(() => {
        // Precaching is best-effort — a failed fetch here (e.g. offline on
        // first install) shouldn't block the service worker from activating.
      })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle simple GETs — alarms, storage, etc. all happen in-page and
  // never touch the network, so this only ever sees the app shell and its
  // CDN module imports.
  if (req.method !== "GET") return;

  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
