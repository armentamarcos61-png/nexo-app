#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const ts=require('typescript');
const load=p=>fs.readFileSync(p,'utf8');
function compile(file){
 const result=ts.transpileModule(load(file),{
   fileName:file,reportDiagnostics:true,
   compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX},
 });
 const errors=(result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
 assert.equal(errors.length,0,file+': '+errors.map(d=>d.messageText).join('; '));
 return result.outputText;
}
const filePaths=['src/lib/nexo-money.ts','src/lib/nexo-portfolio-opportunities.ts',
 'src/app/publicar/[tipo].tsx','src/app/portafolios.tsx','src/components/portfolio-offers.tsx',
 'src/app/mis-solicitudes.tsx'];
filePaths.forEach(compile);
const money={};
new Function('exports',compile(filePaths[0]))(money);
for(const input of ['6,000','6000','6.000','6,000.50','6.000,50','6000.50','6000,50','1,234,567.89']){
 const value=money.parseMxnAmount(input);
 assert(value>0,'valid amount '+input);
}
assert.equal(money.parseMxnAmount('6,000'),6000);
assert.equal(money.parseMxnAmount('6.000'),6000);
assert.equal(money.parseMxnAmount('1,234,567.89'),1234567.89);
assert.equal(money.parseMxnAmount('6.000,50'),6000.5);
assert.equal(money.parseMxnAmount(''),null);
for(const value of ['0','1,2,3','abcdef','-500','6,000.500','1.23.45'])
 assert.throws(()=>money.parseMxnAmount(value),'invalid amount '+value);
const api={};
new Function('exports','require',compile(filePaths[1]))(api,()=>({}));
const p=(title,service='Carpintería')=>({id:title,title,service,
 description:'',images:['photo'],videos:[],createdAt:'2026-11-15T00:00:00Z'});
const requests=[
 {id:'c1',owner_id:'a',status:'active',title:'Solicito una cocina integral',description:'Necesito fabricar una cocina nueva',category:'Carpintería',location:'Guadalajara',created_at:'2026-11-15T00:00:00Z',budget_mxn:6000},
 {id:'s1',owner_id:'b',status:'active',title:'Tapizado de sofá',description:'Quiero arreglar mis sillones',category:'Tapicería',location:'Guadalajara',created_at:'2026-11-15T01:00:00Z',budget_mxn:2000},
 {id:'k1',owner_id:'c',status:'active',title:'Puerta de closet',description:'Fabricar ropero y armario',category:'Carpintería',location:'Tlajomulco',created_at:'2026-11-15T02:00:00Z',budget_mxn:null},
 {id:'z1',owner_id:'d',status:'closed',title:'Cocina industrial',description:'Una cocina para restaurantes',category:'Carpintería',location:'Zapopan',created_at:'2026-11-15T03:00:00Z',budget_mxn:9000},
];
const jobs=[
 {id:'j1',kind:'vacancy',owner_id:'e',status:'active',title:'Ebanista para cocinas',description:'Carpintero en fabricación de cocinas',category:'Carpintería',location:'Guadalajara',created_at:'2026-11-15T02:30:00Z'},
 {id:'j2',kind:'seeking_job',owner_id:'f',status:'active',title:'Busco empleo en cocinas',description:'Fabricador de cocina',category:'Carpintería',location:'Guadalajara',created_at:'2026-11-15T03:00:00Z'},
];
const kitchens=api.findPortfolioOpportunities(p('Cocinas integrales'),requests,jobs);
assert.deepEqual(kitchens.map(x=>x.key),['vacancy:j1','service:c1']);
assert.equal(api.findPortfolioOpportunities(p('Sillones'),requests,jobs).length,1);
assert.equal(api.findPortfolioOpportunities(p('Clósets'),requests,jobs)[0].key,'service:k1');
assert.equal(api.findPortfolioOpportunities(p('Mesas'),requests,jobs).length,0);
assert.equal(api.matchesPortfolioOpportunity(p('Cocinas'),requests[1]),false);
const portfolio=load(filePaths[3]);
assert(portfolio.includes('displayedPortfolios.map'));
assert(portfolio.includes('setSelectedPortfolioId(portfolio.id)'));
assert(portfolio.includes('findPortfolioOpportunities(portfolio, requests, vacancies)'));
assert(portfolio.includes('styles.offerBadgeNumber'));
assert(portfolio.includes('<PortfolioOffers'));
const publish=load(filePaths[2]);
assert(publish.includes('publicarNecesidad')&&publish.includes('publishedNeed'));
assert(publish.includes('formatMxnAmount(parseMxnAmount(importe))'));
assert(!publish.includes('const result = await publishServiceRequest')); // use awaited confirmation, no optimistic false success
const inbox=load(filePaths[5]);
assert(inbox.includes('listMyServiceProposals')&&inbox.includes('replyServiceProposal'));
const sql=load('supabase/migrations/20261115020000_nexo_service_requests_proposals.sql');
assert(sql.includes('enable row level security'));
assert(sql.includes('sender_id=(select auth.uid())'));
assert(sql.includes('owner_id=(select auth.uid())'));
assert(sql.includes('unique(request_id,sender_id)'));
console.log('PASS portafolios: guardar galerías existentes, abrir y contar ofertas reales; propuestas privadas, publicación, moneda MXN');
