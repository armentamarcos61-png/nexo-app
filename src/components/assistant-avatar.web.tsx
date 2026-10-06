import React, { useEffect, useRef } from 'react';
import { Pressable, View, type ViewStyle } from 'react-native';
import type { AssistantProfile } from '@/state/assistant';

type Props = {
  profile: AssistantProfile;
  size?: number;
  speaking?: boolean;
  onPress?: () => void;
  selected?: boolean;
  style?: ViewStyle;
};

type ThreeModule = any;

const THREE_URL =
  'https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js';

declare global {
  // eslint-disable-next-line no-var
  var __nexoThreePromise: Promise<ThreeModule> | undefined;
}

function loadThree(): Promise<ThreeModule> {
  if (!globalThis.__nexoThreePromise) {
    const dynamicImport = new Function(
      'url',
      'return import(url)'
    ) as (url: string) => Promise<ThreeModule>;

    globalThis.__nexoThreePromise = dynamicImport(THREE_URL);
  }

  return globalThis.__nexoThreePromise;
}

function createMaterial(
  THREE: ThreeModule,
  color: number,
  metalness: number,
  roughness: number,
  emissive?: number,
  emissiveIntensity = 0
) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness,
    emissive: emissive ?? 0x000000,
    emissiveIntensity,
  });
}

function addNEmblem(
  THREE: ThreeModule,
  parent: any,
  color: number,
  x: number,
  y: number,
  z: number,
  scale = 1
) {
  const material = createMaterial(THREE, color, 0.25, 0.24, color, 1.5);
  const barGeometry = new THREE.BoxGeometry(
    0.032 * scale,
    0.17 * scale,
    0.025 * scale
  );

  const left = new THREE.Mesh(barGeometry, material);
  left.position.set(x - 0.052 * scale, y, z);
  parent.add(left);

  const right = new THREE.Mesh(barGeometry, material);
  right.position.set(x + 0.052 * scale, y, z);
  parent.add(right);

  const diagonal = new THREE.Mesh(
    new THREE.BoxGeometry(
      0.032 * scale,
      0.205 * scale,
      0.025 * scale
    ),
    material
  );
  diagonal.position.set(x, y, z);
  diagonal.rotation.z = -0.55;
  parent.add(diagonal);
}

function createEye(
  THREE: ThreeModule,
  parent: any,
  x: number,
  y: number,
  z: number,
  accent: number,
  iris: number,
  humanLike: boolean
) {
  const root = new THREE.Group();
  root.position.set(x, y, z);

  if (humanLike) {
    const sclera = new THREE.Mesh(
      new THREE.SphereGeometry(0.10, 22, 16),
      createMaterial(THREE, 0xd9dce4, 0.08, 0.38)
    );
    sclera.scale.set(1, 0.72, 0.34);
    root.add(sclera);
  }

  const lens = new THREE.Mesh(
    new THREE.SphereGeometry(humanLike ? 0.052 : 0.092, 24, 18),
    createMaterial(THREE, accent, 0.16, 0.18, accent, 2.0)
  );
  lens.position.z = humanLike ? 0.065 : 0;
  lens.scale.set(1, humanLike ? 1 : 0.76, humanLike ? 0.45 : 0.32);
  root.add(lens);

  const pupil = new THREE.Mesh(
    new THREE.SphereGeometry(humanLike ? 0.023 : 0.035, 18, 14),
    createMaterial(THREE, iris, 0.15, 0.12, iris, 2.3)
  );
  pupil.position.z = humanLike ? 0.095 : 0.04;
  pupil.scale.z = 0.45;
  root.add(pupil);

  parent.add(root);
  return root;
}

