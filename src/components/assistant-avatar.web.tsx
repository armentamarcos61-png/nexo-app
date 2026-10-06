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

function mat(
  THREE: ThreeModule,
  color: number,
  metalness = 0.25,
  roughness = 0.34,
  emissive = 0x000000,
  emissiveIntensity = 0
) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness,
    roughness,
    emissive,
    emissiveIntensity,
  });
}

function addN(
  THREE: ThreeModule,
  parent: any,
  color: number,
  x: number,
  y: number,
  z: number,
  scale = 1
) {
  const material = mat(THREE, color, 0.22, 0.22, color, 1.6);
  const bar = new THREE.BoxGeometry(0.028 * scale, 0.14 * scale, 0.022 * scale);

  const left = new THREE.Mesh(bar, material);
  left.position.set(x - 0.044 * scale, y, z);
  parent.add(left);

  const right = new THREE.Mesh(bar, material);
  right.position.set(x + 0.044 * scale, y, z);
  parent.add(right);

  const diagonal = new THREE.Mesh(
    new THREE.BoxGeometry(0.028 * scale, 0.17 * scale, 0.022 * scale),
    material
  );
  diagonal.position.set(x, y, z);
  diagonal.rotation.z = -0.55;
  parent.add(diagonal);
}

function createHumanEye(
  THREE: ThreeModule,
  head: any,
  x: number,
  y: number,
  z: number,
  irisColor: number,
  glowColor: number
) {
  const eye = new THREE.Group();
  eye.position.set(x, y, z);

  const sclera = new THREE.Mesh(
    new THREE.SphereGeometry(1, 28, 20),
    mat(THREE, 0xf1f3f8, 0.03, 0.38)
  );
  sclera.scale.set(0.105, 0.077, 0.047);
  eye.add(sclera);

  const iris = new THREE.Mesh(
    new THREE.SphereGeometry(1, 24, 18),
    mat(THREE, irisColor, 0.08, 0.18, glowColor, 1.1)
  );
  iris.scale.set(0.050, 0.050, 0.018);
  iris.position.z = 0.044;
  eye.add(iris);

  const pupil = new THREE.Mesh(
    new THREE.SphereGeometry(1, 20, 14),
    mat(THREE, 0x060914, 0.02, 0.15)
  );
  pupil.scale.set(0.021, 0.021, 0.010);
  pupil.position.z = 0.059;
  eye.add(pupil);

  const glint = new THREE.Mesh(
    new THREE.SphereGeometry(1, 12, 8),
    mat(THREE, 0xffffff, 0, 0.1, 0xffffff, 1.5)
  );
  glint.scale.setScalar(0.008);
  glint.position.set(-0.014, 0.017, 0.067);
  eye.add(glint);

  head.add(eye);
  return eye;
}

function createMouth(
  THREE: ThreeModule,
  head: any,
  options: {
    y: number;
    z: number;
    lipColor: number;
    width: number;
    feminine?: boolean;
  }
) {
  const root = new THREE.Group();
  root.position.set(0, options.y, options.z);
  head.add(root);

  const cavity = new THREE.Mesh(
    new THREE.SphereGeometry(1, 28, 18),
    mat(THREE, 0x100910, 0.02, 0.22)
  );
  cavity.scale.set(options.width, 0.010, 0.020);
  root.add(cavity);

  const upperLip = new THREE.Mesh(
    new THREE.SphereGeometry(1, 26, 16),
    mat(THREE, options.lipColor, 0.03, options.feminine ? 0.28 : 0.38)
  );
  upperLip.scale.set(options.width * 1.04, 0.018, 0.017);
  upperLip.position.y = 0.010;
  root.add(upperLip);

  const lowerLip = new THREE.Mesh(
    new THREE.SphereGeometry(1, 26, 16),
    mat(THREE, options.lipColor, 0.03, options.feminine ? 0.28 : 0.38)
  );
  lowerLip.scale.set(options.width, 0.017, 0.016);
  lowerLip.position.y = -0.010;
  root.add(lowerLip);

  const teeth = new THREE.Mesh(
    new THREE.BoxGeometry(options.width * 1.30, 0.018, 0.010),
    mat(THREE, 0xf6f6f4, 0.01, 0.25)
  );
  teeth.position.set(0, 0.001, 0.008);
  root.add(teeth);

  return { root, cavity, upperLip, lowerLip, teeth };
}

