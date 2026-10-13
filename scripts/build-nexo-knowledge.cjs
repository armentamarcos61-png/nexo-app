#!/usr/bin/env node
'use strict';
// Review Nexo's OWN code at build time and on an independent nightly schedule.
// Only public module and route presence becomes confirmed product knowledge;
// no users' messages, Wikipedia extracts or model-generated claims are ingested.
const fs=require('node:fs');
const crypto=require('node:crypto');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const target=path.join(root,'public/knowledge/nexo-capabilities.json');
const checks={
 home:[['src/app/index.tsx',['Buscar empleo','Contratar un servicio','Productos']]],
 explore:[['src/app/explorar.tsx',['Buscar empleo','Buscar trabajadores','Contratar un servicio']]],
 products:[['src/app/productos.tsx',['Marketplace Nexo','Publicar producto']]],
 publishProducts:[
  ['src/app/publicar/[tipo].tsx',['publicarProducto','useMarketplace']],
  ['src/state/marketplace.tsx',['MarketplaceProvider','publish']]],
 drafts:[
  ['src/app/borradores.tsx',['useDrafts']],
  ['src/state/drafts.tsx',['useDrafts']]],
 profile:[['src/app/perfil.tsx',['Perfil']]],
 portfolio:[['src/app/portafolios.tsx',['portafolio']]],
 assistants:[
  ['src/app/elegir-asistente.tsx',['Nexa','Nexo']],
  ['src/app/asistente.tsx',['AssistantStage']]],
 authentication:[
  ['src/app/iniciar-sesion.tsx',['Iniciar']],
  ['src/app/registrarse.tsx',['registr']]],
 passwordRecovery:[['src/app/recuperar-contrasena.tsx',['recuper']]],
 publishWork:[['src/app/publicar/[tipo].tsx',['revisar','guardar']]],
 categories:[['src/constants/categories.ts',['categorias']]],
};
const capabilities={};
const hash=crypto.createHash('sha256');
for(const [id,steps] of Object.entries(checks)){
 let valid=true;
 const evidence=[];
 for(const [file,tokens] of steps){
  const full=path.join(root,file);
  if(!fs.existsSync(full)){valid=false;continue;}
  const code=fs.readFileSync(full,'utf8');
  const found=tokens.every(token=>code.toLowerCase().includes(token.toLowerCase()));
  if(!found)valid=false;
  evidence.push(file);
  hash.update(file+'\0'+crypto.createHash('sha256').update(code).digest('hex')+'\0');
 }
 capabilities[id]={status:valid?'available':'unavailable',evidence};
}
const revision=hash.digest('hex').slice(0,24);
let previous=null;
try{previous=JSON.parse(fs.readFileSync(target,'utf8'));}catch{}
const generatedAt=previous?.revision===revision&&typeof previous.generatedAt==='string'
 ?previous.generatedAt:new Date().toISOString();
const manifest={schema:1,revision,generatedAt,capabilities};
fs.mkdirSync(path.dirname(target),{recursive:true});
fs.writeFileSync(target,JSON.stringify(manifest,null,2)+'\n');
const available=Object.values(capabilities).filter(x=>x.status==='available').length;
console.log('Nexo self-review:',available+'/'+Object.keys(capabilities).length,
 'routes verified, revision',revision);
if(available<9)throw Error('Nexo verified routes unexpectedly missing: inspect manifest before publication');
