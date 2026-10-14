import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import type { AssistantId } from '@/state/assistant';

type SpeechCallbacks = {
  onStart?: () => void;
  onDone?: () => void;
  onStopped?: () => void;
  onError?: () => void;
};

export type AssistantVoiceOption = {
  identifier: string;
  name: string;
  language: string;
  quality: string;
  recommended: boolean;
};

const VOICE_STORAGE_PREFIX = 'nexo.assistant-voice.v1.';
const storedChoices: Partial<Record<AssistantId,string>> = {};
let cachedVoices: Speech.Voice[] | null = null;
let voiceCacheTime = 0;
let speechRunId = 0;

// Recognized es-MX voice names. The rest of the fallback candidates are
// sorted by available quality, language and the chosen assistant's timbre.
const femaleHints = [
  'dalia', 'ximena', 'paulina', 'sabina', 'sofia', 'monica',
  'lucia', 'elvira', 'beatriz', 'candela', 'carlota', 'larissa',
  'female', 'femenina', 'mujer',
];
const maleHints = [
  'jorge', 'tristan', 'juan', 'raul', 'diego', 'carlos', 'andres',
  'alvaro', 'cecilio', 'gerardo', 'liberto', 'luciano',
  'male', 'masculina', 'hombre',
];
const normalize=(value:string)=>String(value||'').toLocaleLowerCase('es')
  .normalize('NFD').replace(/[\u0300-\u036f]/g,'');

function scoreVoice(voice:Speech.Voice,id:AssistantId):number{
 const lang=normalize(voice.language||'');
 const name=normalize(voice.name||'');
 const identifier=normalize(voice.identifier||'');
 const description=name+' '+identifier;
 if(!lang.startsWith('es'))return -1000;
 const myHints=id==='nexa'?femaleHints:maleHints;
 const opposite=id==='nexa'?maleHints:femaleHints;
 let score=lang==='es-mx'?200:lang.startsWith('es-mx')?185:
  lang==='es-us'?82:lang.startsWith('es-')?70:45;
 if(myHints.some(h=>description.includes(h)))score+=125;
 if(opposite.some(h=>description.includes(h)))score-=225;
 if(/neural|natural|enhanced|premium|online|hd|wavenet/.test(description))
  score+=60;
 if(String(voice.quality||'').toLowerCase().includes('enhanced'))
  score+=50;
 // Natural voice timbre is preferable to artificially changing voice pitch.
 if(id==='nexa'&&description.includes('dalia'))score+=30;
 if(id==='nexo'&&description.includes('jorge'))score+=30;
 return score;
}

function storageKey(id:AssistantId){return VOICE_STORAGE_PREFIX+id;}
function canStore(){return Platform.OS==='web'&&typeof window!=='undefined';}

