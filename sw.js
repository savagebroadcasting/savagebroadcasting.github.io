// SBC Service Worker — network-first HTML, cache-first assets
// Bump CACHE_VER to bust stale installs (e.g. "stuck blue banner" bug)
const CACHE_VER = 'sbc-v4';
const ASSET_CACHE = CACHE_VER + '-assets';
const HTML_EXTS = ['', '.html'];

function isHtml(url) {
  const u = new URL(url);
  const p = u.pathname;
  return p.endsWith('.html') || p.endsWith('/') || !p.includes('.');
}

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(ASSET_CACHE).then(c => c.addAll([
    'noise.png',
    'sbc-home-icon.png',
    'manifest.json',
  ])));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_VER && k !== ASSET_CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // HTML: network-first so page updates always propagate
  if (isHtml(req.url)) {
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_VER).then(c => c.put(req, clone));
        }
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Images/fonts/other assets: cache-first
  e.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(ASSET_CACHE).then(c => c.put(req, clone));
        }
        return res;
      });
    })
  );
});
