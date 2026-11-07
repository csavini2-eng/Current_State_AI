import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { transitionProgress, type CompletionEvent } from '@/lib/progress';
import { isSampleSit, SAMPLE_FEEDBACK_SOURCE } from '@/lib/sample-sit';
import { Link, useLocation, useParams, useSearch } from 'wouter';
import { ArrowDown, ArrowLeft, ArrowUp, Check, CheckCircle2, Circle, Pencil, Play, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace';
import { assignmentMilestones, foundationObjectiveExample, isExampleObjective, newId, statusLabel, type AssignedMilestone, type MilestoneContent, type Status } from '@/lib/training';
import { Label, Loading, Modal, NotFoundCard, contentOf, stepItems, templateById } from '@/components/shared';
import { MilestoneEditor } from '@/components/milestone-editor';
import { MilestoneInstructions } from '@/components/milestone-instructions';

type Item = { id: string; templateId: string; content: MilestoneContent; customized: boolean; practiceVideoPath: string };

export function JourneyPage() {
  const { pathId } = useParams<{ pathId: string }>();
  const search = useSearch();
  const [, go] = useLocation();
  const { state, isLoading, save, isSaving } = useWorkspace();
  const [editorId, setEditorId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [instructionsId, setInstructionsId] = useState<string | null>(null);
  // Async video commits (after IndexedDB writes) must build from the latest workspace, not a stale render.
  const stateRef = useRef(state);
  stateRef.current = state;
  const [celebration, setCelebration] = useState<CompletionEvent | null>(null);
  const [progressError, setProgressError] = useState('');
  const busyRef = useRef(false);
  const scopeKey = `${pathId}|${search}`;
  useEffect(() => { setCelebration(null); setProgressError(''); }, [scopeKey]);
  useEffect(() => { if (!celebration) return; const t = window.setTimeout(() => setCelebration(null), 6000); return () => window.clearTimeout(t); }, [celebration]);
  if (isLoading) return <Loading />;
  const path = state.paths.find((p) => p.id === pathId);
  if (!path) return <NotFoundCard title="Path not found" text="This path may have been removed." href="/paths" cta="Back to paths" />;
  const params = new URLSearchParams(search);
  const explicitDog = params.get('dog');
  const mine = state.assignments.filter((a) => a.pathId === path.id);
  const pathScope = params.get('scope') === 'path' || (!explicitDog && mine.length === 0);
  const assignment = pathScope ? undefined : explicitDog ? mine.find((a) => a.dogId === explicitDog) : mine[0];
  if (!pathScope && !assignment) {
    const named = state.dogs.find((d) => d.id === explicitDog)?.name;
    return <NotFoundCard title={named ? `${named} is not assigned to ${path.name}` : 'Dog not found for this path'} text="No other dog’s journey was opened, so nothing can be changed by mistake." href={`/journey/${path.id}?scope=path`} cta="Open the reusable path" />;
  }
  const activeDog = assignment ? state.dogs.find((d) => d.id === assignment.dogId) : undefined;
  const dogName = activeDog?.name ?? 'this dog';
  const snapshot: AssignedMilestone[] = assignment ? assignmentMilestones(state, assignment) : [];
  const items: Item[] = assignment
    ? snapshot.map((m) => ({ id: m.id, templateId: m.templateId, content: m.content, customized: false, practiceVideoPath: m.practiceVideoPath }))
    : stepItems(state, path).map(({ step, content }) => ({ id: step.id, templateId: step.templateId, content, customized: !!step.customization, practiceVideoPath: '' }));
  const scopeNote = assignment ? `Changes apply only to ${dogName}’s ${path.name}.` : `Changes apply to the reusable ${path.name} path. Gallery milestones and dogs already assigned are not changed.`;
  const statusOf = (id: string): Status => (assignment?.progress[id] as Status | undefined) ?? 'not-started';

  // Dog scope writes only this assignment's snapshot; path scope writes only this path's steps.
  const saveDog = (milestones: AssignedMilestone[], progress = assignment!.progress) =>
    save({ ...state, assignments: state.assignments.map((a) => a.id === assignment!.id ? { ...a, milestones, progress } : a) });
  const savePath = (steps: typeof path.steps) => save({ ...state, paths: state.paths.map((p) => p.id === path.id ? { ...p, steps } : p) });
  const updateContent = (id: string, patch: (c: MilestoneContent) => MilestoneContent) => {
    if (assignment) return saveDog(snapshot.map((m) => m.id === id ? { ...m, content: patch(structuredClone(m.content)) } : m));
    return savePath(path.steps.map((s) => { if (s.id !== id) return s; const base = items.find((i) => i.id === id)?.content; return base ? { ...s, customization: patch(contentOf(base)) } : s; }));
  };
  const commitMilestone = (assignmentId: string, stepId: string, patch: (m: AssignedMilestone) => AssignedMilestone) => {
    const latest = stateRef.current;
    const a = latest.assignments.find((x) => x.id === assignmentId);
    if (!a) return Promise.resolve(false);
    let ms: AssignedMilestone[];
    try { ms = assignmentMilestones(latest, a); } catch { return Promise.resolve(false); }
    return save({ ...latest, assignments: latest.assignments.map((x) => x.id === a.id ? { ...x, milestones: ms.map((m) => m.id === stepId ? patch(m) : m) } : x) });
  };
  const commitPathDemo = (stepId: string, ref: string) => {
    const latest = stateRef.current;
    const p = latest.paths.find((x) => x.id === path.id);
    if (!p) return Promise.resolve(false);
    return save({ ...latest, paths: latest.paths.map((x) => x.id !== p.id ? x : { ...x, steps: x.steps.map((s) => {
      if (s.id !== stepId) return s;
      const base = s.customization ?? templateById(latest, s.templateId);
      return base ? { ...s, customization: { ...contentOf(base), videoPath: ref } } : s;
    }) }) });
  };
  const setStatus = async (id: string, status: Status) => {
    if (!assignment || busyRef.current) return;
    busyRef.current = true; setProgressError('');
    try {
      const { next, celebration: ev } = transitionProgress(stateRef.current, assignment.id, id, status);
      if (next === stateRef.current) return;
      const ok = await save(next);
      if (!ok) { setProgressError('Progress could not be saved. Nothing changed; try again.'); return; }
      setCelebration(ev);
    } catch (e) { setProgressError(e instanceof Error ? e.message : 'Progress could not be saved.'); }
    finally { busyRef.current = false; }
  };
  const saveNote = (stepId: string, text: string | null) => {
    if (!assignment) return Promise.resolve(false);
    return commitMilestone(assignment.id, stepId, (m) => { if (text === null) { const { sampleFeedbackNote: _n, ...rest } = m; return rest; } return { ...m, sampleFeedbackNote: { source: SAMPLE_FEEDBACK_SOURCE, text } }; });
  };
  const move = (i: number, d: number) => {
    const j = i + d; if (j < 0 || j >= items.length) return;
    if (assignment) { const s = [...snapshot]; [s[i], s[j]] = [s[j], s[i]]; void saveDog(s); }
    else { const s = [...path.steps]; [s[i], s[j]] = [s[j], s[i]]; void savePath(s); }
  };
  const remove = (id: string, name: string) => {
    if (assignment) {
      if (!window.confirm(`Remove “${name}” from ${dogName}’s journey? Its progress for ${dogName} is deleted. Other dogs, the reusable path and the gallery are not changed.`)) return;
      const { [id]: _gone, ...progress } = assignment.progress;
      void saveDog(snapshot.filter((m) => m.id !== id), progress);
    } else {
      if (!window.confirm(`Remove “${name}” from the reusable ${path.name} path? Dogs already assigned keep their own versions. The milestone stays in the gallery.`)) return;
      void savePath(path.steps.filter((s) => s.id !== id));
    }
  };
  const resetCustom = (id: string) => { if (window.confirm('Use the gallery milestone again for this reusable path?')) void savePath(path.steps.map((s) => s.id === id ? { ...s, customization: null } : s)); };
  const addChosen = async () => {
    let ok: boolean;
    if (assignment) {
      const added = chosen.flatMap((tid) => { const t = templateById(state, tid); return t ? [{ id: newId(), templateId: tid, content: structuredClone(contentOf(t)), practiceVideoPath: '' }] : []; });
      ok = await saveDog([...snapshot, ...added]);
    } else ok = await savePath([...path.steps, ...chosen.map((templateId) => ({ id: newId(), templateId, customization: null }))]);
    if (ok) { setAdding(false); setChosen([]); }
  };
  const switchScope = (v: string) => go(`/journey/${path.id}?dog=${encodeURIComponent(v)}`);
  const editItem = items.find((i) => i.id === editorId);
  const shown = items.find((i) => i.id === instructionsId);
  const stats = assignment ? { total: items.length, done: items.filter((i) => statusOf(i.id) === 'completed').length, active: items.filter((i) => statusOf(i.id) === 'in-progress').length } : null;
  const STEP = assignment ? 360 : 300;
  const xs = items.map((_, i) => 50 + 26 * Math.sin((i * Math.PI) / 2));
  const mobileXs = items.map((_, i) => i % 2 ? 78 : 22);
  const height = items.length * STEP + 40;
  const trail = (pos: number[]) => pos.map((x, i) => { const y = i * STEP + 70; if (i === 0) return `M ${x} ${y}`; const py = (i - 1) * STEP + 70; const my = (py + y) / 2; return `C ${pos[i - 1]} ${my}, ${x} ${my}, ${x} ${y}`; }).join(' ');
  const pickList = state.milestones.filter((m) => m.name.toLowerCase().includes(q.toLowerCase()));
  const editLabel = (name: string) => assignment ? `Edit ${name} for ${dogName}` : `Edit ${name} for this path`;
  return <main className="main page-enter">
    <Link href={assignment ? `/dogs/${assignment.dogId}` : '/paths'} className="back" data-testid="link-back"><ArrowLeft size={15} /> {assignment ? `${dogName}’s profile` : 'Back to Training Paths'}</Link>
    <header className="top journey-top"><div><Label>{assignment ? `${dogName}’s training journey` : 'Reusable path'}</Label><h1>{path.name}</h1><p className="lede">{path.description || 'Add milestones to build this path.'}</p></div>
      {stats && <div className="journey-stats"><div className="stat"><b>{stats.total}</b><span>Milestones</span></div><div className="stat s-yellow"><b>{stats.active}</b><span>In progress</span></div><div className="stat s-green"><b>{stats.done}</b><span>Completed</span></div></div>}</header>
    <div className="dog-switch">
      {assignment && mine.length > 1 && <><label htmlFor="active-scope">Viewing</label>
      <select id="active-scope" className="inline-select" value={assignment.dogId} disabled={isSaving} onChange={(e) => switchScope(e.target.value)}>
        {mine.map((a) => <option key={a.id} value={a.dogId}>{state.dogs.find((d) => d.id === a.dogId)?.name ?? 'Dog'}’s journey</option>)}
      </select></>}
      {!assignment && <span className="tag">Reusable path editor</span>}
      <button className="btn btn-quiet btn-small" style={{ marginLeft: 'auto' }} disabled={isSaving} onClick={() => setAdding(true)}><Plus size={15} /> {assignment ? `Add for ${dogName}` : 'Add milestones'}</button>
    </div>
    <div className="celebrate-status" role="status" aria-live="polite" data-testid="status-celebration">{celebration && <div className="celebrate-banner"><CheckCircle2 size={18} /><span>{celebration.message}{celebration.pathCompleted && <b> Training path completed. Great teamwork!</b>}</span></div>}</div>
    {progressError && <p className="error-text" role="alert">{progressError}</p>}
    <p className="scope-note" role="note">{scopeNote}{!assignment && mine.length === 0 ? ' Not assigned to a dog yet; assign it on Training Paths to track progress.' : ''}</p>
    {items.length ? <section className="journey" style={{ height }} aria-label="Milestone progression">
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="trail trail-desktop" aria-hidden="true"><path d={trail(xs)} vectorEffect="non-scaling-stroke" /></svg>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="trail trail-mobile" aria-hidden="true"><path d={trail(mobileXs)} vectorEffect="non-scaling-stroke" /></svg>
      {items.map((item, i) => {
        const { content } = item;
        const st = statusOf(item.id);
        const name = content.name || 'Untitled skill';
        const party = celebration?.stepId === item.id && celebration.assignmentId === assignment?.id;
        return <div className={`node-wrap status-${st}${party ? ' just-done' : ''}`} key={item.id} style={{ '--step-x': `${xs[i]}%`, top: i * STEP + 70 } as CSSProperties}>
          <div className="node" role="img" aria-label={`Step ${i + 1}, ${statusLabel[st]}`}>{st === 'completed' ? <Check size={34} strokeWidth={3} /> : st === 'in-progress' ? <Play size={30} fill="currentColor" /> : <span>{i + 1}</span>}</div>
          {party && <div className="confetti" aria-hidden="true">{Array.from({ length: 14 }, (_, k) => <i key={k} style={{ '--k': k } as CSSProperties} />)}</div>}
          <div className={`node-card card ${xs[i] > 50 ? 'to-left' : 'to-right'}`}>
            <h3>{name}</h3>
            {content.description.trim()
              ? <p className="milestone-objective">{content.description}</p>
              : <button type="button" className="objective-edit" onClick={() => setEditorId(item.id)}>Add a completion objective</button>}
            {isExampleObjective(content.description) && <span className="objective-example">Example · tailor to this dog</span>}
            {item.customized && <span className="tag">Path copy</span>}
            <button type="button" className="btn btn-quiet btn-small instructions-button" aria-label={`View instructions for ${name}`} onClick={event => { event.currentTarget.focus({ preventScroll: true }); setInstructionsId(item.id); }}>View instructions</button>
            {assignment && <div className="progress-controls" data-testid={`progress-${item.id}`}>
              <span className={`pill pill-${st}`}>{st === 'completed' && <Check size={12} strokeWidth={3} />}{statusLabel[st]}</span>
              {st === 'not-started' && <button type="button" className="btn btn-small" disabled={isSaving} onClick={() => void setStatus(item.id, 'in-progress')}>Start practicing</button>}
              {st === 'in-progress' && <><button type="button" className="btn btn-quiet btn-small" onClick={(e) => { e.currentTarget.focus({ preventScroll: true }); setInstructionsId(item.id); }}>Continue practicing</button><button type="button" className="btn btn-small btn-done" disabled={isSaving} onClick={() => void setStatus(item.id, 'completed')}>Mark completed</button></>}
              {st === 'completed' && <button type="button" className="btn btn-quiet btn-small" disabled={isSaving} onClick={() => void setStatus(item.id, 'in-progress')}>Practice again</button>}
              {st !== 'not-started' && <button type="button" className="link-btn" disabled={isSaving} onClick={() => void setStatus(item.id, 'not-started')}>Reset to not started</button>}
            </div>}
            <div className="step-actions">
              <button className="icon-btn" aria-label={`Move ${name} earlier`} disabled={isSaving || i === 0} onClick={() => move(i, -1)}><ArrowUp size={14} /></button>
              <button className="icon-btn" aria-label={`Move ${name} later`} disabled={isSaving || i === items.length - 1} onClick={() => move(i, 1)}><ArrowDown size={14} /></button>
              <button className="icon-btn" title={editLabel(name)} aria-label={editLabel(name)} disabled={isSaving} onClick={() => setEditorId(item.id)}><Pencil size={14} /></button>
              {item.customized && <button className="icon-btn" title="Use gallery milestone again" aria-label={`Reset ${name} to the gallery milestone`} disabled={isSaving} onClick={() => resetCustom(item.id)}><RotateCcw size={14} /></button>}
              <button className="icon-btn" aria-label={`Remove ${name}`} disabled={isSaving} onClick={() => remove(item.id, name)}><Trash2 size={14} /></button>
            </div>
          </div>
        </div>;
      })}
    </section> : <div className="empty-state"><Circle size={30} /><h2>A path with room to grow</h2><p>Pick milestones from your gallery to start this journey.</p><button className="btn" onClick={() => setAdding(true)}><Plus size={16} /> Add milestones</button></div>}
    {items.length > 0 && <p className="hint" style={{ textAlign: 'center' }}>{assignment ? `Pencil edits ${dogName}’s version only.` : 'Pencil edits this reusable path only. Edit gallery originals in the Milestone Gallery.'}</p>}
    {adding && <Modal title={assignment ? `Add milestones for ${dogName}` : 'Add milestones to the path'} onClose={() => setAdding(false)}>
      <p className="scope-note" role="note">{scopeNote}</p>
      <div className="field"><input aria-label="Search milestones" placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="modal-scroll">{pickList.length ? pickList.map((m) => <label className="check" key={m.id} style={{ padding: '8px 0' }}><input type="checkbox" checked={chosen.includes(m.id)} onChange={() => setChosen((c) => c.includes(m.id) ? c.filter((x) => x !== m.id) : [...c, m.id])} /> {m.name || 'Untitled skill'}{items.some((s) => s.templateId === m.id) && <span className="tag">Already included</span>}</label>) : <p className="hint">No milestones found. <Link href="/milestones">Create one in the gallery.</Link></p>}</div>
      <div className="form-actions"><button className="btn btn-quiet" onClick={() => go('/milestones')}>Open gallery</button><button className="btn" disabled={!chosen.length || isSaving} onClick={() => void addChosen()}>Add {chosen.length || ''} {assignment ? `for ${dogName}` : 'to path'}</button></div>
    </Modal>}
    {shown && <MilestoneInstructions content={shown.content} templateId={shown.templateId}
      note={assignment ? { dogName, value: snapshot.find((m) => m.id === shown.id)?.sampleFeedbackNote, onSave: (t) => saveNote(shown.id, t), onRemove: () => saveNote(shown.id, null) } : undefined} scopeNote={scopeNote} onClose={() => setInstructionsId(null)}
      onDemoChange={(ref) => assignment ? commitMilestone(assignment.id, shown.id, (m) => ({ ...m, content: { ...m.content, videoPath: ref } })) : commitPathDemo(shown.id, ref)}
      practice={assignment ? { dogName, value: shown.practiceVideoPath, onChange: (ref) => commitMilestone(assignment.id, shown.id, (m) => ({ ...m, practiceVideoPath: ref })) } : undefined} />}
    {editItem && <MilestoneEditor title={editLabel(editItem.content.name || 'skill')} note={scopeNote} initial={contentOf(editItem.content)} objectiveExample={foundationObjectiveExample(editItem.templateId, editItem.content.name)} templateId={editItem.templateId} offerSample={!!assignment && isSampleSit(editItem.templateId, editItem.content)} onClose={() => setEditorId(null)} onSave={(c) => updateContent(editItem.id, () => c)} />}
  </main>;
}
