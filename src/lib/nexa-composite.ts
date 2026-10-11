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
function relaxBodyPose(THREE: any, body: any, studioArms = false): void {
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
    // The approved Studio sleeves were built around an open arm pose.
    // Dropping them to the thighs pulls incorrectly weighted sleeve patches
    // through the bust. Keep Studio near the reference A/T pose; the separate
    // legacy body (hidden above the waist) can rest its arms at its sides.
    rotateToward(shoulder, elbow,
      studioArms
        ? new THREE.Vector3(sideSign, -0.16, 0.015)
        : new THREE.Vector3(sideSign * 0.22, -1, 0.025),
      studioArms ? 0.30 : 1.55);
    rotateToward(elbow, wrist,
      studioArms
        ? new THREE.Vector3(sideSign, -0.13, 0.015)
        : new THREE.Vector3(sideSign * 0.07, -1, 0.065),
      studioArms ? 0.25 : 1.20);
  }
  if (studioArms) return; // No Studio legs or shoes to correct.
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

/**
 * Meshy's Studio export gives part of the sleeves weights on the otherwise
 * invisible LEG bones (and Bone_009/Bone_007). Rotating Arm alone therefore
 * leaves large sleeve patches stretched in their original horizontal pose.
 * Reassign ONLY geometrically identified sleeve vertices to their own arm
 * bones. Neck, face and the approved central chest keep their original skin.
 */
function repairStudioSleeveWeights(studio: any): number {
  if (studio.userData.nexaSleeveWeightsRepaired) return 0;
  let repaired = 0;
  studio.traverse((mesh: any) => {
    if (!mesh.isSkinnedMesh || !mesh.skeleton?.bones?.length) return;
    const geometry = mesh.geometry;
    const points = geometry?.getAttribute('position');
    const joints = geometry?.getAttribute('skinIndex');
    const weights = geometry?.getAttribute('skinWeight');
    if (!points || !joints || !weights || joints.itemSize < 4 || weights.itemSize < 4) return;
    geometry.computeBoundingBox();
    const limits = geometry.boundingBox;
    const cx = (limits.min.x + limits.max.x) / 2;
    const halfWidth = Math.max(0.01,(limits.max.x-limits.min.x)/2);
    const fullHeight = Math.max(0.01,limits.max.y-limits.min.y);
    const boneNames = mesh.skeleton.bones.map((b: any) => b.name ?? '');
    const byName = new Map<string,number>();
    boneNames.forEach((name: string,i: number) => byName.set(name,i));
    for (let i=0; i<points.count; i++) {
      const sideCoordinate = (points.getX(i)-cx)/halfWidth;
      const extension = Math.abs(sideCoordinate);
      const height = (points.getY(i)-limits.min.y)/fullHeight;
      // Meshy's shoulder/sleeve vertices sit ABOVE the middle of the bust.
      // Cutting off y>46% omitted precisely the patches visible on Android.
      // Restrict the fix to outer limbs, away from the face, cap and chest.
      if (extension < 0.57 || height > 0.79 || height < 0.12) continue;
      const side = sideCoordinate > 0 ? 'Left' : 'Right';
      const entries: {id:number;weight:number}[] = [];
      let activeArm=0;
      for (let k=0;k<4;k++) {
        const id=joints.getComponent(i,k);
        const weight=weights.getComponent(i,k);
        const name=boneNames[id]||'';
        if (name.startsWith('mixamorig:'+side) &&
            /(?:Shoulder|Arm|ForeArm|Hand)$/.test(name)) activeArm += weight;
        if (weight>0) entries.push({id,weight});
      }
      // A waist vertex close to the outer contour is not a sleeve unless it
      // already has some arm influence or is well beyond the rib cage.
      if (activeArm < 0.065 && extension < 0.82) continue;
      // The sleeves extend horizontally: choose their joint by distance
      // along the arm, NOT by height (which changes when Nexa moves).
      const target = 'mixamorig:'+side+
        (extension < 0.70 ? 'Arm' : extension < 0.89 ? 'ForeArm' : 'Hand');
      const targetId = byName.get(target);
      if (targetId === undefined) continue;
      const merged = new Map<number,number>();
      let changed = false;
      for (const entry of entries) {
        const name = boneNames[entry.id]||'';
        const wrongLeg = name.startsWith('mixamorig:'+side) &&
          /(?:UpLeg|Leg|Foot|ToeBase|Toe_End)$/.test(name);
        const wrongAux = side==='Left'?name==='Bone_009':name==='Bone_007';
        const id = (wrongLeg||wrongAux) ? targetId : entry.id;
        if (id!==entry.id) changed = true;
        merged.set(id,(merged.get(id)||0)+entry.weight);
      }
      if (!changed) continue;
      const pairs = [...merged.entries()].sort((a,b)=>b[1]-a[1]).slice(0,4);
      const sum = pairs.reduce((n,p)=>n+p[1],0)||1;
      while (pairs.length < 4) pairs.push([targetId,0]);
      joints.setXYZW(i,pairs[0][0],pairs[1][0],pairs[2][0],pairs[3][0]);
      weights.setXYZW(i,pairs[0][1]/sum,pairs[1][1]/sum,pairs[2][1]/sum,pairs[3][1]/sum);
      repaired++;
    }
    if (repaired) { joints.needsUpdate = true; weights.needsUpdate = true; }
  });
  studio.userData.nexaSleeveWeightsRepaired = true;
  return repaired;
}

