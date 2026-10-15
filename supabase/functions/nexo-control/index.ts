import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@6";

const url = Deno.env.get("SUPABASE_URL") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const palette = ["cyan", "violet", "orange", "teal"];
const kinds = ["employment", "services", "products", "offer"];
const statuses = ["pending", "review", "approved", "implemented", "rejected"];
const categories = ["feature", "bug", "design", "automation"];
const routes=["/explorar","/productos","/portafolios","/asistente","/perfil","/publicar/servicio","/publicar/producto"];
const json = (data: unknown, status=200) => new Response(JSON.stringify(data), {
  status, headers: {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
  },
});
const fail=(code:number,message:string)=>json({error:message},code);
const exact=(a:unknown,b:string[])=>Array.isArray(a)&&a.length===b.length&&
  new Set(a).size===b.length && a.every(x=>typeof x==="string"&&b.includes(x));
function intCount(x:unknown):number {
  const n=Number(x);
  return Number.isFinite(n)&&n>=0?n:0;
}
async function admin(req:Request):Promise<{id:string,email:string,role:string}|null>{
  const token=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"").trim();
  if(!token||token.length>5000||token===anonKey)return null;
  const authClient=createClient(url,anonKey,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await authClient.auth.getUser(token);
  const user=data?.user;
  if(error||!user?.id||!user?.email||!user.email_confirmed_at)return null;
  const email=user.email.trim().toLowerCase();
  const {data:member,error:memberError}=await db.from("nexo_admin_members")
    .select("email,role,enabled").eq("email",email).maybeSingle();
  if(memberError||!member?.enabled)return null;
  return {id:user.id,email,role:member.role};
}
async function settings(){
  const {data,error}=await db.from("nexo_control_settings")
    .select("accent,action_order,shortcuts,updated_at").eq("id","global").single();
  if(error)throw error;
  return data;
}
async function audit(actor:string,action:string,detail:object){
  await db.from("nexo_control_audit").insert({actor,action,detail});
}
async function feedbackPage(offset=0,limit=50){
  const page=Math.min(100,Math.max(1,Math.trunc(Number(limit)||50)));
  const start=Math.max(0,Math.min(1000000,Math.trunc(Number(offset)||0)));
  const columns="response_id,assistant_id,intent_key,rating,comment,question_text,answer_text,context_shared,review_status,review_note,created_at,updated_at";
  const [recent,total,likes,dislikes,comments]=await Promise.all([
    db.from("nexo_assistant_feedback").select(columns)
      .order("updated_at",{ascending:false}).order("response_id",{ascending:true})
      .range(start,start+page-1),
    db.from("nexo_assistant_feedback").select("response_id",{count:"exact",head:true}),
    db.from("nexo_assistant_feedback").select("response_id",{count:"exact",head:true}).eq("rating","up"),
    db.from("nexo_assistant_feedback").select("response_id",{count:"exact",head:true}).eq("rating","down"),
    db.from("nexo_assistant_feedback").select("response_id",{count:"exact",head:true}).neq("comment",""),
  ]);
  if(recent.error||total.error||likes.error||dislikes.error||comments.error)
    throw new Error("No se pudo cargar el historial de mejora.");
  const feedback=recent.data||[];
  const feedbackTotals={total:total.count||0,likes:likes.count||0,
    dislikes:dislikes.count||0,comments:comments.count||0};
  return {feedback,feedbackTotals,feedbackHasMore:start+feedback.length<feedbackTotals.total};
}
async function dashboard(actor:{id:string,email:string,role:string}){
  const [cfg, metricsRes, ideasRes, auditRes, searchRes, jobsRes]=await Promise.all([
    settings(),
    db.from("assistant_question_metrics").select("metric_date,intent_key,label,category,section,assistant_id,resolved,question_count").order("metric_date",{ascending:false}).limit(3000),
    db.from("nexo_control_ideas").select("id,title,description,category,status,created_at,updated_at").order("created_at",{ascending:false}).limit(100),
    db.from("nexo_control_audit").select("id,action,detail,created_at").order("created_at",{ascending:false}).limit(20),
    db.from("nexo_search_counts").select("metric_date,source,category,event_count").order("metric_date",{ascending:false}).limit(1000),
    db.from("nexo_coding_jobs").select("idea_id,status,pull_request_url,error,created_at,finished_at").order("created_at",{ascending:false}).limit(80),
  ]);
  if(metricsRes.error||ideasRes.error||auditRes.error||searchRes.error||jobsRes.error)
    throw new Error("No se pudieron consultar las métricas del panel.");
  let total=0,resolved=0;
  const byTopic=new Map<string,{key:string,label:string,count:number,unresolved:number}>();
  for(const m of metricsRes.data||[]){
    const count=intCount(m.question_count);
    total+=count;if(m.resolved)resolved+=count;
    const key=m.intent_key;
    const record=byTopic.get(key)||{key,label:m.label||key,count:0,unresolved:0};
    record.count+=count;
    if(!m.resolved)record.unresolved+=count;
    byTopic.set(key,record);
  }
  const searches=(searchRes.data||[]).reduce((n,x)=>n+intCount(x.event_count),0);
  const searchesByCategory=new Map<string,number>();
  for(const m of searchRes.data||[]){
    const label=m.category||m.source;
    searchesByCategory.set(label,(searchesByCategory.get(label)||0)+intCount(m.event_count));
  }
  let deployments:null|{count:number;latest:{name:string,status:string,conclusion:string|null,created_at:string}[]} = null;
  try{
    const response=await fetch("https://api.github.com/repos/armentamarcos61-png/nexo-app/actions/runs?per_page=10",{
      headers:{"accept":"application/vnd.github+json","user-agent":"NexoControl/1.0"},
      signal:AbortSignal.timeout(3200),
    });
    if(response.ok){
      const runs=await response.json();
      const list=Array.isArray(runs.workflow_runs)?runs.workflow_runs:[];
      deployments={count:Number(runs.total_count)||0,
        latest:list.slice(0,6).map((r:any)=>({name:String(r.name||"Publicación"),
          status:String(r.status||"unknown"),conclusion:r.conclusion||null,created_at:String(r.created_at||"")}))};
    }
  }catch{ /* Source unavailable; never invent counts. */ }
  // An admin's preexisting "viewer" role cannot read user feedback.
  // Only the specifically allowlisted owner and developers can review it.
  // Viewer accounts never see individual feedback, including user comments.
  const history=(actor.role==="owner"||actor.role==="developer")
    ?await feedbackPage():{feedback:[],feedbackTotals:{total:0,likes:0,dislikes:0,comments:0},feedbackHasMore:false};
  const {feedback,feedbackTotals,feedbackHasMore}=history;
  return {account:{email:actor.email,role:actor.role},
    metrics:{total,resolved,unresolved:total-resolved,
      topics:[...byTopic.values()].sort((a,b)=>b.count-a.count).slice(0,25),
      searches,searchCategories:[...searchesByCategory.entries()].map(([name,count])=>({name,count})).sort((a,b)=>b.count-a.count),
      // Count of workflow runs, not a claimed number of completed features.
      workflows:deployments,
    },
    settings:cfg,ideas:ideasRes.data||[],audit:auditRes.data||[],coding_jobs:jobsRes.data||[],
    feedback,feedbackTotals,feedbackHasMore};
}
const jwks=createRemoteJWKSet(new URL("https://token.actions.githubusercontent.com/.well-known/jwks"));
async function verifyGithubRunner(req:Request):Promise<boolean>{
 const raw=req.headers.get("authorization")?.replace(/^Bearer\s+/i,"")||"";
 if(!raw||raw.length>7000)return false;
 try{
  const {payload}=await jwtVerify(raw,jwks,{
   issuer:"https://token.actions.githubusercontent.com",audience:"nexo-control-agent",
  });
  return payload.repository==="armentamarcos61-png/nexo-app" &&
   payload.ref==="refs/heads/main" &&
   typeof payload.workflow_ref==="string" &&
   payload.workflow_ref==="armentamarcos61-png/nexo-app/.github/workflows/nexo-coding-agent.yml@refs/heads/main";
 }catch{return false;}
}
async function leaseAgentTask(){
 const {data,error}=await db.from("nexo_control_ideas")
  .select("id,title,description,category").eq("status","approved")
  .order("created_at",{ascending:true}).limit(1);
 if(error)throw error;
 const task=data?.[0];
 if(!task)return null;
 const {data:locked,error:lockError}=await db.from("nexo_control_ideas")
  .update({status:"review",updated_at:new Date().toISOString()})
  .eq("id",task.id).eq("status","approved").select("id").maybeSingle();
 if(lockError)throw lockError;
 if(!locked)return null;
 const {error:jobError}=await db.from("nexo_coding_jobs")
  .upsert({idea_id:task.id,status:"running",started_at:new Date().toISOString(),
   finished_at:null,error:null,pull_request_url:null},{onConflict:"idea_id"});
 if(jobError)throw jobError;
 return task;
}
async function reportAgentTask(body:any){
 const id=Number(body.idea_id);
 if(!Number.isSafeInteger(id)||id<1)return fail(400,"ID de solicitud inválido");
 const state=body.success===true?"pr_ready":"failed";
 const {error}=await db.from("nexo_coding_jobs").update({
  status:state,branch:typeof body.branch==="string"?body.branch.slice(0,100):null,
  pull_request_url:typeof body.pr_url==="string"&&/^https:\/\/github\.com\/armentamarcos61-png\/nexo-app\/pull\/\d+$/.test(body.pr_url)?body.pr_url:null,
  error:state==="failed"?(typeof body.error==="string"?body.error.slice(0,550):"Error de compilación"):null,
  finished_at:new Date().toISOString(),
 }).eq("idea_id",id);
 if(error)throw error;
 return json({ok:true,status:state});
}

