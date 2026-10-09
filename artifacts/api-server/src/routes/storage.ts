import { Readable } from 'node:stream';
import { Router, type IRouter } from 'express';
import { getAuth } from '@clerk/express';
import { and, eq } from 'drizzle-orm';
import rateLimit from 'express-rate-limit';
import { db, trainingMedia } from '@workspace/db';
import { RequestUploadUrlBody, RequestUploadUrlResponse, ConfirmUploadBody, ConfirmUploadResponse } from '@workspace/api-zod';
import { ObjectNotFoundError, ObjectStorageService } from '../lib/objectStorage';
import { requireTrainer } from './training';
import { sharedPath } from '../lib/training';

const router: IRouter = Router();
const storage = new ObjectStorageService();
const uploadLimit = rateLimit({ windowMs: 60_000, limit: 30, keyGenerator: req => getAuth(req).userId || 'anonymous', standardHeaders: 'draft-7', legacyHeaders: false, message: { error: 'Too many uploads. Please wait a minute and try again.' } });
router.post('/storage/uploads/request-url', requireTrainer, uploadLimit, async (req, res): Promise<void> => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Choose a JPG, PNG, WebP, MP4, WebM, or MOV file below 50 MB.' }); return; }
  const uploadURL = await storage.getObjectEntityUploadURL();
  const objectPath = storage.normalizeObjectEntityPath(uploadURL);
  await db.insert(trainingMedia).values({ objectPath, ownerId: getAuth(req).userId!, contentType: parsed.data.contentType, size: parsed.data.size });
  res.json(RequestUploadUrlResponse.parse({ uploadURL, objectPath }));
});
router.post('/storage/uploads/confirm', requireTrainer, async (req, res): Promise<void> => {
  const parsed = ConfirmUploadBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'Invalid upload.' }); return; }
  const [media] = await db.select().from(trainingMedia).where(and(eq(trainingMedia.objectPath, parsed.data.objectPath), eq(trainingMedia.ownerId, getAuth(req).userId!)));
  if (!media) { res.status(404).json({ error: 'Upload not found.' }); return; }
  let file;
  try { file = await storage.getObjectEntityFile(media.objectPath); }
  catch (error) { if (error instanceof ObjectNotFoundError) { res.status(400).json({ error: 'The file has not finished uploading.' }); return; } throw error; }
  const [metadata] = await file.getMetadata();
  if (Number(metadata.size) !== media.size || metadata.contentType !== media.contentType) { res.status(400).json({ error: 'The uploaded file does not match its expected size or type.' }); return; }
  const chunks: Buffer[] = [];
  for await (const chunk of file.createReadStream({ start: 0, end: 63 })) chunks.push(Buffer.from(chunk));
  const bytes = Buffer.concat(chunks);
  const valid = media.contentType === 'image/jpeg' ? bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
    : media.contentType === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    : media.contentType === 'image/webp' ? bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
    : media.contentType === 'video/webm' ? bytes.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]))
    : ['ftyp', 'moov', 'mdat'].includes(bytes.toString('ascii', 4, 8));
  if (!valid) { res.status(400).json({ error: 'This file is not a supported photograph or video.' }); return; }
  await db.update(trainingMedia).set({ confirmed: true }).where(eq(trainingMedia.objectPath, media.objectPath));
  res.json(ConfirmUploadResponse.parse({ objectPath: media.objectPath }));
});
router.get('/storage/public-objects/*filePath', async (req, res): Promise<void> => {
  const raw = req.params.filePath;
  const path = Array.isArray(raw) ? raw.join('/') : raw;
  if (!path || path.includes('..')) { res.sendStatus(404); return; }
  const file = await storage.searchPublicObject(path);
  if (!file) { res.sendStatus(404); return; }
  const response = await storage.downloadObject(file);
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (response.body) Readable.fromWeb(response.body as ReadableStream<Uint8Array>).pipe(res);
  else res.end();
});
router.get('/storage/objects/*path', async (req, res): Promise<void> => {
  const raw = req.params.path;
  const path = `/objects/${Array.isArray(raw) ? raw.join('/') : raw}`;
  if (!/^\/objects\/uploads\/[a-f0-9-]{36}$/.test(path)) { res.sendStatus(404); return; }
  const [media] = await db.select().from(trainingMedia).where(and(eq(trainingMedia.objectPath, path), eq(trainingMedia.confirmed, true)));
  if (!media) { res.sendStatus(404); return; }
  let authorized = getAuth(req).userId === media.ownerId;
  if (!authorized && typeof req.query.share === 'string' && /^[a-f0-9]{64}$/.test(req.query.share)) {
    const share = await sharedPath(req.query.share);
    authorized = Boolean(share && share.ownerId === media.ownerId && (share.dog.photo === path || share.milestones.some(m => m.videoPath === path)));
  }
  if (!authorized) { res.status(403).json({ error: 'This file is private.' }); return; }
  try {
    const file = await storage.getObjectEntityFile(path);
    const [metadata] = await file.getMetadata();
    const size = Number(metadata.size);
    res.setHeader('Content-Type', media.contentType);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.setHeader('Accept-Ranges', 'bytes');
    const range = req.headers.range;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      const suffix = match && !match[1] ? Number(match[2]) : 0;
      const start = match ? match[1] ? Number(match[1]) : Math.max(0, size - suffix) : -1;
      const end = match ? match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1 : -1;
      if (!match || (!match[1] && !match[2]) || start < 0 || start >= size || end < start) { res.status(416).setHeader('Content-Range', `bytes */${size}`); res.end(); return; }
      res.status(206).setHeader('Content-Range', `bytes ${start}-${end}/${size}`);
      res.setHeader('Content-Length', end - start + 1);
      file.createReadStream({ start, end }).on('error', () => res.destroy()).pipe(res);
    } else {
      res.setHeader('Content-Length', size);
      file.createReadStream().on('error', () => res.destroy()).pipe(res);
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) { res.sendStatus(404); return; }
    throw error;
  }
});
export default router;
