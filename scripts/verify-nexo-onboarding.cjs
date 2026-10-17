#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
const stage=fs.readFileSync('src/app/bienvenida.tsx','utf8');
const root=fs.readFileSync('src/app/index.tsx','utf8');
const login=fs.readFileSync('src/app/iniciar-sesion.tsx','utf8');
const source=fs.readFileSync('src/lib/nexo-onboarding.ts','utf8');
const onboardingExports={};
new Function('exports','require',
 ts.transpileModule(source,{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020
 }}).outputText)(onboardingExports,module=>{
 if(module==='react-native')return {Platform:{OS:'web'}};
 throw Error('Unexpected dependency '+module);
});
const slides=onboardingExports.nexoOnboardingSlides;
assert.equal(slides.length,6,'a complete first-visit walk-through requires six slides');
assert(slides.every(x=>x.title&&x.subtitle&&x.key&&x.eyebrow));
assert.equal(slides[0].key,'welcome');
assert.equal(slides.at(-1).key,'ready');
const keys=['welcome','options','opportunities','publish','assistants','ready'];
assert.deepEqual(slides.map(x=>x.key),keys);
assert(stage.includes('pagingEnabled')&&stage.includes('onMomentumScrollEnd'),
 'carousel must have native touch swipe, not only decorative dots');
assert(stage.includes('Animated.loop')&&stage.includes('Animated.timing'),
 'movement must be real and continuous, not only static imagery');
assert(stage.includes('isReduceMotionEnabled'),
 'animated introduction must respect reduced-motion preference');
assert(stage.includes("require('../../assets/images/nexo-logo.png')"),
 'use authentic Nexo brand logo');
assert(stage.includes('router.replace(destination)'),
 'the welcome screens must connect to real navigation');
for(const action of ["finish('/registrarse')","finish('/iniciar-sesion')","finish('/')"]){
 assert(stage.includes(action),'all call-to-action destinations must exist: '+action);
}
assert(root.includes('hasSeenNexoOnboarding()')&&root.includes("router.replace('/bienvenida')"),
 'new users must actually encounter the carousel before login');
assert(root.includes("router.push('/bienvenida')"),
 'users must be able to replay the introduction');
const saved=new Map();
global.window={localStorage:{
 getItem:key=>saved.get(key)||null,
 setItem:(key,value)=>saved.set(key,value),
}};
assert.equal(onboardingExports.hasSeenNexoOnboarding(),false);
onboardingExports.completeNexoOnboarding();
assert.equal(onboardingExports.hasSeenNexoOnboarding(),true,
 'completed intro must not repeat on every page load');
assert(fs.existsSync('src/app/registrarse.tsx')&&
 fs.existsSync('src/app/iniciar-sesion.tsx')&&login.includes('signIn'),
 'existing secure sign-in routes must be kept');
console.log('PASS ONBOARDING: swipe, six slides, real logo, motion, access and login destinations');
