module.exports = {
  globDirectory: ".",
  globPatterns: [
    "**/*.{html,js,css,json,png,ico,woff2}"
  ],
  globIgnores: ["node_modules/**/*"],
  swDest: "sw.js", // ВАЖНО: ты используешь sw.js, а не service-worker.js
  clientsClaim: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|ico)$/,
      handler: "CacheFirst",
      options: {
        cacheName: "images-cache",
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 дней
        },
      },
    },
    {
      urlPattern: /\.(?:js|css)$/,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-resources",
      },
    },
    {
      urlPattern: /\.(?:html)$/,
      handler: "NetworkFirst",
      options: {
        cacheName: "html-cache",
      },
    },
    {
      urlPattern: /\.(?:json)$/,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "json-cache",
      },
    }
  ]
};
