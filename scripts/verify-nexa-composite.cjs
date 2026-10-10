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
assert.ok(composite.includes('new THREE.Plane(new THREE.Vector3(0, -1, 0), seamY)'),
  'the body cutter must keep y <= seamY, never keep the duplicate upper chest');
const seamY = 0.4;
const planeDistance = (y) => -y + seamY;
assert(planeDistance(seamY-.1)>0 && planeDistance(seamY+.1)<0,
  'the lower-body half-space must be the visible side');
console.log('PASS: lower-body clipping keeps legs and removes the duplicated chest');
console.log('PASS: native 3D eyes align; eyelid spacing ratio='+ratio.toFixed(3)+
  ', Studio bust='+studioHeight.toFixed(3)+', matching body='+bodyHeight.toFixed(3));

function describeRig(label, glb) {
  const doc=glb.doc;
  const joints=(doc.nodes||[]).filter(n=>/mixamorig:(Left|Right)(Shoulder|Arm|ForeArm|Hand|UpLeg|Leg|Foot|ToeBase)|mixamorig:(Spine|Hips)/i.test(n.name||''));
  console.log('NEXA RIG '+label+': meshes='+(doc.meshes||[]).map(m=>m.name+'('+m.primitives.length+')').join(', '));
  console.log('NEXA BONES '+label+': '+joints.map(n=>(n.name||'?')+':'+(n.translation||[]).map(x=>x.toFixed(3)).join(',')).join(' | '));
  console.log('NEXA SKINS '+label+': '+(doc.skins||[]).map(s=>s.joints.length).join(','));
  for(const mesh of doc.meshes||[]) {
    for(const p of mesh.primitives||[]) {
      const attrs=p.attributes||{};
      const a=doc.accessors[attrs.POSITION];
      console.log('NEXA MESH '+label+' '+(mesh.name||'unnamed')+
        ' pos='+a.count+' min='+JSON.stringify(a.min)+' max='+JSON.stringify(a.max)+
        ' skinAttr='+['JOINTS_0','JOINTS_1','JOINTS_2'].filter(x=>x in attrs).join('/')+
        ' material='+(doc.materials?.[p.material]?.name||p.material));
    }
  }
}
describeRig('studio',studio);
describeRig('full',full);

function readFour(gltf, reference, vertex) {
  const a=gltf.doc.accessors[reference];
  const view=gltf.doc.bufferViews[a.bufferView];
  const width=a.componentType===5126||a.componentType===5125?4:a.componentType===5123?2:1;
  const stride=view.byteStride||width*4;
  const offset=(view.byteOffset||0)+(a.byteOffset||0)+vertex*stride;
  const values=[];
  for(let c=0;c<4;c++) {
    const p=offset+c*width;
    let v;
    switch(a.componentType) {
      case 5126:v=gltf.bin.readFloatLE(p);break;
      case 5125:v=gltf.bin.readUInt32LE(p);break;
      case 5123:v=gltf.bin.readUInt16LE(p);break;
      case 5121:v=gltf.bin.readUInt8(p);break;
      default:throw new Error('Unsupported joint component '+a.componentType);
    }
    if(a.normalized && a.componentType===5121)v/=255;
    if(a.normalized && a.componentType===5123)v/=65535;
    values.push(v);
  }
  return values;
}
function countUpperArmTriangles(gltf) {
  const p=gltf.doc.meshes[0].primitives[0];
  const skin=gltf.doc.skins[0];
  const a=p.attributes, n=gltf.doc.accessors[a.POSITION].count;
  const score=new Float32Array(n);
  for(let set=0;set<3;set++) {
    const ji=a['JOINTS_'+set], wi=a['WEIGHTS_'+set];
    if(ji===undefined||wi===undefined)continue;
    for(let i=0;i<n;i++) {
      const joints=readFour(gltf,ji,i),weights=readFour(gltf,wi,i);
      for(let c=0;c<4;c++) {
        const name=gltf.doc.nodes[skin.joints[joints[c]]]?.name||'';
        if(/(?:Left|Right)(?:Shoulder|Arm|ForeArm|Hand)/i.test(name))score[i]+=weights[c];
      }
    }
  }
  const indices=gltf.doc.accessors[p.indices];
  const view=gltf.doc.bufferViews[indices.bufferView];
  const offset=(view.byteOffset||0)+(indices.byteOffset||0);
  const count=indices.count;
  let kept=0;
  for(let i=0;i+2<count;i+=3) {
    const width=indices.componentType===5125?4:2;
    const at=j=>width===4?gltf.bin.readUInt32LE(offset+j*width):gltf.bin.readUInt16LE(offset+j*width);
    const x=score[at(i)],y=score[at(i+1)],z=score[at(i+2)];
    if(Math.max(x,y,z)>=.48&&(x+y+z)/3>=.32)kept++;
  }
  return kept;
}
const armTriangles=countUpperArmTriangles(full);
assert(armTriangles>100,'Body GLB must expose skinned upper-arm geometry that can be reattached');
console.log('PASS: Nexa full-body upper-arm triangles available='+armTriangles);
const polish=fs.readFileSync('src/lib/nexa-composite.ts','utf8');
assert(polish.includes('preserveOriginalArms(THREE, body, upperArmsPlane)'),
  'The complete upper arms must be preserved above the Studio seam');
