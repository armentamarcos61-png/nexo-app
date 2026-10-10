/**
 * Drives the *real* blendshapes embedded in Nexa_FacialRig_V2.glb.
 *
 * These morphs are part of the single 3D character, not overlays or images.
 * The current TTS interface only provides a speaking on/off signal; exact
 * phoneme lip-sync will require waveform/phoneme timestamps in the future.
 */
export interface NexaFaceRig {
  available: boolean;
  beforeUpdate(): void;
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
  root.traverse?.((node: any) => {
    if ((!node.isSkinnedMesh && !node.isMesh) || !node.morphTargetDictionary || !node.morphTargetInfluences) return;
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
  let nextBlink = 0.9;
  let blinkStart = -1;
  let mouthHold = 0;
  let mouthGoal = 0;
  let vowel = 0;
  let browHold = 0;
  let browLeft = 0.12;
  let browRight = 0.1;
  const smooth = (t: number) => { const v=clamp(t,0,1); return v*v*(3-2*v); };

  return {
    available: bound.length > 0,
    // Deliberately never move the skull or neck to imitate eyelids or speech.
    // The facial morphs alone drive eyes, brows and lips.
    beforeUpdate() {},
    update(dt: number, seconds: number, speaking: boolean) {
      if (!Number.isFinite(dt) || dt <= 0 || bound.length === 0) return;
      dt = Math.min(dt, 0.08);
      // Realistic, restrained face animation. A spoken word contains brief
      // closures; never combine multiple full-strength mouth shapes.
      const s = (channel: FaceChannel, goal: number, speed = 10) => {
        weights[channel] = clamp(approach(weights[channel], goal, dt, speed), 0, 1);
      };
      if (speaking) {
        mouthHold -= dt;
        if (mouthHold <= 0) {
          mouthHold = 0.09 + Math.random() * 0.12;
          vowel = Math.random();
          // Alternating clearly-open vowels and momentary lip closures.
          mouthGoal = Math.random() < 0.26 ? 0 : 0.44 + Math.random() * 0.32;
        }
      } else {
        mouthGoal = 0;
        mouthHold = 0;
      }
      // The rebuilt lip seam opens over a recessed oral cavity.
      // Vowel-like poses are approximate: TTS exposes no phoneme timings.
      s('MouthOpen', mouthGoal, speaking ? 19 : 14);
      s('MouthO', speaking && vowel < 0.34 ? mouthGoal * 0.31 : 0, 12);
      s('MouthWide', speaking && vowel > 0.66 ? mouthGoal * 0.29 : 0, 12);
      s('MouthSmile', speaking ? 0.025 : 0.08, 3.5);

      if (blinkStart < 0 && seconds >= nextBlink) blinkStart = seconds;
      let blink = 0;
      if (blinkStart >= 0) {
        const age = seconds - blinkStart;
        // Quick close, a fully closed hold, then a slower reopening.
        // Applying another low-pass here prevented a complete closure.
        blink = age < 0.085 ? smooth(age / 0.085)
          : age < 0.15 ? 1 : 1 - smooth((age - 0.15) / 0.15);
        if (age >= 0.30) {
          blinkStart = -1;
          nextBlink = seconds + (Math.random() < 0.12 ? 0.22 : 2.1 + Math.random() * 3.0);
        }
      }
      // A complete eyelid target is safe once sculpted to the small eye area.
      weights.EyeBlinkLeft = weights.EyeBlinkRight = blink;
      browHold -= dt;
      if (browHold <= 0) {
        browHold = speaking ? 1.0 + Math.random() * 1.2 : 2.2 + Math.random() * 2.4;
        browLeft = speaking ? 0.06 + Math.random() * 0.14 : 0.035 + Math.random() * 0.065;
        browRight = browLeft * (0.86 + Math.random() * 0.14);
      }
      s('BrowRaiseLeft', browLeft, 4);
      s('BrowRaiseRight', browRight, 4);
      s('BrowFrown', 0, 3.8);

      for (const mesh of bound) {
        for (const name of REQUIRED) mesh.influences[mesh.channels[name]] = weights[name];
      }

    },
  };
}