/**
 * Ajuste localizado en los dos faldones laterales del busto aprobado.
 *
 * El Meshy Studio tiene una sola malla para cara, mangas y pecho; escalar
 * todo el modelo encogería también el rostro y los logos. En vez de hacerlo,
 * cambiamos únicamente los vértices de los costados BAJOS del torso,
 * conservando las coordenadas de ojos, cuello, hombros y manos externas.
 *
 * La máscara espacial es continua (smoothstep) tanto vertical como
 * horizontalmente para evitar un nuevo pliegue visible al girar en 3D.
 */
export function tailorNexaStudioLowerTorso(studio: any): number {
  if (studio.userData.nexaLowerTorsoTailored) return 0;
  const smoothstep = (low: number, high: number, value: number): number => {
    const t = Math.max(0, Math.min(1, (value-low)/(high-low)));
    return t*t*(3-2*t);
  };
  let changed = 0;
  studio.traverse((mesh: any) => {
    if (!mesh.isSkinnedMesh || !mesh.geometry?.attributes?.position) return;
    const geometry = mesh.geometry;
    const positions = geometry.getAttribute('position');
    geometry.computeBoundingBox();
    const bounds = geometry.boundingBox;
    const height = bounds.max.y-bounds.min.y;
    const centerX = (bounds.min.x+bounds.max.x)/2;
    const halfWidth = (bounds.max.x-bounds.min.x)/2;
    if (height < 0.15 || halfWidth < 0.07) return;
    let modified = false;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const normalizedY = (y-bounds.min.y)/height;
      const radial = Math.abs(x-centerX)/halfWidth;
      // The chest insignia, breasts and shoulders remain completely untouched
      // above y=45%; only the lower side panels taper toward the waist.
      if (normalizedY >= 0.45 || radial <= 0.23 || radial >= 0.94) continue;
      const vertical = 1-smoothstep(0.12,0.45,normalizedY);
      // Do not pull the far end of either arm inward. The correction fades
      // smoothly before reaching wrists, forearms and fingertips.
      const sides = smoothstep(0.23,0.47,radial)*
        (1-smoothstep(0.76,0.94,radial));
      const influence = vertical*sides;
      if (influence < 0.0001) continue;
      // More pronounced, gradual taper of the two LOWER flaps only.
      // The approved face, central bust, emblems and shoulders are untouched.
      positions.setX(i, centerX+(x-centerX)*(1-0.23*influence));
      changed++;
      modified = true;
    }
    if (modified) {
      positions.needsUpdate = true;
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
    }
  });
  studio.userData.nexaLowerTorsoTailored = true;
  if (changed) console.info('[Nexa 3D] Laterales inferiores del busto suavizados:', changed);
  return changed;
}

