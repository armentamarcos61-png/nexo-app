#!/usr/bin/env node
'use strict';
// Restore user's new Nexa Android Prototype with five original body clips and
// thirteen hand-authored, localized facial morph targets. Never delete the
// previous Studio / full-body Nexa assets: they remain as archived backups.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const partDir=path.join(root,'.nexa-android-parts');
const destination=path.join(root,'public/models/Nexa_Android_FacialReady_v1.glb');
const sizes={parts:50,chunkBytes:245760,lastChunk:245196,totalBytes:12287436};
const expectedHash='0bfe6d6c385852d1970b0d4e96da0bb51ae05a237098c57142a4b24dac2cff16';
const chunks=[];
for(let i=0;i<sizes.parts;i++){
 const filename=path.join(partDir,'part-'+String(i).padStart(2,'0')+'.b64');
 if(!fs.existsSync(filename))throw new Error('Falta parte de Nexa: '+i);
 const encoded=fs.readFileSync(filename,'utf8').trim();
 const data=Buffer.from(encoded,'base64');
 const expected=i===sizes.parts-1?sizes.lastChunk:sizes.chunkBytes;
 if(data.length!==expected||data.toString('base64')!==encoded)
  throw new Error('Parte incorrecta de Nexa: '+i);
 chunks.push(data);
}
const bytes=Buffer.concat(chunks);
const digest=crypto.createHash('sha256').update(bytes).digest('hex');
if(bytes.length!==sizes.totalBytes||digest!==expectedHash)
 throw new Error('Integridad Nexa 3D falló: '+bytes.length+' sha256 '+digest);
if(bytes.toString('ascii',0,4)!=='glTF'||bytes.readUInt32LE(4)!==2||
 bytes.readUInt32LE(8)!==bytes.length||bytes.toString('ascii',16,20)!=='JSON')
 throw new Error('Formato GLB de Nexa inválido');
const jsonLength=bytes.readUInt32LE(12);
const gltf=JSON.parse(bytes.subarray(20,20+jsonLength).toString('utf8'));
const targets=gltf.meshes?.[0]?.extras?.targetNames??[];
for(const name of ['EyeBlinkLeft','EyeBlinkRight','BrowRaiseLeft','BrowRaiseRight',
 'BrowFrown','EyeLookLeft','EyeLookRight','EyeLookUp','EyeLookDown',
 'MouthOpen','MouthO','MouthWide','MouthSmile']){
 if(!targets.includes(name))throw new Error('Control facial faltante: '+name);
}
for(const name of ['Running','Walking','Confused_Scratch','Skip_Forward','Wave_One_Hand']){
 if(!gltf.animations?.some(a=>a.name===name))
  throw new Error('Animación corporal faltante: '+name);
}
if(!gltf.skins?.length||!gltf.images?.length)
 throw new Error('Nexa debe conservar esqueleto y texturas');
fs.mkdirSync(path.dirname(destination),{recursive:true});
fs.writeFileSync(destination,bytes);
console.log('PASS: nuevo Nexa 3D: '+bytes.length+' bytes, 13 gestos faciales, 5 clips, SHA-256 '+digest);
