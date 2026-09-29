import { createContext, useContext, useSyncExternalStore, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';

export type ProfessionalProfile = {
  role: string;
  education: string;
  specialty: string;
  experience: string;
  availability: string;
  workMode: string;
  skills: string;
  bio: string;
};

const emptyProfile: ProfessionalProfile = {
  role: '',
  education: '',
  specialty: '',
  experience: '',
  availability: '',
  workMode: '',
  skills: '',
  bio: '',
};

const storageKey = 'nexo.professional-profile.v1';
let profile = { ...emptyProfile };
let initialized = false;
const listeners = new Set<() => void>();

function isProfile(value: unknown): value is ProfessionalProfile {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return Object.keys(emptyProfile).every((key) => typeof record[key] === 'string');
}

function loadProfile() {
  if (initialized) return profile;
  initialized = true;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isProfile(parsed)) profile = parsed;
      }
    } catch {
      // Storage may be blocked; keep the in-memory profile instead.
    }
  }
  return profile;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return loadProfile();
}

function getServerSnapshot() {
  return emptyProfile;
}

function persist(next: ProfessionalProfile) {
  profile = next;
  initialized = true;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      // Keep working in-memory when storage is unavailable.
    }
  }
  listeners.forEach((listener) => listener());
}

type ProfessionalProfileContextValue = {
  profile: ProfessionalProfile;
  updateField: <K extends keyof ProfessionalProfile>(field: K, value: ProfessionalProfile[K]) => void;
  resetProfile: () => void;
};

const ProfessionalProfileContext = createContext<ProfessionalProfileContextValue | null>(null);

export function ProfessionalProfileProvider({ children }: PropsWithChildren) {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function updateField<K extends keyof ProfessionalProfile>(field: K, value: ProfessionalProfile[K]) {
    persist({ ...loadProfile(), [field]: value });
  }

  function resetProfile() {
    persist({ ...emptyProfile });
  }

  return (
    <ProfessionalProfileContext.Provider value={{ profile: current, updateField, resetProfile }}>
      {children}
    </ProfessionalProfileContext.Provider>
  );
}

export function useProfessionalProfile() {
  const context = useContext(ProfessionalProfileContext);
  if (!context) throw new Error('ProfessionalProfileProvider is required');
  return context;
}

export const educationOptions = [
  'Sin estudios formales',
  'Primaria',
  'Secundaria',
  'Preparatoria / Bachillerato',
  'Técnico / Oficio',
  'Universidad',
  'Posgrado',
] as const;

export const experienceOptions = [
  'Estoy empezando',
  'Menos de 1 año',
  '1–3 años',
  '3–5 años',
  '5–10 años',
  '10+ años',
] as const;

export const availabilityOptions = [
  'Tiempo completo',
  'Medio tiempo',
  'Por proyecto',
  'Fines de semana',
  'Flexible',
] as const;

export const workModeOptions = [
  'Presencial',
  'En línea',
  'Híbrido',
  'Me da igual',
] as const;
