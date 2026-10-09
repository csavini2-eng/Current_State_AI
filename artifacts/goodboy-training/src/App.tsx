import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, Circle, Dog, FileVideo, Map, PawPrint, Pencil, Play, Plus, Route as RouteIcon, Save, Sparkles, Trash2, Upload, X } from 'lucide-react';
import rayaPortrait from './assets/raya-sample.jpg';

const queryClient = new QueryClient();
type Status = 'not-started' | 'in-progress' | 'completed';
type Profile = { name: string; breed: string; trainingType: string; pathId: string; photo: string };
type TrainingPath = { id: string; name: string; description: string; skillIds: string[] };
type Skill = { id: string; pathId: string; name: string; command: string; handSignal: string; instructions: string; status: Status; videoUrl?: string };
type Store = { profile: Profile; paths: TrainingPath[]; skills: Skill[] };

const defaultIds = ['sit', 'stay', 'retrieve', 'come', 'heel'];
const seeded: Store = {
  profile: { name: 'Raya', breed: 'Newfoundland', trainingType: 'Service dog in training', pathId: 'foundation', photo: rayaPortrait },
  paths: [{ id: 'foundation', name: 'Foundation Skills', description: 'The everyday cues that build a shared language.', skillIds: defaultIds }],
  skills: defaultIds.map((id, i) => ({
    id, pathId: 'foundation', name: ['Sit', 'Stay', 'Retrieve', 'Come', 'Heel'][i],
    command: '', handSignal: '', instructions: '', status: 'not-started',
  })),
};
const storageKey = 'goodboy-prototype-v1';
function loadStore(): Store {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw) as Store;
      if (parsed.profile && Array.isArray(parsed.paths) && Array.isArray(parsed.skills)) {
        return { ...parsed, skills: parsed.skills.map((skill) => ({ ...skill, videoUrl: undefined })) };
      }
    }
  } catch { /* Start with the sample notebook if browser storage is unavailable. */ }
  return seeded;
}
function makeId() { return `entry-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`; }
type SetStore = React.Dispatch<React.SetStateAction<Store>>;
type PageProps = { store: Store; setStore: SetStore; toast: (m: string) => void };
const statusLabel: Record<Status, string> = { 'not-started': 'Not started', 'in-progress': 'In progress', completed: 'Completed' };
function StatusPill({ status }: { status: Status }) {
  const Icon = status === 'completed' ? CheckCircle2 : status === 'in-progress' ? Play : Circle;
  return <span className={`pill pill-${status}`}><Icon size={12} /> {statusLabel[status]}</span>;
}
function Label({ children }: { children: ReactNode }) { return <span className="eyebrow">{children}</span>; }
function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const pathsActive = location.startsWith('/paths') || location.startsWith('/journey') || location.startsWith('/skill');
  return <div className="app">
    <aside className="side">
      <Link href="/" className="brand"><span className="brand-symbol"><PawPrint size={20} /></span><span className="brand-name">GoodBoy</span></Link>
      <nav className="side-nav" aria-label="Main navigation">
        <Link href="/dogs" className={location === '/' || location.startsWith('/dogs') ? 'active' : ''}><Dog size={19} /> Dogs</Link>
        <Link href="/paths" className={pathsActive ? 'active' : ''}><RouteIcon size={19} /> Training paths</Link>
      </nav>
      <span className="side-note">Trainer workspace</span>
    </aside>
    <div className="content">{children}</div>
  </div>;
}
function useStoreState() {
  const [store, setStore] = useState<Store>(loadStore);
  useEffect(() => {
    try {
      const persistent = { ...store, skills: store.skills.map(({ videoUrl: _t, ...skill }) => skill) };
      localStorage.setItem(storageKey, JSON.stringify(persistent));
    } catch { /* storage may be full; edits stay in memory */ }
  }, [store]);
  return [store, setStore] as const;
}
function Toast({ message }: { message: string }) {
  return message ? <div role="status" className="toast"><CheckCircle2 size={17} /> {message}</div> : null;
}
function pathStats(store: Store, path?: TrainingPath) {
  const skills = (path?.skillIds ?? []).map((id) => store.skills.find((s) => s.id === id)).filter((s): s is Skill => Boolean(s));
  return { skills, done: skills.filter((s) => s.status === 'completed').length, active: skills.filter((s) => s.status === 'in-progress').length };
}
function ProgressBar({ done, total }: { done: number; total: number }) {
  return <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}><span style={{ width: total ? `${(done / total) * 100}%` : '0%' }} /></div>;
}

