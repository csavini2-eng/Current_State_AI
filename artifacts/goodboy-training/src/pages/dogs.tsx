import { type FormEvent, useState } from 'react';
import { Link, useLocation, useParams } from 'wouter';
import { ArrowLeft, ArrowRight, Map, Pencil, Plus, Save, Trash2, Dog as DogIcon } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace';
import { ageLabel, newId, type DogProfile } from '@/lib/training';
import { DogPhoto, Label, Loading, Modal, NotFoundCard, ProgressBar, UploadField, assignmentStats } from '@/components/shared';
import { ShareHandlerButton } from '@/components/share-handler';

const today = () => new Date().toLocaleDateString('sv');

function DogFormModal({ dog, onClose, onSaved }: { dog?: DogProfile; onClose: () => void; onSaved?: (d: DogProfile) => void }) {
  const { state, save, isSaving, isUploading } = useWorkspace();
  const [d, setD] = useState<DogProfile>(dog ?? { id: newId(), name: '', breed: '', trainingType: '', birthDate: '', handlerName: '', photo: '' });
  const [errors, setErrors] = useState<string[]>([]);
  const set = (p: Partial<DogProfile>) => setD((o) => ({ ...o, ...p }));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: string[] = [];
    if (!d.name.trim()) errs.push('Add the dog’s name.');
    if (d.birthDate && d.birthDate > today()) errs.push('Date of birth cannot be in the future.');
    setErrors(errs);
    if (errs.length) return;
    const next = { ...d, name: d.name.trim(), breed: d.breed.trim(), trainingType: d.trainingType.trim(), handlerName: d.handlerName.trim() };
    const dogs = dog ? state.dogs.map((x) => x.id === next.id ? next : x) : [...state.dogs, next];
    if (await save({ ...state, dogs })) { onSaved?.(next); onClose(); }
  };
  return <Modal title={dog ? `Edit ${dog.name}` : 'Add a new dog'} onClose={onClose}>
    <form onSubmit={submit}>
      <div className="modal-scroll">
        <div className="field"><label htmlFor="d-name">Dog’s name *</label><input id="d-name" value={d.name} onChange={(e) => set({ name: e.target.value })} /></div>
        <div className="field"><label htmlFor="d-breed">Breed</label><input id="d-breed" value={d.breed} onChange={(e) => set({ breed: e.target.value })} /></div>
        <div className="field"><label htmlFor="d-type">Training type</label><input id="d-type" value={d.trainingType} onChange={(e) => set({ trainingType: e.target.value })} /></div>
        <div className="field"><label htmlFor="d-birth">Date of birth</label><input id="d-birth" type="date" max={today()} value={d.birthDate} onChange={(e) => set({ birthDate: e.target.value })} /><p className="hint">Age: {ageLabel(d.birthDate)}</p></div>
        <div className="field"><label htmlFor="d-handler">Assigned handler</label><input id="d-handler" value={d.handlerName} onChange={(e) => set({ handlerName: e.target.value })} /></div>
        <UploadField id="d-photo" label="Photo" kind="image" value={d.photo} onChange={(p) => set({ photo: p })} />
      </div>
      {errors.length > 0 && <div className="error-text" role="alert">{errors.map((x) => <div key={x}>{x}</div>)}</div>}
      <div className="form-actions"><button type="button" className="btn btn-quiet" onClick={onClose}>Cancel</button><button className="btn" type="submit" disabled={isSaving || isUploading}><Save size={16} /> {isSaving ? 'Saving…' : 'Save dog'}</button></div>
    </form>
  </Modal>;
}

export function DogsPage() {
  const { state, isLoading, isSignedIn } = useWorkspace();
  const [, go] = useLocation();
  const [adding, setAdding] = useState(false);
  if (isLoading) return <Loading />;
  return <main className="main page-enter">
    <header className="top"><div><Label>Your training team</Label><h1>My Dogs</h1><p className="lede">Pick a dog to see its profile, paths and progress.</p></div>
      <button className="btn" onClick={() => setAdding(true)}><Plus size={16} /> Add New Dog</button></header>
    {!isSignedIn && <div className="banner">This is a prototype saved only in this browser. Sign in to keep records private, upload videos and share with handlers.<Link href="/sign-in" className="btn btn-small">Sign in</Link></div>}
    {state.dogs.length ? <div className="dogs-grid">{state.dogs.map((dog) => {
      const mine = state.assignments.filter((a) => a.dogId === dog.id).map((a) => assignmentStats(state, a));
      const first = mine[0];
      return <article className="card dog-card directory-card" key={dog.id}>
        <div className="photo-wrap"><DogPhoto dog={dog} /></div>
        <div className="dog-facts">
          <h2>{dog.name}</h2><p className="directory-breed">{dog.breed || 'Breed not added'} · {ageLabel(dog.birthDate)}</p>
          {dog.trainingType && <span className="chip">{dog.trainingType}</span>}
          <div className="directory-progress"><Label>Training path</Label>
            <h3>{first?.path?.name ?? 'No path assigned'}{mine.length > 1 ? ` + ${mine.length - 1} more` : ''}</h3>
            {first && <><ProgressBar done={first.done} total={first.total} /><p className="hint">{first.done} of {first.total} milestones completed</p></>}
          </div>
          <Link href={`/dogs/${dog.id}`} className="btn btn-big" aria-label={`View ${dog.name}'s profile`}>View profile <ArrowRight size={18} /></Link>
        </div>
      </article>;
    })}</div> : <div className="empty-state"><DogIcon size={30} /><h2>No dogs yet</h2><p>Add your first dog to start building a training plan.</p><button className="btn" onClick={() => setAdding(true)}><Plus size={16} /> Add New Dog</button></div>}
    {adding && <DogFormModal onClose={() => setAdding(false)} onSaved={(d) => go(`/dogs/${d.id}`)} />}
  </main>;
}

