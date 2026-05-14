// ===== SERVICE WORKER - KONCOPOS =====
// Strategy: Network first ALWAYS - tidak ada cache
// Vercel sudah handle CDN caching dengan benar

const CACHE_NAME = 'koncopos-v2';

// Install - langsung aktif, skip waiting
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Activate - hapus SEMUA cache lama tanpa kecuali
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch - Network first, NO caching
// Hanya GET same-origin: jangan intercept cross-origin (GAS/script.google.com),
// supaya CORS tidak digabung error SW ("Failed to convert value to 'Response'").
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  var url;
  try {
    url = new URL(e.request.url);
  } catch (err) {
    return;
  }
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    fetch(e.request, { cache: 'no-store' })
      .catch(function () {
        return caches.match(e.request).then(function (cached) {
          return cached || new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});

