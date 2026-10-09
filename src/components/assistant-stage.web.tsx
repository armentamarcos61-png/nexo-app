import React, { useEffect, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import type { AssistantProfile } from '@/state/assistant';
import { NEXA_IMAGE_DATA } from '@/components/assistant-media/nexa-image';
import { NEXO_IMAGE_DATA } from '@/components/assistant-media/nexo-image';
import { NexaAnimationController } from '@/lib/nexa-animation-controller';
import { installNexaFaceRig, type NexaFaceRig } from '@/lib/nexa-face-rig';

type Props = { profile: AssistantProfile; speaking?: boolean };
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.186.1/+esm';
const LOADER_URL = 'https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/loaders/GLTFLoader.js/+esm';
const clamp = (x: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, x));

function getModelUrl() {
  const base = process.env.EXPO_BASE_URL;
  if (base) return (base.endsWith('/') ? base : base + '/') + 'models/Nexa_Unica_Interactiva.glb';
  const prefix = globalThis.location?.pathname?.startsWith('/nexo-app') ? '/nexo-app' : '';
  return prefix + '/models/Nexa_Unica_Interactiva.glb';
}

/** One circular, close-up 3D Nexa. No duplicate photo/model or zoom buttons. */
export function AssistantStage({ profile, speaking = false }: Props) {
  const isNexa = profile.id === 'nexa';
  const placeholder = isNexa ? NEXA_IMAGE_DATA : NEXO_IMAGE_DATA;
  const hostRef = useRef<any>(null);
  const controllerRef = useRef<NexaAnimationController | null>(null);
  const speakingRef = useRef(speaking);
  const orbitRef = useRef({ yaw: 0, pitch: 0, distance: 1.37 });
  const [loaded, setLoaded] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    speakingRef.current = speaking;
    const controller = controllerRef.current;
    if (!controller) return;
    if (speaking) controller.startSpeaking();
    else controller.stopSpeaking();
  }, [speaking]);

  useEffect(() => {
    const host = hostRef.current;
    controllerRef.current = null;
    if (!host || typeof window === 'undefined' || !isNexa) return;

    let disposed = false;
    let animationFrame = 0;
    let renderer: any = null;
    let modelRoot: any = null;
    let scene: any = null;
    let faceRig: NexaFaceRig | null = null;
    let unregisterResize: (() => void) | undefined;
    let previousTime = 0;
    let totalTime = 0;
    let idleTimer = 0;
    let distance = orbitRef.current.distance;
    let yaw = 0;
    let pitch = 0;
    let perspectiveCamera: any = null;

    // PointerEvents allow one-finger orbit and two-finger pinch on Android.
    const pointers = new Map<number, {x:number;y:number}>();
    let previousPinchDistance = 0;
    let lastTap = 0;
    const pointerDistance = () => {
      const points = [...pointers.values()];
      return points.length === 2
        ? Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y)
        : 0;
    };
    const onDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();
      const now = performance.now();
      if (event.pointerType === 'touch' && now-lastTap < 300) {
        orbitRef.current = { yaw: 0, pitch: 0, distance: 1.37 };
      }
      lastTap = now;
      pointers.set(event.pointerId, {x:event.clientX,y:event.clientY});
      if (pointers.size === 2) previousPinchDistance = pointerDistance();
      host.setPointerCapture?.(event.pointerId);
    };
    const onMove = (event: PointerEvent) => {
      const previous = pointers.get(event.pointerId);
      if (!previous) return;
      event.preventDefault();
      pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if (pointers.size === 2) {
        const next = pointerDistance();
        if (next > 1 && previousPinchDistance > 1) {
          orbitRef.current.distance = clamp(
            orbitRef.current.distance * previousPinchDistance / next,
            1.08, 1.90,
          );
        }
        previousPinchDistance = next;
      } else if (pointers.size === 1) {
        orbitRef.current.yaw = clamp(orbitRef.current.yaw - (event.clientX-previous.x)*0.0033, -0.36, 0.36);
        orbitRef.current.pitch = clamp(orbitRef.current.pitch+(event.clientY-previous.y)*0.0026,-0.14,0.14);
      }
    };
    const onUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId);
      previousPinchDistance = pointers.size === 2 ? pointerDistance() : 0;
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      orbitRef.current.distance = clamp(orbitRef.current.distance+event.deltaY*0.0015, 1.08, 1.90);
    };

    host.replaceChildren();
    host.style.touchAction = 'none';
    host.addEventListener('pointerdown',onDown);
    host.addEventListener('pointermove',onMove);
    host.addEventListener('pointerup',onUp);
    host.addEventListener('pointercancel',onUp);
    host.addEventListener('lostpointercapture',onUp);
    host.addEventListener('wheel',onWheel,{passive:false});

    async function boot() {
      try {
        const dynamicImport = new Function('url', 'return import(url)');
        const [THREE, GLTF] = await Promise.all([
          dynamicImport(THREE_URL), dynamicImport(LOADER_URL),
        ]);
        if (disposed) return;
        scene = new THREE.Scene();
        perspectiveCamera = new THREE.PerspectiveCamera(32,1,0.01,100);
        renderer = new THREE.WebGLRenderer({
          alpha:true,antialias:true,precision:'highp',powerPreference:'high-performance',
        });
        // Keep sharp enough for the close-up without exhausting mobile GPUs.
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2.25));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.97;
        renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;pointer-events:none';
        host.appendChild(renderer.domElement);

        // Soft studio lighting: skin detail first, gentle lavender rim.
        scene.add(new THREE.HemisphereLight(0xf0efff,0x24203d,1.65));
        const softKey = new THREE.DirectionalLight(0xfff5f3,2.6);
        softKey.position.set(1.1,2.5,3.5);
        scene.add(softKey);
        const softFill = new THREE.DirectionalLight(0xc4cbff,0.9);
        softFill.position.set(-2.2,1.5,2.6);
        scene.add(softFill);
        const rim = new THREE.DirectionalLight(0x956fff,2.0);
        rim.position.set(-2.3,2.0,-1.6);
        scene.add(rim);

        const resize = () => {
          if (disposed || !renderer) return;
          const width=Math.max(1,host.clientWidth),height=Math.max(1,host.clientHeight);
          perspectiveCamera.aspect=width/height;
          perspectiveCamera.updateProjectionMatrix();
          renderer.setSize(width,height,false);
        };
        resize();
        if (typeof ResizeObserver !== 'undefined') {
          const observer = new ResizeObserver(resize);
          observer.observe(host);
          unregisterResize = () => observer.disconnect();
        } else {
          window.addEventListener('resize',resize);
          unregisterResize=()=>window.removeEventListener('resize',resize);
        }

        const loader=new GLTF.GLTFLoader();
        loader.load(getModelUrl(), (gltf:any) => {
          if (disposed) return;
          const names=['Idle','Walking','Running','Greeting','Talking'];
          if (!names.every(name=>gltf.animations.some((a:any)=>a.name===name))) {
            setUnavailable(true);
            return;
          }
          modelRoot=gltf.scene;
          const bounds=new THREE.Box3().setFromObject(modelRoot);
          const center=bounds.getCenter(new THREE.Vector3());
          const dims=bounds.getSize(new THREE.Vector3());
          const scale=2.48/Math.max(0.01,dims.y);
          modelRoot.scale.setScalar(scale);
          modelRoot.position.set(-center.x*scale,-center.y*scale+0.06,-center.z*scale);
          modelRoot.traverse((node:any)=>{
            if (!node.isMesh) return;
            node.frustumCulled=false;
            const mats=Array.isArray(node.material)?node.material:[node.material];
            for(const mat of mats){
              if (!mat) continue;
              if (mat.map) {
                mat.map.colorSpace=THREE.SRGBColorSpace;
                mat.map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());
                mat.map.needsUpdate=true;
              }
              if (mat.normalMap) mat.normalMap.anisotropy=4;
              if (typeof mat.roughness==='number') mat.roughness=Math.max(0.24,mat.roughness);
              if (typeof mat.metalness==='number') mat.metalness=Math.min(0.82,mat.metalness);
              mat.needsUpdate=true;
            }
          });
          scene.add(modelRoot);
          faceRig=installNexaFaceRig(THREE,modelRoot);
          const mixer=new THREE.AnimationMixer(modelRoot);
          const actions: any={};
          for(const name of names){
            const clip=gltf.animations.find((a:any)=>a.name===name);
            actions[name]=mixer.clipAction(clip);
            actions[name].enabled=true;
            if(name==='Greeting'){
              actions[name].setLoop(THREE.LoopOnce,1);
              actions[name].clampWhenFinished=true;
            } else actions[name].setLoop(THREE.LoopRepeat);
          }
          controllerRef.current=new NexaAnimationController(mixer,actions,modelRoot);
          if(speakingRef.current) controllerRef.current.startSpeaking();
          // Portrait should remain calm; no forced walk/run or abrupt greetings.
          setLoaded(true);
          setUnavailable(false);
        },undefined,()=>{
          if (!disposed) setUnavailable(true);
        });

        const render=(now:number)=>{
          if(disposed)return;
          const dt=previousTime?Math.min((now-previousTime)/1000,0.065):0.016;
          previousTime=now;
          if(document.visibilityState==='visible'){
            totalTime+=dt;
            controllerRef.current?.update(dt);
            faceRig?.update(dt,totalTime,speakingRef.current);
            // Camera lags slightly behind gesture; still within the circular portrait.
            const alpha=1-Math.exp(-dt*8);
            distance+=(orbitRef.current.distance-distance)*alpha;
            yaw+=(orbitRef.current.yaw-yaw)*alpha;
            pitch+=(orbitRef.current.pitch-pitch)*alpha;
            const focus=0.94;
            perspectiveCamera.position.set(
              Math.sin(yaw)*distance,
              focus+pitch*0.35+0.025,
              Math.cos(yaw)*distance,
            );
            perspectiveCamera.lookAt(0,focus+pitch*0.12,0);
            if(controllerRef.current?.motion==='Idle') idleTimer+=dt;
            else idleTimer=0;
            // Relaxed waves are generated by facial expressions, not locomotion.
            renderer.render(scene,perspectiveCamera);
          }
          animationFrame=requestAnimationFrame(render);
        };
        animationFrame=requestAnimationFrame(render);
      } catch {
        if(!disposed)setUnavailable(true);
      }
    }
    void boot();

    return ()=>{
      disposed=true;
      cancelAnimationFrame(animationFrame);
      host.removeEventListener('pointerdown',onDown);
      host.removeEventListener('pointermove',onMove);
      host.removeEventListener('pointerup',onUp);
      host.removeEventListener('pointercancel',onUp);
      host.removeEventListener('lostpointercapture',onUp);
      host.removeEventListener('wheel',onWheel);
      unregisterResize?.();
      pointers.clear();
      controllerRef.current?.dispose();
      controllerRef.current=null;
      modelRoot?.traverse((node:any)=>{
        node.geometry?.dispose?.();
        const mats=Array.isArray(node.material)?node.material:node.material?[node.material]:[];
        for(const mat of mats){
          mat?.map?.dispose?.();
          mat?.normalMap?.dispose?.();
          mat?.dispose?.();
        }
      });
      renderer?.dispose?.();
      renderer?.domElement?.remove?.();
    };
  },[isNexa,profile.id]);

  return (
    <View style={styles.stage}>
      <View style={styles.portrait}>
        <LinearGradient colors={['#19102D','#121C36','#080D1A']} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill} pointerEvents="none" />
        <View pointerEvents="none" style={styles.halo}/>
        {React.createElement('img',{
          src:placeholder,alt:'Nexa, asistente virtual',draggable:false,
          style:{
            position:'absolute',inset:0,width:'100%',height:'100%',
            objectFit:'cover',objectPosition:'50% 27%',opacity:loaded?0:1,
            transition:'opacity 330ms ease',pointerEvents:'none',
          },
        })}
        {isNexa && React.createElement('div',{
          ref:host,'aria-label':'Retrato tridimensional interactivo de Nexa',
          style:{
            position:'absolute',inset:0,width:'100%',height:'100%',
            pointerEvents:'auto',touchAction:'none',
            opacity:loaded?1:0,transition:'opacity 330ms ease',
          },
        })}
      </View>
      <View style={styles.identity}>
        <View style={[styles.dot, {backgroundColor:unavailable?'#E6BB85':'#73EBC4'}]}/>
        <Text style={styles.name}>NEXA</Text>
        <Text style={styles.status}>{unavailable?'Vista de respaldo':loaded?'Asistente 3D':'Cargando Nexa…'}</Text>
      </View>
      <Text style={styles.hint}>
        {speaking?'Nexa está respondiendo':'Desliza para girar · pellizca con dos dedos para acercar'}
      </Text>
    </View>
  );
}

const styles=StyleSheet.create({
  stage:{
    width:'100%',height:412,alignItems:'center',justifyContent:'flex-start',
    backgroundColor:'transparent',paddingTop:8,
  },
  portrait:{
    width:'91%',maxWidth:340,aspectRatio:1,borderRadius:9999,
    overflow:'hidden',position:'relative',
    borderWidth:2,borderColor:'rgba(160,131,255,0.78)',
    backgroundColor:'#16152F',
    boxShadow:'0 0 34px rgba(123,83,236,0.28)',
  },
  halo:{
    position:'absolute',width:'78%',height:'78%',borderRadius:9999,
    borderWidth:1,borderColor:'rgba(183,162,255,0.18)',
    top:'10%',left:'11%',
  },
  identity:{flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,marginTop:13},
  dot:{width:7,height:7,borderRadius:4},
  name:{fontSize:12,fontWeight:'900',letterSpacing:1.6,color:'#E5DEFF'},
  status:{fontSize:10,fontWeight:'700',color:'#AFC3E0'},
  hint:{marginTop:7,fontSize:11,color:'#C3C9E2',textAlign:'center'},
});