function DogsPage({ store }: { store: Store }) {
  const profile = store.profile;
  const path = store.paths.find((item) => item.id === profile.pathId);
  const { skills, done } = pathStats(store, path);
  return <main className="main page-enter">
    <header className="top"><div><Label>Your training team</Label><h1>Dogs</h1><p className="lede">Meet your dogs and open their training profiles.</p></div><span className="chip">1 dog</span></header>
    <div className="dogs-grid">
      <article className="card dog-card directory-card">
        <div className="photo-wrap"><img src={profile.photo} alt={`${profile.name}, ${profile.breed} portrait`} /><span className="photo-tag">{profile.photo === rayaPortrait ? 'Sample portrait' : 'Uploaded portrait'}</span></div>
        <div className="dog-facts">
          <h2>{profile.name}</h2><p className="directory-breed">{profile.breed}</p>
          <span className="chip">{profile.trainingType}</span>
          <div className="directory-progress"><Label>Training path</Label><h3>{path?.name || 'No path assigned'}</h3>
            {path && <><ProgressBar done={done} total={skills.length} /><p className="hint">{done} of {skills.length} milestones completed</p></>}
          </div>
          <Link href="/dogs/raya" className="btn btn-big" aria-label={`View ${profile.name}'s profile`}>View profile <ArrowRight size={18} /></Link>
        </div>
      </article>
    </div>
  </main>;
}

function HomePage({ store, setStore, toast }: PageProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(store.profile);
  const [, setLocation] = useLocation();
  const path = store.paths.find((item) => item.id === store.profile.pathId);
  const { skills, done, active } = pathStats(store, path);
  const photoChange = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast('Choose an image file for the profile photo.'); return; }
    const reader = new FileReader();
    reader.onerror = () => toast('This image could not be opened. Try another photo.');
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => toast('This image could not be opened. Try another photo.');
      image.onload = () => {
        const scale = Math.min(1, 1400 / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d');
        if (!context) { toast('This browser could not prepare the image. Try another photo.'); return; }
        context.fillStyle = '#fff6ee';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        setDraft((old) => ({ ...old, photo: canvas.toDataURL('image/jpeg', 0.82) }));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };
  const saveProfile = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.name.trim() || !draft.breed.trim() || !draft.trainingType.trim()) return;
    setStore((old) => ({ ...old, profile: { ...draft, name: draft.name.trim(), breed: draft.breed.trim(), trainingType: draft.trainingType.trim() } }));
    setEditing(false); toast('Profile saved on this device.');
  };
  const p = store.profile;
  return <main className="main page-enter">
    <Link href="/dogs" className="back"><ArrowLeft size={15} /> All dogs</Link>
    <header className="top"><div><Label>Dog information</Label><h1>{p.name}’s workspace</h1></div>
      <button className="btn" onClick={() => { setDraft(p); setEditing(true); }}><Pencil size={16} /> Edit profile</button></header>
    <div className="home-grid">
      <section className="card dog-card" aria-label="Dog profile">
        <div className="photo-wrap"><img src={p.photo} alt={`${p.name}, ${p.breed} portrait`} /><span className="photo-tag">{p.photo === rayaPortrait ? 'Sample portrait' : 'Uploaded portrait'}</span></div>
        <div className="dog-facts">
          <h2>{p.name}</h2>
          <span className="chip">{p.trainingType}</span>
          <dl>
            <div><dt>Breed</dt><dd>{p.breed}</dd></div>
            <div><dt>Training type</dt><dd>{p.trainingType}</dd></div>
            <div><dt>Assigned path</dt><dd>{path?.name ?? 'None assigned'}</dd></div>
          </dl>
        </div>
      </section>
      <section className="card path-now" aria-label="Current path">
        <Label>Current path</Label>
        {path ? <>
          <h2>{path.name}</h2>
          <p>{path.description || 'Add a description on the paths page.'}</p>
          <div className="stats">
            <div className="stat"><b>{skills.length}</b><span>Milestones</span></div>
            <div className="stat s-yellow"><b>{active}</b><span>In progress</span></div>
            <div className="stat s-green"><b>{done}</b><span>Completed</span></div>
          </div>
          <ProgressBar done={done} total={skills.length} />
          <span className="hint">{done} of {skills.length} milestones completed</span>
          <button className="btn btn-big" onClick={() => setLocation(`/journey/${path.id}`)}><Map size={18} /> Open training journey</button>
        </> : <>
          <h2>No path yet</h2><p>Assign a training path to start Raya’s journey.</p>
          <button className="btn btn-big" onClick={() => setLocation('/paths')}><RouteIcon size={18} /> Choose a path</button>
        </>}
      </section>
    </div>
    {editing && <div className="modal-back" onClick={() => setEditing(false)}><form className="card modal" onClick={(e) => e.stopPropagation()} onSubmit={saveProfile}>
      <div className="form-top"><h2>Edit {p.name}</h2><button type="button" className="icon-btn" aria-label="Close profile editor" onClick={() => setEditing(false)}><X size={18} /></button></div>
      <div className="field"><label htmlFor="profile-name">Dog’s name</label><input id="profile-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required /></div>
      <div className="field"><label htmlFor="profile-breed">Breed</label><input id="profile-breed" value={draft.breed} onChange={(e) => setDraft({ ...draft, breed: e.target.value })} required /></div>
      <div className="field"><label htmlFor="profile-type">Training type</label><input id="profile-type" value={draft.trainingType} onChange={(e) => setDraft({ ...draft, trainingType: e.target.value })} required /></div>
      <div className="field"><label htmlFor="profile-path">Assigned path</label><select id="profile-path" value={draft.pathId} onChange={(e) => setDraft({ ...draft, pathId: e.target.value })}><option value="">No path assigned</option>{store.paths.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
      <div className="field"><label htmlFor="profile-photo">Profile photo</label><input id="profile-photo" type="file" accept="image/*" onChange={(e) => photoChange(e.target.files?.[0])} /><p className="hint">Stored in this browser with this profile.</p></div>
      <div className="form-actions"><button type="button" className="btn btn-quiet" onClick={() => setEditing(false)}>Cancel</button><button className="btn" type="submit"><Save size={16} /> Save profile</button></div>
    </form></div>}
  </main>;
}

