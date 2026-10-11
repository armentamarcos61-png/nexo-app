const fs=require('node:fs');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const {execFileSync}=require('node:child_process');
execFileSync(process.execPath,['--check','scripts/nexo-coding-agent.mjs'],{stdio:'pipe'});
assert(fs.existsSync('.github/workflows/nexo-coding-agent.yml'),
  'Only a GitHub workflow can run the coding agent with limited permissions');

const html=fs.readFileSync('public/nexo-control-panel.html','utf8');
assert(html.includes('<html lang="es">'),'Control must be a self-contained page');
assert(html.includes('id="login"')&&html.includes('id="dashboard"'),
 'Login and admin views must both exist');
assert(!html.includes('<script src='),'Admin must not load Expo app bundle');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
 .map(m=>m[1]).filter(Boolean);
assert.equal(scripts.length,1,'Only one standalone application script is permitted');
new vm.Script(scripts[0],{filename:'nexo-control-inline.js'});
for(const key of [
 "nexo.control.admin.session.v1","/auth/v1/otp",
 "/auth/v1/verify","/auth/v1/token",
 "Authorization:'Bearer '+access","access_token","refresh_token",
 "action:'apply_settings'","action:'create_idea'",
 "sessionStorage.removeItem(STORAGE)",
]){
 assert(html.includes(key),'Standalone panel missing '+key);
}
assert(!html.includes('eval(')&&!html.includes('new Function('),
 'Admin panel must not evaluate code or arbitrary user instructions');
assert(html.includes('id="signin"') && html.includes('grant_type=password'),
  'Admin must support password login while the OTP template is not configured');
assert(html.includes("id=\"recover\"")&&html.includes("/auth/v1/recover?redirect_to="),
  'Recover password when existing credentials are not recognized');
assert(html.includes("id=\"update-password\"")&&html.includes("/auth/v1/user"),
  'Verified recovery email must allow password update');
assert(html.includes("input.type==='recovery'"),
  'Recovery verify must show password update');

assert(html.includes('if(draft&&dashboard)drawSettings()'),
  'Sending a magic link before authentication must not render private settings');
assert(html.includes('input={token_hash:hash,type}'),
  'Pasted Supabase magic-link token must be verified as a hash');
assert(!html.includes('localStorage.setItem(STORAGE'),
 'Owner session must never be stored persistently in localStorage');

const standaloneScript=scripts[0];
const begin=standaloneScript.indexOf('function getProposal(input){');
const end=standaloneScript.indexOf('async function run(fn){',begin);
assert(begin>=0&&end>begin,'Speech command parser must be available');
const parseCommand=vm.runInNewContext('('+standaloneScript.slice(begin,end).trim()+')',{
 draft:{accent:'cyan',action_order:['employment','services','products','offer']},
 allowedScreens:{portafolios:'/portafolios',productos:'/productos',empleos:'/explorar',
  servicios:'/explorar',asistente:'/asistente',perfil:'/perfil',publicar:'/publicar/servicio'},
 orderNames:{employment:'Empleos',services:'Contratar servicio',products:'Productos',offer:'Ofrecer servicio'},
});
assert.equal(parseCommand('Pon el color naranja').type,'settings');
assert.equal(parseCommand('Productos primero').order[0],'products');
assert.equal(parseCommand('Agrega un botón de portafolios').type,'shortcut');
assert.equal(parseCommand('Agrega un botón de portafolios').route,'/portafolios');
assert.equal(parseCommand('Construye un sistema nuevo de pagos').type,'idea',
 'Unsupported code-change requests must not claim they were executed');
console.log('PASS: voice commands apply approved layout operations and queue unsupported code changes safely');



assert(html.includes('id="have-link"')&&html.includes("show('verify-zone',true)"),
 'A verified localhost link should be recoverable without sending another email');
