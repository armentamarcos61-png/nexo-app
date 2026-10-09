import {
  createContext,
  useContext,
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
    name: 'Nessa',
    genderLabel: 'Perfil femenino',
    roleLabel: 'Profesional serena',
    greeting: 'Hola, soy Nessa. Estoy aquí para ayudarte a moverte por Nexo de forma clara y tranquila.',
    accent: '#9B5CFF',
    secondaryAccent: '#C18BFF',
  },
  nexo: {
    id: 'nexo',
    name: 'Nexo',
    genderLabel: 'Perfil masculino',
    roleLabel: 'Maestro elegante',
    greeting: 'Hola, soy Nexo. Puedo orientarte con empleos, servicios, productos y funciones de la aplicación.',
    accent: '#3B82F6',
    secondaryAccent: '#66C7FF',
  },
};

type AssistantContextValue = {
  assistantId: AssistantId | null;
  assistant: AssistantProfile | null;
  selectAssistant: (id: AssistantId) => void;
  clearAssistant: () => void;
};

type AssistantUserProviderProps = PropsWithChildren<{
  userId: string | null;
}>;

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

function readStoredChoice(userId: string | null): AssistantId | null {
  if (!canUseStorage()) return null;

  try {
    const stored = window.localStorage.getItem(storageKey(userId));
    return isAssistantId(stored) ? stored : null;
  } catch {
    return null;
  }
}

function AssistantUserProvider({ userId, children }: AssistantUserProviderProps) {
  const [assistantId, setAssistantId] = useState<AssistantId | null>(
    () => readStoredChoice(userId)
  );

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

export function AssistantProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const userId = user?.id ?? null;

  return (
    <AssistantUserProvider key={userId ?? 'guest'} userId={userId}>
      {children}
    </AssistantUserProvider>
  );
}

export function useAssistant() {
  const context = useContext(AssistantContext);
  if (!context) throw new Error('AssistantProvider is required');
  return context;
}
