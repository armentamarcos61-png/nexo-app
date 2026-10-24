#!/usr/bin/env node
'use strict';
/* Nexo Desarrollador: a SEPARATE installable application that shares only
 * the authenticated Nexo Central API with the public marketplace.
 * Never cache admin HTML, credentials or private API responses.
 */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {PNG}=require('pngjs');
const root=path.join(__dirname,'..');
const target=process.argv[2]==='dist'?'dist':'public';
const out=path.join(root,target,'desarrollador');
const icons=path.join(out,'icons');
fs.mkdirSync(icons,{recursive:true});
const base='/nexo-app/desarrollador/';

function developerIcon(size,maskable=false){
 const source=path.join(root,'public','icons',maskable?'nexo-maskable-512.png':'nexo-512.png');
 const original=PNG.sync.read(fs.readFileSync(source));
 const result=new PNG({width:size,height:size});
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const sx=Math.floor(x*original.width/size);
  const sy=Math.floor(y*original.height/size);
  const dest=(y*size+x)*4,src=(sy*original.width+sx)*4;
  for(let c=0;c<4;c++)result.data[dest+c]=original.data[src+c];
 }
 function fill(x0,y0,w,h,color){
  for(let y=Math.max(0,Math.floor(y0));y<Math.min(size,Math.ceil(y0+h));y++)
  for(let x=Math.max(0,Math.floor(x0));x<Math.min(size,Math.ceil(x0+w));x++){
   const p=(y*size+x)*4;
   for(let c=0;c<4;c++)result.data[p+c]=color[c];
  }
 }
 // Dark, metallic developer badge with a distinct bright letter D.
 const k=size/512;
 const bx=Math.floor(size*.655),by=Math.floor(size*.645);
 const badge=Math.round(size*.23);
 fill(bx-6*k,by-6*k,badge+12*k,badge+12*k,[112,225,231,255]);
 fill(bx,by,badge,badge,[18,30,45,255]);
 const glyph=['11110','10001','10001','10001','10001','10001','11110'];
 const pixel=Math.max(2,Math.floor(badge/9));
 const x0=bx+Math.floor((badge-5*pixel)/2),y0=by+Math.floor((badge-7*pixel)/2);
 glyph.forEach((line,y)=>[...line].forEach((v,x)=>{
  if(v==='1')fill(x0+x*pixel,y0+y*pixel,pixel,pixel,[245,250,255,255]);
 }));
 return result;
}
for(const [name,size,mask] of [['nexo-desarrollador-192.png',192,false],
 ['nexo-desarrollador-512.png',512,false],
 ['nexo-desarrollador-maskable-512.png',512,true]]){
 fs.writeFileSync(path.join(icons,name),PNG.sync.write(developerIcon(size,mask)));
}
const manifest={
 name:'Nexo Desarrollador',
 short_name:'Nexo Desarrollador',
 description:'Aplicación independiente y privada para administrar Nexo con una cuenta de desarrollador verificada.',
 lang:'es-MX',id:base,start_url:base,scope:base,
 display:'standalone',display_override:['standalone','minimal-ui'],
 orientation:'any',background_color:'#061321',theme_color:'#07182c',
 categories:['business','productivity','utilities'],
 icons:[
  {src:base+'icons/nexo-desarrollador-192.png',sizes:'192x192',type:'image/png',purpose:'any'},
  {src:base+'icons/nexo-desarrollador-512.png',sizes:'512x512',type:'image/png',purpose:'any'},
  {src:base+'icons/nexo-desarrollador-maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'},
 ],
};
fs.writeFileSync(path.join(out,'manifest.webmanifest'),JSON.stringify(manifest,null,2)+'\n');
const sw=String.raw`/* Private Nexo Desarrollador PWA.
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
`;
fs.writeFileSync(path.join(out,'sw.js'),sw);
let html=fs.readFileSync(path.join(root,'public','nexo-control-panel.html'),'utf8');
assert(html.includes('const API=BASE'), 'Admin panel API was not found');
assert(html.includes("await admin")===false, 'Server access control must remain backend-side');
html=html.replace('<title>Nexo Control · Acceso de desarrollador</title>',
 '<title>Nexo Desarrollador · Centro de mando</title>\n'+
 '<link rel="manifest" href="'+base+'manifest.webmanifest">\n'+
 '<link rel="apple-touch-icon" href="'+base+'icons/nexo-desarrollador-192.png">\n'+
 '<meta name="application-name" content="Nexo Desarrollador">\n'+
 '<meta name="apple-mobile-web-app-capable" content="yes">\n'+
 '<meta name="apple-mobile-web-app-title" content="Nexo Desarrollador">');
html=html.replaceAll('/nexo-app/nexo-control-panel.html',base);
html=html.replace('NEXO <span>CONTROL</span>','NEXO <span>DESARROLLADOR</span>');
const styles=String.raw`
<style>
.developer-install{display:flex;gap:12px;align-items:center;justify-content:space-between;
 flex-wrap:wrap;padding:13px 15px;border-radius:18px;background:#12334a;
 border:1px solid #3a92a5;margin:20px 0 2px}
.developer-install h2{font-size:15px;margin:0 0 4px}
.developer-install p{font-size:11px;margin:0}
.developer-install button{min-width:170px}
#install-help{width:100%;font-size:12px;color:#d3e9fb}
</style>
`;
html=html.replace('</head>',styles+'\n</head>');
const banner=String.raw`
<div id="developer-install" class="developer-install">
 <div><h2>Nexo Desarrollador · App independiente</h2>
 <p>Instálala con su propio ícono. Administra Nexo original con tu cuenta verificada.</p></div>
 <button type="button" class="btn primary" id="install-developer">＋ Instalar Nexo Desarrollador</button>
 <p class="hidden" id="install-help">En Android abre esta dirección en Chrome, toca ⋮ y elige
 «Instalar aplicación» o «Agregar a pantalla principal». Así tendrás Nexo y
 Nexo Desarrollador como dos aplicaciones diferentes.</p>
</div>
`;
html=html.replace('<div class="wrap">','<div class="wrap">\n'+banner);
const install=String.raw`
<script>
(()=>{
 const control=document.getElementById('developer-install');
 const button=document.getElementById('install-developer');
 const help=document.getElementById('install-help');
 let deferred=null;
 if(window.matchMedia('(display-mode: standalone)').matches){control.hidden=true;}
 window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();deferred=event;
  button.textContent='↓ Instalar Nexo Desarrollador';
 });
 window.addEventListener('appinstalled',()=>{control.hidden=true;deferred=null;});
 button.addEventListener('click',async()=>{
  if(!deferred){help.classList.remove('hidden');return;}
  const prompt=deferred;deferred=null;
  await prompt.prompt();
  const choice=await prompt.userChoice;
  if(choice.outcome==='dismissed')help.classList.remove('hidden');
 });
 if('serviceWorker' in navigator && window.isSecureContext){
  navigator.serviceWorker.register('/nexo-app/desarrollador/sw.js',{
   scope:'/nexo-app/desarrollador/'
  }).catch(()=>{});
 }
})();
</script>
`;
html=html.replace('</body>',install+'\n</body>');
assert(html.includes('const API=BASE'), 'Lost the original administration logic');
assert(html.includes("await parse(await fetch("),'Lost the admin authentication');
assert(html.includes('<link rel="manifest"'),'Missing independent PWA manifest');
assert(!html.includes('/nexo-app/nexo-control-panel.html'),'The independent redirect was not migrated');
fs.writeFileSync(path.join(out,'index.html'),html);
console.log('Nexo Desarrollador created:',out,'independent app ID',manifest.id);
