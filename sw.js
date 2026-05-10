const CACHE_NAME = 'guiwuben-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/icon-512.png'
  '/guiwuben/',
  '/guiwuben/index.html',
  '/guiwuben/style.css',
  '/guiwuben/script.js',
  '/guiwuben/manifest.json',
  '/guiwuben/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});