function buildNexa(THREE: ThreeModule) {
  const root = new THREE.Group();
  const torso = new THREE.Group();
  const head = new THREE.Group();
  root.add(torso);
  root.add(head);

  torso.position.y = -0.64;
  head.position.y = 0.34;

  const purple = 0x9b5cff;
  const violet = 0xc18bff;
  const white = mat(THREE, 0xe8e9ee, 0.52, 0.27);
  const silver = mat(THREE, 0x8b93a3, 0.75, 0.22);
  const dark = mat(THREE, 0x0a0f1b, 0.38, 0.20);
  const faceMat = mat(THREE, 0xd9d9dc, 0.12, 0.40);
  const glow = mat(THREE, purple, 0.15, 0.14, purple, 2.2);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.73, 0.017, 12, 72),
    glow
  );
  halo.position.set(0, 0.04, -0.42);
  head.add(halo);

  const chest = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), white);
  chest.scale.set(0.68, 0.48, 0.32);
  chest.position.set(0, 0.10, 0);
  torso.add(chest);

  const centerPanel = new THREE.Mesh(
    new THREE.BoxGeometry(0.20, 0.40, 0.09),
    dark
  );
  centerPanel.position.set(0, 0.12, 0.30);
  torso.add(centerPanel);

  for (const side of [-1, 1]) {
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(1, 26, 18), dark);
    shoulder.scale.set(0.29, 0.25, 0.30);
    shoulder.position.set(side * 0.53, 0.16, 0);
    torso.add(shoulder);

    const pauldron = new THREE.Mesh(
      new THREE.SphereGeometry(1, 22, 16),
      silver
    );
    pauldron.scale.set(0.24, 0.11, 0.22);
    pauldron.position.set(side * 0.50, 0.28, 0.06);
    torso.add(pauldron);
  }

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.13, 0.36, 28),
    dark
  );
  neck.position.set(0, 0.51, 0);
  torso.add(neck);

  const badge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.095, 0.095, 0.026, 32),
    dark
  );
  badge.rotation.x = Math.PI / 2;
  badge.position.set(0.27, 0.17, 0.325);
  torso.add(badge);
  addN(THREE, torso, violet, 0.27, 0.17, 0.343, 0.60);

  const face = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 36), faceMat);
  face.scale.set(0.47, 0.58, 0.42);
  face.position.z = 0.03;
  head.add(face);

  const jaw = new THREE.Group();
  jaw.position.set(0, -0.24, 0.15);
  head.add(jaw);

  const chin = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), faceMat);
  chin.scale.set(0.27, 0.18, 0.28);
  chin.position.set(0, -0.06, 0.19);
  jaw.add(chin);

  const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 36, 24), white);
  cap.scale.set(0.55, 0.24, 0.49);
  cap.position.set(0, 0.47, -0.02);
  head.add(cap);

  const brim = new THREE.Mesh(
    new THREE.BoxGeometry(0.60, 0.055, 0.44),
    white
  );
  brim.position.set(0.06, 0.33, 0.25);
  brim.rotation.x = -0.02;
  head.add(brim);

  const capBadge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.080, 0.080, 0.025, 28),
    dark
  );
  capBadge.rotation.x = Math.PI / 2;
  capBadge.position.set(0.14, 0.50, 0.45);
  head.add(capBadge);
  addN(THREE, head, violet, 0.14, 0.50, 0.468, 0.48);

  for (const side of [-1, 1]) {
    const sideHair = new THREE.Mesh(
      new THREE.SphereGeometry(1, 24, 18),
      mat(THREE, 0x171723, 0.10, 0.34)
    );
    sideHair.scale.set(0.11, 0.33, 0.30);
    sideHair.position.set(side * 0.43, 0.00, -0.01);
    head.add(sideHair);

    const ear = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.095, 32),
      silver
    );
    ear.rotation.z = Math.PI / 2;
    ear.position.set(side * 0.53, 0.02, 0.01);
    head.add(ear);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.09, 0.012, 10, 36),
      glow
    );
    ring.rotation.y = Math.PI / 2;
    ring.position.set(side * 0.58, 0.02, 0.01);
    head.add(ring);
  }

  const leftEye = createHumanEye(
    THREE,
    head,
    -0.17,
    0.075,
    0.405,
    0x755cff,
    violet
  );
  const rightEye = createHumanEye(
    THREE,
    head,
    0.17,
    0.075,
    0.405,
    0x755cff,
    violet
  );

  const browMat = mat(THREE, 0x2b2732, 0.04, 0.45);
  const brows = [-1, 1].map((side) => {
    const brow = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.024, 0.018),
      browMat
    );
    brow.position.set(side * 0.17, 0.19, 0.438);
    brow.rotation.z = side * 0.08;
    head.add(brow);
    return brow;
  });

  const nose = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), faceMat);
  nose.scale.set(0.030, 0.052, 0.052);
  nose.position.set(0, -0.045, 0.456);
  head.add(nose);

  const mouth = createMouth(THREE, head, {
    y: -0.185,
    z: 0.445,
    lipColor: 0x725064,
    width: 0.105,
    feminine: true,
  });

  return {
    root,
    head,
    torso,
    halo,
    eyes: [leftEye, rightEye],
    brows,
    jaw,
    mouth,
    accent: purple,
  };
}

