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
export function installNexoFaceRig(THREE:any,root:any):NexoFaceController{
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
 let nextBlink=2.2,lastBlink=-10;
 // The original Meshy character has a painted mouth; the rose opening
 // supplements small lip morphs only while actually talking.
 let inner:any=null;
 let innerMaterial:any=null;
 if(available&&head&&THREE.Mesh&&THREE.SphereGeometry){
  // Meshy source rest-pose mouth center, in model coordinates. Transform once
  // into actual head-bone space so it follows the face, not the shoulders.
  root.updateMatrixWorld(true);
  const world=root.localToWorld(new THREE.Vector3(0,1.564,0.107));
  const anchor=head.worldToLocal(world);
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
 let lastTime=0;
 return {
  available,
  update(dt,time,speaking,text){
   if(!available)return;
   const safeDt=clamp(dt,0,.08);
   // Upper lids close together in 110ms and reopen in 180ms.
   if(time>=nextBlink){
    lastBlink=time;
    nextBlink=time+3.0+1.9*(.5+.5*Math.sin(time*1.37));
   }
   const age=time-lastBlink;
   const blink=age<0?0:age<.11?ease(age/.11):age<.18?1:
    age<.38?1-ease((age-.18)/.20):0;
   // Importer-side morph geometry has matched displacement amplitudes.
   set('EyeBlinkLeft',blink,safeDt,32);
   set('EyeBlinkRight',blink,safeDt,32);
   const lookX=.36*Math.sin(time*.43)*(.65+.35*Math.sin(time*.27));
   const lookY=.18*Math.sin(time*.29);
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
   set('MouthSmile',speaking?.10:.17,safeDt,4);
   const eyebrow=speaking?.14+.07*Math.sin(time*4.8):.05+.025*Math.sin(time*.8);
   set('BrowRaiseLeft',eyebrow,safeDt,4);
   set('BrowRaiseRight',eyebrow*.93,safeDt,4);
   if(inner&&innerMaterial){
    const v=delta.MouthOpen||0;
    inner.visible=speaking&&v>.18;
    inner.scale.set(.027+v*.004,.0004+v*.008,.0018);
    innerMaterial.opacity=clamp((v-.18)*1.7,0,.78);
   }
   if(head){
    // Small gestures are additive to the body's own pose. The mixer resets
    // animation tracks before each call; no accumulating neck rotation.
    const nod=.011*Math.sin(time*.73)+(speaking?.018*Math.sin(time*2.1):0);
    const tilt=.011*Math.sin(time*.51);
    head.quaternion.multiply(new THREE.Quaternion().setFromEuler(
     new THREE.Euler(nod,tilt,0,'YXZ')));
   }
   lastTime=time;
  },
  dispose(){
   if(inner){inner.parent?.remove(inner);inner.geometry?.dispose?.();}
   innerMaterial?.dispose?.();
   for(const [name,refs] of channels)for(const c of refs)c.mesh.morphTargetInfluences[c.index]=0;
  },
 };
}
