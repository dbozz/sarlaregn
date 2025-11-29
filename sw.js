// Service Worker for offline support
const CACHE_NAME = 'sarlaregn-v20251129-001107';
const urlsToCache = [
  '/',
  '/index.html',
  '/settings.html',
  '/help.html',
  '/about.html',
  '/style.css?v=20251129-001107',
  '/js/jquery.min.js',
  '/js/jquery-ui.min.js',
  '/js/functions.js?v=20251129-001107',
  '/js/Dexie.min.js',
  '/jquery-ui.min.css',
  '/js.cookie.js',
  '/js/jquery.touchSwipe.min.js',
  '/images/arrowleft.png',
  '/images/arrowright.png',
  '/images/fontsizedown.png',
  '/images/fontsizeup.png',
  '/images/SR192.png',
  '/images/SR144.png'
];

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - Network first strategy for API calls, Cache first for assets
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Network first for API calls (Apps Script)
  if (url.origin === 'https://script.google.com') {
    event.respondWith(
      fetch(request)
        .then(response => {
          // Only cache successful responses with proper CORS
          if (response && response.status === 200 && response.type !== 'error' && response.type !== 'opaque') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, responseToCache));
          }
          return response;
        })
        .catch(error => {
          // Don't fall back to cache for API calls - let the error propagate
          // so the app can handle it properly
          console.log('API fetch failed:', error);
          return new Response(JSON.stringify({ error: 'Network error' }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // Cache first strategy for all other requests (assets, pages)
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(request)
          .then(response => {
            if (!response || response.status !== 200 || response.type === 'basic') {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, responseToCache));
            return response;
          })
          .catch(() => {
            // Optionally return a custom offline page or cached asset
            return caches.match('/index.html');
          });
      })
  );
});
