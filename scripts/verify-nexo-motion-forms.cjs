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
stay(c=>c.expressConfused(),10.2,'Confused');
stay(c=>c.skipForward(),7.7,'Skipping');
stay(c=>c.moveTo(0,0,false),9.5,'Walking');
stay(c=>c.moveTo(0,0,true),8.4,'Running');
const male=fs.readFileSync('src/components/assistant-stage-nexo.web.tsx','utf8');
const female=fs.readFileSync('src/components/assistant-stage.web.tsx','utf8');
const composite=fs.readFileSync('src/lib/nexa-composite.ts','utf8');
assert(male.includes('originalDuration/(originalDuration+3)'),
 'Nexo animations must last exactly three seconds longer than their source');
assert(male.includes('fadeIn(.75)')&&male.includes('fadeOut(.75)'),
 'Nexo crossfades must be gradual');
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
console.log('PASS: Nexa 5 motions +3s, male clip duration +3s, two facial demos +3s, functional Nexa salute, hints for every input');
