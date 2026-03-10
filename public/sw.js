const CACHE = 'medapp-pwa-v7';
const ASSETS = [
  '/',
  '/manifest.webmanifest?v=4',
  '/medapp-launcher-192-v2.png',
  '/medapp-launcher-512-v2.png',
  '/medapp-launcher-maskable-192-v3.png',
  '/medapp-launcher-maskable-512-v3.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const requestUrl = new URL(event.request.url);
  const isNavigationRequest =
    event.request.mode === 'navigate' ||
    (event.request.headers.get('accept') || '').includes('text/html');

  if (isNavigationRequest) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          return caches.match('/');
        })
    );
    return;
  }

  if (requestUrl.pathname.endsWith('/sw.js')) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
        return response;
      });
    })
  );
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type !== 'medapp-schedule-notification') return;

  const delayMs = Number(data.delayMs);
  const title = typeof data.title === 'string' ? data.title : 'Lembrete MedApp';
  const body = typeof data.body === 'string' ? data.body : '';

  if (!Number.isFinite(delayMs) || delayMs < 0 || delayMs > 24 * 60 * 60 * 1000) {
    return;
  }

  event.waitUntil(
    new Promise((resolve) => {
      setTimeout(() => {
        self.registration
          .showNotification(title, {
            body,
            tag: `medapp-scheduled-${Date.now()}`
          })
          .finally(resolve);
      }, delayMs);
    })
  );
});
