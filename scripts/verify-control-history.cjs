#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

const html=fs.readFileSync('public/nexo-control-panel.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length,1,'Nexo Control should expose exactly one inline script');
new vm.Script(scripts[0][1],{filename:'nexo-control-panel.js'});
for(const text of [
 'Historial de mejora para implementación','id="history-search"',
 'id="history-filter"','id="feedback-more"','id="mic-permission"',
 'getUserMedia({audio:true})','recognizer.onerror=',
 'speechErrors','action:\'update_feedback_review\'','scope=feedback',
 'item.context_shared&&item.question_text&&item.answer_text',
]){
 assert(html.includes(text),'Missing private history/dictation feature: '+text);
}
const backend=fs.readFileSync('supabase/functions/nexo-control/index.ts','utf8');
for(const term of [
 'async function feedbackPage(', 'review_status,review_note',
 'scope==="feedback"', 'await admin(req)',
 'actor.role!=="owner"&&actor.role!=="developer"',
 'body.action==="update_feedback_review"',
 'if(result.error)throw result.error;',
]){
 assert(backend.includes(term),'Missing backend permission or history support: '+term);
}
assert(!backend.includes('.upsert({\n        response_id:responseId'),
 'User votes must not overwrite internal developer review status');
const sql=fs.readFileSync('supabase/migrations/20261015205000_nexo_feedback_review_history.sql','utf8');
assert(sql.includes('revoke all on public.nexo_assistant_feedback from anon, authenticated'));
const mobile=fs.readFileSync('src/app/nexo-control.tsx','utf8');
assert(mobile.includes('Historial de mejora para implementación'));
assert(mobile.includes('loadControlFeedbackPage')&&mobile.includes('controlUpdateFeedbackReview'));
assert(mobile.includes('setMicStatus('));
console.log('PASS: historial de mejora completo, autorización privada y micrófono comprobable');
