#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {PNG}=require('pngjs');
const root=path.join(__dirname,'..');
const folder=process.argv.includes('--dist')?'dist':'public';
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const manifest=JSON.parse(read(folder+'/manifest.webmanifest'));
assert.equal(manifest.short_name,'Nexo');
assert.equal(manifest.name.startsWith('Nexo'),true);
assert.equal(manifest.display,'standalone');
assert.equal(manifest.scope,'/nexo-app/');
assert.equal(manifest.start_url,'/nexo-app/');
assert.equal(manifest.id,'/nexo-app/');
assert(manifest.icons.some(x=>x.sizes==='192x192'&&x.purpose==='any'));
assert(manifest.icons.some(x=>x.sizes==='512x512'&&x.purpose==='any'));
assert(manifest.icons.some(x=>x.sizes==='512x512'&&x.purpose==='maskable'));
for(const [filename,size] of [
 ['nexo-192.png',192],['nexo-512.png',512],
 ['nexo-maskable-512.png',512],
]){
 const file=path.join(root,folder,'icons',filename);
 assert(fs.statSync(file).size>300,'missing valid official-logo icon '+file);
 const image=PNG.sync.read(fs.readFileSync(file));
 assert.equal(image.width,size);assert.equal(image.height,size);
}
const sw=read(folder+'/sw.js');
new Function(sw);
assert(sw.includes("const ROOT='/nexo-app/'"));
assert(sw.includes("addEventListener('install'"));
assert(sw.includes("addEventListener('fetch'"));
assert(sw.includes("request.mode==='navigate'"));
assert(sw.includes("url.origin!==self.location.origin"));
assert(sw.includes("url.pathname.includes('nexo-control')"));
assert(!sw.includes("cache.put('/auth/"),'do not cache private auth responses');
const html=read('src/app/+html.tsx');
assert(html.includes('rel="manifest"'));
assert(html.includes('href="/nexo-app/manifest.webmanifest"'));
assert(html.includes('apple-touch-icon'));
const button=read('src/components/nexo-install-banner.tsx');
assert(button.includes('beforeinstallprompt'));
assert(button.includes('prompt.prompt()'));
assert(button.includes('navigator.serviceWorker.register'));
assert(button.includes('/nexo-app/sw.js'));
assert(button.includes('Agregar Nexo a mi pantalla'));
assert(read('src/app/index.tsx').includes('<NexoInstallBanner'));
assert(read('src/app/bienvenida.tsx').includes('<NexoInstallBanner'));
if(folder==='dist'){
 const compiled=read('dist/index.html');
 assert(compiled.includes('manifest.webmanifest'),
  'Expo static HTML must contain install manifest in head');
 assert(compiled.includes('apple-touch-icon'),
  'compiled site missing Nexo app icon');
}
console.log('PASS NEXO PWA: installable official logo, standalone scope, Chrome prompt, safe SW and Android 192/512 PNG');