function PathsPage({ store, setStore, toast }: PageProps) {
  const [, setLocation] = useLocation();
  const [form, setForm] = useState<{ id?: string; name: string; description: string } | null>(null);
  const [error, setError] = useState('');
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!form?.name.trim()) { setError('Give this path a name before saving.'); return; }
    if (form.id) {
      setStore((old) => ({ ...old, paths: old.paths.map((p) => p.id === form.id ? { ...p, name: form.name.trim(), description: form.description.trim() } : p) }));
      toast('Path details saved.');
    } else {
      const id = makeId();
      setStore((old) => ({ ...old, paths: [...old.paths, { id, name: form.name.trim(), description: form.description.trim(), skillIds: [] }] }));
      toast('New path added.');
    }
    setForm(null); setError('');
  };
  const openNew = () => { setForm({ name: '', description: '' }); setError(''); };
  return <main className="main page-enter">
    <header className="top"><div><Label>Manage paths</Label><h1>Training paths</h1></div><button className="btn" onClick={openNew}><Plus size={16} /> New path</button></header>
    {store.paths.length ? <div className="path-list">{store.paths.map((path) => {
      const { skills, done } = pathStats(store, path);
      const assigned = path.id === store.profile.pathId;
      return <article className={`card path-item ${assigned ? 'is-assigned' : ''}`} key={path.id}>
        <div className="path-icon"><RouteIcon size={26} /></div>
        <div className="path-body">
          <div className="path-head"><h2>{path.name}</h2>{assigned && <span className="chip">Assigned to {store.profile.name}</span>}</div>
          <p>{path.description || 'Add a short description for this path.'}</p>
          <div className="meta"><span>{skills.length} {skills.length === 1 ? 'milestone' : 'milestones'}</span><span>{done} completed</span></div>
          <ProgressBar done={done} total={skills.length} />
          <div className="actions-row">
            <button className="btn btn-small" onClick={() => setLocation(`/journey/${path.id}`)}><Map size={15} /> Open journey</button>
            <button className="btn btn-quiet btn-small" disabled={assigned} onClick={() => { setStore((old) => ({ ...old, profile: { ...old.profile, pathId: path.id } })); toast(`Assigned to ${store.profile.name}.`); }}>{assigned ? <><Check size={15} /> Assigned</> : `Assign to ${store.profile.name}`}</button>
            <button className="icon-btn" aria-label={`Edit ${path.name}`} onClick={() => { setForm({ id: path.id, name: path.name, description: path.description }); setError(''); }}><Pencil size={16} /></button>
          </div>
        </div>
      </article>;
    })}</div> : <div className="empty-state"><BookOpen size={30} /><h2>Your first path starts here</h2><p>Create a path to collect the cues and instructions to practice.</p><button className="btn" onClick={openNew}><Plus size={16} /> New path</button></div>}
    {form && <div className="modal-back" onClick={() => setForm(null)}><form className="card modal" onClick={(e) => e.stopPropagation()} onSubmit={save}>
      <div className="form-top"><h2>{form.id ? 'Edit path' : 'New training path'}</h2><button className="icon-btn" type="button" aria-label="Close path form" onClick={() => setForm(null)}><X size={18} /></button></div>
      <div className="field"><label htmlFor="path-name">Path name</label><input id="path-name" placeholder="e.g. Foundation Skills" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
      <div className="field"><label htmlFor="path-description">Description or goal</label><textarea id="path-description" placeholder="What should this path help Raya practice?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
      {error && <p role="alert" className="error-text">{error}</p>}
      <div className="form-actions"><button type="button" className="btn btn-quiet" onClick={() => setForm(null)}>Cancel</button><button className="btn" type="submit"><Save size={16} /> Save path</button></div>
    </form></div>}
  </main>;
}

