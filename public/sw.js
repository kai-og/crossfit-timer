// Service worker: makes the phone timer work without a connection.
//
// - Install: fetch the /t shell and cache it together with every script, stylesheet and font it references.
// - /t navigations: network first, falling back to the cached shell. The workout lives in the URL query (and in the
//   phone's recent-workouts list), so one cached shell serves every workout.
// - /_next/static/*: cache first. These files are content-hashed, so they never change.
// - Everything else same-origin: stale-while-revalidate.

const CACHE = "timer-v2";
const SHELL = "/t";

/** Cache every script, stylesheet and font the shell references, plus the manifest and icons. */
async function cacheAssetsFrom(cache, html) {
  const assets = new Set(["/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"]);
  for (const m of html.matchAll(/["'(](\/_next\/static\/[^"'()\s\\]+)/g)) assets.add(m[1]);
  await Promise.all(
    [...assets].map(async (url) => {
      if (await cache.match(url)) return;
      try {
        const r = await fetch(url);
        if (r.ok) await cache.put(url, r);
      } catch {
        // Offline or a transient error: it will be retried on the next online visit.
      }
    }),
  );
}

async function precacheShell() {
  const cache = await caches.open(CACHE);
  const res = await fetch(SHELL, { cache: "reload" });
  if (!res.ok) throw new Error("shell fetch failed");
  const html = await res.clone().text();
  await cache.put(SHELL, res);
  await cacheAssetsFrom(cache, html);
}

self.addEventListener("install", (event) => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirstShell(event) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(event.request);
    if (res.ok) {
      const forCache = res.clone();
      const forParsing = res.clone();
      // After a new deploy the shell references new hashed files: cache them while we are online.
      event.waitUntil(
        cache
          .put(SHELL, forCache)
          .then(() => forParsing.text())
          .then((html) => cacheAssetsFrom(cache, html))
          .catch(() => {}),
      );
    }
    return res;
  } catch {
    const cached = await cache.match(SHELL);
    if (cached) return cached;
    throw new Error("offline and shell not cached");
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(request, res.clone());
  return res;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  const refresh = fetch(request)
    .then((res) => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => undefined);
  return hit ?? (await refresh) ?? Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate" && url.pathname === SHELL) {
    event.respondWith(networkFirstShell(event));
  } else if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
  } else if (url.pathname === "/manifest.webmanifest" || url.pathname.startsWith("/icons/")) {
    event.respondWith(staleWhileRevalidate(request));
  }
});
