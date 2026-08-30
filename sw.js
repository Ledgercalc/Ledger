// Ledger service worker — caches the app shell so it still opens offline.
// Bump CACHE_NAME whenever you change index.html / LedgerApp.jsx to force
// clients to pick up the new version.
const CACHE_NAME = "ledger-cache-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./LedgerApp.jsx",
  "./manifest.json",
  "./icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(APP_SHELL).catch(() => {
        // If a file is missing/renamed, don't block install — just skip precaching.
      })
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle same-origin GET requests; let everything else (CDN scripts,
  // esm.sh imports, fonts, etc.) pass straight through to the network.
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) {
    return;
  }

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

      // Network-first for the app shell so updates show up quickly;
      // fall back to cache when offline.
      return network || cached;
    })
  );
});
