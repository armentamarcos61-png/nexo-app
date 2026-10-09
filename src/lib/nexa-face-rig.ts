/**
 * Facial expressions on the existing Nexa GLB.
 * The source GLB has 68 body bones but zero supplied face blendshapes.
 * Four localized, relative morph targets are generated at runtime so no
 * second model, texture download, or new Meshy export is required.
 *
 * This is approximate expression animation. True phoneme lip sync requires
 * a dedicated facial rig and actual audio timing.
 */
export type NexaFaceRig = {
  available: boolean;
  update(dt: number, seconds: number, speaking: boolean): void;
};
type Handle = { mesh: any; start: number };
const clamp = (x:number, a:number, b:number) => Math.max(a,Math.min(b,x));
const smooth=(a:number,b:number,t:number)=>a+(b-a)*clamp(t,0,1);
const gaussian=(x:number,y:number,z:number,cx:number,cy:number,cz:number,rx:number,ry:number,rz:number)=>{
  const d=((x-cx)/rx)**2+((y-cy)/ry)**2+((z-cz)/rz)**2;
  return Math.exp(-d*1.5);
};

export function installNexaFaceRig(THREE:any, root:any):NexaFaceRig{
  const meshes:Handle[]=[];
  let head:any=null;
  root.traverse?.((node:any)=>{
    if(/mixamorig:Head$/i.test(node.name??''))head=node;
    if(!node.isSkinnedMesh)return;
    const geometry=node.geometry;
    const positions=geometry?.getAttribute('position');
    const joints=geometry?.getAttribute('skinIndex');
    const weights=geometry?.getAttribute('skinWeight');
    if(!positions||!joints||!weights)return;
    const headIndex=node.skeleton?.bones?.findIndex((bone:any)=>/mixamorig:Head$/i.test(bone.name));
    if(headIndex==null||headIndex<0)return;

    const count=positions.count;
    const arrays=[
      new Float32Array(count*3), // mouth
      new Float32Array(count*3), // left blink
      new Float32Array(count*3), // right blink
      new Float32Array(count*3), // brow
    ];
    let affected=0;
    for(let i=0;i<count;i++){
      const x=positions.getX(i),y=positions.getY(i),z=positions.getZ(i);
      if(y<1.465||y>1.655||z<0.083||Math.abs(x)>0.084)continue;
      let headWeight=0;
      for(let k=0;k<4;k++){
        if(joints.getComponent(i,k)===headIndex)headWeight+=weights.getComponent(i,k);
      }
      if(headWeight<0.52)continue;
      const front=clamp((z-0.083)/0.042,0,1)*headWeight;

      // Open mouth in two directions; keep cheeks and nose unaffected.
      const mouth=gaussian(x,y,z,0,1.509,0.129,0.047,0.023,0.063)*front;
      if(mouth>0.035){
        affected++;
        const lipTop=clamp((y-1.509)/0.028,-1,1);
        arrays[0][i*3+1]=mouth*(lipTop<0?-0.017:0.007);
        arrays[0][i*3+2]=mouth*0.004;
      }

      // Eyelid surface converges towards the actual eye line.
      for(const [index,eyeX] of [[1,-0.037],[2,0.037]] as const){
        const lid=gaussian(x,y,z,eyeX,1.590,0.127,0.032,0.021,0.074)*front;
        arrays[index][i*3+1]=lid*(1.590-y)*1.45;
        arrays[index][i*3+2]=lid*0.002;
        if(lid>0.08)affected++;
      }

      const brow=(
        gaussian(x,y,z,-0.037,1.624,0.124,0.028,0.014,0.065)+
        gaussian(x,y,z,0.037,1.624,0.124,0.028,0.014,0.065)
      )*front;
      arrays[3][i*3+1]=brow*0.012;
      if(brow>0.09)affected++;
    }
    if(affected<20)return;
    geometry.morphTargetsRelative=true;
    const existing=geometry.morphAttributes.position ?? [];
    const start=existing.length;
    for(const [i,name] of ['mouth','leftBlink','rightBlink','brow'].entries()){
      const attr=new THREE.Float32BufferAttribute(arrays[i],3);
      attr.name='Nexa_'+name;
      existing.push(attr);
    }
    geometry.morphAttributes.position=existing;
    node.updateMorphTargets();
    meshes.push({mesh:node,start});
  });

  let lastMouth=0,lastBrow=0;
  let nextBlink=2.6;
  let blinkStart=-1;
  const baseHead=head?.quaternion?.clone?.();
  const nodQuat=head ? new THREE.Quaternion() : null;
  const smallEuler=head ? new THREE.Euler(0,0,0,'YXZ') : null;

  return {
    available:meshes.length>0,
    update(dt:number,t:number,speaking:boolean){
      // Varied phrase cadence and tiny closures instead of a fixed sine loop.
      const cadence=Math.abs(Math.sin(t*8.9+0.24*Math.sin(t*2.2)));
      const syllables=speaking ? clamp((cadence**1.35)*0.90 + 0.06*Math.abs(Math.sin(t*12.7)),0,1):0;
      lastMouth=smooth(lastMouth,syllables,dt*(speaking?17:10));
      const browGoal=speaking
        ? 0.32+0.38*Math.sin(t*1.22+0.9)**2
        : 0.10+0.17*Math.sin(t*0.6)**2;
      lastBrow=smooth(lastBrow,browGoal,dt*3.6);

      if(blinkStart<0&&t>nextBlink)blinkStart=t;
      let eyeClose=0;
      if(blinkStart>=0){
        const progress=(t-blinkStart)/0.28;
        eyeClose=Math.sin(Math.PI*clamp(progress,0,1))**0.80;
        if(progress>=1){
          blinkStart=-1;
          nextBlink=t+2.1+Math.random()*2.9;
        }
      }
      for(const {mesh,start} of meshes){
        const influences=mesh.morphTargetInfluences;
        if(!influences)continue;
        influences[start]=lastMouth;
        influences[start+1]=eyeClose;
        influences[start+2]=eyeClose*0.98;
        influences[start+3]=lastBrow;
      }

      // Rotations are based on the rest pose only if mixer does not animate head.
      // Model's current clips do animate the head every frame; only a tiny additive nod.
      if(head && nodQuat && smallEuler){
        const nod=Math.sin(t*(speaking?1.9:0.5))*(speaking?0.016:0.007);
        const look=Math.sin(t*0.32)*0.015;
        smallEuler.set(nod,look,0,'YXZ');
        nodQuat.setFromEuler(smallEuler);
        if(baseHead && !head.quaternion) head.quaternion.copy(baseHead);
        head.quaternion.multiply(nodQuat);
      }
    },
  };
}
