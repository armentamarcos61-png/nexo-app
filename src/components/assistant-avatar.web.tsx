import React, { useEffect, useRef, useState } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import type { AssistantProfile } from '@/state/assistant';
import { NEXA_IMAGE_DATA } from '@/components/assistant-media/nexa-image';
import { NEXO_IMAGE_DATA } from '@/components/assistant-media/nexo-image';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.186.1/+esm';
const GLTF_LOADER_URL =
  'https://cdn.jsdelivr.net/npm/three@0.186.1/examples/jsm/loaders/GLTFLoader.js/+esm';

type Props = {
  profile: AssistantProfile;
  size?: number;
  speaking?: boolean;
  onPress?: () => void;
  selected?: boolean;
  style?: ViewStyle;
};

type MorphBinding = {
  mesh: any;
  blinkLeft?: number;
  blinkRight?: number;
  jawOpen?: number;
  visemeA?: number;
  visemeE?: number;
  visemeO?: number;
};

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function getModelUrl(id: 'nexa' | 'nexo') {
  const pathname = globalThis.location?.pathname ?? '/';
  const origin = globalThis.location?.origin ?? '';
  const base = pathname.startsWith('/nexo-app') ? '/nexo-app' : '';
  return `${origin}${base}/models/${id}.glb`;
}

function findMorphIndex(dictionary: Record<string, number> | undefined, aliases: string[]) {
  if (!dictionary) return undefined;
  const entries = Object.entries(dictionary);
  for (const alias of aliases) {
    const wanted = normalizeName(alias);
    const hit = entries.find(([name]) => normalizeName(name).includes(wanted));
    if (hit) return hit[1];
  }
  return undefined;
}

function findNode(root: any, aliases: string[]) {
  let found: any = null;
  root.traverse?.((node: any) => {
    if (found || !node?.name) return;
    const normalized = normalizeName(node.name);
    if (aliases.some((alias) => normalized.includes(normalizeName(alias)))) {
      found = node;
    }
  });
  return found;
}

function setMorph(binding: MorphBinding, index: number | undefined, value: number) {
  if (index === undefined || !binding.mesh?.morphTargetInfluences) return;
  binding.mesh.morphTargetInfluences[index] = value;
}

