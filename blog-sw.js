// Service Worker for Blog Page - Offline Support
// GitHub Pages compatible - uses relative paths
const CACHE_NAME = 'covera-blog-v1';
const RUNTIME_CACHE = 'covera-blog-runtime-v1';

// Get base path for GitHub Pages compatibility
// If site is at username.github.io/repo-name/, this will be '/repo-name/'
// If site is at username.github.io/, this will be '/'
const BASE_PATH = self.location.pathname.replace(/\/[^\/]*$/, '/');

// Assets to cache on install (using relative paths)
const PRECACHE_ASSETS = [
    './blog.html',
    './index.html',
    './Covera_logo.png',
    './covera_logo.png',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap',
    'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css'
];

// Install event - Cache assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(PRECACHE_ASSETS.map(url => {
                    try {
                        return new Request(url, { mode: 'no-cors' });
                    } catch {
                        return url;
                    }
                })).catch(err => {
                    console.log('Cache install failed:', err);
                });
            })
    );
    self.skipWaiting();
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((cacheName) => {
                        return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
                    })
                    .map((cacheName) => {
                        return caches.delete(cacheName);
                    })
            );
        })
    );
    return self.clients.claim();
});

// Fetch event - Serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }

                return fetch(event.request)
                    .then((response) => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response
                        const responseToCache = response.clone();

                        // Cache the response
                        caches.open(RUNTIME_CACHE)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(() => {
                        // Return offline page if available (GitHub Pages compatible)
                        if (event.request.destination === 'document') {
                            return caches.match('./blog.html') || caches.match('/blog.html');
                        }
                    });
            })
    );
});

// Message handler for cache updates
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

