#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const filename=process.argv[2]||'public/models/Nexo_FacialReady_v1.glb';
if(!fs.existsSync(filename)){
  console.log('SKIP: Nexo 3D binary is not published at '+filename);
  process.exit(0);
}
const data=fs.readFileSync(filename);
assert(data.length>100_000&&data.length<65_000_000,'Invalid model size');
assert.equal(data.toString('ascii',0,4),'glTF');
assert.equal(data.readUInt32LE(4),2);
assert.equal(data.readUInt32LE(8),data.length);
const jsonLength=data.readUInt32LE(12);
assert.equal(data.toString('ascii',16,20),'JSON');
const gltf=JSON.parse(data.toString('utf8',20,20+jsonLength));
const required=['EyeBlinkLeft','EyeBlinkRight','EyeLookLeft','EyeLookRight',
 'EyeLookUp','EyeLookDown','BrowRaiseLeft','BrowRaiseRight','BrowFrown',
 'MouthOpen','MouthO','MouthWide','MouthSmile'];
const targets=gltf.meshes.flatMap(m=>m.extras?.targetNames||[]);
for(const name of required)assert(targets.includes(name),'Missing facial morph '+name);
const clips=gltf.animations.map(a=>a.name);
for(const name of ['Wave_One_Hand','Confused_Scratch','Running','Walking','walking_2_inplace'])
  assert(clips.includes(name),'Missing animation '+name);
assert(gltf.skins?.length,'Missing skeletal skin');
const bones=gltf.nodes.map(n=>n.name);
for(const name of ['mixamorig:Head','mixamorig:Neck','mixamorig:LeftArm','mixamorig:RightArm'])
  assert(bones.includes(name),'Missing bone '+name);
for(const mesh of gltf.meshes)for(const p of mesh.primitives)
 assert.equal(p.targets?.length,required.length,'Morph target length differs');
assert(gltf.images?.length>=3,'Missing original Meshy textures');
assert.equal(gltf.buffers?.length,1,'GLB must have one buffer');
const binOffset=20+jsonLength;
assert.equal(data.toString('ascii',binOffset+4,binOffset+8),'BIN\0');
const binLength=data.readUInt32LE(binOffset);
for(const view of gltf.bufferViews)
 assert(view.byteOffset+view.byteLength<=binLength,'Invalid buffer view');
for(const anim of gltf.animations){
 for(const c of anim.channels)assert(c.target.node<gltf.nodes.length,'Invalid animation node');
 for(const s of anim.samplers)
  assert(s.input<gltf.accessors.length&&s.output<gltf.accessors.length,'Invalid sampler');
}
console.log('PASS NEXO 3D:',data.length,'bytes, 13 face morphs, 5 body clips');
