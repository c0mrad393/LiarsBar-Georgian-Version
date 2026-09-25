// Service worker (build step fills in the version and file list; see vite.config.js).
// - The app shell and its hashed files are cached on install: repeat visits open
//   instantly and solo play works offline.
// - Page loads go to the network first (so new versions arrive), falling back to
//   the cache when offline or slow.
// - Google Fonts are cached as they're used. The game server is never cached.
const VERSION = "__VERSION__";
const FILES = __FILES__;
const APP = `lb-app-${VERSION}`;
const FONTS = "lb-fonts";
const NAV_TIMEOUT = 3500;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(APP).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("lb-app-") && k !== APP).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, no) => setTimeout(() => no(new Error("timeout")), ms))]);
}

async function page(req) {
  const cache = await caches.open(APP);
  try {
    const res = await withTimeout(fetch(req), NAV_TIMEOUT);
    if (res.ok) cache.put("./", res.clone());
    return res;
  } catch {
    return (await cache.match("./")) || (await cache.match(req)) || Response.error();
  }
}

async function asset(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) (await caches.open(APP)).put(req, res.clone());
  return res;
}

async function font(req) {
  const cache = await caches.open(FONTS);
  const hit = await cache.match(req);
  const fresh = fetch(req).then((res) => { if (res.ok || res.type === "opaque") cache.put(req, res.clone()); return res; }).catch(() => hit);
  return hit || fresh;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (url.pathname.endsWith("/sw.js")) return;
    e.respondWith(req.mode === "navigate" ? page(req) : asset(req));
  } else if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(font(req));
  }
});
