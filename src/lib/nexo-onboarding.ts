import { Platform } from 'react-native';

// Versioned per-device introduction, separate from the user's account data.
// Never reads or writes passwords, IDs or chat contents.
const KEY='nexo.onboarding.seen.v1';
let nativeFinished=false;

export function hasSeenNexoOnboarding():boolean {
 if(Platform.OS!=='web')return nativeFinished;
 if(typeof window==='undefined')return true; // avoid server-side redirect loops
 try{return window.localStorage.getItem(KEY)==='1';}
 catch{return nativeFinished;}
}

export function completeNexoOnboarding():void{
 nativeFinished=true;
 if(Platform.OS==='web'&&typeof window!=='undefined'){
  try{window.localStorage.setItem(KEY,'1');}catch{/* private browsing */ }
 }
}

export type NexoOnboardingSlide={
 key:string;eyebrow:string;title:string;subtitle:string;
};
export const nexoOnboardingSlides:NexoOnboardingSlide[]=[
 {key:'welcome',eyebrow:'UNA NUEVA FORMA DE CONECTAR',
  title:'Bienvenido a Nexo',
  subtitle:'Tu talento, tu trabajo y tus ideas tienen un lugar. Descubre todo lo que puedes hacer aquí.'},
 {key:'options',eyebrow:'TU PRIMER PASO',
  title:'¿Qué necesitas hacer?',
  subtitle:'Encuentra un empleo, busca trabajadores, contrata servicios o comparte lo que sabes hacer.'},
 {key:'opportunities',eyebrow:'EXPLORA OPORTUNIDADES',
  title:'Encuentra lo que buscas',
  subtitle:'Filtra por tipo de oportunidad y descubre oficios, empleos y servicios que encajan con tu necesidad.'},
 {key:'publish',eyebrow:'COMPARTE TU TALENTO',
  title:'Publica lo que ofreces',
  subtitle:'Desde pasteles hasta refacciones: añade detalles, ubicación e imágenes para mostrar tus productos y servicios.'},
 {key:'assistants',eyebrow:'NUNCA ESTÁS SOLO',
  title:'Conoce a Nexo y Nexa',
  subtitle:'Dos asistentes virtuales que te explican cómo utilizar las funciones de la aplicación.'},
 {key:'ready',eyebrow:'TODO LISTO PARA EMPEZAR',
  title:'Tu siguiente oportunidad está aquí',
  subtitle:'Crea tu cuenta, inicia sesión o explora Nexo. Puedes volver a ver esta presentación cuando quieras.'},
];
