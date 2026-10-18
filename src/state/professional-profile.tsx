import { createContext, useContext, useEffect, useSyncExternalStore, type PropsWithChildren } from 'react';
import { canSyncMyProfessionalProfile, syncMyProfessionalProfile } from '@/lib/nexo-cloud-identity';
import { Platform } from 'react-native';
import { useAuth } from '@/state/auth';

export type ProfessionalProfile = {
  firstName: string;
  firstSurname: string;
  role: string;
  education: string;
  specialty: string;
  experience: string;
  availability: string;
  workMode: string;
  skills: string;
  bio: string;
  photoDataUrl: string;
};

const emptyProfile: ProfessionalProfile = {
  firstName: '',
  firstSurname: '',
  role: '',
  education: '',
  specialty: '',
  experience: '',
  availability: '',
  workMode: '',
  skills: '',
  bio: '',
  photoDataUrl: '',
};

const LEGACY='nexo.professional-profile.v1';
const PREFIX='nexo.professional-profile.v2.';
const profiles=new Map<string,ProfessionalProfile>();
const listeners=new Set<() => void>();
let pendingSync: ReturnType<typeof setTimeout> | null = null;

function scheduleProfileSync(email: string, profile: ProfessionalProfile) {
  if (!canSyncMyProfessionalProfile(email)) return;
  if (pendingSync) clearTimeout(pendingSync);
  pendingSync = setTimeout(() => {
    pendingSync = null;
    if (!canSyncMyProfessionalProfile(email)) return;
    // Network failures leave the local profile intact and never bypass consent.
    void syncMyProfessionalProfile(profile).catch(() => {});
  }, 1400);
}
const key=(userId:string|null)=>PREFIX+(userId||'guest');

function normalizeProfile(value: unknown): ProfessionalProfile | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const requiredLegacyFields = [
    'role',
    'education',
    'specialty',
    'experience',
    'availability',
    'workMode',
    'skills',
    'bio',
  ] as const;

  if (!requiredLegacyFields.every((key) => typeof record[key] === 'string')) return null;

  return {
    firstName: typeof record.firstName === 'string' ? record.firstName : '',
    firstSurname: typeof record.firstSurname === 'string' ? record.firstSurname : '',
    role: record.role as string,
    education: record.education as string,
    specialty: record.specialty as string,
    experience: record.experience as string,
    availability: record.availability as string,
    workMode: record.workMode as string,
    skills: record.skills as string,
    bio: record.bio as string,
    photoDataUrl: typeof record.photoDataUrl === 'string' ? record.photoDataUrl : '',
  };
}

function loadProfile(userId:string|null):ProfessionalProfile{
 const id=key(userId);
 const cached=profiles.get(id);
 if(cached)return cached;
 let next={...emptyProfile};
 if(Platform.OS==='web'&&typeof window!=='undefined'){
  try{
   const saved=window.localStorage.getItem(id);
   if(saved)next=normalizeProfile(JSON.parse(saved))||next;
   else{
    // A previously written single-account CV belongs to that sole account.
    // Never automatically assign a shared historical profile when two or
    // more local users might own it.
    const rawAccounts=JSON.parse(window.localStorage.getItem('nexo.local-accounts.v1')||'[]');
    const accounts=Array.isArray(rawAccounts)?rawAccounts:[];
    let legacy='';
    if(userId&&accounts.length===1&&accounts[0]?.id===userId){
     legacy=window.localStorage.getItem(LEGACY)||'';
    }else if(userId){
     // Move a pre-registration guest draft only if no other account owned it.
     legacy=window.localStorage.getItem(PREFIX+'guest')||'';
    }else if(!accounts.length){
     legacy=window.localStorage.getItem(LEGACY)||'';
    }
    if(legacy){
     next=normalizeProfile(JSON.parse(legacy))||next;
     window.localStorage.setItem(id,JSON.stringify(next));
     if(userId)window.localStorage.removeItem(PREFIX+'guest');
    }
   }
  }catch{/* storage blocked or malformed; preserve empty safe profile */}
 }
 profiles.set(id,next);
 return next;
}
function subscribe(listener:()=>void){
 listeners.add(listener);
 return ()=>listeners.delete(listener);
}
function persist(userId:string|null,next:ProfessionalProfile){
 const id=key(userId);
 profiles.set(id,next);
 if(Platform.OS==='web'&&typeof window!=='undefined'){
  try{window.localStorage.setItem(id,JSON.stringify(next));}catch{}
 }
 listeners.forEach(listener=>listener());
}

type ProfessionalProfileContextValue = {
  profile: ProfessionalProfile;
  updateField: <K extends keyof ProfessionalProfile>(field: K, value: ProfessionalProfile[K]) => void;
  resetProfile: () => void;
};

const ProfessionalProfileContext = createContext<ProfessionalProfileContextValue | null>(null);

export function ProfessionalProfileProvider({ children }: PropsWithChildren) {
  const {user}=useAuth();
  const userId=user?.id||null;
  const current=useSyncExternalStore(subscribe,()=>loadProfile(userId),()=>emptyProfile);
  useEffect(() => () => {
    if (pendingSync) { clearTimeout(pendingSync); pendingSync = null; }
  }, [userId]);

  function updateField<K extends keyof ProfessionalProfile>(field:K,value:ProfessionalProfile[K]){
    const next = {...loadProfile(userId), [field]:value};
    persist(userId,next);
    if (user?.email) scheduleProfileSync(user.email,next);
  }
  function resetProfile(){persist(userId,{...emptyProfile});}

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

export function getDisplayName(profile: Pick<ProfessionalProfile, 'firstName' | 'firstSurname'>) {
  return [profile.firstName.trim(), profile.firstSurname.trim()].filter(Boolean).join(' ');
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
