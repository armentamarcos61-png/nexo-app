/**
 * Procedural facial motion for the one existing Nexa GLB.
 *
 * Meshy exported 68 body joints and zero facial blendshapes. We create small
 * morph targets on the skinned head surface at load-time so mouth, lids and
 * brows can respond without another downloaded character.
 *
 * These are approximate facial deformations, NOT phoneme-level lip sync.
 * A dedicated face rig would be required for exact speech articulation.
 */
export type NexaFaceRig = {
  update: (dt: number, seconds: number, speaking: boolean) => void;
  available: boolean;
};

type MorphHandle = { mesh: any; ids: { mouth: number; left: number; right: number; brow: number } };

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const radial = (x: number, y: number, z: number, cx: number, cy: number, cz: number, rx: number, ry: number, rz: number) => {
  const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2;
  return Math.exp(-d * 1.65);
};

export function installNexaFaceRig(THREE: any, root: any): NexaFaceRig {
  const handles: MorphHandle[] = [];
  let head: any = null;
  root.traverse?.((node: any) => {
    if (/mixamorig:Head$/i.test(node.name ?? '')) head = node;
    if (!node.isSkinnedMesh) return;
    const geometry = node.geometry;
    const position = geometry?.getAttribute('position');
    const indices = geometry?.getAttribute('skinIndex');
    const weights = geometry?.getAttribute('skinWeight');
    if (!position || !indices || !weights) return;

    const headIndex = node.skeleton?.bones?.findIndex((bone: any) => /mixamorig:Head$/i.test(bone.name));
    if (headIndex === undefined || headIndex < 0) return;

    const count = position.count;
    const offsets: Record<'mouth'|'left'|'right'|'brow', Float32Array> = {
      mouth: new Float32Array(count * 3),
      left: new Float32Array(count * 3),
      right: new Float32Array(count * 3),
      brow: new Float32Array(count * 3),
    };
    let affected = 0;

    for (let i = 0; i < count; i++) {
      const x = position.getX(i);
      const y = position.getY(i);
      const z = position.getZ(i);
      if (y < 1.47 || y > 1.69 || z < 0.072 || Math.abs(x) > 0.085) continue;
      let headWeight = 0;
      for (let k = 0; k < 4; k++) {
        if (indices.getComponent(i, k) === headIndex) headWeight += weights.getComponent(i, k);
      }
      if (headWeight < 0.4) continue;
      const front = clamp01((z - 0.073) / 0.043) * headWeight;

      // Subtle vertical mouth opening, localized to lip region.
      const mouth = radial(x,y,z,0,1.507,0.126,0.041,0.026,0.075) * front;
      const upperOrLower = y < 1.507 ? -1 : 0.38;
      offsets.mouth[i * 3 + 1] = mouth * upperOrLower * 0.009;
      offsets.mouth[i * 3 + 2] = mouth * 0.003;

      // Close eyelids towards each eye center, instead of distorting the skull.
      for (const [key, ex] of [['left',-0.035],['right',0.035]] as const) {
        const eye = radial(x,y,z,ex,1.590,0.123,0.026,0.023,0.080) * front;
        offsets[key][i * 3 + 1] = eye * (1.590 - y) * 0.74;
        offsets[key][i * 3 + 2] = eye * 0.001;
      }

      const eyebrow = (
        radial(x,y,z,-0.037,1.625,0.126,0.030,0.018,0.075) +
        radial(x,y,z,0.037,1.625,0.126,0.030,0.018,0.075)
      ) * front;
      offsets.brow[i * 3 + 1] = eyebrow * 0.007;
      if (mouth > 0.15 || eyebrow > 0.15) affected++;
    }

    if (affected < 12) return;
    geometry.morphTargetsRelative = true;
    const target = geometry.morphAttributes.position ?? [];
    const start = target.length;
    for (const [name, arr] of Object.entries(offsets)) {
      const a = new THREE.Float32BufferAttribute(arr, 3);
      a.name = 'nexa_' + name;
      target.push(a);
    }
    geometry.morphAttributes.position = target;
    // Rebuild morph influence indices once after adding new GPU blendshapes.
    node.updateMorphTargets();
    handles.push({
      mesh: node,
      ids: { mouth:start, left:start+1, right:start+2, brow:start+3 },
    });
  });

  let mouthValue = 0;
  let browValue = 0;
  let blinkAt = 2.3;
  let blinkProgress = -1;

  return {
    available: handles.length > 0,
    update(dt: number, seconds: number, speaking: boolean) {
      const t = Math.min(dt * 12, 1);
      // Generated from the voice-active signal, not the actual audio waveform.
      const syllables = speaking
        ? clamp01(0.15 + 0.55 * Math.abs(Math.sin(seconds * 9.8)) + 0.35 * Math.abs(Math.sin(seconds * 14.1 + 1.3)))
        : 0;
      mouthValue = lerp(mouthValue, syllables, t);
      browValue = lerp(browValue, speaking ? 0.35 + 0.35 * Math.sin(seconds * 1.5) ** 2 : 0.10 + 0.08 * Math.sin(seconds * 0.8) ** 2, Math.min(dt * 3.2, 1));

      if (blinkProgress < 0 && seconds >= blinkAt) blinkProgress = 0;
      let blink = 0;
      if (blinkProgress >= 0) {
        blinkProgress += dt / 0.22;
        blink = Math.sin(Math.PI * Math.min(1, blinkProgress));
        if (blinkProgress >= 1) {
          blinkProgress = -1;
          blinkAt = seconds + 2.4 + Math.random() * 2.4;
        }
      }

      for (const { mesh, ids } of handles) {
        const influences = mesh.morphTargetInfluences;
        if (!influences) continue;
        influences[ids.mouth] = mouthValue;
        influences[ids.left] = blink;
        influences[ids.right] = blink * 0.96;
        influences[ids.brow] = browValue;
      }

      // Head motions piggyback on mixer-driven head bone, not the entire body.
      // The mixer restores the animated quaternion on the next frame.
      if (head) {
        const nod = Math.sin(seconds * (speaking ? 1.8 : 0.72)) * (speaking ? 0.021 : 0.010);
        const look = Math.sin(seconds * 0.41) * 0.027;
        head.rotation.x += nod;
        head.rotation.y += look;
      }
    },
  };
}
