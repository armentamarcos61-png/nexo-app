#!/usr/bin/env python3
"""Generate one facially rigged Nexa GLB from the existing uploaded model.
Keeps all original body bones, textures and five animations. Requires numpy.
"""
import copy
import json
import math
import struct
from pathlib import Path
import numpy as np

src=Path('public/models/Nexa_Unica_Interactiva.glb')
out=Path('public/models/Nexa_FacialRig_V2.glb')
raw=src.read_bytes()
magic,version,length=struct.unpack_from('<4sII',raw,0)
assert magic==b'glTF' and version==2 and length==len(raw)
size,kind=struct.unpack_from('<I4s',raw,12)
assert kind==b'JSON'
doc=json.loads(raw[20:20+size])
offset=20+size
bsize,btype=struct.unpack_from('<I4s',raw,offset)
assert btype==b'BIN\x00'
binary=bytearray(raw[offset+8:offset+8+bsize])
D={5120:np.int8,5121:np.uint8,5122:np.int16,5123:np.uint16,5125:np.uint32,5126:np.float32}
C={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}
def read(i):
 a=doc['accessors'][i];v=doc['bufferViews'][a['bufferView']]
 dt=np.dtype(D[a['componentType']]);count=C[a['type']]
 pos=v.get('byteOffset',0)+a.get('byteOffset',0)
 stride=v.get('byteStride',dt.itemsize*count)
 return np.ndarray((a['count'],count),dtype=dt,buffer=binary,offset=pos,strides=(stride,dt.itemsize)).copy()
def add(data,typ,shape,name,target=None):
 data=np.ascontiguousarray(data)
 binary.extend(b'\0'*(-len(binary)%4))
 off=len(binary);binary.extend(data.tobytes())
 bv={'buffer':0,'byteOffset':off,'byteLength':data.nbytes}
 if target is not None:bv['target']=target
 view=len(doc['bufferViews']);doc['bufferViews'].append(bv)
 acc={'bufferView':view,'componentType':typ,'count':len(data),'type':shape,'name':name}
 if data.size and typ==5126:
  acc['min']=np.min(data,axis=0).astype(float).tolist()
  acc['max']=np.max(data,axis=0).astype(float).tolist()
 result=len(doc['accessors']);doc['accessors'].append(acc);return result
mesh=doc['meshes'][0];prim=mesh['primitives'][0]
assert not prim.get('targets'), 'Only run on the original unmodified GLB'
attrs=prim['attributes']
pos=read(attrs['POSITION']).astype(np.float32)
joints=np.concatenate([read(attrs['JOINTS_'+str(i)]) for i in range(3)],axis=1)
weights=np.concatenate([read(attrs['WEIGHTS_'+str(i)]) for i in range(3)],axis=1)
head_node=next(i for i,node in enumerate(doc['nodes']) if node.get('name')=='mixamorig:Head')
head_id=doc['skins'][0]['joints'].index(head_node)
head_weight=np.sum(weights*(joints==head_id),axis=1)
x,y,z=pos.T
front=np.clip((z-.074)/.052,0,1)**.8
head=np.clip((head_weight-.34)/.66,0,1)
mask=front*head
def spot(cx,cy,cz,rx,ry,rz):
 return np.exp(-.5*((x-cx)/rx)**2-.5*((y-cy)/ry)**2-.5*((z-cz)/rz)**2)*mask
def blank():return np.zeros_like(pos,dtype=np.float32)
targets={}
mouth=spot(0,1.520,.132,.044,.024,.041)
top=y>=1.521
v=blank();v[:,1]=mouth*np.where(top,.0016,-.0034);v[:,2]=mouth*.0006
targets['MouthOpen']=v
v=blank();v[:,0]=-x*mouth*.045;v[:,1]=mouth*np.where(top,.0007,-.0011);v[:,2]=mouth*.0008
targets['MouthO']=v
v=blank();v[:,0]=x*mouth*.065;v[:,1]=mouth*np.where(top,.0008,-.0010)
targets['MouthWide']=v
v=blank();v[:,0]=x*mouth*.055;v[:,1]=mouth*(.0009+.0016*np.clip((np.abs(x)-.012)/.033,0,1))
targets['MouthSmile']=v
for name,cx in [('EyeBlinkLeft',-.036),('EyeBlinkRight',.036)]:
 eye=spot(cx,1.597,.128,.029,.022,.048)
 v=blank();v[:,1]=eye*(1.597-y)*1.0;v[:,2]=eye*.0006
 targets[name]=v
for name,cx in [('BrowRaiseLeft',-.038),('BrowRaiseRight',.038)]:
 brow=spot(cx,1.630,.121,.032,.016,.052)
 v=blank();v[:,1]=brow*.0052;v[:,2]=brow*.0008
 targets[name]=v
v=blank()
for cx in (-.038,.038):
 brow=spot(cx,1.630,.121,.029,.016,.05)
 v[:,1]-=brow*.003;v[:,0]+=-np.sign(cx)*brow*.001
