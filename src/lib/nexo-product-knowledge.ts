/**
 * Verified product knowledge shared by Nexo and Nexa.
 * A browser cannot retrain an LLM or reliably discover secret backend changes.
 * Instead it checks an audited, versioned manifest derived from app source and
 * refreshes it without questions being asked. User chat is NEVER used as fact.
 */
export type NexoCapability='home'|'explore'|'products'|'publishProducts'|'drafts'|
 'profile'|'portfolio'|'assistants'|'authentication'|'passwordRecovery'|
 'publishWork'|'categories';
export type NexoCapabilityStatus='available'|'unavailable';
export type NexoKnowledgeManifest={
 schema:1;revision:string;generatedAt:string;
 capabilities:Record<NexoCapability,{status:NexoCapabilityStatus;evidence:string[]}>;
};
export type NexoKnowledgeReply={
 text:string;topic:string;verified:boolean;confidence:number;
 status:'available'|'planned'|'unverified'|'scope';
};
export type NexoKnowledgeAudit={
 topic:string;status:NexoKnowledgeReply['status'];verified:boolean;when:string;
};
const DEFAULT_CAPABILITIES:Record<NexoCapability,{status:NexoCapabilityStatus;evidence:string[]}>={
 home:{status:'available',evidence:['src/app/index.tsx']},
 explore:{status:'available',evidence:['src/app/explorar.tsx']},
 products:{status:'available',evidence:['src/app/productos.tsx']},
 publishProducts:{status:'available',evidence:['src/app/publicar/[tipo].tsx','src/state/marketplace.tsx']},
 drafts:{status:'available',evidence:['src/app/borradores.tsx','src/state/drafts.tsx']},
 profile:{status:'available',evidence:['src/app/perfil.tsx']},
 portfolio:{status:'available',evidence:['src/app/portafolios.tsx']},
 assistants:{status:'available',evidence:['src/app/elegir-asistente.tsx','src/app/asistente.tsx']},
 authentication:{status:'available',evidence:['src/app/iniciar-sesion.tsx','src/app/registrarse.tsx']},
 passwordRecovery:{status:'available',evidence:['src/app/recuperar-contrasena.tsx']},
 publishWork:{status:'available',evidence:['src/app/publicar/[tipo].tsx']},
 categories:{status:'available',evidence:['src/constants/categories.ts']},
};
const defaultManifest:NexoKnowledgeManifest={
 schema:1,revision:'bundled-fallback',generatedAt:'',capabilities:DEFAULT_CAPABILITIES,
};
let manifest:NexoKnowledgeManifest=defaultManifest;
let loadedAt=0;
let activeRefresh:Promise<NexoKnowledgeManifest>|null=null;
const STORAGE='nexo.product-knowledge.v1';
const AUDIT='nexo.product-audit.v1';
const normalize=(text:string)=>text.toLocaleLowerCase('es').normalize('NFD')
 .replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9ñ ]/g,' ')
 .replace(/\s+/g,' ').trim();
const has=(text:string,terms:string[])=>terms.some(term=>text.includes(term));
function validated(payload:unknown):payload is NexoKnowledgeManifest{
 if(!payload||typeof payload!=='object')return false;
 const item=payload as Partial<NexoKnowledgeManifest>;
 if(item.schema!==1||typeof item.revision!=='string'||!item.capabilities)return false;
 return (Object.keys(DEFAULT_CAPABILITIES) as NexoCapability[]).every(id=>{
  const cap=item.capabilities?.[id];
  return (cap?.status==='available'||cap?.status==='unavailable')&&
    Array.isArray(cap.evidence)&&cap.evidence.every(path=>typeof path==='string'&&path.startsWith('src/'));
 });
}
function browser(){return typeof window!=='undefined'&&typeof window.localStorage!=='undefined';}
function assetUrl(){
 const base=typeof process!=='undefined'?process.env.EXPO_BASE_URL:undefined;
 if(base)return (base.endsWith('/')?base:base+'/')+'knowledge/nexo-capabilities.json';
 const prefix=typeof location!=='undefined'&&location.pathname.startsWith('/nexo-app')?'/nexo-app':'';
 return prefix+'/knowledge/nexo-capabilities.json';
}
/** Rechecks approved app facts even when nobody is talking to the assistant.
 * The browser cache is a fallback; same-origin code-generated facts win.
 */