/**
 * Remove the two angular pieces marked orange and the disconnected
 * horizontal band marked blue in the Studio model. The source is ONE
 * textured skinned mesh, so we must remove indexed triangles selectively,
 * not hide the entire shoulder or repaint the face.
 *
 * All coordinates are normalized to the imported Studio geometry; the
 * unchanged face, shoulder N emblem and real arm-weighted triangles are
 * protected. The missing low center is rebuilt by tailoredWaistPanel.
 */
export function removeNexaStudioSidePanels(studio: any): number {
  if (studio.userData.nexaSidePanelsRemoved) return 0;
  let removed = 0;
  studio.traverse((mesh: any) => {
    if (!mesh.isSkinnedMesh || !mesh.geometry?.attributes?.position ||
        !mesh.geometry?.attributes?.skinIndex) return;
    const geometry = mesh.geometry;
    const positions = geometry.getAttribute('position');
    const indices = geometry.index;
    const joints = geometry.getAttribute('skinIndex');
    const weights = geometry.getAttribute('skinWeight');
    const bones = mesh.skeleton?.bones?.map((b: any) => b.name ?? '') ?? [];
    if (!indices || !joints || !weights || !bones.length) return;
    geometry.computeBoundingBox();
    const bbox = geometry.boundingBox;
    const h = bbox.max.y-bbox.min.y;
    const halfWidth = (bbox.max.x-bbox.min.x)*0.5;
    const cx = (bbox.max.x+bbox.min.x)*0.5;
    if (h<0.2 || halfWidth<0.09) return;
    const arm = new Float32Array(positions.count);
    for (let i=0; i<positions.count; i++) {
      for (let k=0;k<Math.min(4,joints.itemSize,weights.itemSize);k++) {
        if (/(?:Left|Right)(?:Shoulder|Arm|ForeArm|Hand)/i.test(
          bones[joints.getComponent(i,k)] ?? '')) {
          arm[i] += weights.getComponent(i,k);
        }
      }
    }
    const groups = geometry.groups.length ? geometry.groups :
      [{start:0,count:indices.count,materialIndex:0}];
    const keep: number[] = [];
    const savedGroups: {start:number;count:number;materialIndex:number}[] = [];
    let cut = 0;
    for (const group of groups) {
      const start = keep.length;
      const end = Math.min(indices.count, group.start+group.count);
      for (let i=group.start; i+2<end; i+=3) {
        const a=indices.getX(i), b=indices.getX(i+1), c=indices.getX(i+2);
        const y=(positions.getY(a)+positions.getY(b)+positions.getY(c))/3;
        const x=(positions.getX(a)+positions.getX(b)+positions.getX(c))/3;
        const ny=(y-bbox.min.y)/h;
        const radial=Math.abs(x-cx)/halfWidth;
        const armMax=Math.max(arm[a],arm[b],arm[c]);
        const armAvg=(arm[a]+arm[b]+arm[c])/3;
        // The collar, N badge, actual sleeves and face are NEVER in this
        // lower decorative region. Keep arm-influenced triangles intact.
        const decorativeWing = ny<0.34 && ny>0.035 &&
          radial>0.24 && radial<0.57 && armMax<0.38 && armAvg<0.23;
        // Remove only the disconnected under-bust shelf, not the breasts.
        const flatLowerShelf = ny<0.105 && radial<0.33 &&
          armMax<0.38 && armAvg<0.20;
        if (decorativeWing || flatLowerShelf) cut++;
        else keep.push(a,b,c);
      }
      if (keep.length>start) savedGroups.push({
        start,count:keep.length-start,materialIndex:group.materialIndex??0,
      });
    }
    if (!cut || !keep.length) return;
    geometry.setIndex(keep);
    geometry.clearGroups();
    for(const g of savedGroups) geometry.addGroup(g.start,g.count,g.materialIndex);
    geometry.computeBoundingSphere();
    removed+=cut;
  });
  studio.userData.nexaSidePanelsRemoved=true;
  if (removed) console.info('[Nexa 3D] Piezas naranjas y barra central retiradas:', removed);
  return removed;
}

