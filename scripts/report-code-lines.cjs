#!/usr/bin/env node
'use strict';
/** Count Git-tracked source lines. Ignore binaries, dependencies, build output
 * and vendored/generated models. This is the maintained application's size,
 * not raw media bytes or package-lock.json entries.
 */
const fs=require('node:fs');
const cp=require('node:child_process');
const path=require('node:path');
const output=process.argv[2]||'';
const filenames=cp.execFileSync('git',['ls-files','-z'],{encoding:'utf8'})
 .split('\0').filter(Boolean);
const sourceExt=new Set(['.ts','.tsx','.js','.jsx','.mjs','.cjs','.py','.css','.scss','.html','.sql','.sh']);
const configExt=new Set(['.json','.yaml','.yml','.toml']);
const excluded=/^(?:node_modules|dist|build|coverage|\.expo|\.next|\.nexa-studio-parts|public\/models\/|assets\/|\.git\/)/;
const fileStats=[];
for(const file of filenames){
 if(excluded.test(file))continue;
 const ext=path.extname(file).toLowerCase();
 if(!sourceExt.has(ext)&&!configExt.has(ext))continue;
 if(!fs.existsSync(file)||!fs.statSync(file).isFile())continue;
 const text=fs.readFileSync(file,'utf8');
 const lines=text.length?text.split(/\r?\n/).length-(text.endsWith('\n')?1:0):0;
 fileStats.push({path:file,lines,kind:sourceExt.has(ext)?'codigo':'configuracion'});
}
const sum=files=>files.reduce((a,f)=>a+f.lines,0);
const kinds=['codigo','configuracion'];
const report={
 generatedAt:new Date().toISOString(),
 definition:'Lineas fisicas incluidas en Git: TS/TSX/JS/JSX/MJS/CJS/PY/CSS/SCSS/HTML/SQL/SH; excluye dependencias, medios, modelos y archivos de compilacion.',
 files:fileStats.length,
 totalLines:sum(fileStats),
 codeLines:sum(fileStats.filter(f=>f.kind==='codigo')),
 configurationLines:sum(fileStats.filter(f=>f.kind==='configuracion')),
 codeFiles:fileStats.filter(f=>f.kind==='codigo').length,
 byFolder:Object.fromEntries(
  [...new Set(fileStats.map(f=>f.path.split('/')[0]))].sort()
   .map(folder=>[folder,sum(fileStats.filter(f=>f.path.split('/')[0]===folder))])
 ),
 byExtension:Object.fromEntries(
  [...new Set(fileStats.map(f=>path.extname(f.path)))].sort()
   .map(ext=>[ext,sum(fileStats.filter(f=>path.extname(f.path)===ext))])
 ),
};
if(output){fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');}
console.log('NEXO LINEAS DE CODIGO:',report.codeLines);
console.log('NEXO LINEAS CONFIGURACION:',report.configurationLines);
console.log('NEXO LINEAS TOTALES:',report.totalLines,'en',report.files,'archivos');
