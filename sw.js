/* 헬스장은 지하가 많다. 셸을 캐시해 두고, 온라인이면 조용히 갱신한다.
   기록 자체는 localStorage에 있으므로 이 캐시는 코드 파일만 다룬다.
   앱을 고칠 때마다 CACHE 값을 올려라 — 그래야 옛 셸이 정리된다. */
var CACHE = "set-logger-v1";
var SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon.svg",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];

self.addEventListener("install", function(ev){
  ev.waitUntil(
    caches.open(CACHE)
      .then(function(c){ return c.addAll(SHELL); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(ev){
  ev.waitUntil(
    caches.keys()
      .then(function(ks){
        return Promise.all(ks.map(function(k){
          return k===CACHE ? null : caches.delete(k); }));
      })
      .then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(ev){
  var req = ev.request;
  if(req.method !== "GET") return;
  if(new URL(req.url).origin !== self.location.origin) return;  // 유튜브 링크는 그대로 나간다
  ev.respondWith(
    caches.match(req).then(function(hit){
      var net = fetch(req).then(function(res){
        if(res && res.ok){
          var copy = res.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return res;
      }).catch(function(){ return hit; });
      return hit || net;
    })
  );
});
