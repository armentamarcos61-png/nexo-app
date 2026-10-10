/**
 * Nexa's premium 3D identity, layered onto the single animated GLB.
 * All additions are genuine Three.js geometry, attached to the head joint.
 * No 2D impostor, duplicate avatar, or additional downloaded model.
 *
 * A full reference-matched sculpt would require re-topology/art direction.
 * This step upgrades headgear, dark hair, eyes, suit badge and lighting.
 */
export type PremiumNexaLook = { update(dt: number, time: number): void; dispose(): void };

export function installNexaPremiumLook(THREE: any, root: any, scene: any, referenceUrl: string): PremiumNexaLook {
  root.updateMatrixWorld(true);
  const head = root.getObjectByName('mixamorig:Head');
  if (!head) return { update() {}, dispose() {} };

  const matteWhite = new THREE.MeshPhysicalMaterial({
    color: 0xe9ebfc, metalness: 0.07, roughness: 0.43,
    clearcoat: 0.22, clearcoatRoughness: 0.32,
  });
  const ivory = new THREE.MeshPhysicalMaterial({
    color: 0xf8f2fa, metalness: 0, roughness: 0.65, clearcoat: 0.07,
  });
  const dark = new THREE.MeshPhysicalMaterial({
    color: 0x141427, metalness: 0.25, roughness: 0.49, clearcoat: 0.18,
  });
  const hairMat = new THREE.MeshPhysicalMaterial({
    color: 0x100d20, metalness: 0.12, roughness: 0.32,
    clearcoat: 0.53, clearcoatRoughness: 0.25,
    side: THREE.DoubleSide,
  });
  const hairHighlight = new THREE.MeshPhysicalMaterial({
    color: 0x332044, metalness: 0.18, roughness: 0.31,
    clearcoat: 0.54, side: THREE.DoubleSide,
  });
  const violet = new THREE.MeshBasicMaterial({ color: 0xa57bff });
  const glow = new THREE.MeshBasicMaterial({ color: 0xa77eff, toneMapped: false });
  const iris = new THREE.MeshPhysicalMaterial({
    color: 0x6838ee, emissive: 0x250d92, emissiveIntensity: 0.22,
    roughness: 0.12, metalness: 0.1, clearcoat: 1,
  });
  const pupil = new THREE.MeshBasicMaterial({ color: 0x0b0919 });
  const catchlight = new THREE.MeshBasicMaterial({ color: 0xf6eeff });
  const materials = [matteWhite, ivory, dark, hairMat, hairHighlight, violet, glow, iris, pupil, catchlight];
  const meshes: any[] = [];
  let active = true;
  const originalFaceMaterials: { mesh: any; material: any; geometry: any }[] = [];
  let referenceTexture: any = null;

  function add(parent: any, geometry: any, material: any, name?: string) {
    const mesh = new THREE.Mesh(geometry, material);
    if (name) mesh.name = name;
    parent.add(mesh);
    meshes.push(mesh);
    return mesh;
  }
  function pill(parent: any, pos: number[], size: number[], mat: any, name: string) {
    const shape = add(parent, new THREE.SphereGeometry(1, 28, 18), mat, name);
    shape.position.set(pos[0],pos[1],pos[2]);
    shape.scale.set(size[0],size[1],size[2]);
    return shape;
  }
  function tube(parent: any, points: number[][], radius: number, mat: any, name: string) {
    const curve = new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
    return add(parent,new THREE.TubeGeometry(curve, 24, radius, 5, false),mat,name);
  }
  function torus(parent: any, center: number[], radius: number, material: any, rotation: number[], name: string) {
    const obj=add(parent,new THREE.TorusGeometry(radius,0.0027,8,64),material,name);
    obj.position.set(center[0],center[1],center[2]);
    obj.rotation.set(rotation[0],rotation[1],rotation[2]);
    return obj;
  }

  // Logo texture uses the "N" monogram approved for Nexa, not a third-party emblem.
  function logoTexture() {
    const canvas=document.createElement('canvas');
    canvas.width=256;canvas.height=256;
    const c=canvas.getContext('2d');
    if(c) {
      c.clearRect(0,0,256,256);
      const gradient=c.createRadialGradient(128,128,12,128,128,120);
      gradient.addColorStop(0,'#211944');
      gradient.addColorStop(0.82,'#0e0a20');
      gradient.addColorStop(1,'#070811');
      c.fillStyle=gradient;
      c.beginPath();c.arc(128,128,116,0,Math.PI*2);c.fill();
      c.strokeStyle='#a38bff';c.lineWidth=10;
      c.beginPath();c.arc(128,128,111,0,Math.PI*2);c.stroke();
      c.shadowColor='#9369ff';c.shadowBlur=12;
      c.strokeStyle='#ffffff';c.lineWidth=18;c.lineCap='round';c.lineJoin='round';
      c.beginPath();c.moveTo(78,177);c.lineTo(78,78);c.lineTo(176,177);c.lineTo(176,78);c.stroke();
    }
    const t=new THREE.CanvasTexture(canvas);
    t.colorSpace=THREE.SRGBColorSpace;
    t.anisotropy=4;
    return t;
  }
  const mark=logoTexture();
  const logoMaterial=new THREE.MeshBasicMaterial({ map: mark, transparent: true, side: THREE.DoubleSide, toneMapped: false });

  function logo(parent:any, position:number[], radius:number, faceDirection:'front'|'left'|'right' = 'front') {
    const group = new THREE.Group();
    group.position.set(position[0],position[1],position[2]);
    if(faceDirection==='left')group.rotation.y=-Math.PI/2;
    if(faceDirection==='right')group.rotation.y=Math.PI/2;
    parent.add(group);
    // Physical emblem: raised letter that stays legible on mobile even when
    // the baked texture is dark or the cap is viewed from an angle.
    add(group,new THREE.CircleGeometry(radius,48),logoMaterial,'Nexo N emblem');
    torus(group,[0,0,0.003],radius*0.94,glow,[0,0,0],'Nexo neon rim');
    const ink=new THREE.MeshBasicMaterial({color:0xf5f4ff,toneMapped:false});
    materials.push(ink);
    const q=radius*0.53;
    tube(group,[[-q,-q,0.011],[-q,q,0.011],[q,-q,0.011],[q,q,0.011]],
      Math.max(0.0015,radius*0.085),ink,'NEXO raised N insignia');
  }

  // Locate model-space head position, then attach the upgrades to the
  // head bone while retaining world pose, including head speech motion.
  const center=root.localToWorld(new THREE.Vector3(0,1.605,0.015));
  const look=new THREE.Group();
  look.name='Nexa premium head identity';
  look.position.copy(center);
  scene.add(look);
  head.attach(look);

  // Hair mass at the rear; dozens of finely separated strand ribbons.
  pill(look,[0,0.035,-0.110],[0.146,0.123,0.067],hairMat,'Hair volume beneath cap');
  const hairSets:{pivot:any,side:number,seed:number,restX:number}[]=[];
  for(const side of [-1,1]) {
    for(let i=0;i<18;i++){
      const f=i/17;
      const pivot=new THREE.Group();
      pivot.position.set(side*(0.104+0.031*f),0.048-(f*0.065),-0.018-f*0.055);
      look.add(pivot);
      const taper=-0.18-0.21*f;
      // Fine realistic strands flow downwards with a gentle outward arch.
      const points=[
        [0,0,0],
        [side*0.012,-0.074,-0.009],
        [side*(0.024+0.006*Math.sin(i*1.17)),-0.17,-0.024],
        [side*(0.034+0.009*Math.sin(i*0.84)),-0.28,-0.041],
        [side*(0.042+0.012*Math.sin(i*0.72)),taper-0.07,-0.052],
      ];
      tube(pivot,points,0.0016+(i%4)*0.00055,i%5===0?hairHighlight:hairMat,'Nexa long hair strand');
      hairSets.push({pivot,side,seed:i*1.17,restX:0});
    }
  }
  // Front locks frame the cheek line without covering the eyes.
  for(const side of [-1,1]) {
    for(let i=0;i<8;i++) {
      const x=side*(0.092+i*.004);
      tube(look,[
        [x,0.062,0.018],
        [x+side*.008,0.008,0.053],
        [x+side*.013,-0.055,0.063],
        [x+side*.015,-0.135,0.042],
        [x+side*.023,-0.28,0.003],
      ],0.0019,i%3===0?hairHighlight:hairMat,'Front hair lock');
    }
  }

  // Refined white sci-fi cap and visible visor with violet trim.
  pill(look,[0,0.107,-0.007],[0.164,0.071,0.128],matteWhite,'Nexa white cap shell');
  pill(look,[0,0.086,0.076],[0.167,0.012,0.103],dark,'Visor black underside');
  pill(look,[0,0.090,0.085],[0.165,0.012,0.107],matteWhite,'Visor upper plate');
  tube(look,[[-0.15,0.09,0.10],[-0.09,0.092,0.166],[0,0.093,0.186],[0.09,0.092,0.166],[0.15,0.09,0.10]],0.003,glow,'Visor LED line');
  // Keep the N badge just ahead of the cap surface; the prior badge was
  // partially embedded, so it looked like an unreadable dark oval.
  logo(look,[0,0.16,0.152],0.036);

  // Rounded earpieces and integrated N branding.
  for(const side of [-1,1]){
    pill(look,[side*0.148,0.001,0.002],[0.024,0.070,0.070],dark,'Headset seal');
    pill(look,[side*0.172,0.001,0.004],[0.029,0.062,0.062],matteWhite,'Headset metal plate');
    const circleCenter=[side*0.193,0.001,0.004];
    torus(look,circleCenter,0.055,glow,[0,Math.PI/2,0],'Earpiece violet ring');
    logo(look,[side*0.215,0.001,0.004],0.047,side<0?'left':'right');
  }

  // Eye color comes from the deforming facial surface. Detached iris spheres
  // stayed visible through a blink and made the expression look frozen.

  // Reproject the approved illustration's facial features onto the genuine
  // skinned facial surface. The skin mesh keeps all morph target animations.
  // No billboard/sprite is used; turning Nexa still reveals a 3D face.
  const faceMaterialMeshes: any[] = [];
  root.traverse((node: any) => {
    if (!node.isSkinnedMesh) return;
    const name = Array.isArray(node.material) ? '' : node.material?.name ?? '';
    if (name === 'Nexa_Soft_Facial_Skin') faceMaterialMeshes.push(node);
  });
  if (faceMaterialMeshes.length) {
    new THREE.TextureLoader().load(referenceUrl, (texture: any) => {
      if (!active) { texture.dispose(); return; }
      texture.colorSpace=THREE.SRGBColorSpace;
      texture.anisotropy=4;
      texture.wrapS=THREE.ClampToEdgeWrapping;
      texture.wrapT=THREE.ClampToEdgeWrapping;
      referenceTexture=texture;
      for(const mesh of faceMaterialMeshes){
        const oldGeometry=mesh.geometry;
        const oldMaterial=mesh.material;
        const geometry=oldGeometry.clone();
        const positions=geometry.getAttribute('position');
        const uv=new Float32Array(positions.count*2);
        for(let i=0;i<positions.count;i++){
          const x=positions.getX(i),y=positions.getY(i);
          // Front-facing photo: brows ~1.62, eyes ~1.59,
          // lips ~1.52 in the original character's mesh coordinates.
          uv[i*2]=Math.max(0,Math.min(1,x/0.18+0.58));
          uv[i*2+1]=Math.max(0,Math.min(1,(y-1.48)/0.198));
        }
        geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
        const material=oldMaterial.clone();
        material.map=texture;
        material.color.set(0xffffff);
        material.metalness=0;
        material.roughness=0.9;
        material.normalMap=null;
        material.needsUpdate=true;
        mesh.geometry=geometry;
        mesh.material=material;
        originalFaceMaterials.push({mesh,material:oldMaterial,geometry:oldGeometry});
      }
    },undefined,()=>{ /* Preserve original facial material if image is offline. */ });
  }

  // Chest insignia belongs to the body so it doesn't sway with the head.
  const badge=new THREE.Group();
  badge.position.set(0.117,1.28,0.235);
  root.add(badge);
  logo(badge,[0,0,0],0.055,'front');

  let sway=0;
  let velocity=0;
  let oldYaw=0;
  return {
    update(dt:number,time:number) {
      const step=Math.min(0.05,Math.max(dt,0));
      const wanted=0.027*Math.sin(time*0.91);
      velocity+=(wanted-sway)*step*17;
      velocity*=Math.exp(-step*6.5);
      sway+=velocity*step*9;
      // Spring return/gravity effect, subtle; no explosive hair physics.
      const headYaw=head.rotation.y;
      const change=headYaw-oldYaw;
      oldYaw=headYaw;
      for(const part of hairSets) {
        part.pivot.rotation.z=part.side*(sway*0.85+0.007*Math.sin(time*0.67+part.seed));
        part.pivot.rotation.y=Math.max(-0.09,Math.min(0.09,-change*0.5));
      }
    },
    dispose() {
      active=false;
      for(const item of originalFaceMaterials){
        item.mesh.geometry.dispose?.();
        item.mesh.material.dispose?.();
        item.mesh.geometry=item.geometry;
        item.mesh.material=item.material;
      }
      referenceTexture?.dispose?.();
      for(const item of meshes)item.geometry?.dispose?.();
      for(const material of materials)material.dispose?.();
      logoMaterial.dispose?.();
      mark.dispose();
      look.removeFromParent();
      badge.removeFromParent();
    },
  };
}
