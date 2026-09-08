const CACHE_NAME = "malawihub-v7";
const APP_FILES = [
  "/","/index.html","/tutorial/index.html","/online-class/index.html","/online-class/admin.html","/online-class/resources.html","/css/style.css","/js/app.js","/js/supabase.js","/js/notes-visuals.js","/js/official-app.js","/manifest.json","/icons/icon.svg"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))));
  self.clients.claim();
});

function shouldEnhance(request, response) {
  if (request.method !== "GET") return false;
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) return false;
  const path = new URL(request.url).pathname;
  return /^\/resources\/(chemistry|mathematics|physics|biology|education|study-guides)\//.test(path);
}

async function enhanceNotes(response) {
  const html = await response.text();
  if (html.includes("malawihub-notes-visuals") || !html.includes("</body>")) return new Response(html, response);
  const injected = '<script src="/js/notes-visuals.js?v=1"></script>';
  const output = html.replace(/<\/body>/i, `${injected}</body>`);
  const headers = new Headers(response.headers);
  headers.set("content-type", "text/html; charset=UTF-8");
  return new Response(output, { status: response.status, statusText: response.statusText, headers });
}

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).then(async response => {
      const finalResponse = shouldEnhance(event.request, response) ? await enhanceNotes(response) : response;
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, finalResponse.clone()));
      return finalResponse;
    }).catch(() => caches.match(event.request))
  );
});
