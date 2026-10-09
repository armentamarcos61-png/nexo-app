/**
 * Drives the *real* blendshapes embedded in Nexa_FacialRig_Pro.glb.
 *
 * These morphs are part of the single 3D character, not overlays or images.
 * The current TTS interface only provides a speaking on/off signal; exact
 * phoneme lip-sync will require waveform/phoneme timestamps in the future.
 */
export interface NexaFaceRig {
  available: boolean;
  update(dt: number, seconds: number, speaking: boolean): void;
}

type FaceChannel =
  | 'MouthOpen' | 'MouthO' | 'MouthWide' | 'MouthSmile'
  | 'EyeBlinkLeft' | 'EyeBlinkRight'
  | 'BrowRaiseLeft' | 'BrowRaiseRight' | 'BrowFrown';

const REQUIRED: FaceChannel[] = [
  'MouthOpen', 'MouthO', 'MouthWide', 'MouthSmile',
  'EyeBlinkLeft', 'EyeBlinkRight',
  'BrowRaiseLeft', 'BrowRaiseRight', 'BrowFrown',
];

type BoundMesh = {
  influences: number[];
  channels: Record<FaceChannel, number>;
};

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const approach = (a: number, b: number, dt: number, speed: number) =>
  a + (b - a) * (1 - Math.exp(-dt * speed));

export function installNexaFaceRig(_THREE: any, root: any): NexaFaceRig {
  const bound: BoundMesh[] = [];
  let headBone: any = null;
  root.traverse?.((node: any) => {
    if (/mixamorig:Head$/i.test(node.name ?? '')) headBone = node;
    if (!node.isSkinnedMesh || !node.morphTargetDictionary || !node.morphTargetInfluences) return;
    const dictionary: Record<string, number> = node.morphTargetDictionary;
    if (!REQUIRED.every(name => Number.isInteger(dictionary[name]))) return;
    bound.push({
      influences: node.morphTargetInfluences,
      channels: Object.fromEntries(REQUIRED.map(name => [name, dictionary[name]])) as Record<FaceChannel, number>,
    });
  });

  const weights: Record<FaceChannel, number> = {
    MouthOpen: 0, MouthO: 0, MouthWide: 0, MouthSmile: 0.1,
    EyeBlinkLeft: 0, EyeBlinkRight: 0,
    BrowRaiseLeft: 0.1, BrowRaiseRight: 0.1, BrowFrown: 0,
  };
  let nextBlink = 2.2;
  let blinkStart = -1;
  let phase = 0;
  let mouthHold = 0;
  let mouthGoal = 0;

  return {
    available: bound.length > 0,
    update(dt: number, seconds: number, speaking: boolean) {
      if (dt <= 0 || bound.length === 0) return;
      // Realistic, restrained face animation. A spoken word contains brief
      // closures; never combine multiple full-strength mouth shapes.
      const s = (channel: FaceChannel, goal: number, speed = 10) => {
        weights[channel] = clamp(approach(weights[channel], goal, dt, speed), 0, 1);
      };
      if (speaking) {
        phase += dt;
        mouthHold -= dt;
        if (mouthHold <= 0) {
          mouthHold = 0.09 + Math.random() * 0.12;
          // Many phonemes close the lips altogether.
          mouthGoal = Math.random() < 0.25 ? 0.0 : 0.12 + Math.random() * 0.31;
        }
      } else {
        phase = 0;
        mouthGoal = 0;
        mouthHold = 0;
      }
      // A maximum 0.43 multiplier applied to a max ~3mm lip shape ensures
      // no circular gaping hole or distorting chin.
      s('MouthOpen', mouthGoal, speaking ? 15 : 12);
      s('MouthO', speaking ? Math.min(0.12, mouthGoal * 0.22) : 0, 9);
      s('MouthWide', speaking ? Math.min(0.11, mouthGoal * 0.20) : 0, 9);
      s('MouthSmile', speaking ? 0.055 : 0.11, 2.5);

      if (blinkStart < 0 && seconds >= nextBlink) blinkStart = seconds;
      let blink = 0;
      if (blinkStart >= 0) {
        const fraction = (seconds - blinkStart) / 0.22;
        blink = Math.sin(Math.PI * clamp(fraction, 0, 1));
        if (fraction >= 1) {
          blinkStart = -1;
          nextBlink = seconds + 2.3 + Math.random() * 3.1;
        }
      }
      s('EyeBlinkLeft', blink, 38);
      s('EyeBlinkRight', blink * 0.98, 38);
      const brow = speaking ? 0.08 + 0.09 * Math.pow(Math.sin(seconds * 0.85), 2) : 0.07;
      s('BrowRaiseLeft', brow, 3.1);
      s('BrowRaiseRight', brow * 0.96, 3.1);
      s('BrowFrown', 0, 3.8);

      for (const mesh of bound) {
        for (const name of REQUIRED) mesh.influences[mesh.channels[name]] = weights[name];
      }

      if (headBone) {
        // Small additive nod; no stiff repeated tilting during speech.
        headBone.rotation.x += Math.sin(seconds * (speaking ? 1.1 : 0.43)) * (speaking ? 0.006 : 0.003);
        headBone.rotation.y += Math.sin(seconds * 0.26) * 0.007;
      }
    },
  };
}
