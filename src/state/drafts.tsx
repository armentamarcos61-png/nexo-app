import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';

export const tipos = { necesidad: 'Necesito contratar', servicio: 'Ofrezco un servicio', producto: 'Vendo un producto', categoria: 'Proponer nueva categoría' };
export type Tipo = keyof typeof tipos;
export type Draft = { id: string; tipo: Tipo; titulo: string; descripcion: string; categoria: string; ubicacion: string; importe: string };
const key = 'nexo.drafts.v1';
const DraftContext = createContext<{ drafts: Draft[]; ready: boolean; save: (draft: Draft) => void } | null>(null);

function isDraft(value: unknown): value is Draft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Record<string, unknown>;
  return typeof draft.tipo === 'string' && Object.hasOwn(tipos, draft.tipo)
    && ['id', 'titulo', 'descripcion', 'categoria', 'ubicacion', 'importe'].every(field => typeof draft[field] === 'string');
}

export function DraftProvider({ children }: PropsWithChildren) {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const current = useRef<Draft[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      if (Platform.OS === 'web') {
        const saved: unknown = JSON.parse(window.localStorage.getItem(key) ?? '[]');
        if (Array.isArray(saved)) current.current = saved.filter(isDraft);
      }
    } catch { /* A blocked browser store must not prevent opening the app. */ }
    setDrafts(current.current);
    setReady(true);
  }, []);

  function save(draft: Draft) {
    if (!ready) throw new Error('Espera a que terminen de cargar tus borradores.');
    const next = [draft, ...current.current.filter(item => item.id !== draft.id)];
    // Write first: if storage fails, keep the form and show an error, never a false success.
    if (Platform.OS === 'web') window.localStorage.setItem(key, JSON.stringify(next));
    current.current = next;
    setDrafts(next);
  }
  return <DraftContext.Provider value={{ drafts, ready, save }}>{children}</DraftContext.Provider>;
}

export function useDrafts() {
  const context = useContext(DraftContext);
  if (!context) throw new Error('DraftProvider is required');
  return context;
}

export const storageNotice = Platform.OS === 'web'
  ? 'Los borradores se guardan en este navegador. Todavía no se publican ni se envían a otras personas.'
  : 'Los borradores se conservan durante esta sesión. Todavía no se publican ni se envían a otras personas.';