export function AssistantAvatar({
  profile,
  size = 92,
  speaking = false,
  onPress,
  selected = false,
  style,
}: Props) {
  const isNexa = profile.id === 'nexa';
  const imageSource = isNexa ? NEXA_IMAGE_DATA : NEXO_IMAGE_DATA;
  const hostRef = useRef<any>(null);
  const speakingRef = useRef(speaking);
  const [modelReady, setModelReady] = useState(false);

  useEffect(() => {
    speakingRef.current = speaking;
  }, [speaking]);

  useEffect(() => {
    if (size < 64 || !hostRef.current || typeof window === 'undefined') {
      setModelReady(false);
      return;
    }

    let disposed = false;
    let frame = 0;
    let renderer: any;
    let scene: any;
    let camera: any;
    let modelRoot: any;
    let headNode: any;
    let jawNode: any;
    let headBase = { x: 0, y: 0, z: 0 };
    let jawBase = { x: 0, y: 0, z: 0 };
    let nextBlinkAt = performance.now() + 1400 + Math.random() * 1800;
    let blinkStartedAt = -1;
    const morphs: MorphBinding[] = [];

    const host = hostRef.current;
    host.innerHTML = '';

    const boot = async () => {
      try {
        const dynamicImport = new Function('url', 'return import(url)');
        const [THREE, loaderModule] = await Promise.all([
          dynamicImport(THREE_URL),
          dynamicImport(GLTF_LOADER_URL),
        ]);
        if (disposed) return;

        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(28, 1, 0.01, 100);
        camera.position.set(0, 0.05, 3.2);

        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(size, size, false);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.08;
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.display = 'block';
        renderer.domElement.style.pointerEvents = 'none';
        host.appendChild(renderer.domElement);

        const hemi = new THREE.HemisphereLight(0xffffff, 0x11131a, 2.2);
        scene.add(hemi);

        const key = new THREE.DirectionalLight(0xffffff, 3.4);
        key.position.set(2.2, 2.8, 3.4);
        scene.add(key);

        const rim = new THREE.DirectionalLight(
          isNexa ? 0x9b5cff : 0x3b82f6,
          4.4,
        );
        rim.position.set(-2.6, 1.8, 1.2);
        scene.add(rim);

        const fill = new THREE.DirectionalLight(
          isNexa ? 0xc18bff : 0x66c7ff,
          1.6,
        );
        fill.position.set(1.8, -1.0, 1.8);
        scene.add(fill);

        const loader = new loaderModule.GLTFLoader();
        loader.load(
          getModelUrl(profile.id),
          (gltf: any) => {
            if (disposed) return;
            modelRoot = gltf.scene;
            scene.add(modelRoot);

            const box = new THREE.Box3().setFromObject(modelRoot);
            const center = box.getCenter(new THREE.Vector3());
            const dimensions = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(dimensions.x, dimensions.y, dimensions.z) || 1;
            const isTallCharacter = dimensions.y > dimensions.x * 1.45;
            const targetDim = isTallCharacter ? 3.6 : 2.15;
            const scale = targetDim / maxDim;
            const focusY =
              center.y + dimensions.y * (isTallCharacter ? 0.31 : 0.12);

            modelRoot.scale.setScalar(scale);
            modelRoot.position.set(
              -center.x * scale,
              -focusY * scale + 0.05,
              -center.z * scale,
            );

            const fitted = new THREE.Box3().setFromObject(modelRoot);
            const fittedCenter = fitted.getCenter(new THREE.Vector3());
            modelRoot.position.x -= fittedCenter.x;
            modelRoot.position.y -= fittedCenter.y - 0.03;

            headNode = findNode(modelRoot, ['head', 'neckhead', 'face']);
            jawNode = findNode(modelRoot, ['jaw', 'mandible']);
            if (headNode) {
              headBase = {
                x: headNode.rotation.x,
                y: headNode.rotation.y,
                z: headNode.rotation.z,
              };
            }
            if (jawNode) {
              jawBase = {
                x: jawNode.rotation.x,
                y: jawNode.rotation.y,
                z: jawNode.rotation.z,
              };
            }

            modelRoot.traverse((node: any) => {
              if (!node?.isMesh) return;
              node.frustumCulled = false;
              if (node.material) {
                const materials = Array.isArray(node.material)
                  ? node.material
                  : [node.material];
                materials.forEach((material: any) => {
                  if (material?.map) {
                    material.map.colorSpace = THREE.SRGBColorSpace;
                  }
                  if (material) {
                    material.needsUpdate = true;
                  }
                });
              }

              if (node.morphTargetDictionary && node.morphTargetInfluences) {
                morphs.push({
                  mesh: node,
                  blinkLeft: findMorphIndex(node.morphTargetDictionary, [
                    'blinkLeft',
                    'eyeBlinkLeft',
                    'blinkL',
                  ]),
                  blinkRight: findMorphIndex(node.morphTargetDictionary, [
                    'blinkRight',
                    'eyeBlinkRight',
                    'blinkR',
                  ]),
                  jawOpen: findMorphIndex(node.morphTargetDictionary, [
                    'jawOpen',
                    'mouthOpen',
                  ]),
                  visemeA: findMorphIndex(node.morphTargetDictionary, [
                    'visemeAA',
                    'visemeA',
                    'mouthA',
                  ]),
                  visemeE: findMorphIndex(node.morphTargetDictionary, [
                    'visemeE',
                    'mouthE',
                  ]),
                  visemeO: findMorphIndex(node.morphTargetDictionary, [
                    'visemeO',
                    'mouthO',
                  ]),
                });
              }
            });

            setModelReady(true);
          },
          undefined,
          () => {
            if (!disposed) setModelReady(false);
          },
        );

        const animate = (now: number) => {
          if (disposed) return;
          const t = now / 1000;
          const talking = speakingRef.current;

          let blink = 0;
          if (blinkStartedAt < 0 && now >= nextBlinkAt) {
            blinkStartedAt = now;
          }
          if (blinkStartedAt >= 0) {
            const p = (now - blinkStartedAt) / 170;
            if (p < 0.5) blink = p * 2;
            else if (p < 1) blink = (1 - p) * 2;
            else {
              blinkStartedAt = -1;
              nextBlinkAt = now + 1900 + Math.random() * 2700;
            }
          }

          const mouthEnvelope = talking
            ? Math.min(
                1,
                0.14 +
                  Math.abs(Math.sin(t * 7.1)) * 0.52 +
                  Math.abs(Math.sin(t * 11.3 + 0.7)) * 0.28,
              )
            : 0;

          for (const binding of morphs) {
            setMorph(binding, binding.blinkLeft, blink);
            setMorph(binding, binding.blinkRight, blink);
            setMorph(binding, binding.jawOpen, mouthEnvelope * 0.72);
            setMorph(binding, binding.visemeA, talking ? Math.abs(Math.sin(t * 5.8)) * 0.48 : 0);
            setMorph(binding, binding.visemeE, talking ? Math.abs(Math.sin(t * 6.9 + 1.2)) * 0.32 : 0);
            setMorph(binding, binding.visemeO, talking ? Math.abs(Math.sin(t * 4.4 + 2.0)) * 0.30 : 0);
          }

          if (headNode) {
            headNode.rotation.y =
              headBase.y +
              Math.sin(t * 0.62) * 0.035 +
              (talking ? Math.sin(t * 1.9) * 0.018 : 0);
            headNode.rotation.x =
              headBase.x +
              Math.sin(t * 0.47 + 1.2) * 0.018 +
              (talking ? Math.sin(t * 2.4) * 0.012 : 0);
            headNode.rotation.z = headBase.z + Math.sin(t * 0.36) * 0.009;
          } else if (modelRoot) {
            modelRoot.rotation.y = Math.sin(t * 0.62) * 0.022;
            modelRoot.rotation.x = Math.sin(t * 0.47 + 1.2) * 0.010;
          }

          if (jawNode && !morphs.some((item) => item.jawOpen !== undefined)) {
            jawNode.rotation.x = jawBase.x + mouthEnvelope * 0.13;
          }

          if (modelRoot) {
            modelRoot.position.y += Math.sin(t * 1.25) * 0.00028;
          }

          renderer.render(scene, camera);
          frame = requestAnimationFrame(animate);
        };

        frame = requestAnimationFrame(animate);
      } catch {
        if (!disposed) setModelReady(false);
      }
    };

    void boot();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      setModelReady(false);
      try {
        modelRoot?.traverse?.((node: any) => {
          node.geometry?.dispose?.();
          const materials = Array.isArray(node.material)
            ? node.material
            : node.material
              ? [node.material]
              : [];
          materials.forEach((material: any) => {
            material.map?.dispose?.();
            material.normalMap?.dispose?.();
            material.roughnessMap?.dispose?.();
            material.metalnessMap?.dispose?.();
            material.dispose?.();
          });
        });
        renderer?.dispose?.();
        renderer?.domElement?.remove?.();
      } catch {
        // No-op cleanup fallback.
      }
    };
  }, [profile.id, isNexa, size]);

  const visual = (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          backgroundColor: isNexa ? '#120D25' : '#061328',
          borderWidth: selected ? 2 : 1,
          borderColor: selected
            ? profile.secondaryAccent
            : isNexa
              ? 'rgba(193,139,255,0.62)'
              : 'rgba(102,199,255,0.62)',
          boxShadow: isNexa
            ? '0 0 22px rgba(155,92,255,0.50)'
            : '0 0 22px rgba(59,130,246,0.50)',
        } as any,
        style,
      ]}
    >
      {React.createElement('img', {
        src: imageSource,
        alt: 'Avatar oficial de ' + profile.name,
        draggable: false,
        style: {
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: '50% 38%',
          transform: 'scale(1.22)',
          display: 'block',
          userSelect: 'none',
          pointerEvents: 'none',
          opacity: modelReady ? 0 : 1,
          transition: 'opacity 220ms ease',
        },
      })}
      {size >= 64 &&
        React.createElement('div', {
          ref: hostRef,
          'aria-hidden': true,
          style: {
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            opacity: modelReady ? 1 : 0,
            transition: 'opacity 220ms ease',
          },
        })}
    </View>
  );

  if (!onPress) return visual;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={'Abrir asistente ' + profile.name}
      onPress={onPress}
      style={({ pressed }) => ({
        opacity: pressed ? 0.9 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
        borderRadius: 999,
      })}
    >
      {visual}
    </Pressable>
  );
}
