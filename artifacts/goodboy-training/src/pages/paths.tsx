import { type FormEvent, useState } from 'react';
import { Link } from 'wouter';
import { BookOpen, Map, Pencil, Plus, Route as RouteIcon, Save, Trash2 } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace';
import { newId, type TrainingProgram } from '@/lib/training';
import { Label, Loading, Modal } from '@/components/shared';

export function PathsPage() {
  const { state, isLoading, save, isSaving } = useWorkspace();
  const [form, setForm] = useState<{ id?: string; name: string; description: string } | null>(null);
  const [error, setError] = useState('');
  const [pick, setPick] = useState<Record<string, string>>({});
  if (isLoading) return <Loading />;
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form?.name.trim()) { setError('Give this path a name before saving.'); return; }
    const paths: TrainingProgram[] = form.id
      ? state.paths.map((p) => p.id === form.id ? { ...p, name: form.name.trim(), description: form.description.trim() } : p)
      : [...state.paths, { id: newId(), name: form.name.trim(), description: form.description.trim(), steps: [] }];
    if (await save({ ...state, paths })) { setForm(null); setError(''); }
  };
  const assign = async (pathId: string) => {
    const dogId = pick[pathId];
    if (!dogId || state.assignments.some((a) => a.dogId === dogId && a.pathId === pathId)) return;
    if (await save({ ...state, assignments: [...state.assignments, { id: newId(), dogId, pathId, progress: {} }] })) setPick({ ...pick, [pathId]: '' });
  };
  const del = async (p: TrainingProgram) => {
    if (!window.confirm(`Delete “${p.name}”? Dog assignments for it are removed. Milestones stay in the gallery.`)) return;
    await save({ ...state, paths: state.paths.filter((x) => x.id !== p.id), assignments: state.assignments.filter((a) => a.pathId !== p.id) });
  };
  const openNew = () => { setForm({ name: '', description: '' }); setError(''); };
  return <main className="main page-enter">
    <header className="top"><div><Label>Milestones, then paths, then dogs</Label><h1>Training Paths</h1></div><button className="btn" onClick={openNew}><Plus size={16} /> New path</button></header>
    {state.paths.length ? <div className="path-list">{state.paths.map((path) => {
      const dogs = state.assignments.filter((a) => a.pathId === path.id).map((a) => state.dogs.find((d) => d.id === a.dogId)).filter((d) => !!d);
      const free = state.dogs.filter((d) => !dogs.some((x) => x?.id === d.id));
      return <article className={`card path-item ${dogs.length ? 'is-assigned' : ''}`} key={path.id}>
        <div className="path-icon"><RouteIcon size={26} /></div>
        <div className="path-body">
          <div className="path-head"><h2>{path.name}</h2>{dogs.map((d) => d && <span className="chip" key={d.id}>{d.name}</span>)}</div>
          <p>{path.description || 'Add a short description for this path.'}</p>
          <div className="meta"><span>{path.steps.length} {path.steps.length === 1 ? 'milestone' : 'milestones'}</span><span>{dogs.length} {dogs.length === 1 ? 'dog' : 'dogs'}</span></div>
          <div className="actions-row">
            <Link href={`/journey/${path.id}`} className="btn btn-small"><Map size={15} /> Open journey</Link>
            <select className="inline-select" aria-label={`Dog to assign to ${path.name}`} value={pick[path.id] ?? ''} onChange={(e) => setPick({ ...pick, [path.id]: e.target.value })}><option value="">Assign to a dog</option>{free.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
            <button className="btn btn-quiet btn-small" disabled={!pick[path.id] || isSaving} onClick={() => void assign(path.id)}>Assign</button>
            <button className="icon-btn" aria-label={`Edit ${path.name}`} onClick={() => { setForm({ id: path.id, name: path.name, description: path.description }); setError(''); }}><Pencil size={16} /></button>
            <button className="icon-btn" aria-label={`Delete ${path.name}`} disabled={isSaving} onClick={() => void del(path)}><Trash2 size={16} /></button>
          </div>
        </div>
      </article>;
    })}</div> : <div className="empty-state"><BookOpen size={30} /><h2>Your first path starts here</h2><p>Create a path, then add milestones from the gallery.</p><button className="btn" onClick={openNew}><Plus size={16} /> New path</button></div>}
    {form && <Modal title={form.id ? 'Edit path' : 'New training path'} onClose={() => setForm(null)}>
      <form onSubmit={submit}>
        <div className="field"><label htmlFor="path-name">Path name</label><input id="path-name" placeholder="e.g. Public Access" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="field"><label htmlFor="path-description">Description or goal</label><textarea id="path-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        {error && <p role="alert" className="error-text">{error}</p>}
        <div className="form-actions"><button type="button" className="btn btn-quiet" onClick={() => setForm(null)}>Cancel</button><button className="btn" type="submit" disabled={isSaving}><Save size={16} /> Save path</button></div>
      </form>
    </Modal>}
  </main>;
}
