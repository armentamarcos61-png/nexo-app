#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const read=p=>fs.readFileSync(p,'utf8');
const cloud=read('src/lib/nexo-cloud-identity.ts');
const auth=read('src/state/auth.tsx');
const profile=read('src/app/perfil.tsx');
const registration=read('src/app/registrarse.tsx');
const professional=read('src/state/professional-profile.tsx');
const picker=read('src/components/profile-photo-picker.tsx');
const api=read('src/lib/nexo-control-api.ts');
const mobilePanel=read('src/app/nexo-control.tsx');
const webPanel=read('public/nexo-control-panel.html');
const server=read('supabase/functions/nexo-control/index.ts');
const schema=read('supabase/migrations/20261015232300_nexo_professional_profiles.sql');
const rpc=read('supabase/migrations/20261015232500_nexo_user_directory.sql');
for(const file of ['src/lib/nexo-cloud-identity.ts','src/app/perfil.tsx',
 'src/components/profile-photo-picker.tsx','src/app/nexo-control.tsx',
 'src/lib/nexo-control-api.ts','src/state/auth.tsx']){
 const code=read(file);
 const transformed=ts.transpileModule(code,{fileName:file,
  reportDiagnostics:true,compilerOptions:{
   module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX,
  }});
 const failures=(transformed.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error);
 assert.equal(failures.length,0,file+' must have valid TS/JSX syntax: '+failures.map(x=>x.messageText).join('; '));
}
assert(server.includes('scope==="users"')&&server.includes('await admin(req)'));
assert(server.includes('["owner","developer"].includes(actor.role)'),
 'only developer accounts may request users');
assert(server.includes('db.rpc("nexo_admin_user_directory"'));
assert(api.includes("type NexoUserSort='az'|'za'|'newest'|'oldest'|'newest_az'|'oldest_az'"));
for(const order of ['newest','oldest','az','za','newest_az','oldest_az'])
 assert(webPanel.includes('value="'+order+'"'),'missing web ordering '+order);
assert(webPanel.includes("image.src=photo")&&webPanel.includes("avatar.textContent=name"),
 'profile photo must be visible, with initial only if no actual photo');
assert(webPanel.includes('user.profile_updated')&&webPanel.includes('user.bio'),
 'individual CV must open from the list');
assert(webPanel.includes("await token()")&&webPanel.includes("scope:'users'"),
 'web panel must use admin token');
assert(mobilePanel.includes("source={{uri:image}}")&&mobilePanel.includes("tab==='users'"),
 'mobile panel must render real photo & users');
assert(schema.includes('enable row level security')&&schema.includes('auth.uid()'));
assert(rpc.includes('revoke all on function public.nexo_admin_user_directory'));
assert(rpc.includes('service_role'));
assert(rpc.includes("created_at::date"),'combined sorts must group by CALENDAR DATE, not milliseconds');
assert(auth.includes('await cloudRegister(')&&auth.includes('await cloudLogin('),
 'new registrations and cross-device logins must link to central identity');
assert(cloud.includes('share_with_developers:true')&&
 cloud.includes('Authorization:')&&
 cloud.includes('getCloudAccess()'));
assert(!profile.includes('Autorizo sincronizar mi currículum')&&
 profile.includes('revokeProfessionalProfileShare()'),
 'profile must not repeat the opt-in control, but keep deletion available');
assert(registration.includes('Autorizo compartir mi currículum y foto')&&
 registration.includes('setShareProfessionalProfile')&&
 registration.includes('Es opcional:'),
 'registration must explicitly disclose optional professional information sharing');
assert(cloud.includes('profileReviewConsent')&&
 cloud.includes('if(!session?.profileReviewConsent')&&
 professional.includes('canSyncMyProfessionalProfile(email)'),
 'automatic syncing must require a verified explicit consent signal');
assert(picker.includes("input.type='file'")&&picker.includes('toDataURL'),
 'photo control must be usable and not merely decorative');
const script=webPanel.match(/<script>([\s\S]*?)<\/script>/);
assert(script,'web control requires inline JS');
new Function(script[1]);
console.log('PASS: private user directory, explicit signup consent, automatic opt-in-only CV updates, withdrawal and React/Web syntax');
