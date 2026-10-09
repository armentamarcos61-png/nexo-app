/**
 * Control de movimiento de Nessa: un único GLB con 5 clips.
 *
 * El visor 3D debe construir AnimationMixer y sus acciones con
 * los nombres exactos: Idle, Walking, Running, Greeting y Talking.
 * Llama a update(deltaSeconds) desde el bucle de renderizado; el motor
 * interpola los movimientos en cada fotograma (objetivo: 60 FPS,
 * sujeto al rendimiento del dispositivo).
 *
 * Este módulo no carga el GLB: debe añadirse como asset al visor.
 */
export type NessaMotion = 'Idle' | 'Walking' | 'Running' | 'Greeting' | 'Talking';

export interface NessaAnimationAction {
  reset(): this;
  play(): this;
  fadeIn(duration: number): this;
  fadeOut(duration: number): this;
  stop(): this;
}

export interface NessaAnimationMixer {
  update(deltaSeconds: number): void;
}

export interface NessaTransform {
  position: { x: number; y: number; z: number };
  rotation: { y: number };
}

type Actions = Record<NessaMotion, NessaAnimationAction>;
type Destination = { x: number; z: number; running: boolean };
const CLIP_NAMES: NessaMotion[] = ['Idle', 'Walking', 'Running', 'Greeting', 'Talking'];
const FADE_SECONDS = 0.23;
const WALK_SPEED = 0.5;
const RUN_SPEED = 1.0;
const TURN_SPEED = 4.0;
const MAX_DISTANCE_FROM_CENTER = 1.4;

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

function normalizeAngle(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

/**
 * Los movimientos se eligen según eventos de Nexo, no mediante un video
 * predeterminado. La respuesta por voz tiene prioridad sobre caminar.
 */
export class NessaAnimationController {
  private mode: NessaMotion = 'Idle';
  private started = false;
  private speaking = false;
  private greetingRemaining = 0;
  private target: Destination | null = null;
  private elapsed = 0;

  constructor(
    private readonly mixer: NessaAnimationMixer,
    private readonly actions: Actions,
    private readonly model: NessaTransform
  ) {
    for (const name of CLIP_NAMES) {
      if (!actions[name]) throw new Error('Falta la animación: ' + name);
    }
    this.setMotion('Idle');
  }

  get motion(): NessaMotion {
    return this.mode;
  }

  private setMotion(next: NessaMotion) {
    if (this.started && this.mode === next) return;
    if (this.started) this.actions[this.mode].fadeOut(FADE_SECONDS);
    this.actions[next].reset().fadeIn(FADE_SECONDS).play();
    this.mode = next;
    this.started = true;
  }

  /** Activar al abrir el asistente. */
  greet() {
    if (this.speaking) return;
    this.target = null;
    this.greetingRemaining = 1.9;
    this.setMotion('Greeting');
  }

  /** Conectar con el evento onStart de la voz de Nexo. */
  startSpeaking() {
    this.speaking = true;
    this.greetingRemaining = 0;
    this.target = null;
    this.setMotion('Talking');
  }

  /** Conectar con onDone, onStopped y onError. */
  stopSpeaking() {
    this.speaking = false;
    this.setMotion('Idle');
  }

  /**
   * Ordena a Nessa desplazarse a otra posición del pequeño escenario 3D.
   * Puede caminar o correr sin descargar animaciones nuevas.
   */
  moveTo(x: number, z: number, running = false) {
    this.greetingRemaining = 0;
    this.target = {
      x: clamp(x, -MAX_DISTANCE_FROM_CENTER, MAX_DISTANCE_FROM_CENTER),
      z: clamp(z, -MAX_DISTANCE_FROM_CENTER, MAX_DISTANCE_FROM_CENTER),
      running,
    };
    if (!this.speaking) this.setMotion(running ? 'Running' : 'Walking');
  }

  stopMoving() {
    this.target = null;
    if (!this.speaking && this.greetingRemaining <= 0) this.setMotion('Idle');
  }

  /** Llamar UNA vez por frame: deltaSeconds del reloj del renderizador. */
  update(deltaSeconds: number) {
    const dt = clamp(Number.isFinite(deltaSeconds) ? deltaSeconds : 0, 0, 0.1);
    this.elapsed += dt;
    this.mixer.update(dt);

    if (this.speaking) return;

    if (this.greetingRemaining > 0) {
      this.greetingRemaining -= dt;
      if (this.greetingRemaining <= 0) this.setMotion('Idle');
      return;
    }

    if (this.target) {
      const dx = this.target.x - this.model.position.x;
      const dz = this.target.z - this.model.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance < 0.025) {
        this.target = null;
        this.setMotion('Idle');
        return;
      }
      const desiredYaw = Math.atan2(dx, dz);
      const angleDifference = normalizeAngle(desiredYaw - this.model.rotation.y);
      this.model.rotation.y += clamp(angleDifference, -TURN_SPEED * dt, TURN_SPEED * dt);
      const step = Math.min(distance, (this.target.running ? RUN_SPEED : WALK_SPEED) * dt);
      this.model.position.x += (dx / distance) * step;
      this.model.position.z += (dz / distance) * step;
      this.setMotion(this.target.running ? 'Running' : 'Walking');
      return;
    }

    // Movimiento espontáneo discreto mientras espera: mira ligeramente alrededor.
    this.model.rotation.y = 0.08 * Math.sin(this.elapsed * 0.45);
    this.setMotion('Idle');
  }

  dispose() {
    this.target = null;
    for (const name of CLIP_NAMES) this.actions[name].stop();
  }
}
