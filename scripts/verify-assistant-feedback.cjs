#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const clientFile='src/lib/nexo-assistant-feedback.ts';
const source=fs.readFileSync(clientFile,'utf8');
const out=ts.transpileModule(source,{compilerOptions:{
 module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,
}}).outputText;
const api={};
new Function('exports','require',out)(api,name=>{throw Error('Unexpected runtime dependency '+name)});
const sent=[];
const fixture={
 responseId:'e335b120-e4fd-41a3-a440-543def6277ef',
 assistantId:'nexa',
 intentKey:'navigation.how_nexo_works',
 question:'¿Cómo funciona Nexo?',
 answer:'Nexo sirve para buscar empleo, ofrecer servicios y publicar productos.',
};
const oldFetch=global.fetch;
global.fetch=async(url,init)=>{
 const payload=JSON.parse(init.body);
 sent.push({url,init,payload});
 return {ok:true,async json(){return {ok:true}}};
};
(async()=>{
 await api.sendAssistantFeedback(fixture,{rating:'up'});
 assert.equal(sent.length,1);
 assert.equal(sent[0].payload.action,'assistant_feedback');
 assert.equal(sent[0].payload.rating,'up');
 assert.equal(sent[0].payload.includeContext,false);
 assert(!('question'in sent[0].payload),'question MUST remain private by default');
 assert(!('answer'in sent[0].payload),'answer MUST remain private by default');
 assert(!('email'in sent[0].payload),'no user email must be collected');
 await api.sendAssistantFeedback(fixture,{
  rating:'down',comment:'La explicación no dice dónde buscar empleos.',
  includeContext:true,
 });
 assert.equal(sent[1].payload.question,fixture.question);
 assert.equal(sent[1].payload.answer,fixture.answer);
 assert.equal(sent[1].payload.comment,'La explicación no dice dónde buscar empleos.');
 await assert.rejects(()=>api.sendAssistantFeedback(fixture,{rating:'comment'}),/comentario/i);
 await assert.rejects(()=>api.sendAssistantFeedback(fixture,{
  rating:'comment',comment:'x'.repeat(1201),
 }),/1200/);
 const invalid=sent.length;
 assert.equal(invalid,2,'invalid requests must not reach the backend');
 global.fetch=async()=>({ok:false,async json(){return {error:'Sin conexión'};}});
 await assert.rejects(()=>api.sendAssistantFeedback(fixture,{rating:'up'}),/Sin conexión/);
 const ui=fs.readFileSync('src/app/asistente.tsx','utf8');
 for(const expected of ['Me gustó','No me gustó','Comentar',
  'Modal visible={feedbackOpen&&!!feedbackRecord}',
  'includeContext:feedbackSharing','setFeedbackRecord(null)']){
  assert(ui.includes(expected),'missing user feedback control '+expected);
 }
 const panel=fs.readFileSync('public/nexo-control-panel.html','utf8');
 assert(panel.includes('data-tab="feedback"'),'developer panel missing feedback tab');
 assert(panel.includes('drawFeedback()'),'private panel does not render server feedback');
 assert(panel.includes('item.context_shared'),'context consent not respected in control panel');
 const backend=fs.readFileSync('supabase/functions/nexo-control/index.ts','utf8');
 assert(backend.includes('body.action==="assistant_feedback"'),'backend action missing');
 assert(backend.includes('actor.role==="owner"||actor.role==="developer"'),
  'private feedback only for allowlisted developer roles');
 assert(backend.includes('await admin(req)'),'admin backend session check missing');
 const sql=fs.readFileSync('supabase/migrations/20261015143000_nexo_assistant_feedback_private.sql','utf8');
 assert(sql.includes('enable row level security')&&
  sql.includes('revoke all on public.nexo_assistant_feedback from anon, authenticated'));
 assert.equal(api.newAnswerFeedbackId().split('-').length,5,'feedback id must be UUID');
 console.log('PASS FEEDBACK: like/dislike, comment, opt-in conversation context, private RLS backend, developer-only inbox');
})().finally(()=>{global.fetch=oldFetch}).catch(e=>{console.error(e);process.exitCode=1});
