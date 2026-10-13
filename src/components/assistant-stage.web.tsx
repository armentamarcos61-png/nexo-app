import React, { useEffect, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AssistantProfile } from '@/state/assistant';
import { NEXA_IMAGE_DATA } from '@/components/assistant-media/nexa-image';
import { NEXO_IMAGE_DATA } from '@/components/assistant-media/nexo-image';
import { NexaAnimationController } from '@/lib/nexa-animation-controller';
import { installNexaFaceRig, type NexaFaceRig } from '@/lib/nexa-face-rig';
import { addNexaCollar, composeNexaHeadBody, disposeNexaBackHair, disposeNexaCollar, joinNexaBackHair, maskNexaStudioHead, updateNexaBackHair } from '@/lib/nexa-composite';
import { installNexaPremiumLook, type PremiumNexaLook } from '@/lib/nexa-premium-look';
import { NexoModelStage } from '@/components/assistant-stage-nexo.web';

type Props = { profile: AssistantProfile; speaking?: boolean; speechText?: string };
// Bundled with the app: loading Nexa must not depend on a third-party CDN.
// A slow mobile connection is not an error while bytes are still arriving.
const STALL_TIMEOUT_MS = 75_000;
const MAX_LOAD_TIME_MS = 360_000;
const MODEL_VARIANTS = {
  android: { file: 'Nexa_Android_FacialReady_v1.glb', size: 12_287_436 },
  // Backups remain in the bundle and repository. They are never selected
  // automatically while the new Android Nexa is enabled.
  studio: { file: 'Nexa_Studio_Busto_v1.glb', size: 5_322_192 },
  full: { file: 'Nexa_FacialRig_V2.glb', size: 16_739_064 },
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
export function AssistantStage(props: Props) {
  return props.profile.id === 'nexo' ? <NexoModelStage {...props} /> : <NexaStage {...props} />;
}

function NexaStage({ profile, speaking = false, speechText = '' }: Props) {
  const isNexa = profile.id === 'nexa';
  const placeholder = isNexa ? NEXA_IMAGE_DATA : NEXO_IMAGE_DATA;
  const hostRef = useRef<any>(null);
  const controllerRef = useRef<NexaAnimationController | null>(null);
  const faceRigRef = useRef<NexaFaceRig | null>(null);
  const speakingRef = useRef(speaking);
  const speechTextRef = useRef(speechText);
  const facialDemoUntilRef=useRef(0);
  const elapsedRef=useRef(0);
  const greetRef=useRef<()=>void>(()=>{});
  const orbitRef = useRef<{ yaw: number; pitch: number; distance: number; panY: number }>({ yaw: 0, pitch: 0, distance: STUDIO_FRAMING.distance, panY: 0 });
  const [loaded, setLoaded] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [loadMessage, setLoadMessage] = useState('Preparando visor 3D…');
  const [attempt, setAttempt] = useState(0);
  const [variant, setVariant] = useState<ModelVariant>('android');
  const [hasBody, setHasBody] = useState(false);
  const [viewMode, setViewMode] = useState<'body' | 'face'>('body');
  const cameraPresetsRef = useRef<{
    face: { focus: number; distance: number };
    body: { focus: number; distance: number };
  }>({
    face: { focus: STUDIO_FRAMING.focus, distance: STUDIO_FRAMING.distance },
    body: { focus: STUDIO_FRAMING.focus, distance: STUDIO_FRAMING.distance },
  });
  const viewModeRef = useRef<'body' | 'face'>('body');
  const changeView = (mode: 'body' | 'face') => {
    viewModeRef.current = mode;
    setViewMode(mode);
    orbitRef.current = {
      yaw: 0,
      pitch: 0,
      distance: cameraPresetsRef.current[mode].distance,
      panY: 0,
    };
  };

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
    speechTextRef.current = speechText;
    faceRigRef.current?.setSpeechText(speechText);
  }, [speechText]);

  useEffect(() => {
    const host = hostRef.current;
    controllerRef.current = null;
    faceRigRef.current = null;
    if (!host || typeof window === 'undefined' || !isNexa) return;
    // Reset to the appropriate camera when Studio loads or legacy is restored.
    const studio = variant === 'studio';
    let homeDistance = studio ? STUDIO_FRAMING.distance : CLASSIC_DISTANCE;
    let minDistance = studio ? STUDIO_FRAMING.minDistance : 1.08;
    let maxDistance = studio ? STUDIO_FRAMING.maxDistance : 1.90;
    let focus = studio ? STUDIO_FRAMING.focus : 0;
    let currentFocus = focus;
    orbitRef.current = { yaw: 0, pitch: 0, distance: homeDistance, panY: 0 };

    setLoaded(false);
    setHasBody(false);
    viewModeRef.current = 'body';
    setViewMode('body');
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
    let avatarRoot: any = null;
    let faceRig: NexaFaceRig | null = null;
    let premiumLook: PremiumNexaLook | null = null;
    let composite: ReturnType<typeof composeNexaHeadBody> | null = null;
    let lowerBodyMixer: any = null;
    let unregisterResize: (() => void) | undefined;
    let previousTime = 0;
    let totalTime = 0;
    let distance = orbitRef.current.distance;
    let yaw = 0;
    let pitch = 0;
    let perspectiveCamera: any = null;
    let minTargetY = -STUDIO_FRAMING.height * 0.5;
    let maxTargetY = STUDIO_FRAMING.height * 0.5;
    let visibleHeight: number = STUDIO_FRAMING.height;

    // PointerEvents allow one-finger orbit and two-finger pinch on Android.
    const pointers = new Map<number, {x:number;y:number}>();
    let previousPinchDistance = 0;
    let lastTap = 0;
    const pointerCenterY = () => {
      const active = [...pointers.values()];
      return active.reduce((total, point) => total + point.y, 0) / (active.length || 1);
    };
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
        orbitRef.current = { yaw: 0, pitch: 0, distance: homeDistance, panY: 0 };
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
      const previousCenter = pointers.size === 2 ? pointerCenterY() : 0;
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
        // Two fingers moved together tilt the viewpoint to inspect the
        // neck, shoes and back from above/below without changing pan.
        orbitRef.current.pitch = clamp(
          orbitRef.current.pitch + (pointerCenterY()-previousCenter)*0.006,
          -0.72, 0.72,
        );
      } else if (pointers.size === 1) {
        // One-finger horizontal drags orbit through a FULL 360 degrees.
        // Vertical drags slide the camera's TARGET from cap to boots.
        const dx = event.clientX-previous.x;
        const dy = event.clientY-previous.y;
        const twoPi = Math.PI*2;
        orbitRef.current.yaw =
          ((orbitRef.current.yaw-dx*0.009+Math.PI)%twoPi+twoPi)%twoPi-Math.PI;
        const baseFocus = cameraPresetsRef.current[viewModeRef.current].focus;
        const screenHeight = Math.max(280,host.clientHeight || 0);
        const nextLookY = clamp(
          baseFocus+orbitRef.current.panY+dy*visibleHeight*1.25/screenHeight,
          minTargetY,maxTargetY,
        );
        orbitRef.current.panY=nextLookY-baseFocus;
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
          // Separate camera presets: the compact portrait must not conceal
          // the legs of the full 3D model. The face remains independently zoomable.
          const modelBounds = new THREE.Box3().setFromObject(modelRoot);
          const modelSize = modelBounds.getSize(new THREE.Vector3());
          minTargetY = modelBounds.min.y;
          maxTargetY = modelBounds.max.y;
          visibleHeight = modelSize.y;
          const faceFocus = modelBounds.max.y - modelSize.y*(studio ? 0.34 : 0.18);
          const fullFocus = modelBounds.getCenter(new THREE.Vector3()).y;
          const fullDistance = clamp(
            modelSize.y/(2*Math.tan(THREE.MathUtils.degToRad(16)))*1.14,
            2.8, 16,
          );
          cameraPresetsRef.current.face = {
            focus: faceFocus,
            distance: studio ? STUDIO_FRAMING.distance : CLASSIC_DISTANCE,
          };
          cameraPresetsRef.current.body = {
            focus: studio ? faceFocus : fullFocus,
            distance: studio ? STUDIO_FRAMING.distance : fullDistance,
          };
          if (!studio) {
            minDistance = 1.05;
            maxDistance = Math.max(7, fullDistance*1.75);
          }
          focus = cameraPresetsRef.current.body.focus;
          currentFocus = focus;
          distance = cameraPresetsRef.current.body.distance;
          orbitRef.current.distance = distance;
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
          // Nexa becomes one rendered character, combining the approved
          // Studio head with ALL of the original full-body suit and arms.
          // No synthetic bust, chest band or sliced sleeves remain.
          avatarRoot = new THREE.Group();
          avatarRoot.name = 'Nexa unified 3D avatar';
          avatarRoot.add(modelRoot);
          scene.add(avatarRoot);
          // Hide the unwanted Studio shoulders, chest and arms with a single
          // neck-level shader cut. This preserves the original approved face
          // and helmet while the full body finishes downloading.
          if (studio) maskNexaStudioHead(THREE,modelRoot,renderer);
          // New visible 3D cap, hair, Nexo emblems and violet eyes follow the
          // existing animated head bone; original five motion clips remain.
          // The Studio model already has accurate baked cap/hair/N logos.
          // Adding procedural legacy hair over it would visibly duplicate them.
          premiumLook=(variant==='studio'||variant==='android')
            ? null
            : installNexaPremiumLook(THREE,modelRoot,scene,
                modelUrl.replace(MODEL_VARIANTS[variant].file,'nexa-reference-face.webp'));
          faceRig=installNexaFaceRig(THREE,modelRoot);
          faceRigRef.current=faceRig;
          faceRig.setSpeechText(speechTextRef.current);
          if (variant !== 'light' && !faceRig.available) {
            throw new Error('El modelo cargado no contiene los controles faciales de Nexa');
          }
          // Render the complete second body's chest, shoulders, arms, hips,
          // legs and feet, with Studio providing just the head and neck.
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
              composite = composeNexaHeadBody(THREE,modelRoot,bodyGltf.scene,renderer);
              avatarRoot.add(composite.body);
              greetRef.current=()=>{
                controllerRef.current?.greet();
                composite?.greet();
              };
              // Greeting starts only after the visible articulated shoulders
              // are attached, never while the invisible Studio arms are loaded.
              if(!speakingRef.current)composite.greet();
              // Fit an actual 3D Nexo uniform collar over the shared neck cut.
              // The collar belongs to the single avatar, not to either
              // clipped mesh. Thus it bridges the join from every camera angle
              // without masking the face, N logo or original suit details.
              addNexaCollar(THREE,avatarRoot,modelRoot,composite.seamY,composite.body);
              // The source body has a long ponytail but no coherent back
              // connection to Studio's approved helmet. Keep the new hair
              // surface on Studio's real Head joint, following micro-gestures.
              joinNexaBackHair(THREE,avatarRoot,modelRoot,composite.body,composite.seamY);
              // Keep the source body's original stable neutral pose and real
              // suit textures. Facial expressions animate only the Studio head.
              const completed = composite.bounds;
              const fullHeight = completed.getSize(new THREE.Vector3()).y;
              const fullFocus = completed.getCenter(new THREE.Vector3()).y;
              // The full model is taller than the Studio bust: expand pan
              // bounds only AFTER the lower body has actually loaded.
              minTargetY = completed.min.y;
              maxTargetY = completed.max.y;
              visibleHeight = fullHeight;
              // Frame the entire composite, including shoes, without distorting
              // the original Studio face. Users can return to portrait view.
              homeDistance = clamp(
                fullHeight / (2*Math.tan(THREE.MathUtils.degToRad(16)))*1.16,
                3.5, 18,
              );
              minDistance = Math.max(1.75,homeDistance*0.25);
              maxDistance = Math.max(homeDistance*1.65,7);
              cameraPresetsRef.current.body = { focus: fullFocus, distance: homeDistance };
              changeView('body');
              setHasBody(true);
            } catch (error) {
              if (disposed || download.signal.aborted) return;
              console.warn('[Nexa 3D] No se pudo unir el cuerpo: usando el modelo completo como respaldo',error);
              // Never leave a disembodied head on the production screen.
              // The fallback is one coherent full GLB with its own face.
              setVariant('full');
            }
            })();
          }
          const mixer=new THREE.AnimationMixer(modelRoot);
          const actions: any={};
          // Animations must only touch their own articulated joints. Head,
          // neck and jaw are owned by the stable facial controller.
          // The Studio viewer previously replaced *every* animation with an
          // empty clip. This dedicated skeleton gesture uses the approved
          // actual arm bones with minimal rotations; original facial geometry,
          // chest logo, textures and head are never animated by it.
          const syntheticGesture=(name:string)=>{
            const times=[0,.22,.45,.68,.88,1.08,1.28,1.50,1.72,1.94,2.18,2.40];
            const wave=[0,.38,.75,1,.72,1,.70,1,.66,.44,.17,0];
            const tracks:any[]=[];
            for(const side of ['Left','Right']){
              for(const joint of ['Arm','ForeArm','Hand']){
                const bone=modelRoot.getObjectByName('mixamorig:'+side+joint);
                if(!bone)continue;
                const baseline=bone.quaternion.clone();
                // A waving hand, a relaxed supporting arm, and quieter
                // bilateral speaking gestures. No arm is teleported.
                const degrees=wave.map((w,i)=>{
                  if(name==='Idle')return 0;
                  if(name==='Greeting'){
                    if(side==='Right'){
                      if(joint==='Arm')return -.20*w;
                      if(joint==='ForeArm')return .30*w;
                      return .19*w*Math.sin(i*2.5);
                    }
                    return joint==='Arm' ? .045*w : 0;
                  }
                  if(name==='Talking'){
                    const gentle=Math.sin(i*.8)*.5+.5;
                    return (joint==='Arm'?.036:joint==='ForeArm'?.05:.025)*
                      gentle*(side==='Left'?1:-1);
                  }
                  return 0;
                });
                const axis=new THREE.Vector3(0,0,side==='Left'?1:-1);
                const values:number[]=[];
                for(const angle of degrees){
                  const q=baseline.clone().multiply(
                    new THREE.Quaternion().setFromAxisAngle(axis,angle));
                  values.push(q.x,q.y,q.z,q.w);
                }
                tracks.push(new THREE.QuaternionKeyframeTrack(
                  bone.name+'.quaternion',times,values));
              }
            }
            return new THREE.AnimationClip(name,2.40,tracks);
          };
          for(const name of names){
            const sourceName=variant==='android' && name==='Greeting'
              ? 'Wave_One_Hand' : name;
            const sourceClip=gltf.animations.find((a:any)=>a.name===sourceName);
            // Use controlled arm-bone animation for Studio instead of inert
            // clips. The imported whole-body animations remain fallbacks.
            const safeClip=studio
              ? (name==='Idle'||name==='Talking'||name==='Greeting'
                  ? syntheticGesture(name)
                  : new THREE.AnimationClip(name,1,[]))
              : (sourceClip?.clone() ??
                 (name==='Idle'||name==='Talking'||name==='Greeting'
                   ? syntheticGesture(name) : new THREE.AnimationClip(name,1,[])));
            safeClip.tracks=safeClip.tracks.filter((track:any)=>{
              const forbidden=/(?:head|neck|jaw|hips|pelvis)/i.test(track.name);
              if(forbidden)return false;
              // Legacy keyframes restore the horizontal Studio T-pose each
              // frame. Never let idle/locomotion overwrite the calibrated arms.
              if (studio && /(?:Left|Right)(?:Arm|ForeArm|Shoulder|Hand)/i.test(track.name)) return false;
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
          if (!speakingRef.current) controllerRef.current.greet();
          // Start with a gentle, cross-faded hello; never force walking/running.
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
            totalTime+=dt;elapsedRef.current=totalTime;
            faceRig?.beforeUpdate();
            controllerRef.current?.update(dt);
            lowerBodyMixer?.update(dt);
            faceRig?.update(dt,totalTime,
              speakingRef.current||totalTime<facialDemoUntilRef.current);
            composite?.update(dt,speakingRef.current);
            updateNexaBackHair(avatarRoot,dt,totalTime,speakingRef.current);
            premiumLook?.update(dt,totalTime);
            // Camera lags slightly behind gesture; still within the circular portrait.
            const alpha=1-Math.exp(-dt*8);
            focus=cameraPresetsRef.current[viewModeRef.current].focus + orbitRef.current.panY;
            currentFocus+=(focus-currentFocus)*alpha;
            distance+=(orbitRef.current.distance-distance)*alpha;
            yaw+=(orbitRef.current.yaw-yaw)*alpha;
            pitch+=(orbitRef.current.pitch-pitch)*alpha;
            perspectiveCamera.position.set(
              Math.sin(yaw)*Math.cos(pitch)*distance,
              currentFocus+Math.sin(pitch)*distance,
              Math.cos(yaw)*Math.cos(pitch)*distance,
            );
            perspectiveCamera.lookAt(0,currentFocus,0);
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
      greetRef.current=()=>{};
      faceRigRef.current=null;
      premiumLook?.dispose();
      premiumLook=null;
      lowerBodyMixer?.stopAllAction?.();
      lowerBodyMixer=null;
      if (avatarRoot) { disposeNexaBackHair(avatarRoot); disposeNexaCollar(avatarRoot); }
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
        <Text style={styles.status}>{unavailable?'3D no disponible':loaded?(variant === 'android'
            ? 'Nexa 3D nueva · rostro y cuerpo articulados'
            : variant === 'studio' ? (hasBody ? 'Nexa Studio 3D · cuerpo completo' : 'Nexa Studio 3D · busto')
            : variant === 'light' ? 'Asistente 3D ligero' : 'Asistente 3D'):loadMessage}</Text>
      </View>
      <Text style={styles.hint}>
        {unavailable ? loadMessage : loaded ? (speaking?'Nexa está respondiendo':'Desliza arriba/abajo para ver cara o pies · a los lados para girar 360° · pellizca para zoom') : 'Imagen de referencia mientras se prepara el modelo 3D'}
      </Text>
      {loaded && (
        <View style={styles.cameraModes}>
          <Pressable accessibilityRole="button"
            accessibilityLabel="Nexa saluda moviendo brazos y manos"
            onPress={() => greetRef.current()}
            style={styles.cameraMode}>
            <Text style={styles.cameraModeText}>Saludar</Text>
          </Pressable>
          <Pressable accessibilityRole="button"
            accessibilityLabel="Probar parpadeo, mirada, cejas y boca de Nexa"
            onPress={() => {
              faceRigRef.current?.setSpeechText('Hola, soy Nexa. Bienvenido a Nexo.');
              facialDemoUntilRef.current=elapsedRef.current+5.5;
              if (hasBody || variant!=='studio') changeView('face');
            }}
            style={[styles.cameraMode,styles.cameraModeActive]}>
            <Text style={styles.cameraModeTextActive}>Probar gestos faciales</Text>
          </Pressable>
        </View>
      )}
      {loaded && (hasBody || variant !== 'studio') && (
        <View style={styles.cameraModes}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Mostrar el cuerpo completo de Nexa"
            onPress={() => changeView('body')}
            style={[styles.cameraMode, viewMode === 'body' && styles.cameraModeActive]}
          >
            <Text style={[styles.cameraModeText, viewMode === 'body' && styles.cameraModeTextActive]}>Cuerpo completo</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Acercar el rostro de Nexa"
            onPress={() => changeView('face')}
            style={[styles.cameraMode, viewMode === 'face' && styles.cameraModeActive]}
          >
            <Text style={[styles.cameraModeText, viewMode === 'face' && styles.cameraModeTextActive]}>Rostro y gestos</Text>
          </Pressable>
        </View>
      )}
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
    width:'100%',height:605,alignItems:'center',justifyContent:'flex-start',
    backgroundColor:'transparent',paddingTop:8,
  },
  portrait:{
    width:'91%',maxWidth:350,aspectRatio:0.78,borderRadius:28,
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
  cameraModes:{
    flexDirection:'row',justifyContent:'center',gap:8,marginTop:10,
  },
  cameraMode:{
    borderRadius:13,borderWidth:1,borderColor:'rgba(174,155,250,0.40)',
    paddingVertical:8,paddingHorizontal:13,
    backgroundColor:'rgba(37,43,75,0.55)',
  },
  cameraModeActive:{
    borderColor:'#BBA1FF',backgroundColor:'rgba(105,72,195,0.55)',
  },
  cameraModeText:{fontSize:12,fontWeight:'700',color:'#C4C9E0'},
  cameraModeTextActive:{color:'#FFFFFF'},
});
