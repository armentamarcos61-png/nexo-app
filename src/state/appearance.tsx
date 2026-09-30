import { createContext, useContext, useSyncExternalStore, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';

export type AppearanceMode = 'claro' | 'oscuro' | 'personalizado';

export const appearanceOptions: Array<{
  key: AppearanceMode;
  label: string;
  icon: string;
  description: string;
}> = [
  {
    key: 'claro',
    label: 'Claro',
    icon: '☀️',
    description: 'Fondos luminosos, alto contraste y una lectura más ligera.',
  },
  {
    key: 'oscuro',
    label: 'Oscuro',
    icon: '🌙',
    description: 'Negros y azules profundos para reducir brillo y distracciones.',
  },
  {
    key: 'personalizado',
    label: 'Nexo',
    icon: '✦',
    description: 'La apariencia tornasol, profunda y futurista de Nexo.',
  },
];

const key = 'nexo.appearance.v1';
let memoryMode: AppearanceMode = 'personalizado';
let initialized = false;
const listeners = new Set<() => void>();

function isAppearanceMode(value: unknown): value is AppearanceMode {
  return value === 'claro' || value === 'oscuro' || value === 'personalizado';
}

function readStoredMode() {
  if (initialized) return memoryMode;
  initialized = true;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const saved = window.localStorage.getItem(key);
      if (isAppearanceMode(saved)) memoryMode = saved;
    } catch {
      // If browser storage is blocked, Nexo simply keeps the default appearance.
    }
  }
  return memoryMode;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return readStoredMode();
}

function getServerSnapshot(): AppearanceMode {
  return 'personalizado';
}

function persist(mode: AppearanceMode) {
  memoryMode = mode;
  initialized = true;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(key, mode);
    } catch {
      // The visual change still works for the current session.
    }
  }
  listeners.forEach((listener) => listener());
}

type AppearanceContextValue = {
  mode: AppearanceMode;
  setMode: (mode: AppearanceMode) => void;
};

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

export function AppearanceProvider({ children }: PropsWithChildren) {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return (
    <AppearanceContext.Provider value={{ mode, setMode: persist }}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) throw new Error('AppearanceProvider is required');
  return context;
}

export function getAppearancePalette(mode: AppearanceMode) {
  if (mode === 'claro') {
    return {
      background: '#F3F7FD',
      scroll: '#F3F7FD',
      gradient: ['#FBFDFF', '#EDF3FF', '#F8F2FF'] as const,
      glowOne: 'rgba(38,154,255,0.10)',
      glowTwo: 'rgba(160,75,235,0.10)',
      title: '#13213A',
      text: '#4C5D79',
      muted: '#687A96',
      card: ['rgba(255,255,255,0.98)', 'rgba(238,244,255,0.98)', 'rgba(247,239,255,0.98)'] as const,
      cardBorder: 'rgba(82,115,165,0.25)',
      input: ['rgba(255,255,255,0.98)', 'rgba(236,242,253,0.98)'] as const,
      inputText: '#000000',
      placeholder: '#71809A',
      secondary: ['rgba(242,246,253,0.98)', 'rgba(231,237,249,0.98)'] as const,
      secondaryText: '#273853',
    };
  }

  if (mode === 'oscuro') {
    return {
      background: '#05070D',
      scroll: '#05070D',
      gradient: ['#04060B', '#080B14', '#10131D'] as const,
      glowOne: 'rgba(20,95,165,0.09)',
      glowTwo: 'rgba(95,47,150,0.09)',
      title: '#F5F7FB',
      text: '#B9C2D2',
      muted: '#8792A7',
      card: ['rgba(15,19,28,0.98)', 'rgba(21,24,35,0.98)', 'rgba(18,22,31,0.98)'] as const,
      cardBorder: 'rgba(139,151,176,0.22)',
      input: ['rgba(17,22,33,0.98)', 'rgba(23,26,39,0.98)'] as const,
      inputText: '#F7F8FA',
      placeholder: '#8792A7',
      secondary: ['rgba(24,28,39,0.98)', 'rgba(30,31,44,0.98)'] as const,
      secondaryText: '#E6E9EF',
    };
  }

  return {
    background: '#071426',
    scroll: '#071426',
    gradient: ['#071426', '#0B1830', '#130F2D'] as const,
    glowOne: 'rgba(0,213,255,0.13)',
    glowTwo: 'rgba(190,72,255,0.13)',
    title: '#FFFFFF',
    text: '#C5D0EA',
    muted: '#9EADD0',
    card: ['rgba(42,83,132,0.72)', 'rgba(88,54,137,0.58)', 'rgba(22,103,118,0.55)'] as const,
    cardBorder: 'rgba(151,196,255,0.34)',
    input: ['rgba(35,60,96,0.95)', 'rgba(42,38,79,0.95)'] as const,
    inputText: '#F3F5F8',
    placeholder: '#AAB4C7',
    secondary: ['rgba(30,52,84,0.92)', 'rgba(52,42,92,0.88)'] as const,
    secondaryText: '#EAF1FF',
  };
}
