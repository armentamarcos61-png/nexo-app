import React, { useEffect, useRef, useState } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { AssistantProfile } from '@/state/assistant';
import { NEXA_IMAGE_DATA } from '@/components/assistant-media/nexa-image';
import { NEXO_IMAGE_DATA } from '@/components/assistant-media/nexo-image';
import { NessaAnimationController, type NessaMotion } from '@/lib/nessa-animation-controller';

type Props = { profile: AssistantProfile; speaking?: boolean };
const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.186.1/+esm';
const LOADER_URL = 'https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/loaders/GLTFLoader.js/+esm';

function modelUrl() {
  // Use one GLB containing all five clips. Works on both root and /nexo-app deployments.
  // Expo DOM components on Android/iOS serve public assets from EXPO_BASE_URL.
  const expoBase = process.env.EXPO_BASE_URL;
  if (expoBase) return expoBase.replace(/\\/?$/, '/') + 'models/nessa.glb';
  const prefix = location.pathname.startsWith('/nexo-app') ? '/nexo-app' : '';
  return prefix + '/models/nessa.glb';
}

export function AssistantStage({ profile, speaking = false }: Props) {
  const isNessa = profile.id === 'nexa';
  const image = isNessa ? NEXA_IMAGE_DATA : NEXO_IMAGE_DATA;
  const host = useRef<any>(null);
  const controller = useRef<NessaAnimationController | null>(null);
  const speakingRef = useRef(speaking);
  const [loaded, setLoaded] = useState(false);
  const [motion, setMotion] = useState<NessaMotion>('Idle');
  const [status, setStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');

  useEffect(() => {
    speakingRef.current = speaking;
    if (!controller.current) return;
    if (speaking) controller.current.startSpeaking();
    else controller.current.stopSpeaking();
    setMotion(speaking ? 'Talking' : 'Idle');
  }, [speaking]);

  useEffect(() => {
    controller.current = null;
    setLoaded(false);
    setStatus(isNessa ? 'loading' : 'fallback');
    setMotion('Idle');
    if (!isNessa || !host.current || typeof window === 'undefined') return;

    let dead = false;
    let frame = 0;
    let renderer: any;
    let scene: any;
    let model: any;
    let mixer: any;
    let observer: ResizeObserver | undefined;
    let removeResize: (() => void) | undefined;
    let last = 0;
    let roamElapsed = 0;
    let pointerX = 0;
    let pointerY = 0;
    const mount = host.current;
    mount.replaceChildren();

    async function start() {
      try {
        // The existing app already uses Three.js via CDN; don't add large native deps.
        const dynamicImport = new Function('u', 'return import(u)');
        const [THREE, GLTF] = await Promise.all([
          dynamicImport(THREE_URL), dynamicImport(LOADER_URL),
        ]);
        if (dead) return;

        scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(33, 1, 0.01, 100);
        camera.position.set(0, 0.65, 5.1);
        camera.lookAt(0, 0.03, 0);
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.12;
        renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:pan-y;pointer-events:none';
        mount.appendChild(renderer.domElement);

        scene.add(new THREE.HemisphereLight(0xe7f5ff, 0x161529, 2.8));
        const key = new THREE.DirectionalLight(0xffffff, 3.3);
        key.position.set(3, 5, 4);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0x9c79ff, 3.0);
        rim.position.set(-3, 2, -2);
        scene.add(rim);
        const front = new THREE.PointLight(0x72e3ff, 13, 7);
        front.position.set(0, 0, 3);
        scene.add(front);

        const floor = new THREE.Mesh(
          new THREE.CircleGeometry(1.35, 64),
          new THREE.MeshBasicMaterial({ color: 0x6a8bff, transparent: true, opacity: 0.075, depthWrite: false }),
        );
        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -1.15;
        scene.add(floor);
        for (const radius of [0.96, 1.27]) {
          const ring = new THREE.Mesh(
            new THREE.RingGeometry(radius - 0.008, radius + 0.008, 96),
            new THREE.MeshBasicMaterial({ color: 0x71dfff, side: THREE.DoubleSide, transparent: true, opacity: 0.38 }),
          );
          ring.rotation.x = -Math.PI / 2;
          ring.position.y = -1.14;
          scene.add(ring);
        }

        const resize = () => {
          if (dead || !renderer) return;
          const width = Math.max(1, mount.clientWidth);
          const height = Math.max(1, mount.clientHeight);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
          renderer.setSize(width, height, false);
        };
        resize();
        if (typeof ResizeObserver !== 'undefined') {
          observer = new ResizeObserver(resize);
          observer.observe(mount);
        } else {
          window.addEventListener('resize', resize);
          removeResize = () => window.removeEventListener('resize', resize);
        }

        const loader = new GLTF.GLTFLoader();
        loader.load(
          modelUrl(),
          (gltf: any) => {
            if (dead) return;
            // Reject the wrong file instead of showing a frozen/incorrect model.
            const required: NessaMotion[] = ['Idle', 'Walking', 'Running', 'Greeting', 'Talking'];
            if (!required.every(name => gltf.animations.some((clip: any) => clip.name === name))) {
              setStatus('fallback');
              return;
            }
            model = gltf.scene;
            const bounds = new THREE.Box3().setFromObject(model);
            const size = bounds.getSize(new THREE.Vector3());
            const center = bounds.getCenter(new THREE.Vector3());
            const scale = 2.48 / Math.max(size.y, 0.01);
            model.scale.setScalar(scale);
            model.position.set(-center.x * scale, -center.y * scale + 0.06, -center.z * scale);
            model.traverse((node: any) => {
              if (!node.isMesh) return;
              node.frustumCulled = false; // Skinned mesh bounding boxes can be stale.
              node.castShadow = false;
              const mats = Array.isArray(node.material) ? node.material : [node.material];
              for (const mat of mats) {
                if (mat?.map) mat.map.colorSpace = THREE.SRGBColorSpace;
              }
            });
            scene.add(model);
            mixer = new THREE.AnimationMixer(model);
            const actions: any = {};
            for (const name of required) {
              actions[name] = mixer.clipAction(gltf.animations.find((clip: any) => clip.name === name));
              actions[name].enabled = true;
              actions[name].setLoop(THREE.LoopRepeat);
            }
            controller.current = new NessaAnimationController(mixer, actions, model);
            if (speakingRef.current) controller.current.startSpeaking();
            else controller.current.greet();
            setLoaded(true);
            setStatus('ready');
          },
          undefined,
          () => { if (!dead) setStatus('fallback'); },
        );

        const tick = (now: number) => {
          if (dead) return;
          const dt = last ? Math.min((now - last) / 1000, 0.07) : 0.016;
          last = now;
          if (document.visibilityState === 'visible') {
            controller.current?.update(dt);
            if (controller.current) {
              roamElapsed += dt;
              // Gentle autonomous motion every several seconds when not talking.
              if (roamElapsed > 8.5 && !speakingRef.current) {
                roamElapsed = 0;
                const targetX = (Math.random() - 0.5) * 0.55;
                const targetZ = (Math.random() - 0.5) * 0.35;
                controller.current.moveTo(targetX, targetZ, false);
              }
              if (controller.current.motion === 'Idle' && model) {
                // Subtle attention towards the pointer, without fighting active clips.
                model.rotation.y += (pointerX * 0.10 - model.rotation.y) * Math.min(1, dt * 0.5);
              }
            }
            renderer.render(scene, camera);
          }
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      } catch {
        if (!dead) setStatus('fallback');
      }
    }

    // Pointer movement only controls a mild look direction, not the camera.
    const point = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      pointerX = Math.max(-1, Math.min(1, (event.clientX - rect.left) / Math.max(rect.width, 1) * 2 - 1));
      pointerY = Math.max(-1, Math.min(1, (event.clientY - rect.top) / Math.max(rect.height, 1) * 2 - 1));
      void pointerY;
    };
    mount.addEventListener('pointermove', point);
    void start();
    return () => {
      dead = true;
      cancelAnimationFrame(frame);
      mount.removeEventListener('pointermove', point);
      observer?.disconnect();
      removeResize?.();
      controller.current?.dispose();
      controller.current = null;
      if (model) {
        model.traverse((node: any) => {
          node.geometry?.dispose?.();
          const materials = Array.isArray(node.material) ? node.material : node.material ? [node.material] : [];
          for (const mat of materials) {
            mat?.map?.dispose?.();
            mat?.dispose?.();
          }
        });
      }
      renderer?.dispose?.();
      renderer?.domElement?.remove?.();
    };
  }, [profile.id, isNessa]);

  const command = (next: NessaMotion) => {
    const current = controller.current;
    if (!current || speaking) return;
    if (next === 'Greeting') current.greet();
    else if (next === 'Walking') current.moveTo(Math.random() * 0.7 - 0.35, Math.random() * 0.45 - 0.22);
    else if (next === 'Running') current.moveTo(Math.random() * 0.7 - 0.35, Math.random() * 0.45 - 0.22, true);
    else current.stopMoving();
    setMotion(next);
  };

  return (
    <View style={styles.stage}>
      <LinearGradient
        pointerEvents="none"
        colors={['#0E1931', '#151334', '#090F1D']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.glow} pointerEvents="none"/>
      <View style={styles.topline}>
        <View style={styles.onlineDot}/>
        <Text style={styles.topText}>{profile.name.toUpperCase()} · ASISTENTE VIRTUAL</Text>
        <View style={styles.topRight}><Text style={styles.topRightText}>{loaded ? '3D EN VIVO' : 'VISTA PREVIA'}</Text></View>
      </View>
      <View style={styles.visual}>
        {React.createElement('img', {
          src: image,
          alt: 'Vista del asistente ' + profile.name,
          draggable: false,
          style: {
            position: 'absolute', width: '100%', height: '100%',
            objectFit: 'contain', objectPosition: 'center 46%',
            padding: '12px 26px 0', boxSizing: 'border-box',
            opacity: loaded ? 0 : 1,
            filter: 'drop-shadow(0 7px 22px rgba(89,113,240,.34))',
            transition: 'opacity 350ms ease',
            animation: loaded ? 'none' : 'nessaBreathe 4.2s ease-in-out infinite',
            pointerEvents: 'none',
          },
        })}
        {isNessa && React.createElement('div', {
          ref: host, 'aria-hidden': true,
          style: {
            position: 'absolute', inset: 0,
            opacity: loaded ? 1 : 0,
            transition: 'opacity 350ms ease',
            pointerEvents: 'none',
          },
        })}
      </View>
      <View style={styles.base}>
        <View style={styles.baseLine}/>
        <Text style={styles.caption}>
          {speaking ? '◉ Respondiendo a tu pregunta' :
            status === 'ready' ? 'Movimientos naturales · motor 3D activo' :
            'Presencia visual · preparando modelo 3D'}
        </Text>
        {loaded && !speaking ? (
          <View style={styles.actions}>
            {([['Idle', 'Reposo'], ['Greeting', 'Saludar'], ['Walking', 'Caminar'], ['Running', 'Correr']] as const).map(([key, label]) => (
              <Pressable key={key} onPress={() => command(key)} accessibilityRole="button"
                style={[styles.action, motion === key && styles.activeAction]}>
                <Text style={styles.actionText}>{label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
      {React.createElement('style', {
        dangerouslySetInnerHTML: {
          __html: '@keyframes nessaBreathe{0%,100%{transform:translateY(2px) scale(.985)}50%{transform:translateY(-5px) scale(1.01)}}',
        },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { width: '100%', height: 380, borderRadius: 27, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(119,167,244,.55)', backgroundColor: '#0F162B', position: 'relative' },
  glow: { position: 'absolute', width: 235, height: 235, borderRadius: 999, left: '19%', top: 66, backgroundColor: 'rgba(97,105,228,.09)', borderWidth: 1, borderColor: 'rgba(119,178,255,.12)' },
  topline: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingTop: 13, zIndex: 2 },
  onlineDot: { backgroundColor: '#6FF2BD', width: 7, height: 7, borderRadius: 8 },
  topText: { color: '#DCE9FF', fontSize: 10, fontWeight: '900', letterSpacing: 1, flex: 1 },
  topRight: { backgroundColor: 'rgba(62,91,153,.29)', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(125,163,251,.32)' },
  topRightText: { color: '#B2DEFF', fontSize: 9, fontWeight: '900', letterSpacing: .6 },
  visual: { position: 'absolute', left: 0, right: 0, top: 28, bottom: 53 },
  base: { position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 56, paddingBottom: 12, alignItems: 'center', backgroundColor: 'rgba(9,17,35,.72)', paddingTop: 8, zIndex: 2 },
  baseLine: { width: 42, height: 2, backgroundColor: '#75E2FF', borderRadius: 10, marginBottom: 6 },
  caption: { color: '#CCDDF6', fontSize: 10, fontWeight: '700', marginBottom: 6 },
  actions: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 8 },
  action: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 14, backgroundColor: 'rgba(56,71,114,.52)', borderWidth: 1, borderColor: 'rgba(129,166,230,.38)' },
  activeAction: { borderColor: '#7CE7FF', backgroundColor: 'rgba(62,127,182,.34)' },
  actionText: { color: '#E3F2FF', fontSize: 10, fontWeight: '800' },
});
