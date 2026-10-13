import React,{useEffect,useRef,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';
import {LinearGradient} from 'expo-linear-gradient';
import {NEXO_IMAGE_DATA} from '@/components/assistant-media/nexo-image';
import {getStoredNexoGLB,saveNexoGLB} from '@/lib/nexo-model-cache';
import {installNexoFaceRig,type NexoFaceController} from '@/lib/nexo-face-rig';
import type {AssistantProfile} from '@/state/assistant';

type Props={profile:AssistantProfile;speaking?:boolean;speechText?:string};
const clamp=(x:number,min:number,max:number)=>Math.max(min,Math.min(max,x));
function sourceUrl(){
 const envBase=process.env.EXPO_BASE_URL;
 if(envBase)return (envBase.endsWith('/')?envBase:envBase+'/')+'models/Nexo_FacialReady_v1.glb';
 const base=globalThis.location?.pathname?.startsWith('/nexo-app')?'/nexo-app':'';
 return base+'/models/Nexo_FacialReady_v1.glb';
}
export function NexoModelStage({speaking=false,speechText=''}:Props){
 const host=useRef<any>(null);
 const spoken=useRef(speaking);
 const spokenText=useRef(speechText);
 const mixerRef=useRef<any>(null);
 const gestureRef=useRef<Record<string,any>>({});
 const activeGesture=useRef<any>(null);
 const controlRef=useRef<NexoFaceController|null>(null);
 const orbit=useRef({yaw:0,pitch:0,zoom:4.4,targetY:.9});
 const presets=useRef({body:{zoom:4.4,targetY:.9},face:{zoom:1.2,targetY:1.60}});
 const [view,setView]=useState<'body'|'face'>('body');
 const [loaded,setLoaded]=useState(false);
 const [status,setStatus]=useState('Preparando el modelo masculino 3D…');
 const [retry,setRetry]=useState(0);
 const [importing,setImporting]=useState(false);
 const uploaderRef=useRef<any>(null);
 const importModel=async(file:File|null)=>{
  if(!file)return;
  setImporting(true);
  try{
   await saveNexoGLB(file);
   setStatus('Nexo 3D guardado en este navegador. Abriendo modelo…');
   setRetry(x=>x+1);
  }catch(error){setStatus(error instanceof Error?error.message:'Modelo de Nexo inválido');}
  finally{setImporting(false);}
 };
 useEffect(()=>{spoken.current=speaking;},[speaking]);
 useEffect(()=>{spokenText.current=speechText;},[speechText]);

 useEffect(()=>{
  if(typeof window==='undefined'||!host.current)return;
  const element=host.current;
  let destroyed=false;
  let animationFrame=0;
  let renderer:any=null;
  let root:any=null;
  let cancelResize:()=>void=()=>{};
  let facial:NexoFaceController|null=null;
  let clock=0,last=0;
  const pointerMap=new Map<number,{x:number;y:number}>();
  let pinchDistance=0;
  const clampPan=()=>{orbit.current.targetY=clamp(orbit.current.targetY,-.2,2.0);};
  const pointerSpacing=()=>{
   const p=[...pointerMap.values()];
   return p.length===2?Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y):0;
  };
  const down=(e:PointerEvent)=>{
   if(e.pointerType==='mouse'&&e.button!==0)return;
   e.preventDefault();pointerMap.set(e.pointerId,{x:e.clientX,y:e.clientY});
   element.setPointerCapture?.(e.pointerId);
   pinchDistance=pointerSpacing();
  };
  const move=(e:PointerEvent)=>{
   const previous=pointerMap.get(e.pointerId);
   if(!previous)return;
   e.preventDefault();
   const dy=e.clientY-previous.y;
   if(pointerMap.size===1){
    orbit.current.yaw=clamp(orbit.current.yaw+(e.clientX-previous.x)*.010,-Math.PI,Math.PI);
    orbit.current.pitch=clamp(orbit.current.pitch-dy*.007,-1.12,1.12);
   }else if(pointerMap.size===2){
    const dist=pointerSpacing();if(dist>5&&pinchDistance>5){
     orbit.current.zoom=clamp(orbit.current.zoom*pinchDistance/dist,.7,8);
    }
    orbit.current.targetY+=dy*.002;clampPan();
    pinchDistance=dist;
   }
   pointerMap.set(e.pointerId,{x:e.clientX,y:e.clientY});
  };
  const up=(e:PointerEvent)=>{pointerMap.delete(e.pointerId);pinchDistance=pointerSpacing();};
  const wheel=(e:WheelEvent)=>{e.preventDefault();orbit.current.zoom=clamp(
   orbit.current.zoom+e.deltaY*.002,.7,8);};
  element.replaceChildren();
  element.style.touchAction='none';
  element.addEventListener('pointerdown',down);
  element.addEventListener('pointermove',move);
  element.addEventListener('pointerup',up);
  element.addEventListener('pointercancel',up);
  element.addEventListener('lostpointercapture',up);
  element.addEventListener('wheel',wheel,{passive:false});
  const controller=new AbortController();
  async function boot(){
   try{
    const [THREE,{GLTFLoader}]=await Promise.all([
     import('three'),import('three/examples/jsm/loaders/GLTFLoader.js'),
    ]);
    if(destroyed)return;
    let array=await getStoredNexoGLB().catch(()=>null);
    if(!array){
     const response=await fetch(sourceUrl(),{signal:controller.signal,cache:'force-cache'});
     if(!response.ok)throw Error('El 3D de Nexo está preparado. Importa Nexo_FacialReady_v1.glb para visualizarlo.');
     array=await response.arrayBuffer();
    }
    if(array.byteLength<50000||new DataView(array).getUint32(0,true)!==0x46546c67)
     throw Error('El modelo de Nexo está incompleto.');
    const gltf=await new GLTFLoader().parseAsync(array,
     new URL('.',new URL(sourceUrl(),window.location.href)).href);
    if(destroyed)return;
    root=gltf.scene;
    const meshInfo={skinned:0,morphs:0};
    root.traverse((object:any)=>{
     if(object.isSkinnedMesh){meshInfo.skinned++;object.frustumCulled=false;}
     if(object.morphTargetDictionary)meshInfo.morphs+=Object.keys(object.morphTargetDictionary).length;
    });
    if(meshInfo.skinned<1||meshInfo.morphs<10||gltf.animations.length<4)
     throw Error('Nexo requiere malla articulada, gestos faciales y animaciones de cuerpo.');
    const scene=new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xddeeff,0x19213b,1.45));
    const key=new THREE.DirectionalLight(0xffffff,2.35);key.position.set(2.3,3.1,3.9);scene.add(key);
    const rim=new THREE.DirectionalLight(0x3279ff,2.1);rim.position.set(-2.1,2.5,-2);scene.add(rim);
    renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'default'});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.18;
    renderer.domElement.style.cssText='display:block;width:100%;height:100%;pointer-events:none';
    element.appendChild(renderer.domElement);
    scene.add(root);
    // The biped models are 1.8m in Meshy units. Keep original proportions.
    const bounds=new THREE.Box3().setFromObject(root);
    const center=bounds.getCenter(new THREE.Vector3());
    const size=bounds.getSize(new THREE.Vector3());
    root.position.x=-center.x;root.position.z=-center.z;
    root.updateMatrixWorld(true);
    const standing=size.y||1.8;
    const baseZoom=clamp(standing*2.1,2.5,6);
    presets.current.body={zoom:baseZoom,targetY:standing*.51};
    presets.current.face={zoom:1.25,targetY:standing*.88};
    orbit.current={yaw:0,pitch:0,...presets.current.body};
    const camera=new THREE.PerspectiveCamera(33,1,.01,100);
    const resize=()=>{
     if(destroyed||!renderer)return;
     const w=Math.max(1,element.clientWidth),h=Math.max(1,element.clientHeight);
     renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
    };
    resize();
    if(typeof ResizeObserver!=='undefined'){
     const ro=new ResizeObserver(resize);ro.observe(element);cancelResize=()=>ro.disconnect();
    }else {window.addEventListener('resize',resize);cancelResize=()=>window.removeEventListener('resize',resize);}
    facial=installNexoFaceRig(THREE,root);controlRef.current=facial;
    if(!facial.available)throw Error('Los controles faciales del archivo no coinciden.');
    const mixer=new THREE.AnimationMixer(root);mixerRef.current=mixer;
    const clips:Record<string,any>={};
    for(const animation of gltf.animations){
     const name=animation.name.toLowerCase();
     // Facial micro-motions own the head joint. Body clips only drive the
     // limbs/torso, avoiding competing head rotations or cumulative drift.
     const bodyClip=animation.clone();
     bodyClip.tracks=bodyClip.tracks.filter((track:any)=>
      !/^mixamorig:Head\.(quaternion|rotation|position)$/.test(track.name));
     clips[name]=mixer.clipAction(bodyClip);
     clips[name].setLoop(THREE.LoopOnce,1);
     clips[name].clampWhenFinished=true;
    }
    gestureRef.current=clips;
    const initial=clips['wave_one_hand'];
    if(initial){initial.reset().setEffectiveWeight(.8).play();activeGesture.current=initial;}
    setLoaded(true);
    setStatus('Nexo 3D · rostro y cuerpo articulados');
    const animate=(now:number)=>{
     if(destroyed)return;
     const dt=last?clamp((now-last)*.001,.001,.06):.016;last=now;
     if(document.visibilityState!=='hidden'){
      clock+=dt;
      mixer.update(dt);
      facial?.update(dt,clock,spoken.current,spokenText.current);
      const target=orbit.current;
      const yaw=target.yaw,pitch=target.pitch,dist=target.zoom;
      const h=target.targetY;
      camera.position.set(Math.sin(yaw)*Math.cos(pitch)*dist,h+Math.sin(pitch)*dist,
       Math.cos(yaw)*Math.cos(pitch)*dist);
      camera.lookAt(0,h,0);
      renderer.render(scene,camera);
     }
     animationFrame=requestAnimationFrame(animate);
    };
    animationFrame=requestAnimationFrame(animate);
   }catch(e){
    if(destroyed||controller.signal.aborted)return;
    setLoaded(false);setStatus(e instanceof Error?e.message:'No se pudo preparar Nexo 3D');
   }
  }
  void boot();
  return ()=>{
   destroyed=true;controller.abort();cancelAnimationFrame(animationFrame);
   element.removeEventListener('pointerdown',down);element.removeEventListener('pointermove',move);
   element.removeEventListener('pointerup',up);element.removeEventListener('pointercancel',up);
   element.removeEventListener('lostpointercapture',up);element.removeEventListener('wheel',wheel);
   cancelResize();facial?.dispose();controlRef.current=null;
   mixerRef.current?.stopAllAction?.();mixerRef.current=null;gestureRef.current={};activeGesture.current=null;
   root?.traverse?.((obj:any)=>{
    obj.geometry?.dispose?.();
    const materials=Array.isArray(obj.material)?obj.material:[obj.material];
    for(const mat of materials){mat?.map?.dispose?.();mat?.normalMap?.dispose?.();mat?.dispose?.();}
   });
   renderer?.dispose?.();renderer?.domElement?.remove?.();
  };
 },[retry]);
 const pose=(name:string)=>{
  const action=gestureRef.current[name];if(!action||!mixerRef.current)return;
  if(activeGesture.current&&activeGesture.current!==action)
   activeGesture.current.fadeOut(.28);
  action.reset().setEffectiveWeight(1).fadeIn(.28).play();
  activeGesture.current=action;
 };
 function show(mode:'body'|'face'){
  setView(mode);
  orbit.current={yaw:0,pitch:0,...presets.current[mode]};
 }
 return <View style={styles.stage}>
  <View style={styles.portrait}>
   <LinearGradient colors={['#07162D','#172657','#020B1A']} style={StyleSheet.absoluteFill}/>
   {React.createElement('img',{src:NEXO_IMAGE_DATA,alt:'Nexo, asistente masculino',
    style:{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',
     opacity:loaded?0:1,pointerEvents:'none',transition:'opacity 350ms'}})}
   {React.createElement('div',{ref:host,'aria-label':'Nexo masculino 3D interactivo',
    style:{position:'absolute',inset:0,opacity:loaded?1:0,touchAction:'none'}})}
  </View>
  <View style={styles.row}><Text style={styles.name}>● NEXO</Text><Text style={styles.status}>{status}</Text></View>
  {loaded?<><View style={styles.controls}>
   <Pressable style={[styles.btn,view==='body'&&styles.active]} onPress={()=>show('body')}><Text style={styles.btnText}>Cuerpo completo</Text></Pressable>
   <Pressable style={[styles.btn,view==='face'&&styles.active]} onPress={()=>show('face')}><Text style={styles.btnText}>Rostro y gestos</Text></Pressable>
  </View>
  <View style={styles.controls}>
   <Pressable style={styles.btn} onPress={()=>pose('wave_one_hand')}><Text style={styles.btnText}>Saludar</Text></Pressable>
   <Pressable style={styles.btn} onPress={()=>pose('confused_scratch')}><Text style={styles.btnText}>Expresiones</Text></Pressable>
   <Pressable style={styles.btn} onPress={()=>pose('walking_2_inplace')}><Text style={styles.btnText}>Caminar</Text></Pressable>
  </View></>:
   <View style={styles.controls}>
    {React.createElement('input',{
      ref:uploaderRef,type:'file',accept:'.glb,model/gltf-binary',
      'aria-label':'Importar archivo tridimensional de Nexo',
      onChange:(e:any)=>{
       const file=e?.target?.files?.[0]||null;
       void importModel(file);
       if(e?.target)e.target.value='';
      },
      style:{position:'absolute',width:1,height:1,opacity:0,pointerEvents:'none'},
    })}
    <Pressable style={[styles.btn,styles.active]} disabled={importing}
      onPress={()=>uploaderRef.current?.click?.()}>
      <Text style={styles.btnText}>{importing?'Cargando archivo…':'Importar modelo 3D de Nexo'}</Text>
    </Pressable>
    <Pressable style={styles.btn} onPress={()=>setRetry(x=>x+1)}>
     <Text style={styles.btnText}>Reintentar 3D</Text>
    </Pressable>
   </View>}
 </View>;
}
const styles=StyleSheet.create({
 stage:{width:'100%',minHeight:605,paddingTop:8,alignItems:'center'},
 portrait:{width:'91%',maxWidth:350,aspectRatio:.78,borderRadius:28,overflow:'hidden',
  position:'relative',borderWidth:2,borderColor:'rgba(72,174,255,.85)',
  backgroundColor:'#101F3B'},
 row:{marginTop:13,flexDirection:'row',justifyContent:'center',gap:10,flexWrap:'wrap'},
 name:{fontWeight:'900',letterSpacing:1.7,color:'#89DEFF',fontSize:12},
 status:{fontWeight:'700',color:'#ADC6E8',fontSize:11},
 controls:{flexDirection:'row',gap:7,justifyContent:'center',marginTop:11,flexWrap:'wrap'},
 btn:{borderRadius:12,paddingHorizontal:12,paddingVertical:9,marginTop:8,
  backgroundColor:'rgba(26,54,102,.6)',borderWidth:1,borderColor:'#476DAE'},
 active:{borderColor:'#73DFFF',backgroundColor:'#23528A'},
 btnText:{fontSize:11,color:'#E3F2FF',fontWeight:'800'},
});
