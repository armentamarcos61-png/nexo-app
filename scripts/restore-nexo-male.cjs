#!/usr/bin/env node
'use strict';
// Restore the exact, approved male Nexo GLB from verified Git blobs.
// The 36 pieces are the original binary split without recompression.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const dir = path.join(root, '.nexo-male-parts');
const dest = path.join(root, 'public/models/Nexo_FacialReady_v1.glb');
const expectedLength = 8828344;
const expectedHash = '7c2f59fc8d046b986959b7d3de03a6a420607ea4ba9fc2b9968a4836be71ff7b';
const parts = Array.from({ length: 36 }, (_, i) => {
  const file = path.join(dir, 'part-' + String(i).padStart(2,'0') + '.bin');
  if (!fs.existsSync(file)) throw Error('Missing male Nexo piece ' + i);
  const data = fs.readFileSync(file);
  const length = i === 35 ? 226744 : 245760;
  if (data.length !== length) throw Error('Invalid male Nexo piece ' + i + ': ' + data.length);
  return data;
});
const model = Buffer.concat(parts);
const sha = crypto.createHash('sha256').update(model).digest('hex');
if (model.length !== expectedLength || sha !== expectedHash) {
  throw Error('Nexo 3D integrity mismatch: expected ' + expectedHash + ', got ' + sha);
}
if (model.toString('ascii',0,4) !== 'glTF' ||
    model.readUInt32LE(4) !== 2 || model.readUInt32LE(8) !== model.length ||
    model.toString('ascii',16,20) !== 'JSON') throw Error('Malformed Nexo GLB');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, model);
console.log('PASS: Nexo male model restored:', model.length, 'bytes, sha256', sha);