export async function refreshNexoKnowledge(force=false):Promise<NexoKnowledgeManifest>{
 if(!browser())return manifest;
 if(!force&&Date.now()-loadedAt<6*60*60*1000)return manifest;
 if(activeRefresh)return activeRefresh;
 activeRefresh=(async()=>{
  try{
   const cached=JSON.parse(window.localStorage.getItem(STORAGE)||'null') as unknown;
   if(validated(cached)&&manifest.revision==='bundled-fallback')manifest=cached;
  }catch{ /* unavailable storage must not block help */ }
  try{
   const controller=new AbortController();
   const timeout=setTimeout(()=>controller.abort(),6500);
   try{
    const response=await fetch(assetUrl(),{signal:controller.signal,cache:'no-store'});
    if(response.ok){
     const next:unknown=await response.json();
     if(validated(next)){
      manifest=next;
      try{window.localStorage.setItem(STORAGE,JSON.stringify(next));}catch{/* private browsing */}
     }
    }
   }finally{clearTimeout(timeout);}
  }catch{ /* offline: use bundled verified route information */ }
  loadedAt=Date.now();
  return manifest;
 })();
 try{return await activeRefresh;}finally{activeRefresh=null;}
}
export function currentNexoKnowledge(){return manifest;}
export function auditNexoKnowledge(reply:NexoKnowledgeReply):void{
 if(!browser())return;
 try{
  const previous=JSON.parse(window.localStorage.getItem(AUDIT)||'[]') as unknown;
  const entries:NexoKnowledgeAudit[]=Array.isArray(previous)
   ?previous.filter((v):v is NexoKnowledgeAudit=>!!v&&typeof v==='object'&&typeof v.topic==='string').slice(-59):[];
  entries.push({topic:reply.topic,status:reply.status,
   verified:reply.verified,when:new Date().toISOString()});
  // Never save the question, personally identifying details, or guessed facts.
  window.localStorage.setItem(AUDIT,JSON.stringify(entries));
 }catch{/* optional, local only */}
}
type Fact={
 topic:string;intents:string[];terms:string[];
 capability?:NexoCapability;stage:'available'|'planned';
 answer:string;
};
const facts:Fact[]=[
 {topic:'navigation.how_nexo_works',intents:['navigation.how_nexo_works'],
 terms:['como funciona nexo','como se usa nexo','que es nexo','para que sirve nexo',
  'que hace nexo','funciones de nexo','que funciones tiene nexo','que ofrece nexo',
  'que puedo hacer en nexo','como funciona la aplicacion','explica nexo',
  'objetivo de nexo','de que trata nexo'],
 capability:'home',stage:'available',
 answer:'Nexo es una plataforma para conectar personas que buscan empleo, empresas que necesitan trabajadores, quienes ofrecen o contratan servicios y personas que compran o venden productos. En el inicio eliges qué necesitas; en Explorar puedes buscar por tipo de oportunidad, y en Productos puedes consultar publicaciones y publicar tus productos. También tienes perfil, portafolios y los asistentes Nexo y Nexa. Algunas funciones avanzadas, como coordinar pagos o verificar operaciones, todavía están en desarrollo.'},
 {topic:'employment.publish_vacancy',intents:['employment.publish_vacancy'],
 terms:['publicar vacante','crear vacante','subir vacante','ofrecer empleo','anunciar empleo'],
 capability:'publishWork',stage:'available',
 answer:'Para preparar una vacante entra a Publicar y selecciona empleo. Completa los datos del puesto, revisa la información y guarda la publicación o borrador. Nexo todavía no garantiza postulaciones ni contratación automática.'},
 {topic:'employment.find_job',intents:['employment.find_job'],
 terms:['buscar empleo','buscar trabajo','encontrar empleo','conseguir empleo','busco trabajo','busco empleo'],
 capability:'explore',stage:'available',
 answer:'En Inicio toca Buscar empleo; se abre Explorar con la búsqueda de empleo. Puedes revisar opciones y filtros de ocupación, experiencia y disponibilidad. Los resultados dependen de las publicaciones que haya disponibles.'},
 {topic:'employment.hire_worker',intents:['employment.hire_worker'],
 terms:['buscar trabajadores','contratar trabajador','busco personal','necesito empleados'],
 capability:'explore',stage:'available',
 answer:'Abre Explorar y elige Buscar trabajadores. Describe la ocupación, el horario y los requisitos de tu necesidad. Nexo facilita organizar la búsqueda, pero no garantiza que encuentre personal disponible.'},
 {topic:'services.offer_service',intents:['services.offer_service'],
 terms:['ofrecer servicio','publicar servicio','ofrezco un servicio','vender servicio'],
 capability:'publishWork',stage:'available',
 answer:'En Inicio toca Ofrecer un servicio. Añade título, categoría, descripción y zona de trabajo; después revisa el formulario y guarda tu publicación o borrador. El pago y la contratación automatizada aún no están confirmados como funciones activas.'},
 {topic:'services.hire_service',intents:['services.hire_service'],
 terms:['contratar servicio','buscar un servicio','necesito un servicio','busco un servicio'],
 capability:'explore',stage:'available',
 answer:'En Inicio elige Contratar un servicio o entra a Explorar. Selecciona el tipo de servicio y usa la búsqueda para localizar opciones relacionadas con lo que necesitas.'},
 {topic:'products.publish_product',intents:['products.publish_product'],
 terms:['publicar producto','vender producto','subir producto','quiero vender algo'],
 capability:'publishProducts',stage:'available',
 answer:'Abre Productos y toca Publicar producto. Escribe nombre, descripción, precio, categoría y ubicación, agrega al menos una foto o video y confirma la publicación. Se guarda en el Marketplace de este navegador; no prometo sincronización global entre dispositivos.'},
 {topic:'products.find_product',intents:['products.find_product'],
 terms:['comprar producto','buscar producto','marketplace','ver productos'],
 capability:'products',stage:'available',
 answer:'En Productos verás las publicaciones disponibles y una barra para buscar por nombre, descripción, categoría o ubicación. Pulsa Publicar producto si quieres agregar uno.'},
 {topic:'account.password_recovery',intents:['account.password_recovery'],
 terms:['recuperar contrasena','olvide mi contrasena','restablecer contrasena'],
 capability:'passwordRecovery',stage:'available',
 answer:'Desde Iniciar sesión elige la recuperación de contraseña y sigue las indicaciones del correo vinculado a tu cuenta. Nunca compartas tu contraseña ni códigos con el asistente.'},
 {topic:'account.sign_in',intents:['account.sign_in'],
 terms:['iniciar sesion','iniciar mi cuenta','entrar a mi cuenta','login'],
 capability:'authentication',stage:'available',
 answer:'En Iniciar sesión introduce tus credenciales; si todavía no tienes cuenta, abre Registrarse. Tu contraseña no debe enviarse por el chat.'},
 {topic:'account.email',intents:['account.email'],
 terms:['correo invalido','correo incorrecto','cambiar correo'],
 capability:'authentication',stage:'available',
 answer:'Revisa que tu correo esté escrito correctamente y utiliza el formulario de tu cuenta. Para proteger tus datos, no escribas tu contraseña ni códigos de recuperación al asistente.'},
 {topic:'profile.edit_profile',intents:['profile.edit_profile'],
 terms:['editar perfil','cambiar perfil','foto de perfil','mi espacio'],
 capability:'profile',stage:'available',
 answer:'En Perfil o Mi espacio puedes gestionar la información profesional que compartes: tu nombre, foto, experiencia y habilidades. Algunos campos son opcionales.'},
 {topic:'assistant.change_assistant',intents:['assistant.change_assistant'],
 terms:['cambiar asistente','elegir asistente','usar nexa','usar nexo'],
 capability:'assistants',stage:'available',
 answer:'Desde Elige tu asistente puedes seleccionar Nexo o Nexa. Los dos explican las mismas funciones de la aplicación, pero cada uno tiene su propia voz y modelo 3D.'},
 {topic:'other.portfolio',intents:['other.portfolio'],
 terms:['portafolio','portafolios','mostrar mis trabajos'],
 capability:'portfolio',stage:'available',
 answer:'En Portafolios puedes organizar y presentar trabajos por categoría, para mostrar proyectos y experiencia a posibles clientes.'},
 {topic:'other.filters',intents:['other.filters'],
 terms:['filtros de nexo','filtros de empleo','filtrar resultados','como buscar en nexo'],
 capability:'explore',stage:'available',
 answer:'En Explorar puedes elegir una intención como empleo, trabajadores o servicios y utilizar los filtros disponibles para acotar los resultados. No todos los filtros implican que existan publicaciones compatibles.'},
 {topic:'navigation.where_is_feature',intents:['navigation.where_is_feature'],
 terms:['donde esta la funcion','donde esta la opcion','donde puedo encontrar en nexo'],
 capability:'home',stage:'available',
 answer:'Dime qué función de Nexo buscas: empleo y trabajadores están en Explorar, productos en Productos, tus datos en Perfil, y tus trabajos en Portafolios. Si me dices cuál necesitas, te indico la ruta exacta.'},
 {topic:'other.chat',intents:['other.chat'],
 terms:['chat entre usuarios','mensajes entre usuarios','chat con proveedor','chat de nexo'],
 stage:'planned',
 answer:'El chat entre compradores, trabajadores, empresas y proveedores forma parte del proyecto de Nexo, pero no puedo confirmar que el intercambio de mensajes entre usuarios ya funcione en esta versión.'},
 {topic:'other.verification',intents:['other.verification'],
 terms:['verificacion','verificado','palomita','insignia'],
 stage:'planned',
 answer:'La verificación de usuarios después de operaciones exitosas está planeada para ofrecer mayor confianza, pero todavía no la presentaré como activa hasta que el flujo de verificación esté implementado y probado.'},
 {topic:'other.notifications',intents:['other.notifications'],
 terms:['notificaciones','avisos de solicitudes','alertas de la app'],
 stage:'planned',
 answer:'Nexo contempla avisos sobre solicitudes y oportunidades; las notificaciones automáticas completas siguen pendientes de implementación y pruebas.'},
 {topic:'other.commissions',intents:['other.commissions'],
 terms:['comisiones','comision de nexo','cuanto cobra nexo'],
 stage:'planned',
 answer:'La intención de Nexo es tener comisiones bajas y transparentes. No existe aquí una tarifa definitiva confirmada; cuando se habiliten cobros, la comisión deberá aparecer antes de aceptar.'},
 {topic:'payments.how_payments_work',intents:['payments.how_payments_work'],
 terms:['pagos en nexo','como pagar en nexo','como cobra nexo','pago al proveedor'],
 stage:'planned',
 answer:'Nexo planea coordinar pagos y distribuirlos entre participantes, pero no debes asumir que ese sistema de cobros ya está activo. No envíes dinero por indicaciones del asistente.'},
 {topic:'other.shipping',intents:['other.shipping'],
 terms:['logistica','transporte','flete','envios de nexo'],
 stage:'planned',
 answer:'Está previsto coordinar transporte, fletes y otros participantes de un servicio. La contratación y el pago automatizados de logística todavía no están confirmados como funciones operativas.'},
 {topic:'other.cv',intents:['other.cv'],
 terms:['curriculum','generar cv','crear mi cv'],
 stage:'planned',
 answer:'Nexo contempla un generador de currículum a partir del perfil profesional. Por ahora no confirmaré que el generador de CV esté disponible sin que aparezca como función verificada.'},
 {topic:'other.affiliates',intents:['other.affiliates'],
 terms:['directorio','afiliados','empresas afiliadas'],
 stage:'planned',
 answer:'El directorio de afiliados está previsto para buscar empresas, profesionistas y proveedores. Su disponibilidad completa dependerá de que ese módulo sea publicado y verificado.'},
 {topic:'other.location',intents:['other.location'],
 terms:['ubicacion en nexo','buscar cerca de mi','zona de trabajo'],
 capability:'explore',stage:'available',
 answer:'Algunas publicaciones y formularios de Nexo permiten indicar una ubicación o zona de trabajo. Esto ayuda a filtrar oportunidades, pero no implica seguimiento GPS ni compartir automáticamente tu domicilio.'},
 {topic:'other.learning',intents:[],
 terms:['como aprendes','como aprende nexo','sigues aprendiendo','aprendizaje historico','aprendes por tu cuenta'],
 capability:'assistants',stage:'available',
 answer:'Nexo revisa periódicamente su catálogo de funciones publicado y actualiza su conocimiento cuando cambia la aplicación. También conserva tu historial solo en tu navegador. Las preguntas anteriores no se convierten automáticamente en hechos: primero comprueba la información con el código y distingue funciones activas de planes.'},
];
function inferredTopic(text:string,rawIntent?:string):Fact|undefined{
 // The user's actual intent and product name outrank incidental words such
 // as "productos" or "buscar" in a longer question about the whole app.
 const overview=has(text,[
  'como funciona nexo','como se usa nexo','que es nexo','para que sirve nexo',
  'que hace nexo','funciones de nexo','que funciones tiene nexo','que ofrece nexo',
  'que puedo hacer en nexo','como funciona la aplicacion','explica nexo',
  'objetivo de nexo','de que trata nexo']);
 if(overview)return facts[0];
 const matches=facts.filter(item=>has(text,item.terms));
 if(matches.length){
  matches.sort((a,b)=>{
   const score=(f:Fact)=>Math.max(...f.terms.filter(t=>text.includes(t)).map(t=>t.length),0)+
    (rawIntent&&f.intents.includes(rawIntent)?30:0);
   return score(b)-score(a);
  });
  return matches[0];
 }
 return facts.find(item=>!!rawIntent&&item.intents.includes(rawIntent));
}
function isAboutApp(text:string):boolean{
 return has(text,['nexo','nexa','aplicacion','app','plataforma','vacante',
 'empleo','trabajador','trabajo','servicio','producto','cuenta','perfil',
 'portafolio','afiliad','directorio','contrat','pago','comision','envio',
 'flete','logistica','asistente','curriculum','verific','notific','busqueda',
 'filtro','comprar','vender','publicar','contraseña','contrasena','correo',
 'chat','registrar','login','aprendes']);
}
/**
 * Self-review: the only permitted factual product answer must match an
 * approved intent and, for enabled features, a verified source-code route.
 * Unknown questions never fall through into Wikimedia/Google snippets.
 */
