// Ilm Daily service worker — offline shell + offline Quran audio + salat alarm support.
const CACHE = 'ilm-daily-v4';
const AUDIO_CACHE = 'ilm-quran-audio';
const SHELL = ['./', './index.html', './stories.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== AUDIO_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Serve cached audio (offline downloads + anything played before). Handles Range
// requests by slicing the cached file so audio elements can seek while offline.
async function serveAudio(request) {
  const ac = await caches.open(AUDIO_CACHE);
  let hit = await ac.match(request);
  if (!hit) {
    const sc = await caches.open(CACHE);
    hit = await sc.match(request);
  }
  if (hit) {
    const range = request.headers.get('range');
    if (range) {
      try {
        const buf = await hit.clone().arrayBuffer();
        const m = range.match(/bytes=(\d+)-(\d*)/);
        const start = m ? +m[1] : 0;
        const end = (m && m[2]) ? +m[2] : buf.byteLength - 1;
        return new Response(buf.slice(start, end + 1), {
          status: 206,
          statusText: 'Partial Content',
          headers: {
            'Content-Type': hit.headers.get('Content-Type') || 'audio/mpeg',
            'Content-Range': `bytes ${start}-${end}/${buf.byteLength}`,
            'Content-Length': String(end - start + 1),
            'Accept-Ranges': 'bytes'
          }
        });
      } catch (e) { /* opaque response can't be sliced — return as-is */ }
    }
    return hit;
  }
  try {
    const r = await fetch(request);
    const copy = r.clone();
    caches.open(AUDIO_CACHE).then(c => c.put(request, copy));
    return r;
  } catch (e) {
    return new Response('', { status: 504, statusText: 'Offline and not saved for offline use' });
  }
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) {
    // third-party audio (Quran recitations, adhan): offline bucket first, else network (and cache)
    if (url.pathname.endsWith('.mp3')) e.respondWith(serveAudio(e.request));
    return; // everything else cross-origin: straight to network
  }
  if (e.request.mode === 'navigate' || (e.request.headers.get('accept') || '').includes('text/html')) {
    // network-first for pages: users always get the latest version, offline falls back to cache
    e.respondWith(
      fetch(e.request).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return r;
      }).catch(() => caches.match(e.request, { ignoreSearch: true }).then(hit => hit || caches.match('./index.html', { ignoreSearch: true })))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(hit =>
      hit || fetch(e.request).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return r;
      }).catch(() => caches.match('./', { ignoreSearch: true }))
    )
  );
});
