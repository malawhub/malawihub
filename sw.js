const CACHE_NAME = 'malawihub-offline-v3';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/online-class/student-resources.html',
  '/css/style.css',
  '/js/app.js',
  '/manifest.json',
  '/icons/icon.svg'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(CORE_ASSETS.map(async path => {
      try {
        const response = await fetch(path, { cache: 'reload' });
        if (response.ok) await cache.put(path, response);
      } catch (_) {
        // A single optional asset must not prevent the app shell from installing.
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('malawihub-offline-') && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache private dashboards, authentication pages, or online-class pages.
  // Offline access must not turn cached screens into an authentication bypass.
  const path = url.pathname.toLowerCase();
  const offlineNotesPage = path === '/online-class/student-resources.html';
  const sensitivePath = !offlineNotesPage && /\/(admin|teacher-portal|student-portal|online-class|business-portal)(\/|$)/.test(path);
  if (sensitivePath) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    try {
      const response = await fetch(request);
      if (response && response.ok && response.type === 'basic') {
        await cache.put(request, response.clone()).catch(() => {});
      }
      return response;
    } catch (_) {
      const cached = await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;
      if (request.mode === 'navigate') {
        const shell = await cache.match('/offline.html') || await cache.match('/index.html') || await cache.match('/');
        if (shell) return shell;
      }
      return new Response('This page is not available offline yet. Connect to the internet and open it once to make it available where supported.', {
        status: 503,
        statusText: 'Offline',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  })());
});
