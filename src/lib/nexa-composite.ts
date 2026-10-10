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
 * Pose the old fully articulated skeleton independently of the Studio face.
 * The older clip's arm and foot keyframes were leaving the hands suspended
 * next to the chest and tipping the boots. A quiet bind pose is more stable
 * than letting two independent skeletons fight over the same portrait.
 */
function relaxBodyPose(THREE: any, body: any): void {
  const vector = () => new THREE.Vector3();
  const rotateToward = (bone: any, next: any, desired: any, limit: number) => {
    if (!bone || !next || !bone.parent) return;
    body.updateMatrixWorld(true);
    const a = bone.getWorldPosition(vector());
    const b = next.getWorldPosition(vector());
    const current = b.sub(a);
    if (current.lengthSq() < 1e-7) return;
    current.normalize();
    const goal = desired.clone().normalize();
    const desiredRotation = new THREE.Quaternion().setFromUnitVectors(current, goal);
    const angle = 2 * Math.acos(Math.min(1, Math.abs(desiredRotation.w)));
    if (angle < 0.015) return;
    const correction = new THREE.Quaternion().slerp(desiredRotation, Math.min(1, limit / angle));
    const parentOrientation = bone.parent.getWorldQuaternion(new THREE.Quaternion());
    const localCorrection = parentOrientation.clone().invert()
      .multiply(correction).multiply(parentOrientation);
    bone.quaternion.premultiply(localCorrection).normalize();
    body.updateMatrixWorld(true);
  };
  for (const side of ['Left', 'Right']) {
    const shoulder = body.getObjectByName('mixamorig:' + side + 'Arm');
    const elbow = body.getObjectByName('mixamorig:' + side + 'ForeArm');
    const wrist = body.getObjectByName('mixamorig:' + side + 'Hand');
    if (!shoulder || !elbow || !wrist) continue;
    const sideSign = Math.sign(shoulder.getWorldPosition(vector()).x) ||
      (side === 'Left' ? 1 : -1);
    // A-pose with slightly separated elbows and hands beside the thighs.
    rotateToward(shoulder, elbow,
      new THREE.Vector3(sideSign * 0.22, -1, 0.025), 1.55);
    rotateToward(elbow, wrist,
      new THREE.Vector3(sideSign * 0.07, -1, 0.065), 1.20);
  }
  for (const side of ['Left', 'Right']) {
    const ankle = body.getObjectByName('mixamorig:' + side + 'Foot');
    const toe = body.getObjectByName('mixamorig:' + side + 'ToeBase');
    if (!ankle || !toe) continue;
    body.updateMatrixWorld(true);
    const axis = toe.getWorldPosition(vector()).sub(ankle.getWorldPosition(vector()));
    const horizontal = new THREE.Vector3(axis.x, 0, axis.z);
    if (horizontal.lengthSq() > 1e-5) {
      rotateToward(ankle, toe, horizontal, 0.30);
    }
  }
}

/**
 * The approved Studio bust already supplies complete skinned arms and hands.
 * Pose those limbs, not just the older body's arms: otherwise Studio remains
 * in the horizontal T pose regardless of how the lower half is calibrated.
 * Returns false for bust exports without genuine animated arm joints.
 */
function studioHasRiggedArms(studio: any): boolean {
  const required = [
    'mixamorig:LeftArm', 'mixamorig:LeftForeArm', 'mixamorig:LeftHand',
    'mixamorig:RightArm', 'mixamorig:RightForeArm', 'mixamorig:RightHand',
  ];
  const weightedJoints = new Set<string>();
  studio.traverse((node: any) => {
    if (!node.isSkinnedMesh || !node.skeleton?.bones?.length) return;
    for (const bone of node.skeleton.bones) weightedJoints.add(bone.name);
  });
  return required.every(name => weightedJoints.has(name) && studio.getObjectByName(name));
}

