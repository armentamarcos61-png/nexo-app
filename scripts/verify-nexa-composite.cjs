#!/usr/bin/env node
'use strict';
/** GLB-level regression. Prove that both native 3D files expose actual
 * eyelid vertex morph targets and a geometrically plausible join.
 */
const assert = require('node:assert/strict');
const fs = require('node:fs');
function parseGLB(path) {
  const bytes=fs.readFileSync(path);
  assert.equal(bytes.toString('ascii',0,4),'glTF',path+' must be GLB');
  assert.equal(bytes.readUInt32LE(8),bytes.length,'GLB must not be truncated');
  const jsonBytes=bytes.readUInt32LE(12);
  const doc=JSON.parse(bytes.subarray(20,20+jsonBytes).toString('utf8'));
  const offset=20+jsonBytes;
  const binSize=bytes.readUInt32LE(offset);
  assert.equal(bytes.toString('ascii',offset+4,offset+7),'BIN');
  const bin=bytes.subarray(offset+8,offset+8+binSize);
  return {doc,bin};
}
function accessor(gltf,id) {
  const a=gltf.doc.accessors[id];
  assert.equal(a.componentType,5126,'facial positions must be float32');
  assert.equal(a.type,'VEC3');
  const v=gltf.doc.bufferViews[a.bufferView];
  const stride=v.byteStride||12;
  const start=(v.byteOffset||0)+(a.byteOffset||0);
  const values=new Array(a.count);
  for(let i=0;i<a.count;i++){
    const o=start+i*stride;
    assert(o+12<=gltf.bin.length,'accessor exceeds BIN buffer');
    values[i]=[
      gltf.bin.readFloatLE(o),
      gltf.bin.readFloatLE(o+4),
      gltf.bin.readFloatLE(o+8),
    ];
  }
  return values;
}
function eyes(gltf,target) {
  let selected=null;
  let largest=0;
  for(const mesh of gltf.doc.meshes){
    const names=mesh.extras?.targetNames||[];
    const morph=names.indexOf(target);
    if(morph<0)continue;
    for(const primitive of mesh.primitives||[]){
      const deltaRef=primitive.targets?.[morph]?.POSITION;
      const posRef=primitive.attributes?.POSITION;
      if(deltaRef===undefined||posRef===undefined)continue;
      const delta=accessor(gltf,deltaRef);
      const pos=accessor(gltf,posRef);
      let peak=0;
      for(const [x,y,z] of delta)peak=Math.max(peak,x*x+y*y+z*z);
      if(peak<=1e-12)continue;
      const sum=[0,0,0];let weightSum=0;
      for(let i=0;i<pos.length;i++){
        const d=delta[i];
        const weight=d[0]**2+d[1]**2+d[2]**2;
        if(weight<peak*.26)continue;
        for(let j=0;j<3;j++)sum[j]+=pos[i][j]*weight;
        weightSum+=weight;
      }
      if(weightSum>largest){
        largest=weightSum;
        selected=sum.map(n=>n/weightSum);
      }
    }
  }
  assert(selected,'missing vertex-based '+target);
  return selected;
}
function height(gltf){
  let min=Infinity,max=-Infinity;
  for(const mesh of gltf.doc.meshes){
    for(const primitive of mesh.primitives||[]){
      if(primitive.attributes?.POSITION===undefined)continue;
      for(const point of accessor(gltf,primitive.attributes.POSITION)){
        min=Math.min(min,point[1]);max=Math.max(max,point[1]);
      }
    }
  }
  assert(max>min);
  return max-min;
}
function eyeWidth(gltf){
  const a=eyes(gltf,'EyeBlinkLeft');
  const b=eyes(gltf,'EyeBlinkRight');
  return Math.hypot(...a.map((x,i)=>x-b[i]));
}
const studio=parseGLB('public/models/Nexa_Studio_Busto_v1.glb');
const full=parseGLB('public/models/Nexa_FacialRig_V2.glb');
const sw=eyeWidth(studio),fw=eyeWidth(full);
const ratio=sw/fw;
const studioHeight=height(studio);
const bodyHeight=height(full)*ratio;
assert(Number.isFinite(ratio) && ratio>=0.3 && ratio<=8,'studio/body eye scale is implausible');
assert(bodyHeight>=studioHeight*1.25,'source body would be shorter than the Studio bust');
// Three.js removes the negative side of the plane. Regressions here previously
// kept the duplicate upper torso and invisibly clipped both legs instead.
const composite = fs.readFileSync('src/lib/nexa-composite.ts','utf8');
assert.match(composite,
  /new THREE\\.Plane\\(new THREE\\.Vector3\\(0, -1, 0\\), seamY\\)/,
  'the body cutter must keep y <= seamY, never keep the duplicate upper chest');
const seamY = 0.4;
const planeDistance = (y) => -y + seamY;
assert(planeDistance(seamY-.1)>0 && planeDistance(seamY+.1)<0,
  'the lower-body half-space must be the visible side');
console.log('PASS: lower-body clipping keeps legs and removes the duplicated chest');
console.log('PASS: native 3D eyes align; eyelid spacing ratio='+ratio.toFixed(3)+
  ', Studio bust='+studioHeight.toFixed(3)+', matching body='+bodyHeight.toFixed(3));
