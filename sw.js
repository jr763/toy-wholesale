// 奧斯卡管理系統 Service Worker
// 策略：只要有網路，一律先去抓最新版本（跟平常開網頁一樣）；
// 只有真的斷網的時候，才會用快取裡的舊版本頂著用。
// 這樣「有沒有裝成PWA」在更新這件事上幾乎沒有差別，不會卡在舊版本。

const CACHE_NAME = 'oscar-app-v1'; // 之後如果要強制清掉舊快取，改這個版本號就好
const CORE_ASSETS = [
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 安裝階段：預先把核心檔案存進快取，並且立刻讓新版 Service Worker 生效，
// 不用等使用者把分頁全部關掉才會換新版
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).catch(()=>{})
  );
  self.skipWaiting();
});

// 啟用階段：清掉舊版本留下的快取，並立刻接管所有分頁
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 抓取階段：網路優先，離線才用快取
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return; // 只處理讀取請求，存檔等動作不經過這裡

  event.respondWith(
    fetch(event.request)
      .then(res => {
        // 拿到最新版本，順便更新快取，下次離線時才有東西可以用
        const resClone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone)).catch(()=>{});
        return res;
      })
      .catch(() =>
        // 網路連不上，才退回用快取裡的舊版本
        caches.match(event.request).then(cached => cached || caches.match('./index.html'))
      )
  );
});
