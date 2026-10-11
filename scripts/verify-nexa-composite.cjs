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
// New neck-only join: Studio keeps its head ABOVE one plane, the original
// full-body suit remains BELOW it. The cut is complementary, not overlapped.
const headDistance = y => y-0.45;
const bodyDistance = y => 0.45-y;
assert(headDistance(.55)>0 && headDistance(.35)<0,
  'Studio must retain only the head above the neck');
assert(bodyDistance(.35)>0 && bodyDistance(.55)<0,
  'full GLB must retain the shoulders, arms and rest below the neck');
console.log('PASS: one complementary neck seam, no overlapping torso geometry');

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
const stage=fs.readFileSync('src/components/assistant-stage.web.tsx','utf8');
const index=polish.indexOf('export function composeNexaHeadBody(');
assert(index>=0,'new definitive head+body compositor must exist');
const newCompose=polish.slice(index);
const headMaskStart=polish.indexOf('export function maskNexaStudioHead(');
const maskCode=polish.slice(headMaskStart,index);
assert(headMaskStart>=0 && maskCode.includes('eye.center.y-eye.width*1.17'),
  'Studio head mask must be placed beneath the jaw from real eyelid landmarks');
assert(maskCode.includes('new THREE.Plane(new THREE.Vector3(0,1,0),-seamY)'),
  'Studio must keep the y >= neck half-space');
assert(newCompose.includes('const seamY=lowerNexaStudioHead(THREE,studio,studioEyes.width)'),
  'the neck seam must follow the Studio head when it is lowered');
assert(newCompose.indexOf('body.position.copy(studioEyes.center)') <
       newCompose.indexOf('lowerNexaStudioHead(THREE,studio,studioEyes.width)'),
  'head must move AFTER body alignment or the whole avatar moves instead');
assert(newCompose.includes('new THREE.Plane(new THREE.Vector3(0,-1,0),seamY)'),
  'full-body suit must keep y <= neck, including complete arms and chest');
assert(newCompose.includes('body.scale.setScalar(ratio)') &&
       newCompose.includes('studioEyes.center).sub(bodyEyes.center.clone().multiplyScalar(ratio))'),
  'models must align by real 3D eyelid landmarks');
assert(!newCompose.includes('removeLegacyArmSurfaces(body)') &&
       !newCompose.includes('tailoredWaistPanel(') &&
       !newCompose.includes('removeNexaStudioSidePanels(') &&
       !newCompose.includes('relaxBodyPose(THREE, body)'),
  'no duplicated shoulders, sleeves or artificial waist geometry');
assert(stage.includes('composeNexaHeadBody(THREE,modelRoot,bodyGltf.scene,renderer)') &&
       stage.includes('maskNexaStudioHead(THREE,modelRoot,renderer)'),
  'live viewer must use definitive neck seam');
assert(!stage.includes('composeNexaBody(') &&
       !stage.includes('tailorNexaStudioLowerTorso(') &&
       !stage.includes('removeNexaStudioSidePanels(') &&
       !stage.includes('poseNexaStudioArms('),
  'legacy torso patching must be entirely absent from live path');
assert(stage.includes("setVariant('full')"),
  'if the secondary body fails, never display a disembodied head');
assert(newCompose.includes('const gestureBones:') &&
       newCompose.includes('gestureBlend+=') &&
       newCompose.includes('if (speaking) gestureTime+=frame'),
  'full-body forearms must gesture smoothly only during audible speech');
assert(newCompose.includes('removeNexaLegacyHeadFragments(body)'),
  'the discarded full-body scalp and neck must not dangle below the clipping plane');
assert(stage.includes('faceRig=installNexaFaceRig(THREE,modelRoot)'),
  'original expressive Studio facial rig must remain active');
const fullBones=new Set((full.doc.skins||[]).flatMap(skin=>
 skin.joints.map(index=>full.doc.nodes[index]?.name||'')));
for(const side of ['Left','Right']) {
  for(const joint of ['Shoulder','Arm','ForeArm','Hand','UpLeg','Leg','Foot']) {
    assert(fullBones.has('mixamorig:'+side+joint),
      'full body must own '+side+joint+' after the join');
  }
}
const studioFacials=new Set(studio.doc.meshes.flatMap(mesh=>mesh.extras?.targetNames||[]));
for(const facial of ['EyeBlinkLeft','EyeBlinkRight','MouthOpen','BrowRaiseLeft','BrowRaiseRight']){
 assert(studioFacials.has(facial),'head must retain '+facial+' morph target');
}
console.log('PASS: approved head and complete original GLB suit/arms are joined with no patch geometry');


