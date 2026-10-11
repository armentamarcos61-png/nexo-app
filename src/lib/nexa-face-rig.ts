/** Nexa: facial motion is bounded, smooth and deterministic.
 * The current TTS provides speaking start/stop (no phoneme timestamps).
 * Facial motion does not rotate or translate the skull except for a very
 * small, reversible neck/head micro gesture.
 */
export interface NexaFaceRig {
  available: boolean;
  beforeUpdate(): void;
  setSpeechText(text: string): void;
  update(dt: number, seconds: number, speaking: boolean): void;
}
type CoreName = 'MouthOpen'|'MouthO'|'MouthWide'|'MouthSmile'|
  'EyeBlinkLeft'|'EyeBlinkRight'|'BrowRaiseLeft'|'BrowRaiseRight'|'BrowFrown';
type OptionalName = 'EyeLookLeft'|'EyeLookRight'|'EyeLookUp'|'EyeLookDown';
const REQUIRED: CoreName[] = ['MouthOpen','MouthO','MouthWide','MouthSmile',
  'EyeBlinkLeft','EyeBlinkRight','BrowRaiseLeft','BrowRaiseRight','BrowFrown'];
const OPTIONAL: OptionalName[] = ['EyeLookLeft','EyeLookRight','EyeLookUp','EyeLookDown'];
type Binding = { influences: number[]; channels: Partial<Record<CoreName|OptionalName,number>> };
const clamp=(x:number,a:number,b:number)=>Math.max(a,Math.min(b,x));
const ease=(x:number)=>{const t=clamp(x,0,1);return t*t*(3-2*t);};
const glide=(from:number,to:number,dt:number,speed:number)=>
  from+(to-from)*(1-Math.exp(-clamp(dt,0,0.08)*speed));

/**
 * Tune the ACTUAL morph vertices in Nexa Studio rather than merely raising
 * channel weights. The imported bust's eyelids changed only 14–26 vertices
 * by ~0.004 model units, which was almost invisible on a mobile portrait.
 *
 * One-time, local morph-only edits. The rest mesh, eye outline, facial skin,
 * skull, teeth, brows and neck remain untouched by eyelid movement.
 */