function JourneyPage({ store, setStore, toast }: PageProps) {
  const params = useParams<{ pathId: string }>();
  const [, setLocation] = useLocation();
  const path = store.paths.find((p) => p.id === params.pathId);
  if (!path) return <main className="main"><div className="empty-state"><h2>Path not found</h2><p>This path may have been removed or its link is out of date.</p><Link href="/paths" className="btn">Back to paths</Link></div></main>;
  const { skills, done, active } = pathStats(store, path);
  const moveStatus = (skillId: string, status: Status) => {
    setStore((old) => ({ ...old, skills: old.skills.map((s) => s.id === skillId ? { ...s, status } : s) }));
    toast('Milestone status updated.');
  };
  const addSkill = () => {
    const id = makeId();
    setStore((old) => ({ ...old, paths: old.paths.map((p) => p.id === path.id ? { ...p, skillIds: [...p.skillIds, id] } : p), skills: [...old.skills, { id, pathId: path.id, name: '', command: '', handSignal: '', instructions: '', status: 'not-started' }] }));
    setLocation(`/skill/${id}`);
  };
  const remove = (id: string, name: string) => {
    if (!window.confirm(`Remove “${name || 'this skill'}” from the path?`)) return;
    setStore((old) => ({ ...old, paths: old.paths.map((p) => p.id === path.id ? { ...p, skillIds: p.skillIds.filter((x) => x !== id) } : p), skills: old.skills.filter((s) => s.id !== id) }));
    toast('Skill removed from this path.');
  };
  const STEP = 190;
  const xs = skills.map((_, i) => 50 + 26 * Math.sin((i * Math.PI) / 2));
  const mobileXs = skills.map((_, i) => i % 2 ? 78 : 22);
  const height = skills.length * STEP + 40;
  const makeTrail = (positions: number[]) => positions.map((x, i) => { const y = i * STEP + 70; if (i === 0) return `M ${x} ${y}`; const py = (i - 1) * STEP + 70; const my = (py + y) / 2; return `C ${positions[i - 1]} ${my}, ${x} ${my}, ${x} ${y}`; }).join(' ');
  return <main className="main page-enter">
    <Link href="/paths" className="back"><ArrowLeft size={15} /> All paths</Link>
    <header className="top journey-top"><div><Label>{store.profile.name}’s training journey</Label><h1>{path.name}</h1><p className="lede">{path.description || 'Tap a milestone to edit it.'}</p></div>
      <div className="journey-stats"><div className="stat"><b>{skills.length}</b><span>Milestones</span></div><div className="stat s-yellow"><b>{active}</b><span>In progress</span></div><div className="stat s-green"><b>{done}</b><span>Completed</span></div></div></header>
    {skills.length ? <>
      <section className="journey" style={{ height }} aria-label="Milestone progression">
        <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="trail trail-desktop" aria-hidden="true"><path d={makeTrail(xs)} vectorEffect="non-scaling-stroke" /></svg>
        <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="trail trail-mobile" aria-hidden="true"><path d={makeTrail(mobileXs)} vectorEffect="non-scaling-stroke" /></svg>
        {skills.map((skill, i) => {
          const right = xs[i] > 50 ? false : true;
          return <div className={`node-wrap status-${skill.status}`} key={skill.id} style={{ '--step-x': `${xs[i]}%`, top: i * STEP + 70 } as React.CSSProperties}>
            <button className="node" aria-label={`Edit ${skill.name || 'untitled skill'}, step ${i + 1}, ${statusLabel[skill.status]}`} onClick={() => setLocation(`/skill/${skill.id}`)} data-testid={`node-skill-${skill.id}`}>
              {skill.status === 'completed' ? <Check size={34} strokeWidth={3} /> : skill.status === 'in-progress' ? <Play size={30} fill="currentColor" /> : <span>{i + 1}</span>}
            </button>
            <div className={`node-card card ${right ? 'to-right' : 'to-left'}`}>
              <h3>{skill.name || 'Untitled skill'}</h3>
              <p>{skill.command ? `Cue: “${skill.command}”` : 'Details to be added'}</p>
              <div className="node-actions">
                <select aria-label={`Status for ${skill.name || 'untitled skill'}`} className={`status-select pill-${skill.status}`} value={skill.status} onChange={(e) => moveStatus(skill.id, e.target.value as Status)} data-testid={`status-skill-${skill.id}`}>
                  <option value="not-started">Not started</option><option value="in-progress">In progress</option><option value="completed">Completed</option>
                </select>
                <button className="icon-btn" aria-label={`Remove ${skill.name || 'skill'}`} onClick={() => remove(skill.id, skill.name)}><Trash2 size={15} /></button>
              </div>
            </div>
          </div>;
        })}
      </section>
      <div className="journey-add"><button className="btn btn-big" onClick={addSkill}><Plus size={18} /> Add milestone</button></div>
    </> : <div className="empty-state"><Circle size={30} /><h2>A path with room to grow</h2><p>Add the first milestone to start this journey.</p><button className="btn" onClick={addSkill}><Plus size={16} /> Add the first milestone</button></div>}
  </main>;
}

