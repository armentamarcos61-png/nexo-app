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

console.log('PASS: standalone admin HTML parses, auth is gated, no Expo routing dependency');
