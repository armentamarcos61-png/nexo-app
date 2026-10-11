const fs=require('node:fs');
const assert=require('node:assert/strict');
const vm=require('node:vm');

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
assert(!html.includes('localStorage.setItem(STORAGE'),
 'Owner session must never be stored persistently in localStorage');
console.log('PASS: standalone admin HTML parses, auth is gated, no Expo routing dependency');
