import { Platform } from 'react-native';
const BASE='https://wfwyftxbanwvixplzhcd.supabase.co';
const KEY='sb_publishable_UY_rNqVKNwofYYv-p8lb0w_DvGkQBXi';
const STORAGE='nexo.control.admin.session.v1';
const isWeb=()=>Platform.OS==='web'&&typeof window!=='undefined';
export type Accent='cyan'|'violet'|'orange'|'teal';
export type ActionId='employment'|'services'|'products'|'offer';
export type NexoShortcut={id:string;title:string;route:string};
export type RuntimeSettings={accent:Accent;action_order:ActionId[];shortcuts?:NexoShortcut[];updated_at?:string};
export type ControlIdea={id:number;title:string;description:string;category:'feature'|'bug'|'design'|'automation';status:'pending'|'review'|'approved'|'implemented'|'rejected';created_at:string;updated_at:string};
export type ControlMetrics={
 total:number;resolved:number;unresolved:number;searches:number;
 topics:{key:string;label:string;count:number;unresolved:number}[];
 searchCategories:{name:string;count:number}[];
 workflows:{count:number;latest:{name:string;status:string;conclusion:string|null;created_at:string}[]}|null;
};
export type ControlFeedback={
 response_id:string;assistant_id:'nexo'|'nexa';intent_key:string;
 rating:'up'|'down'|'comment';comment:string;
 question_text:string|null;answer_text:string|null;context_shared:boolean;
 review_status:'pending'|'review'|'implemented'|'rejected';review_note:string;
 created_at:string;updated_at:string;
};
export type ControlDashboard={
 account:{email:string;role:string};metrics:ControlMetrics;settings:RuntimeSettings;
 ideas:ControlIdea[];audit:{id:number;action:string;detail:Record<string,unknown>;created_at:string}[];
 feedback:ControlFeedback[];
 feedbackTotals:{total:number;likes:number;dislikes:number;comments:number};
 feedbackHasMore:boolean;
};
export type NexoAdminUser={
 id:string;email:string|null;created_at:string;centralized_at?:string;
 historical_imported_at?:string|null;recovered_from_device?:boolean;
 email_confirmed_at:string|null;
 first_name:string;first_surname:string;username:string;full_name:string;
 role:string|null;education:string|null;specialty:string|null;
 experience:string|null;availability:string|null;work_mode:string|null;
 skills:string|null;bio:string|null;photo_data_url:string|null;
 profile_updated:string|null;
};
export type NexoAdminUserDirectory={total:number;recovered:number;users:NexoAdminUser[];
 page:number;pageSize:number};
