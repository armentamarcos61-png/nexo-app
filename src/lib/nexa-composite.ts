/**
 * Nexa híbrida: Studio aporta el rostro, gorra, busto y morph targets originales.
 * El GLB articulado aporta solamente las superficies situadas debajo del busto.
 * No se dibujan dos personajes encima: se recorta el segundo en una unión común.
 */
type Result = {
  body: any;
  update(dt: number, speaking: boolean): void;
  dispose(): void;
  bounds: any;
  seamY: number;
};
type Landmark = { left: any; right: any; center: any; width: number };

function eyelidCenter(THREE: any, root: any, targetName: string): any | null {
  root.updateMatrixWorld(true);
  let winner: any = null;
  let strongest = 0;
  root.traverse((mesh: any) => {
    const targetIndex = mesh.morphTargetDictionary?.[targetName];
    const morph = mesh.geometry?.morphAttributes?.position?.[targetIndex];
    const position = mesh.geometry?.attributes?.position;
    if (!Number.isInteger(targetIndex) || !morph || !position) return;
    let peak = 0;
    for (let i = 0; i < morph.count; i++) {
      const d = morph.getX(i)**2 + morph.getY(i)**2 + morph.getZ(i)**2;
      if (d > peak) peak = d;
    }
    if (peak <= 1e-12) return;
    const sum = new THREE.Vector3();
    let mass = 0;
    const vertex = new THREE.Vector3();
    for (let i = 0; i < morph.count; i++) {
      const weight = morph.getX(i)**2 + morph.getY(i)**2 + morph.getZ(i)**2;
      if (weight < peak * 0.26) continue;
      vertex.fromBufferAttribute(position, i);
      if (mesh.isSkinnedMesh && typeof mesh.applyBoneTransform === 'function') {
        mesh.applyBoneTransform(i, vertex);
      }
      mesh.localToWorld(vertex);
      sum.addScaledVector(vertex, weight);
      mass += weight;
    }
    if (mass > strongest) {
      strongest = mass;
      winner = sum.multiplyScalar(1 / mass);
    }
  });
  return winner;
}

function landmarks(THREE: any, root: any): Landmark | null {
  const left = eyelidCenter(THREE, root, 'EyeBlinkLeft');
  const right = eyelidCenter(THREE, root, 'EyeBlinkRight');
  if (!left || !right) return null;
  const width = left.distanceTo(right);
  if (width < 0.005 || !Number.isFinite(width)) return null;
  return { left, right, center: left.clone().add(right).multiplyScalar(0.5), width };
}

function addRearHair(THREE: any, studio: any, eyes: Landmark | null): (dt?: number, headMotion?: number) => void {
  if (!eyes) return () => {};
  const head = studio.getObjectByName('mixamorig:Head');
  if (!head) return () => {};
  head.updateMatrixWorld(true);
  // All geometry remains behind the approved face, helmet, and facial morphs.
  const startWorld = eyes.center.clone().add(
    new THREE.Vector3(0, eyes.width * 0.84, -eyes.width * 0.68),
  );
  const start = head.worldToLocal(startWorld);
  const scale = studio.getWorldScale(new THREE.Vector3()).x || 1;
  const unit = eyes.width / scale;
  if (unit < 0.01 || unit > 1) return () => {};
  const group = new THREE.Group();
  group.name = 'Nexa modest rear hair extension';
  group.position.copy(start);
  head.add(group);
  const dark = new THREE.MeshStandardMaterial({
    color: 0x181323, roughness: 0.64, metalness: 0.04,
  });
  const highlight = new THREE.MeshStandardMaterial({
    color: 0x30243b, roughness: 0.6, metalness: 0.04,
  });
  const strands: any[] = [];
  // Subtle individual strands instead of a second wig or oversized ponytail.
  for (let i = 0; i < 18; i++) {
    const fraction = (i - 8.5) / 8.5;
    const startX = fraction * unit * 0.82;
    const length = unit * (2.6 + 0.35 * Math.cos(i * 0.67));
    const pivot = new THREE.Group();
    pivot.position.set(startX, 0, -unit * (0.05 + 0.12 * Math.abs(fraction)));
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(fraction * unit * 0.06, -length * 0.30, -unit * 0.2),
      new THREE.Vector3(fraction * unit * 0.12, -length * 0.68, -unit * 0.35),
      new THREE.Vector3(fraction * unit * 0.23, -length, -unit * 0.41),
    ]);
    const strand = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 16, unit * (0.010 + (i % 3) * 0.002), 4, false),
      i % 5 === 0 ? highlight : dark,
    );
    pivot.add(strand);
    group.add(pivot);
    strands.push({ pivot, strand, sign: fraction });
  }
  let time = 0;
  // Integrate the tiny elastic movement with the update loop.
  return (dt?: number, headMotion?: number) => {
    if (dt === undefined) {
      strands.forEach(({strand}) => strand.geometry.dispose());
      dark.dispose();
      highlight.dispose();
      group.removeFromParent();
      return;
    }
    time += Math.min(dt, 0.05);
    const amplitude = Math.min(0.014, Math.abs(headMotion || 0) * 0.12);
    for (const { pivot, sign } of strands) {
      pivot.rotation.z = sign * (0.006 * Math.sin(time * 0.9 + sign) + amplitude);
    }
  };
}

