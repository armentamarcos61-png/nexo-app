#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const compiled=ts.transpileModule(fs.readFileSync('src/lib/nexo-face-rig.ts','utf8'),{
 compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}
});
const exportsObject={};
new Function('exports',compiled.outputText)(exportsObject);
const names=['EyeBlinkLeft','EyeBlinkRight','MouthOpen','MouthO','MouthWide',
 'BrowRaiseLeft','BrowRaiseRight','EyeLookLeft','EyeLookRight','EyeLookUp','EyeLookDown',
 'BrowFrown','MouthSmile'];
class Quaternion {
 clone(){return new Quaternion();}
 copy(){this.copies=(this.copies||0)+1;return this;}
 multiply(){return this;}
 setFromEuler(){return this;}
}
for(const fps of [20,30,60,120]){
 const head={name:'mixamorig:Head',quaternion:new Quaternion()};
 const mesh={isMesh:true,morphTargetDictionary:Object.fromEntries(names.map((n,i)=>[n,i])),
  morphTargetInfluences:names.map(()=>0)};
 const root={traverse:cb=>[head,mesh].forEach(cb),getObjectByName:()=>head};
 const rig=exportsObject.installNexoFaceRig({Quaternion,Euler:class {}},root);
 assert(rig.available,'Nexo must detect all 13 facial morphs');
 let blink=0,mouth=0,brow=0,gaze=0;
 for(let frame=0;frame<fps*10;frame++){
  const t=frame/fps;
  rig.update(1/fps,t,t<6,'Hola, bienvenidos a Nexo');
  const weights=mesh.morphTargetInfluences;
  assert(weights.every(w=>Number.isFinite(w)&&w>=0&&w<=1));
  blink=Math.max(blink,weights[0],weights[1]);
  mouth=Math.max(mouth,weights[2]);
  brow=Math.max(brow,weights[5],weights[6]);
  gaze=Math.max(gaze,...weights.slice(7,11));
 }
 assert(blink>.90,'eyelids must close at '+fps+' FPS');
 assert(mouth>.30,'mouth must articulate while speaking');
 assert(brow>.25,'brows must move visibly');
 assert(gaze>.09,'independent eye direction required');
 assert(mesh.morphTargetInfluences[2]<.01,'lips must close after speech ends');
 assert(head.quaternion.copies>fps*9,'head must reset and never accumulate rotation');
 rig.dispose();
}
class Attr {
 constructor(){this.v=[[0,.002,0],[0,.004,0]];this.count=this.v.length;this.needsUpdate=false;}
 getX(i){return this.v[i][0];}getY(i){return this.v[i][1];}getZ(i){return this.v[i][2];}
 setXYZ(i,x,y,z){this.v[i]=[x,y,z];}
}
const targets=names.map(()=>new Attr());
const node={isMesh:true,geometry:{morphAttributes:{position:targets}},
 morphTargetDictionary:Object.fromEntries(names.map((name,i)=>[name,i]))};
const root={traverse:cb=>cb(node)};
assert.equal(exportsObject.calibrateNexoFaceMorphs(root),13);
assert(targets[0].getY(1)>.007,'real eyelid geometry must gain visible amplitude');
assert.equal(exportsObject.calibrateNexoFaceMorphs(root),0,'calibration must happen once');
console.log('PASS NEXO: 13 local face targets, visible mouth/brows/blink/gaze at 20-120 FPS, head without drift');
