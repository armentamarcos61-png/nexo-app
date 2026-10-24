#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {PNG}=require('pngjs');
const folder=process.argv[2]==='dist'?'dist':'public';
const root=path.join(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,folder,'desarrollador',p),'utf8');
const manifest=JSON.parse(read('manifest.webmanifest'));
const original=JSON.parse(fs.readFileSync(path.join(root,'public','manifest.webmanifest')));
const base='/nexo-app/desarrollador/';
assert.equal(manifest.name,'Nexo Desarrollador');
assert.equal(manifest.short_name,'Nexo Desarrollador');
assert.equal(manifest.id,base);
assert.equal(manifest.start_url,base);
assert.equal(manifest.scope,base);
assert.notEqual(manifest.id,original.id,'two installed apps require different IDs');
assert.equal(manifest.display,'standalone');
for(const [name,size] of [
 ['nexo-desarrollador-192.png',192],['nexo-desarrollador-512.png',512],
 ['nexo-desarrollador-maskable-512.png',512]
]){
 const image=PNG.sync.read(fs.readFileSync(path.join(root,folder,'desarrollador','icons',name)));
 assert.equal(image.width,size);
 assert.equal(image.height,size);
}
const shell=read('index.html');
assert(shell.includes('<title>Nexo Desarrollador'));
assert(shell.includes('href="'+base+'manifest.webmanifest"'));
assert(shell.includes('id="install-developer"'));
assert(shell.includes("addEventListener('beforeinstallprompt'"));
assert(shell.includes(base+'sw.js'));
assert(shell.includes("const API=BASE+'/functions/v1/nexo-control'"),
 'separate app must ACTUALLY operate the original Nexo backend');
assert(shell.includes('id="signin"')&&shell.includes('id="users"')&&
 shell.includes('id="commands"')&&shell.includes('data-tab="versions"'),
 'retained Nexo developer modules must not disappear');
assert(shell.includes("location.origin+'"+base+"'"),
 'email verification should return to standalone developer app');
assert(!shell.includes('href="/nexo-app/manifest.webmanifest"'),
 'developer app must never install under Nexo regular manifest');
const scripts=[...shell.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert(scripts.length>=2,'independent installation and admin logic are required');
scripts.forEach(script=>new Function(script[1]));
const sw=read('sw.js');
new Function(sw);
assert(!sw.includes('caches.open')&&!sw.includes('cache.put'),
 'private dashboards and sessions cannot be cached');
assert(sw.includes("cache:'no-store'"));
const parentSw=fs.readFileSync(path.join(root,folder,'sw.js'),'utf8');
assert(parentSw.includes("url.pathname.startsWith(ROOT+'desarrollador/')"),
 'public Nexo SW must not take over developer app network requests');
console.log('PASS: separate installable Nexo Desarrollador app, authenticated shared controls and zero admin caching');