Deno.serve(async(req:Request)=>{
  if(req.method==="OPTIONS")return json({ok:true});
  try{
    const scope=new URL(req.url).searchParams.get("scope");
    if(scope==="agent"){
      if(!await verifyGithubRunner(req))return fail(403,"Sólo la tarea oficial de GitHub Actions puede acceder.");
      if(req.method==="GET")return json({task:await leaseAgentTask()});
      if(req.method==="POST")return reportAgentTask(await req.json().catch(()=>({})));
      return fail(405,"Método no permitido");
    }
    if(req.method==="GET"){
      const scope=new URL(req.url).searchParams.get("scope");
      if(scope==="public"){
        const cfg=await settings();
        return json({accent:cfg.accent,action_order:cfg.action_order,shortcuts:cfg.shortcuts||[]});
      }
      const actor=await admin(req);
      if(!actor)return fail(403,"Acceso de desarrollador no autorizado. Verifica tu correo con Supabase.");
      if(scope==="feedback"){
        if(actor.role!=="owner"&&actor.role!=="developer")return fail(403,"Solo desarrolladores autorizados.");
        const params=new URL(req.url).searchParams;
        return json(await feedbackPage(Number(params.get("offset")||0),Number(params.get("limit")||50)));
      }
      return json(await dashboard(actor));
    }
    if(req.method!=="POST")return fail(405,"Método no permitido");
    if(Number(req.headers.get("content-length")||0)>7500)return fail(413,"Solicitud demasiado grande");
    const body=await req.json().catch(()=>null);
    if(!body||typeof body!=="object"||Array.isArray(body))return fail(400,"Solicitud inválida");
    if(body.action==="assistant_feedback"){
      // Anonymous guest write, authenticated verified-developer read.
      const responseId=typeof body.responseId==="string"?body.responseId:"";
      const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if(!uuid.test(responseId)||!["nexa","nexo"].includes(body.assistantId)||
        !["up","down","comment"].includes(body.rating)||
        typeof body.intentKey!=="string"||
        !/^[a-z][a-z0-9_.-]{0,63}$/.test(body.intentKey))
        return fail(400,"Respuesta o valoración inválida.");
      const comment=typeof body.comment==="string"?body.comment.trim():"";
      if(comment.length>1200||(body.rating==="comment"&&!comment)||
        (body.comment!==undefined&&typeof body.comment!=="string"))
        return fail(400,"Escribe un comentario válido, máximo 1200 caracteres.");
      const sharing=body.includeContext===true;
      const question=sharing&&typeof body.question==="string"?body.question.trim():"";
      const answer=sharing&&typeof body.answer==="string"?body.answer.trim():"";
      if(sharing&&(!question||!answer||question.length>300||answer.length>1200))
        return fail(400,"Revisa la pregunta o respuesta compartida.");
      // Hash a short IP in the backend; never store its raw value.
      const address=(req.headers.get("x-forwarded-for")||
        req.headers.get("cf-connecting-ip")||"unknown").split(",")[0].trim().slice(0,90);
      const encoded=new TextEncoder().encode(serviceKey+":"+address);
      const digest=new Uint8Array(await crypto.subtle.digest("SHA-256",encoded));
      const clientHash=Array.from(digest).map(n=>n.toString(16).padStart(2,"0")).join("");
      const {data:existing,error:existingError}=await db.from("nexo_assistant_feedback")
        .select("response_id,client_hash").eq("response_id",responseId).maybeSingle();
      if(existingError)throw existingError;
      if(existing&&existing.client_hash!==clientHash)
        return fail(409,"La valoración no corresponde a esta sesión.");
      if(!existing){
        const since=new Date(Date.now()-60*60*1000).toISOString();
        const {count,error:countError}=await db.from("nexo_assistant_feedback")
          .select("response_id",{count:"exact",head:true})
          .eq("client_hash",clientHash).gte("created_at",since);
        if(countError)throw countError;
        if((count||0)>=15)
          return fail(429,"Límite temporal de comentarios. Intenta más tarde.");
      }
      // Only user-owned feedback fields can change after submission:
      // an existing developer review must never be reset by an edited comment.
      const feedbackData={
        assistant_id:body.assistantId,intent_key:body.intentKey,
        rating:body.rating,comment,
        question_text:sharing?question:null,answer_text:sharing?answer:null,
        context_shared:sharing,updated_at:new Date().toISOString(),
      };
      const result=existing
        ?await db.from("nexo_assistant_feedback").update(feedbackData)
           .eq("response_id",responseId).eq("client_hash",clientHash)
        :await db.from("nexo_assistant_feedback").insert({
           response_id:responseId,...feedbackData,client_hash:clientHash,
         });
      if(result.error)throw result.error;
      return json({ok:true});
    }
    if(body.action==="search_event"){
      if(!["marketplace","products","employment","services","nexa_external"].includes(body.source) ||
         !["employment","services","products","general","nexa"].includes(body.category))
        return fail(400,"Categoría no válida");
      const {error}=await db.rpc("nexo_record_search", {p_source:body.source,p_category:body.category});
      if(error)throw error;
      return json({ok:true});
    }
    const actor=await admin(req);
    if(!actor)return fail(403,"Sólo un administrador verificado puede modificar Nexo Control.");
    if(actor.role==="viewer")return fail(403,"Esta cuenta tiene acceso de solo lectura.");
    if(body.action==="update_feedback_review"){
      if(actor.role!=="owner"&&actor.role!=="developer")return fail(403,"Solo desarrolladores autorizados.");
      const responseId=typeof body.responseId==="string"?body.responseId:"";
      const validId=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const allowed=["pending","review","implemented","rejected"];
      const note=typeof body.note==="string"?body.note.trim():"";
      if(!validId.test(responseId)||!allowed.includes(body.status)||note.length>800
         ||(body.note!==undefined&&typeof body.note!=="string"))
        return fail(400,"Revisa el estado y la nota de mejora.");
      const {data,error}=await db.from("nexo_assistant_feedback")
        .update({review_status:body.status,review_note:note})
        .eq("response_id",responseId)
        .select("response_id,review_status,review_note").maybeSingle();
      if(error)throw error;
      if(!data)return fail(404,"La valoración ya no existe.");
      await audit(actor.id,"feedback_review",{response_id:responseId,status:body.status});
      return json({ok:true,entry:data});
    }
    if(body.action==="create_idea"){
      const description=typeof body.description==="string"?body.description.trim():"";
      const title=typeof body.title==="string"?body.title.trim():"";
      const category=categories.includes(body.category)?body.category:"feature";
      if(!title||title.length>150||!description||description.length>2000)return fail(400,"Completa título y descripción (máximo 2,000 caracteres).");
      const {data,error}=await db.from("nexo_control_ideas").insert({
        title,description,category,created_by:actor.id,
        status:body.auto_build===true?"approved":"pending",
      }).select("id,title,status").single();
      if(error)throw error;
      await audit(actor.id,"create_idea",{id:data.id,category,auto_build:body.auto_build===true});
      return json({ok:true,idea:data});
    }
    if(body.action==="update_idea"){
      const id=Number(body.id);
      if(!Number.isSafeInteger(id)||id<1||!statuses.includes(body.status))return fail(400,"Estado no válido");
      const {data,error}=await db.from("nexo_control_ideas").update({
        status:body.status,updated_at:new Date().toISOString(),
      }).eq("id",id).select("id,status").maybeSingle();
      if(error||!data)return fail(404,"Idea no encontrada");
      await audit(actor.id,"update_idea",{id,status:body.status});
      return json({ok:true,idea:data});
    }
    if(body.action==="add_shortcut"){
      const title=typeof body.title==="string"?body.title.trim():"";
      if(!title||title.length>60||!routes.includes(body.route))
        return fail(400,"Título o pantalla destino no permitidos.");
      const current=await settings();
      const saved=Array.isArray(current.shortcuts)?current.shortcuts:[];
      if(saved.length>=6)return fail(409,"Hay seis accesos directos; elimina uno antes de agregar otro.");
      const entry={id:crypto.randomUUID(),title,route:body.route};
      const {error}=await db.from("nexo_control_settings")
        .update({shortcuts:[...saved,entry],updated_by:actor.id,updated_at:new Date().toISOString()})
        .eq("id","global");
      if(error)throw error;
      await audit(actor.id,"add_shortcut",{id:entry.id,title,route:entry.route});
      return json({ok:true,shortcut:entry});
    }
    if(body.action==="remove_shortcut"){
      const id=typeof body.id==="string"?body.id:"";
      const current=await settings();
      const saved=Array.isArray(current.shortcuts)?current.shortcuts:[];
      const next=saved.filter((entry:any)=>entry?.id!==id);
      if(saved.length===next.length)return fail(404,"Acceso directo no encontrado");
      const {error}=await db.from("nexo_control_settings")
        .update({shortcuts:next,updated_by:actor.id,updated_at:new Date().toISOString()}).eq("id","global");
      if(error)throw error;
      await audit(actor.id,"remove_shortcut",{id});
      return json({ok:true});
    }
    if(body.action==="apply_settings"){
      if(!palette.includes(body.accent)||!exact(body.action_order,kinds))
        return fail(400,"Sólo se permiten colores y órdenes predefinidos.");
      const {data,error}=await db.from("nexo_control_settings").update({
        accent:body.accent,action_order:body.action_order,
        updated_at:new Date().toISOString(),updated_by:actor.id,
      }).eq("id","global").select("accent,action_order,shortcuts,updated_at").single();
      if(error)throw error;
      await audit(actor.id,"apply_settings",{accent:body.accent,order:body.action_order});
      return json({ok:true,settings:data});
    }
    return fail(400,"Acción no reconocida. Las órdenes desconocidas no ejecutan código.");
  }catch(err){
    console.error("nexo-control:",err);
    return fail(500,"No se pudo completar la operación. Intenta nuevamente.");
  }
});