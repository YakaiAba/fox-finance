// Lấy từ mạng trước (chờ 4 giây), lỗi thì dùng bản đã lưu.
var CACHE = 'chitieu-v164';
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) { e.waitUntil(self.clients.claim()); });
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var u = new URL(e.request.url);
  if (u.origin !== location.origin) return;
  e.respondWith((async function () {
    var c = await caches.open(CACHE);
    try {
      var r = await Promise.race([
        fetch(e.request),
        new Promise(function (_, rej) { setTimeout(function () { rej('timeout'); }, 4000); })
      ]);
      if (r && r.ok) c.put(e.request, r.clone());
      return r;
    } catch (err) {
      var m = await c.match(e.request, { ignoreSearch: true });
      if (m) return m;
      var home = await c.match('./');
      return home || Response.error();
    }
  })());
});
