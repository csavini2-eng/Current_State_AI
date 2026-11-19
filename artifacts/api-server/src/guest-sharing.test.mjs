import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const origin = process.env.TEST_APP_URL || 'http://localhost:80';
let checks = 0;
async function call(path, token, method = 'GET', data, expected = 200) {
  const response = await fetch(`${origin}/api${path}`, {
    method, headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(data ? { 'Content-Type': 'application/json' } : {}) },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  assert.equal(response.status, expected, `${method} ${path} status`);
  checks++;
  return response.status === 204 ? null : response.json().catch(() => null);
}
function fixture() {
  const id = randomUUID();
  return {
    dog: { id, name: 'Sharing permission fixture', breed: 'Test breed', trainingType: '', birthDate: '', handlerName: '', photo: '' },
    path: { id: 'fixture-path', name: 'Fixture path', description: '' },
    assignment: { id: `assignment-${id}`, dogId: id, pathId: 'fixture-path', progress: {},
      milestones: [{ id: 'fixture-sit', templateId: 'sit', content: { name: 'Sit', description: 'Follow the agreed sit cue.', command: 'Sit', handSignal: '', instructions: 'Follow the trainer plan.', category: 'Foundation', difficulty: 'Beginner', videoPath: '' }, practiceVideoPath: '' }] },
  };
}
async function main() {
  await call('/training/workspace', null, 'GET', undefined, 401);
  await call('/storage/uploads/request-url', null, 'POST', { name: 'x', size: 1, contentType: 'video/mp4' }, 401);
  const snapA = fixture(), snapB = fixture();
  const a = await call('/guest-sharing', null, 'POST', snapA, 201);
  const b = await call('/guest-sharing', null, 'POST', snapB, 201);
  try {
    await call('/guest-sharing/resolve', a.handlerToken, 'GET', undefined, 404);
    await call(`/guest-sharing/${a.id}`, b.managementToken, 'GET', undefined, 404);
    await call(`/guest-sharing/${a.id}/uploads`, a.managementToken, 'POST', { name: 'bad', size: 10, contentType: 'text/html' }, 400);
    await call(`/guest-sharing/${a.id}/uploads`, a.managementToken, 'POST', { name: 'large', size: 51 * 1024 * 1024, contentType: 'video/mp4' }, 400);
    const interrupted = await call(`/guest-sharing/${a.id}/uploads`, a.managementToken, 'POST', { name: 'interrupted.mp4', size: 100, contentType: 'video/mp4' });
    await call(`/guest-sharing/${a.id}/uploads/${interrupted.mediaId}`, a.managementToken, 'POST', undefined, 400);
    await call(`/guest-sharing/${a.id}/media/${interrupted.mediaId}`, a.managementToken, 'GET', undefined, 404);
    const incompleteDraft = structuredClone(snapA);
    incompleteDraft.assignment.milestones[0].content.videoPath = interrupted.videoPath;
    await call(`/guest-sharing/${a.id}`, a.managementToken, 'PUT', incompleteDraft, 400);
    await call('/guest-sharing/resolve', a.handlerToken, 'GET', undefined, 404);
    const file = await readFile(new URL('../../goodboy-training/public/samples/sit-sample.mp4', import.meta.url));
    const ticket = await call(`/guest-sharing/${a.id}/uploads`, a.managementToken, 'POST', { name: 'permission-fixture.mp4', size: file.length, contentType: 'video/mp4' });
    const upload = await fetch(ticket.uploadURL, { method: 'PUT', headers: { 'Content-Type': 'video/mp4' }, body: file });
    assert.equal(upload.ok, true, 'Scoped storage upload succeeds'); checks++;
    await call(`/guest-sharing/${a.id}/uploads/${ticket.mediaId}`, a.managementToken, 'POST', undefined, 204);
    snapA.assignment.milestones[0].content.videoPath = ticket.videoPath;
    await call(`/guest-sharing/${a.id}`, a.managementToken, 'PUT', snapA);
    await call(`/guest-sharing/${b.id}`, b.managementToken, 'PUT', snapB);
    const handler = await call('/guest-sharing/resolve', a.handlerToken);
    assert.equal(handler.snapshot.dog.id, snapA.dog.id);
    assert.equal(JSON.stringify(handler).includes(a.managementToken), false, 'Management capability is not exposed'); checks += 2;
    await call(`/guest-sharing/${a.id}`, a.handlerToken, 'PUT', snapA, 403);
    await call(`/guest-sharing/${a.id}`, a.handlerToken, 'DELETE', undefined, 403);
    await call(`/guest-sharing/${b.id}`, a.handlerToken, 'GET', undefined, 404);
    const media = await fetch(`${origin}/api/guest-sharing/${a.id}/media/${ticket.mediaId}`, { headers: { Authorization: `Bearer ${a.handlerToken}` } });
    assert.equal(media.status, 200); assert.equal((await media.arrayBuffer()).byteLength, file.length); checks += 2;
    await call(`/guest-sharing/${b.id}/media/${ticket.mediaId}`, b.handlerToken, 'GET', undefined, 404);
    await call(`/guest-sharing/${a.id}/uploads`, a.handlerToken, 'POST', { name: 'photo.jpg', size: 20, contentType: 'image/jpeg' }, 400);
    const entry = { id: randomUUID(), milestoneId: 'fixture-sit', createdAt: new Date().toISOString(), videoPath: ticket.videoPath, description: '', outcome: 'unsure' };
    await call(`/guest-sharing/${b.id}/entries`, b.handlerToken, 'POST', entry, 400);
    await call(`/guest-sharing/${a.id}/entries`, a.handlerToken, 'POST', { ...entry, milestoneId: 'unassigned' }, 400);
    await call(`/guest-sharing/${a.id}/entries`, a.handlerToken, 'POST', entry);
    await call(`/guest-sharing/${a.id}/entries`, a.handlerToken, 'POST', entry);
    const note = { description: 'The dog needed additional prompting after the sit cue.', outcome: 'prompting', text: 'You reported needing additional prompting. Ask the trainer which prompts to record.' };
    await call(`/guest-sharing/${a.id}/entries/${entry.id}/note`, a.handlerToken, 'PUT', note);
    const trainer = await call(`/guest-sharing/${a.id}`, a.managementToken);
    assert.equal(trainer.entries.length, 1, 'Retry does not duplicate attempts');
    assert.equal(trainer.entries[0].feedback.originalDescription, note.description);
    assert.equal(trainer.entries[0].feedback.source, 'Simulated handler-reported feedback');
    assert.deepEqual(trainer.snapshot.assignment.progress, {}, 'Handler never changes trainer progress'); checks += 4;
    await call(`/guest-sharing/${a.id}/entries/${entry.id}/note`, a.handlerToken, 'PUT', { ...note, description: 'Rewrite original report' }, 400);
    await call(`/guest-sharing/${b.id}/entries/${entry.id}/note`, b.handlerToken, 'PUT', note, 404);
    await call(`/guest-sharing/${a.id}`, a.managementToken, 'DELETE', undefined, 204);
    await call(`/guest-sharing/${a.id}/entries/${entry.id}/note`, a.managementToken, 'PUT', { ...note, text: 'Trainer-edited archived note.' });
    await call(`/guest-sharing/${a.id}/entries/${entry.id}/note`, a.handlerToken, 'PUT', note, 404);
    await call('/guest-sharing/resolve', a.handlerToken, 'GET', undefined, 404);
    await call(`/guest-sharing/${a.id}/media/${ticket.mediaId}`, a.handlerToken, 'GET', undefined, 404);
    await call(`/guest-sharing/${a.id}/entries`, a.handlerToken, 'POST', { ...entry, id: randomUUID() }, 404);
    await call(`/guest-sharing/${a.id}/uploads`, a.handlerToken, 'POST', { name: 'x.mp4', size: 10, contentType: 'video/mp4' }, 404);
    await call(`/guest-sharing/${b.id}`, b.handlerToken);
    console.log(`Passed ${checks} guest-sharing HTTP permission, media, history, and revocation checks. Test capabilities were not logged.`);
  } finally {
    await fetch(`${origin}/api/guest-sharing/${a.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${a.managementToken}` } }).catch(() => {});
    await fetch(`${origin}/api/guest-sharing/${b.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${b.managementToken}` } }).catch(() => {});
  }
}
main().catch(error => { console.error('Guest-sharing check failed:', error.message); process.exitCode = 1; });