export function poseNexaStudioArms(THREE: any, studio: any): boolean {
  if (!studioHasRiggedArms(studio)) return false;
  relaxBodyPose(THREE, studio);
  return true;
}

/**
 * Studio owns the face, clothing above the seam, AND the complete arms.
 * The older model owns only the lower torso and legs. Remove its arm-skin
 * triangles before cropping to avoid double forearms/hands below the seam.
 * Preserve the remaining skinned mesh (not a static image replacement).
 */
function removeLegacyArmSurfaces(body: any): number {
  let removed = 0;
  body.traverse((mesh: any) => {
    if (!mesh.isSkinnedMesh || !mesh.skeleton?.bones ||
        !mesh.geometry?.attributes?.skinIndex) return;
    const geometry = mesh.geometry;
    const count = geometry.attributes.position?.count ?? 0;
    if (!count) return;
    const jointNames = mesh.skeleton.bones.map((bone: any) => bone.name || '');
    const scores = new Float32Array(count);
    for (let set = 0; set < 3; set++) {
      const suffix = set ? String(set) : '';
      const joints = geometry.getAttribute('skinIndex' + suffix);
      const weights = geometry.getAttribute('skinWeight' + suffix);
      if (!joints || !weights) continue;
      for (let i = 0; i < count; i++) {
        for (let channel = 0; channel < Math.min(4, joints.itemSize, weights.itemSize); channel++) {
          const name = jointNames[joints.getComponent(i, channel)] ?? '';
          if (/(?:Left|Right)(?:Shoulder|Arm|ForeArm|Hand)/i.test(name)) {
            scores[i] += weights.getComponent(i, channel);
          }
        }
      }
    }
    const originalIndex = geometry.index;
    const indexAt = (index: number) => originalIndex ? originalIndex.getX(index) : index;
    const indexCount = originalIndex?.count ?? count;
    const groups = geometry.groups.length ? geometry.groups :
      [{ start: 0, count: indexCount, materialIndex: 0 }];
    const kept: number[] = [];
    const sections: { start: number; count: number; materialIndex: number }[] = [];
    for (const group of groups) {
      const first = kept.length;
      const stop = Math.min(indexCount, group.start + group.count);
      for (let i = group.start; i + 2 < stop; i += 3) {
        const a = indexAt(i), b = indexAt(i + 1), c = indexAt(i + 2);
        const max = Math.max(scores[a], scores[b], scores[c]);
        const avg = (scores[a] + scores[b] + scores[c]) / 3;
        if (max >= 0.48 && avg >= 0.32) {
          removed++;
        } else {
          kept.push(a, b, c);
        }
      }
      if (kept.length > first) {
        sections.push({ start: first, count: kept.length-first, materialIndex: group.materialIndex ?? 0 });
      }
    }
    // Do not turn an unexpected/unweighted mesh invisible.
    if (!removed || !kept.length) return;
    geometry.setIndex(kept);
    geometry.clearGroups();
    for (const group of sections) geometry.addGroup(group.start, group.count, group.materialIndex);
  });
  return removed;
}

/**
 * Keep the original body's articulated upper arms while clipping the duplicate
 * head and chest. A global horizontal clipping plane used to amputate the
 * shoulder region, making the detached hands float beside the Studio bust.
 * Here two complementary clipping planes divide the very same skinned mesh:
 * upper-limb triangles above the seam, original full geometry below it.
 */
