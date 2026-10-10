// Offline app-shell + runtime page cache. Hashed build assets are
// precached for fast repeat loads. For the screens actually used away from
// wifi (Rehearsal Mode, My Part, Song Chart/Full Lyrics, Set detail), the
// most recently successful page response is cached too (network-first,
// falling back to that cache on failure) — so going offline mid-rehearsal
// shows the last-known songs/chords/directions instead of a dead end.
// Everything else (admin, settings, song library CRUD, etc.) still falls
// back to the generic /offline page, since there's genuinely nothing
// locally cached for those and no offline editing story for them.
//
// This cached HTML is a stale snapshot as of the last successful visit —
// it is NOT kept live. The actual "fresh-as-possible" data and offline
// *editing* story lives client-side in IndexedDB (see lib/offline/), which
// the page's client component reads from once it hydrates. This cache's
// only job is getting the page to boot at all with no network.
const SHELL_CACHE = "worshipflow-shell-v2";
const PAGE_CACHE = "worshipflow-pages-v1";
const OFFLINE_URL = "/offline";
const SHELL_ASSETS = [OFFLINE_URL, "/manifest.webmanifest", "/icon-192", "/icon-512"];

// Pathname prefixes whose most-recent successful HTML response is worth
// keeping around for an offline reload. Order doesn't matter; checked with
// startsWith. Keep in sync with lib/offline/routes.ts's OFFLINE_ROUTE_PREFIXES.
const OFFLINE_CAPABLE_PREFIXES = ["/rehearsal/", "/my-part", "/sets/", "/songs/"];

function isOfflineCapablePath(pathname) {
  return OFFLINE_CAPABLE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== PAGE_CACHE).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    const capable = isOfflineCapablePath(url.pathname);
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Only cache a real, successful page — never a redirect (e.g. to
          // /login when a session expired) or an error page.
          if (capable && res.ok && res.type === "basic") {
            const clone = res.clone();
            caches.open(PAGE_CACHE).then((cache) => cache.put(request, clone));
          }
          return res;
        })
        .catch(async () => {
          if (capable) {
            const cached = await caches.match(request, { cacheName: PAGE_CACHE });
            if (cached) return cached;
          }
          return caches.match(OFFLINE_URL);
        }),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const clone = res.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, clone));
            return res;
          }),
      ),
    );
  }
});
