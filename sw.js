var CACHE_NAME = 'cf-v2.0.10';

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll([
        'css/style.css',
        'js/storage.js', 'js/roster.js', 'js/feedback.js',
        'js/history.js', 'js/settings.js', 'js/app.js', 'js/xlsx.full.min.js',
        'manifest.json', 'icon.svg'
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', function(event) {
  var url = new URL(event.request.url);
  // Network-first for HTML to always get latest version
  if (event.request.method !== 'GET') return;
  if (url.pathname.endsWith('.html') || url.pathname === '/' || url.pathname.endsWith('/')) {
    event.respondWith(
      fetch(event.request).catch(function() {
        return caches.match(event.request);
      })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(function(response) {
        return response || fetch(event.request);
      })
    );
  }
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(name) { return name !== CACHE_NAME; })
          .map(function(name) { return caches.delete(name); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then(function(names) {
      return Promise.all(names.map(function(n) { return caches.delete(n); }));
    });
  }
});
