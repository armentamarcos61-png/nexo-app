/** Nexa: facial motion is bounded, smooth and deterministic.
 * The current TTS provides speaking start/stop (no phoneme timestamps).
 * Facial motion does not rotate or translate the skull except for a very
 * small, reversible neck/head micro gesture.
 */
export interface NexaFaceRig {
  available: boolean;
  beforeUpdate(): void;
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

export function installNexaFaceRig(_THREE: any, root: any): NexaFaceRig {
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
      const vowel=(0.28+0.51*pulse)*(0.68+0.32*syllable)*pause;
      set('MouthOpen',speaking?vowel:0,speaking?18:12);
      set('MouthO',speaking?(0.5+0.5*Math.sin(t*3.4))*vowel*0.20:0,11);
      set('MouthWide',speaking?(0.5+0.5*Math.sin(t*4.1+1.6))*vowel*0.18:0,11);
      set('MouthSmile',speaking?0.055:0.085,3);
      // Local eyelid morphs; never deform temples or change neck coordinates.
      let blink=0;
      if(seconds>=blinkAt){
        const age=seconds-blinkAt;
        blink=age<0.09?ease(age/0.09):age<0.145?1:age<0.30?1-ease((age-0.145)/0.155):0;
        if(age>=0.30) blinkAt+=3.1+0.35*Math.sin(blinkAt*0.53);
      }
      values.EyeBlinkLeft=values.EyeBlinkRight=blink;
      // Iris look targets are independent of the eyebrow expression.
      const gazeX=(0.5+0.5*Math.sin(seconds*0.57))*0.20*Math.sin(seconds*0.32);
      const gazeY=0.11*Math.sin(seconds*0.38+0.9);
      set('EyeLookLeft',Math.max(0,-gazeX),2.8);
      set('EyeLookRight',Math.max(0,gazeX),2.8);
      set('EyeLookUp',Math.max(0,gazeY),2.7);
      set('EyeLookDown',Math.max(0,-gazeY),2.7);
      // Studio's native eyebrow shapes are restrained: a very small weight
      // was imperceptible on phones. Make expressions visible, still smooth.
      // Brows and eyes stay anatomically independent of mouth and head.
      const expression=speaking?0.18+0.31*ease(syllable):0.11;
      set('BrowRaiseLeft',expression,4.2);
      set('BrowRaiseRight',expression*0.96,4.2);
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