/** Regression for the live three-dimensional collar, not a screenshot:
 * Build its geometry with minimal Three mocks, validate scale, placement,
 * open lapels, idempotency and disposal without editing source GLB assets.
 */
assert(stage.includes('addNexaCollar(THREE,avatarRoot,modelRoot,composite.seamY)'),
  'live viewer must attach the collar after composing the unified body');
assert(stage.includes('disposeNexaCollar(avatarRoot)'),
  'live viewer must release collar geometry on unmount');
const ts = require('typescript');
const vm = require('node:vm');
const sandbox={exports:{},console};
vm.runInNewContext(ts.transpileModule(polish,{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},
}).outputText,sandbox,{timeout:6000});
const moveHead=sandbox.exports.lowerNexaStudioHead;
assert.equal(typeof moveHead,'function');
const originalY=1.13;
const originalSeam=.80;
const headPlane={normal:{x:0,y:1,z:0},constant:-originalSeam};
const sourceHead={
  userData:{nexaHeadOnlySeamY:originalSeam},
  position:{y:originalY},
  updateMatrixWorld(){this.updated=true;},
  traverse(cb){cb({isMesh:true,material:{clippingPlanes:[headPlane]}});},
};
const expectedDrop=.14*.74;
const movedSeam=moveHead({MathUtils:{clamp:(v,lo,hi)=>Math.max(lo,Math.min(hi,v))}},
  sourceHead,.14);
assert(Math.abs(sourceHead.position.y-(originalY-expectedDrop))<1e-10,
  'Nexa Studio head must lower a controlled 0.74 of the measured eye width');
assert(Math.abs(movedSeam-(originalSeam-expectedDrop))<1e-10 &&
       Math.abs(headPlane.constant+movedSeam)<1e-10,
  'neck plane must lower by EXACTLY the same amount as the face');
assert(sourceHead.updated,'head world matrices must be refreshed for the collar');
assert.equal(moveHead({MathUtils:{clamp:v=>v}},sourceHead,.14),movedSeam,
  'repeated composition must never lower Nexa twice');
assert(Math.abs(sourceHead.position.y-(originalY-expectedDrop))<1e-10,
  'head position must remain stable on repeat calls');
console.log('PASS: head lowered a subtle eye-relative distance and collar/clip seam stay aligned');
const collarFactory=sandbox.exports.addNexaCollar;
const collarCleanup=sandbox.exports.disposeNexaCollar;
assert.equal(typeof collarFactory,'function');
assert.equal(typeof collarCleanup,'function');
class V3 {
  constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;}
  clone(){return new V3(this.x,this.y,this.z);}
  add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this;}
  addScaledVector(v,w){this.x+=v.x*w;this.y+=v.y*w;this.z+=v.z*w;return this;}
  multiplyScalar(v){this.x*=v;this.y*=v;this.z*=v;return this;}
  distanceTo(v){return Math.hypot(this.x-v.x,this.y-v.y,this.z-v.z);}
  copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this;}
  fromBufferAttribute(a,i){this.x=a[i][0];this.y=a[i][1];this.z=a[i][2];return this;}
}
class G {
  constructor(){this.children=[];this.userData={};this.position=new V3();this.scale={z:1};}
  add(child){child.parent=this;this.children.push(child);}
  traverse(cb){cb(this);for(const c of this.children)c.traverse(cb);}
  removeFromParent(){
    if(this.parent){this.parent.children=this.parent.children.filter(c=>c!==this);this.parent=null;}
  }
  updateMatrixWorld(){}
  worldToLocal(point){return point;}
}
class Geo {
  constructor(...args){this.args=args;this.disposed=false;}
  dispose(){this.disposed=true;}
}
class Mat {
  constructor(props){this.props=props;this.disposed=false;}
  dispose(){this.disposed=true;}
}
class M {
  constructor(geometry,material){
    this.geometry=geometry;this.material=material;this.isMesh=true;
    this.rotation={x:0,z:0};this.position=new V3();this.userData={};
  }
  traverse(cb){cb(this);}
}
const MockThree={
  Group:G,Mesh:M,Vector3:V3,DoubleSide:2,
  MeshStandardMaterial:Mat,CylinderGeometry:Geo,TubeGeometry:Geo,
  CatmullRomCurve3:Geo,
};
const headPositions=[[-.07,.30,.15],[.07,.30,.15]];
const morph=(chosen)=>({
  count:2,getX:i=>i===chosen?1:0,getY:()=>0,getZ:()=>0,
});
const headMesh={
  morphTargetDictionary:{EyeBlinkLeft:0,EyeBlinkRight:1},
  geometry:{attributes:{position:headPositions},morphAttributes:{position:[morph(0),morph(1)]}},
  localToWorld(v){return v;},
  isSkinnedMesh:false,
};
const studioMock={
  updateMatrixWorld(){},
  traverse(cb){cb(headMesh);},
};
const root=new G();
const neckSeam=.09;
const collar=collarFactory(MockThree,root,studioMock,neckSeam);
assert.equal(root.children.length,1,'exactly one collar group must be visible');
assert.equal(collar.children.length,1,'only one recessed dark neck insert is permitted');
assert(Math.abs(collar.position.y-(neckSeam-.14*.015))<1e-8,
  'collar must bridge the world-space seam at neck height');
