const CACHE = 'amin-ai-site-v1';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './site.webmanifest',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './privacy.html',
  './terms.html',
  './demo/index.html',
  './demo/style.css',
  './demo/script.js',
  './demo/manifest.webmanifest'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
});
self.addEventListener('activate', e => self.clients.claim());
self.addEventListener('fetch', e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