export function poseNexaStudioArms(THREE: any, studio: any): boolean {
  if (!studioHasRiggedArms(studio)) return false;
  const repaired = repairStudioSleeveWeights(studio);
  if (repaired) console.info('[Nexa 3D] Reasignados pesos de las mangas:', repaired);
  // Meshy's baked shoulder panels do not follow the same rig weights as its
  // skin. Even a small post-import rotation separates their seams and gives
  // the appearance of TWO arms. Keep the approved original Studio bind pose;
  // the face has its own independent rig and continues to animate.
  studio.updateMatrixWorld(true);
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
    let removedHere = 0;
    for (const group of groups) {
      const first = kept.length;
      const stop = Math.min(indexCount, group.start + group.count);
      for (let i = group.start; i + 2 < stop; i += 3) {
        const a = indexAt(i), b = indexAt(i + 1), c = indexAt(i + 2);
        const max = Math.max(scores[a], scores[b], scores[c]);
        const avg = (scores[a] + scores[b] + scores[c]) / 3;
        // Eliminate seam fragments as well as the limb core. Previously the
        // strict threshold left detached legacy sleeve triangles on display.
        if (max >= 0.24 && avg >= 0.14) {
          removedHere++;
        } else {
          kept.push(a, b, c);
        }
      }
      if (kept.length > first) {
        sections.push({ start: first, count: kept.length-first, materialIndex: group.materialIndex ?? 0 });
      }
    }
    if (!removedHere) return;
    removed += removedHere;
    // A standalone arm mesh may contain no torso triangles at all. Clearing
    // its indices is essential: leaving it intact would draw duplicate arms.
    if (!kept.length) {
      geometry.setIndex([]);
      geometry.clearGroups();
      return;
    }
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
 * Find the bottom of the CENTRAL Studio torso rather than the lowest hand.
 * The GLB was exported as a bust with sleeves, and its Box3.min.y can belong
 * to fingertips. A finger-driven seam is exactly what produced the floating
 * rectangular chest and a band underneath it.
 *
 * The 2nd percentile resists isolated cape/sleeve vertices without changing
 * any source geometry. The native eye distance gives a stable scale on both
 * mobile and desktop, independent of the two GLB source units.
 */
export function studioTorsoBottomY(THREE: any, studio: any, eye: Landmark, bounds: any): number {
  studio.updateMatrixWorld(true);
  const ys: number[] = [];
  const v = new THREE.Vector3();
  const torsoRadius = eye.width * 2.05;
  const maxY = eye.center.y - eye.width * 0.45;
  studio.traverse((mesh: any) => {
    if (!mesh.isSkinnedMesh || !mesh.geometry?.attributes?.position) return;
    const position = mesh.geometry.attributes.position;
    const step = Math.max(1, Math.floor(position.count / 30000));
    for (let i=0; i<position.count; i+=step) {
      v.fromBufferAttribute(position,i);
      if (typeof mesh.applyBoneTransform === 'function') mesh.applyBoneTransform(i,v);
      mesh.localToWorld(v);
      if (Math.abs(v.x-eye.center.x) <= torsoRadius && v.y < maxY &&
          Number.isFinite(v.y)) ys.push(v.y);
    }
  });
  if (ys.length < 30) return bounds.min.y;
  ys.sort((a,b) => a-b);
  const estimate = ys[Math.floor((ys.length-1)*0.02)];
  const h = bounds.max.y - bounds.min.y;
  // Keep the join safely in the lower quarter of the approved bust.
  return Math.max(bounds.min.y,Math.min(bounds.min.y+h*0.27,estimate));
}

/**
 * Connect the original Studio bust edge to the older model's waist with a
 * short real 3D suit panel. Two hard mesh cuts stacked on top of each other
 * cannot be seamless: this samples torso-only skinned vertices on both sides,
 * and makes one continuous tapered surface between their actual 3D contours.
 * If either profile cannot be measured, retain the previous safe join.
 */
function torsoSection(THREE: any, root: any, y: number, band: number): any | null {
  root.updateMatrixWorld(true);
  const vertex = new THREE.Vector3();
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  let found = 0;
  root.traverse((mesh: any) => {
    if (!mesh.isSkinnedMesh || !mesh.geometry?.attributes?.position) return;
    const geometry = mesh.geometry;
    const position = geometry.attributes.position;
    const joints = geometry.getAttribute('skinIndex');
    const weights = geometry.getAttribute('skinWeight');
    const names = mesh.skeleton?.bones?.map((bone: any) => bone.name ?? '') ?? [];
    // Exclude vertices controlled by hands and arms: only the torso boundary
    // is useful here, even when Studio's hands have already been lowered.
    const live = geometry.index ? new Uint8Array(position.count) : null;
    if (live) {
      for (let i = 0; i < geometry.index.count; i++) live[geometry.index.getX(i)] = 1;
    }
    const step = Math.max(1, Math.floor(position.count / 40000));
    for (let i = 0; i < position.count; i += step) {
      if (live && !live[i]) continue;
      if (joints && weights) {
        let armWeight = 0;
        for (let k = 0; k < Math.min(4, joints.itemSize, weights.itemSize); k++) {
          if (/(?:Left|Right)(?:Shoulder|Arm|ForeArm|Hand)/i.test(
            names[joints.getComponent(i, k)] ?? '')) {
            armWeight += weights.getComponent(i, k);
          }
        }
        if (armWeight > 0.28) continue;
      }
      vertex.fromBufferAttribute(position, i);
      mesh.applyBoneTransform(i, vertex);
      mesh.localToWorld(vertex);
      if (Math.abs(vertex.y - y) > band) continue;
      minX = Math.min(minX, vertex.x);
      maxX = Math.max(maxX, vertex.x);
      minZ = Math.min(minZ, vertex.z);
      maxZ = Math.max(maxZ, vertex.z);
      found++;
    }
  });
  if (found < 12 || maxX-minX < 0.04 || maxZ-minZ < 0.025) return null;
  return {
    x: (minX + maxX) * 0.5,
    z: (minZ + maxZ) * 0.5,
    rx: (maxX-minX) * 0.5,
    rz: (maxZ-minZ) * 0.5,
  };
}

function tailoredWaistPanel(
  THREE: any, studio: any, body: any, upperMinY: number, height: number,
  lowerCutY: number,
): any | null {
  // Reach above the cut shelf to cover the blue marked chest/abdomen gap.
  // Stop below the N emblem and preserve the original bust silhouette.
  const topY = upperMinY + height * 0.18;
  const bottomY = lowerCutY - height * 0.025;
  // A narrow slice can contain too few vertices in the exported low-poly
  // suit. Sample progressively wider bands before giving up on the join.
  const upper = torsoSection(THREE, studio, topY, height * 0.055) ??
    torsoSection(THREE, studio, topY + height * 0.028, height * 0.09);
  const lower = torsoSection(THREE, body, bottomY, height * 0.055) ??
    torsoSection(THREE, body, bottomY - height * 0.025, height * 0.09);
  if (!upper || !lower ||
      upper.rx / lower.rx > 3.25 || lower.rx / upper.rx > 3.0 ||
      upper.rz / lower.rz > 3.25 || lower.rz / upper.rz > 3.0) return null;

  const segments = 32;
  const rings = 7;
  const vertices: number[] = [];
  const colors: number[] = [];
  const triangles: number[] = [];
  const dark = new THREE.Color(0x171822);
  const pearl = new THREE.Color(0xd6d9e7);
  const color = new THREE.Color();
  body.updateMatrixWorld(true);
  for (let row = 0; row <= rings; row++) {
    const t = row/rings;
    const ease = t*t*(3-2*t);
    const y = topY + (bottomY-topY)*t;
    const cx = upper.x+(lower.x-upper.x)*ease;
    const cz = upper.z+(lower.z-upper.z)*ease;
    const swell = 1 + 0.025*Math.sin(Math.PI*t);
    const rx = (upper.rx+(lower.rx-upper.rx)*ease)*swell;
    const rz = (upper.rz+(lower.rz-upper.rz)*ease)*swell;
    for (let i = 0; i <= segments; i++) {
      const angle = 2*Math.PI*i/segments;
      const x = cx + Math.sin(angle)*rx;
      // A gentle forward bulge makes the light ceramic breastplate cover
      // the old horizontal cut in front, without an added floating slab.
      const front = Math.cos(angle);
      const z = cz + Math.cos(angle)*rz +
        Math.max(0,front) * height * 0.016 * Math.sin(Math.PI*t);
      // The panel is part of the same real 3D scene, not a screen overlay.
      const local = body.worldToLocal(new THREE.Vector3(x,y,z));
      vertices.push(local.x,local.y,local.z);
      const side = Math.abs(Math.sin(angle));
      // Broad PEARL centre plate with black side panels. Unlike the
      // previous black strip, this reads as a continuous white Nexo bust.
      const frontBlend = Math.max(0, Math.min(1, (front-0.07)/0.51));
      const softFront = frontBlend*frontBlend*(3-2*frontBlend);
      const zipper = side<0.055 && t<0.34 ? 0.28 : 1;
      color.copy(dark).lerp(pearl,softFront*(0.94-0.04*t)*zipper);
      colors.push(color.r,color.g,color.b);
    }
  }
  for (let j = 0; j < rings; j++) {
    for (let i = 0; i < segments; i++) {
      const a=j*(segments+1)+i;
      const b=a+1;
      const c=a+(segments+1);
      const d=c+1;
      triangles.push(a,b,c,b,d,c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setIndex(triangles);
  geometry.computeVertexNormals();
  const material = new THREE.MeshStandardMaterial({
    vertexColors:true,roughness:0.55,metalness:0.08,side:THREE.DoubleSide,
  });
  const panel = new THREE.Mesh(geometry,material);
  panel.name = 'Nexa continuous 3D tapered waist';
  panel.frustumCulled = false;
  return panel;
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
  // The Studio arms may extend below the original cropped chest when posed.
  // Use the pre-pose bust bounds so the join follows the true chest edge,
  // rather than the position of the hands.
  const upper = studio.userData?.nexaBustOriginalBounds?.clone?.() ??
    new THREE.Box3().setFromObject(studio);
  const lower = new THREE.Box3().setFromObject(body);
  const studioHeight = upper.max.y - upper.min.y;
  const bodyHeight = lower.max.y - lower.min.y;
  const torsoBottom = studioTorsoBottomY(THREE, studio, studioEyes, upper);
  if (studioHeight < 0.15 || bodyHeight < studioHeight * 1.25 ||
      lower.min.y > upper.min.y || lower.max.y < upper.max.y - studioHeight * 0.3) {
    throw new Error('No se pudo ajustar el cuerpo sin deformar el torso Studio');
  }

  // Everything above the join belongs exclusively to Studio. The original
  // body face, cap, upper bust, and hair are not rendered at all.
  // A measured connector replaces the visible flat cut between two
  // differently shaped torsos. Keep the original safe cut if no torso profile.
  const candidateCut = torsoBottom - studioHeight * 0.10;
  const waistPanel = tailoredWaistPanel(
    THREE, studio, body, torsoBottom, studioHeight, candidateCut,
  );
  // Never let the older bust rise into Studio when profile measurement
  // fails. Match the actual lower chest instead of low-hanging fingers.
  const seamY = waistPanel
    ? candidateCut
    : torsoBottom - Math.max(0.002, studioHeight * 0.012);
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
  if (waistPanel) body.add(waistPanel);

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
