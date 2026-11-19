import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { Router, type IRouter, type Request, type Response } from 'express';
import { and, eq, sql, desc } from 'drizzle-orm';
import rateLimit from 'express-rate-limit';
import { db, guestShares, guestShareMedia, guestPracticeEntries } from '@workspace/db';
import { BeginGuestShareBody, PublishGuestShareBody, RequestGuestUploadBody, SubmitGuestPracticeBody, SaveGuestPracticeNoteBody } from '@workspace/api-zod';
import type { GuestSnapshot, PracticeEntry } from '@workspace/api-zod';
import { PRACTICE_SOURCE } from '@workspace/api-zod/simulation';
import { ObjectStorageService, ObjectNotFoundError } from '../lib/objectStorage';

const router: IRouter = Router();
const storage = new ObjectStorageService();
const hash = (token: string) => createHash('sha256').update(token).digest('hex');
const bearer = (req: Request) => /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization ?? '')?.[1];
// Deliberately use the socket-observed IP, not spoofable forwarded headers.
// This is a conservative per-gateway limit behind a proxy, not per-person identity.
const limitOptions = { standardHeaders: 'draft-7' as const, legacyHeaders: false, validate: { xForwardedForHeader: false } };
const createLimit = rateLimit({ ...limitOptions, windowMs: 3600_000, limit: 5 });
const uploadLimit = rateLimit({ ...limitOptions, windowMs: 60_000, limit: 12 });
const entryLimit = rateLimit({ ...limitOptions, windowMs: 60_000, limit: 20 });
type Share = typeof guestShares.$inferSelect;
type Access = { share: Share; manager: boolean };
const ctx = (res: Response) => res.locals.guest as Access;
const mediaRef = (shareId: string, id: string) => `shared-video:${shareId}:${id}`;
const validId = (s: string) => /^[a-zA-Z0-9_-]{1,100}$/.test(s);
function validSnapshot(s: GuestSnapshot) {
  const ms = s.assignment.milestones;
  const entries = ms?.flatMap(m => m.practiceEntries ?? []) ?? [];
  return s.assignment.dogId === s.dog.id && s.assignment.pathId === s.path.id && ms &&
    ms.length > 0 && new Set(ms.map(m => m.id)).size === ms.length &&
    entries.length <= 200 && new Set(entries.map(e => e.id)).size === entries.length &&
    ms.every(m => (m.practiceEntries ?? []).every(e => validId(e.id) && e.milestoneId === m.id)) &&
    [s.dog.id, s.path.id, s.assignment.id, ...ms.map(m => m.id)].every(validId);
}
async function view(share: Share) {
  const rows = await db.select().from(guestPracticeEntries).where(eq(guestPracticeEntries.shareId, share.id)).orderBy(desc(guestPracticeEntries.createdAt));
  return { id: share.id, snapshot: share.snapshot as GuestSnapshot, entries: rows.map(r => r.entry as PracticeEntry), active: share.active, revoked: share.revoked, revision: share.revision };
}
async function findAccess(req: Request, id?: string): Promise<Access | null> {
  const token = bearer(req);
  if (!token) return null;
  const digest = hash(token);
  const [share] = await db.select().from(guestShares).where(id ? eq(guestShares.id, id) : eq(guestShares.handlerHash, digest));
  if (!share) return null;
  const manager = digest === share.managementHash;
  if (!manager && (digest !== share.handlerHash || !share.active || share.revoked)) return null;
  return { share, manager };
}
router.use('/guest-sharing', (_req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});
router.post('/guest-sharing', createLimit, async (req, res): Promise<void> => {
  const parsed = BeginGuestShareBody.safeParse(req.body);
  if (!parsed.success || !validSnapshot(parsed.data)) { res.status(400).json({ error: 'Select one dog and its assigned milestones. Nothing has been shared.' }); return; }
  const [count] = await db.select({ value: sql<number>`count(*)::int` }).from(guestShares).where(sql`${guestShares.createdAt} > now() - interval '24 hours'`);
  if (count.value >= 50) { res.status(429).json({ error: 'The prototype sharing limit has been reached for today. Local records are unchanged.' }); return; }
  const id = randomUUID(), managementToken = randomBytes(32).toString('hex'), handlerToken = randomBytes(32).toString('hex');
  // No local references or private material are persisted before uploads succeed.
  const draft = structuredClone(parsed.data);
  draft.dog.photo = '';
  draft.assignment.milestones!.forEach(m => {
    m.content.videoPath = ''; m.practiceVideoPath = '';
    m.practiceEntries = [];
  });
  await db.insert(guestShares).values({ id, managementHash: hash(managementToken), handlerHash: hash(handlerToken), snapshot: draft });
  res.status(201).json({ id, managementToken, handlerToken });
});
router.get('/guest-sharing/resolve', async (req, res): Promise<void> => {
  const access = await findAccess(req);
  if (!access) { res.status(404).json({ error: 'This handler link is unavailable or has been revoked.' }); return; }
  res.json(await view(access.share));
});
router.use('/guest-sharing/:id', async (req, res, next): Promise<void> => {
  const access = await findAccess(req, String(req.params.id));
  if (!access) { res.status(404).json({ error: 'This shared assignment is unavailable or access has been revoked.' }); return; }
  res.locals.guest = access; next();
});
router.get('/guest-sharing/:id', async (_req, res): Promise<void> => { res.json(await view(ctx(res).share)); });
router.delete('/guest-sharing/:id', async (_req, res): Promise<void> => {
  const { share, manager } = ctx(res);
  if (!manager) { res.status(403).json({ error: 'Only the trainer management capability can revoke this link.' }); return; }
  await db.update(guestShares).set({ revoked: true, active: false }).where(eq(guestShares.id, share.id));
  res.sendStatus(204);
});
router.put('/guest-sharing/:id', async (req, res): Promise<void> => {
  const { share, manager } = ctx(res);
  if (!manager || share.revoked) { res.status(403).json({ error: 'Only an active trainer management capability can publish instructions.' }); return; }
  const parsed = PublishGuestShareBody.safeParse(req.body);
  if (!parsed.success || !validSnapshot(parsed.data)) { res.status(400).json({ error: 'Invalid assigned path. Nothing was published.' }); return; }
  const old = share.snapshot as GuestSnapshot, next = parsed.data;
  if (next.assignment.id !== old.assignment.id || next.dog.id !== old.dog.id || next.path.id !== old.path.id) { res.status(400).json({ error: 'A link cannot be moved to another dog or assignment.' }); return; }
  const refs = [
    next.dog.photo,
    ...next.assignment.milestones!.flatMap(m => [m.content.videoPath, m.practiceVideoPath, ...(m.practiceEntries ?? []).map(e => e.videoPath)]),
  ].filter(Boolean);
  const media = await db.select().from(guestShareMedia).where(and(eq(guestShareMedia.shareId, share.id), eq(guestShareMedia.confirmed, true)));
  if (refs.some(ref => !media.some(m => mediaRef(share.id, m.id) === ref))) { res.status(400).json({ error: 'Required media has not finished uploading to this assignment. No link was published.' }); return; }
  if (next.dog.photo && !media.find(m => mediaRef(share.id, m.id) === next.dog.photo)?.contentType.startsWith('image/')) { res.status(400).json({ error: 'The dog photograph must be an image.' }); return; }
  const videoRefs = refs.filter(ref => ref !== next.dog.photo);
  if (videoRefs.some(ref => !media.find(m => mediaRef(share.id, m.id) === ref)?.contentType.startsWith('video/'))) { res.status(400).json({ error: 'A milestone recording must be a supported video.' }); return; }
  const saved = await db.transaction(async tx => {
    const [row] = await tx.update(guestShares).set({ snapshot: next, active: true, revision: share.revision + 1 }).where(and(eq(guestShares.id, share.id), eq(guestShares.revoked, false), eq(guestShares.revision, share.revision))).returning();
    if (!row) return null;
    for (const milestone of next.assignment.milestones!) {
      for (const entry of milestone.practiceEntries ?? []) {
        const scoped = { ...entry, milestoneId: milestone.id };
        // Initial local history is imported once; a snapshot update must not erase newer handler notes.
        await tx.insert(guestPracticeEntries).values({ id: scoped.id, shareId: share.id, milestoneId: milestone.id, entry: scoped })
          .onConflictDoNothing();
      }
    }
    return row;
  });
  if (!saved) { res.status(409).json({ error: 'The shared assignment changed while saving. Refresh and try again.' }); return; }
  res.json(await view(saved));
});
router.post('/guest-sharing/:id/uploads', uploadLimit, async (req, res): Promise<void> => {
  const { share, manager } = ctx(res);
  if (share.revoked) { res.status(403).json({ error: 'This link has been revoked.' }); return; }
  const parsed = RequestGuestUploadBody.safeParse(req.body);
  if (!parsed.success || (!manager && !parsed.data.contentType.startsWith('video/'))) { res.status(400).json({ error: 'Use supported MP4, WebM, or MOV videos below 50 MB. Only trainers may share dog photographs.' }); return; }
  try {
    const ticket = await db.transaction(async tx => {
      await tx.execute(sql`select id from guest_assignment_shares where id = ${share.id} for update`);
      const [limit] = await tx.select({ bytes: sql<number>`coalesce(sum(${guestShareMedia.size}),0)::bigint`, count: sql<number>`count(*)::int` }).from(guestShareMedia).where(eq(guestShareMedia.shareId, share.id));
      if (Number(limit.bytes) + parsed.data.size > 200 * 1024 * 1024 || limit.count >= 100) throw new Error('SHARE_QUOTA');
      const mediaId = randomUUID(), uploadURL = await storage.getObjectEntityUploadURL();
      const objectPath = storage.normalizeObjectEntityPath(uploadURL);
      await tx.insert(guestShareMedia).values({ id: mediaId, shareId: share.id, objectPath, contentType: parsed.data.contentType, size: parsed.data.size });
      return { mediaId, uploadURL, videoPath: mediaRef(share.id, mediaId) };
    });
    res.json(ticket);
  } catch (e) {
    if (e instanceof Error && e.message === 'SHARE_QUOTA') { res.status(413).json({ error: 'This prototype assignment has reached its 200 MB / 100-upload limit. Existing records remain intact.' }); return; }
    throw e;
  }
});
router.post('/guest-sharing/:id/uploads/:mediaId', async (req, res): Promise<void> => {
  const { share } = ctx(res);
  if (share.revoked) { res.status(403).json({ error: 'This link has been revoked.' }); return; }
  const [media] = await db.select().from(guestShareMedia).where(and(eq(guestShareMedia.id, String(req.params.mediaId)), eq(guestShareMedia.shareId, share.id)));
  if (!media || Date.now() - media.createdAt.getTime() > 20 * 60_000 && !media.confirmed) { res.status(400).json({ error: 'The upload ticket is missing or expired. Select the file again.' }); return; }
  try {
    const file = await storage.getObjectEntityFile(media.objectPath);
    const [metadata] = await file.getMetadata();
    if (Number(metadata.size) !== media.size || metadata.contentType !== media.contentType) { res.status(400).json({ error: 'The upload is incomplete or does not match its declared size/type.' }); return; }
    const chunks: Buffer[] = [];
    for await (const chunk of file.createReadStream({ start: 0, end: 63 })) chunks.push(Buffer.from(chunk));
    const b = Buffer.concat(chunks);
    const valid = media.contentType === 'image/jpeg' ? b.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
      : media.contentType === 'image/png' ? b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : media.contentType === 'image/webp' ? b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP'
      : media.contentType === 'video/webm' ? b.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]))
      : ['ftyp', 'moov', 'mdat'].includes(b.toString('ascii', 4, 8));
    if (!valid) { res.status(400).json({ error: 'The file signature does not match a supported image or video.' }); return; }
    await db.update(guestShareMedia).set({ confirmed: true }).where(eq(guestShareMedia.id, media.id));
    res.sendStatus(204);
  } catch (e) {
    if (e instanceof ObjectNotFoundError) { res.status(400).json({ error: 'The file has not finished uploading. Try again after the upload completes.' }); return; }
    throw e;
  }
});
router.get('/guest-sharing/:id/media/:mediaId', async (req, res): Promise<void> => {
  const { share } = ctx(res);
  const [media] = await db.select().from(guestShareMedia).where(and(eq(guestShareMedia.id, String(req.params.mediaId)), eq(guestShareMedia.shareId, share.id), eq(guestShareMedia.confirmed, true)));
  if (!media) { res.sendStatus(404); return; }
  try {
    const file = await storage.getObjectEntityFile(media.objectPath);
    const [metadata] = await file.getMetadata();
    if (Number(metadata.size) !== media.size || metadata.contentType !== media.contentType || !metadata.generation) {
      res.status(409).json({ error: 'The stored file no longer matches its confirmed upload.' }); return;
    }
    res.setHeader('Content-Type', media.contentType);
    res.setHeader('Content-Length', media.size);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    // Pin the validated generation so an in-flight PUT cannot change a read,
    // bound the stream, and release storage requests when a browser disconnects.
    const stream = file.bucket.file(file.name, { generation: metadata.generation }).createReadStream({ start: 0, end: media.size - 1 });
    res.on('close', () => stream.destroy());
    stream.on('error', () => res.destroy()).pipe(res);
  } catch (e) { if (e instanceof ObjectNotFoundError) { res.sendStatus(404); return; } throw e; }
});
router.post('/guest-sharing/:id/entries', entryLimit, async (req, res): Promise<void> => {
  const { share } = ctx(res);
  if (share.revoked) { res.status(403).json({ error: 'This link has been revoked.' }); return; }
  const parsed = SubmitGuestPracticeBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid practice entry.' }); return; }
  const entry = parsed.data, snapshot = share.snapshot as GuestSnapshot;
  if (!validId(entry.id) || !snapshot.assignment.milestones!.some(m => m.id === entry.milestoneId)) { res.status(400).json({ error: 'This milestone is not in the shared assignment.' }); return; }
  const media = await db.select().from(guestShareMedia).where(and(eq(guestShareMedia.shareId, share.id), eq(guestShareMedia.confirmed, true)));
  if (!media.some(m => m.contentType.startsWith('video/') && mediaRef(share.id, m.id) === entry.videoPath)) { res.status(400).json({ error: 'Upload a video to this assignment before submitting the attempt.' }); return; }
  const [prior] = await db.select().from(guestPracticeEntries).where(and(eq(guestPracticeEntries.id, entry.id), eq(guestPracticeEntries.shareId, share.id)));
  if (prior) {
    if (prior.shareId !== share.id || (prior.entry as PracticeEntry).videoPath !== entry.videoPath || prior.milestoneId !== entry.milestoneId) { res.status(409).json({ error: 'That practice identifier is already in use.' }); return; }
    res.json(await view(share)); return;
  }
  const [count] = await db.select({ value: sql<number>`count(*)::int` }).from(guestPracticeEntries).where(eq(guestPracticeEntries.shareId, share.id));
  if (count.value >= 200) { res.status(413).json({ error: 'This prototype assignment has reached its 200-attempt limit.' }); return; }
  const saved: PracticeEntry = { ...entry, createdAt: new Date().toISOString() };
  if (saved.feedback) saved.feedback = { source: PRACTICE_SOURCE, originalDescription: saved.description, outcome: saved.outcome, text: saved.feedback.text };
  await db.insert(guestPracticeEntries).values({ id: saved.id, shareId: share.id, milestoneId: saved.milestoneId, entry: saved });
  res.json(await view(share));
});
router.put('/guest-sharing/:id/entries/:entryId/note', entryLimit, async (req, res): Promise<void> => {
  const { share, manager } = ctx(res);
  if (share.revoked && !manager) { res.status(403).json({ error: 'This link has been revoked.' }); return; }
  const parsed = SaveGuestPracticeNoteBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid practice note.' }); return; }
  const [row] = await db.select().from(guestPracticeEntries).where(and(eq(guestPracticeEntries.id, String(req.params.entryId)), eq(guestPracticeEntries.shareId, share.id)));
  if (!row) { res.status(404).json({ error: 'Practice entry not found in this assignment.' }); return; }
  const old = row.entry as PracticeEntry;
  const { description, outcome, text } = parsed.data;
  if ((old.feedback || old.description.trim()) && (description !== old.description || outcome !== old.outcome)) { res.status(400).json({ error: 'Keep the original handler description. Record a new attempt for a different report.' }); return; }
  const next = { ...old, description, outcome, feedback: { source: PRACTICE_SOURCE, originalDescription: description, outcome, text: text.trim() } };
  await db.update(guestPracticeEntries).set({ entry: next }).where(and(eq(guestPracticeEntries.id, row.id), eq(guestPracticeEntries.shareId, share.id)));
  res.json(await view(share));
});
export default router;
