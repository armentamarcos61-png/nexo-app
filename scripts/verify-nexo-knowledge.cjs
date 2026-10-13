#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const content=fs.readFileSync('src/lib/nexo-product-knowledge.ts','utf8');
const output=ts.transpileModule(content,{compilerOptions:{
 module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020
}}).outputText;
const moduleExports={};
new Function('exports',output)(moduleExports);
const resolve=moduleExports.answerVerifiedNexoQuestion;
const examples=[
 ['¿Cómo funciona Nexo?','navigation.how_nexo_works','available'],
 ['¿Cómo publico una vacante?','employment.publish_vacancy','available'],
 ['¿Cómo publico un servicio?','services.offer_service','available'],
 ['¿Cómo cambio de asistente?','assistant.change_assistant','available'],
 ['¿Dónde puedo comprar un producto?','products.find_product','available'],
 ['¿Cuáles son las comisiones de Nexo?','other.commissions','planned'],
 ['¿Cómo se realizan los pagos en Nexo?','payments.how_payments_work','planned'],
 ['¿Cómo aprende Nexo por su cuenta?','other.learning','available'],
 ['¿Cómo funciona Nexo Go?','other.memberships','planned'],
];
for(const [input,topic,status] of examples){
 const result=resolve(input);
 assert.equal(result.topic,topic,'bad topic for '+input);
 assert.equal(result.status,status,'bad status for '+input);
 assert.equal(result.verified,true,'source validation failed for '+input);
 assert(result.text.length>45,'reply must be useful');
 assert(!/wikipedia|google|busca en internet/i.test(result.text),'must not use unrelated search');
}
const unknown=resolve('¿Cómo se hace una transferencia bancaria en Nexo?');
assert(!unknown.verified,'unknown features must not be invented');
const misleading=resolve('¿Qué impuestos se aplican a los productos vendidos en Nexo?','products.find_product');
assert(!misleading.verified,'broad topic classifier must not invent tax answers');
const other=resolve('¿Cuántas lunas tiene Júpiter?');
assert.equal(other.status,'scope','out-of-scope topics must not be searched automatically');
assert(!other.verified);
const manifest=JSON.parse(fs.readFileSync('public/knowledge/nexo-capabilities.json','utf8'));
assert.equal(manifest.schema,1);
assert.equal(typeof manifest.revision,'string');
assert(Object.values(manifest.capabilities).length>=12);
assert(Array.isArray(manifest.screens),'autonomous public screen discovery is required');
for(const [name,data] of Object.entries(manifest.capabilities)){
 assert(['available','unavailable'].includes(data.status),name);
 assert(data.evidence.every(x=>x.startsWith('src/')),name);
}
const history=JSON.parse(fs.readFileSync('public/knowledge/nexo-learning-history.json','utf8'));
assert(Array.isArray(history)&&history.length>0,'independent learning audit must be retained');
assert(history.every(x=>typeof x.revision==='string'&&
 !('question' in x)&&!('answer' in x)),'review history may not leak chat text');
console.log('PASS NEXO KNOWLEDGE:',examples.length,
 'real FAQs checked; no unsourced guesses or unrelated web summaries; autonomous manifest revision',
 manifest.revision);