const calibratedGeometry=new WeakSet<object>();
export function calibrateNexaFacialMorphs(root:any):number {
  const processed=calibratedGeometry;
  let tuned=0;
  root.traverse?.((mesh:any)=>{
    const geometry=mesh.geometry;
    const position=geometry?.attributes?.position;
    const targets=geometry?.morphAttributes?.position;
    const dict:Record<string,number>|undefined=mesh.morphTargetDictionary;
    if(!position||!targets||!dict||processed.has(geometry))return;
    processed.add(geometry);

    const findCenter=(name:string)=>{
      const index=dict[name],attr=targets[index];
      if(!Number.isInteger(index)||!attr||attr.count!==position.count)return null;
      let peak=0;
      for(let i=0;i<attr.count;i++){
        peak=Math.max(peak,Math.hypot(attr.getX(i),attr.getY(i),attr.getZ(i)));
      }
      if(peak<1e-7)return null;
      let wx=0,wy=0,wz=0,total=0;
      for(let i=0;i<attr.count;i++){
        const m=Math.hypot(attr.getX(i),attr.getY(i),attr.getZ(i));
        if(m<peak*0.24)continue;
        wx+=position.getX(i)*m;
        wy+=position.getY(i)*m;
        wz+=position.getZ(i)*m;
        total+=m;
      }
      return total?{x:wx/total,y:wy/total,z:wz/total,peak,attr}:null;
    };
    const left=findCenter('EyeBlinkLeft');
    const right=findCenter('EyeBlinkRight');
    if(!left||!right)return;
    const eyeWidth=Math.hypot(left.x-right.x,left.y-right.y,left.z-right.z);
    if(!Number.isFinite(eyeWidth)||eyeWidth<.025||eyeWidth>.8)return;
    const clampScale=(name:string,targetRatio:number,maxScale:number)=>{
      const item=findCenter(name);
      if(!item)return;
      const scale=clamp(eyeWidth*targetRatio/item.peak,1,maxScale);
      if(scale<=1.001)return;
      for(let i=0;i<item.attr.count;i++){
        item.attr.setXYZ(i,
          item.attr.getX(i)*scale,
          item.attr.getY(i)*scale,
          item.attr.getZ(i)*scale);
      }
      item.attr.needsUpdate=true;
      tuned++;
    };

    // Eyelids are repaired exclusively in a small ellipse around each eye;
    // do not pull eyebrows, cheeks, temples or the bridge of the nose.
    for(const name of ['EyeBlinkLeft','EyeBlinkRight']){
      const eye=findCenter(name);
      if(!eye)continue;
      const px=eyeWidth*0.325,py=eyeWidth*0.145;
      for(let i=0;i<eye.attr.count;i++){
        const x=position.getX(i),y=position.getY(i),z=position.getZ(i);
        const ex=(x-eye.x)/px,ey=(y-eye.y)/py;
        if(Math.abs(ex)>=1||Math.abs(ey)>=1||z<eye.z-eyeWidth*.115)continue;
        // The upper eyelid closes DOWN to the eye line. Lower eyelid rises
        // slightly. Wide horizontal feathering preserves the real contour.
        const horizontal=Math.pow(1-ex*ex,1.15);
        const vertical=Math.pow(1-ey*ey,0.40);
        const front=clamp((z-(eye.z-eyeWidth*.115))/(eyeWidth*.105),0,1);
        const lidDistance=y-eye.y;
        const closure=lidDistance>0
          ? -Math.min(lidDistance,eyeWidth*.115)*horizontal*vertical*front*1.15
          : Math.min(-lidDistance,eyeWidth*.08)*horizontal*vertical*front*.53;
        const original=eye.attr.getY(i);
        const bounded=clamp(original*1.18+closure,
          -eyeWidth*.135,eyeWidth*.105);
        eye.attr.setXYZ(i,eye.attr.getX(i),bounded,eye.attr.getZ(i));
      }
      eye.attr.needsUpdate=true;
      tuned++;
    }
    // Mouth targets already isolate lip vertices. Scale those morphs, not the
    // head bone or whole face; do not synthesize a second, disconnected jaw.
    clampScale('MouthOpen',0.115,2.4);
    clampScale('MouthO',0.038,3.0);
    clampScale('MouthWide',0.044,3.0);
    clampScale('EyeLookLeft',0.032,2.3);
    clampScale('EyeLookRight',0.032,2.3);
    clampScale('EyeLookUp',0.022,2.2);
    clampScale('EyeLookDown',0.022,2.2);
    clampScale('BrowRaiseLeft',0.029,1.4);
    clampScale('BrowRaiseRight',0.029,1.4);
  });
  return tuned;
}

