#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
const files=['src/lib/nexo-employment-api.ts','src/components/employment-results.tsx',
'src/app/explorar.tsx','src/app/mis-solicitudes.tsx'];
for(const file of files){
 const transformed=ts.transpileModule(read(file),{
   fileName:file,reportDiagnostics:true,
   compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX},
 });
 const errors=(transformed.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error);
 assert.equal(errors.length,0,file+' transpilation errors '+errors.map(x=>x.messageText).join('; '));
}
const result={};
const code=ts.transpileModule(read(files[0]),{compilerOptions:{
 module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020
}}).outputText;
new Function('exports','require',code)(result,()=>({getCloudAccess(){throw Error('auth mock');}}));
const posts=[
 {kind:'seeking_job',title:'Carpintero profesional',description:'Hago muebles y cocinas',category:'Carpintería',location:'',id:'1'},
 {kind:'vacancy',title:'Vacante de ebanista',description:'Buscamos persona para taller',category:'Carpintería',location:'',id:'2'},
 {kind:'vacancy',title:'Chofer',description:'Chofer disponible',category:'Ventas',location:'',id:'3'},
];
assert.deepEqual(result.filterEmploymentPosts(posts,'Ebanista','Carpintería').map(p=>p.id),['1','2']);
assert.deepEqual(result.filterEmploymentPosts(posts,'Ebanista','Carpintería','vacancy').map(p=>p.id),['2']);
assert.deepEqual(result.filterEmploymentPosts(posts,'Ebanista','Carpintería','seeking_job').map(p=>p.id),['1']);
const explore=read(files[2]);
const cards=read(files[1]);
const inbox=read(files[3]);
assert(explore.includes('void runEmploymentSearch(term)')&&explore.includes('<EmploymentResults'));
assert(explore.includes("label={publishingEmployment?'Publicando…'"));
assert(explore.includes("Solicitud de empleo publicada en Nexo Central."));
assert(!/function buscar\(\)[\s\S]{0,450}publishEmploymentPost/.test(explore),
 'Buscar alone must NEVER publish without express action');
assert(cards.includes("Me interesa tu perfil")&&cards.includes("Me interesa esta vacante"));
assert(cards.includes('sendEmploymentInterest(post'));
assert(inbox.includes('respondEmploymentInterest')&&inbox.includes('closeEmploymentPost'));
const sql=read('supabase/migrations/20261115010000_nexo_employment_marketplace.sql');
for(const check of ['enable row level security','sender_id=auth.uid()',
 'owner_id=auth.uid()','p.owner_id<>auth.uid()', 'unique(post_id, sender_id)',
 'grant update(response,responded_at)']){
 assert(sql.includes(check),'Missing DB security rule '+check);
}
console.log('PASS NEXO EMPLEO: busqueda real, publicación explícita, Ebanista, contacto privado, RLS y bandeja de mensajes');