function buildNexo(THREE: ThreeModule) {
  const root = new THREE.Group();
  const torso = new THREE.Group();
  const head = new THREE.Group();
  root.add(torso);
  root.add(head);

  torso.position.y = -0.64;
  head.position.y = 0.34;

  const blue = 0x3b82f6;
  const cyan = 0x66c7ff;
  const whiteMetal = mat(THREE, 0xd4d7dd, 0.62, 0.23);
  const steel = mat(THREE, 0x586272, 0.80, 0.20);
  const dark = mat(THREE, 0x080d16, 0.40, 0.18);
  const suit = mat(THREE, 0x111827, 0.28, 0.42);
  const faceMat = mat(THREE, 0xcfd2d8, 0.18, 0.36);
  const glow = mat(THREE, blue, 0.15, 0.14, blue, 2.2);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.74, 0.018, 12, 72),
    glow
  );
  halo.position.set(0, 0.03, -0.43);
  head.add(halo);

  const chest = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), suit);
  chest.scale.set(0.70, 0.49, 0.33);
  chest.position.set(0, 0.10, 0);
  torso.add(chest);

  const chestPanel = new THREE.Mesh(
    new THREE.BoxGeometry(0.70, 0.25, 0.08),
    dark
  );
  chestPanel.position.set(0, 0.18, 0.31);
  torso.add(chestPanel);

  for (const side of [-1, 1]) {
    const shoulder = new THREE.Mesh(
      new THREE.SphereGeometry(1, 26, 18),
      steel
    );
    shoulder.scale.set(0.30, 0.26, 0.30);
    shoulder.position.set(side * 0.55, 0.16, 0);
    torso.add(shoulder);

    const strap = new THREE.Mesh(
      new THREE.BoxGeometry(0.10, 0.46, 0.06),
      dark
    );
    strap.position.set(side * 0.29, 0.15, 0.34);
    strap.rotation.z = side * 0.15;
    torso.add(strap);
  }

  const neck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.14, 0.36, 28),
    dark
  );
  neck.position.set(0, 0.51, 0);
  torso.add(neck);

  addN(THREE, torso, cyan, 0, 0.18, 0.355, 0.72);

  const face = new THREE.Mesh(
    new THREE.SphereGeometry(1, 48, 36),
    faceMat
  );
  face.scale.set(0.49, 0.56, 0.43);
  face.position.z = 0.03;
  head.add(face);

  const jaw = new THREE.Group();
  jaw.position.set(0, -0.235, 0.15);
  head.add(jaw);

  const chin = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 24),
    faceMat
  );
  chin.scale.set(0.30, 0.19, 0.29);
  chin.position.set(0, -0.06, 0.19);
  jaw.add(chin);

  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(1, 38, 26),
    whiteMetal
  );
  helmet.scale.set(0.62, 0.30, 0.54);
  helmet.position.set(0, 0.45, -0.02);
  head.add(helmet);

  const brim = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.060, 0.48),
    steel
  );
  brim.position.set(0.03, 0.29, 0.24);
  head.add(brim);

  const helmetBadge = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.14, 0.025),
    whiteMetal
  );
  helmetBadge.position.set(0.17, 0.48, 0.46);
  head.add(helmetBadge);
  addN(THREE, head, cyan, 0.17, 0.48, 0.478, 0.53);

  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.10, 32),
      steel
    );
    ear.rotation.z = Math.PI / 2;
    ear.position.set(side * 0.55, 0.02, 0.01);
    head.add(ear);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.09, 0.012, 10, 36),
      glow
    );
    ring.rotation.y = Math.PI / 2;
    ring.position.set(side * 0.60, 0.02, 0.01);
    head.add(ring);
  }

  const leftEye = createHumanEye(
    THREE,
    head,
    -0.175,
    0.075,
    0.415,
    0x2f79ff,
    cyan
  );
  const rightEye = createHumanEye(
    THREE,
    head,
    0.175,
    0.075,
    0.415,
    0x2f79ff,
    cyan
  );

  const browMat = mat(THREE, 0x242b36, 0.08, 0.38);
  const brows = [-1, 1].map((side) => {
    const brow = new THREE.Mesh(
      new THREE.BoxGeometry(0.175, 0.028, 0.020),
      browMat
    );
    brow.position.set(side * 0.175, 0.195, 0.445);
    brow.rotation.z = side * 0.055;
    head.add(brow);
    return brow;
  });

  const nose = new THREE.Mesh(
    new THREE.SphereGeometry(1, 20, 14),
    faceMat
  );
  nose.scale.set(0.033, 0.055, 0.052);
  nose.position.set(0, -0.048, 0.466);
  head.add(nose);

  const mouth = createMouth(THREE, head, {
    y: -0.185,
    z: 0.455,
    lipColor: 0x48515c,
    width: 0.115,
  });

  return {
    root,
    head,
    torso,
    halo,
    eyes: [leftEye, rightEye],
    brows,
    jaw,
    mouth,
    accent: blue,
  };
}

