// if(!self.define){let e,n={};const s=(s,i)=>(s=new URL(s+".js",i).href,n[s]||new Promise(n=>{if("document"in self){const e=document.createElement("script");e.src=s,e.onload=n,document.head.appendChild(e)}else e=s,importScripts(s),n()}).then(()=>{let e=n[s];if(!e)throw new Error(`Module ${s} didn’t register its module`);return e}));self.define=(i,c)=>{const o=e||("document"in self?document.currentScript.src:"")||location.href;if(n[o])return;let a={};const r=e=>s(e,o),t={module:{uri:o},exports:a,require:r};n[o]=Promise.all(i.map(e=>t[e]||r(e))).then(e=>(c(...e),a))}}define(["./workbox-e8acb423"],function(e){"use strict";self.skipWaiting(),e.clientsClaim(),e.precacheAndRoute([{url:"icons/icon-192.png",revision:"e679a7a7ff6222171c7bec458f11f671"},{url:"icons/icon-512.png",revision:"fc58611e6f00b48942cff8eaa721ba74"},{url:"index.html",revision:"456eb5456dd626a7eb4e1538602b6704"},{url:"index.js",revision:"f4a571358affe974e86263df3aa1f32c"},{url:"manifest.json",revision:"78b820a0b74255bd3b4a77450a49d27f"},{url:"package-lock.json",revision:"b085d0ed42725b0552a7f90bf74fd19d"},{url:"package.json",revision:"d7a79d0e621ae2e512548fd87cd08518"},{url:"style.css",revision:"a6abde92693058cf4afe7d105786da4e"}],{}),e.registerRoute(/\.(?:png|jpg|jpeg|svg|gif|ico)$/,new e.CacheFirst({cacheName:"images-cache",plugins:[new e.ExpirationPlugin({maxEntries:60,maxAgeSeconds:2592e3})]}),"GET"),e.registerRoute(/\.(?:js|css)$/,new e.StaleWhileRevalidate({cacheName:"static-resources",plugins:[]}),"GET"),e.registerRoute(/\.(?:html)$/,new e.NetworkFirst({cacheName:"html-cache",plugins:[]}),"GET"),e.registerRoute(/\.(?:json)$/,new e.StaleWhileRevalidate({cacheName:"json-cache",plugins:[]}),"GET")});
//# sourceMappingURL=sw.js.map
// sw.js — BabyApp (Workbox 6.x)
// Обновлён: 2025-10-22

// 1) Подключаем Workbox с CDN Google
// sw.js — BabyApp (Workbox 6.x)
// Обновлён: 2025-10-22

// 1) Подключаем Workbox с CDN Google
importScripts(
  "https://storage.googleapis.com/workbox-cdn/releases/6.6.1/workbox-sw.js"
);

// 2) Немедленно активируем новую версию SW
workbox.core.skipWaiting();
workbox.core.clientsClaim();

// (опционально) Чуть аккуратнее называем кэши
workbox.core.setCacheNameDetails({
  prefix: "babyapp",
  suffix: "v1",
});

// Чистим устаревшие кэши при обновлении
workbox.precaching.cleanupOutdatedCaches();

// 3) Precache — укажи все файлы, нужные офлайн
// ВАЖНО: меняй `revision` у обновлённых файлов при каждом деплое!
workbox.precaching.precacheAndRoute(
  [
    { url: "index.html", revision: "2025-10-22-2" }, // ← обнови если меняешь HTML
    { url: "index.js", revision: "2025-10-22-2" }, // ← обнови если меняешь JS
    { url: "style.css", revision: "a6abde92693058cf4afe7d105786da4e" },
    { url: "manifest.json", revision: "78b820a0b74255bd3b4a77450a49d27f" },
    { url: "icons/icon-192.png", revision: "e679a7a7ff6222171c7bec458f11f671" },
    { url: "icons/icon-512.png", revision: "fc58611e6f00b48942cff8eaa721ba74" },
  ],
  {
    // игнорируем URL-параметры вида ?v=...
    ignoreURLParametersMatching: [/^v$/],
  }
);

// 4) Роуты для динамических запросов

// Картинки — Cache First (с ограничением)
workbox.routing.registerRoute(
  ({ request }) => request.destination === "image",
  new workbox.strategies.CacheFirst({
    cacheName: "babyapp-images",
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30 дней
      }),
    ],
  })
);

// JS/CSS — Stale While Revalidate
workbox.routing.registerRoute(
  ({ request }) =>
    request.destination === "script" || request.destination === "style",
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: "babyapp-static",
  })
);

// JSON — Stale While Revalidate
workbox.routing.registerRoute(
  ({ request }) =>
    (request.destination === "document" && request.url.endsWith(".json")) ||
    request.destination === "json",
  new workbox.strategies.StaleWhileRevalidate({
    cacheName: "babyapp-json",
  })
);

// HTML страницы — Network First (с офлайновым fallback на index.html)
workbox.routing.registerRoute(
  ({ request }) => request.mode === "navigate",
  new workbox.strategies.NetworkFirst({
    cacheName: "babyapp-html",
    networkTimeoutSeconds: 3, // даём сети 3с, потом из кэша
    plugins: [],
  })
);

// Fallback для SPA-навигации (если сети нет) — отдаём index.html из precache
const handler = workbox.precaching.createHandlerBoundToURL("/index.html");
const navigationRoute = new workbox.routing.NavigationRoute(handler, {
  denylist: [/^\/api\//], // если есть API — не перехватывать
});
workbox.routing.registerRoute(navigationRoute);

// 5) Поддержка ручного SKIP_WAITING из клиента (у тебя это уже вызывается)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
