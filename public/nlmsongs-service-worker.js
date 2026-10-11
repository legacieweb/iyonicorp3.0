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
    let cacheWrite = Promise.resolve();
    const responsePromise = (async () => {
      try {
        const response = await fetch(request);
        if (response.ok && !response.bodyUsed) {
          const cacheCopy = response.clone();
          cacheWrite = caches.open(CACHE_NAME)
            .then((cache) => cache.put('/index.html', cacheCopy))
            .catch(() => {});
        }
        return response;
      } catch {
        return (await caches.match(request)) || (await caches.match('/index.html')) || (await caches.match('/'));
      }
    })();
    event.respondWith(responsePromise);
    event.waitUntil(responsePromise.then(() => cacheWrite).catch(() => {}));
    return;
  }

  const isAppAsset = ['script', 'style', 'image', 'font', 'worker'].includes(request.destination)
    || /\.(?:m?js|css|woff2?|png|jpe?g|svg|webp|ico)$/i.test(url.pathname);
  if (!isAppAsset) return;

  let cacheWrite = Promise.resolve();
  const responsePromise = (async () => {
    try {
      const response = await fetch(request);
      if (response.ok && response.type === 'basic' && !response.bodyUsed) {
        const cacheCopy = response.clone();
        cacheWrite = caches.open(CACHE_NAME)
          .then((cache) => cache.put(request, cacheCopy))
          .catch(() => {});
      }
      return response;
    } catch {
      return caches.match(request);
    }
  })();
  event.respondWith(responsePromise);
  event.waitUntil(responsePromise.then(() => cacheWrite).catch(() => {}));
});
