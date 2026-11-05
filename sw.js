/* ひと目トーク service worker: 本体を事前キャッシュし、オフラインで起動する */
var CACHE = 'hitome-talk-v15';
var ASSETS = [
  './',
  './index.html',
  './changelog.html',
  './license.html',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  /* 他オリジン(Googleフォント)は取りにいき、失敗したら何もしない = 端末の日本語フォントに切り替わる */
  if (url.origin !== location.origin) return;
  /* ネットワーク優先: つながれば最新を出して保存し直す。3秒で取れない・失敗したら保存分(機内モードでも起動できる) */
  var fromCache = function () {
    return caches.match(req, { ignoreSearch: true }).then(function (hit) {
      return hit || caches.match('./index.html');
    });
  };
  var network = fetch(req).then(function (res) {
    if (res.ok) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(req, copy); });
    }
    return res;
  });
  var timeout = new Promise(function (_, reject) { setTimeout(reject, 3000); });
  e.respondWith(Promise.race([network, timeout]).catch(fromCache));
});