/** Persist only a harmless voice identifier, never a secret or audio file. */
export function getAssistantVoiceChoice(id:AssistantId):string|null{
 if(storedChoices[id])return storedChoices[id]||null;
 if(!canStore())return null;
 try{return window.localStorage.getItem(storageKey(id))||null;}
 catch{return null;}
}
export function setAssistantVoiceChoice(id:AssistantId,identifier:string|null):void{
 if(identifier)storedChoices[id]=identifier;
 else delete storedChoices[id];
 if(!canStore())return;
 try{
  if(identifier)window.localStorage.setItem(storageKey(id),identifier);
  else window.localStorage.removeItem(storageKey(id));
 }catch{/* private mode */}
}
async function availableVoices(force=false):Promise<Speech.Voice[]>{
 if(!force&&cachedVoices?.length&&Date.now()-voiceCacheTime<45_000)
  return cachedVoices;
 try{
  const voices=await Speech.getAvailableVoicesAsync();
  // On Chrome, the browser can initially return an empty voices list. Do
  // not keep that empty result forever; retry on the user's next tap.
  cachedVoices=Array.isArray(voices)?voices:[];
  voiceCacheTime=Date.now();
  return cachedVoices;
 }catch{return cachedVoices??[];}
}
export async function listAssistantVoices(id:AssistantId):Promise<AssistantVoiceOption[]>{
 const voices=await availableVoices(true);
 const spanish=voices
  .filter(v=>normalize(v.language||'').startsWith('es'))
  .sort((a,b)=>scoreVoice(b,id)-scoreVoice(a,id));
 const seen=new Set<string>();
 const bestScore=spanish.length?scoreVoice(spanish[0],id):-1;
 return spanish
  .filter(v=>{
   if(!v.identifier||seen.has(v.identifier))return false;
   seen.add(v.identifier);return true;
  })
  .map(v=>({
   identifier:v.identifier,name:v.name||'Voz en español',
   language:v.language||'es-MX',quality:String(v.quality||'Default'),
   recommended:scoreVoice(v,id)===bestScore,
  }));
}
async function preferredVoice(id:AssistantId):Promise<Speech.Voice|undefined>{
 let voices=await availableVoices();
 if(!voices.length)voices=await availableVoices(true);
 const spanish=voices.filter(v=>normalize(v.language||'').startsWith('es'));
 const selected=getAssistantVoiceChoice(id);
 if(selected){
  const match=spanish.find(v=>v.identifier===selected);
  if(match)return match;
 }
 return spanish.sort((a,b)=>scoreVoice(b,id)-scoreVoice(a,id))[0];
}

/**
 * Zero per-character fee with installed browser/OS voices.
 * The premium Azure/Google TTS service is intentionally NOT called from the
 * browser: its API key belongs on a server and must never be bundled in JS.
 */
export async function speakAsAssistant(
 text:string,
 assistantId:AssistantId,
 callbacks:SpeechCallbacks={}
):Promise<void>{
 const runId=++speechRunId;
 try{await Speech.stop();}catch{/* no previous utterance */}
 if(runId!==speechRunId)return;
 const voice=await preferredVoice(assistantId);
 if(runId!==speechRunId)return;
 const spokenText=text.replace(/\s+/g,' ')
   .replace(/([.!?])\s+/g,'$1  ').trim();
 if(!spokenText){
  callbacks.onDone?.();
  return;
 }
 const isNexa=assistantId==='nexa';
 let started=false,finished=false;
 const start=()=>{
  if(started||runId!==speechRunId)return;
  started=true;
  callbacks.onStart?.();
 };
 const done=(reason:'done'|'stopped'|'error')=>{
  if(finished||runId!==speechRunId)return;
  finished=true;
  if(reason==='done')callbacks.onDone?.();
  if(reason==='stopped')callbacks.onStopped?.();
  if(reason==='error')callbacks.onError?.();
 };
 try{
  Speech.speak(spokenText,{
   language:voice?.language||'es-MX',
   voice:voice?.identifier,
   // Use almost natural timbre. Excess pitch manipulation sounds robotic.
   rate:isNexa?0.98:0.96,
   pitch:isNexa?1.01:0.97,
   volume:1,
   onStart:start,
   onDone:()=>done('done'),
   onStopped:()=>done('stopped'),
   onError:()=>done('error'),
  });
 }catch{done('error');}
}
export function previewAssistantVoice(id:AssistantId,callbacks:SpeechCallbacks={}){
 const text=id==='nexa'
  ?'Hola, soy Nexa. Bienvenido a Nexo. Estoy aquí para ayudarte con lo que necesites.'
  :'Hola, soy Nexo. Puedo ayudarte a encontrar trabajo, servicios y productos.';
 return speakAsAssistant(text,id,callbacks);
}
export async function stopAssistantSpeech(){
 speechRunId++;
 try{await Speech.stop();}catch{/* voice engine unavailable */}
}
export async function isAssistantSpeaking(){
 try{return await Speech.isSpeakingAsync();}catch{return false;}
}
