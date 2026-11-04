const CACHE_NAME='malawihub-offline-v3';
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key.startsWith('malawihub-offline-')&&key!==CACHE_NAME).map(key=>caches.delete(key)));
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if(url.origin!==location.origin) return;
  event.respondWith((async()=>{
    try{
      // Always check the live site first; bypass the WebView's HTTP cache.
      const freshRequest=new Request(event.request,{cache:'no-store'});
      const response=await fetch(freshRequest);
      if(response&&response.ok){
        const cache=await caches.open(CACHE_NAME);
        cache.put(event.request,response.clone()).catch(()=>{});
      }
      return response;
    }catch(error){
      const cached=await caches.match(event.request);
      if(cached)return cached;
      if(event.request.mode==='navigate'){
        const fallback=await caches.match(url.pathname);
        if(fallback)return fallback;
      }
      throw error;
    }
  })());
});