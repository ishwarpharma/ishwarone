/* ============================================================
   sw.js — Ishwar Pharma PWA Service Worker v3
   - Install never fails: each file cached individually
   - HTML/JSON: network-first with cache fallback
   - Assets: cache-first with background refresh
   - Bump CACHE_NAME to force all users to update
   ============================================================ */

const CACHE_NAME = 'ishwarpharma-v3';

/* Core files — app cannot work without these */
const CORE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/users.json'
];

/* Best-effort files — cache if possible, ok to fail */
const OPTIONAL = [
  '/stock.xlsx',
  '/batch.xlsx',
  '/icon-192.png',
  '/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.28/jspdf.plugin.autotable.min.js'
];

/* ── Install: cache everything but never block on failures ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      /* Core files — try hard */
      try { await cache.addAll(CORE); } catch(e) { console.warn('SW: core cache failed', e); }

      /* Optional files — cache one by one, ignore failures */
      for (const url of OPTIONAL) {
        try { await cache.add(url); } catch(e) { console.warn('SW: skipped', url); }
      }
    }).then(() => self.skipWaiting())
  );
});

/* ── Activate: wipe old caches, claim clients immediately ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* ── Fetch strategy ─────────────────────────────────────── */
self.addEventListener('fetch', event => {
  /* Only handle GET requests */
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isHTMLorJSON = /\.(html|json)$/.test(url.pathname) || url.pathname === '/';

  if (isHTMLorJSON) {
    /* Network-first: always try fresh, fall back to cache */
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then(res => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return res;
        })
        .catch(() => caches.match(event.request)
          .then(cached => cached || new Response(
            '<h2 style="font-family:sans-serif;padding:2rem">Offline — please connect and refresh</h2>',
            { headers: { 'Content-Type': 'text/html' } }
          ))
        )
    );
  } else {
    /* Cache-first: serve from cache instantly, refresh in background */
    event.respondWith(
      caches.match(event.request).then(cached => {
        const networkFetch = fetch(event.request).then(res => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          }
          return res;
        }).catch(() => null);

        return cached || networkFetch;
      })
    );
  }
});