function preserveOriginalArms(THREE: any, body: any, upperPlane: any): number {
  const originals: any[] = [];
  body.traverse((object: any) => {
    if (object.isSkinnedMesh && object.geometry?.attributes?.skinIndex &&
        object.geometry?.attributes?.skinWeight && object.skeleton?.bones) {
      originals.push(object);
    }
  });
  let preserved = 0;
  for (const source of originals) {
    const geometry = source.geometry;
    const originalIndex = geometry.index;
    const vertexCount = geometry.attributes.position?.count ?? 0;
    if (!vertexCount) continue;
    const jointNames = source.skeleton.bones.map((b: any) => b.name ?? '');
    const scores = new Float32Array(vertexCount);
    for (let set = 0; set < 3; set++) {
      const suffix = set ? String(set) : '';
      const joints = geometry.getAttribute('skinIndex' + suffix);
      const weights = geometry.getAttribute('skinWeight' + suffix);
      if (!joints || !weights) continue;
      const width = Math.min(4, joints.itemSize, weights.itemSize);
      for (let i = 0; i < vertexCount; i++) {
        for (let channel = 0; channel < width; channel++) {
          const index = joints.getComponent(i, channel);
          const weight = weights.getComponent(i, channel);
          if (weight > 0 && /(?:Left|Right)(?:Shoulder|Arm|ForeArm|Hand)/i.test(jointNames[index] ?? '')) {
            scores[i] += weight;
          }
        }
      }
    }
    const indexAt = (i: number) => originalIndex ? originalIndex.getX(i) : i;
    const indexCount = originalIndex ? originalIndex.count : vertexCount;
    const groups = geometry.groups.length ? geometry.groups :
      [{ start: 0, count: indexCount, materialIndex: 0 }];
    const kept: number[] = [];
    const sections: { start: number; count: number; materialIndex: number }[] = [];
    for (const group of groups) {
      const first = kept.length;
      const stop = Math.min(indexCount, group.start + group.count);
      for (let i = group.start; i + 2 < stop; i += 3) {
        const a = indexAt(i), b = indexAt(i + 1), c = indexAt(i + 2);
        const max = Math.max(scores[a], scores[b], scores[c]);
        const avg = (scores[a] + scores[b] + scores[c]) / 3;
        if (max >= 0.48 && avg >= 0.32) kept.push(a, b, c);
      }
      if (kept.length > first) {
        sections.push({ start: first, count: kept.length - first, materialIndex: group.materialIndex ?? 0 });
      }
    }
    if (!kept.length) continue;
    const segmentGeometry = new THREE.BufferGeometry();
    for (const [name, attribute] of Object.entries(geometry.attributes)) {
      segmentGeometry.setAttribute(name, attribute);
    }
    segmentGeometry.morphAttributes = geometry.morphAttributes;
    segmentGeometry.morphTargetsRelative = geometry.morphTargetsRelative;
    segmentGeometry.setIndex(kept);
    for (const section of sections) {
      segmentGeometry.addGroup(section.start, section.count, section.materialIndex);
    }
    const segment = source.clone(false);
    segment.name = 'Nexa connected shoulders and articulated arms';
    segment.geometry = segmentGeometry;
    const materials = Array.isArray(source.material) ? source.material : [source.material];
    const upperMaterials = materials.map((material: any) => {
      const copy = material.clone();
      copy.clippingPlanes = [upperPlane];
      copy.clipShadows = true;
      copy.side = THREE.DoubleSide;
      copy.needsUpdate = true;
      return copy;
    });
    segment.material = Array.isArray(source.material) ? upperMaterials : upperMaterials[0];
    segment.frustumCulled = false;
    source.parent.add(segment);
    preserved += kept.length / 3;
  }
  if (preserved === 0) {
    console.warn('[Nexa 3D] El modelo no contiene triángulos de brazos identificables');
  }
  return preserved;
}

/** Gently round the existing boots and provide a slim level outsole.
 *  Shoe details use real Three.js meshes, never a 2D overlay.
 */
