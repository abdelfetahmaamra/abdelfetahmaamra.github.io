/* Ronaq El Hayat — offline-friendly cache for slow/unstable mobile networks.
   Static files: served from cache instantly, refreshed in the background.
   Catalog (/api/storefront): network first, cache if the network is down.
   Orders and all POST requests always go to the network. */
const VERSION = "ronaq-v2";
const CORE = ["index.html", "product.html", "cart.html", "merci.html", "assets/styles.css", "assets/app.js", "assets/config.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.pathname.endsWith("/api/storefront")) {
    e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); return res; }).catch(() => caches.match(req)));
    return;
  }
  if (url.pathname.startsWith("/api/") || url.pathname.endsWith("admin.html") || url.pathname.includes("/assets/admin")) return;
  const sameOrigin = url.origin === self.location.origin;
  const cacheable = sameOrigin || url.hostname === "fonts.gstatic.com" || url.hostname === "fonts.googleapis.com" || url.hostname.endsWith(".convex.cloud");
  if (!cacheable) return;
  e.respondWith(caches.open(VERSION).then((c) => c.match(req, { ignoreSearch: sameOrigin && url.pathname.endsWith(".html") }).then((hit) => {
    const net = fetch(req).then((res) => { if (res.ok || res.type === "opaque") c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  })));
});
