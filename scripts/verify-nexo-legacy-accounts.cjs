#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const ts=require('typescript');
const assert=require('node:assert/strict');
const read=path=>fs.readFileSync(path,'utf8');
const cloud=read('src/lib/nexo-cloud-identity.ts');
const auth=read('src/state/auth.tsx');
const profile=read('src/app/perfil.tsx');
const server=read('supabase/functions/nexo-control/index.ts');
const sql=read('supabase/migrations/20261016053000_nexo_legacy_account_links.sql');
const panel=read('public/nexo-control-panel.html');
const native=read('src/app/nexo-control.tsx');
for(const path of ['src/lib/nexo-cloud-identity.ts','src/state/auth.tsx',
 'src/app/perfil.tsx','src/app/nexo-control.tsx','src/lib/nexo-control-api.ts']){
 const source=read(path);
 const output=ts.transpileModule(source,{fileName:path,reportDiagnostics:true,
  compilerOptions:{module:ts.ModuleKind.CommonJS,
   jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}});
 const bad=(output.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
 assert.equal(bad.length,0,path+' has malformed JSX/TypeScript');
}
assert(auth.includes("await derivePassword(password,local.passwordSalt)")&&
 auth.includes("if(hash!==local.passwordHash)"),'local ownership must be proven');
assert(auth.includes("await cloudLogin(local.email,password)")&&
 auth.includes("await importHistoricalNexoRegistration(local.createdAt)"),
 'local history can only be imported after verified Supabase authentication');
assert(!/passwordHash.*importHistoricalNexoRegistration/.test(auth),
 'password hashes must stay on the original device');
assert(profile.includes('Vincular esta cuenta histórica')&&
 profile.includes('linkHistoricalAccount(legacyPassword)'),
 'the owner must explicitly opt to migrate old account');
assert(cloud.includes('resolution=ignore-duplicates'),
 'duplicate import must not overwrite an existing historical date');
assert(sql.includes('original_registered_at')&&sql.includes('auth.uid()=user_id')&&
 sql.includes('revoke all on function')&&sql.includes('service_role'));
assert(sql.includes('created_at::date')&&sql.includes('recovered_from_device'));
assert(server.includes('recovered:Number(data?.recovered||0)')&&
 server.includes('["owner","developer"].includes(actor.role)'));
assert(panel.includes('Number(result.recovered||0)')&&
 panel.includes('user.recovered_from_device')&&
 panel.includes('dispositivo original'));
assert(native.includes('userDirectory.recovered')&&
 native.includes('item.recovered_from_device'));
const script=panel.match(/<script>([\s\S]*?)<\/script>/);
assert(script);
new Function(script[1]);
const cloudExports={};
const transpiled=ts.transpileModule(cloud,{compilerOptions:{
 module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
new Function('exports','require',transpiled)(cloudExports,()=>{throw Error('unexpected require')});
const storage=new Map();
global.window={sessionStorage:{
 setItem(key,value){storage.set(key,value)},
 getItem(key){return storage.get(key)||null},
 removeItem(key){storage.delete(key)},
}};
const calls=[];
global.fetch=async(url,opts)=>{
 const payload=JSON.parse(opts.body||'{}');
 calls.push({url,opts,payload});
 if(String(url).includes('/auth/v1/token'))return {
  ok:true,async json(){return {
   access_token:'fake-token',refresh_token:'fake-refresh',
   expires_in:3600,user:{id:'6ca4e5b5-4e7a-410f-85d8-b45dc3c68b51',
    email:'historico@example.invalid',user_metadata:{username:'legacy'}},
  }}};
 return {ok:true,async json(){return {}}};
};
(async()=>{
 await cloudExports.cloudLogin('historico@example.invalid','password-for-test');
 await cloudExports.importHistoricalNexoRegistration('2025-06-09T12:00:00.000Z');
 const inserted=calls.find(x=>x.url.includes('nexo_legacy_account_links'));
 assert(inserted,'must import original date to private owner table');
 assert.equal(inserted.payload.original_registered_at,'2025-06-09T12:00:00.000Z');
 assert.equal(inserted.payload.user_id,'6ca4e5b5-4e7a-410f-85d8-b45dc3c68b51');
 assert(!JSON.stringify(inserted).includes('password-for-test'),
  'import must not send the credential');
 await assert.rejects(()=>cloudExports.importHistoricalNexoRegistration(
  '2035-01-01T00:00:00Z'),/fecha histórica/i);
 console.log('PASS: owner re-authentication, historic date import, RLS, admin source label, no password transfer');
})().catch(e=>{console.error(e);process.exitCode=1;});
