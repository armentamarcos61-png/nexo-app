/**
 * Derive a comfortable arms-down rest pose from the *actual* skinned skeleton.
 * No joint axis is guessed: world-space elbow direction is rotated towards
 * the relaxed-down vector, then converted back to the bone's local quaternion.
 * This preserves the imported character's shoulders, palms, head and textures.
 */
export type RelaxedBone={bone:any;quaternion:any};
function upperArm(THREE:any,root:any,side:'Left'|'Right'):RelaxedBone|null{
 const arm=root.getObjectByName?.('mixamorig:'+side+'Arm')||
  root.getObjectByName?.(side+'Arm');
 const elbow=root.getObjectByName?.('mixamorig:'+side+'ForeArm')||
  root.getObjectByName?.(side+'ForeArm');
 if(!arm||!elbow||!arm.parent)return null;
 root.updateMatrixWorld?.(true);
 const shoulder=arm.getWorldPosition(new THREE.Vector3());
 const handJoint=elbow.getWorldPosition(new THREE.Vector3());
 const current=handJoint.sub(shoulder);
 if(current.length()<0.001)return null;
 const leftRight=current.x<0?-1:1;
 // The elbow hangs slightly away from the hip and towards the camera,
 // without locking it into an artificial military-straight pose.
 const lowered=new THREE.Vector3(leftRight*0.14,-1,0.08).normalize();
 const correction=new THREE.Quaternion().setFromUnitVectors(
  current.normalize(),lowered);
 const world=arm.getWorldQuaternion(new THREE.Quaternion());
 const parent=arm.parent.getWorldQuaternion(new THREE.Quaternion());
 const local=parent.invert().multiply(correction.multiply(world)).normalize();
 return {bone:arm,quaternion:local};
}
export function relaxedArmBones(THREE:any,root:any):RelaxedBone[]{
 return (['Left','Right'] as const)
  .map(side=>upperArm(THREE,root,side))
  .filter((part):part is RelaxedBone=>!!part);
}
export function relaxedIdleClip(THREE:any,root:any,duration=4):any{
 const tracks:any[]=[];
 const arms=relaxedArmBones(THREE,root);
 // Include all skeleton joints in the idle clip to avoid retaining a
 // distorted final action pose after a walk/run/gesture.
 root.traverse?.((bone:any)=>{
  if(!bone.isBone||/(?:Head|Neck|headfront)/i.test(bone.name))return;
  const relaxed=arms.find(item=>item.bone===bone);
  const baseline=relaxed?.quaternion??bone.quaternion;
  const values:number[]=[];
  const times=[0,duration*.25,duration*.50,duration*.75,duration];
  for(let i=0;i<times.length;i++){
   // 1.3-degree shoulder breathing, slow periodic, no twitching.
   const breathing=relaxed
    ? new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1,0,0),i===1?.012:i===3?-.012:0)
    :null;
   const q=breathing?baseline.clone().multiply(breathing):baseline;
   values.push(q.x,q.y,q.z,q.w);
  }
  tracks.push(new THREE.QuaternionKeyframeTrack(bone.name+'.quaternion',
   times,values));
  // Hold bone offsets from the imported skeleton; never move the pelvis
  // along the stage, including during cross-fades.
  const p=bone.position;
  tracks.push(new THREE.VectorKeyframeTrack(bone.name+'.position',
   [0,duration],[p.x,p.y,p.z,p.x,p.y,p.z]));
 });
 return new THREE.AnimationClip('Assistant_RelaxedArmsDown',duration,tracks);
}
