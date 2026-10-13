/* 少年主公 · 离线缓存
   版本号跟着 APP_VERSION 走；发新版改这里，旧缓存会在 activate 时清掉。 */
const CACHE = "shaozhu-1.6.0";
const ASSETS = [
  "./", "./index.html", "./manifest.webmanifest", "./icons/icon.svg", "./icons/icon-180.png", "./icons/icon-512.png", "./css/style.css",
  "./js/config.js", "./js/util.js", "./js/store.js", "./js/rules.js", "./js/features.js", "./js/ui.js",
  "./js/views/today.js", "./js/views/week.js", "./js/views/heroes.js",
  "./js/views/stats.js", "./js/views/report.js", "./js/views/settings.js", "./js/main.js"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("shaozhu-") && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
// 网络优先、缓存兜底：有网时总拿最新版，没网时照样能用
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
  );
});
