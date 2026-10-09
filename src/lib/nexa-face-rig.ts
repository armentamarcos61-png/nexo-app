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
  let startBlink = -1;
  let phraseTime = 0;
  let silentTime = 0;

  return {
    available: bound.length > 0,
    update(dt: number, seconds: number, speaking: boolean) {
      if (dt <= 0 || bound.length === 0) return;
      // Speech gestures: dynamic mouth opening, rounded and wide shapes.
      // This is procedural speaking animation, not phoneme-accurate lip sync.
      phraseTime += speaking ? dt : 0;
      silentTime += dt;
      const syllable = Math.pow(Math.abs(Math.sin(phraseTime * 10.4 + 0.33 * Math.sin(phraseTime * 3.3))), 1.5);
      const dynamic = speaking ? 0.18 + 0.78 * syllable : 0;
      const rounded = speaking ? 0.14 + 0.52 * Math.max(0, Math.sin(phraseTime * 3.45 + 0.8)) : 0;
      const stretched = speaking ? 0.15 + 0.56 * Math.max(0, Math.sin(phraseTime * 4.6 + 2.2)) : 0;
      const s = (channel: FaceChannel, goal: number, speed = 10) => {
        weights[channel] = clamp(approach(weights[channel], goal, dt, speed), 0, 1);
      };
      s('MouthOpen', dynamic, speaking ? 20 : 9);
      s('MouthO', rounded, 11);
      s('MouthWide', stretched, 13);
      s('MouthSmile', speaking ? 0.11 : 0.28 + 0.08 * Math.sin(silentTime * 0.6), 2.5);

      // Full open-close blink lasting about 180ms. Timing varies naturally.
      if (startBlink < 0 && seconds >= nextBlink) startBlink = seconds;
      let blink = 0;
      if (startBlink >= 0) {
        const phase = (seconds - startBlink) / 0.19;
        blink = Math.sin(Math.PI * clamp(phase, 0, 1));
        if (phase >= 1) {
          startBlink = -1;
          nextBlink = seconds + 2.6 + Math.random() * 2.5;
        }
      }
      s('EyeBlinkLeft', blink, 36);
      s('EyeBlinkRight', blink * 0.98, 36);
      s('BrowRaiseLeft', speaking ? 0.22 + Math.pow(Math.sin(phraseTime * 1.4), 2) * 0.45 : 0.12, 4.5);
      s('BrowRaiseRight', speaking ? 0.20 + Math.pow(Math.sin(phraseTime * 1.4 + 0.23), 2) * 0.42 : 0.12, 4.5);
      s('BrowFrown', speaking ? 0.05 + 0.09 * Math.pow(Math.sin(phraseTime * 0.7), 2) : 0, 2.5);

      for (const mesh of bound) {
        for (const name of REQUIRED) mesh.influences[mesh.channels[name]] = weights[name];
      }

      if (headBone) {
        // AnimationMixer resets the current joint pose each frame; apply only
        // a small additive head nod on top of the existing clip.
        headBone.rotation.x += Math.sin(seconds * (speaking ? 1.5 : 0.43)) * (speaking ? 0.010 : 0.005);
        headBone.rotation.y += Math.sin(seconds * 0.35) * 0.012;
      }
    },
  };
}
