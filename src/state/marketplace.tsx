import { createContext, useContext, useSyncExternalStore, type PropsWithChildren } from 'react';
import { Platform } from 'react-native';

export type MarketplaceProduct = {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  price: string;
  images: string[];
  createdAt: string;
};

const key = 'nexo.marketplace-products.v1';
let products: MarketplaceProduct[] = [];
let initialized = false;
const listeners = new Set<() => void>();

function normalizeProduct(value: unknown): MarketplaceProduct | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (!['id','title','description','category','location','price','createdAt'].every(k => typeof item[k] === 'string')) return null;
  const images = Array.isArray(item.images) ? item.images.filter((x): x is string => typeof x === 'string') : [];
  return {
    id: item.id as string,
    title: item.title as string,
    description: item.description as string,
    category: item.category as string,
    location: item.location as string,
    price: item.price as string,
    createdAt: item.createdAt as string,
    images,
  };
}

function load() {
  if (initialized) return products;
  initialized = true;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const raw = JSON.parse(window.localStorage.getItem(key) ?? '[]') as unknown;
      if (Array.isArray(raw)) products = raw.map(normalizeProduct).filter((x): x is MarketplaceProduct => !!x);
    } catch {}
  }
  return products;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return load();
}

function getServerSnapshot(): MarketplaceProduct[] {
  return [];
}

function persist(next: MarketplaceProduct[]) {
  products = next;
  initialized = true;
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      throw new Error('No se pudo guardar el producto en este navegador.');
    }
  }
  listeners.forEach((listener) => listener());
}

type MarketplaceContextValue = {
  products: MarketplaceProduct[];
  publish: (product: MarketplaceProduct) => void;
  remove: (id: string) => void;
};

const MarketplaceContext = createContext<MarketplaceContextValue | null>(null);

export function MarketplaceProvider({ children }: PropsWithChildren) {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function publish(product: MarketplaceProduct) {
    const next = [product, ...load().filter((item) => item.id !== product.id)];
    persist(next);
  }

  function remove(id: string) {
    persist(load().filter((item) => item.id !== id));
  }

  return (
    <MarketplaceContext.Provider value={{ products: current, publish, remove }}>
      {children}
    </MarketplaceContext.Provider>
  );
}

export function useMarketplace() {
  const context = useContext(MarketplaceContext);
  if (!context) throw new Error('MarketplaceProvider is required');
  return context;
}