targets['BrowFrown']=v
names=list(targets)
for name,shape in targets.items():
 lengths=np.linalg.norm(shape,axis=1)
 moved=int(np.sum(lengths>1e-6))
 assert moved>15 and float(np.max(lengths))<.026,(name,moved)
 print(name,moved,'vertices')
morph=[{'POSITION':add(delta.astype('<f4'),5126,'VEC3',name)} for name,delta in targets.items()]
prim['targets']=morph
mesh['weights']=[0.0]*len(names)
mesh.setdefault('extras',{})['targetNames']=names

# Matte facial skin: the baked body texture is retained, but face triangles
# receive a softer material without metallic/roughness baked into the skin.
indices=read(prim['indices']).reshape(-1,3)
face=(head_weight>.73)&(y>1.49)&(y<1.647)&(z>.078)&(np.abs(x)<.084)
chosen=np.all(face[indices],axis=1)
assert np.sum(chosen)>70
body_indices=add(indices[~chosen].astype('<u4').reshape(-1,1),5125,'SCALAR','Nexa_BodyIndices',34963)
skin_indices=add(indices[chosen].astype('<u4').reshape(-1,1),5125,'SCALAR','Nexa_FaceIndices',34963)
prim['indices']=body_indices
skin=copy.deepcopy(doc['materials'][0])
skin['name']='Nexa_Soft_Facial_Skin'
skin['doubleSided']=False
skin['pbrMetallicRoughness'].pop('metallicRoughnessTexture',None)
skin['pbrMetallicRoughness'].update({'metallicFactor':0.0,'roughnessFactor':0.84})
if 'normalTexture' in skin: skin['normalTexture']['scale']=.32
skin['extensions']={'KHR_materials_specular':{'specularFactor':0.42}}
if 'KHR_materials_specular' not in doc.get('extensionsUsed',[]):
 doc.setdefault('extensionsUsed',[]).append('KHR_materials_specular')
doc['materials'].append(skin)
mesh['primitives'].append({'attributes':copy.deepcopy(attrs),'indices':skin_indices,'material':len(doc['materials'])-1,'mode':4,'targets':copy.deepcopy(morph)})

# Optional demo clip can be previewed in any standard GLB animation viewer.
# Application does NOT play this clip: it drives targets from voice events.
times=np.array([0,.3,.6,1,1.25,1.42,1.58,2,2.45,2.8,3.15,3.55,4.1,4.48,4.65,4.82,5.25,5.7,6.2,6.6,7,7.45,8,8.6,9.15,9.7,10],dtype='<f4')
values=[]
for t in times:
 state={name:0 for name in names}
 if .3<t<3.55:
  state['MouthOpen']=max(0,np.sin(t*7)**2*.24)
  state['MouthWide']=max(0,np.sin(t*4+1)**2*.16)
  state['MouthO']=max(0,np.sin(t*2.9)**2*.16)
  state['BrowRaiseLeft']=max(0,np.sin(t*1.3)**2*.65)
  state['BrowRaiseRight']=max(0,np.sin(t*1.3+.4)**2*.55)
 if 4.3<t<4.85:
  state['EyeBlinkLeft']=state['EyeBlinkRight']=np.sin(np.pi*min(1,(t-4.3)/.55))
 if 5.2<t<8.5:
  state['MouthSmile']=.72
  state['BrowRaiseLeft']=.28
  state['BrowRaiseRight']=.30
 if 6.5<t<7.1:
  state['EyeBlinkLeft']=state['EyeBlinkRight']=np.sin(np.pi*min(1,(t-6.5)/.6))
 values.extend(float(state[name]) for name in names)
input_a=add(times.reshape(-1,1),5126,'SCALAR','FacialDemoTimes')
output_a=add(np.array(values,dtype='<f4').reshape(-1,1),5126,'SCALAR','FacialDemoWeights')
mesh_node=next(i for i,n in enumerate(doc['nodes']) if n.get('mesh')==0)
doc['animations'].append({'name':'Nexa_FacialDemo','samplers':[{'input':input_a,'output':output_a,'interpolation':'LINEAR'}],'channels':[{'sampler':0,'target':{'node':mesh_node,'path':'weights'}}]})

doc['buffers'][0]['byteLength']=len(binary)
doc['asset'].setdefault('extras',{})['facialRig']='Nexa v3: relaxed expressions, 9 native morph targets, face material, facial demo'
j=json.dumps(doc,separators=(',',':')).encode('utf8')
j+=b' '*((-len(j))%4)
binary.extend(b'\0'*(-len(binary)%4))
result=struct.pack('<4sII',b'glTF',2,12+8+len(j)+8+len(binary))
result+=struct.pack('<I4s',len(j),b'JSON')+j
result+=struct.pack('<I4s',len(binary),b'BIN\x00')+binary
out.write_bytes(result)
print('Generated',out,'bytes',len(result),'facial morphs',len(names))
