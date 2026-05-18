/* ============================================================
   sw.js — Ishwar Pharma PWA Service Worker
   Strategy: Network-first for HTML/JS, Cache-first for assets.
   Cache name bump forces update for all users automatically.
   ============================================================ */

const CACHE_NAME = 'ishwarpharma-v3';
const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/users.json',
  '/stock.xlsx',
  '/batch.xlsx',
  '/icon-192.png',
  '/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js'
];

// ── Install: pre-cache everything ──────────────────────────
self.addEventListener('install', event => {
  self.skipWaiting(); // activate immediately — this is what gives auto-updates
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
  );
});

// ── Activate: wipe old caches ───────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: network-first for HTML & JSON, cache-first for rest ─
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isHTMLorJSON = /\.(html|json)$/.test(url.pathname) || url.pathname === '/';

  if (isHTMLorJSON) {
    // Network first — always try to get fresh version
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache first — fast for xlsx/JS/icons
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        });
      })
    );
  }
});
