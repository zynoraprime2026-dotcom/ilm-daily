// Ilm Daily service worker — offline shell + offline Quran audio + salat alarm support.
const CACHE = 'ilm-daily-v11';
const AUDIO_CACHE = 'ilm-quran-audio';
const SHELL = ['./', './index.html', './stories.js', './quran.js', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  // shell items are cached individually: one flaky asset must not block the
  // whole update from installing
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(SHELL.map(u => c.add(u)))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== AUDIO_CACHE && k !== 'ilm-hadith-audio').map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Prayer-time push: show the notification; tapping opens the app and plays the adhan
self.addEventListener('push', e => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch (err) {}
  const prayer = data.prayer || 'prayer';
  const isTest = prayer === 'test';
  const isDaily = prayer === 'daily';
  const title = isDaily
    ? (data.title || 'Ilm Daily — verse & hadith of the day')
    : isTest ? 'Ilm Daily — test alarm' : 'Ilm Daily — it is time for ' + prayer.charAt(0).toUpperCase() + prayer.slice(1);
  e.waitUntil(self.registration.showNotification(title, {
    body: isDaily ? (data.body || 'Open for today\u2019s verse, hadith and prayer times.')
      : isTest ? 'Phone alarm works! You will be notified at every salah.' : 'Tap to listen to the adhan — حي على الصلاة',
    icon: './icon-192.png',
    badge: './icon-192.png',
    vibrate: isDaily ? [200, 100, 200] : [400, 200, 400, 200, 600],
    tag: isDaily ? 'ilm-daily-' + new Date().toISOString().slice(0, 10)
      : 'ilm-salat-' + prayer + '-' + (isTest ? Date.now() : new Date().toISOString().slice(0, 10)),
    renotify: !isTest && !isDaily,
    data: { prayer: prayer === 'test' ? 'fajr' : prayer, url: isDaily ? './' : './?adhan=' + encodeURIComponent(prayer) }
  }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const prayer = (e.notification.data && e.notification.data.prayer) || 'prayer';
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
    const win = ws.find(w => new URL(w.url).origin === location.origin);
    if (win) { win.focus(); win.postMessage({ playAdhan: prayer }); return; }
    return clients.openWindow('./?adhan=' + encodeURIComponent(prayer));
  }));
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
    // hadith-audio clips live in the page's 'ilm-hadith-audio' cache — skip
    // the double copy here
    if (url.pathname.endsWith('.mp3') && !url.pathname.includes('/hadith-audio/')) e.respondWith(serveAudio(e.request));
    // Google Fonts are versioned/immutable — cache-first keeps the Inter/Amiri
    // letterforms available offline instead of falling back to system fonts
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
      e.respondWith(caches.open(CACHE).then(async c =>
        (await c.match(e.request)) || fetch(e.request).then(r => { c.put(e.request, r.clone()); return r; })
      ));
    }
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