export type NexoUserSort='az'|'za'|'newest'|'oldest'|'newest_az'|'oldest_az';
export async function loadNexoUserDirectory(
 query='',sort:NexoUserSort='newest',page=0
):Promise<NexoAdminUserDirectory>{
 const token=await sessionToken();
 const params=new URLSearchParams({scope:'users',q:query.slice(0,100),
  sort,page:String(Math.max(0,Math.floor(page)))});
 const response=await fetch(BASE+'/functions/v1/nexo-control?'+params.toString(),{
  headers:{...headers(),Authorization:'Bearer '+token},cache:'no-store',
 });
 const data=await check(response);
 if(!Array.isArray(data?.users)||!Number.isFinite(Number(data.total)))
  throw new Error('La lista de usuarios no tiene un formato válido.');
 return {total:Number(data.total),recovered:Number(data.recovered||0),users:data.users,
  page:Number(data.page)||0,pageSize:Number(data.pageSize)||40};
}
type Session={access_token:string;refresh_token:string;expires_at:number};
const headers=()=>({'apikey':KEY,'content-type':'application/json'});
async function check(response:Response){
 const data=await response.json().catch(()=>({error:'Respuesta inválida'}));
 if(!response.ok)throw new Error(data.msg||data.error_description||data.error||'No se pudo completar la solicitud');
 return data;
}
function saveSession(s:Session|null){
 if(!isWeb())return;
 if(s)window.sessionStorage.setItem(STORAGE,JSON.stringify(s));
 else window.sessionStorage.removeItem(STORAGE);
}
function readSession():Session|null{
 if(!isWeb())return null;
 try{
  const data=JSON.parse(window.sessionStorage.getItem(STORAGE)||'null');
  return typeof data?.access_token==='string'&&typeof data?.refresh_token==='string'?data:null;
 }catch{return null;}
}
function fromAuth(data:any){
 if(typeof data?.access_token!=='string'||typeof data?.refresh_token!=='string')
  throw new Error('El acceso no devolvió una sesión válida.');
 const session:Session={
  access_token:data.access_token,refresh_token:data.refresh_token,
  expires_at:Math.floor(Date.now()/1000)+(Number(data.expires_in)||3600),
 };
 saveSession(session);return session;
}
export async function sendControlEmail(email:string):Promise<void>{
 if(!isWeb())throw new Error('Abre el panel desde el navegador.');
 if(!email.includes('@')||email.length>250)throw new Error('Escribe un correo válido.');
 const redirect='https://armentamarcos61-png.github.io/nexo-app/nexo-control.html';
 await check(await fetch(BASE+'/auth/v1/otp?redirect_to='+encodeURIComponent(redirect),{
  method:'POST',headers:headers(),body:JSON.stringify({email:email.trim(),create_user:true}),
 }));
}
export async function verifyControlEmail(email:string,input:string):Promise<void>{
 let token=input.trim(),type='email',hash='';
 if(token.startsWith('http')){
  const link=new URL(token);hash=link.searchParams.get('token_hash')||'';
  token=link.searchParams.get('token')||token;
  type=link.searchParams.get('type')||'magiclink';
 }
 const inputBody=hash?{token_hash:hash,type}:{
  email:email.trim(),token,type:/^\d{6,8}$/.test(token)?'email':type,
 };
 const response=await fetch(BASE+'/auth/v1/verify',{
  method:'POST',headers:headers(),body:JSON.stringify(inputBody),
 });
 fromAuth(await check(response));
}
export async function acceptControlRedirect():Promise<boolean>{
 if(!isWeb())return false;
 const hash=new URLSearchParams(window.location.hash.replace(/^#/,''));
 if(!hash.get('access_token'))return false;
 fromAuth({
  access_token:hash.get('access_token'),refresh_token:hash.get('refresh_token'),
  expires_in:Number(hash.get('expires_in')||3600),
 });
 window.history.replaceState({},'',window.location.pathname+window.location.search);
 return true;
}
async function sessionToken():Promise<string>{
 const session=readSession();
 if(!session)throw new Error('Inicia sesión con tu correo de administrador.');
 if(session.expires_at>Date.now()/1000+90)return session.access_token;
 const response=await fetch(BASE+'/auth/v1/token?grant_type=refresh_token',{
  method:'POST',headers:headers(),body:JSON.stringify({refresh_token:session.refresh_token}),
 });
 if(!response.ok){saveSession(null);throw new Error('Tu sesión venció. Vuelve a verificar tu correo.');}
 return fromAuth(await check(response)).access_token;
}
export function controlLogout(){saveSession(null);}
export function hasControlSession(){return !!readSession();}
async function controlRequest(method:'GET'|'POST',body?:object,query=''):Promise<any>{
 const token=await sessionToken();
 const response=await fetch(BASE+'/functions/v1/nexo-control'+query,{
  method,headers:{...headers(),Authorization:'Bearer '+token},
  ...(body?{body:JSON.stringify(body)}:{}),
 });
 return check(response);
}
export async function loadControlDashboard():Promise<ControlDashboard>{
 return controlRequest('GET');
}
export async function loadControlFeedbackPage(offset:number){
 const page=await controlRequest('GET',undefined,'?scope=feedback&offset='+Math.max(0,offset)+'&limit=50');
 return page as Pick<ControlDashboard,'feedback'|'feedbackTotals'|'feedbackHasMore'>;
}
export async function controlUpdateFeedbackReview(responseId:string,status:ControlFeedback['review_status'],note:string){
 return controlRequest('POST',{action:'update_feedback_review',responseId,status,note});
}
export async function controlCreateIdea(title:string,description:string,category:ControlIdea['category']){
 return controlRequest('POST',{action:'create_idea',title,description,category});
}
export async function controlIdeaStatus(id:number,status:ControlIdea['status']){
 return controlRequest('POST',{action:'update_idea',id,status});
}
export async function controlApplySettings(settings:RuntimeSettings){
 return controlRequest('POST',{action:'apply_settings',accent:settings.accent,
  action_order:settings.action_order});
}
const orderIds:ActionId[]=['employment','services','products','offer'];
export const defaultNexoSettings:RuntimeSettings={accent:'cyan',action_order:orderIds,shortcuts:[]};
export async function loadNexoPublicSettings():Promise<RuntimeSettings>{
 const response=await fetch(BASE+'/functions/v1/nexo-control?scope=public',{
  headers:{apikey:KEY},cache:'no-store',
 });
 const json=await check(response);
 if(!['cyan','violet','orange','teal'].includes(json.accent)||
  !Array.isArray(json.action_order)||json.action_order.length!==4||
  !orderIds.every(x=>json.action_order.includes(x)))
  return defaultNexoSettings;
 const allowed=['/explorar','/productos','/portafolios','/asistente','/perfil','/publicar/servicio','/publicar/producto'];
 const shortcuts=Array.isArray(json.shortcuts)?json.shortcuts
  .filter((x:unknown):x is NexoShortcut=>{
    if(!x||typeof x!=='object')return false;
    const item=x as Record<string,unknown>;
    return typeof item.id==='string'&&typeof item.title==='string'&&
      item.title.length<=60&&typeof item.route==='string'&&allowed.includes(item.route);
  }).slice(0,6):[];
 return {accent:json.accent,action_order:json.action_order,shortcuts};
}
export type SearchSource='marketplace'|'products'|'employment'|'services'|'nexa_external';
export type SearchCategory='employment'|'services'|'products'|'general'|'nexa';
export async function countNexoSearch(source:SearchSource,category:SearchCategory):Promise<void>{
 try{
  await fetch(BASE+'/functions/v1/nexo-control',{method:'POST',headers:headers(),
   body:JSON.stringify({action:'search_event',source,category})});
 }catch{ /* Anonymous aggregate analytics must not affect browsing. */ }
}
export type ParsedControlCommand=
 |{kind:'settings';settings:RuntimeSettings;explanation:string}
 |{kind:'idea';title:string;description:string;category:ControlIdea['category']};
export function parseControlCommand(input:string,current:RuntimeSettings):ParsedControlCommand{
 const text=input.toLocaleLowerCase('es').normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
 let accent=current.accent;
 if(/\b(naranja|anaranjado)\b/.test(text))accent='orange';
 else if(/\b(morado|violeta|purpura)\b/.test(text))accent='violet';
 else if(/\b(verde|turquesa)\b/.test(text))accent='teal';
 else if(/\b(azul|cian|celeste)\b/.test(text))accent='cyan';
 const named:Record<ActionId,string[]>={
  employment:['empleo','trabajo','vacantes'],services:['servicios','contratar'],
  products:['productos','tienda'],offer:['ofrecer','ofrezco'],
 };
 const mentions=(Object.entries(named) as [ActionId,string[]][])
  .filter(([,words])=>words.some(w=>text.includes(w))).map(([id])=>id);
 let order=[...current.action_order];
 if(mentions.length&&/\b(primero|primera|inicio|arriba|antes)\b/.test(text)){
  const id=mentions[0];order=[id,...order.filter(x=>x!==id)];
 }else if(mentions.length&&/\b(ultimo|ultima|abajo|final)\b/.test(text)){
  const id=mentions[0];order=[...order.filter(x=>x!==id),id];
 }
 if(accent!==current.accent||order.join('|')!==current.action_order.join('|')){
  return {kind:'settings',settings:{accent,action_order:order},
   explanation:'Cambiar el color y el orden de tarjetas de inicio. Aplicar después de confirmar.'};
 }
 const category:ControlIdea['category']=
  /\b(error|falla|fallo|corregir|arreglar)\b/.test(text)?'bug':
  /\b(color|diseno|estilo|fuente|letra)\b/.test(text)?'design':
  /\b(automatizar|automatico|alerta)\b/.test(text)?'automation':'feature';
 return {kind:'idea',title:input.trim().slice(0,120),description:input.trim(),category};
}
