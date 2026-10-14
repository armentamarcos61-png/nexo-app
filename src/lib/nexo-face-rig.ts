/**
 * Male Nexo rig: uses authored glTF morph targets on the real skinned Meshy
 * model. Independently animates both upper eyelids, iris/gaze shapes, lips,
 * eyebrows and micro-head motion, without deforming the neck or whole skull.
 */
export type NexoFaceController={
  available:boolean;
  update:(dt:number,time:number,speaking:boolean,text:string)=>void;
  dispose:()=>void;
};
const clamp=(n:number,a:number,b:number)=>Math.min(b,Math.max(a,n));
const ease=(n:number)=>{const t=clamp(n,0,1);return t*t*(3-2*t);};

// Meshy bakes the facial detail into a full-body texture. Source blendshapes
// move only 0.0005–0.0086 model units: calibrate the existing face *geometry*
// once so a real eyelid closure and vowel are visible on mobile.
// Scaling only the 13 localized original deltas preserves skinning and texture.
const prepared=new WeakSet<object>();
export function calibrateNexoFaceMorphs(root:any):number {
 let changed=0;
 const factors:Record<string,number>={
  EyeBlinkLeft:1.94,EyeBlinkRight:1.94,
  EyeLookLeft:2.45,EyeLookRight:2.45,EyeLookUp:2.2,EyeLookDown:2.2,
  BrowRaiseLeft:2.05,BrowRaiseRight:2.05,BrowFrown:1.7,
  MouthOpen:2.25,MouthO:3.3,MouthWide:4.0,MouthSmile:2.5,
 };
 root.traverse?.((node:any)=>{
  const geom=node.geometry, targets=geom?.morphAttributes?.position;
  if(!geom||!targets||prepared.has(geom)||!node.morphTargetDictionary)return;
  prepared.add(geom);
  for(const [name,multiplier] of Object.entries(factors)){
   const idx=node.morphTargetDictionary[name], attr=targets[idx];
   if(!Number.isInteger(idx)||!attr)continue;
   for(let i=0;i<attr.count;i++)attr.setXYZ(i,
    attr.getX(i)*multiplier,attr.getY(i)*multiplier,attr.getZ(i)*multiplier);
   attr.needsUpdate=true;
   changed++;
  }
 });
 return changed;
}
export function installNexoFaceRig(THREE:any,root:any):NexoFaceController{
 calibrateNexoFaceMorphs(root);
 const channels=new Map<string,{mesh:any,index:number}[]>();
 root.traverse?.((node:any)=>{
  if(!node.isMesh||!node.morphTargetDictionary||!node.morphTargetInfluences)return;
  for(const [name,index] of Object.entries(node.morphTargetDictionary)){
   if(typeof index!=='number')continue;
   const values=channels.get(name)||[];
   values.push({mesh:node,index});channels.set(name,values);
  }
 });
 const requested=['EyeBlinkLeft','EyeBlinkRight','MouthOpen','MouthO','MouthWide',
  'BrowRaiseLeft','BrowRaiseRight','EyeLookLeft','EyeLookRight','EyeLookUp','EyeLookDown'];
 const available=requested.every(k=>channels.has(k));
 const head=root.getObjectByName?.('mixamorig:Head')||null;
 const delta=Object.create(null) as Record<string,number>;
 const set=(name:string,target:number,dt:number,speed=16)=>{
  const last=delta[name]||0;
  const value=last+(clamp(target,0,1)-last)*(1-Math.exp(-dt*speed));
  delta[name]=value;
  for(const c of channels.get(name)||[])c.mesh.morphTargetInfluences[c.index]=value;
 };
 let nextBlink=1.85,lastBlink=-10;
 // The original Meshy character has a painted mouth; the rose opening
 // supplements small lip morphs only while actually talking.
 let inner:any=null;
 let innerMaterial:any=null;
 if(available&&head&&THREE.Mesh&&THREE.SphereGeometry){
  // Meshy source rest-pose mouth center, in model coordinates. Transform once
  // into actual head-bone space so it follows the face, not the shoulders.
  root.updateMatrixWorld(true);
  // Find lips from the actual skinned MouthOpen vertices, not the old hardcoded
  // height that placed the interior below this Meshy's mouth.
  let anchor:any=null;
  root.traverse?.((node:any)=>{
   if(anchor||!node.isSkinnedMesh||!node.geometry?.attributes?.position)return;
   const idx=node.morphTargetDictionary?.MouthOpen;
   const morph=node.geometry.morphAttributes?.position?.[idx];
   if(!Number.isInteger(idx)||!morph)return;
   const positions=node.geometry.attributes.position;
   const point=new THREE.Vector3(),sum=new THREE.Vector3();
   let total=0,peak=0;
   for(let i=0;i<morph.count;i++)
    peak=Math.max(peak,Math.hypot(morph.getX(i),morph.getY(i),morph.getZ(i)));
   for(let i=0;i<morph.count;i++){
    const weight=Math.hypot(morph.getX(i),morph.getY(i),morph.getZ(i));
    if(weight<peak*.42)continue;
    point.fromBufferAttribute(positions,i);
    node.applyBoneTransform?.(i,point);
    node.localToWorld(point);
    sum.addScaledVector(point,weight);total+=weight;
   }
   if(total>1e-8)anchor=head.worldToLocal(sum.multiplyScalar(1/total));
  });
  if(!anchor)anchor=head.worldToLocal(root.localToWorld(
   new THREE.Vector3(0,1.587,0.096)));
  // Recessed behind the actual lip surface; never float over the face.
  anchor.z-=.003;
  innerMaterial=new THREE.MeshStandardMaterial({
   color:0xAA6579,roughness:0.95,metalness:0,
   transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide,
  });
  inner=new THREE.Mesh(new THREE.SphereGeometry(1,20,12),innerMaterial);
  inner.name='Nexo soft rose inner mouth';
  inner.position.copy(anchor);
  inner.scale.set(.028,.0001,.002);
  inner.visible=false;
  inner.renderOrder=6;
  head.add(inner);
 }
 const restHeadRotation=head?.quaternion?.clone?.()||null;
 return {
  available,
  update(dt,time,speaking,text){
   if(!available)return;
   const safeDt=clamp(dt,0,.08);
   // Upper lids close together in 110ms and reopen in 180ms.
   if(time>=nextBlink){
    lastBlink=time;
    nextBlink=time+2.65+1.10*(.5+.5*Math.sin(time*1.37));
   }
   const age=time-lastBlink;
   const blink=age<0?0:age<.13?ease(age/.13):age<.23?1:
    age<.45?1-ease((age-.23)/.22):0;
   // Importer-side morph geometry has matched displacement amplitudes.
   set('EyeBlinkLeft',blink,safeDt,32);
   set('EyeBlinkRight',blink,safeDt,32);
   const lookX=.60*Math.sin(time*.43)*(.65+.35*Math.sin(time*.27));
   const lookY=.31*Math.sin(time*.29);
   set('EyeLookLeft',Math.max(0,-lookX),safeDt,4);
   set('EyeLookRight',Math.max(0,lookX),safeDt,4);
   set('EyeLookUp',Math.max(0,lookY),safeDt,4);
   set('EyeLookDown',Math.max(0,-lookY),safeDt,4);
   const content=text.trim();
   const phoneme=content.length?content[Math.floor((time*7.4)%content.length)]?.toLowerCase()||'':'';
   const vowel=/[aeáé]/.test(phoneme)?1:/[oóuú]/.test(phoneme)?.83:/[ií]/.test(phoneme)?.55:/[mpb]/.test(phoneme)?.07:.43;
   const cadence=.5+.5*Math.sin(time*12.7);
   const open=speaking?(.20+.59*vowel)*(.48+.52*cadence):0;
   set('MouthOpen',open,safeDt,18);
   set('MouthO',speaking&&/[oóuú]/.test(phoneme)?.45:0,safeDt,15);
   set('MouthWide',speaking&&/[ieíé]/.test(phoneme)?.34:0,safeDt,14);
   set('MouthSmile',speaking?.09:.14,safeDt,4);
   const eyebrow=speaking?.34+.10*Math.sin(time*3.8):.19+.075*Math.sin(time*.8);
   set('BrowRaiseLeft',eyebrow,safeDt,4);
   set('BrowRaiseRight',eyebrow*.93,safeDt,4);
   if(inner&&innerMaterial){
    const v=delta.MouthOpen||0;
    inner.visible=speaking&&v>.18;
    inner.scale.set(.023+v*.007,.0004+v*.010,.0013);
    innerMaterial.opacity=clamp((v-.18)*1.7,0,.78);
   }
   if(head){
    // Small gestures are additive to the body's own pose. The mixer resets
    // animation tracks before each call; no accumulating neck rotation.
    const nod=.011*Math.sin(time*.73)+(speaking?.018*Math.sin(time*2.1):0);
    const tilt=.011*Math.sin(time*.51);
    // Reset to the imported neutral head before adding this frame's subtle pose.
    // A stopped body clip must never accumulate rotations on every frame.
    if(restHeadRotation)head.quaternion.copy(restHeadRotation);
    head.quaternion.multiply(new THREE.Quaternion().setFromEuler(
     new THREE.Euler(nod,tilt,0,'YXZ')));
   }
  },
  dispose(){
   if(inner){inner.parent?.remove(inner);inner.geometry?.dispose?.();}
   innerMaterial?.dispose?.();
   for(const [name,refs] of channels)for(const c of refs)c.mesh.morphTargetInfluences[c.index]=0;
  },
 };
}
