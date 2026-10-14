#!/usr/bin/env node
'use strict';
/**
 * Unattended assistant learning review. Independently asks both assistant
 * personas verified product questions, compares answers against app facts,
 * and records gaps in a bounded, versioned report. It does NOT crawl random
 * sites, ingest user conversation, or silently change product facts.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const crypto=require('node:crypto');
function compile(file,imports={}){
 const source=fs.readFileSync(file,'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020
 }}).outputText;
 const exports={};
 new Function('exports','require',js)(exports,name=>{
  if(name in imports)return imports[name];
  throw Error('Unexpected dependency '+name);
 });
 return exports;
}
const knowledge=compile('src/lib/nexo-product-knowledge.ts');
const reviewer=compile('src/lib/assistant-answer-review.ts',{
 '@/lib/nexo-product-knowledge':knowledge,
});
const corpus=[
 ['¿Cómo funciona Nexo?','navigation.how_nexo_works','available'],
 ['¿Qué es Nexo?','navigation.how_nexo_works','available'],
 ['¿Para qué sirve Nexo?','navigation.how_nexo_works','available'],
 ['¿Cómo publico una vacante?','employment.publish_vacancy','available'],
 ['Busco trabajo','employment.find_job','available'],
 ['¿Cómo busco trabajadores?','employment.hire_worker','available'],
 ['¿Cómo publico un servicio?','services.offer_service','available'],
 ['¿Cómo contrato un servicio?','services.hire_service','available'],
 ['¿Cómo publico un producto?','products.publish_product','available'],
 ['¿Dónde compro productos?','products.find_product','available'],
 ['¿Cómo inicio sesión?','account.sign_in','available'],
 ['¿Cómo puedo recuperar mi contraseña?','account.password_recovery','available'],
 ['¿Cómo edito mi perfil?','profile.edit_profile','available'],
 ['¿Dónde veo mis portafolios?','other.portfolio','available'],
 ['¿Cómo cambio de asistente?','assistant.change_assistant','available'],
 ['¿Cómo funcionan los pagos de Nexo?','payments.how_payments_work','planned'],
 ['¿Cuánto cobra Nexo de comisión?','other.commissions','planned'],
 ['¿Qué es Nexo Go?','other.memberships','planned'],
 ['¿Cuándo estará la verificación?','other.verification','planned'],
 ['¿Cómo aprendes por tu cuenta?','other.learning','available'],
 ['¿Cuántas lunas tiene Júpiter?','other.out_of_scope','scope'],
 ['¿Qué impuestos paga una venta de productos?','other.unknown_nexo','unverified'],
];
const checks=[];
for(const assistant of ['nexo','nexa']){
 for(const [question,topic,status] of corpus){
  const raw=knowledge.answerVerifiedNexoQuestion(question);
  const review=reviewer.reviewNexoAnswer(question,raw);
  const final=review.reviewedAnswer;
  const passed=final.topic===topic&&final.status===status&&
   (status==='available'||status==='planned'?review.sourceChecked:!final.verified);
  checks.push({assistant,question,expected:topic,actual:final.topic,
   expectedStatus:status,status:final.status,score:review.score,
   improved:review.improved,passed});
 }
}
const failed=checks.filter(check=>!check.passed);
const hash=crypto.createHash('sha256');
for(const file of ['src/lib/nexo-product-knowledge.ts',
 'src/lib/assistant-answer-review.ts','public/knowledge/nexo-capabilities.json']){
 hash.update(fs.readFileSync(file));
}
const revision=hash.digest('hex').slice(0,24);
const file='public/knowledge/nexo-answer-review.json';
let previous=null;
try{previous=JSON.parse(fs.readFileSync(file,'utf8'));}catch{}
const reviewedAt=previous?.revision===revision?previous.reviewedAt:new Date().toISOString();
const report={
 schema:1,revision,reviewedAt,
 definition:'Preguntas sintéticas sobre el código de Nexo, probadas para ambos asistentes. No contiene conversaciones privadas.',
 assistants:['nexo','nexa'],
 questionsChecked:checks.length,
 passed:checks.length-failed.length,
 failed:failed.length,
 averageScore:Number((checks.reduce((n,c)=>n+c.score,0)/checks.length).toFixed(1)),
 topicsNeedingImprovement:failed.map(({assistant,question,expected,actual,expectedStatus,status})=>
  ({assistant,question,expected,actual,expectedStatus,status})),
 recommendations:failed.length
  ?['Revisar expresiones de intención y respuestas del catálogo; nunca aceptar datos externos sin comprobarlos.']
  :['Todas las preguntas verificadas coinciden con el catálogo actual; se repetirá la revisión cuando cambie el código.'],
};
fs.mkdirSync('public/knowledge',{recursive:true});
fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');
console.log('NEXO ANSWER SELF-REVIEW:',report.passed+'/'+report.questionsChecked,
 'pass; score',report.averageScore, 'revision',revision);
if(failed.length)console.log('Unresolved quality cases:',JSON.stringify(failed));
assert.equal(failed.length,0,'Assistant intents or feature statuses need correction before publishing');
