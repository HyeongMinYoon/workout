/* 헬스장은 지하가 많다. 셸을 캐시해 두고, 온라인이면 조용히 갱신한다.
   기록 자체는 localStorage에 있으므로 이 캐시는 코드 파일만 다룬다.
   앱을 고칠 때마다 CACHE 값을 올려라 — 그래야 옛 셸이 정리된다. */
var CACHE = "set-logger-v12";
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

function save(req, res){
  if(res && res.ok){
    var copy = res.clone();
    caches.open(CACHE).then(function(c){ c.put(req, copy); });
  }
  return res;
}
// 캐시에 있으면 ms 뒤에 그걸 내놓는다. 캐시가 없으면 영영 resolve 하지 않고 네트워크를 기다린다.
function cacheAfter(req, ms){
  return new Promise(function(resolve){
    setTimeout(function(){
      caches.match(req).then(function(hit){ if(hit) resolve(hit); });
    }, ms);
  });
}

self.addEventListener("fetch", function(ev){
  var req = ev.request;
  if(req.method !== "GET") return;
  var url = new URL(req.url);
  if(url.origin !== self.location.origin) return;   // 유튜브 링크는 그대로 나간다

  // 앱 본체(index.html)는 네트워크 우선. 캐시 우선으로 두면 배포한 새 버전이
  // 다음 실행에야 보여서 "껐다 켜야 반영되는" 문제가 생긴다.
  // 느리거나 끊긴 회선에서는 2.5초 뒤 캐시로 넘어가므로 지하에서도 바로 뜬다.
  var isDoc = req.mode === "navigate"
    || url.pathname.endsWith("/") || url.pathname.endsWith("/index.html");
  if(isDoc){
    ev.respondWith(Promise.race([
      fetch(req).then(function(res){ return save(req, res); })
        .catch(function(){ return caches.match(req).then(function(h){
          return h || caches.match("./index.html"); }); }),
      cacheAfter(req, 2500)
    ]));
    return;
  }

  // 나머지(아이콘·매니페스트)는 캐시 우선 + 뒤에서 갱신
  ev.respondWith(
    caches.match(req).then(function(hit){
      var net = fetch(req).then(function(res){ return save(req, res); })
        .catch(function(){ return hit; });
      return hit || net;
    })
  );
});
