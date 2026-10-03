import {
  createContext,
  useContext,
  useSyncExternalStore,
  type PropsWithChildren,
} from 'react';
import { Platform } from 'react-native';

export type NexoUser = {
  id: string;
  username: string;
  email: string;
  firstName: string;
  firstSurname: string;
};

type StoredAccount = NexoUser & {
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
};

type AuthResult =
  | { ok: true; user: NexoUser }
  | { ok: false; error: string };

type RegisterInput = {
  username: string;
  email: string;
  firstName: string;
  firstSurname: string;
  password: string;
};

const accountsKey = 'nexo.local-accounts.v1';
const sessionKey = 'nexo.session.v1';

let accounts: StoredAccount[] = [];
let currentUser: NexoUser | null = null;
let initialized = false;
const listeners = new Set<() => void>();

function canUseBrowserStorage() {
  return Platform.OS === 'web' && typeof window !== 'undefined';
}

function normalizePublicUser(account: StoredAccount): NexoUser {
  return {
    id: account.id,
    username: account.username,
    email: account.email,
    firstName: account.firstName,
    firstSurname: account.firstSurname,
  };
}

function isStoredAccount(value: unknown): value is StoredAccount {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return [
    'id',
    'username',
    'email',
    'firstName',
    'firstSurname',
    'passwordHash',
    'passwordSalt',
    'createdAt',
  ].every((key) => typeof record[key] === 'string');
}

function loadState() {
  if (initialized) return;
  initialized = true;

  if (!canUseBrowserStorage()) return;

  try {
    const rawAccounts = window.localStorage.getItem(accountsKey);
    if (rawAccounts) {
      const parsed: unknown = JSON.parse(rawAccounts);
      if (Array.isArray(parsed)) {
        accounts = parsed.filter(isStoredAccount);
      }
    }

    const sessionId = window.localStorage.getItem(sessionKey);
    if (sessionId) {
      const account = accounts.find((item) => item.id === sessionId);
      currentUser = account ? normalizePublicUser(account) : null;
    }
  } catch {
    accounts = [];
    currentUser = null;
  }
}

function persistAccounts() {
  if (!canUseBrowserStorage()) return;
  window.localStorage.setItem(accountsKey, JSON.stringify(accounts));
}

function persistSession(user: NexoUser | null) {
  currentUser = user;

  if (canUseBrowserStorage()) {
    if (user) window.localStorage.setItem(sessionKey, user.id);
    else window.localStorage.removeItem(sessionKey);
  }

  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  loadState();
  return currentUser;
}

function getServerSnapshot() {
  return null;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  if (typeof btoa !== 'function') {
    throw new Error('Este dispositivo no permite crear credenciales locales.');
  }

  return btoa(binary);
}

function base64ToBytes(value: string) {
  if (typeof atob !== 'function') {
    throw new Error('Este dispositivo no permite validar credenciales locales.');
  }

  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function derivePassword(password: string, saltBase64: string) {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi?.subtle) {
    throw new Error('Tu navegador no permite validar la cuenta de forma segura.');
  }

  const keyMaterial = await cryptoApi.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const bits = await cryptoApi.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: base64ToBytes(saltBase64),
      iterations: 120000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  return bytesToBase64(new Uint8Array(bits));
}

function makeId() {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID();

  const bytes = new Uint8Array(16);
  cryptoApi?.getRandomValues?.(bytes);
  if (bytes.some((value) => value !== 0)) return bytesToBase64(bytes);

  return 'nexo-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}

async function registerAccount(input: RegisterInput): Promise<AuthResult> {
  loadState();

  if (!canUseBrowserStorage()) {
    return {
      ok: false,
      error: 'El registro persistente está habilitado por ahora en la versión web de Nexo.',
    };
  }

  const username = input.username.trim().toLowerCase();
  const email = input.email.trim().toLowerCase();

  if (accounts.some((account) => account.username.toLowerCase() === username)) {
    return { ok: false, error: 'Ese nombre de usuario ya existe.' };
  }

  if (accounts.some((account) => account.email.toLowerCase() === email)) {
    return { ok: false, error: 'Ese correo ya tiene una cuenta.' };
  }

  try {
    const saltBytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(saltBytes);
    const passwordSalt = bytesToBase64(saltBytes);
    const passwordHash = await derivePassword(input.password, passwordSalt);

    const account: StoredAccount = {
      id: makeId(),
      username,
      email,
      firstName: input.firstName.trim(),
      firstSurname: input.firstSurname.trim(),
      passwordHash,
      passwordSalt,
      createdAt: new Date().toISOString(),
    };

    accounts = [...accounts, account];
    persistAccounts();

    const user = normalizePublicUser(account);
    persistSession(user);
    return { ok: true, user };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudo crear la cuenta.',
    };
  }
}

async function signInAccount(identifier: string, password: string): Promise<AuthResult> {
  loadState();

  const normalized = identifier.trim().toLowerCase();
  const account = accounts.find(
    (item) =>
      item.username.toLowerCase() === normalized ||
      item.email.toLowerCase() === normalized
  );

  if (!account) {
    return { ok: false, error: 'Usuario o contraseña incorrectos.' };
  }

  try {
    const hash = await derivePassword(password, account.passwordSalt);
    if (hash !== account.passwordHash) {
      return { ok: false, error: 'Usuario o contraseña incorrectos.' };
    }

    const user = normalizePublicUser(account);
    persistSession(user);
    return { ok: true, user };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudo iniciar sesión.',
    };
  }
}

type AuthContextValue = {
  user: NexoUser | null;
  register: (input: RegisterInput) => Promise<AuthResult>;
  signIn: (identifier: string, password: string) => Promise<AuthResult>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const user = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <AuthContext.Provider
      value={{
        user,
        register: registerAccount,
        signIn: signInAccount,
        signOut: () => persistSession(null),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider is required');
  return context;
}
