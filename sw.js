var CACHE_NAME = 'cf-v1';
var urlsToCache = [
  './',
  'index.html',
  'css/style.css',
  'js/storage.js',
  'js/roster.js',
  'js/feedback.js',
  'js/history.js',
  'js/settings.js',
  'js/app.js',
  'manifest.json',
  'icon.svg'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request).then(function(response) {
      return response || fetch(event.request);
    })
  );
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(name) { return name !== CACHE_NAME; })
          .map(function(name) { return caches.delete(name); })
      );
    })
  );
});
