const VERSION = "gongke-2026-10-15T03-13-13-518Z";
const CORE = ["./", "./index.html", "./version.json", "./manifest.webmanifest", "./favicon.svg", "./icon-180.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(CORE)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const fresh = request.mode === "navigate" || url.pathname.endsWith("/version.json");
  if (fresh) {
    event.respondWith(
      (async () => {
        try {
          const target = url.pathname.endsWith("/version.json")
            ? new Request(url.href + (url.search ? "&" : "?") + "_=" + Date.now(), { cache: "no-store" })
            : request;
          const response = await fetch(target);
          const cache = await caches.open(VERSION);
          if (response && response.ok) {
            await cache.put(request, response.clone());
            if (request.mode === "navigate") await cache.put(new URL("./index.html", self.registration.scope), response.clone());
          }
          return response;
        } catch {
          const cached =
            (await caches.match(request)) ||
            (await caches.match(new URL("./index.html", self.registration.scope))) ||
            (await caches.match(new URL("./", self.registration.scope)));
          return cached || Response.error();
        }
      })(),
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(VERSION);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response && response.ok) await cache.put(request, response.clone());
      return response;
    })(),
  );
});