function finishBoots(THREE: any, body: any, eyeWidth: number, floorY: number): void {
  const ivory = new THREE.MeshStandardMaterial({ color: 0xececf5, metalness: 0.12, roughness: 0.47 });
  const sole = new THREE.MeshStandardMaterial({ color: 0x151421, metalness: 0.09, roughness: 0.66 });
  const geometry = new THREE.SphereGeometry(1, 16, 12);
  const pieces: any[] = [];
  let used = 0;
  body.updateMatrixWorld(true);
  for (const side of ['Left', 'Right']) {
    const ankle = body.getObjectByName('mixamorig:' + side + 'Foot');
    const toe = body.getObjectByName('mixamorig:' + side + 'ToeBase');
    if (!ankle || !toe) continue;
    const heel = ankle.getWorldPosition(new THREE.Vector3());
    const tip = toe.getWorldPosition(new THREE.Vector3());
    const forward = tip.clone().sub(heel);
    forward.y = 0;
    const reach = forward.length();
    if (!Number.isFinite(reach) || reach < eyeWidth * 0.18 || reach > eyeWidth * 2.7) continue;
    forward.normalize();
    const centerWorld = tip.clone().addScaledVector(forward, -reach * 0.19);
    const y = floorY + eyeWidth * 0.07;
    const angle = Math.atan2(forward.x, forward.z);
    const group = new THREE.Group();
    group.name = 'Nexa rounded ' + side + ' boot tip';
    centerWorld.y = y;
    group.position.copy(body.worldToLocal(centerWorld));
    group.rotation.y = angle;
    const toeCap = new THREE.Mesh(geometry, ivory);
    toeCap.scale.set(eyeWidth * 0.27, eyeWidth * 0.10, eyeWidth * 0.34);
    toeCap.position.y = eyeWidth * 0.028;
    const outsole = new THREE.Mesh(geometry, sole);
    outsole.scale.set(eyeWidth * 0.29, eyeWidth * 0.038, eyeWidth * 0.37);
    outsole.position.y = -eyeWidth * 0.04;
    group.add(toeCap, outsole);
    body.add(group);
    pieces.push(group);
    used++;
  }
  if (!used) {
    geometry.dispose();
    ivory.dispose();
    sole.dispose();
  } else {
    // A single resource set shared by both toe pieces: dispose with the body.
    pieces[0].userData.nexaBootResources = { geometry, ivory, sole };
  }
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
  // Bring the lower suit gently into the open underside of the original Studio
  // bust. The face and bust are never translated, scaled or replaced.
  body.position.y += (new THREE.Box3().setFromObject(studio).getSize(new THREE.Vector3()).y) * 0.032;
  body.updateMatrixWorld(true);
  relaxBodyPose(THREE, body);
  const studioOwnsArms = studioHasRiggedArms(studio);
  if (studioOwnsArms) removeLegacyArmSurfaces(body);
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
  // Three.js discards the NEGATIVE half-space of a clipping plane.
  // Therefore the normal MUST point downward: discard y > seamY (the
  // duplicate face/chest) and preserve y <= seamY (hips, legs, feet).
  // The previous upward normal hid precisely the part we needed to keep.
  const plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), seamY);
  if (plane.distanceToPoint(new THREE.Vector3(0, seamY - studioHeight * 0.1, 0)) <= 0 ||
      plane.distanceToPoint(new THREE.Vector3(0, seamY + studioHeight * 0.1, 0)) >= 0) {
    throw new Error('El recorte 3D está invertido: ocultaría las piernas de Nexa');
  }
  if (lower.min.y >= seamY - studioHeight * 0.2) {
    throw new Error('El cuerpo importado no tiene geometría suficiente bajo el busto');
  }
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

  const upperArmsPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -seamY);
  if (!studioOwnsArms) preserveOriginalArms(THREE, body, upperArmsPlane);
  finishBoots(THREE, body, studioEyes.width, lower.min.y);

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
        if (object.userData?.nexaBootResources) {
          const resources = object.userData.nexaBootResources;
          resources.geometry.dispose();
          resources.ivory.dispose();
          resources.sole.dispose();
        }
        if (!object.isMesh) return;
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials) material?.dispose?.();
        // Boot-cap meshes share a single geometry and material set disposed above.
        if (!object.parent?.name?.includes('boot tip')) object.geometry?.dispose?.();
      });
      body.removeFromParent();
    },
  };
}
