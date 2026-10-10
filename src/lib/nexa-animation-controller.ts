/**
 * Animaciones de Nexa. Un solo GLB y transiciones fluidas:
 * gestos de 4-7 s, aceleración y frenado gradual. Sin archivos extra.
 */
export type NexaMotion = 'Idle' | 'Walking' | 'Running' | 'Greeting' | 'Talking';

export interface NexaAnimationAction {
  timeScale: number;
  reset(): this;
  play(): this;
  fadeIn(duration: number): this;
  fadeOut(duration: number): this;
  stop(): this;
}

export interface NexaAnimationMixer { update(deltaSeconds: number): void; }
export interface NexaTransform {
  position: { x: number; y: number; z: number };
  rotation: { y: number };
}

type Actions = Record<NexaMotion, NexaAnimationAction>;
const MOTIONS: NexaMotion[] = ['Idle', 'Walking', 'Running', 'Greeting', 'Talking'];
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const ease = (t: number) => { const a = clamp(t, 0, 1); return a * a * (3 - 2 * a); };

export class NexaAnimationController {
  private modeValue: NexaMotion = 'Idle';
  private started = false;
  private speaking = false;
  private elapsed = 0;
  private timeLeft = 0;
  private duration = 0;
  private baseYaw = 0;
  private initialX: number;
  private initialZ: number;
  private readonly baselines: Record<NexaMotion, number> = {
    Idle: 0.83,
    Walking: 0.83,
    Running: 0.77,
    Greeting: 0.43, // 1.9-second greeting stretched to ~4.4 seconds.
    Talking: 0.60,
  };

  constructor(
    private readonly mixer: NexaAnimationMixer,
    private readonly actions: Actions,
    private readonly model: NexaTransform,
  ) {
    for (const name of MOTIONS) {
      if (!actions[name]) throw new Error('Falta la animación de Nexa: ' + name);
    }
    this.initialX = model.position.x;
    this.initialZ = model.position.z;
    this.setMotion('Idle');
  }

  get motion(): NexaMotion { return this.modeValue; }

  private setMotion(next: NexaMotion, duration = 0) {
    if (this.started && this.modeValue === next) {
      if (duration > 0) { this.timeLeft = duration; this.duration = duration; }
      return;
    }
    if (this.started) this.actions[this.modeValue].fadeOut(0.85);
    const action = this.actions[next];
    action.reset();
    action.timeScale = this.baselines[next];
    action.fadeIn(0.85).play();
    this.modeValue = next;
    this.timeLeft = duration;
    this.duration = duration;
    this.elapsed = 0;
    this.baseYaw = this.model.rotation.y;
    this.started = true;
  }

  greet() {
    if (this.speaking) return;
    this.setMotion('Greeting', 5.5);
  }

  /** Speech blends in arm/hand gesture tracks; head and face stay independent. */
  startSpeaking() {
    if (this.speaking) return;
    this.speaking = true;
    this.setMotion('Talking');
  }

  stopSpeaking() {
    if (!this.speaking) return;
    this.speaking = false;
    this.setMotion('Idle');
  }

  /** Mantener caminar/correr varios segundos y luego detenerse suavemente. */
  moveTo(_x: number, _z: number, running = false) {
    if (this.speaking) return;
    this.setMotion(running ? 'Running' : 'Walking', running ? 5.4 : 6.5);
  }

  stopMoving() {
    if (this.speaking) return;
    this.setMotion('Idle');
  }

  update(deltaSeconds: number) {
    const dt = clamp(Number.isFinite(deltaSeconds) ? deltaSeconds : 0, 0, 0.08);
    this.mixer.update(dt);
    this.elapsed += dt;

    if (this.speaking) {
      // Talking does not rotate the body or skull. Mouth and brows animate separately.
      this.model.rotation.y += (this.baseYaw - this.model.rotation.y) * Math.min(1, dt * 1.2);
      return;
    }

    if (this.timeLeft > 0) {
      this.timeLeft = Math.max(0, this.timeLeft - dt);
      const elapsedFraction = this.duration ? (this.duration - this.timeLeft) / this.duration : 1;
      // Ease in and out; the last 1.25 s decelerate before fading into idle.
      const start = ease(elapsedFraction / 0.17);
      const end = ease(this.timeLeft / 1.25);
      const speed = this.baselines[this.modeValue] * (0.48 + 0.52 * Math.min(start, end));
      this.actions[this.modeValue].timeScale = speed;
      const yaw = this.baseYaw + Math.sin(this.elapsed * 0.45) * 0.035 * Math.min(start, end);
      this.model.rotation.y += (yaw - this.model.rotation.y) * Math.min(1, dt * 2.6);
      if (this.timeLeft <= 0) this.setMotion('Idle');
      return;
    }

    // Neutral portrait pose. Users may orbit the camera without involuntary swaying.
    this.model.rotation.y += (this.baseYaw - this.model.rotation.y) * Math.min(1, dt * 0.8);
    this.model.position.x += (this.initialX - this.model.position.x) * Math.min(1, dt * 0.8);
    this.model.position.z += (this.initialZ - this.model.position.z) * Math.min(1, dt * 0.8);
  }

  dispose() {
    this.speaking = false;
    for (const name of MOTIONS) this.actions[name].stop();
  }
}
