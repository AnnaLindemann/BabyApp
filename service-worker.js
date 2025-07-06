// 0) Обрабатываем команду «пропусти ожидание» из страницы
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
// 1) Автоматическое версионирование кэша по времени
const CACHE_PREFIX = "baby-tracker-cache";
const CACHE_NAME = `${CACHE_PREFIX}-${Date.now()}`;

// 2) Список файлов для кэширования «app shell»
const FILES_TO_CACHE = [
  "index.html",
  "style.css",
  "index.js",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

// 3) При установке — сразу кэшируем все статические ресурсы
self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
});

// 4) При активации — удаляем все старые кэши с этим префиксом, кроме текущего
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

// 5) При запросах — фильтруем ненужные схемы и методы, затем cache-first + network update
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Игнорируем всё, что не наш собственный GET по http/https
  if (
    req.method !== "GET" ||
    (url.protocol !== "http:" && url.protocol !== "https:")
  ) {
    return;
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(req)
        .then((networkResponse) => {
          // Кэшируем только успешные ответы из того же источника
          if (
            networkResponse &&
            networkResponse.status === 200 &&
            networkResponse.type === "basic"
          ) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(req, clone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Если сеть недоступна и в кеше ничего нет — вернуть офлайн-ответ
          return new Response("❌ Offline", { status: 503 });
        });
    })
  );
});
