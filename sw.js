// Keeps the scanner page available without internet.
// Bump VERSION whenever the site files change so phones pick up the new copy.
const VERSION = 'kase-v6';
const SHELL = ['./', 'index.html', 'scan.html', 'admin.html', 'style.css', 'common.js', 'config.js', 'scan.js', 'admin.js',
  'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png'];
const ZXING = 'https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/umd/index.min.js';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then(async (c) => {
    await c.addAll(SHELL);
    try { await c.add(ZXING); } catch (err) { /* fetched later when needed */ }
  }).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                       // API calls go straight to the network
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && req.url !== ZXING) return;
  // Network first (so updates arrive), falling back to the saved copy when offline.
  e.respondWith(fetch(req).then((res) => {
    if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true })));
});
