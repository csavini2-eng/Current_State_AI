import { randomBytes } from 'node:crypto';
import { Router, type IRouter, type RequestHandler } from 'express';
import { getAuth } from '@clerk/express';
import { and, eq } from 'drizzle-orm';
import { db, trainingWorkspaces, handlerShares, trainingMedia } from '@workspace/db';
import { SaveTrainingWorkspaceBody, GetTrainingWorkspaceResponse, SaveTrainingWorkspaceResponse, CreateHandlerShareBody, CreateHandlerShareResponse, GetHandlerPathResponse } from '@workspace/api-zod';
import { sharedPath } from '../lib/training';

const router: IRouter = Router();
export const requireTrainer: RequestHandler = (req, res, next) => {
  if (!getAuth(req).userId) { res.status(401).json({ error: 'Sign in to access your private training records.' }); return; }
  next();
};
router.get('/training/handler/:id', async (req, res): Promise<void> => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  const id = String(req.params.id);
  if (!/^[a-f0-9]{64}$/.test(id)) { res.status(404).json({ error: 'This sharing link is unavailable or has been revoked.' }); return; }
  const result = await sharedPath(id);
  if (!result) { res.status(404).json({ error: 'This sharing link is unavailable or has been revoked.' }); return; }
  const { ownerId: _privateOwner, ...path } = result;
  res.json(GetHandlerPathResponse.parse(path));
});
router.get('/training/workspace', requireTrainer, async (req, res): Promise<void> => {
  const ownerId = getAuth(req).userId!;
  const [workspace] = await db.select().from(trainingWorkspaces).where(eq(trainingWorkspaces.ownerId, ownerId));
  res.setHeader('Cache-Control', 'no-store');
  res.json(GetTrainingWorkspaceResponse.parse(workspace ? { state: workspace.state, revision: workspace.revision, updatedAt: workspace.updatedAt.toISOString() } : { state: null, revision: 0, updatedAt: null }));
});
router.put('/training/workspace', requireTrainer, async (req, res): Promise<void> => {
  const ownerId = getAuth(req).userId!;
  const parsed = SaveTrainingWorkspaceBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Some training fields are invalid or too long. Please check them before saving.' }); return; }
  const { state, revision } = parsed.data;
  const validId = (id: string) => /^[a-zA-Z0-9_-]{1,100}$/.test(id);
  const unique = (ids: string[]) => ids.every(validId) && new Set(ids).size === ids.length;
  if (![state.dogs, state.paths, state.milestones, state.assignments].every(items => unique(items.map(item => item.id)))) {
    res.status(400).json({ error: 'Records must have unique valid identifiers.' }); return;
  }
  for (const dog of state.dogs) {
    if (!dog.name.trim()) { res.status(400).json({ error: 'Each dog needs a name.' }); return; }
    if (dog.birthDate) {
      const date = new Date(`${dog.birthDate}T12:00:00Z`);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dog.birthDate) || Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== dog.birthDate || dog.birthDate > new Date().toISOString().slice(0, 10)) {
        res.status(400).json({ error: 'Enter a valid date of birth that is not in the future.' }); return;
      }
    }
  }
  for (const path of state.paths) {
    if (!path.name.trim() || !unique(path.steps.map(s => s.id)) || path.steps.some(s => !state.milestones.some(m => m.id === s.templateId))) {
      res.status(400).json({ error: 'Every training step must reference an existing milestone.' }); return;
    }
  }
  const combinations = new Set<string>();
  for (const assignment of state.assignments) {
    const path = state.paths.find(p => p.id === assignment.pathId);
    const key = JSON.stringify([assignment.dogId, assignment.pathId]);
    if (!path || !state.dogs.some(d => d.id === assignment.dogId) || combinations.has(key)) {
      res.status(400).json({ error: 'Assign each existing path to each dog only once.' }); return;
    }
    combinations.add(key);
    assignment.progress = Object.fromEntries(Object.entries(assignment.progress).filter(([id]) => path.steps.some(s => s.id === id)));
  }
  const references = [
    ...state.dogs.filter(d => d.photo).map(d => ({ path: d.photo, type: 'image/' })),
    ...state.milestones.filter(m => m.videoPath).map(m => ({ path: m.videoPath, type: 'video/' })),
    ...state.paths.flatMap(p => p.steps.filter(s => s.customization?.videoPath).map(s => ({ path: s.customization!.videoPath, type: 'video/' }))),
  ];
  if (references.length) {
    const media = await db.select().from(trainingMedia).where(and(eq(trainingMedia.ownerId, ownerId), eq(trainingMedia.confirmed, true)));
    if (references.some(ref => !media.some(m => m.objectPath === ref.path && m.contentType.startsWith(ref.type)))) {
      res.status(400).json({ error: 'A photograph or video has not finished uploading, or does not belong to this workspace.' }); return;
    }
  }
  const updatedAt = new Date();
  let saved;
  if (revision === 0) {
    [saved] = await db.insert(trainingWorkspaces).values({ ownerId, state, revision: 1, updatedAt }).onConflictDoNothing().returning();
  } else {
    [saved] = await db.update(trainingWorkspaces).set({ state, revision: revision + 1, updatedAt }).where(and(eq(trainingWorkspaces.ownerId, ownerId), eq(trainingWorkspaces.revision, revision))).returning();
  }
  if (!saved) { res.status(409).json({ error: 'Another tab saved newer records. Reload before saving again.' }); return; }
  res.json(SaveTrainingWorkspaceResponse.parse({ state: saved.state, revision: saved.revision, updatedAt: saved.updatedAt.toISOString() }));
});
router.post('/training/shares', requireTrainer, async (req, res): Promise<void> => {
  const ownerId = getAuth(req).userId!;
  const parsed = CreateHandlerShareBody.safeParse(req.body);
  if (!parsed.success || !parsed.data.handlerName.trim()) { res.status(400).json({ error: 'Choose a handler name and an assigned dog training path.' }); return; }
  const [workspace] = await db.select().from(trainingWorkspaces).where(eq(trainingWorkspaces.ownerId, ownerId));
  if (!workspace) { res.status(400).json({ error: 'Save your training records before sharing.' }); return; }
  const state = SaveTrainingWorkspaceBody.shape.state.parse(workspace.state);
  if (!state.assignments.some(a => a.id === parsed.data.assignmentId)) { res.status(404).json({ error: 'That dog’s path is no longer assigned.' }); return; }
  const where = and(eq(handlerShares.ownerId, ownerId), eq(handlerShares.assignmentId, parsed.data.assignmentId), eq(handlerShares.revoked, false));
  let [share] = await db.select().from(handlerShares).where(where);
  if (share) [share] = await db.update(handlerShares).set({ handlerName: parsed.data.handlerName.trim() }).where(eq(handlerShares.id, share.id)).returning();
  else [share] = await db.insert(handlerShares).values({ id: randomBytes(32).toString('hex'), ownerId, assignmentId: parsed.data.assignmentId, handlerName: parsed.data.handlerName.trim() }).returning();
  res.json(CreateHandlerShareResponse.parse({ id: share.id, assignmentId: share.assignmentId, handlerName: share.handlerName }));
});
router.get('/training/shares', requireTrainer, async (req, res): Promise<void> => {
  const ownerId = getAuth(req).userId!;
  const [workspace] = await db.select().from(trainingWorkspaces).where(eq(trainingWorkspaces.ownerId, ownerId));
  res.setHeader('Cache-Control', 'no-store');
  if (!workspace) { res.json([]); return; }
  const state = SaveTrainingWorkspaceBody.shape.state.parse(workspace.state);
  const shares = await db.select().from(handlerShares).where(and(eq(handlerShares.ownerId, ownerId), eq(handlerShares.revoked, false)));
  res.json(shares.filter(s => state.assignments.some(a => a.id === s.assignmentId)).map(s => CreateHandlerShareResponse.parse({ id: s.id, assignmentId: s.assignmentId, handlerName: s.handlerName })));
});
router.delete('/training/shares/:id', requireTrainer, async (req, res): Promise<void> => {
  await db.update(handlerShares).set({ revoked: true }).where(and(eq(handlerShares.id, String(req.params.id)), eq(handlerShares.ownerId, getAuth(req).userId!)));
  res.sendStatus(204);
});
export default router;
