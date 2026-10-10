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
  assert.ok(largestBrow>.25, 'Studio eyebrows must be visible while speaking');
  assert.ok(largestGaze>.02, 'Eyes must change gaze without moving brows or skull');
  assert.ok(mesh.morphTargetInfluences[0]<.001, 'Lips must settle after speech');
}
console.log('PASS: deterministic blinks, expressive speech and reversible sub-degree head motion at 20–120 fps');
