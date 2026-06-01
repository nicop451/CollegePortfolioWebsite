var CACHE = 'nico-dashboard-v4';
var ASSETS = [
    '/',
    '/index.html',
    '/books.html',
    '/styles.css',
    '/manifest.json',
    '/icons/icon.svg'
];

self.addEventListener('install', function (event) {
    event.waitUntil(
        caches.open(CACHE).then(function (cache) {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', function (event) {
    event.waitUntil(
        caches.keys().then(function (keys) {
            return Promise.all(keys.map(function (k) {
                if (k !== CACHE) return caches.delete(k);
            }));
        }).then(function () { return self.clients.claim(); })
    );
});

self.addEventListener('fetch', function (event) {
    if (event.request.method !== 'GET') return;

    var url = new URL(event.request.url);

    // Never cache API or JS — always fetch fresh after deploys
    if (url.pathname.indexOf('/api/') === 0 || url.pathname.endsWith('.js')) {
        event.respondWith(fetch(event.request));
        return;
    }

    event.respondWith(
        caches.match(event.request).then(function (cached) {
            return cached || fetch(event.request);
        })
    );
});
