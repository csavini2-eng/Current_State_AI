import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { seedWorkspace, loadPrototype, resolveStep, ageLabel, mediaUrl, foundationObjectives, foundationObjectiveExample, isExampleObjective, createAssignment, migrateAssignments, assignmentMilestones } from './training.ts';
import { fillBlankSitFields, isSampleSit, SAMPLE_SIT_CUE, SAMPLE_SIT_OBJECTIVE, SAMPLE_SIT_INSTRUCTIONS, SAMPLE_FEEDBACK_DISCLOSURE, SAMPLE_FEEDBACK_SOURCE, SAMPLE_FEEDBACK_TEXT } from './sample-sit.ts';
import { transitionProgress } from './progress.ts';

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
test('new sample milestones use only supplied objectives and the explicitly requested Sit plan, never invented signals', () => {
  for (const milestone of seedWorkspace().milestones) {
    assert.equal(milestone.description, foundationObjectives[milestone.id]);
    assert.equal(milestone.command, milestone.id === 'sit' ? SAMPLE_SIT_CUE : '');
    assert.equal(milestone.handSignal, '');
    assert.equal(milestone.instructions, milestone.id === 'sit' ? SAMPLE_SIT_INSTRUCTIONS : '');
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
test('two dog assignments hold independent content, demonstration references and practice recordings', () => {
  const state = seedWorkspace();
  const raya = state.assignments[0];
  const doug = createAssignment(state, 'doug', 'foundation', 'doug-foundation');
  const originalPath = structuredClone(state.paths);
  const originalGallery = structuredClone(state.milestones);
  const originalDoug = structuredClone(doug);
  const sit = raya.milestones[0];
  sit.content.command = 'Raya-only cue';
  sit.content.description = 'Raya-only objective';
  sit.content.handSignal = 'Raya-only gesture';
  sit.content.instructions = 'Raya-only instructions';
  sit.content.videoPath = 'local-video:raya-demo';
  sit.practiceVideoPath = 'local-video:raya-practice';
  assert.deepEqual(doug, originalDoug);
  assert.deepEqual(state.paths, originalPath);
  assert.deepEqual(state.milestones, originalGallery);
  sit.practiceVideoPath = '';
  assert.equal(sit.content.videoPath, 'local-video:raya-demo');
  assert.equal(doug.milestones[0].practiceVideoPath, '');
});
test('adding an assignment-only milestone leaves the reusable path and another dog unchanged', () => {
  const state = seedWorkspace();
  const doug = createAssignment(state, 'doug', 'foundation', 'doug-foundation');
  const originalPath = structuredClone(state.paths[0]);
  const originalDoug = structuredClone(doug);
  state.assignments[0].milestones.push({ id: 'raya-extra-sit', templateId: 'sit', content: structuredClone(state.milestones[0]), practiceVideoPath: '' });
  assert.equal(state.assignments[0].milestones.length, 6);
  assert.deepEqual(state.paths[0], originalPath);
  assert.deepEqual(doug, originalDoug);
});
test('gallery and reusable-path edits cannot overwrite an existing dog snapshot, even after reload', () => {
  const state = seedWorkspace();
  const original = structuredClone(state.assignments[0]);
  state.milestones[0].command = 'New gallery cue';
  state.paths[0].steps[0].customization = { ...state.milestones[0], command: 'New reusable path cue', videoPath: '/objects/uploads/example' };
  values.set('goodboy-prototype-v2', JSON.stringify(state));
  const loaded = loadPrototype();
  assert.deepEqual(loaded.assignments[0], original);
  const laterDog = createAssignment(loaded, 'doug', 'foundation', 'doug-new');
  assert.equal(laterDog.milestones[0].content.command, 'New reusable path cue');
});
test('legacy assignment migration freezes currently resolved customizations and references without changing IDs or progress', () => {
  const state = seedWorkspace();
  delete state.assignments[0].milestones;
  state.paths[0].steps[0].customization = { ...state.milestones[0], description: 'Trainer objective', command: 'Trainer cue', handSignal: 'Trainer signal', instructions: 'Trainer instructions', videoPath: '/objects/uploads/old-private-video' };
  state.assignments[0].progress = { 'step-sit': 'completed', historical: 'in-progress' };
  const raw = JSON.stringify(state);
  values.set('goodboy-prototype-v2', raw);
  const loaded = loadPrototype();
  const assigned = loaded.assignments[0];
  assert.equal(assigned.id, 'raya-foundation');
  assert.equal(assigned.milestones[0].id, 'step-sit');
  assert.deepEqual(assigned.milestones[0].content, state.paths[0].steps[0].customization);
  assert.equal(assigned.milestones[0].content.videoPath, '/objects/uploads/old-private-video');
  assert.deepEqual(assigned.progress, state.assignments[0].progress);
  assert.equal(values.get('goodboy-prototype-v2'), raw);
  assert.deepEqual(migrateAssignments(loaded), loaded);
});
test('an intentionally empty dog journey stays empty and does not inherit newly added path steps', () => {
  const state = seedWorkspace();
  state.assignments[0].milestones = [];
  const migrated = migrateAssignments(state);
  assert.deepEqual(assignmentMilestones(migrated, migrated.assignments[0]), []);
});
test('new Sit samples have the supplied written plan without replacing personal video slots', () => {
  const state = seedWorkspace();
  const sit = state.assignments[0].milestones[0];
  assert.equal(sit.content.command, 'Sit.');
  assert.equal(sit.content.description, SAMPLE_SIT_OBJECTIVE);
  assert.equal(sit.content.instructions, SAMPLE_SIT_INSTRUCTIONS);
  assert.equal(sit.content.handSignal, '');
  assert.equal(sit.content.videoPath, '');
  assert.equal(sit.practiceVideoPath, '');
  assert.equal(isSampleSit('sit', sit.content), true);
  assert.equal(isSampleSit('custom-sit', sit.content), false);
});
test('explicit sample fill changes only blank draft fields, not saved trainer content or videos', () => {
  const state = seedWorkspace();
  const content = { ...state.assignments[0].milestones[0].content, command: 'Trainer cue', description: ' ', instructions: '', handSignal: 'Trainer signal', videoPath: 'local-video:owned-demo' };
  const before = structuredClone(content);
  const draft = fillBlankSitFields(content);
  assert.deepEqual(content, before);
  assert.equal(draft.command, 'Trainer cue');
  assert.equal(draft.description, SAMPLE_SIT_OBJECTIVE);
  assert.equal(draft.instructions, SAMPLE_SIT_INSTRUCTIONS);
  assert.equal(draft.handSignal, 'Trainer signal');
  assert.equal(draft.videoPath, 'local-video:owned-demo');
});
test('existing blank Sit records and personal clips are not silently populated on reload', () => {
  const state = seedWorkspace();
  const sit = state.assignments[0].milestones[0];
  sit.content.command = ''; sit.content.instructions = '';
  sit.content.videoPath = 'local-video:existing-demo';
  sit.practiceVideoPath = 'local-video:existing-practice';
  const original = JSON.stringify(state);
  values.set('goodboy-prototype-v2', original);
  const loaded = loadPrototype();
  assert.deepEqual(loaded, state);
  assert.equal(loaded.assignments[0].milestones[0].content.command, '');
  assert.equal(values.get('goodboy-prototype-v2'), original);
});
test('prepared sample feedback is explicitly simulated and includes the stated limitations', () => {
  assert.equal(SAMPLE_FEEDBACK_SOURCE, 'Simulated sample feedback');
  assert.equal(SAMPLE_FEEDBACK_DISCLOSURE, 'Simulated feedback · Prepared observations about this sample clip. No automated video analysis is running.');
  assert.match(SAMPLE_FEEDBACK_TEXT, /Near the end of the clip, the dog moves from standing to sitting/);
  assert.match(SAMPLE_FEEDBACK_TEXT, /This clip has no audio/);
  assert.match(SAMPLE_FEEDBACK_TEXT, /consistency across repeated attempts cannot be confirmed/);
  assert.match(SAMPLE_FEEDBACK_TEXT, /before deciding whether to mark the milestone completed/);
});
test('progress transitions are immutable, dog-specific and emit completion intent only for new completions', () => {
  const state = seedWorkspace();
  state.dogs.push({ ...state.dogs[0], id: 'doug', name: 'Doug' });
  state.assignments.push(createAssignment(state, 'doug', 'foundation', 'doug-foundation'));
  const original = structuredClone(state);
  const practicing = transitionProgress(state, 'raya-foundation', 'step-sit', 'in-progress');
  assert.equal(practicing.celebration, null);
  const done = transitionProgress(practicing.next, 'raya-foundation', 'step-sit', 'completed');
  assert.equal(done.celebration.message, 'Sit completed! Raya has completed 1 of 5 milestones.');
  assert.equal(done.celebration.pathCompleted, false);
  assert.deepEqual(done.next.assignments[1], original.assignments[1]);
  assert.deepEqual(done.next.paths, original.paths);
  assert.deepEqual(done.next.milestones, original.milestones);
  assert.deepEqual(state, original);
  assert.equal(transitionProgress(done.next, 'raya-foundation', 'step-sit', 'completed').celebration, null);
  const again = transitionProgress(done.next, 'raya-foundation', 'step-sit', 'in-progress');
  assert.equal(again.celebration, null);
  assert.equal(transitionProgress(again.next, 'raya-foundation', 'step-sit', 'not-started').celebration, null);
});
test('final completion counts only this assignment’s current milestones', () => {
  const state = seedWorkspace();
  const a = state.assignments[0];
  a.progress = { historical: 'completed', ...Object.fromEntries(a.milestones.slice(1).map(m => [m.id, 'completed'])) };
  const result = transitionProgress(state, a.id, 'step-sit', 'completed');
  assert.equal(result.celebration.pathCompleted, true);
  assert.equal(result.celebration.message, 'Sit completed! Raya has completed 5 of 5 milestones.');
});
test('sample notes persist with source and remain independent of progress, videos, dogs and templates', () => {
  const state = seedWorkspace();
  state.assignments.push(createAssignment(state, 'doug', 'foundation', 'doug-foundation'));
  const a = state.assignments[0];
  a.milestones[0].content.videoPath = 'local-video:demo';
  a.milestones[0].practiceVideoPath = 'local-video:practice';
  a.milestones[0].sampleFeedbackNote = { source: SAMPLE_FEEDBACK_SOURCE, text: 'Trainer-edited sample observation' };
  const originalProgress = structuredClone(a.progress);
  values.set('goodboy-prototype-v2', JSON.stringify(state));
  const loaded = loadPrototype();
  assert.deepEqual(loaded.assignments[0].milestones[0].sampleFeedbackNote, a.milestones[0].sampleFeedbackNote);
  assert.deepEqual(loaded.assignments[0].progress, originalProgress);
  assert.equal(loaded.assignments[1].milestones[0].sampleFeedbackNote, undefined);
  const done = transitionProgress(loaded, a.id, 'step-sit', 'completed');
  assert.deepEqual(done.next.assignments[0].milestones[0], a.milestones[0]);
  delete loaded.assignments[0].milestones[0].sampleFeedbackNote;
  assert.equal(loaded.assignments[0].milestones[0].practiceVideoPath, 'local-video:practice');
  assert.equal(loaded.assignments[1].milestones[0].sampleFeedbackNote, undefined);
});
