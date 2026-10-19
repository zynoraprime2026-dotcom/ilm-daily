// Ilm Daily service worker — offline shell + salat alarm support.
const CACHE = 'ilm-daily-v1';
const SHELL = ['/', '/index.html', '/stories.js', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) {
    // third-party (API, adhan audio): network first, cache adhan audio if it succeeds
    if (url.pathname.endsWith('.mp3')) {
      e.respondWith(
        caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
          const copy = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return r;
        }).catch(() => hit))
      );
    }
    return; // everything else cross-origin: straight to network
  }
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit =>
      hit || fetch(e.request).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return r;
      }).catch(() => caches.match('/', { ignoreSearch: true }))
    )
  );
});
