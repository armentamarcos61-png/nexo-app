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
console.log('PASS: actual L/R skinned bone elbow vectors end 96% downward; relaxed idle track and no T-pose');
