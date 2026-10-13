/* 少年主公 · 离线缓存
   策略：
   - 导航请求用 network-first —— 有网时总能拿到最新版本，断网时回退到缓存
   - 其余 GET 用 cache-first
   - 缓存名带版本号，升级时自动清掉旧缓存
   版本号要和 js/config.js 里的 APP_VERSION 保持一致（npm test 会检查）。
   拆成多文件之后，cache-first 意味着：改了任何 js/css 却没升版本号，
   iPad 上会一直跑旧代码。所以每次发版都要改这里的 VERSION。 */
const VERSION = "1.6.0";
const CACHE = "shaozhu-v" + VERSION;
// 预缓存清单：必须覆盖 index.html 引用的每一个文件，否则断网打不开（npm test 会检查）
const ASSETS = [
  "./", "./index.html", "./manifest.webmanifest", "./css/style.css",
  "./icons/icon.svg", "./icons/icon-180.png", "./icons/icon-512.png",
  "./js/config.js", "./js/util.js", "./js/store.js", "./js/rules.js", "./js/features.js", "./js/ui.js",
  "./js/views/today.js", "./js/views/week.js", "./js/views/heroes.js",
  "./js/views/stats.js", "./js/views/report.js", "./js/views/settings.js",
  "./js/main.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      // cache:"reload" 绕过浏览器的 HTTP 缓存，避免新版本缓存里装进旧文件
      .then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: "reload" }))))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== location.origin) return;   // 只管本站资源

  // 页面导航：先走网络，失败再吃缓存
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          // 只缓存正常页面，别把 404 / 500 存成离线首页
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put("./index.html", copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  // 其他静态资源：缓存优先（忽略 ?v= 之类的查询串）
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      });
    })
  );
});