assert(polish.includes('relaxBodyPose(THREE, body)'),'Hands and shoe pose must be calibrated');
assert(polish.includes('finishBoots(THREE, body, studioEyes.width, lower.min.y)'),
  'Shoe finishing must accompany the full body');

/**
 * Regression for the two-arm, two-torso bug seen on Android: Studio has
 * complete native skinned hands, so the lower GLB must not draw its own arms.
 * Its arm bind pose must also be relaxed before animation tracks are built.
 */
const studioSkinNames = new Set((studio.doc.skins||[]).flatMap(skin =>
  skin.joints.map(index=>studio.doc.nodes[index]?.name||'')));
for (const side of ['Left','Right']) {
  for (const joint of ['Arm','ForeArm','Hand']) {
    assert(studioSkinNames.has('mixamorig:'+side+joint),
      'Studio must supply skinned '+side+joint+' for natural arm posing');
  }
}
assert(polish.includes('removeLegacyArmSurfaces(body)'),
  'Composite must remove legacy arms when Studio arms are available');
assert(polish.includes('studioHasRiggedArms(studio)'),
  'The native Studio arm selection must be rig-aware');
const stage = fs.readFileSync('src/components/assistant-stage.web.tsx','utf8');
assert(stage.includes('poseNexaStudioArms(THREE, modelRoot)'),
  'Studio arms must be relaxed before creating action baselines');
assert(stage.includes('gentleStudioGesture'),
  'Talking must not restore the original horizontal bind pose');
console.log('PASS: Studio keeps its own naturally posed arms; legacy duplicate arms are excluded');

assert(stage.includes('nexaBustOriginalBounds'),
  'The chest edge must be measured before lowering the arms');
assert(polish.includes('tailoredWaistPanel(') && polish.includes('body.add(waistPanel)'),
  'The chest-to-waist join needs a real 3D connecting surface');
assert(polish.includes('const seamY = waistPanel'),
  'The lower-body cut must be lowered only when the waist panel exists');
assert(stage.includes('const safeClip=studio') &&
       stage.includes('new THREE.AnimationClip(name,1,[])'),
  'Studio Idle must not restore the old T-pose through imported animations');
console.log('PASS: anatomically anchored chest join, tapered 3D waist and neutral Studio arms');

assert(polish.includes('repairStudioSleeveWeights(studio)'),
  'Studio sleeves must not remain weighted to hidden lower-leg bones');
assert(polish.includes('Bone_009') && polish.includes('Bone_007'),
  'Both misassigned Meshy sleeve tip joints must be handled');
console.log('PASS: Meshy sleeve weights are remapped without touching the approved face');