function buildNexa(THREE: ThreeModule) {
  const root = new THREE.Group();
  const head = new THREE.Group();
  const torso = new THREE.Group();

  const white = createMaterial(THREE, 0xe8ebf3, 0.68, 0.26);
  const silver = createMaterial(THREE, 0x7f8799, 0.82, 0.22);
  const dark = createMaterial(THREE, 0x080d18, 0.48, 0.18);
  const face = createMaterial(THREE, 0xd0d1d5, 0.28, 0.38);
  const purple = 0x9b5cff;
  const purpleGlow = createMaterial(
    THREE,
    purple,
    0.18,
    0.18,
    purple,
    2.1
  );
  const blueGlow = 0x73bfff;

  root.add(torso);
  root.add(head);
  torso.position.y = -0.64;
  head.position.y = 0.34;

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.74, 0.018, 12, 64),
    purpleGlow
  );
  halo.position.set(0, 0.03, -0.38);
  head.add(halo);

  const chest = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 22),
    white
  );
  chest.scale.set(0.66, 0.48, 0.30);
  chest.position.set(0, 0.12, -0.02);
  torso.add(chest);

  for (const side of [-1, 1]) {
    const shoulder = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 16),
      dark
    );
    shoulder.scale.set(0.25, 0.24, 0.28);
    shoulder.position.set(side * 0.50, 0.17, -0.01);
    torso.add(shoulder);

    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.20, 0.34, 0.055),
      dark
    );
    panel.position.set(side * 0.23, 0.13, 0.27);
    panel.rotation.z = side * 0.18;
    torso.add(panel);
  }

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.34, 24),
    dark
  );
  neck.position.set(0, 0.50, 0);
  torso.add(neck);

  const chestBadge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.10, 0.10, 0.025, 28),
    dark
  );
  chestBadge.rotation.x = Math.PI / 2;
  chestBadge.position.set(0.28, 0.19, 0.30);
  torso.add(chestBadge);
  addNEmblem(THREE, torso, purple, 0.28, 0.19, 0.322, 0.72);

  const faceMesh = new THREE.Mesh(
    new THREE.SphereGeometry(1, 42, 30),
    face
  );
  faceMesh.scale.set(0.49, 0.59, 0.43);
  faceMesh.position.z = 0.02;
  head.add(faceMesh);

  for (const side of [-1, 1]) {
    const sidePanel = new THREE.Mesh(
      new THREE.SphereGeometry(1, 22, 16),
      dark
    );
    sidePanel.scale.set(0.10, 0.35, 0.30);
    sidePanel.position.set(side * 0.43, -0.02, 0);
    head.add(sidePanel);

    const ear = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.095, 28),
      silver
    );
    ear.rotation.z = Math.PI / 2;
    ear.position.set(side * 0.53, 0.03, 0.02);
    head.add(ear);

    const earRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.09, 0.012, 10, 32),
      purpleGlow
    );
    earRing.rotation.y = Math.PI / 2;
    earRing.position.set(side * 0.58, 0.03, 0.02);
    head.add(earRing);
  }

  const cap = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 20),
    white
  );
  cap.scale.set(0.56, 0.25, 0.49);
  cap.position.set(0, 0.46, -0.02);
  head.add(cap);

  const brim = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.055, 0.50),
    white
  );
  brim.position.set(0.07, 0.31, 0.24);
  head.add(brim);

  const capBadge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.082, 0.082, 0.024, 28),
    dark
  );
  capBadge.rotation.x = Math.PI / 2;
  capBadge.position.set(0.16, 0.49, 0.45);
  head.add(capBadge);
  addNEmblem(THREE, head, purple, 0.16, 0.49, 0.467, 0.50);

  const leftEye = createEye(
    THREE,
    head,
    -0.17,
    0.075,
    0.405,
    purple,
    blueGlow,
    true
  );
  const rightEye = createEye(
    THREE,
    head,
    0.17,
    0.075,
    0.405,
    purple,
    blueGlow,
    true
  );

  const browMaterial = createMaterial(THREE, 0x28202f, 0.08, 0.45);
  const brows = [-1, 1].map((side) => {
    const brow = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.022, 0.018),
      browMaterial
    );
    brow.position.set(side * 0.17, 0.19, 0.44);
    brow.rotation.z = side * 0.06;
    head.add(brow);
    return brow;
  });

  const nose = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 18, 12),
    face
  );
  nose.scale.set(0.70, 1, 0.75);
  nose.position.set(0, -0.045, 0.455);
  head.add(nose);

  const mouthRoot = new THREE.Group();
  mouthRoot.position.set(0, -0.19, 0.445);
  head.add(mouthRoot);

  const mouth = new THREE.Mesh(
    new THREE.SphereGeometry(1, 22, 14),
    createMaterial(THREE, 0x55283f, 0.05, 0.32, 0x2a1022, 0.28)
  );
  mouth.scale.set(0.11, 0.022, 0.016);
  mouthRoot.add(mouth);

  return {
    root,
    head,
    torso,
    halo,
    eyes: [leftEye, rightEye],
    brows,
    mouthRoot,
    mouth,
    accent: purple,
  };
}

