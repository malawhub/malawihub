const CACHE_NAME='malawihub-offline-v2';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  const u=new URL(e.request.url);
  if(u.origin!==location.origin) return;
  e.respondWith((async()=>{
    try{
      const response=await fetch(e.request);
      if(response && response.ok){
        const cache=await caches.open(CACHE_NAME);
        cache.put(e.request,response.clone()).catch(()=>{});
      }
      return response;
    }catch(err){
      const cached=await caches.match(e.request);
      if(cached) return cached;
      if(e.request.mode==='navigate'){
        const fallback=await caches.match(location.pathname);
        if(fallback) return fallback;
      }
      throw err;
    }
  })());
});