/**
 * Cloud identity for new Nexo accounts. Local v1 accounts can still sign in
 * on the device where they were created; they aren't silently uploaded.
 * Supabase handles email verification, JWTs and password hashes on the server.
 * This module never sends any password to the developer dashboard.
 */
import type { ProfessionalProfile } from '@/state/professional-profile';

const BASE='https://wfwyftxbanwvixplzhcd.supabase.co';
const KEY='sb_publishable_UY_rNqVKNwofYYv-p8lb0w_DvGkQBXi';
const SESSION='nexo.cloud.identity.v1';
const signal=(ms:number)=>typeof AbortSignal!=='undefined'&&
 typeof AbortSignal.timeout==='function'?AbortSignal.timeout(ms):undefined;
type CloudSession={access_token:string;refresh_token:string;expires_at:number;user_id:string};
export type CloudUser={id:string;email:string;firstName:string;firstSurname:string;username:string};
const headers={'apikey':KEY,'content-type':'application/json'};
function storage(){
 if(typeof window==='undefined')return null;
 try{return window.sessionStorage;}catch{return null;}
}
function read():CloudSession|null{
 try{
  const item=storage()?.getItem(SESSION);
  if(!item)return null;
  const data=JSON.parse(item);
  if(!data?.access_token||!data.refresh_token||!data.user_id)return null;
  return data as CloudSession;
 }catch{return null;}
}
function keep(json:any):boolean{
 const access_token=json?.access_token,refresh_token=json?.refresh_token;
 const user_id=json?.user?.id;
 if(typeof access_token!=='string'||typeof refresh_token!=='string'||
   typeof user_id!=='string')return false;
 const session:CloudSession={access_token,refresh_token,user_id,
  expires_at:Math.floor(Date.now()/1000)+(Number(json.expires_in)||3600)};
 try{storage()?.setItem(SESSION,JSON.stringify(session));}catch{/* private mode */}
 return true;
}
export function clearCloudSession(){
 try{storage()?.removeItem(SESSION);}catch{/* inaccessible */}
}
async function parse(response:Response){
 const json=await response.json().catch(()=>null);
 if(!response.ok)throw Error(json?.msg||json?.error_description||
  json?.error||'No se pudo verificar la cuenta en el servidor.');
 return json;
}
function currentCloudUser(json:any):CloudUser|null{
 const user=json?.user;
 if(!user?.id||typeof user.email!=='string')return null;
 const meta=user.user_metadata||{};
 return {id:user.id,email:user.email,
  firstName:String(meta.firstName||''),firstSurname:String(meta.firstSurname||''),
  username:String(meta.username||'')};
}
export async function cloudRegister(input:{
 email:string;password:string;username:string;firstName:string;firstSurname:string;
}):Promise<{registered:boolean;needsEmailVerification:boolean}>{
 const result=await parse(await fetch(BASE+'/auth/v1/signup?redirect_to='+encodeURIComponent(
   'https://armentamarcos61-png.github.io/nexo-app/'),{
  method:'POST',headers,signal:signal(8500),body:JSON.stringify({
   email:input.email.trim().toLowerCase(),
   password:input.password,
   data:{firstName:input.firstName.trim().slice(0,40),
    firstSurname:input.firstSurname.trim().slice(0,50),
    username:input.username.trim().toLowerCase().slice(0,24)},
  }),
 }));
 if(!result?.user?.id)throw Error('No se pudo crear la cuenta central.');
 const active=keep(result);
 return {registered:true,needsEmailVerification:!active};
}
export async function cloudLogin(email:string,password:string):Promise<CloudUser>{
 if(!email.includes('@'))throw Error('Para entrar desde otro dispositivo, escribe tu correo.');
 const json=await parse(await fetch(BASE+'/auth/v1/token?grant_type=password',{
  method:'POST',headers,signal:signal(7000),body:JSON.stringify({email:email.trim().toLowerCase(),password}),
 }));
 const user=currentCloudUser(json);
 if(!user||!keep(json))throw Error('La cuenta no devolvió una sesión válida.');
 return user;
}
export async function getCloudAccess():Promise<{token:string;userId:string}>{
 const session=read();
 if(!session)throw Error('Vincula tu cuenta con el correo verificado para sincronizar tu currículum.');
 if(session.expires_at>Date.now()/1000+90)
  return {token:session.access_token,userId:session.user_id};
 const refreshed=await parse(await fetch(BASE+'/auth/v1/token?grant_type=refresh_token',{
  method:'POST',headers,body:JSON.stringify({refresh_token:session.refresh_token}),
 }));
 if(!keep(refreshed))throw Error('Tu sesión central venció. Vuelve a iniciar sesión.');
 const next=read();
 if(!next)throw Error('La sesión no está disponible.');
 return {token:next.access_token,userId:next.user_id};
}
/** User-initiated sharing. RLS lets only this logged-in user update their own CV.
 * Never upload unconsented local profile information automatically.
 */
export async function syncMyProfessionalProfile(profile:ProfessionalProfile){
 const {token,userId}=await getCloudAccess();
 const body={
  user_id:userId,role:profile.role.slice(0,100),
  education:profile.education.slice(0,100),
  specialty:profile.specialty.slice(0,140),
  experience:profile.experience.slice(0,100),
  availability:profile.availability.slice(0,100),
  work_mode:profile.workMode.slice(0,100),
  skills:profile.skills.slice(0,1000),
  bio:profile.bio.slice(0,1600),
  photo_data_url:profile.photoDataUrl.startsWith('data:image/jpeg;base64,')?
   profile.photoDataUrl.slice(0,140000):'',
  share_with_developers:true,updated_at:new Date().toISOString(),
 };
 await parse(await fetch(BASE+'/rest/v1/nexo_professional_profiles?on_conflict=user_id',{
  method:'POST',
  headers:{...headers,Authorization:'Bearer '+token,
   Prefer:'resolution=merge-duplicates,return=minimal'},
  body:JSON.stringify(body),
 }));
}
export async function revokeProfessionalProfileShare(){
 const {token,userId}=await getCloudAccess();
 const resp=await fetch(BASE+'/rest/v1/nexo_professional_profiles?user_id=eq.'+
  encodeURIComponent(userId),{method:'DELETE',
  headers:{...headers,Authorization:'Bearer '+token}});
 if(!resp.ok)throw Error('No se pudo desactivar la sincronización.');
}
