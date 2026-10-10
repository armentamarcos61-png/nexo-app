import React, { useEffect, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AssistantProfile } from '@/state/assistant';
import { NEXA_IMAGE_DATA } from '@/components/assistant-media/nexa-image';
import { NEXO_IMAGE_DATA } from '@/components/assistant-media/nexo-image';
import { NexaAnimationController } from '@/lib/nexa-animation-controller';
import { installNexaFaceRig, type NexaFaceRig } from '@/lib/nexa-face-rig';
import { composeNexaBody } from '@/lib/nexa-composite';
import { installNexaPremiumLook, type PremiumNexaLook } from '@/lib/nexa-premium-look';

type Props = { profile: AssistantProfile; speaking?: boolean };
// Bundled with the app: loading Nexa must not depend on a third-party CDN.
// A slow mobile connection is not an error while bytes are still arriving.
const STALL_TIMEOUT_MS = 75_000;
const MAX_LOAD_TIME_MS = 360_000;
const MODEL_VARIANTS = {
  studio: { file: 'Nexa_Studio_Busto_v1.glb', size: 5_322_192 },
  full: { file: 'Nexa_FacialRig_V2.glb', size: 15_453_484 },
  light: { file: 'Nexa_Unica_Interactiva.glb', size: 9_336_320 },
} as const;
type ModelVariant = keyof typeof MODEL_VARIANTS;
const clamp = (x: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, x));
// Studio's mesh is a 0.7-unit bust, not a full-height avatar. Its previous
// 2.48-unit scaling combined with a 0.99 focus cropped the entire face.
const STUDIO_FRAMING = {
  height: 1.40,
  distance: 3.05,
  focus: 0.035,
  minDistance: 2.42,
  maxDistance: 4.40,
} as const;
const CLASSIC_DISTANCE = 1.55;

function getModelUrl(variant: ModelVariant) {
  const filename = MODEL_VARIANTS[variant].file;
  const base = process.env.EXPO_BASE_URL;
  if (base) return (base.endsWith('/') ? base : base + '/') + 'models/' + filename;
  const prefix = globalThis.location?.pathname?.startsWith('/nexo-app') ? '/nexo-app' : '';
  return prefix + '/models/' + filename;
}

