import type { NexoKnowledgeReply } from '@/lib/nexo-product-knowledge';
import { currentNexoKnowledge } from '@/lib/nexo-product-knowledge';

export type NexoAnswerReview={
  questionAnswered:boolean;sourceChecked:boolean;honestAboutStatus:boolean;
  hasActionableNextStep:boolean;score:number;improved:boolean;
  reviewedAnswer:NexoKnowledgeReply;
};

/**
 * Deterministic two-pass self-evaluation. No private chain-of-thought or
 * external content is used; the reply is checked against Nexo's approved
 * source-backed capability manifest, its original product intent and status.
 * Model weights are not retrained and a generated sentence is never treated
 * as a source of truth.
 */
const actionSteps:Record<string,{capability:string;instruction:string}>={
 'navigation.how_nexo_works':{
  capability:'home',
  instruction:'Para comenzar, abre Inicio y elige Buscar empleo, Contratar un servicio, Ofrecer un servicio o Productos.'},
 'employment.publish_vacancy':{
  capability:'publishWork',
  instruction:'Tu siguiente paso es abrir Publicar y seleccionar empleo.'},
 'employment.find_job':{
  capability:'explore',
  instruction:'Tu siguiente paso es tocar Buscar empleo en Inicio.'},
 'employment.hire_worker':{
  capability:'explore',
  instruction:'Tu siguiente paso es ir a Explorar y seleccionar Buscar trabajadores.'},
 'services.offer_service':{
  capability:'publishWork',
  instruction:'Tu siguiente paso es tocar Ofrecer un servicio en Inicio.'},
 'services.hire_service':{
  capability:'explore',
  instruction:'Tu siguiente paso es tocar Contratar un servicio en Inicio.'},
 'products.publish_product':{
  capability:'publishProducts',
  instruction:'Tu siguiente paso es entrar a Productos y tocar Publicar producto.'},
 'products.find_product':{
  capability:'products',
  instruction:'Tu siguiente paso es entrar a Productos y usar el buscador.'},
 'assistant.change_assistant':{
  capability:'assistants',
  instruction:'Tu siguiente paso es abrir Elige tu asistente para seleccionar a Nexo o Nexa.'},
 'account.sign_in':{
  capability:'authentication',
  instruction:'Tu siguiente paso es abrir Iniciar sesión.'},
 'account.password_recovery':{
  capability:'passwordRecovery',
  instruction:'Tu siguiente paso es tocar Recuperar contraseña en el inicio de sesión.'},
 'profile.edit_profile':{
  capability:'profile',
  instruction:'Tu siguiente paso es entrar a Perfil.'},
 'other.portfolio':{
  capability:'portfolio',
  instruction:'Tu siguiente paso es abrir Portafolios.'},
};
const norm=(value:string)=>value.toLocaleLowerCase('es').normalize('NFD')
 .replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ').trim();
function hasUsefulStep(answer:string){
 return /\b(entra|abre|elige|selecciona|toca|pulsa|puedes abrir|usa|comienza|para empezar|para comenzar)\b/i
 .test(norm(answer));
}
function addStep(answer:string,step:string){
 return answer.trim()+' '+step;
}
export function reviewNexoAnswer(question:string,original:NexoKnowledgeReply):NexoAnswerReview{
 let answer={...original};
 const manifest=currentNexoKnowledge();
 const next=actionSteps[answer.topic];
 let sourceChecked=answer.verified && (
  answer.status==='planned' ||
  (answer.status==='available' && (
   !next || manifest.capabilities[next.capability as keyof typeof manifest.capabilities]?.status==='available'
  ))
 );
 let honestAboutStatus=answer.status==='available'||
  (answer.status==='planned'&&
   /\b(planea|previst|contempla|pendiente|todavia|aun|no existe|no puedo confirmar|no esta)\b/i.test(norm(answer.text)))||
  (answer.status==='unverified'||answer.status==='scope');
 const questionAnswered=!!question.trim()&&answer.text.length>=45&&
  answer.status!=='unverified'&&answer.status!=='scope';
 let hasActionableNextStep=hasUsefulStep(answer.text);
 // Pass 1: all text appended must be approved for this exact topic and the
 // corresponding publicly reviewed app module.
 if(next&&answer.status==='available'&&sourceChecked&&!hasActionableNextStep){
  answer={...answer,text:addStep(answer.text,next.instruction)};
  hasActionableNextStep=true;
 }
 // Pass 2: verify again. If approved facts and their implementation disagree,
 // refuse to assert that a feature is live.
 if(answer.status==='available'&&!sourceChecked){
  answer={text:'No puedo confirmar ahora que esa opción esté disponible en esta versión de Nexo. Prefiero verificarla antes que darte una indicación incorrecta.',
   topic:answer.topic,verified:false,confidence:0.05,status:'unverified'};
  honestAboutStatus=true;
  hasActionableNextStep=false;
 }
 // Planned features can be described but never recommended as actionable.
 if(answer.status==='planned'&&!honestAboutStatus){
  answer={...answer,text:answer.text.trim()+
   ' Esta función está planeada y todavía no puedo confirmarla como operativa.'};
  honestAboutStatus=true;
 }
 // This is a quality score, NOT a probability of truth or a hallucination-free AI.
 const score=(questionAnswered?35:0)+(sourceChecked?30:0)+
  (honestAboutStatus?25:0)+
  (answer.status==='available'&&hasActionableNextStep?10:answer.status==='planned'?10:0);
 return {questionAnswered,sourceChecked,honestAboutStatus,
  hasActionableNextStep,score,improved:answer.text!==original.text,
  reviewedAnswer:answer};
}
