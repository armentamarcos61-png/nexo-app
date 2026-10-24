/* Nexo installable PWA — only public shell and versioned static assets.
 * NEVER cache Supabase auth, API responses, developer panel or user profiles.
 */
const ROOT='/nexo-app/';
const CACHE='nexo-public-shell-v1';
const STATIC='nexo-versioned-static-v1';
const PRECACHE=[
 ROOT,ROOT+'index.html',ROOT+'manifest.webmanifest',
 ROOT+'icons/nexo-192.png',ROOT+'icons/nexo-512.png',
 ROOT+'icons/nexo-maskable-512.png',
];
self.addEventListener('install',event=>{
 event.waitUntil(
  caches.open(CACHE).then(cache=>cache.addAll(PRECACHE))
  .then(()=>self.skipWaiting())
 );
});
self.addEventListener('activate',event=>{
 event.waitUntil((async()=>{
  const names=await caches.keys();
  await Promise.all(names
   .filter(name=>name.startsWith('nexo-')&&![CACHE,STATIC].includes(name))
   .map(name=>caches.delete(name)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch',event=>{
 const request=event.request;
 if(request.method!=='GET')return;
 const url=new URL(request.url);
 if(url.origin!==self.location.origin||!url.pathname.startsWith(ROOT)||
    url.pathname.startsWith(ROOT+'desarrollador/'))return;
 if(url.pathname.includes('nexo-control')||url.pathname.includes('/auth/')||
    url.pathname.includes('/api/')||url.pathname.includes('/knowledge/')||
    url.searchParams.has('access_token')||url.searchParams.has('code'))return;
 const isStatic=url.pathname.includes('/_expo/static/');
 if(isStatic){
  event.respondWith((async()=>{
   const cache=await caches.open(STATIC);
   const stored=await cache.match(request);
   if(stored)return stored;
   const response=await fetch(request);
   if(response.ok&&response.type==='basic')await cache.put(request,response.clone());
   return response;
  })());
  return;
 }
 if(request.mode==='navigate'){
  event.respondWith((async()=>{
   try{
    const response=await fetch(request);
    if(response.ok&&url.pathname===ROOT){
     const cache=await caches.open(CACHE);
     await cache.put(ROOT,response.clone());
    }
    return response;
   }catch{
    const cache=await caches.open(CACHE);
    return (await cache.match(ROOT))||
      Response.error();
   }
  })());
 }
});
