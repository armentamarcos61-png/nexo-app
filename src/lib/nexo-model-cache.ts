/**
 * Persistent browser-side import for user-supplied GLB. This enables the
 * actual Nexo 3D locally even when GitHub contents API cannot accept a binary
 * attachment from the assistant. Does not send the file to any third party.
 */
const DB='nexo-gltf-characters';
const STORE='models';
const KEY='nexo-face-v1';
function storage():Promise<IDBDatabase>{
 return new Promise((resolve,reject)=>{
  if(typeof indexedDB==='undefined')return reject(Error('Tu navegador no admite almacenamiento 3D.'));
  const req=indexedDB.open(DB,1);
  req.onupgradeneeded=()=>{
   const db=req.result;
   if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE);
  };
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||Error('No se pudo abrir el almacenamiento 3D.'));
 });
}
export function verifyNexoGLB(buffer:ArrayBuffer){
 if(buffer.byteLength<100000||buffer.byteLength>65_000_000)throw Error('Tamaño de archivo 3D inválido.');
 const view=new DataView(buffer);
 if(view.getUint32(0,true)!==0x46546c67 || view.getUint32(4,true)!==2
    || view.getUint32(8,true)!==buffer.byteLength)
  throw Error('Debe ser un modelo GLB completo, no una imagen ni un ZIP.');
 const jsonSize=view.getUint32(12,true);
 if(view.getUint32(16,true)!==0x4e4f534a || jsonSize>2_000_000 || jsonSize+20>buffer.byteLength)
  throw Error('Los datos internos del modelo no son válidos.');
 const doc=JSON.parse(new TextDecoder().decode(buffer.slice(20,20+jsonSize)));
 const targets=doc.meshes?.flatMap((m:any)=>m.extras?.targetNames||[])||[];
 const required=['EyeBlinkLeft','EyeBlinkRight','BrowRaiseLeft','BrowRaiseRight',
  'MouthOpen','MouthO','MouthWide','EyeLookLeft','EyeLookRight'];
 for(const name of required)
  if(!targets.includes(name))throw Error('Este modelo no incluye el control facial: '+name);
 if(!Array.isArray(doc.skins)||!doc.skins.length ||
    !Array.isArray(doc.animations)||doc.animations.length<4)
  throw Error('Faltan los huesos o las animaciones corporales de Nexo.');
 return true;
}
export async function saveNexoGLB(file:File):Promise<void>{
 const bytes=await file.arrayBuffer();
 verifyNexoGLB(bytes);
 const db=await storage();
 try{
  await new Promise<void>((resolve,reject)=>{
   const tx=db.transaction(STORE,'readwrite');
   tx.objectStore(STORE).put(bytes,KEY);
   tx.oncomplete=()=>resolve();
   tx.onerror=()=>reject(tx.error||Error('No se pudo guardar Nexo 3D.'));
  });
 }finally{db.close();}
}
export async function getStoredNexoGLB():Promise<ArrayBuffer|null>{
 if(typeof indexedDB==='undefined')return null;
 const db=await storage();
 try{
  const value=await new Promise<unknown>((resolve,reject)=>{
   const request=db.transaction(STORE,'readonly').objectStore(STORE).get(KEY);
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>reject(request.error||Error('No se pudo recuperar Nexo 3D.'));
  });
  if(!(value instanceof ArrayBuffer))return null;
  try{verifyNexoGLB(value);return value;}catch{return null;}
 }finally{db.close();}
}