function disposeObject(root: any) {
  root.traverse((child: any) => {
    child.geometry?.dispose?.();

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
        camera.position.set(0, 0.04, 5.05);

        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
        });

        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(size, size, false);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.16;
        renderer.shadowMap.enabled = true;
        renderer.domElement.style.width = '100%';
        renderer.domElement.style.height = '100%';
        renderer.domElement.style.display = 'block';
        renderer.domElement.style.borderRadius = '999px';

        hostRef.current.appendChild(renderer.domElement);

        scene.add(new THREE.HemisphereLight(0xe9efff, 0x07101d, 2.25));

        const key = new THREE.DirectionalLight(0xffffff, 3.4);
        key.position.set(2.7, 3.1, 4.3);
        scene.add(key);

        const rim = new THREE.PointLight(
          profile.id === 'nexa' ? 0xab6bff : 0x4ca8ff,
          4.6,
          8
        );
        rim.position.set(-2.0, 1.2, 2.5);
        scene.add(rim);

        const fill = new THREE.PointLight(0xaad8ff, 1.8, 7);
        fill.position.set(2.0, -0.6, 2.5);
        scene.add(fill);

        model =
          profile.id === 'nexa' ? buildNexa(THREE) : buildNexo(THREE);

        model.root.scale.setScalar(1.35);
        model.root.position.y = -0.02;
        scene.add(model.root);

        let nextBlink = performance.now() + 900 + Math.random() * 1500;
        let blinkStart = -1;
        const start = performance.now();

        const render = (now: number) => {
          if (disposed || !renderer || !model) return;

          const t = (now - start) / 1000;
          const talking = speakingRef.current;

          const idleYaw =
            Math.sin(t * 0.62) * 0.055 +
            Math.sin(t * 0.24 + 0.8) * 0.020;
          const idlePitch =
            Math.sin(t * 0.46 + 0.6) * 0.026 +
            Math.sin(t * 0.19) * 0.010;
          const idleRoll = Math.sin(t * 0.33) * 0.014;

          const talkNod = talking
            ? Math.sin(t * 2.7) * 0.040 +
              Math.sin(t * 1.35 + 0.7) * 0.018
            : 0;
          const talkYaw = talking
            ? Math.sin(t * 1.55 + 0.4) * 0.032
            : 0;

          model.head.rotation.x = idlePitch + talkNod;
          model.head.rotation.y = idleYaw + talkYaw;
          model.head.rotation.z = idleRoll;

          model.torso.rotation.y = Math.sin(t * 0.30) * 0.014;
          model.torso.rotation.z = Math.sin(t * 0.24 + 0.5) * 0.007;
          model.torso.position.y =
            -0.64 + Math.sin(t * 0.82) * 0.006;

          model.root.rotation.y = Math.sin(t * 0.20) * 0.022;
          model.root.position.x = Math.sin(t * 0.28) * 0.008;

          model.halo.rotation.z = Math.sin(t * 0.18) * 0.045;
          const haloScale =
            (selectedRef.current ? 1.025 : 1) +
            (talking ? Math.sin(t * 4.1) * 0.012 : 0);
          model.halo.scale.setScalar(haloScale);

          if (now >= nextBlink && blinkStart < 0) {
            blinkStart = now;
          }

          let blinkScale = 1;
          if (blinkStart >= 0) {
            const phase = (now - blinkStart) / 155;

            if (phase < 0.5) {
              blinkScale = Math.max(0.025, 1 - phase * 1.96);
            } else if (phase < 1) {
              blinkScale = Math.min(1, 0.025 + (phase - 0.5) * 1.96);
            } else {
              blinkStart = -1;
              nextBlink = now + 1800 + Math.random() * 2600;
            }
          }

          model.eyes.forEach((eye, index) => {
            eye.scale.y = blinkScale;
            eye.rotation.y =
              Math.sin(t * 0.62 + index * 0.10) * 0.018;
            eye.rotation.x = Math.sin(t * 0.45) * 0.009;
          });

          let mouthOpen = 0;
          if (talking) {
            mouthOpen = Math.min(
              1,
              0.12 +
                Math.abs(Math.sin(t * 7.9)) * 0.58 +
                Math.abs(Math.sin(t * 11.7 + 0.8)) * 0.30
            );
          }

          const mouth = model.mouth;
          mouth.cavity.scale.y = 0.010 + mouthOpen * 0.080;
          mouth.cavity.scale.x =
            (profile.id === 'nexa' ? 0.105 : 0.115) *
            (1 - mouthOpen * 0.14);
          mouth.cavity.position.y = -mouthOpen * 0.010;

          mouth.upperLip.position.y = 0.010 + mouthOpen * 0.010;
          mouth.lowerLip.position.y = -0.010 - mouthOpen * 0.052;
          mouth.lowerLip.scale.y = 0.017 + mouthOpen * 0.012;

          mouth.teeth.visible = mouthOpen > 0.20;
          mouth.teeth.position.y = 0.004 + mouthOpen * 0.008;
          mouth.teeth.scale.y = 0.65 + mouthOpen * 0.25;

          model.jaw.rotation.x = mouthOpen * 0.085;
          model.jaw.position.y = -0.24 - mouthOpen * 0.020;

          if (talking) {
            model.brows[0].rotation.z =
              -0.08 - Math.sin(t * 1.9) * 0.024;
            model.brows[1].rotation.z =
              0.08 + Math.sin(t * 1.9) * 0.024;
          } else {
            model.brows[0].rotation.z +=
              (-0.08 - model.brows[0].rotation.z) * 0.12;
            model.brows[1].rotation.z +=
              (0.08 - model.brows[1].rotation.z) * 0.12;
          }

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
              ? '0 0 22px rgba(155,92,255,0.50)'
              : '0 0 22px rgba(59,130,246,0.50)',
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
