#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const crypto=require('node:crypto');
const assert=require('node:assert/strict');
const file='public/models/Nexa_Android_FacialReady_v1.glb';
const bytes=fs.readFileSync(file);
assert.equal(bytes.length,12287436,'Nexa new GLB must not be truncated');
assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),
 '0bfe6d6c385852d1970b0d4e96da0bb51ae05a237098c57142a4b24dac2cff16');
const jsonSize=bytes.readUInt32LE(12);
const doc=JSON.parse(bytes.subarray(20,20+jsonSize).toString('utf8'));
const binaryOffset=28+jsonSize;
const mesh=doc.meshes[0];
const prim=mesh.primitives[0];
const names=mesh.extras.targetNames;
const motions=['Running','Walking','Confused_Scratch','Skip_Forward','Wave_One_Hand'];
assert.equal(motions.length,doc.animations.length);
for(const name of motions){
 assert(doc.animations.some(a=>a.name===name),'Missing original motion: '+name);
}
const face=['EyeBlinkLeft','EyeBlinkRight','BrowRaiseLeft','BrowRaiseRight',
 'BrowFrown','EyeLookLeft','EyeLookRight','EyeLookUp','EyeLookDown',
 'MouthOpen','MouthO','MouthWide','MouthSmile'];
assert.equal(face.length,13);
for(const name of face)assert(names.includes(name),'Missing '+name);
function getPositionAccessor(index){
 const a=doc.accessors[index],v=doc.bufferViews[a.bufferView];
 assert.equal(a.componentType,5126);
 assert.equal(a.type,'VEC3');
 const offset=binaryOffset+(v.byteOffset||0)+(a.byteOffset||0);
 const stride=v.byteStride||12;
 const result=[];
 for(let i=0;i<a.count;i++){
  const position=offset+i*stride;
  assert(position+12<=bytes.length);
  result.push([bytes.readFloatLE(position),bytes.readFloatLE(position+4),bytes.readFloatLE(position+8)]);
 }
 return result;
}
const positions=getPositionAccessor(prim.attributes.POSITION);
for(const name of face){
 const target=prim.targets[names.indexOf(name)];
 const deltas=getPositionAccessor(target.POSITION);
 assert.equal(deltas.length,positions.length);
 let moved=0,largest=0,meanY=0;
 for(let i=0;i<deltas.length;i++){
  const len=Math.hypot(...deltas[i]);largest=Math.max(largest,len);
  if(len<1e-6)continue;
  moved++;meanY+=positions[i][1];
  // No animations may tug hips, torso, hair or ankles during a face gesture.
  assert(positions[i][1]>1.46 && positions[i][1]<1.70,
    name+' affected vertex outside face');
 }
 assert(moved>15,name+' must alter real geometry, not just channel weights');
 assert(largest>0.0004 && largest<0.03,name+' facial displacement implausible');
 console.log('NEXA FACE '+name+': '+moved+' affected vertices');
}
assert(fs.existsSync('public/models/Nexa_Studio_Busto_v1.glb'),'The retired Studio remains archived');
assert(fs.existsSync('public/models/Nexo_FacialReady_v1.glb'),'Nexo male must remain active');
const stage=fs.readFileSync('src/components/assistant-stage.web.tsx','utf8');
assert(stage.includes("useState<ModelVariant>('android')"),'New Nexa must load by default');
assert(stage.includes("'Wave_One_Hand'"),'Original Nexa wave clip must drive greetings');
assert(stage.includes("'Nexa_Studio_Busto_v1.glb'"),'Retired Studio reference must not be deleted');
console.log('PASS: Nexa Android is default, old Nexa archived, Nexo retained, 5 body clips and 13 physical facial channels');