/** One circular, close-up 3D Nexa. No duplicate photo/model or zoom buttons. */
export function AssistantStage({ profile, speaking = false }: Props) {
  const isNexa = profile.id === 'nexa';
  const placeholder = isNexa ? NEXA_IMAGE_DATA : NEXO_IMAGE_DATA;
  const hostRef = useRef<any>(null);
  const controllerRef = useRef<NexaAnimationController | null>(null);
  const speakingRef = useRef(speaking);
  const orbitRef = useRef<{ yaw: number; pitch: number; distance: number }>({ yaw: 0, pitch: 0, distance: STUDIO_FRAMING.distance });
  const [loaded, setLoaded] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [loadMessage, setLoadMessage] = useState('Preparando visor 3D…');
  const [attempt, setAttempt] = useState(0);
  const [variant, setVariant] = useState<ModelVariant>('studio');
  const [hasBody, setHasBody] = useState(false);

  // Studio is the default after publication; use the previous fully rigged model
  // only if an old browser cache or unavailable asset prevents Studio loading.
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
    // Reset to the appropriate camera when Studio loads or legacy is restored.
    const studio = variant === 'studio';
    let homeDistance = studio ? STUDIO_FRAMING.distance : CLASSIC_DISTANCE;
    let minDistance = studio ? STUDIO_FRAMING.minDistance : 1.08;
    let maxDistance = studio ? STUDIO_FRAMING.maxDistance : 1.90;
    let focus = studio ? STUDIO_FRAMING.focus : 0.99;
    orbitRef.current = { yaw: 0, pitch: 0, distance: homeDistance };

    setLoaded(false);
    setHasBody(false);
    setUnavailable(false);
    setLoadMessage('Preparando visor 3D…');
    let disposed = false;
    let ready = false;
    const download = new AbortController();
    let stallTimer = 0;
    let absoluteTimer = 0;
    let currentStage: 'connecting' | 'downloading' | 'parsing' | 'rendering' = 'connecting';
    let lastPercent = 0;
    const clearTimers = () => {
      window.clearTimeout(stallTimer);
      window.clearTimeout(absoluteTimer);
    };
    const fail = (message: string, error?: unknown) => {
      if (disposed || download.signal.aborted) return;
      console.error('[Nexa 3D]', { variant, stage: currentStage, progress: lastPercent, message }, error ?? '');
      clearTimers();
      setLoaded(false);
      setUnavailable(true);
      setLoadMessage(message);
      download.abort();
    };
    const watchStall = () => {
      window.clearTimeout(stallTimer);
      stallTimer = window.setTimeout(() => {
        fail(currentStage === 'connecting'
          ? 'No hubo respuesta al solicitar el modelo 3D. Comprueba tu conexión.'
          : currentStage === 'downloading'
            ? 'La descarga se detuvo antes de completarse. Intenta la versión 3D ligera.'
            : 'El teléfono no pudo terminar de preparar el modelo 3D.', undefined);
      }, STALL_TIMEOUT_MS);
    };
    watchStall();
    absoluteTimer = window.setTimeout(() => {
      fail('La carga completa tardó más de 6 minutos. Prueba el 3D ligero.');
    }, MAX_LOAD_TIME_MS);
    let animationFrame = 0;
    let renderer: any = null;
    let modelRoot: any = null;
    let scene: any = null;
    let faceRig: NexaFaceRig | null = null;
    let premiumLook: PremiumNexaLook | null = null;
    let composite: ReturnType<typeof composeNexaBody> | null = null;
    let unregisterResize: (() => void) | undefined;
    let previousTime = 0;
    let totalTime = 0;
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
        orbitRef.current = { yaw: 0, pitch: 0, distance: homeDistance };
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
            minDistance, maxDistance,
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
      orbitRef.current.distance = clamp(orbitRef.current.distance+event.deltaY*0.0015, minDistance, maxDistance);
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
        const [THREE, GLTF] = await Promise.all([
          import('three'), import('three/examples/jsm/loaders/GLTFLoader.js'),
        ]);
        if (disposed) return;
        scene = new THREE.Scene();
        perspectiveCamera = new THREE.PerspectiveCamera(32,1,0.01,100);
        try {
          renderer = new THREE.WebGLRenderer({
            alpha:true,antialias:true,precision:'highp',powerPreference:'default',
          });
        } catch (error) {
          fail('Este navegador no pudo activar el visor 3D (WebGL). Prueba abrir Nexo en Chrome.', error);
          clearTimers();
          return;
        }
        // Keep sharp enough for the close-up without exhausting mobile GPUs.
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.01;
        renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;pointer-events:none';
        host.appendChild(renderer.domElement);
        renderer.domElement.addEventListener('webglcontextlost', (event: Event) => {
          event.preventDefault();
          fail('Se interrumpió el visor 3D. Pulsa Reintentar.');
        });

        // Soft studio lighting: skin detail first, gentle lavender rim.
        scene.add(new THREE.HemisphereLight(0xf0efff,0x24203d,1.28));
        const softKey = new THREE.DirectionalLight(0xfff5f3,1.90);
        softKey.position.set(1.1,2.5,3.5);
        scene.add(softKey);
        const softFill = new THREE.DirectionalLight(0xc4cbff,0.67);
        softFill.position.set(-2.2,1.5,2.6);
        scene.add(softFill);
        const rim = new THREE.DirectionalLight(0x956fff,1.28);
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
        const modelUrl = getModelUrl(variant);
        setLoadMessage(variant === 'light' ? 'Conectando al 3D ligero…' : 'Conectando al modelo 3D…');
        const response = await fetch(modelUrl, { signal: download.signal, cache: 'force-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status} al descargar modelo 3D`);
        if (disposed || download.signal.aborted) return;
        currentStage = 'downloading';
        watchStall();
        const total = Number(response.headers.get('content-length')) || MODEL_VARIANTS[variant].size;
        const reader = response.body?.getReader();
        let bytes: ArrayBuffer;
        if (reader) {
          const chunks: Uint8Array[] = [];
          let received = 0;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (disposed || download.signal.aborted) { await reader.cancel(); return; }
            chunks.push(value);
            received += value.byteLength;
            lastPercent = Math.min(100, Math.round(received / total * 100));
            watchStall(); // Reset ONLY when another chunk actually arrives.
            setLoadMessage(`Descargando ${variant === 'light' ? '3D ligero' : '3D'} · ${lastPercent}%`);
          }
          const joined = new Uint8Array(received);
          let offset = 0;
          for (const chunk of chunks) { joined.set(chunk, offset); offset += chunk.byteLength; }
          bytes = joined.buffer;
        } else bytes = await response.arrayBuffer();
        if (disposed || download.signal.aborted) return;
        if (bytes.byteLength < 20 || new DataView(bytes).getUint32(0, true) !== 0x46546c67) {
          throw new Error('Archivo 3D inválido o incompleto: no es GLB');
        }
        currentStage = 'parsing';
        watchStall();
        setLoadMessage('Preparando rostro y animaciones…');
        const modelBase = new URL('.', new URL(modelUrl, window.location.href)).href;
        const gltf = await loader.parseAsync(bytes, modelBase);
        if (disposed || download.signal.aborted) return;
          const names=['Idle','Walking','Running','Greeting','Talking'];
          modelRoot=gltf.scene;
          const bounds=new THREE.Box3().setFromObject(modelRoot);
          const center=bounds.getCenter(new THREE.Vector3());
          const dims=bounds.getSize(new THREE.Vector3());
          // Use a real bust portrait framing for Studio, not the 2.48-unit
          // full-body scale that made only the cap visible.
          const targetHeight=studio ? STUDIO_FRAMING.height : 2.48;
          const scale=targetHeight/Math.max(0.01,dims.y);
          modelRoot.scale.setScalar(scale);
          modelRoot.position.set(
            -center.x*scale,
            -center.y*scale+(studio ? STUDIO_FRAMING.focus : 0.06),
            -center.z*scale,
          );
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
          // New visible 3D cap, hair, Nexo emblems and violet eyes follow the
          // existing animated head bone; original five motion clips remain.
          // The Studio model already has accurate baked cap/hair/N logos.
          // Adding procedural legacy hair over it would visibly duplicate them.
          premiumLook=variant==='studio'
            ? null
            : installNexaPremiumLook(THREE,modelRoot,scene,
                modelUrl.replace(MODEL_VARIANTS[variant].file,'nexa-reference-face.webp'));
          faceRig=installNexaFaceRig(THREE,modelRoot);
          if (variant !== 'light' && !faceRig.available) {
            throw new Error('El modelo cargado no contiene los controles faciales de Nexa');
          }
          // Only the lower, clipped geometry of the older fully rigged GLB is
          // shown. Studio continues to own the entire approved head and bust.
          // This is genuine 3D composition, not a photo overlay or second Nexa.
          if (studio) {
            // Progressive loading: the approved Studio bust is rendered immediately.
            // A missing or slow body is optional and cannot break the assistant.
            void (async () => {
            try {
              setLoadMessage('Uniendo rostro y cuerpo 3D…');
              const bodyUrl = getModelUrl('full');
              const bodyResponse = await fetch(bodyUrl, {signal:download.signal,cache:'force-cache'});
              if (!bodyResponse.ok) throw new Error('Modelo de cuerpo HTTP '+bodyResponse.status);
              const bodyBytes = await bodyResponse.arrayBuffer();
              if (disposed || download.signal.aborted) return;
              if (bodyBytes.byteLength < 20 || new DataView(bodyBytes).getUint32(0,true) !== 0x46546c67) {
                throw new Error('Archivo GLB del cuerpo incompleto');
              }
              const bodyGltf = await loader.parseAsync(bodyBytes,new URL('.',new URL(bodyUrl,window.location.href)).href);
              if (disposed || download.signal.aborted) return;
              composite = composeNexaBody(THREE,modelRoot,bodyGltf.scene,renderer);
              scene.add(composite.body);
              const completed = composite.bounds;
              const fullHeight = completed.getSize(new THREE.Vector3()).y;
              focus = completed.getCenter(new THREE.Vector3()).y;
              // An entire person needs an optically wider frame than the old bust.
              homeDistance = clamp(fullHeight / (2*Math.tan(THREE.MathUtils.degToRad(16))) * 1.14,3.5,16);
              minDistance = Math.max(1.75,homeDistance*0.26);
              maxDistance = Math.max(homeDistance*1.65,7);
              orbitRef.current = {yaw:0,pitch:0,distance:homeDistance};
              distance = homeDistance;
              setHasBody(true);
            } catch (error) {
              if (disposed || download.signal.aborted) return;
              console.warn('[Nexa 3D] No fue posible completar el cuerpo; se conserva intacto Studio',error);
              setHasBody(false);
            }
            })();
          }
          const mixer=new THREE.AnimationMixer(modelRoot);
          const actions: any={};
          // Animations must only touch their own articulated joints. Head,
          // neck and jaw are owned by the stable facial controller.
          const syntheticGesture=(name:string)=>{
            const tracks:any[]=[];
            for(const side of ['Left','Right']){
              const bone=modelRoot.getObjectByName('mixamorig:'+side+'Arm');
              if(!bone) continue;
              const times=[0,0.6,1.2,1.8,2.4];
              const angles=name==='Talking'
                ? [0,0.07,0.015,-0.055,0] : [0,0.11,0.17,0.05,0];
              const base=bone.quaternion.clone();
              const axis=new THREE.Vector3(0,0,side==='Left'?1:-1);
              const values:number[]=[];
              for(const angle of angles){
                const q=base.clone().multiply(
                  new THREE.Quaternion().setFromAxisAngle(axis,angle));
                values.push(q.x,q.y,q.z,q.w);
              }
              tracks.push(new THREE.QuaternionKeyframeTrack(bone.name+'.quaternion',times,values));
            }
            return new THREE.AnimationClip(name,2.4,tracks);
          };
          for(const name of names){
            const sourceClip=gltf.animations.find((a:any)=>a.name===name);
            const safeClip=sourceClip?.clone() ??
              (name==='Talking'||name==='Greeting'
                ? syntheticGesture(name) : new THREE.AnimationClip(name,1,[]));
            safeClip.tracks=safeClip.tracks.filter((track:any)=>{
              const forbidden=/(?:head|neck|jaw|hips|pelvis)/i.test(track.name);
              if(forbidden)return false;
              if(name==='Talking'||name==='Greeting')
                return /(?:Left|Right)(?:Arm|ForeArm|Shoulder|Hand)/i.test(track.name)
                  && /quaternion|rotation/i.test(track.name);
              return true;
            });
            actions[name]=mixer.clipAction(safeClip);
            actions[name].enabled=true;
            if(name==='Greeting'){
              actions[name].setLoop(THREE.LoopOnce,1);
              actions[name].clampWhenFinished=true;
            } else actions[name].setLoop(THREE.LoopRepeat);
          }
          controllerRef.current=new NexaAnimationController(mixer,actions,modelRoot);
          if(speakingRef.current) controllerRef.current.startSpeaking();
          // Portrait should remain calm; no forced walk/run or abrupt greetings.
          // Show 3D only after its first successful rendered frame.
          perspectiveCamera.position.set(0, focus+0.02, distance);
          perspectiveCamera.lookAt(0, focus, 0);
          currentStage = 'rendering';
          renderer.render(scene, perspectiveCamera);
          ready = true;
          clearTimers();
          setLoaded(true);
          setUnavailable(false);

        const render=(now:number)=>{
          if(disposed)return;
          const dt=previousTime?Math.min((now-previousTime)/1000,0.065):0.016;
          previousTime=now;
          if(document.visibilityState==='visible'){
            totalTime+=dt;
            faceRig?.beforeUpdate();
            controllerRef.current?.update(dt);
            faceRig?.update(dt,totalTime,speakingRef.current);
            composite?.update(dt,speakingRef.current);
            premiumLook?.update(dt,totalTime);
            // Camera lags slightly behind gesture; still within the circular portrait.
            const alpha=1-Math.exp(-dt*8);
            distance+=(orbitRef.current.distance-distance)*alpha;
            yaw+=(orbitRef.current.yaw-yaw)*alpha;
            pitch+=(orbitRef.current.pitch-pitch)*alpha;
            perspectiveCamera.position.set(
              Math.sin(yaw)*distance,
              focus+pitch*0.35+0.025,
              Math.cos(yaw)*distance,
            );
            perspectiveCamera.lookAt(0,focus+pitch*0.12,0);
            // Relaxed waves are generated by facial expressions, not locomotion.
            renderer.render(scene,perspectiveCamera);
          }
          animationFrame=requestAnimationFrame(render);
        };
        animationFrame=requestAnimationFrame(render);
      } catch (error) {
        if (!download.signal.aborted && !disposed && variant === 'studio') {
          console.warn('[Nexa Studio] Fallback to previous 3D while asset is unavailable', error);
          setVariant('full');
          return;
        }
        if (!download.signal.aborted && !disposed) {
          const details = error instanceof Error ? error.message : String(error);
          fail(/HTTP 404/.test(details)
            ? 'No se encontró el archivo 3D publicado (HTTP 404).'
            : /WebGL|context lost/i.test(details)
              ? 'El teléfono interrumpió la aceleración 3D (WebGL).'
              : /fetch|network|Failed to fetch/i.test(details)
                ? 'Se cortó la conexión mientras descargábamos Nexa.'
                : 'No se pudo preparar el modelo 3D. ' + details.slice(0, 100), error);
        }
      }
    }
    void boot();

    return ()=>{
      disposed=true;
      clearTimers();
      download.abort();
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
      premiumLook?.dispose();
      premiumLook=null;
      composite?.dispose();
      composite=null;
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
  },[isNexa,profile.id,attempt,variant]);

  return (
    <View style={[styles.stage, unavailable && {height: 470}]}>
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
          ref:hostRef,'aria-label':'Retrato tridimensional interactivo de Nexa',
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
        <Text style={styles.status}>{unavailable?'3D no disponible':loaded?(variant === 'studio' ? (hasBody ? 'Nexa Studio 3D · cuerpo completo' : 'Nexa Studio 3D · busto') : variant === 'light' ? 'Asistente 3D ligero' : 'Asistente 3D'):loadMessage}</Text>
      </View>
      <Text style={styles.hint}>
        {unavailable ? loadMessage : loaded ? (speaking?'Nexa está respondiendo':'Desliza para girar · pellizca con dos dedos para acercar') : 'Imagen de referencia mientras se prepara el modelo 3D'}
      </Text>
      {unavailable && (
        <View style={{flexDirection:'row',justifyContent:'center',alignItems:'center',flexWrap:'wrap',gap:8}}>
          <Pressable accessibilityRole="button" onPress={() => setAttempt(value => value + 1)} style={{padding: 10}}>
            <Text style={{color:'#D5C4FF',fontWeight:'700'}}>Reintentar 3D</Text>
          </Pressable>
          {variant !== 'light' && (
            <Pressable accessibilityRole="button" onPress={() => setVariant('light')} style={{padding: 10}}>
              <Text style={{color:'#A9E9FF',fontWeight:'700'}}>Probar 3D ligero</Text>
            </Pressable>
          )}
          {variant === 'light' && (
            <Pressable accessibilityRole="button" onPress={() => setVariant('full')} style={{padding: 10}}>
              <Text style={{color:'#A9E9FF',fontWeight:'700'}}>Modelo 3D completo</Text>
            </Pressable>
          )}
        </View>
      )}
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
