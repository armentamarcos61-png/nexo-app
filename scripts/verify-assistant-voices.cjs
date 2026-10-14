#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const ts=require('typescript');
const assert=require('node:assert/strict');
const voices=[
 {identifier:'es-MX-DaliaNeural',name:'Dalia Neural',language:'es-MX',quality:'Enhanced'},
 {identifier:'es-MX-JorgeNeural',name:'Jorge Neural',language:'es-MX',quality:'Enhanced'},
 {identifier:'es-ES-Rosa',name:'Rosa',language:'es-ES',quality:'Default'},
 {identifier:'en-US-Alex',name:'Alex',language:'en-US',quality:'Enhanced'},
];
const speech={
 calls:[],
 async getAvailableVoicesAsync(){return voices;},
 async stop(){},
 async isSpeakingAsync(){return false;},
 speak(text,options){this.calls.push({text,options});options.onStart?.();options.onDone?.();}
};
const stored=new Map();
global.window={localStorage:{
 getItem:key=>stored.get(key)||null,
 setItem:(key,value)=>stored.set(key,value),
 removeItem:key=>stored.delete(key),
}};
const source=fs.readFileSync('src/lib/assistant-speech.ts','utf8');
const js=ts.transpileModule(source,{compilerOptions:{
 module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,
}}).outputText;
const target={};
new Function('exports','require',js)(target,name=>{
 if(name==='expo-speech')return speech;
 if(name==='react-native')return {Platform:{OS:'web'}};
 throw Error('Unexpected runtime dependency '+name);
});
async function test(){
 const female=await target.listAssistantVoices('nexa');
 const male=await target.listAssistantVoices('nexo');
 assert.equal(female[0].identifier,'es-MX-DaliaNeural');
 assert.equal(male[0].identifier,'es-MX-JorgeNeural');
 assert(female.every(v=>v.language.startsWith('es')));
 assert(male.every(v=>v.language.startsWith('es')));
 target.setAssistantVoiceChoice('nexa','es-MX-DaliaNeural');
 target.setAssistantVoiceChoice('nexo','es-MX-JorgeNeural');
 assert.equal(target.getAssistantVoiceChoice('nexa'),'es-MX-DaliaNeural');
 assert.equal(target.getAssistantVoiceChoice('nexo'),'es-MX-JorgeNeural');
 let start=0,done=0;
 await target.previewAssistantVoice('nexa',{
  onStart:()=>start++,onDone:()=>done++,
 });
 await target.previewAssistantVoice('nexo',{
  onStart:()=>start++,onDone:()=>done++,
 });
 assert.equal(start,2);
 assert.equal(done,2);
 assert.equal(speech.calls[0].options.voice,'es-MX-DaliaNeural');
 assert.equal(speech.calls[1].options.voice,'es-MX-JorgeNeural');
 for(const result of speech.calls){
  assert(result.options.pitch>=0.95 && result.options.pitch<=1.04);
  assert(result.options.rate>=0.94 && result.options.rate<=1.02);
 }
 target.setAssistantVoiceChoice('nexa',null);
 assert.equal(target.getAssistantVoiceChoice('nexa'),null);
 // Unknown voice identifiers must not result in undefined or English voice.
 target.setAssistantVoiceChoice('nexa','missing-device-voice');
 await target.previewAssistantVoice('nexa');
 assert.equal(speech.calls.at(-1).options.voice,'es-MX-DaliaNeural');
 const screen=fs.readFileSync('src/app/asistente.tsx','utf8');
 assert(screen.includes('Elegir y probar voz gratis'));
 assert(screen.includes('onPress={()=>testVoice(option.identifier)}'));
 assert(screen.includes('onPress={()=>testVoice(null)}'));
 assert(!source.includes('AZURE_SPEECH_KEY')&&!source.includes('GOOGLE_TTS_KEY'),
  'cloud provider API keys must never be embedded into client code');
 console.log('PASS: free voice preview, real male/female voices, mobile-safe fallbacks, persistent per-avatar preferences');
}
test().catch(e=>{console.error(e);process.exitCode=1;});