export function DogProfilePage() {
  const { dogId } = useParams<{ dogId: string }>();
  const { state, isLoading, save, isSaving, isUploading } = useWorkspace();
  const [, go] = useLocation();
  const [editing, setEditing] = useState(false);
  const [pick, setPick] = useState('');
  if (isLoading) return <Loading />;
  const dog = state.dogs.find((d) => d.id === dogId);
  if (!dog) return <NotFoundCard title="Dog not found" text="This dog may have been removed." href="/dogs" cta="Back to My Dogs" />;
  const mine = state.assignments.filter((a) => a.dogId === dog.id);
  const free = state.paths.filter((p) => !mine.some((a) => a.pathId === p.id));
  const busy = isSaving || isUploading;
  const assign = async () => {
    if (!pick || mine.some((a) => a.pathId === pick)) return;
    if (await save({ ...state, assignments: [...state.assignments, { id: newId(), dogId: dog.id, pathId: pick, progress: {} }] })) setPick('');
  };
  const unassign = async (id: string, name: string) => {
    if (!window.confirm(`Remove “${name}” from ${dog.name}? Its progress for this dog will be deleted.`)) return;
    await save({ ...state, assignments: state.assignments.filter((a) => a.id !== id) });
  };
  const remove = async () => {
    if (!window.confirm(`Delete ${dog.name}’s profile and progress?`)) return;
    if (await save({ ...state, dogs: state.dogs.filter((d) => d.id !== dog.id), assignments: state.assignments.filter((a) => a.dogId !== dog.id) })) go('/dogs');
  };
  return <main className="main page-enter">
    <Link href="/dogs" className="back"><ArrowLeft size={15} /> My Dogs</Link>
    <header className="top"><div><Label>Dog profile</Label><h1>{dog.name}</h1></div>
      <div className="actions-row" style={{ margin: 0 }}><button className="btn" onClick={() => setEditing(true)}><Pencil size={16} /> Edit profile</button><button className="icon-btn" aria-label={`Delete ${dog.name}`} disabled={busy} onClick={() => void remove()}><Trash2 size={16} /></button></div></header>
    <div className="home-grid">
      <section className="card dog-card" aria-label="Dog profile">
        <div className="photo-wrap"><DogPhoto dog={dog} size={80} /></div>
        <div className="dog-facts"><h2>{dog.name}</h2>{dog.trainingType && <span className="chip">{dog.trainingType}</span>}
          <dl>
            <div><dt>Age</dt><dd>{ageLabel(dog.birthDate)}</dd></div>
            <div><dt>Breed</dt><dd>{dog.breed || 'Not added'}</dd></div>
            <div><dt>Handler</dt><dd>{dog.handlerName || 'Not assigned'}</dd></div>
          </dl></div>
      </section>
      <section className="card path-now" aria-label="Assigned paths">
        <Label>Assigned paths</Label><h2>{mine.length ? `${dog.name}’s progress` : 'No path yet'}</h2>
        {mine.length === 0 && <p>Assign a training path to start this dog’s journey.</p>}
        {mine.map((a) => { const s = assignmentStats(state, a); if (!s.path) return null; return <div key={a.id} style={{ marginBottom: 20 }}>
          <h3 style={{ margin: 0 }}>{s.path.name}</h3><ProgressBar done={s.done} total={s.total} /><p className="hint">{s.done} of {s.total} completed · {s.active} in progress</p>
          <div className="actions-row" style={{ marginTop: 0 }}>
            <Link href={`/journey/${s.path.id}?dog=${dog.id}`} className="btn btn-small"><Map size={15} /> Open journey</Link>
            <ShareHandlerButton small dog={dog} assignment={a} pathName={s.path.name} />
            <button className="icon-btn" aria-label={`Remove ${s.path.name}`} disabled={busy} onClick={() => void unassign(a.id, s.path!.name)}><Trash2 size={15} /></button>
          </div></div>; })}
        {free.length > 0 ? <div className="actions-row"><select className="inline-select" aria-label="Path to assign" value={pick} onChange={(e) => setPick(e.target.value)}><option value="">Choose a path</option>{free.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          <button className="btn btn-quiet btn-small" disabled={!pick || busy} onClick={() => void assign()}><Plus size={15} /> Assign</button></div>
          : <p className="hint">{state.paths.length ? 'All paths are assigned.' : 'Create a path first.'} <Link href="/paths">Training Paths</Link></p>}
      </section>
    </div>
    {editing && <DogFormModal dog={dog} onClose={() => setEditing(false)} />}
  </main>;
}
