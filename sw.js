// ZMIANA: wersjonowanie cache — zmiana CACHE wymusza pobranie nowych plików przez wszystkich użytkowników
const CACHE = "ectscalc-v3";
const ZASOBY = [
  "./",
  "./index.html",
  "./app.js",
  "./style.css",
  "./favicon.ico",
  "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@700&display=swap"
];

self.addEventListener("install", (ev) => {
  ev.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ZASOBY)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (ev) => {
  if (ev.request.method !== "GET") return;
  ev.respondWith(
    caches.match(ev.request).then((cached) => {
      if (cached) return cached;
      return fetch(ev.request).then((res) => {
        if (!res || res.status !== 200 || res.type === "opaque") return res;
        const kopia = res.clone();
        caches.open(CACHE).then((c) => c.put(ev.request, kopia));
        return res;
      }).catch(() => caches.match("./index.html"));
    })
  );
});
