import { type CSSProperties, useState } from 'react';
import { Link, useLocation, useParams, useSearch } from 'wouter';
import { ArrowDown, ArrowLeft, ArrowUp, Check, Circle, Copy, Pencil, Play, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace';
import { newId, statusLabel, type MilestoneContent, type Status } from '@/lib/training';
import { Label, Loading, Modal, NotFoundCard, assignmentStats, contentOf, stepItems, templateById } from '@/components/shared';
import { MilestoneEditor } from '@/components/milestone-editor';
import { ShareHandlerButton } from '@/components/share-handler';

export function JourneyPage() {
  const { pathId } = useParams<{ pathId: string }>();
  const search = useSearch();
  const [, go] = useLocation();
  const { state, isLoading, save, isSaving } = useWorkspace();
  const [dogPick, setDogPick] = useState(() => new URLSearchParams(search).get('dog') ?? '');
  const [editor, setEditor] = useState<{ kind: 'original' | 'custom'; stepId: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const [chosen, setChosen] = useState<string[]>([]);
  const [q, setQ] = useState('');
  if (isLoading) return <Loading />;
  const path = state.paths.find((p) => p.id === pathId);
  if (!path) return <NotFoundCard title="Path not found" text="This path may have been removed." href="/paths" cta="Back to paths" />;
  const mine = state.assignments.filter((a) => a.pathId === path.id);
  const assignment = mine.find((a) => a.dogId === dogPick) ?? mine[0];
  const activeDog = assignment ? state.dogs.find((d) => d.id === assignment.dogId) : undefined;
  const items = stepItems(state, path);
  const stats = assignment ? assignmentStats(state, assignment) : null;
  const statusOf = (id: string): Status => assignment?.progress[id] ?? 'not-started';
  const setPath = (steps: typeof path.steps, extra?: Partial<typeof state>) => save({ ...state, ...extra, paths: state.paths.map((p) => p.id === path.id ? { ...p, steps } : p) });
  const setStatus = (stepId: string, status: Status) => { if (assignment) void save({ ...state, assignments: state.assignments.map((a) => a.id === assignment.id ? { ...a, progress: { ...a.progress, [stepId]: status } } : a) }); };
  const move = (i: number, d: number) => { const s = [...path.steps]; const j = i + d; if (j < 0 || j >= s.length) return; [s[i], s[j]] = [s[j], s[i]]; void setPath(s); };
  const remove = (stepId: string, name: string) => {
    if (!window.confirm(`Remove “${name}” from this path? The milestone stays in the gallery.`)) return;
    void setPath(path.steps.filter((s) => s.id !== stepId), { assignments: state.assignments.map((a) => { const { [stepId]: _gone, ...progress } = a.progress; return { ...a, progress }; }) });
  };
  const resetCustom = (stepId: string) => { if (window.confirm('Go back to the original milestone for this path?')) void setPath(path.steps.map((s) => s.id === stepId ? { ...s, customization: null } : s)); };
  const addChosen = async () => { if (await setPath([...path.steps, ...chosen.map((templateId) => ({ id: newId(), templateId, customization: null }))])) { setAdding(false); setChosen([]); } };
  const editStep = editor ? path.steps.find((s) => s.id === editor.stepId) : undefined;
  const editTemplate = editStep ? templateById(state, editStep.templateId) : undefined;
  const initial: MilestoneContent | null = editor && editStep && editTemplate ? contentOf(editor.kind === 'custom' ? editStep.customization ?? editTemplate : editTemplate) : null;
  const saveEditor = (c: MilestoneContent) => {
    if (!editStep || !editTemplate) return Promise.resolve(false);
    if (editor?.kind === 'original') return save({ ...state, milestones: state.milestones.map((m) => m.id === editTemplate.id ? { ...c, id: m.id } : m) });
    return setPath(path.steps.map((s) => s.id === editStep.id ? { ...s, customization: c } : s));
  };
  const STEP = 230;
  const xs = items.map((_, i) => 50 + 26 * Math.sin((i * Math.PI) / 2));
  const mobileXs = items.map((_, i) => i % 2 ? 78 : 22);
  const height = items.length * STEP + 40;
  const trail = (pos: number[]) => pos.map((x, i) => { const y = i * STEP + 70; if (i === 0) return `M ${x} ${y}`; const py = (i - 1) * STEP + 70; const my = (py + y) / 2; return `C ${pos[i - 1]} ${my}, ${x} ${my}, ${x} ${y}`; }).join(' ');
  const pickList = state.milestones.filter((m) => m.name.toLowerCase().includes(q.toLowerCase()));
  return <main className="main page-enter">
    <Link href="/paths" className="back"><ArrowLeft size={15} /> All paths</Link>
    <header className="top journey-top"><div><Label>{activeDog ? `${activeDog.name}’s training journey` : 'Path preview'}</Label><h1>{path.name}</h1><p className="lede">{path.description || 'Add milestones to build this path.'}</p></div>
      {stats && <div className="journey-stats"><div className="stat"><b>{stats.total}</b><span>Milestones</span></div><div className="stat s-yellow"><b>{stats.active}</b><span>In progress</span></div><div className="stat s-green"><b>{stats.done}</b><span>Completed</span></div></div>}</header>
    <div className="dog-switch">
      {assignment && activeDog ? <>
        <label htmlFor="active-dog">Showing progress for</label>
        <select id="active-dog" className="inline-select" value={assignment.dogId} onChange={(e) => setDogPick(e.target.value)}>{mine.map((a) => <option key={a.id} value={a.dogId}>{state.dogs.find((d) => d.id === a.dogId)?.name ?? 'Dog'}</option>)}</select>
        <ShareHandlerButton small dog={activeDog} assignment={assignment} pathName={path.name} />
      </> : <span className="chip">Not assigned to a dog yet. <Link href="/paths">Assign it on Training Paths</Link> to track progress.</span>}
      <button className="btn btn-quiet btn-small" style={{ marginLeft: 'auto' }} onClick={() => setAdding(true)}><Plus size={15} /> Add milestones</button>
    </div>
    {items.length ? <section className="journey" style={{ height }} aria-label="Milestone progression">
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="trail trail-desktop" aria-hidden="true"><path d={trail(xs)} vectorEffect="non-scaling-stroke" /></svg>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="trail trail-mobile" aria-hidden="true"><path d={trail(mobileXs)} vectorEffect="non-scaling-stroke" /></svg>
      {items.map(({ step, content }, i) => {
        const st = assignment ? statusOf(step.id) : 'not-started';
        const name = content.name || 'Untitled skill';
        return <div className={`node-wrap status-${st}`} key={step.id} style={{ '--step-x': `${xs[i]}%`, top: i * STEP + 70 } as CSSProperties}>
          <div className="node" role="img" aria-label={`Step ${i + 1}, ${statusLabel[st]}`}>{st === 'completed' ? <Check size={34} strokeWidth={3} /> : st === 'in-progress' ? <Play size={30} fill="currentColor" /> : <span>{i + 1}</span>}</div>
          <div className={`node-card card ${xs[i] > 50 ? 'to-left' : 'to-right'}`}>
            <h3>{name}</h3>
            <p>{content.command ? `Cue: “${content.command}”` : 'Details to be added'}{step.customization && <> <span className="tag">Custom</span></>}</p>
            {assignment && <div className="node-actions"><select aria-label={`Status for ${name}`} className={`status-select pill-${st}`} value={st} disabled={isSaving} onChange={(e) => setStatus(step.id, e.target.value as Status)}><option value="not-started">Not started</option><option value="in-progress">In progress</option><option value="completed">Completed</option></select></div>}
            <div className="step-actions">
              <button className="icon-btn" aria-label={`Move ${name} earlier`} disabled={isSaving || i === 0} onClick={() => move(i, -1)}><ArrowUp size={14} /></button>
              <button className="icon-btn" aria-label={`Move ${name} later`} disabled={isSaving || i === items.length - 1} onClick={() => move(i, 1)}><ArrowDown size={14} /></button>
              <button className="icon-btn" title="Edit original milestone" aria-label={`Edit original milestone ${name}`} onClick={() => setEditor({ kind: 'original', stepId: step.id })}><Pencil size={14} /></button>
              <button className="icon-btn" title="Customize for this path" aria-label={`Customize ${name} for this path`} onClick={() => setEditor({ kind: 'custom', stepId: step.id })}><Copy size={14} /></button>
              {step.customization && <button className="icon-btn" title="Use original again" aria-label={`Reset ${name} to original`} onClick={() => resetCustom(step.id)}><RotateCcw size={14} /></button>}
              <button className="icon-btn" aria-label={`Remove ${name}`} disabled={isSaving} onClick={() => remove(step.id, name)}><Trash2 size={14} /></button>
            </div>
          </div>
        </div>;
      })}
    </section> : <div className="empty-state"><Circle size={30} /><h2>A path with room to grow</h2><p>Pick milestones from your gallery to start this journey.</p><button className="btn" onClick={() => setAdding(true)}><Plus size={16} /> Add milestones</button></div>}
    {items.length > 0 && <p className="hint" style={{ textAlign: 'center' }}>Pencil edits the original for every path. Copy icon customizes only this path.</p>}
    {adding && <Modal title="Add milestones" onClose={() => setAdding(false)}>
      <div className="field"><input aria-label="Search milestones" placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="modal-scroll">{pickList.length ? pickList.map((m) => <label className="check" key={m.id} style={{ padding: '8px 0' }}><input type="checkbox" checked={chosen.includes(m.id)} onChange={() => setChosen((c) => c.includes(m.id) ? c.filter((x) => x !== m.id) : [...c, m.id])} /> {m.name || 'Untitled skill'}{path.steps.some((s) => s.templateId === m.id) && <span className="tag">Already in path</span>}</label>) : <p className="hint">No milestones found. <Link href="/milestones">Create one in the gallery.</Link></p>}</div>
      <div className="form-actions"><button className="btn btn-quiet" onClick={() => go('/milestones')}>Open gallery</button><button className="btn" disabled={!chosen.length || isSaving} onClick={() => void addChosen()}>Add {chosen.length || ''} to path</button></div>
    </Modal>}
    {editor && initial && <MilestoneEditor title={editor.kind === 'original' ? 'Edit original milestone' : 'Customize for this path'} note={editor.kind === 'original' ? 'This updates the reusable milestone in every path that uses the original.' : `This saves a copy only inside ${path.name}. The original is not changed.`} initial={initial} onClose={() => setEditor(null)} onSave={saveEditor} />}
  </main>;
}
