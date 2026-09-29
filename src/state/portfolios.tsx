import { createContext, useContext, useSyncExternalStore, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';

export type ServicePortfolio = {
  id: string;
  title: string;
  service: string;
  description: string;
  images: string[];
  createdAt: string;
};

const key = 'nexo.service-portfolios.v1';
const emptyPortfolios: ServicePortfolio[] = [];
let portfolios: ServicePortfolio[] = [];
let initialized = false;
const listeners = new Set<() => void>();

function normalizePortfolio(value: unknown): ServicePortfolio | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (!['id','title','service','description','createdAt'].every(k => typeof item[k] === 'string')) return null;
  const images = Array.isArray(item.images) ? item.images.filter((x): x is string => typeof x === 'string') : [];
  return {
    id: item.id as string,
    title: item.title as string,
    service: item.service as string,
    description: item.description as string,
    images,
    createdAt: item.createdAt as string,
  };
}

function load() {
  if (initialized) return portfolios;
  initialized = true;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const raw = JSON.parse(window.localStorage.getItem(key) ?? '[]') as unknown;
      if (Array.isArray(raw)) portfolios = raw.map(normalizePortfolio).filter((x): x is ServicePortfolio => !!x);
    } catch {}
  }
  return portfolios;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return load();
}

function getServerSnapshot(): ServicePortfolio[] {
  return emptyPortfolios;
}

function persist(next: ServicePortfolio[]) {
  portfolios = next;
  initialized = true;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      throw new Error('No se pudo guardar el portafolio en este navegador.');
    }
  }
  listeners.forEach((listener) => listener());
}

type PortfolioContextValue = {
  portfolios: ServicePortfolio[];
  save: (portfolio: ServicePortfolio) => void;
  remove: (id: string) => void;
};

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

export function PortfolioProvider({ children }: PropsWithChildren) {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function save(portfolio: ServicePortfolio) {
    persist([portfolio, ...load().filter((item) => item.id !== portfolio.id)]);
  }

  function remove(id: string) {
    persist(load().filter((item) => item.id !== id));
  }

  return (
    <PortfolioContext.Provider value={{ portfolios: current, save, remove }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolios() {
  const context = useContext(PortfolioContext);
  if (!context) throw new Error('PortfolioProvider is required');
  return context;
}
