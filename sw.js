// Bump CACHE when shipping a new version so phones pick it up.
const CACHE = "jst-v2";
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  // Only handle this app's own files; receipt scans go straight to the API.
  if (e.request.method !== "GET" || url.origin !== location.origin) return;

  if (e.request.mode === "navigate") {
    // Network first so updates arrive, but fall back to the cached app within 3 s on a weak signal.
    e.respondWith((async () => {
      const cached = await caches.match("./index.html");
      try {
        const res = await Promise.race([
          fetch(e.request),
          new Promise((_, rej) => setTimeout(() => rej(new Error("slow")), cached ? 3000 : 30000)),
        ]);
        if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put("./index.html", copy)); }
        return res;
      } catch {
        return cached || Response.error();
      }
    })());
    return;
  }

  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