function buildNexo(THREE: ThreeModule) {
  const root = new THREE.Group();
  const head = new THREE.Group();
  const torso = new THREE.Group();

  const silver = createMaterial(THREE, 0x778293, 0.88, 0.20);
  const steel = createMaterial(THREE, 0x3c4656, 0.86, 0.24);
  const dark = createMaterial(THREE, 0x060b14, 0.46, 0.14);
  const black = createMaterial(THREE, 0x01040a, 0.32, 0.12);
  const blue = 0x3b82f6;
  const cyan = 0x66c7ff;
  const blueGlow = createMaterial(THREE, blue, 0.20, 0.16, blue, 2.25);
  const cyanGlow = createMaterial(THREE, cyan, 0.12, 0.12, cyan, 2.4);

  root.add(torso);
  root.add(head);
  torso.position.y = -0.64;
  head.position.y = 0.34;

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.75, 0.020, 12, 64),
    blueGlow
  );
  halo.position.set(0, 0.03, -0.40);
  head.add(halo);

  const chest = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 22),
    dark
  );
  chest.scale.set(0.70, 0.47, 0.32);
  chest.position.set(0, 0.11, -0.02);
  torso.add(chest);

  const armor = new THREE.Mesh(
    new THREE.BoxGeometry(0.86, 0.38, 0.12),
    steel
  );
  armor.position.set(0, 0.13, 0.25);
  torso.add(armor);

  for (const side of [-1, 1]) {
    const shoulder = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 16),
      silver
    );
    shoulder.scale.set(0.30, 0.28, 0.30);
    shoulder.position.set(side * 0.56, 0.17, 0);
    torso.add(shoulder);

    const strap = new THREE.Mesh(
      new THREE.BoxGeometry(0.10, 0.50, 0.07),
      black
    );
    strap.position.set(side * 0.28, 0.17, 0.33);
    strap.rotation.z = side * 0.14;
    torso.add(strap);
  }

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 0.36, 24),
    dark
  );
  neck.position.set(0, 0.50, 0);
  torso.add(neck);

  addNEmblem(THREE, torso, cyan, 0, 0.13, 0.325, 0.82);

  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(1, 36, 26),
    silver
  );
  shell.scale.set(0.57, 0.53, 0.47);
  head.add(shell);

  const faceplate = new THREE.Mesh(
    new THREE.SphereGeometry(1, 34, 24),
    black
  );
  faceplate.scale.set(0.47, 0.39, 0.32);
  faceplate.position.set(0, -0.01, 0.19);
  head.add(faceplate);

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 20),
    silver
  );
  dome.scale.set(0.62, 0.29, 0.54);
  dome.position.set(0, 0.45, -0.01);
  head.add(dome);

  const brim = new THREE.Mesh(
    new THREE.BoxGeometry(0.73, 0.065, 0.53),
    steel
  );
  brim.position.set(0.02, 0.28, 0.22);
  head.add(brim);

  const helmetBadge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.095, 0.095, 0.028, 30),
    dark
  );
  helmetBadge.rotation.x = Math.PI / 2;
  helmetBadge.position.set(0.22, 0.48, 0.48);
  head.add(helmetBadge);
  addNEmblem(THREE, head, cyan, 0.22, 0.48, 0.50, 0.58);

  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.10, 28),
      silver
    );
    ear.rotation.z = Math.PI / 2;
    ear.position.set(side * 0.56, 0.035, 0);
    head.add(ear);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.086, 0.012, 10, 32),
      cyanGlow
    );
    ring.rotation.y = Math.PI / 2;
    ring.position.set(side * 0.615, 0.035, 0);
    head.add(ring);
  }

  const leftEye = createEye(
    THREE,
    head,
    -0.18,
    0.075,
    0.465,
    cyan,
    0x9b5cff,
    false
  );
  const rightEye = createEye(
    THREE,
    head,
    0.18,
    0.075,
    0.465,
    cyan,
    0x9b5cff,
    false
  );

  const mouthRoot = new THREE.Group();
  mouthRoot.position.set(0, -0.18, 0.485);
  head.add(mouthRoot);

  const mouth = new THREE.Mesh(
    new THREE.SphereGeometry(1, 18, 12),
    cyanGlow
  );
  mouth.scale.set(0.13, 0.016, 0.013);
  mouthRoot.add(mouth);

  return {
    root,
    head,
    torso,
    halo,
    eyes: [leftEye, rightEye],
    brows: [],
    mouthRoot,
    mouth,
    accent: blue,
  };
}

