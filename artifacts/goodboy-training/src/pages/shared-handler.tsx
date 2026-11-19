import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'wouter';
import { CircleDot, Dog as DogIcon, Lock, RefreshCw } from 'lucide-react';
import type { GuestView, PracticeEntry } from '@workspace/api-client-react';
import { loadHandlerShare, readGuestMedia, resolveHandlerShare, saveHandlerNote, submitHandlerEntry, uploadGuestFile } from '@/lib/guest-sharing';
import { ageLabel, newId, type Status } from '@/lib/training';
import { Brand, ProgressBar, StatusPill } from '@/components/shared';
import { MilestoneInstructions } from '@/components/milestone-instructions';
import { dedupeEntries } from '@/components/practice-panel';
import raya from '../assets/raya-sample.jpg';

type Phase = 'loading' | 'ready' | 'gone' | 'error';

function HandlerPhoto({ dog, token }: { dog: GuestView['snapshot']['dog']; token: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let alive = true; let created = '';
    setSrc('');
    if (dog.photo) readGuestMedia(dog.photo, token).then(b => { if (!alive) return; created = URL.createObjectURL(b); setSrc(created); }).catch(() => { if (alive) setSrc(''); });
    else if (dog.id === 'raya') setSrc(raya);
    return () => { alive = false; if (created) URL.revokeObjectURL(created); };
  }, [dog.photo, dog.id, token]);
  return <div className="avatar">{src ? <img src={src} alt={`${dog.name} portrait`} data-testid="img-dog" /> : <DogIcon size={44} />}</div>;
}

export default function SharedHandlerPage() {
  const { token = '' } = useParams<{ token: string }>();
  const [view, setView] = useState<GuestView | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [openId, setOpenId] = useState<string | null>(null);
  const idRef = useRef<string | null>(null);

  const accept = useCallback((v: GuestView) => {
    if (!v.active || v.revoked) { idRef.current = null; setView(null); setOpenId(null); setPhase('gone'); return; }
    idRef.current = v.id; setView(v); setPhase('ready');
  }, []);
  const load = useCallback(async () => {
    try { accept(idRef.current ? await loadHandlerShare(idRef.current, token) : await resolveHandlerShare(token)); }
    catch (e) {
      const status = (e as { status?: number } | null)?.status;
      // No cached fallback: clear data and players immediately.
      idRef.current = null; setView(null); setOpenId(null);
      setPhase(status && [401, 403, 404, 410].includes(status) ? 'gone' : 'error');
    }
  }, [token, accept]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (phase !== 'ready') return;
    const t = window.setInterval(() => void load(), 15000);
    return () => window.clearInterval(t);
  }, [phase, load]);

  const head = <div className="handler-bar"><Brand asLink={false} />{phase === 'ready' && <span className="live-pill" role="status"><CircleDot size={14} /> Shared by your trainer</span>}</div>;
  if (phase === 'loading') return <div className="handler-page" aria-busy="true">{head}<div className="skeleton" /><div className="skeleton" /></div>;
  if (!view) return <div className="handler-page">{head}<div className="empty-state" style={{ marginTop: 24 }} data-testid="status-share-unavailable">
    <Lock size={30} />
    <h2>{phase === 'gone' ? 'This shared plan is not available' : 'We could not load this shared plan'}</h2>
    <p>{phase === 'gone' ? 'The link may be incorrect or the trainer has revoked it. Ask your trainer for a new link.' : 'Check your connection and try again.'}</p>
    {phase === 'error' && <button className="btn" onClick={() => { setPhase('loading'); void load(); }}><RefreshCw size={16} /> Try again</button>}
  </div></div>;

  const { dog, path, assignment } = view.snapshot;
  const milestones = assignment.milestones ?? [];
  const statusOf = (id: string): Status => (assignment.progress[id] as Status | undefined) ?? 'not-started';
  const done = milestones.filter(m => statusOf(m.id) === 'completed').length;
  const entriesFor = (mid: string) => dedupeEntries([...milestones.find(m => m.id === mid)?.practiceEntries ?? [], ...view.entries.filter(e => e.milestoneId === mid)]);
  const shown = milestones.find(m => m.id === openId);
  const addVideo = async (mid: string, file: File) => {
    const ref = await uploadGuestFile(view.id, token, file, file.name);
    const entry: PracticeEntry = { id: newId(), milestoneId: mid, createdAt: new Date().toISOString(), videoPath: ref, description: '', outcome: 'unsure' };
    accept(await submitHandlerEntry(view.id, token, entry));
    return true;
  };
  const saveEntry = async (entry: PracticeEntry) => {
    const fb = entry.feedback;
    if (!fb) return false;
    accept(await saveHandlerNote(view.id, token, entry.id, fb.originalDescription, fb.outcome, fb.text));
    return true;
  };

  return <div className="handler-page page-enter">
    {head}
    <section className="card handler-hero">
      <HandlerPhoto dog={dog} token={token} />
      <div style={{ minWidth: 0, flex: 1 }}><span className="eyebrow">Shared training plan{dog.handlerName ? ` for ${dog.handlerName}` : ''}</span>
        <h1 style={{ margin: '4px 0' }} data-testid="text-dog-name">{dog.name}</h1>
        <p className="hint" style={{ margin: 0 }}>{[dog.breed, dog.birthDate ? ageLabel(dog.birthDate) : ''].filter(Boolean).join(' · ')}</p>
        <h2 style={{ margin: '12px 0 0', fontSize: 22 }}>{path.name}</h2>{path.description && <p className="hint">{path.description}</p>}
        <ProgressBar done={done} total={milestones.length} /><p className="hint" style={{ margin: 0 }}>{done} of {milestones.length} milestones completed · progress is set by the trainer</p>
      </div>
    </section>
    <p className="scope-note" role="note" style={{ marginTop: 16 }}>You can watch demonstrations, add practice videos and save notes. Anyone with this link can do the same. Refreshes on its own.</p>
    {milestones.length === 0 && <div className="empty-state"><h2>No skills yet</h2><p>The trainer has not added skills to this path.</p></div>}
    {milestones.map((m, i) => { const name = m.content.name || 'Untitled skill'; const count = entriesFor(m.id).length; return <article className="card guide-step" key={m.id} data-testid={`card-guide-${m.id}`}>
      <span className="eyebrow">Step {i + 1}</span>
      <div className="guide-head"><h2>{name}</h2><StatusPill status={statusOf(m.id)} /></div>
      <p className={m.content.description.trim() ? 'hint' : 'hint objective-missing'}>{m.content.description.trim() || 'Completion objective not added.'}</p>
      <button type="button" className="text-action" aria-label={`View instructions for ${name}`} onClick={() => setOpenId(m.id)} data-testid={`button-view-instructions-${m.id}`}>View instructions</button>
      {count > 0 && <span className="hint" style={{ marginLeft: 12 }}>{count} practice {count === 1 ? 'attempt' : 'attempts'}</span>}
    </article>; })}
    {shown && <MilestoneInstructions content={shown.content} templateId={shown.templateId} dogName={dog.name} token={token} onClose={() => setOpenId(null)}
      practice={{ entries: entriesFor(shown.id), token, storageHint: 'Videos you add are uploaded to this shared plan so your trainer can see them.', onAddVideo: f => addVideo(shown.id, f), onSaveEntry: saveEntry }} />}
  </div>;
}