export function answerVerifiedNexoQuestion(question:string,intentKey?:string):NexoKnowledgeReply{
 const text=normalize(question);
 const fact=inferredTopic(text,intentKey);
 if(fact){
  const enabled=!fact.capability||manifest.capabilities[fact.capability]?.status==='available';
  if(fact.stage==='available'&&!enabled){
   return {text:'Esa sección está temporalmente fuera de la versión verificada de Nexo. No quiero indicarte pasos que podrían no funcionar. Puedes revisar Inicio y Explorar mientras se actualiza.',
    topic:fact.topic,verified:false,confidence:0.25,status:'unverified'};
  }
  const safe=fact.stage==='available'||fact.stage==='planned';
  return {text:fact.answer,topic:fact.topic,verified:safe,
   confidence:fact.stage==='available'?.98:.92,status:fact.stage};
 }
 if(isAboutApp(text)){
  return {text:'Todavía no tengo información confirmada sobre esa función de Nexo. No voy a inventarla ni traer una definición ajena desde Internet. Puedes preguntarme por empleo, trabajadores, servicios, productos, perfiles, pagos o asistentes.',
   topic:'other.unknown_nexo',verified:false,confidence:0,status:'unverified'};
 }
 return {text:'Soy el asistente de la aplicación Nexo. Puedo explicarte cómo funcionan sus secciones y ayudarte a usar empleo, servicios, productos y tu perfil. Para otros temas es mejor consultar una fuente específica.',
  topic:'other.out_of_scope',verified:false,confidence:0,status:'scope'};
}
