const CACHE_NAME = 'nlmsongs-app-shell-v1';
const APP_SHELL = ['/', '/index.html', '/favicon.png', '/logo.png'];
const NEVER_CACHE = /^\/(?:api|auth|user|socket\.io|uploads)(?:\/|$)/i;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.filter((key) => key.startsWith('nlmsongs-app-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key)),
  )).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || NEVER_CACHE.test(url.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then((response) => {
      if (response.ok) void caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', response.clone()));
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match('/index.html')) || (await caches.match('/'))));
    return;
  }

  const isAppAsset = ['script', 'style', 'image', 'font', 'worker'].includes(request.destination)
    || /\.(?:m?js|css|woff2?|png|jpe?g|svg|webp|ico)$/i.test(url.pathname);
  if (!isAppAsset) return;

  event.respondWith(caches.match(request).then((cached) => {
    const fresh = fetch(request).then((response) => {
      if (response.ok && response.type === 'basic') void caches.open(CACHE_NAME).then((cache) => cache.put(request, response.clone()));
      return response;
    });
    return cached || fresh;
  }).catch(() => caches.match(request)));
});