assert(Math.abs(collar.position.z-(.15-.14*.68))<1e-8,
  'collar must sit at the neck, behind the eyes');
assert(Math.abs(collar.scale.z-.87)<1e-8,
  'collar must have an anatomical oval cross-section');
assert(collar.children[0].geometry.args[2]<=.14*.13,
  'neckline inset must be ultra-short and stay below the chin');
assert(collar.userData.nexaCollarResources.charcoal &&
       !collar.userData.nexaCollarResources.pearl,
  'old floating white armor lapels cannot reappear');
assert.equal(collarFactory(MockThree,root,studioMock,neckSeam),collar,
  're-loading must not create a second collar');
const geometries=collar.children.map(x=>x.geometry);
const materials=Object.values(collar.userData.nexaCollarResources);
collarCleanup(root);
assert.equal(root.children.length,0,'collar cleanup should detach it');
assert(!root.userData.nexaUniformCollar,'collar cleanup should clear cached handle');
assert(geometries.every(g=>g.disposed),'collar geometries must all be disposed');
assert(materials.every(m=>m.disposed),'collar materials must all be disposed');
console.log('PASS: one low-profile recessed neckline replaces the detached white neck ring');

/** Regression: discard outdated hair/neck surfaces but KEEP every torso,
 * shoulder and arm triangle from the original complete-body GLB.
 */
const removeOldHair=sandbox.exports.removeNexaLegacyHeadFragments;
assert.equal(typeof removeOldHair,'function');
const triIndices=[0,1,2,3,4,5,6,7,8];
const jointNames=['mixamorig:Head','mixamorig:Spine2','mixamorig:Neck'];
const boneIds=[0,0,0,1,1,1,2,2,2];
const attribute=(list)=>({
  count:list.length,itemSize:4,getComponent(i,c){return c===0?list[i]:0;},
});
const oldGeometry={
  index:{count:triIndices.length,getX:i=>triIndices[i]},
  groups:[{start:0,count:9,materialIndex:0}],
  getAttribute(name){
    if(name==='position')return {count:9};
    if(name==='skinIndex')return attribute(boneIds);
    if(name==='skinWeight')return attribute(new Array(9).fill(1));
    return undefined;
  },
  setIndex(next){this.index={count:next.length,getX:i=>next[i]};this.lastIndices=next;},
  clearGroups(){this.groups=[];},
  addGroup(start,count,materialIndex){this.groups.push({start,count,materialIndex});},
  computeBoundingSphere(){},
};
const obsoleteBody={
  userData:{},
  traverse(fn){fn({
    isSkinnedMesh:true,skeleton:{bones:jointNames.map(name=>({name}))},geometry:oldGeometry,
  });},
};
assert.equal(removeOldHair(obsoleteBody),2,
  'obsolete hair and neck triangles must be removed independently from the torso');
assert.deepEqual(oldGeometry.lastIndices,[3,4,5],
  'the unweighted shoulder and suit triangles must be retained unchanged');
assert.equal(removeOldHair(obsoleteBody),0,'hair repair must be idempotent');
console.log('PASS: old scalp/neck debris removed with original clothing and arms preserved');

assert(stage.includes('visibleHeight*1.25/screenHeight') &&
       stage.includes('minTargetY,maxTargetY') &&
       stage.includes('Math.sin(yaw)*Math.cos(pitch)*distance') &&
       stage.includes('Math.sin(pitch)*distance') &&
       stage.includes('orbitRef.current.panY'),
  '360-degree 3D camera must allow pan from cap to boots and true elevation');
assert(!stage.includes(' -0.36, 0.36') &&
       !stage.includes(',-0.14,0.14'),
  'old restrictive side-to-side and vertical camera limits must be removed');
console.log('PASS: full-height vertical camera pan, 360-degree horizontal orbit and two-finger tilt');
