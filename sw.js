const CACHE = "lose-to-study-v3.6-real-ascii-sharks";
const ASSETS = ["./","./index.html","./styles.css","./styles.css?v=3.6","./app.js","./dial.js","./ascii-bg.js","./ascii-bg.js?v=3.6","./manifest.webmanifest","./icons/icon-192.png","./icons/icon-512.png"];
self.addEventListener("install", event => event.waitUntil((async () => {
  const cache = await caches.open(CACHE);
  await cache.addAll(ASSETS);
  await self.skipWaiting();
})()));
self.addEventListener("activate", event => event.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
  await self.clients.claim();
})()));
self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const shell = req.mode === "navigate" || /\.(html|js|css|webmanifest)$/.test(url.pathname);
  if (!shell) {
    event.respondWith(caches.match(req).then(hit => hit || fetch(req)));
    return;
  }
  event.respondWith((async () => {
    try {
      const res = await fetch(req, {cache:"no-store"});
      if (res && res.ok) (await caches.open(CACHE)).put(req, res.clone());
      return res;
    } catch {
      return (await caches.match(req)) || (await caches.match("./index.html"));
    }
  })());
});
