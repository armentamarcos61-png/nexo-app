import {
  createContext,
  useContext,
  useSyncExternalStore,
  type PropsWithChildren,
} from 'react';
import { Platform } from 'react-native';
import { clearCloudSession, cloudLogin, cloudRegister, importHistoricalNexoRegistration } from '@/lib/nexo-cloud-identity';

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
    // Register central identity as well as the local account. If email
    // confirmation is required, the profile will only be synced after login.
    // Never send the password to the developer directory.
    try{
      await cloudRegister({username,email,firstName:input.firstName,
        firstSurname:input.firstSurname,password:input.password});
    }catch{
      // Local accounts remain usable even if the cloud is offline. The
      // owner can link their account later; never fake a central record.
    }
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
    // Accounts created on other devices are verified directly with Supabase
    // and imported into this browser only AFTER a successful remote login.
    if(normalized.includes('@')){
      try{
        const remote=await cloudLogin(normalized,password);
        const saltBytes=new Uint8Array(16);
        globalThis.crypto.getRandomValues(saltBytes);
        const passwordSalt=bytesToBase64(saltBytes);
        const passwordHash=await derivePassword(password,passwordSalt);
        const imported:StoredAccount={
          id:remote.id,email:remote.email.toLowerCase(),
          username:remote.username||remote.email.split('@')[0],
          firstName:remote.firstName,firstSurname:remote.firstSurname,
          passwordHash,passwordSalt,createdAt:new Date().toISOString(),
        };
        accounts=[...accounts,imported];persistAccounts();
        const cloudUser=normalizePublicUser(imported);
        persistSession(cloudUser);
        return {ok:true,user:cloudUser};
      }catch{
        return {ok:false,error:'No se encontró la cuenta local. Si te registraste en otro teléfono, usa el correo y contraseña de tu cuenta verificada.'};
      }
    }
    return {ok:false,error:'Ese usuario no existe en este dispositivo. Para entrar desde otro teléfono, escribe tu correo.'};
  }

  try {
    const hash = await derivePassword(password, account.passwordSalt);
    if (hash !== account.passwordHash) {
      return { ok: false, error: 'La contraseña es incorrecta.' };
    }

    const user = normalizePublicUser(account);
    persistSession(user);
    // Use the same password to refresh the user's OWN Supabase session.
    // A legacy local account may not exist on the server yet.
    try{await cloudLogin(account.email,password);}catch{/* legacy or unverified */}
    return { ok: true, user };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'No se pudo iniciar sesión.',
    };
  }
}

export type HistoricalAccountLinkResult =
 | {ok:true; needsEmailVerification:boolean; originalCreatedAt:string}
 | {ok:false;error:string};

/** The original device must still hold the locally created account.
 * A developer cannot retrieve this record remotely. The account owner
 * explicitly re-enters their password, proves their local account and
 * re-authenticates with Supabase before the historic date is uploaded.
 */
async function linkMyHistoricalAccount(password:string):Promise<HistoricalAccountLinkResult>{
 loadState();
 const me=currentUser;
 if(!me)return {ok:false,error:'Inicia sesión en la cuenta histórica que quieres recuperar.'};
 const local=accounts.find(a=>a.id===me.id);
 if(!local)return {ok:false,error:'No se encontró el registro de esta cuenta en el dispositivo.'};
 if(!password)return {ok:false,error:'Escribe la contraseña de esta cuenta.'};
 try{
  const hash=await derivePassword(password,local.passwordSalt);
  if(hash!==local.passwordHash)
   return {ok:false,error:'La contraseña de esta cuenta histórica es incorrecta.'};
  // Confirm cloud ownership. If this email already belongs to another
  // Supabase account, signup fails; never overwrite or claim that account.
  try{
   const remote=await cloudLogin(local.email,password);
   if(remote.email.toLowerCase()!==local.email.toLowerCase())
    return {ok:false,error:'El correo de la cuenta central no coincide.'};
  }catch{
   const result=await cloudRegister({email:local.email,password,
    username:local.username,firstName:local.firstName,firstSurname:local.firstSurname});
   if(result.needsEmailVerification)
    return {ok:true,needsEmailVerification:true,originalCreatedAt:local.createdAt};
  }
  await importHistoricalNexoRegistration(local.createdAt);
  return {ok:true,needsEmailVerification:false,originalCreatedAt:local.createdAt};
 }catch(e){
  return {ok:false,error:e instanceof Error?e.message:
   'No se pudo vincular tu cuenta. Comprueba la conexión o verifica tu correo.'};
 }
}
function getMyLocalCreatedAt():string|null{
 loadState();
 return accounts.find(a=>a.id===currentUser?.id)?.createdAt||null;
}

type AuthContextValue = {
  user: NexoUser | null;
  register: (input: RegisterInput) => Promise<AuthResult>;
  signIn: (identifier: string, password: string) => Promise<AuthResult>;
  signOut: () => void;
  linkHistoricalAccount:(password:string)=>Promise<HistoricalAccountLinkResult>;
  localRegistrationDate:string|null;
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
        signOut: () => {clearCloudSession();persistSession(null);},
        linkHistoricalAccount:linkMyHistoricalAccount,
        localRegistrationDate:getMyLocalCreatedAt(),
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
