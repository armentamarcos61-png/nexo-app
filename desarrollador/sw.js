/* Private Nexo Desarrollador PWA.
 * Deliberately network-only: NEVER save credentials, personal information or
 * dashboards in CacheStorage (including offline fallbacks).
 */
const SCOPE='/nexo-app/desarrollador/';
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin||
    !url.pathname.startsWith(SCOPE))return;
 event.respondWith(fetch(request,{cache:'no-store'}));
});
