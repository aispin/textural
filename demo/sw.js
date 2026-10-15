/* Textural 落地页的 Service Worker：只为可安装 + 离线打开这页，不做花活。
   作用域 = /textural/，不会影响同域下的其它页面。 */
const CACHE = 'textural-v1';
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
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
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

  // 导航请求：网络优先（改版后立刻可见），断网回落缓存
  if(req.mode === 'navigate'){
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  // 静态资源：缓存优先，后台补一份
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy));
      return res;
    }))
  );
});
