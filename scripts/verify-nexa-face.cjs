// Regression: visibly closed eyelids, articulated speech and no pose drift.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const result = ts.transpileModule(fs.readFileSync('src/lib/nexa-face-rig.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});
const exportsObject = {};
new Function('exports', result.outputText)(exportsObject);
const names = ['MouthOpen','MouthO','MouthWide','MouthSmile','EyeBlinkLeft','EyeBlinkRight','BrowRaiseLeft','BrowRaiseRight','BrowFrown','EyeLookLeft','EyeLookRight','EyeLookUp','EyeLookDown'];
for (const fps of [20, 30, 60, 120]) {
  const head = { name: 'mixamorig:Head', rotation: { x: 0, y: 0 } };
  const mesh = { isSkinnedMesh: true, morphTargetDictionary: Object.fromEntries(names.map((n,i)=>[n,i])), morphTargetInfluences: names.map(()=>0) };
  const rig = exportsObject.installNexaFaceRig(null, { traverse: f => [head,mesh].forEach(f) });
  assert.ok(rig.available);
  let closed = 0, largestOpening = 0, largestGaze = 0, largestBrow = 0;
  for (let frame=0;frame<fps*12;frame++) {
    rig.beforeUpdate();
    rig.update(1/fps, frame/fps, frame < fps*8);
    const weights=mesh.morphTargetInfluences;
    assert.ok(weights.every(v => Number.isFinite(v) && v>=0 && v<=1));
    if (weights[4] === 1 && weights[5] === 1) closed++;
    largestOpening=Math.max(largestOpening,weights[0]);
    largestBrow=Math.max(largestBrow,weights[6],weights[7]);
    largestGaze=Math.max(largestGaze, ...weights.slice(9,13));
    assert.ok(Math.abs(head.rotation.x)<=0.012 && Math.abs(head.rotation.y)<=0.009,
      'Micro head motion must stay below one degree');
    rig.beforeUpdate();
    assert.ok(Math.abs(head.rotation.x)<1e-8 && Math.abs(head.rotation.y)<1e-8,
      'Every head gesture must be reversible without drift');
  }
  assert.ok(closed>0, 'Blink must reach full closure at '+fps+' fps');
  assert.ok(largestOpening>.28, 'Speech must articulate the lips');
  assert.ok(largestBrow>.14 && largestBrow<.27, 'Studio eyebrows should move slightly, without exaggerated expressions');
  assert.ok(largestGaze>.02, 'Eyes must change gaze without moving brows or skull');
  assert.ok(mesh.morphTargetInfluences[0]<.001, 'Lips must settle after speech');
}

class Attr {
  constructor(values) { this.data=values; this.count=values.length; this.needsUpdate=false; }
  getX(i){return this.data[i][0];}
  getY(i){return this.data[i][1];}
  getZ(i){return this.data[i][2];}
  setXYZ(i,x,y,z){this.data[i]=[x,y,z];}
}
const positions=[],leftBlink=[],rightBlink=[],mouth=[];
for(let row=0;row<37;row++){
  const y=.315+row*.005;
  for(let col=0;col<45;col++){
    const x=-.11+col*.005;
    positions.push([x,y,.094]);
    const left=Math.abs(x+.055)<.028&&Math.abs(y-.432)<.013;
    const right=Math.abs(x-.055)<.028&&Math.abs(y-.432)<.013;
    const lips=Math.abs(x)<.036&&Math.abs(y-.337)<.020;
    leftBlink.push([0,left?(y>.432?-.0027:.0011):0,0]);
    rightBlink.push([0,right?(y>.432?-.0027:.0011):0,0]);
    mouth.push([0,lips&&y<.337?-.0045:0,0]);
  }
}
const oldLeft=leftBlink.map(v=>v.slice()),oldRight=rightBlink.map(v=>v.slice());
const meshGeom={
  attributes:{position:new Attr(positions)},
  morphAttributes:{position:[new Attr(leftBlink),new Attr(rightBlink),new Attr(mouth)]},
};
const studioMesh={
  isSkinnedMesh:true, geometry:meshGeom,
  morphTargetDictionary:{EyeBlinkLeft:0,EyeBlinkRight:1,MouthOpen:2},
};
const geometryFixture={traverse:f=>f(studioMesh)};
const changed=exportsObject.calibrateNexaFacialMorphs(geometryFixture);
assert(changed>=3,'actual morph vertices must be improved, not just blendshape weights');
let increased=0,unrelated=0,secondEyeAffected=0;
for(let i=0;i<positions.length;i++){
 const x=positions[i][0],y=positions[i][1];
 const before=oldLeft[i][1],after=meshGeom.morphAttributes.position[0].getY(i);
 if(Math.abs(after)>Math.abs(before)+0.0003)increased++;
 if(Math.abs(x+.055)>.04||Math.abs(y-.432)>.021) {
   if(Math.abs(after-before)>0.000001)unrelated++;
 }
 const rightBefore=oldRight[i][1],rightAfter=meshGeom.morphAttributes.position[1].getY(i);
 if(x<0&&Math.abs(rightAfter-rightBefore)>0.000001)secondEyeAffected++;
}
assert(increased>=5,'eyelid contour must animate several actual eye vertices');
assert.equal(unrelated,0,'blinks must never warp skull, nose, cheeks or brows');
assert.equal(secondEyeAffected,0,'right blink must not pull the left eye');
assert(meshGeom.morphAttributes.position[0].needsUpdate,
  'three.js must upload changed morph targets to the GPU');
const preserved=meshGeom.morphAttributes.position[0].getY(0);
exportsObject.calibrateNexaFacialMorphs(geometryFixture);
assert.equal(meshGeom.morphAttributes.position[0].getY(0),preserved,
  'calibration must leave untouched vertices stable');
console.log('PASS: calibrated real eyelid vertices, no skull or opposite-eye deformation');

console.log('PASS: deterministic blinks, expressive speech and reversible sub-degree head motion at 20–120 fps');
