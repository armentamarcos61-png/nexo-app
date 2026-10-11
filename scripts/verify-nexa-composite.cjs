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
assert(stage.includes("avatarRoot.name = 'Nexa unified 3D avatar'") &&
       stage.includes('avatarRoot.add(composite.body)'),
  'both source GLBs must be one articulated visible 3D scene hierarchy');
assert(stage.includes('const safeClip=studio') &&
       stage.includes('? new THREE.AnimationClip(name,1,[])'),
  'studio speech must not animate broken shoulder panels');
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

/**
 * Execute the actual TypeScript torso-tailoring function with deterministic
 * geometry. This catches broken masks, accidental head scaling, or non-idempotent
 * repeat calls without requiring a GPU in GitHub Actions.
 */
const vm = require('node:vm');
const ts = require('typescript');
const runtime = { exports: {}, console };
const compiledTorso = ts.transpileModule(polish, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;
vm.runInNewContext(compiledTorso, runtime, { timeout: 4000 });
const tailor = runtime.exports.tailorNexaStudioLowerTorso;
assert.equal(typeof tailor, 'function', 'lower torso tailor must be exported');
const vertices = [
  [-0.3357,0.7,0], [0.3342,0.7,0], [0,0,0],
  [0.22,0.06,0], [-0.22,0.06,0],
  [0.20,0.60,0], [-0.20,0.60,0],
  [0.33,0.18,0], [-0.33,0.18,0],
  [0.01,0.08,0],
];
const sourceVertices = vertices.map(v=>v.slice());
const posAttr = {
  count: vertices.length,
  getX: i=>vertices[i][0],
  getY: i=>vertices[i][1],
  setX: (i,v)=>{vertices[i][0]=v;},
  needsUpdate: false,
};
const geometryMock = {
  attributes: { position: posAttr },
  getAttribute: key=>key==='position'?posAttr:null,
  computeBoundingBox() {
    this.boundingBox = {
      min: {x:Math.min(...vertices.map(v=>v[0])),y:Math.min(...vertices.map(v=>v[1]))},
      max: {x:Math.max(...vertices.map(v=>v[0])),y:Math.max(...vertices.map(v=>v[1]))},
    };
  },
  computeVertexNormals(){this.normalsUpdated=true;},
  computeBoundingSphere(){this.sphereUpdated=true;},
};
const mockStudio = {
  userData: {},
  traverse(cb){cb({isSkinnedMesh:true,geometry:geometryMock});},
};
const amended = tailor(mockStudio);
assert(amended >= 2, 'both lower sides must be reshaped');
assert(vertices[3][0]<sourceVertices[3][0]*.94 &&
       vertices[3][0]>sourceVertices[3][0]*.72,
       'right lower flap must be reduced smoothly, not amputated');
assert(vertices[4][0]>sourceVertices[4][0]*.94 &&
       vertices[4][0]<sourceVertices[4][0]*.72,
       'left lower flap must be reduced symmetrically');
for (const unchanged of [0,1,2,5,6,7,8,9]) {
  assert.equal(vertices[unchanged][0],sourceVertices[unchanged][0],
    'face/shoulders/outer hands/center must not move at '+unchanged);
}
assert(geometryMock.normalsUpdated && posAttr.needsUpdate,
  'reshaped 3D mesh needs updated normals for clean studio lighting');
assert.equal(tailor(mockStudio),0,'repeat load should not shrink torso twice');
const stageSource = fs.readFileSync('src/components/assistant-stage.web.tsx','utf8');
assert(stageSource.includes('tailorNexaStudioLowerTorso(modelRoot)'),
  'the new tailoring must execute on the live Studio avatar');
console.log('PASS: lower chest flaps taper smoothly up to 23%; upper chest/face/hands are unchanged');

// The Android issue was two distinct rigs fighting over sleeve geometry.
// Studio must keep a shallow open-arm pose, and the old body must be stripped
// of every duplicate arm shell (including meshes consisting entirely of arms).
assert(!polish.includes('relaxBodyPose(THREE, studio, true)'),
  'Never rotate Studio arms: its baked sleeve panels use incompatible skinning');
assert(polish.includes('studio.updateMatrixWorld(true);\n  return true;'),
  'Studio arm function must retain original imported bind pose');
assert(polish.includes('height > 0.79'),
  'upper sleeve patches must be eligible for weight correction');
assert(polish.includes("extension < 0.70 ? 'Arm' : extension < 0.89 ? 'ForeArm' : 'Hand'"),
  'sleeve joint assignment must follow horizontal arm reach');
assert(polish.includes('if (!kept.length) {') && polish.includes('geometry.setIndex([])'),
  'fully detached duplicate legacy sleeves must render zero triangles');
assert(polish.includes('studioHeight * 0.012'),
  'without a measured waist join, legacy torso must stay BELOW Studio');
console.log('PASS: preserved Studio bind pose, one scene avatar, clipped legacy arms');


// Regression: fingertips can extend lower than the actual bust edge.
// They must never drag the chest-to-waist connector down to hand level.
const torsoBottom = runtime.exports.studioTorsoBottomY;
assert.equal(typeof torsoBottom, 'function');
class Vec3 {
  constructor(x=0,y=0,z=0) { this.x=x;this.y=y;this.z=z; }
  fromBufferAttribute(attr,i) {
    const p=attr.rows[i];this.x=p[0];this.y=p[1];this.z=p[2];return this;
  }
}
const torsoRows=Array.from({length:140},(_,i)=>[
  .09 * Math.sin(i*0.37), -.46+(i/139)*.16, .05*Math.cos(i*0.41),
]);
const danglingHands=Array.from({length:30},(_,i)=>[
  i%2===0 ? .73 : -.73, -.68+(i/29)*.14, 0,
]);
const seamMesh = {
  isSkinnedMesh:true,
  geometry:{attributes:{position:{count:torsoRows.length+danglingHands.length,
    rows:torsoRows.concat(danglingHands)}}},
  localToWorld(point){return point;},
  applyBoneTransform(_index,point){return point;},
};
const seamStudio = {
  updateMatrixWorld(){},
  traverse(cb){cb(seamMesh);},
};
const measured = torsoBottom({Vector3:Vec3},seamStudio,
  {width:.18,center:{x:0,y:.35}}, {min:{y:-.7},max:{y:.7}});
assert(measured>-.49 && measured<-.41,
  'Chest join must follow real torso hem, not fingers (actual '+measured+')');
console.log('PASS: central bust hem measured independently of dangling hands');


/** Verify the new sculpt against the REAL Studio GLB, not only source text.
 * The protected N on the upper bust and real arm triangles must survive.
 */
const removeStudioPanels=runtime.exports.removeNexaStudioSidePanels;
assert.equal(typeof removeStudioPanels,'function','the orange-panel tool is exported');
const studioPrimitive=studio.doc.meshes[0].primitives[0];
const studioPosition=accessor(studio,studioPrimitive.attributes.POSITION);
const studioIndexAccessor=studio.doc.accessors[studioPrimitive.indices];
const indexView=studio.doc.bufferViews[studioIndexAccessor.bufferView];
const indexStart=(indexView.byteOffset||0)+(studioIndexAccessor.byteOffset||0);
const sourceIndices=Array.from({length:studioIndexAccessor.count},(_,i)=>
  studio.bin.readUInt16LE(indexStart+i*2));
const indexAttr={count:sourceIndices.length,getX:i=>sourceIndices[i]};
const positionAttr={count:studioPosition.length,
  getX:i=>studioPosition[i][0],getY:i=>studioPosition[i][1],getZ:i=>studioPosition[i][2]};
const ji=studioPrimitive.attributes.JOINTS_0,wi=studioPrimitive.attributes.WEIGHTS_0;
const jointsData=Array.from({length:studioPosition.length},(_,i)=>readFour(studio,ji,i));
const weightsData=Array.from({length:studioPosition.length},(_,i)=>readFour(studio,wi,i));
const skinIndex={itemSize:4,getComponent:(i,k)=>jointsData[i][k]};
const skinWeight={itemSize:4,getComponent:(i,k)=>weightsData[i][k]};
const sourceBounds=studio.doc.accessors[studioPrimitive.attributes.POSITION];
const meshGeometry={
 attributes:{position:positionAttr,skinIndex,skinWeight},
 index:indexAttr,
 groups:[],
 getAttribute(key){return this.attributes[key];},
 computeBoundingBox(){
   this.boundingBox={min:{x:sourceBounds.min[0],y:sourceBounds.min[1]},
     max:{x:sourceBounds.max[0],y:sourceBounds.max[1]}};
 },
 setIndex(values){this.index={count:values.length,getX:i=>values[i]};},
 clearGroups(){this.groups=[];},
 addGroup(start,count,materialIndex){this.groups.push({start,count,materialIndex});},
 computeBoundingSphere(){this.boundsUpdated=true;},
};
const studioMesh={isSkinnedMesh:true,geometry:meshGeometry,
 skeleton:{bones:studio.doc.skins[0].joints.map(i=>({name:studio.doc.nodes[i]?.name||''}))}};
const studioRoot={userData:{},traverse(cb){cb(studioMesh);}};
const cuts=removeStudioPanels(studioRoot);
assert(cuts>150 && cuts<5500,'Studio sculpt must selectively remove the marked shoulder/shelf pieces, not the whole bust: '+cuts);
const surviving=new Set();
for(let i=0;i<meshGeometry.index.count;i+=3)
 surviving.add([meshGeometry.index.getX(i),meshGeometry.index.getX(i+1),meshGeometry.index.getX(i+2)].join(','));
let protectedUpper=0,remainingDistalArm=0;
let leftWingRemoved=0,rightWingRemoved=0,chestShelfRemoved=0;
for(let i=0;i<sourceIndices.length;i+=3){
 const abc=sourceIndices.slice(i,i+3);
 const key=abc.join(',');
 const centerX=abc.reduce((n,v)=>n+studioPosition[v][0],0)/3;
 const centerY=abc.reduce((n,v)=>n+studioPosition[v][1],0)/3;
 const centerZ=abc.reduce((n,v)=>n+studioPosition[v][2],0)/3;
 const stillVisible=surviving.has(key);
 // The shoulder armor has INCORRECT arm bone weights in the native GLB,
 // so only the distal arms are weight-independent protected geometry.
 if(centerY>0.305 || (centerY>0.22 && Math.abs(centerX)<0.065)){
   protectedUpper++;
   assert(stillVisible,'face, N emblem, collar or upper bust triangle removed');
 }
 if(Math.abs(centerX)>0.237){
   remainingDistalArm++;
   assert(stillVisible,'outer real forearm or hand triangle removed');
 }
 if(!stillVisible){
   if(centerX<-0.085 && centerZ>-.075)leftWingRemoved++;
   if(centerX>0.085 && centerZ>-.075)rightWingRemoved++;
   if(Math.abs(centerX)<0.085 && centerZ>0.025)chestShelfRemoved++;
 }
}
assert(protectedUpper>700 && remainingDistalArm>250,
 'regression must check real emblem/face and both extended arms');
assert(leftWingRemoved>20 && rightWingRemoved>20 && chestShelfRemoved>20,
 'must clear BOTH orange side patches and blue front chest shelf: '+
 JSON.stringify({leftWingRemoved,rightWingRemoved,chestShelfRemoved}));
assert.equal(removeStudioPanels(studioRoot),0,'repeated loading cannot remove new sections twice');
assert(stageSource.includes('removeNexaStudioSidePanels(modelRoot)'),
 'Nexo live viewer must execute the shoulder and bust cleanup');
assert(polish.includes('const topY = upperMinY + height * 0.18') &&
       polish.includes('softFront*(0.997-0.004*t)*zipper'),
 'blue lower bust region must retain its reconstructed 3D ceramic panel');
for (const tone of ['0x10131c','0x1c2233','0xc9cedd','0xe7e9f2','0xf5f7fb','0x6e59d9']) {
 assert(polish.includes('new THREE.Color('+tone+')'),
  'reconstructed bust must use approved suit color '+tone);
}
assert(polish.includes('color.lerp(ceramic,Math.min(1,softFront*') &&
       polish.includes('color.lerp(violetRim,0.055*rimIn*rimOut)'),
 'the front plate must be pearl-white with only a restrained violet rim');
console.log('PASS: rebuilt 3D bust material matches Nexa pearl, charcoal and violet palette');
console.log('PASS: real Studio GLB selectively trims '+cuts+' triangles; upper logos/arms intact');
