#!/usr/bin/env node
'use strict';
/**
 * Generates installable Android/Chrome icons from the OFFICIAL Nexo logo.
 * PNGJS is already in package-lock.json as an Expo dependency.
 * The script uses a safe centered crop only when transparent padding exists,
 * preserving aspect ratio and the actual approved branding.
 */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {PNG}=require('pngjs');
const source=path.join(__dirname,'..','assets','images','nexo-logo.png');
const out=path.join(__dirname,'..','public','icons');
const original=PNG.sync.read(fs.readFileSync(source));
assert(original.width>=64&&original.height>=64,'Official Nexo logo is too small.');
fs.mkdirSync(out,{recursive:true});
function bounds(){
 let minX=original.width,minY=original.height,maxX=-1,maxY=-1;
 for(let y=0;y<original.height;y++){
  for(let x=0;x<original.width;x++){
   const i=(y*original.width+x)*4;
   if(original.data[i+3]>30){
    minX=Math.min(minX,x);maxX=Math.max(maxX,x);
    minY=Math.min(minY,y);maxY=Math.max(maxY,y);
   }
  }
 }
 if(maxX<0)return {x:0,y:0,w:original.width,h:original.height};
 const bw=maxX-minX+1,bh=maxY-minY+1;
 // Crop only genuinely transparent margins. Opaque black background remains
 // part of the brand, and is not mistaken for blank transparency.
 return {x:minX,y:minY,w:bw,h:bh};
}
const src=bounds();
function generate(size,margin,name){
 const icon=new PNG({width:size,height:size,colorType:6});
 const data=icon.data;
 for(let i=0;i<data.length;i+=4){
  data[i]=11;data[i+1]=14;data[i+2]=19;data[i+3]=255;
 }
 const maxArea=size*(1-margin*2);
 const factor=Math.min(maxArea/src.w,maxArea/src.h);
 const w=Math.max(1,Math.round(src.w*factor));
 const h=Math.max(1,Math.round(src.h*factor));
 const x0=Math.round((size-w)/2);
 const y0=Math.round((size-h)/2);
 for(let y=0;y<h;y++){
  for(let x=0;x<w;x++){
   const sx=src.x+Math.min(src.w-1,Math.floor((x+0.5)*src.w/w));
   const sy=src.y+Math.min(src.h-1,Math.floor((y+0.5)*src.h/h));
   const si=(sy*original.width+sx)*4;
   const di=((y+y0)*size+x+x0)*4;
   const alpha=original.data[si+3]/255;
   for(let c=0;c<3;c++){
    data[di+c]=Math.round(original.data[si+c]*alpha+data[di+c]*(1-alpha));
   }
  }
 }
 const target=path.join(out,name);
 fs.writeFileSync(target,PNG.sync.write(icon));
 const check=PNG.sync.read(fs.readFileSync(target));
 assert.equal(check.width,size);
 assert.equal(check.height,size);
 console.log('Nexo PWA:',target,size+'x'+size);
}
generate(192,.08,'nexo-192.png');
generate(512,.08,'nexo-512.png');
// Android adaptive/maskable icons need extra safe margins for circular crop.
generate(512,.20,'nexo-maskable-512.png');