export function installNexaFaceRig(_THREE: any, root: any): NexaFaceRig {
  calibrateNexaFacialMorphs(root);
  const binding: Binding[]=[];
  let head:any=null;
  root.traverse?.((node:any)=>{
    if (/mixamorig:Head$/i.test(node.name??'')) head=node;
    if ((!node.isSkinnedMesh&&!node.isMesh)||!node.morphTargetDictionary||!node.morphTargetInfluences) return;
    const dict:Record<string,number>=node.morphTargetDictionary;
    if (!REQUIRED.every(name=>Number.isInteger(dict[name]))) return;
    binding.push({influences:node.morphTargetInfluences,
      channels:Object.fromEntries([...REQUIRED,...OPTIONAL]
        .filter(name=>Number.isInteger(dict[name]))
        .map(name=>[name,dict[name]]))});
  });
  // A small rose-tinted inner mouth, attached to the REAL head bone rather
  // than painted on the face. Only visible through the animated lip opening.
  // It is deliberately subtle: the resting face has no pink oval on it.
  let mouthInterior:any=null;
  let mouthInteriorMat:any=null;
  let mouthOpenPosition:any=null;
  const Three=_THREE;
  if(Three?.SphereGeometry&&Three?.MeshStandardMaterial&&head){
    let source:any=null,channel=-1;
    root.traverse?.((node:any)=>{
      if(source||!node.isSkinnedMesh||!node.geometry?.attributes?.position)return;
      const index=node.morphTargetDictionary?.MouthOpen;
      if(Number.isInteger(index)&&node.geometry.morphAttributes?.position?.[index]){
        source=node;channel=index;
      }
    });
    if(source){
      const pos=source.geometry.attributes.position;
      const d=source.geometry.morphAttributes.position[channel];
      let x=0,y=0,z=0,total=0,largest=0;
      for(let i=0;i<d.count;i++)
        largest=Math.max(largest,Math.hypot(d.getX(i),d.getY(i),d.getZ(i)));
      for(let i=0;i<d.count;i++){
        const strength=Math.hypot(d.getX(i),d.getY(i),d.getZ(i));
        if(strength<largest*.27)continue;
        x+=pos.getX(i)*strength;
        y+=pos.getY(i)*strength;
        z+=pos.getZ(i)*strength;
        total+=strength;
      }
      if(total>0){
        const center=new Three.Vector3(x/total,y/total,z/total);
        source.updateMatrixWorld?.(true);
        head.updateMatrixWorld?.(true);
        source.localToWorld(center);
        // The pink surface sits beneath the upper lip. Its own size follows
        // the actual Studio eye separation and MouthOpen value.
        center.z+=0.002;
        head.worldToLocal(center);
        mouthInteriorMat=new Three.MeshStandardMaterial({
          color:0x99566b,roughness:0.95,metalness:0,
          emissive:0x241017,emissiveIntensity:0.11,
          transparent:true,opacity:0,depthWrite:false,
          side:Three.DoubleSide,
        });
        mouthInterior=new Three.Mesh(
          new Three.SphereGeometry(1,20,12),mouthInteriorMat);
        mouthInterior.name='Nexa soft rose mouth interior';
        mouthInterior.position.copy(center);
        mouthOpenPosition=center.clone();
        mouthInterior.visible=false;
        mouthInterior.frustumCulled=false;
        head.add(mouthInterior);
      }
    }
  }
  const values:Record<CoreName|OptionalName,number>={
    MouthOpen:0,MouthO:0,MouthWide:0,MouthSmile:0.08,
    EyeBlinkLeft:0,EyeBlinkRight:0,
    BrowRaiseLeft:0.06,BrowRaiseRight:0.06,BrowFrown:0,
    EyeLookLeft:0,EyeLookRight:0,EyeLookUp:0,EyeLookDown:0,
  };
  let headX=0,headY=0;
  let speakingWas=false;
  let speechStart=0;
  let blinkAt=2.35;
  let recentSeconds=0;
  // Text-driven pseudo-visemes are synchronized with the voice onStart event.
  // Expo TTS does not expose reliable phoneme timestamps: these are estimated,
  // never presented as exact audio-level lip synchronization.
  let speechUnits: { shape: number; wide: number; open: number; length: number }[] = [];
  const parseSpeech=(text:string)=>{
    const normalized=text.toLocaleLowerCase('es').normalize('NFD')
      .replace(/[\u0300-\u036f]/g,'');
    const units: typeof speechUnits=[];
    for(const char of normalized.slice(0,1100)){
      if(/[.,;:!?]/.test(char))units.push({shape:0,wide:0,open:0,length:0.23});
      else if(/[a]/.test(char))units.push({shape:0.04,wide:0.62,open:0.73,length:0.12});
      else if(/[eiy]/.test(char))units.push({shape:0.04,wide:0.74,open:0.32,length:0.10});
      else if(/[ou]/.test(char))units.push({shape:0.72,wide:0,open:0.40,length:0.14});
      else if(/[bmp]/.test(char))units.push({shape:0,wide:0,open:0.03,length:0.07});
      else if(char===' ')units.push({shape:0,wide:0,open:0.08,length:0.05});
      else if(/[a-zñ]/.test(char))units.push({shape:0.05,wide:0.20,open:0.20,length:0.065});
    }
    speechUnits=units;
  };
  return {
    available:binding.length>0,
    beforeUpdate(){
      if (!head) return;
      // Undo only our own micro gesture, never undo animation clip transforms.
      head.rotation.x-=headX;
      head.rotation.y-=headY;
      headX=0;
      headY=0;
    },
    setSpeechText(text:string){
      parseSpeech(text);
      speechStart=recentSeconds;
    },
    update(dt:number,seconds:number,speaking:boolean){
      if (!Number.isFinite(dt)||dt<=0||!binding.length) return;
      dt=clamp(dt,0,0.08);
      if(seconds<recentSeconds){blinkAt=seconds+2.35;speechStart=seconds;}
      recentSeconds=seconds;
      if(speaking&&!speakingWas)speechStart=seconds;
      speakingWas=speaking;
      const set=(name:CoreName|OptionalName,target:number,speed=9)=>{
        values[name]=clamp(glide(values[name],target,dt,speed),0,1);
      };
      // Deterministic syllabic envelope: expressive but no random twitching.
      const t=Math.max(0,seconds-speechStart);
      const pulse=0.5+0.5*Math.sin(t*13.8+0.3);
      const syllable=0.5+0.5*Math.sin(t*7.1-0.8);
      const pause=ease((Math.sin(t*2.2+0.5)+0.16)*3);
      let vowel=(0.28+0.51*pulse)*(0.68+0.32*syllable)*pause;
      let round=0.12*vowel,wide=0.14*vowel;
      if(speechUnits.length){
        // Use the actual response's sound classes, not a perpetual
        // arbitrary sine wave with identical mouth shapes for all phrases.
        let cycle=0;
        for(const item of speechUnits)cycle+=item.length;
        let clock=t%Math.max(0.12,cycle);
        let selected=speechUnits[speechUnits.length-1];
        for(const item of speechUnits){clock-=item.length;if(clock<=0){selected=item;break;}}
        const articulation=0.76+0.24*pulse;
        vowel=selected.open*articulation;
        round=selected.shape*articulation;
        wide=selected.wide*articulation;
      }
      set('MouthOpen',speaking?clamp(vowel*1.23,0,0.95):0,speaking?19:12);
      set('MouthO',speaking?round:0,14);
      set('MouthWide',speaking?wide:0,14);
      set('MouthSmile',speaking?0.055:0.085,3);
      if(mouthInterior&&mouthInteriorMat&&mouthOpenPosition){
        const opening=values.MouthOpen;
        // Hide inside the resting lips; expand in step with open vowels.
        mouthInterior.visible=speaking&&opening>.12;
        mouthInterior.scale.set(
          .020+values.MouthWide*.003,
          .0005+opening*.0105,
          .0018
        );
        mouthInterior.position.y=mouthOpenPosition.y-opening*.0040;
        mouthInteriorMat.opacity=clamp((opening-.10)*2.1,0,.83);
      }
      // Local eyelid morphs; never deform temples or change neck coordinates.
      let blink=0;
      if(seconds>=blinkAt){
        const age=seconds-blinkAt;
        blink=age<0.115?ease(age/0.115):age<0.21?1:age<0.40?
          1-ease((age-0.21)/0.19):0;
        if(age>=0.40) blinkAt+=3.1+0.35*Math.sin(blinkAt*0.53);
      }
      values.EyeBlinkLeft=values.EyeBlinkRight=blink;
      // Iris look targets are independent of the eyebrow expression.
      const gazeX=(0.5+0.5*Math.sin(seconds*0.57))*0.44*Math.sin(seconds*0.32);
      const gazeY=0.29*Math.sin(seconds*0.38+0.9);
      set('EyeLookLeft',Math.max(0,-gazeX),2.8);
      set('EyeLookRight',Math.max(0,gazeX),2.8);
      set('EyeLookUp',Math.max(0,gazeY),2.7);
      set('EyeLookDown',Math.max(0,-gazeY),2.7);
      // Studio's native eyebrow shapes are restrained: a very small weight
      // was imperceptible on phones. Make expressions visible, still smooth.
      // Brows and eyes stay anatomically independent of mouth and head.
      const expression=speaking?0.11+0.095*ease(syllable):
        0.045+0.027*(0.5+0.5*Math.sin(seconds*0.83));
      set('BrowRaiseLeft',expression,3.3);
      set('BrowRaiseRight',expression*0.96,3.3);
      set('BrowFrown',0,3);
      for(const mesh of binding){
        for(const [name,index] of Object.entries(mesh.channels)){
          if(index!==undefined)mesh.influences[index]=values[name as CoreName|OptionalName];
        }
      }
      // Maximum about 0.6 degrees. No random neck bending.
      if(head){
        headX=(0.004*Math.sin(seconds*0.7)+
          (speaking?0.006*Math.sin(t*0.49):0));
        headY=0.007*Math.sin(seconds*0.47);
        head.rotation.x+=headX;
        head.rotation.y+=headY;
      }
    },
  };
}
