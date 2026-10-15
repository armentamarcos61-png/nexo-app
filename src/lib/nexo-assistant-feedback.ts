import type { AssistantId } from '@/state/assistant';

// This is Nexo's EXISTING Supabase project, not an untrusted analytics service.
// The value below is a public publishable key, never the service-role secret.
const ENDPOINT='https://wfwyftxbanwvixplzhcd.supabase.co/functions/v1/nexo-control';
const PUBLIC_KEY='sb_publishable_UY_rNqVKNwofYYv-p8lb0w_DvGkQBXi';

export type FeedbackVote='up'|'down'|'comment';
export type AssistantAnswerFeedback={
 responseId:string;
 assistantId:AssistantId;
 intentKey:string;
 question:string;
 answer:string;
};
export function newAnswerFeedbackId():string{
 const api=globalThis.crypto;
 if(typeof api?.randomUUID==='function')return api.randomUUID();
 const bytes=new Uint8Array(16);
 if(api?.getRandomValues)api.getRandomValues(bytes);
 else{
  // Only a feedback deduplication ID; never a credential or security token.
  // Some React Native JS engines don't expose Web Crypto yet.
  for(let i=0;i<bytes.length;i++)bytes[i]=Math.floor(Math.random()*256);
 }
 bytes[6]=(bytes[6]&0x0f)|0x40;
 bytes[8]=(bytes[8]&0x3f)|0x80;
 const hex=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
 return [hex.slice(0,8),hex.slice(8,12),hex.slice(12,16),
  hex.slice(16,20),hex.slice(20)].join('-');
}
/** Only a category, a vote, and an optional user-supplied comment are
 * shared by default. The full question/answer require explicit opt-in.
 * The Supabase Edge Function verifies admin access before any developer read.
 */
export async function sendAssistantFeedback(input:AssistantAnswerFeedback,options:{
 rating:FeedbackVote;
 comment?:string;
 includeContext?:boolean;
}):Promise<void>{
 if(!['up','down','comment'].includes(options.rating))throw Error('Valoración no válida.');
 const comment=(options.comment||'').trim();
 if(comment.length>1200)throw Error('El comentario debe tener menos de 1200 caracteres.');
 if(options.rating==='comment'&&!comment)
  throw Error('Escribe tu comentario antes de enviarlo.');
 const payload={
  action:'assistant_feedback',
  responseId:input.responseId,
  assistantId:input.assistantId,
  intentKey:input.intentKey,
  rating:options.rating,
  comment,
  includeContext:options.includeContext===true,
  ...(options.includeContext?{
    question:input.question.slice(0,300),
    answer:input.answer.slice(0,1200),
  }:{}),
 };
 const response=await fetch(ENDPOINT,{
  method:'POST',headers:{'content-type':'application/json',apikey:PUBLIC_KEY},
  body:JSON.stringify(payload),
 });
 if(!response.ok){
  const json=await response.json().catch(()=>({}));
  throw Error(typeof json?.error==='string'?
   json.error:'No se pudo enviar la valoración. Revisa tu conexión e intenta otra vez.');
 }
 const data=await response.json().catch(()=>null);
 if(data?.ok!==true)throw Error('El servidor no confirmó que se guardó el comentario.');
}
