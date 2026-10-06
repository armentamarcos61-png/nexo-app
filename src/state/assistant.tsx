import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/state/auth';

export type AssistantId = 'nexa' | 'nexo';

export type AssistantProfile = {
  id: AssistantId;
  name: string;
  genderLabel: string;
  roleLabel: string;
  greeting: string;
  accent: string;
  secondaryAccent: string;
};

export const assistantProfiles: Record<AssistantId, AssistantProfile> = {
  nexa: {
    id: 'nexa',
    name: 'Nexa',
    genderLabel: 'Perfil femenino',
    roleLabel: 'Profesional serena',
    greeting: 'Hola, soy Nexa. Estoy aquí para ayudarte a moverte por Nexo de forma clara y tranquila.',
    accent: '#8A7DFF',
    secondaryAccent: '#52E4FF',
  },
  nexo: {
    id: 'nexo',
    name: 'Nexo',
    genderLabel: 'Perfil masculino',
    roleLabel: 'Maestro elegante',
    greeting: 'Hola, soy Nexo. Puedo orientarte con empleos, servicios, productos y funciones de la aplicación.',
    accent: '#5C7CFF',
    secondaryAccent: '#9A5CFF',
  },
};

type AssistantContextValue = {
  assistantId: AssistantId | null;
  assistant: AssistantProfile | null;
  selectAssistant: (id: AssistantId) => void;
  clearAssistant: () => void;
};

const AssistantContext = createContext<AssistantContextValue | null>(null);
const storagePrefix = 'nexo.assistant-choice.v1';

function storageKey(userId: string | null) {
  return `${storagePrefix}.${userId ?? 'guest'}`;
}

function canUseStorage() {
  return Platform.OS === 'web' && typeof window !== 'undefined';
}

function isAssistantId(value: unknown): value is AssistantId {
  return value === 'nexa' || value === 'nexo';
}

export function AssistantProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [assistantId, setAssistantId] = useState<AssistantId | null>(null);
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!canUseStorage()) {
      setAssistantId(null);
      return;
    }

    try {
      const stored = window.localStorage.getItem(storageKey(userId));
      setAssistantId(isAssistantId(stored) ? stored : null);
    } catch {
      setAssistantId(null);
    }
  }, [userId]);

  function selectAssistant(id: AssistantId) {
    setAssistantId(id);
    if (!canUseStorage()) return;
    try {
      window.localStorage.setItem(storageKey(userId), id);
    } catch {
      // Keep the selected assistant in memory when storage is unavailable.
    }
  }

  function clearAssistant() {
    setAssistantId(null);
    if (!canUseStorage()) return;
    try {
      window.localStorage.removeItem(storageKey(userId));
    } catch {
      // Ignore blocked storage.
    }
  }

  const value: AssistantContextValue = {
    assistantId,
    assistant: assistantId ? assistantProfiles[assistantId] : null,
    selectAssistant,
    clearAssistant,
  };

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistant() {
  const context = useContext(AssistantContext);
  if (!context) throw new Error('AssistantProvider is required');
  return context;
}