/**
 * Both models are genuine rigged GLBs. Alignment is measured from the native
 * blinking eyelid vertices, so no guessed pixel/photo offsets are involved.
 * Throws on invalid proportion instead of publishing a distorted character.
 */
export function composeNexaBody(THREE: any, studio: any, body: any, renderer: any): Result {
  const studioEyes = landmarks(THREE, studio);
  const bodyEyes = landmarks(THREE, body);
  if (!studioEyes || !bodyEyes) {
    throw new Error('No se encontraron referencias 3D de los ojos para unir los modelos');
  }
  const ratio = studioEyes.width / bodyEyes.width;
  if (!Number.isFinite(ratio) || ratio < 0.3 || ratio > 8) {
    throw new Error('Las proporciones de los modelos Nexa no son compatibles');
  }

  body.scale.setScalar(ratio);
  body.position.copy(studioEyes.center).sub(bodyEyes.center.clone().multiplyScalar(ratio));
  body.updateMatrixWorld(true);
  const upper = new THREE.Box3().setFromObject(studio);
  const lower = new THREE.Box3().setFromObject(body);
  const studioHeight = upper.max.y - upper.min.y;
  const bodyHeight = lower.max.y - lower.min.y;
  if (studioHeight < 0.15 || bodyHeight < studioHeight * 1.25 ||
      lower.min.y > upper.min.y || lower.max.y < upper.max.y - studioHeight * 0.3) {
    throw new Error('No se pudo ajustar el cuerpo sin deformar el torso Studio');
  }

  // Everything above the join belongs exclusively to Studio. The original
  // body face, cap, upper bust, and hair are not rendered at all.
  const seamY = upper.min.y + Math.max(0.002, studioHeight * 0.009);
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -seamY);
  renderer.localClippingEnabled = true;
  body.traverse((object: any) => {
    if (!object.isMesh) return;
    object.frustumCulled = false;
    const isArray = Array.isArray(object.material);
    const materials = isArray ? object.material : [object.material];
    const adjusted = materials.map((material: any) => {
      if (!material) return material;
      const copy = material.clone();
      copy.clippingPlanes = [plane];
      copy.clipShadows = true;
      copy.side = THREE.DoubleSide; // avoid a translucent gap at the trimmed edge
      copy.needsUpdate = true;
      return copy;
    });
    object.material = isArray ? adjusted : adjusted[0];
  });

  const visibleBounds = new THREE.Box3().setFromObject(studio);
  const lowerVisible = lower.clone();
  lowerVisible.max.y = Math.min(lowerVisible.max.y, seamY);
  visibleBounds.union(lowerVisible);

  const hairMotion = addRearHair(THREE, studio, studioEyes);
  let previousHeadYaw = 0;
  return {
    body,
    seamY,
    bounds: visibleBounds,
    update(dt: number, _speaking: boolean) {
      const head = studio.getObjectByName('mixamorig:Head');
      const yaw = head?.rotation?.y ?? 0;
      hairMotion(dt, yaw - previousHeadYaw);
      previousHeadYaw = yaw;
    },
    dispose() {
      hairMotion();
      body.traverse((object: any) => {
        if (!object.isMesh) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) material?.dispose?.();
        object.geometry?.dispose?.();
      });
      body.removeFromParent();
    },
  };
}
