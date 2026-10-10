#!/usr/bin/env node
'use strict';
// Reassembles the exact Nexa Studio GLB whose binary parts are stored in git.
// This avoids an external CDN and verifies the asset before publication.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, '.nexa-studio-parts');
const output = path.join(root, 'public/models/Nexa_Studio_Busto_v1.glb');
const files = Array.from({length:18},(_,i)=>path.join(dir,'part-'+String(i).padStart(2,'0')+'.bin'));
const parts = files.map((file, i)=>{
  if (!fs.existsSync(file)) throw new Error('Missing Studio binary part '+i);
  return fs.readFileSync(file);
});
const model = Buffer.concat(parts);
const expectedSize = 5322192;
const expectedSha = 'abf9c5435ae2188e675e2b038adbeb24e7b0d2d7';
const sha = crypto.createHash('sha1').update('blob '+model.length+'\0').update(model).digest('hex');
if (model.length !== expectedSize || sha !== expectedSha) {
  throw new Error('Nexa Studio binary integrity mismatch: bytes='+model.length+' sha='+sha);
}
if (model.toString('ascii',0,4) !== 'glTF' || model.readUInt32LE(4)!==2 ||
    model.readUInt32LE(8)!==model.length) throw new Error('Invalid Nexa Studio GLB header');
const jsonSize = model.readUInt32LE(12);
const doc = JSON.parse(model.subarray(20, 20+jsonSize).toString('utf8'));
const targets = doc.meshes?.[0]?.extras?.targetNames || [];
for(const name of ['MouthOpen','MouthO','MouthWide','MouthSmile',
 'EyeBlinkLeft','EyeBlinkRight','EyeLookLeft','EyeLookRight','EyeLookUp','EyeLookDown',
 'BrowRaiseLeft','BrowRaiseRight','BrowFrown']) {
 if (!targets.includes(name)) throw new Error('Nexa Studio missing facial morph '+name);
}
if (!doc.images?.length || !doc.skins?.length)
 throw new Error('Nexa Studio must retain its textures and skeletal skin');
fs.mkdirSync(path.dirname(output), {recursive:true});
fs.writeFileSync(output,model);
console.log('PASS: Nexa Studio published GLB, '+model.length+' bytes, '+targets.length+' facial targets, sha '+sha);
