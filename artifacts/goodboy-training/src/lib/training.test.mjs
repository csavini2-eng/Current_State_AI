import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { seedWorkspace, loadPrototype, resolveStep, ageLabel, mediaUrl, foundationObjectives, foundationObjectiveExample, isExampleObjective } from './training.ts';

const values = new Map();
globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
beforeEach(() => values.clear());

test('new workspaces have a single Raya assignment and no fabricated progress', () => {
  const state = seedWorkspace();
  assert.equal(state.dogs[0].id, 'raya');
  assert.equal(state.dogs[0].birthDate, '');
  assert.deepEqual(state.assignments[0].progress, {});
  assert.equal(state.paths[0].steps.length, 5);
});
test('legacy migration retains cues, instructions, statuses and original records', () => {
  const original = JSON.stringify({
    profile: { name: 'Raya', breed: 'Newfoundland', trainingType: 'Assistance', pathId: 'foundation', photo: '/src/assets/raya.jpg' },
    paths: [{ id: 'foundation', name: 'My foundation', description: 'Notes', skillIds: ['sit'] }],
    skills: [{ id: 'sit', name: 'Sit', command: 'Settle', handSignal: 'Palm up', instructions: 'Reward calmly.', status: 'completed' }],
  });
  values.set('goodboy-prototype-v1', original);
  const next = loadPrototype();
  assert.equal(next.milestones[0].command, 'Settle');
  assert.equal(next.milestones[0].instructions, 'Reward calmly.');
  assert.equal(next.assignments[0].progress['step-sit'], 'completed');
  assert.equal(next.paths[0].name, 'My foundation');
  assert.equal(values.get('goodboy-prototype-v1'), original);
});
test('original templates update linked paths but customized steps stay independent', () => {
  const state = seedWorkspace();
  const originalStep = state.paths[0].steps[0];
  const customizedStep = { ...originalStep, customization: { ...state.milestones[0], command: 'Sit here' } };
  state.milestones[0].command = 'Sit now';
  assert.equal(resolveStep(state, originalStep).command, 'Sit now');
  assert.equal(resolveStep(state, customizedStep).command, 'Sit here');
});
test('two dogs using the same path have separate progress', () => {
  const state = seedWorkspace();
  state.assignments.push({ id: 'other-foundation', dogId: 'other', pathId: 'foundation', progress: {} });
  state.assignments[0].progress['step-sit'] = 'completed';
  assert.equal(state.assignments[1].progress['step-sit'], undefined);
});
test('ages use calendar birthdays and reject invalid or future dates', () => {
  assert.equal(ageLabel('2023-06-15', new Date(2026, 5, 14)), '2 years, 11 months');
  assert.equal(ageLabel('2023-06-15', new Date(2026, 5, 15)), '3 years');
  assert.equal(ageLabel('2026-06-01', new Date(2026, 5, 15)), 'Under 1 month');
  assert.equal(ageLabel('2030-01-01', new Date(2026, 5, 15)), 'Age not added');
  assert.equal(ageLabel('2023-02-31'), 'Age not added');
  assert.equal(ageLabel(''), 'Age not added');
});
test('shared media is addressed through the access-checked API', () => {
  assert.equal(mediaUrl('/objects/uploads/file'), '/api/storage/objects/uploads/file');
  assert.equal(mediaUrl('/objects/uploads/file', 'read-token'), '/api/storage/objects/uploads/file?share=read-token');
});
test('malformed legacy data is not silently overwritten', () => {
  values.set('goodboy-prototype-v1', '{broken');
  assert.throws(() => loadPrototype());
  assert.equal(values.get('goodboy-prototype-v1'), '{broken');
});
test('new sample milestones get exactly the supplied example objectives, never invented signals or cues', () => {
  for (const milestone of seedWorkspace().milestones) {
    assert.equal(milestone.description, foundationObjectives[milestone.id]);
    assert.equal(milestone.command, '');
    assert.equal(milestone.handSignal, '');
    assert.equal(milestone.instructions, '');
    assert.equal(isExampleObjective(milestone.description), true);
  }
});
test('existing v2 records retain blank objectives, IDs, progress and trainer customizations unchanged', () => {
  const saved = seedWorkspace();
  saved.milestones[0].description = '';
  saved.milestones[1].description = 'Trainer-defined objective';
  saved.milestones[0].handSignal = 'The trainer’s existing gesture';
  saved.paths[0].steps[0].customization = { ...saved.milestones[0], command: 'My custom cue', description: 'Only this path' };
  saved.assignments[0].progress['step-sit'] = 'completed';
  const original = JSON.stringify(saved);
  values.set('goodboy-prototype-v2', original);
  assert.deepEqual(loadPrototype(), saved);
  assert.equal(values.get('goodboy-prototype-v2'), original);
});
test('old sample blank objectives remain blank until a trainer reviews and saves an example', () => {
  const original = JSON.stringify({ profile: { name: 'Raya', pathId: 'foundation' }, paths: [{ id: 'foundation', name: 'Foundation', description: '', skillIds: ['sit'] }], skills: [{ id: 'sit', name: 'Sit', command: 'Trainer cue', handSignal: 'Trainer gesture', instructions: 'Trainer guidance', status: 'in-progress' }] });
  values.set('goodboy-prototype-v1', original);
  const state = loadPrototype();
  assert.equal(state.milestones[0].description, '');
  assert.equal(foundationObjectiveExample('sit', 'Sit'), foundationObjectives.sit);
  assert.equal(values.has('goodboy-prototype-v2'), false);
  assert.equal(values.get('goodboy-prototype-v1'), original);
});
test('custom milestones named Sit are not silently treated as sample templates', () => {
  assert.equal(foundationObjectiveExample('custom-id', 'Sit'), undefined);
  assert.equal(foundationObjectiveExample('sit', 'Trainer renamed skill'), undefined);
});
