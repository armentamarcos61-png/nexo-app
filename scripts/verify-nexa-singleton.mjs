// Verify Nexa is one assistant, never a duplicate 2D/3D selection.
import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';

const choose = readFileSync('src/app/elegir-asistente.tsx','utf8');
const screen = readFileSync('src/app/asistente.tsx','utf8');
const stage = readFileSync('src/components/assistant-stage.web.tsx','utf8');
const shell = readFileSync('src/components/nexo-screen.tsx','utf8');

assert.equal((choose.match(/<AssistantStage\b/g) || []).length, 1, 'Only one Nexa stage must exist on the chooser');
assert.ok(!choose.includes('<AssistantAvatar'), 'No second static avatar on the chooser');
assert.ok(!choose.includes('Object.keys(assistantProfiles)'), 'No second assistant option');
assert.ok(choose.includes("selectAssistant('nexa')"), 'Nexa must be the sole offered choice');
assert.equal((screen.match(/<AssistantStage\b/g) || []).length, 1, 'Only one Nexa stage on the assistant screen');
assert.ok(shell.includes("pathname === '/asistente' || pathname === '/elegir-asistente'"), 'No duplicate header avatar on stage screens');
assert.ok(stage.includes('models/nexa.glb'), 'Single Nexa GLB path is required');

const file = 'public/models/nexa.glb';
if (existsSync(file)) {
  const binary = readFileSync(file);
  assert.equal(binary.toString('ascii',0,4),'glTF', 'The Nexa model must be a GLB');
  assert.equal(binary.readUInt32LE(8),binary.length, 'GLB declared size must match actual size');
  const jsonLength=binary.readUInt32LE(12);
  const gltf=JSON.parse(binary.subarray(20,20+jsonLength).toString('utf8'));
  const animationNames=(gltf.animations ?? []).map(a=>a.name);
  for (const name of ['Idle','Walking','Running','Greeting','Talking']) {
    assert.ok(animationNames.includes(name), 'Missing GLB animation '+name);
  }
  console.log('PASS: Nexa único; modelo y cinco animaciones verificados');
} else {
  console.log('PASS: Nexa único y visor preparado; GLB aún pendiente de publicarse');
}
