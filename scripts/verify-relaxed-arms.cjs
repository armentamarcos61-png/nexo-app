#!/usr/bin/env node
'use strict';
// A physical 3D regression: actual shoulder and elbow bones must finish BELOW
// the shoulders. Merely increasing clip durations cannot pass this test.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const THREE=require('three');
const file='src/lib/assistant-relaxed-pose.ts';
const compiled=ts.transpileModule(fs.readFileSync(file,'utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},
}).outputText;
const imported={};
new Function('exports',compiled)(imported);
const root=new THREE.Group();
function arm(side,sign){
 const upper=new THREE.Bone();
 upper.name='mixamorig:'+side+'Arm';
 upper.position.set(sign*.17,1.45,0);
 const elbow=new THREE.Bone();
 elbow.name='mixamorig:'+side+'ForeArm';
 elbow.position.set(sign*.30,0,0);
 upper.add(elbow);
 root.add(upper);
 return {upper,elbow};
}
const left=arm('Left',-1),right=arm('Right',1);
root.updateMatrixWorld(true);
const initial=[left,right].map(({upper,elbow})=>
 elbow.getWorldPosition(new THREE.Vector3()).sub(
  upper.getWorldPosition(new THREE.Vector3())).normalize().y);
assert(initial.every(value=>Math.abs(value)<.02),'fixture begins in a T-pose');
const entries=imported.relaxedArmBones(THREE,root);
assert.equal(entries.length,2,'must control both shoulder-to-elbow joints');
for(const {bone,quaternion} of entries){
 assert(quaternion.isQuaternion&&Number.isFinite(quaternion.w));
 bone.quaternion.copy(quaternion);
}
root.updateMatrixWorld(true);
for(const side of [left,right]){
 const lowered=side.elbow.getWorldPosition(new THREE.Vector3()).sub(
  side.upper.getWorldPosition(new THREE.Vector3())).normalize();
 assert(lowered.y<-.96,
  'true elbow joint must be at side of body, not level with shoulder');
 assert(Math.abs(lowered.x)<.23,
  'relaxed arm must not remain extended to either side');
}
const clip=imported.relaxedIdleClip(THREE,root,4);
assert(clip.tracks.length>=8,'idle must animate arm and bone translations');
assert(clip.tracks.some(track=>track.name==='mixamorig:LeftArm.quaternion'));
assert(clip.tracks.some(track=>track.name==='mixamorig:RightArm.quaternion'));
assert(clip.duration===4);
assert(entries.every(item=>Number.isFinite(item.quaternion.w)));
// Also validate against both actual uploaded Meshy GLB skeletons, not only
// a synthetic T-pose. The CI pipeline reconstructs these before this test.
function restoredSkeleton(file){
 const bytes=fs.readFileSync(file);
 assert.equal(bytes.toString('ascii',0,4),'glTF','invalid 3D file: '+file);
 const len=bytes.readUInt32LE(12);
 const json=JSON.parse(bytes.toString('utf8',20,20+len));
 const nodes=json.nodes;
 const joints=new Set((json.skins||[]).flatMap(s=>s.joints||[]));
 const bones=nodes.map((data,index)=>{
  const object=joints.has(index)?new THREE.Bone():new THREE.Object3D();
  object.name=data.name||'gltf-node-'+index;
  if(data.translation)object.position.fromArray(data.translation);
  if(data.rotation)object.quaternion.fromArray(data.rotation);
  if(data.scale)object.scale.fromArray(data.scale);
  if(data.matrix){
   const m=new THREE.Matrix4().fromArray(data.matrix);
   m.decompose(object.position,object.quaternion,object.scale);
  }
  return object;
 });
 const children=new Set();
 nodes.forEach((node,i)=>{
  for(const child of node.children||[]){
   bones[i].add(bones[child]);
   children.add(child);
  }
 });
 const parent=new THREE.Group();
 bones.forEach((node,i)=>{if(!children.has(i))parent.add(node);});
 parent.updateMatrixWorld(true);
 return parent;
}
for(const [character,file] of [
 ['Nexa','public/models/Nexa_Android_FacialReady_v1.glb'],
 ['Nexo','public/models/Nexo_FacialReady_v1.glb'],
]){
 assert(fs.existsSync(file),'missing reconstructed '+character+' GLB');
 const model=restoredSkeleton(file);
 const actual=imported.relaxedArmBones(THREE,model);
 assert.equal(actual.length,2,character+' must find both real arm joints');
 const was=actual.map(({bone})=>{
  const elbow=bone.getObjectByName(bone.name.replace('Arm','ForeArm'))||
   model.getObjectByName(bone.name.replace('Arm','ForeArm'));
  assert(elbow,character+' arm missing elbow');
  return elbow.getWorldPosition(new THREE.Vector3()).sub(
   bone.getWorldPosition(new THREE.Vector3())).normalize().y;
 });
 for(const {bone,quaternion} of actual)bone.quaternion.copy(quaternion);
 model.updateMatrixWorld(true);
 for(const {bone} of actual){
  const elbow=model.getObjectByName(bone.name.replace('Arm','ForeArm'));
  const direction=elbow.getWorldPosition(new THREE.Vector3()).sub(
   bone.getWorldPosition(new THREE.Vector3())).normalize();
  assert(direction.y<-.96,
   character+' elbow must settle anatomically BELOW the shoulder: '+direction.y);
  assert(Math.abs(direction.x)<.23,
   character+' arm still sticks outward in idle');
 }
 console.log('PASS '+character+': real GLB lowered both elbows; original Y = '+
  was.map(v=>v.toFixed(3)).join(', '));
}

console.log('PASS: actual L/R skinned bone elbow vectors end 96% downward; relaxed idle track and no T-pose');