const example = {
  name: 'Retrieve', command: 'Fetch', handSignal: 'Extend an open hand toward the object, then bring your hand back toward your body.',
  instructions: 'Begin with a familiar object in a quiet space. Invite the dog to take the object, then reward a calm return and release. Keep each practice short and end while the dog is still engaged.',
};
function SkillPage({ store, setStore, toast }: PageProps) {
  const params = useParams<{ skillId: string }>();
  const [, setLocation] = useLocation();
  const skill = store.skills.find((item) => item.id === params.skillId);
  const [draft, setDraft] = useState({ name: '', command: '', handSignal: '', instructions: '' });
  const [errors, setErrors] = useState<string[]>([]);
  const [exampleUsed, setExampleUsed] = useState(false);
  useEffect(() => {
    if (skill) setDraft({ name: skill.name, command: skill.command, handSignal: skill.handSignal, instructions: skill.instructions });
  }, [skill?.id]);
  if (!skill) return <main className="main"><div className="empty-state"><h2>Skill not found</h2><p>This skill may have been removed from its path.</p><Link href="/paths" className="btn">Back to paths</Link></div></main>;
  const validate = () => {
    const next: string[] = [];
    if (!draft.name.trim()) next.push('Add a skill name.');
    if (!draft.command.trim()) next.push('Add a verbal command.');
    if (!draft.instructions.trim()) next.push('Add training instructions.');
    setErrors(next);
    return next.length === 0;
  };
  const saveSkill = (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    setStore((old) => ({ ...old, skills: old.skills.map((s) => s.id === skill.id ? { ...s, ...draft, name: draft.name.trim(), command: draft.command.trim(), handSignal: draft.handSignal.trim(), instructions: draft.instructions.trim() } : s) }));
    toast('Skill saved on this device.');
    setLocation(`/journey/${skill.pathId}`);
  };
  const setStatus = (status: Status) => {
    setStore((old) => ({ ...old, skills: old.skills.map((s) => s.id === skill.id ? { ...s, status } : s) }));
    toast('Milestone status updated.');
  };
  const fileSelected = (file?: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setStore((old) => ({ ...old, skills: old.skills.map((s) => s.id === skill.id ? { ...s, videoUrl: url } : s) }));
  };
  const path = store.paths.find((p) => p.id === skill.pathId);
  return <main className="main page-enter">
    <Link href={`/journey/${skill.pathId}`} className="back"><ArrowLeft size={15} /> {path?.name || 'Training path'}</Link>
    <header className="top"><div><Label>Skill editor</Label><h1>{skill.name ? `Edit ${skill.name}` : 'Add a skill'}</h1></div><StatusPill status={skill.status} /></header>
    <div className="skill-grid">
    <form className="card form-card" onSubmit={saveSkill}>
      {exampleUsed && <div className="assist-box" role="status"><Sparkles size={16} /><span><strong>Simulated AI example — no live AI model is connected.</strong><br />Example content is editable. Review it before saving.</span></div>}
      <div className="field"><label htmlFor="skill-name">Skill name *</label><input id="skill-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Retrieve" aria-invalid={errors.some((e) => e.includes('skill name'))} /></div>
      <div className="field"><label htmlFor="skill-command">Verbal command *</label><input id="skill-command" value={draft.command} onChange={(e) => setDraft({ ...draft, command: e.target.value })} placeholder="The exact word or phrase to use" aria-invalid={errors.some((e) => e.includes('verbal command'))} /></div>
      <div className="field"><label htmlFor="skill-signal">Hand signal</label><textarea id="skill-signal" value={draft.handSignal} onChange={(e) => setDraft({ ...draft, handSignal: e.target.value })} placeholder="Describe the gesture clearly" /></div>
      <div className="field"><label htmlFor="skill-instructions">Training instructions *</label><textarea id="skill-instructions" value={draft.instructions} onChange={(e) => setDraft({ ...draft, instructions: e.target.value })} placeholder="What to do, and what to look for" aria-invalid={errors.some((e) => e.includes('training instructions'))} /></div>
      {errors.length > 0 && <div className="error-text" role="alert">{errors.map((er) => <div key={er}>{er}</div>)}</div>}
      <div className="form-actions"><button type="button" className="btn btn-soft" onClick={() => { setDraft(example); setExampleUsed(true); setErrors([]); }}><Sparkles size={16} /> AI Assist — Example</button><button className="btn" type="submit"><Save size={16} /> Save skill</button></div>
    </form>
    <aside className="side-col">
      <div className="card"><h3>Status</h3><p className="hint">You decide when this milestone moves on.</p>
        <div className="status-choices">{(['not-started', 'in-progress', 'completed'] as Status[]).map((st) => <button key={st} type="button" className={`choice pill-${st} ${skill.status === st ? 'on' : ''}`} onClick={() => setStatus(st)} aria-pressed={skill.status === st}>{statusLabel[st]}</button>)}</div></div>
      <div className="card"><h3>Demonstration video</h3>
        <label className="btn btn-quiet btn-small" htmlFor="skill-video"><Upload size={15} /> Choose a video</label>
        <input id="skill-video" className="hidden-file" type="file" accept="video/*" onChange={(e) => fileSelected(e.target.files?.[0])} aria-label="Choose a local demonstration video" />
        <p className="hint">Local preview only. Disappears after refresh.</p>
        {skill.videoUrl ? <video controls src={skill.videoUrl} aria-label="Temporary training video preview" /> : <div className="hint"><FileVideo size={14} style={{ verticalAlign: 'middle' }} /> No video selected</div>}
      </div>
    </aside>
    </div>
  </main>;
}

function Router() {
  const [store, setStore] = useStoreState();
  const [notice, setNotice] = useState('');
  const toast = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2400); };
  const props = { store, setStore, toast };
  return <RoutedErrorBoundary><Shell><Switch>
    <Route path="/"><DogsPage store={store} /></Route>
    <Route path="/dogs"><DogsPage store={store} /></Route>
    <Route path="/dogs/raya"><HomePage {...props} /></Route>
    <Route path="/paths"><PathsPage {...props} /></Route>
    <Route path="/journey/:pathId"><JourneyPage {...props} /></Route>
    <Route path="/skill/:skillId"><SkillPage {...props} /></Route>
    <Route component={NotFound} />
  </Switch><Toast message={notice} /></Shell></RoutedErrorBoundary>;
}
function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}
function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;
