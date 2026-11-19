import type { GuestView, GuestSnapshot, PracticeEntry, PracticeOutcome, TrainingWorkspace } from '@workspace/api-client-react';
import { readLocalVideo } from './local-videos';
import { assignmentMilestones } from './training';
import rayaPhoto from '@/assets/raya-sample.jpg';

export type GuestLink = { id: string; assignmentId: string; managementToken: string; handlerToken: string; status: 'draft' | 'active' | 'revoked'; mediaMap?: Record<string, string> };
const KEY = 'goodboy-guest-sharing-v1';
const API = `${import.meta.env.BASE_URL}api/guest-sharing`;
function links(): GuestLink[] {
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('Saved sharing credentials could not be read. They have not been overwritten.');
  return parsed;
}
function persist(link: GuestLink) {
  const existing = links();
  localStorage.setItem(KEY, JSON.stringify([...existing.filter(l => l.id !== link.id), link]));
}
export function getLocalGuestLink(assignmentId: string): GuestLink | null { return links().filter(l => l.assignmentId === assignmentId).at(-1) ?? null; }
async function request<T>(path: string, token?: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method, cache: 'no-store', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw Object.assign(new Error(data.error || `Shared assignment request failed (${response.status}). Try again.`), { status: response.status });
  }
  return response.status === 204 ? undefined as T : await response.json();
}
export function handlerUrl(link: GuestLink) { return `${location.origin}${import.meta.env.BASE_URL}shared/${link.handlerToken}`; }
export function resolveHandlerShare(token: string) { return request<GuestView>('/resolve', token); }
export function loadHandlerShare(id: string, token: string) { return request<GuestView>(`/${id}`, token); }
export async function uploadGuestFile(id: string, token: string, file: Blob, name: string): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'].includes(file.type) || file.size === 0 || file.size > 50 * 1024 * 1024) throw new Error('Choose JPG, PNG, WebP, MP4, WebM, or MOV files between 1 byte and 50 MB.');
  const ticket = await request<{ mediaId: string; uploadURL: string; videoPath: string }>(`/${id}/uploads`, token, 'POST', { name, size: file.size, contentType: file.type });
  const result = await fetch(ticket.uploadURL, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file, signal: AbortSignal.timeout(180_000) });
  if (!result.ok) throw new Error('The media upload did not complete. Your local file remains unchanged. Try again.');
  await request(`/${id}/uploads/${ticket.mediaId}`, token, 'POST');
  return ticket.videoPath;
}
export async function readGuestMedia(ref: string, tokenOverride?: string): Promise<Blob> {
  const match = /^shared-video:([a-f0-9-]{36}):([a-f0-9-]{36})$/.exec(ref);
  if (!match) throw new Error('Invalid shared media reference.');
  const token = tokenOverride ?? links().find(l => l.id === match[1])?.managementToken;
  if (!token) throw new Error('This browser does not have the management capability for this shared recording.');
  const response = await fetch(`${API}/${match[1]}/media/${match[2]}`, { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' });
  if (!response.ok) throw new Error('This shared recording is unavailable or access was revoked.');
  return response.blob();
}
async function fileFor(ref: string): Promise<Blob> {
  if (ref.startsWith('local-video:')) {
    const record = await readLocalVideo(ref);
    if (!record) throw new Error('A required video is missing from this browser. Replace it or remove its reference before sharing.');
    return record.file;
  }
  if (ref.startsWith('shared-video:')) return readGuestMedia(ref);
  const url = ref.startsWith('/objects/') ? `${import.meta.env.BASE_URL}api/storage${ref}` : ref;
  if (!(ref.startsWith('data:image/') || ref.startsWith('blob:') || ref.startsWith('/objects/') || ref === rayaPhoto)) throw new Error('An unsupported media reference cannot be shared. Select a local copy instead.');
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) throw new Error('A required private or local file could not be read. Sharing has not been published.');
  return response.blob();
}
async function refKey(ref: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(ref));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}
export async function createOrUpdateGuestShare(state: TrainingWorkspace, assignmentId: string, onProgress?: (message: string) => void): Promise<GuestLink> {
  const assignment = state.assignments.find(a => a.id === assignmentId);
  const dog = state.dogs.find(d => d.id === assignment?.dogId), path = state.paths.find(p => p.id === assignment?.pathId);
  if (!assignment || !dog || !path) throw new Error('The dog or assigned path no longer exists.');
  const snapshot: GuestSnapshot = { dog: structuredClone(dog), path: { id: path.id, name: path.name, description: path.description }, assignment: { ...structuredClone(assignment), milestones: structuredClone(assignmentMilestones(state, assignment)) } };
  let link = getLocalGuestLink(assignmentId);
  if (!link || link.status === 'revoked') {
    onProgress?.('Preparing a private shared copy…');
    const draft = structuredClone(snapshot); draft.dog.photo = '';
    draft.assignment.milestones!.forEach(m => { m.content.videoPath = ''; m.practiceVideoPath = ''; m.practiceEntries = []; });
    const credentials = await request<{ id: string; managementToken: string; handlerToken: string }>('', undefined, 'POST', draft);
    link = { ...credentials, assignmentId, status: 'draft', mediaMap: {} };
    try { persist(link); }
    catch {
      await request(`/${link.id}`, link.managementToken, 'DELETE').catch(() => undefined);
      throw new Error('This browser could not retain the separate management capability. No handler link was activated.');
    }
  }
  const current = link;
  const upload = async (ref: string) => {
    if (!ref) return '';
    if (ref.startsWith(`shared-video:${current.id}:`)) return ref;
    const key = await refKey(ref), cached = current.mediaMap?.[key];
    if (cached) return cached;
    onProgress?.('Uploading required media. Keep this page open…');
    const file = await fileFor(ref);
    const saved = await uploadGuestFile(current.id, current.managementToken, file, file.type.startsWith('image/') ? 'dog-photo' : 'training-video');
    current.mediaMap = { ...current.mediaMap, [key]: saved }; persist(current);
    return saved;
  };
  snapshot.dog.photo = await upload(snapshot.dog.photo || (dog.id === 'raya' ? rayaPhoto : ''));
  for (const milestone of snapshot.assignment.milestones!) {
    milestone.content.videoPath = await upload(milestone.content.videoPath);
    milestone.practiceVideoPath = await upload(milestone.practiceVideoPath);
    for (const entry of milestone.practiceEntries ?? []) entry.videoPath = await upload(entry.videoPath);
  }
  onProgress?.('Saving the shared assignment…');
  await request<GuestView>(`/${current.id}`, current.managementToken, 'PUT', snapshot);
  current.status = 'active'; persist(current);
  return current;
}
export async function revokeLocalGuestShare(assignmentId: string) {
  const link = getLocalGuestLink(assignmentId);
  if (!link) throw new Error('No management capability was found in this browser.');
  await request(`/${link.id}`, link.managementToken, 'DELETE');
  link.status = 'revoked'; persist(link);
}
export function submitHandlerEntry(id: string, token: string, entry: PracticeEntry) {
  return request<GuestView>(`/${id}/entries`, token, 'POST', entry);
}
export function saveHandlerNote(id: string, token: string, entryId: string, description: string, outcome: PracticeOutcome, text: string) {
  return request<GuestView>(`/${id}/entries/${encodeURIComponent(entryId)}/note`, token, 'PUT', { description, outcome, text });
}
export async function saveRemotePracticeNote(entry: PracticeEntry, description: string, outcome: PracticeOutcome, text: string, assignmentId?: string) {
  const shareId = entry.videoPath.startsWith('shared-video:') ? entry.videoPath.split(':')[1] : undefined;
  const link = shareId ? links().find(l => l.id === shareId) : assignmentId ? getLocalGuestLink(assignmentId) : null;
  if (!link) {
    if (!shareId) return;
    throw new Error('The trainer management capability is not available in this browser.');
  }
  if (!shareId) {
    if (link.status !== 'active') return;
    const remote = await loadHandlerShare(link.id, link.managementToken);
    if (!remote.entries.some(e => e.id === entry.id)) return;
  }
  await saveHandlerNote(link.id, link.managementToken, entry.id, description, outcome, text);
}
export async function pullSharedHistory(state: TrainingWorkspace, getLatest?: () => TrainingWorkspace): Promise<TrainingWorkspace> {
  const responses: { link: GuestLink; remote: GuestView }[] = [];
  for (const link of links().filter(l => l.status !== 'draft')) {
    if (!state.assignments.some(a => a.id === link.assignmentId)) continue;
    const remote = await loadHandlerShare(link.id, link.managementToken);
    if (remote.revoked && link.status !== 'revoked') { link.status = 'revoked'; persist(link); }
    responses.push({ link, remote });
  }
  if (!responses.length) return state;
  let next = getLatest?.() ?? state;
  for (const { link, remote } of responses) {
    const assignment = next.assignments.find(a => a.id === link.assignmentId);
    if (!assignment) continue;
    next = { ...next, assignments: next.assignments.map(a => a.id !== assignment.id ? a : {
      ...a, milestones: assignmentMilestones(next, a).map(m => {
        const current = new Map((m.practiceEntries ?? []).map(e => [e.id, e]));
        for (const entry of remote.entries.filter(e => e.milestoneId === m.id)) {
          const old = current.get(entry.id);
          current.set(entry.id, { ...entry, ...(old?.videoPath.startsWith('local-video:') ? { videoPath: old.videoPath } : {}) });
        }
        return { ...m, practiceEntries: [...current.values()] };
      }),
    }) };
  }
  return next;
}
