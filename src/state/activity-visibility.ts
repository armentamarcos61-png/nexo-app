import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

const storageKey = 'nexo.activity-visibility.v1';
let showActivity = true;
let initialized = false;
const listeners = new Set<() => void>();

function readStoredValue() {
  if (initialized) return showActivity;
  initialized = true;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored === 'false') showActivity = false;
      if (stored === 'true') showActivity = true;
    } catch {
      // If storage is unavailable, keep the default visible status.
    }
  }

  return showActivity;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return readStoredValue();
}

function getServerSnapshot() {
  return true;
}

function persist(value: boolean) {
  showActivity = value;
  initialized = true;

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(storageKey, String(value));
    } catch {
      // The preference still works for the current session.
    }
  }

  listeners.forEach((listener) => listener());
}

export function useActivityVisibility() {
  const visible = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return {
    showActivity: visible,
    setShowActivity: persist,
  };
}
