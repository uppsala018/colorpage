const CACHE = "coloringai-v2";
const SHELL = [
  "/",
  "/studio",
  "/demo-regions.svg",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);

  if (url.origin !== self.location.origin) return;

  // Never serve app routes from cache. Login/signup/create must always get the
  // current deployment so auth code cannot get stuck on an old bundle.
  if (e.request.mode === "navigate") {
    e.respondWith(fetch(e.request).catch(() => caches.match("/") || Response.error()));
    return;
  }

  const cacheable =
    url.pathname.startsWith("/_next/static/") ||
    SHELL.includes(url.pathname);
  if (!cacheable) return;

  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((res) => {
        if (!res || res.status !== 200 || res.type === "opaque") return res;
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match("/studio"));
    })
  );
});
