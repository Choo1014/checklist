// 새 버전을 올릴 때마다 VERSION 숫자를 올리면 앱이 다음 실행 때 업데이트돼요.
const VERSION = "v20";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./vendor/firebase-app-compat.js", "./vendor/firebase-auth-compat.js", "./vendor/firebase-firestore-compat.js"];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache: "reload" })))).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// 인터넷이 되면 항상 서버에서 최신 파일을 받고(브라우저 캐시도 건너뜀), 안 되면 저장해 둔 파일로 열어요.
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  const same = new URL(e.request.url).origin === location.origin;
  const net = same ? fetch(e.request.url, { cache: "no-cache" }) : fetch(e.request);
  e.respondWith(
    net.then(r => {
      if (r.ok && same) { const copy = r.clone(); caches.open(VERSION).then(c => c.put(e.request.url, copy)); }
      return r;
    }).catch(() => caches.match(e.request.url, { ignoreSearch: true }).then(r => r || caches.match("./index.html")))
  );
});