const restoreBegin=standaloneScript.indexOf('async function recoverVerifiedCallback(raw,claimedEmail){');
const restoreEnd=standaloneScript.indexOf('async function load(){',restoreBegin);
assert(restoreBegin>=0&&restoreEnd>restoreBegin,'Callback recovery helper must be available');
let savedCallbackSession=null;
let callbackCalls=0;
const recoverCallback=vm.runInNewContext('('+standaloneScript.slice(restoreBegin,restoreEnd).trim()+')',{
 URL,URLSearchParams,
 BASE:'https://example.supabase.co',
 headers:()=>({'apikey':'test'}),
 parse:async response=>response,
 fetch:async(url,options)=>{
  callbackCalls++;
  assert.equal(url,'https://example.supabase.co/auth/v1/user');
  assert.equal(options.headers.Authorization,'Bearer example-token');
  return {email:'owner@example.test'};
 },
 saveSession:session=>{savedCallbackSession=session;},
});
(async()=>{
 const original='http://localhost:3000/#access_token=example-token&refresh_token=example-refresh&expires_in=3600&type=recovery';
 const recovered=await recoverCallback(original,'owner@example.test');
 assert.equal(recovered.type,'recovery');
 assert.equal(savedCallbackSession.refresh_token,'example-refresh');
 assert.equal(callbackCalls,1);
 await assert.rejects(recoverCallback(original,'other@example.test'),/pertenece a otro correo/);
 await assert.rejects(recoverCallback('http://localhost:3000/','owner@example.test'),/#access_token/);
 await assert.rejects(recoverCallback('https://attacker.example/#access_token=example-token&refresh_token=example-refresh&expires_in=3600','owner@example.test'),/no corresponde/);
 console.log('PASS: recover a previously verified localhost callback, email-bound, no extra OTP');
})().catch(e=>{console.error(e);process.exitCode=1;});

assert(html.includes('id="link-nexo"'), 'Admin login must offer to link the existing Nexo local password');
assert(html.includes("data.user?.email?.trim().toLowerCase()!==email.toLowerCase()"),
 'The recovered Supabase identity must match the claimed local account email');
assert(html.includes("if(input.type!=='recovery')"),
 'Linking local credentials must require email verification with a recovery session');
assert(html.includes('await setSupabasePassword(selectedPassword)'),
 'Password must be adopted by Supabase only after email-verified recovery, not merely local proof');
assert(!html.includes('localStorage.setItem(\'nexo.control.admin'),
 'Administrator credentials must not be written to localStorage');
// Reproduce registration's salted PBKDF2 hash, then check the actual in-panel
// credential verifier against a correct password, an incorrect one, and an
// unrelated email, without calling the remote authentication server.
const startLocal=standaloneScript.indexOf('async function matchesLocalNexoPassword(email,password){');
const endLocal=standaloneScript.indexOf('async function sendRecovery(email){',startLocal);
assert(startLocal>=0&&endLocal>startLocal,'Local password linking verifier must exist');
const crypto=require('node:crypto');
const {webcrypto,pbkdf2Sync}=crypto;
const seed=Buffer.from('74a023ef98886db18366ce372d907e2f','hex');
const password='MyNexoUserPassword12!';
const hash=pbkdf2Sync(password,seed,120000,32,'sha256').toString('base64');
const localAccount={email:'owner@example.test',passwordSalt:seed.toString('base64'),passwordHash:hash};
const fakeStorage={getItem:key=>key==='nexo.local-accounts.v1'?JSON.stringify([localAccount]):null};
const verifyLocal=vm.runInNewContext('('+standaloneScript.slice(startLocal,endLocal).trim()+')',{
 window:{crypto:webcrypto},crypto:webcrypto,
 localStorage:fakeStorage,TextEncoder,Uint8Array,atob,
 btoa,
});
(async()=>{
 assert.equal(await verifyLocal('owner@example.test',password),true,
  'A valid Nexo password must match its actual registration hash');
 assert.equal(await verifyLocal('owner@example.test','IncorrectPassword!'),false,
  'Invalid Nexo passwords must never be treated as verified');
 assert.equal(await verifyLocal('different@example.test',password),false,
  'Password linking must reject other email identities');
 console.log('PASS: PBKDF2 Nexo password checked without bypassing Supabase verification');
})().catch(e=>{console.error(e);process.exitCode=1;});

console.log('PASS: standalone admin HTML parses, auth is gated, no Expo routing dependency');
