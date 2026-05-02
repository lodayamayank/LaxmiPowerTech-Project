const STATIC_CACHE = 'lpt-static-v2';
const API_CACHE = 'lpt-api-v2';
const CACHE_NAMES = [STATIC_CACHE, API_CACHE];

const urlsToCache = [
  '/',
  '/login',
  '/manifest.json'
];

// GET API paths that are safe to cache for offline reads
const CACHEABLE_API_PATTERNS = [
  '/api/projects',
  '/api/branches',
  '/api/tasks',
  '/api/material/catalog',
  '/api/attendance'
];

// Install event - cache essential assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(urlsToCache).catch(err => {
          console.log('[SW] Static cache failed (non-critical):', err);
        });
      })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.map((name) => {
          if (!CACHE_NAMES.includes(name)) {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Helper: is this a GET API request we should cache?
function isCacheableAPI(url) {
  return CACHEABLE_API_PATTERNS.some(pattern => url.includes(pattern));
}

// Fetch event
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET and cross-origin
  if (request.method !== 'GET') return;
  if (!request.url.startsWith(self.location.origin) && !request.url.includes('/api/')) {
    return;
  }

  // ─── API requests: Network first, cache fallback ───
  if (request.url.includes('/api/') || isCacheableAPI(request.url)) {
    // Mutating endpoints (POST/PUT/DELETE) are skipped above (non-GET)
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.status === 200 && isCacheableAPI(request.url)) {
            const clone = response.clone();
            caches.open(API_CACHE).then(cache => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline: serve from API cache
          return caches.match(request).then(cached => {
            if (cached) {
              console.log('[SW] Serving cached API:', request.url);
              return cached;
            }
            return new Response(JSON.stringify({ offline: true, message: 'No cached data available' }), {
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            });
          });
        })
    );
    return;
  }

  // ─── Navigation: Network first, cached app shell fallback ───
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() => {
          return caches.match(request)
            .then(cached => cached || caches.match('/'))
            .then(cached => cached || caches.match('/login'));
        })
    );
    return;
  }

  // ─── Static assets: Cache first, network fallback ───
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (!response || response.status !== 200) return response;
        const clone = response.clone();
        caches.open(STATIC_CACHE).then(cache => cache.put(request, clone));
        return response;
      }).catch(() => {
        // Offline with no cache – return nothing
        return new Response('', { status: 503 });
      });
    })
  );
});