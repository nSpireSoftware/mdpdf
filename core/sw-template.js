// Service Worker for {{APP_NAME}}
// Derived from core/sw-template.js — the canonical PDA service worker pattern.
//
// VERSIONING: This version string is bumped automatically by the GitHub Actions
// workflow whenever files under src/{{APP_SLUG}}/ change. Do not edit manually
// unless you are sure about what you are doing. Use `npm run bump {{APP_SLUG}}`
// instead.
//
// Cache name format: '{app-slug}-vN'
const CACHE_NAME = '{{APP_SLUG}}-v1';

// All URLs to cache on install. Must include:
// 1. The app shell (index.html, app.js, manifest.json, icons)
// 2. All CDN library URLs referenced in index.html
// Any URL not listed here may not be available offline.
const urlsToCache = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  // ADD CDN URLS HERE — must match the <script> / <link> tags in index.html
  // Example:
  // 'https://cdnjs.cloudflare.com/ajax/libs/example/1.0.0/example.min.js',
];

// ==================== INSTALL ====================
// Pre-cache all static assets. skipWaiting() makes the new SW take over
// immediately without waiting for existing clients to close.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// ==================== ACTIVATE ====================
// Delete all caches with a different name (old versions).
// clients.claim() makes the SW control existing open pages immediately.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      ))
      .then(() => self.clients.claim())
  );
});

// ==================== FETCH ====================
// Cache-first strategy: serve from cache when available, fall back to network.
// Dynamically cache any responses that match the DYNAMIC_CACHE_PATTERN below.
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (
          !networkResponse ||
          networkResponse.status !== 200 ||
          event.request.method !== 'GET'
        ) {
          return networkResponse;
        }

        // OPTIONAL: Dynamically cache certain network responses.
        // Example: cache font files (WOFF2/WOFF) as they are requested.
        // Adjust the pattern to match your app's dynamic assets.
        const url = event.request.url;
        const shouldDynamicallyCache = (
          // Example pattern — customise or remove as needed:
          // url.includes('some-cdn.com') && (url.endsWith('.woff2') || url.endsWith('.woff'))
          false
        );

        if (shouldDynamicallyCache) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }

        return networkResponse;
      });
    })
  );
});