function disposeObject(root: any) {
  root.traverse((child: any) => {
    if (child.geometry?.dispose) child.geometry.dispose();

    const materials = Array.isArray(child.material)
      ? child.material
      : child.material
        ? [child.material]
        : [];

    materials.forEach((material: any) => material.dispose?.());
  });
}

export function AssistantAvatar({
  profile,
  size = 92,
  speaking = false,
  onPress,
  selected = false,
  style,
}: Props) {
  const hostRef = useRef<any>(null);
  const speakingRef = useRef(speaking);
  const selectedRef = useRef(selected);

  useEffect(() => {
    speakingRef.current = speaking;
  }, [speaking]);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    let disposed = false;
    let frame = 0;
    let renderer: any = null;
    let scene: any = null;
    let model: ReturnType<typeof buildNexa> | null = null;
    let resizeObserver: ResizeObserver | null = null;

    const host = hostRef.current;
    if (!host) return;

    host.innerHTML = '';

    void loadThree()
      .then((THREE) => {
        if (disposed || !hostRef.current) return;

        scene = new THREE.Scene();

        const camera = new THREE.PerspectiveCamera(27, 1, 0.1, 100);
        camera.position.set(0, 0.05, 5.15);

        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
        });

        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(size, size, false);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.18;
        renderer.shadowMap.enabled = true;
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.display = 'block';
        renderer.domElement.style.borderRadius = '999px';

        hostRef.current.appendChild(renderer.domElement);

        scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x09101e, 2.15));

        const key = new THREE.DirectionalLight(0xffffff, 3.3);
        key.position.set(2.8, 3.2, 4.4);
        scene.add(key);

        const rim = new THREE.PointLight(
          profile.id === 'nexa' ? 0xa467ff : 0x4ca8ff,
          4.4,
          8
        );
        rim.position.set(-2.0, 1.1, 2.4);
        scene.add(rim);

        const fill = new THREE.PointLight(0x8fcfff, 2.0, 7);
        fill.position.set(2.1, -0.6, 2.6);
        scene.add(fill);

        model =
          profile.id === 'nexa' ? buildNexa(THREE) : buildNexo(THREE);

        model.root.scale.setScalar(1.34);
        model.root.position.y = -0.03;
        scene.add(model.root);

        let nextBlink = performance.now() + 1600 + Math.random() * 2200;
        let blinkStart = -1;
        const start = performance.now();

        const render = (now: number) => {
          if (disposed || !renderer || !model) return;

          const t = (now - start) / 1000;
          const isTalking = speakingRef.current;

          const idleYaw =
            Math.sin(t * 0.55) * 0.045 +
            Math.sin(t * 0.23 + 0.8) * 0.018;
          const idlePitch =
            Math.sin(t * 0.42 + 1.1) * 0.022 +
            Math.sin(t * 0.18) * 0.010;
          const idleRoll = Math.sin(t * 0.31) * 0.012;

          const talkNod = isTalking
            ? Math.sin(t * 3.1) * 0.020 +
              Math.sin(t * 1.55 + 0.4) * 0.013
            : 0;
          const talkYaw = isTalking ? Math.sin(t * 1.35) * 0.018 : 0;

          model.head.rotation.x = idlePitch + talkNod;
          model.head.rotation.y = idleYaw + talkYaw;
          model.head.rotation.z = idleRoll;

          model.torso.rotation.y = Math.sin(t * 0.28) * 0.010;
          model.torso.rotation.z = Math.sin(t * 0.22 + 0.7) * 0.005;
          model.torso.position.y = -0.64 + Math.sin(t * 0.78) * 0.004;

          model.halo.rotation.z = Math.sin(t * 0.18) * 0.035;
          const haloScale =
            (selectedRef.current ? 1.02 : 1) +
            (isTalking ? Math.sin(t * 4.0) * 0.010 : 0);
          model.halo.scale.setScalar(haloScale);

          if (now >= nextBlink && blinkStart < 0) {
            blinkStart = now;
          }

          let blinkScale = 1;
          if (blinkStart >= 0) {
            const phase = (now - blinkStart) / 170;

            if (phase < 0.5) {
              blinkScale = Math.max(0.06, 1 - phase * 1.88);
            } else if (phase < 1) {
              blinkScale = Math.min(1, 0.06 + (phase - 0.5) * 1.88);
            } else {
              blinkStart = -1;
              nextBlink = now + 2200 + Math.random() * 3300;
            }
          }

          model.eyes.forEach((eye) => {
            eye.scale.y = blinkScale;
          });

          if (isTalking) {
            const speech =
              0.58 +
              Math.abs(Math.sin(t * 8.7)) * 0.74 +
              Math.abs(Math.sin(t * 5.1 + 1.2)) * 0.34;

            model.mouthRoot.scale.y = speech;
            model.mouthRoot.scale.x =
              1.05 - Math.min(0.19, (speech - 0.58) * 0.13);

            if (model.brows.length) {
              model.brows[0].rotation.z =
                -0.06 - Math.sin(t * 1.8) * 0.025;
              model.brows[1].rotation.z =
                0.06 + Math.sin(t * 1.8) * 0.025;
            }
          } else {
            model.mouthRoot.scale.y +=
              (1 - model.mouthRoot.scale.y) * 0.18;
            model.mouthRoot.scale.x +=
              (1 - model.mouthRoot.scale.x) * 0.18;
          }

          model.root.rotation.y = Math.sin(t * 0.20) * 0.018;
          model.root.position.x = Math.sin(t * 0.25) * 0.006;

          renderer.render(scene, camera);
          frame = requestAnimationFrame(render);
        };

        frame = requestAnimationFrame(render);

        resizeObserver = new ResizeObserver(() => {
          const element = hostRef.current;
          if (!element || !renderer) return;

          const width = Math.max(1, element.clientWidth);
          const height = Math.max(1, element.clientHeight);

          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        });

        resizeObserver.observe(hostRef.current);
      })
      .catch(() => {
        if (!hostRef.current) return;
        hostRef.current.innerHTML =
          '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-weight:900;font-size:22px;color:white;">N</div>';
      });

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      resizeObserver?.disconnect();

      if (scene && model) {
        disposeObject(model.root);
        scene.clear?.();
      }

      renderer?.dispose?.();

      if (hostRef.current) {
        hostRef.current.innerHTML = '';
      }
    };
  }, [profile.id, size]);

  const visual = (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          backgroundColor:
            profile.id === 'nexa' ? '#120D25' : '#061328',
          borderWidth: selected ? 2 : 1,
          borderColor: profile.secondaryAccent,
          boxShadow:
            profile.id === 'nexa'
              ? '0 0 20px rgba(155,92,255,0.45)'
              : '0 0 20px rgba(59,130,246,0.45)',
        } as any,
        style,
      ]}
    >
      {React.createElement('div', {
        ref: hostRef,
        style: {
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          borderRadius: '999px',
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
        opacity: pressed ? 0.90 : 1,
        transform: [{ scale: pressed ? 0.97 : 1 }],
        borderRadius: 999,
      })}
    >
      {visual}
    </Pressable>
  );
}
