#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const ts=require('typescript');
function compiled(file,requires={}){
 const src=fs.readFileSync(file,'utf8');
 const result=ts.transpileModule(src,{compilerOptions:{
  module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,
 }});
 const exports={};
 new Function('exports','require',result.outputText)(exports,dep=>{
  if(dep in requires)return requires[dep];
  throw Error('unexpected import '+dep);
 });
 return exports;
}
const controller=compiled('src/lib/nexa-animation-controller.ts');
const movements=['Idle','Walking','Running','Greeting','Talking','Confused','Skipping'];
function makeController(){
 const actions=Object.fromEntries(movements.map(name=>[name,{
  name,timeScale:1,reset(){return this;},play(){return this;},
  fadeIn(){return this;},fadeOut(){return this;},stop(){return this;},
 }]));
 return new controller.NexaAnimationController({update(){}},actions,
  {position:{x:0,y:0,z:0},rotation:{y:0}},.58);
}
function stay(method,runSeconds,expectedName){
 const c=makeController();
 method(c);
 for(let t=0;t<runSeconds-.1;t+=.05)c.update(.05);
 assert.equal(c.motion,expectedName,'animation ends too early: '+expectedName);
 for(let t=0;t<.25;t+=.05)c.update(.05);
 assert.equal(c.motion,'Idle','animation must smoothly return to idle');
 c.dispose();
}
stay(c=>c.greet(),8.5,'Greeting');
// Tapping Saludar twice during a current salute must replay, not freeze.
const repeat=makeController();
repeat.greet();
for(let i=0;i<90;i++)repeat.update(.05);
repeat.greet();
assert.equal(repeat.motion,'Greeting');
for(let i=0;i<110;i++)repeat.update(.05);
assert.equal(repeat.motion,'Greeting','restarted salute must remain in motion');
repeat.dispose();

stay(c=>c.expressConfused(),10.2,'Confused');
stay(c=>c.skipForward(),7.7,'Skipping');
stay(c=>c.moveTo(0,0,false),9.5,'Walking');
stay(c=>c.moveTo(0,0,true),8.4,'Running');
const male=fs.readFileSync('src/components/assistant-stage-nexo.web.tsx','utf8');
const female=fs.readFileSync('src/components/assistant-stage.web.tsx','utf8');
const composite=fs.readFileSync('src/lib/nexa-composite.ts','utf8');
assert(male.includes('originalDuration/(originalDuration+3)'),
 'Nexo animations must last exactly three seconds longer than their source');
assert(!male.includes("const initial=clips['wave_one_hand']"),
 'Nexo must enter with arms down, not immediately play an automatic wave');
assert(!female.includes("if (!speakingRef.current) controllerRef.current.greet();"),
 'Nexa must enter with hands down instead of raising both arms automatically');
assert(male.includes('current.setEffectiveTimeScale(nominalSpeed*(1-.28*eased))'),
 'Nexo must decelerate before relaxing its arms');
assert(male.includes('fadeIn(1.65)')&&male.includes('fadeOut(1.65)')&&
 male.includes('remaining<=1.65'),
 'Nexo must begin easing to down-arms idle BEFORE the source clip finishes');
assert(male.includes('relaxedIdleClip(THREE,root,4)'),
 'Nexo must not return to the original rigid T-pose');
assert(female.includes("name==='Idle'?relaxedIdleClip(THREE,modelRoot,4)"),
 'Nexa must have an independently lowered-arms idle pose');
assert(male.includes('settlingRef.current=false'),
 'Nexo must reset the settle state when a new motion begins');
assert(male.includes('controlRef.current?.blinkNow()')&&
 female.includes('faceRigRef.current?.blinkNow()'),
 'both facial demos must trigger actual new blinks');
assert(male.includes('timeRef.current+8.5')&&
 female.includes('elapsedRef.current+8.5'),
 'both facial demonstrations must show gestures for three more seconds');
assert(female.includes('greetRef.current=()=>{controllerRef.current?.greet();composite?.greet();};'),
 'new Android Nexa must have a real Saludar action');
assert(composite.includes('greetingRemaining=8.2'),
 'Studio legacy body salute must gain three seconds, too');
const screen=fs.readFileSync('src/components/nexo-screen.tsx','utf8');
const registration=fs.readFileSync('src/app/registrarse.tsx','utf8');
const login=fs.readFileSync('src/app/iniciar-sesion.tsx','utf8');
assert(screen.includes('function getNexoFieldHint')&&screen.includes('ui.fieldHint'),
 'all form fields require persistent instructions under inputs');
assert(registration.includes('formatBirthDate(value)')&&
 registration.includes('DD/MM/AAAA')&&
 registration.includes('hint="Vuelve a escribir exactamente'),
 'registration must explain and format dates, and explain password confirmation');
assert(login.includes('hint="Escribe tu contraseña'),
 'sign-in must explain its fields');
console.log('PASS: Nexa and Nexo relax arms down, natural early crossfades, 3-second longer motions, immediate visible face demo blinks');
