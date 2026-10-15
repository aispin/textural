/* Textural 落地页的 Service Worker：只为可安装 + 离线打开这页，不做花活。
   作用域 = /textural/，不会影响同域下的其它页面。

   缓存策略：**网络优先**（在线永远拿最新，断网才回落缓存）。
   早先这里是 cache-first，导致老访客一直吃到旧的 textural.js ——
   新 HTML 已经有「下载 SVG」按钮、旧 JS 里却没有 toSVG()，
   于是报 `toSVG is not a function`。缓存名带版本号，每次发版自动作废旧缓存。 */
const CACHE = 'textural-__BUILD_VERSION__';
const SHELL = [
  './',
  './index.html',
  './textural.js',
  './manifest.webmanifest',
  './assets/logo.svg',
  './assets/favicon.svg',
  './assets/favicon-32.png',
  './assets/favicon-48.png',
  './assets/apple-touch-icon.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    // 不在这里 skipWaiting：新版本先待命，等页面上的提示被用户点过再接管，
    // 免得把正在调参的人静默刷掉。
    caches.open(CACHE).then(c => c.addAll(SHELL))
  );
});

self.addEventListener('message', e => {
  if(e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      // 只清自己的缓存：同域名下还有别的站点/应用，别误删
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith('textural-') && k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  const isNavigate = req.mode === 'navigate';
  // 导航请求统一缓存到 './index.html'，离线时用最后一份页面兜底
  const cacheKey = isNavigate ? './index.html' : req;

  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(cacheKey, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(cacheKey).then(hit => hit || caches.match('./index.html')))
  );
});
