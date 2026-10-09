import { type FormEvent, type ReactNode, useEffect, useState } from 'react';
import './_group.css';
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronRight, Circle, Dog, FileVideo, Pencil, Plus, Save, Sparkles, Upload, X } from 'lucide-react';
import rayaPortrait from './assets/raya-sample.jpg';

function Link({ href: _href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} href="#" onClick={(event) => event.preventDefault()}>{children}</a>;
}
function useLocation(): [string, (path: string) => void] { return ['/', () => {}]; }
function useParams<T>(): T { return {} as T; }
type Status = 'not-started' | 'in-progress' | 'completed';
type Profile = { name: string; breed: string; trainingType: string; pathId: string; photo: string };
type TrainingPath = { id: string; name: string; description: string; skillIds: string[] };
type Skill = { id: string; pathId: string; name: string; command: string; handSignal: string; instructions: string; status: Status; videoUrl?: string };
type Store = { profile: Profile; paths: TrainingPath[]; skills: Skill[] };

const defaultIds = ['sit', 'stay', 'retrieve', 'come', 'heel'];
const seeded: Store = {
  profile: { name: 'Raya', breed: 'Newfoundland', trainingType: 'Service dog in training', pathId: 'foundation', photo: rayaPortrait },
  paths: [{ id: 'foundation', name: 'Foundation Skills', description: 'A considered starting point for the everyday cues that build a shared language.', skillIds: defaultIds }],
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
function Label({ children }: { children: ReactNode }) { return <span className="eyebrow">{children}</span>; }
function Header() {
  const [location] = useLocation();
  return <header className="topbar">
    <Link href="/" className="brand" aria-label="GoodBoy home">
      <span className="brand-symbol"><Dog size={19} strokeWidth={1.8} /></span><span className="brand-name">GoodBoy</span>
    </Link>
    <nav className="topnav" aria-label="Main navigation">
      <Link href="/" className={location === '/' ? 'active' : ''}>Raya</Link>
      <Link href="/paths" className={location.startsWith('/paths') || location.startsWith('/journey') ? 'active' : ''}>Training paths</Link>
      <span className="nav-note">Trainer workspace</span>
    </nav>
  </header>;
}
function AppShell({ children }: { children: ReactNode }) {
  return <div className="app-frame"><div className="shell"><Header />{children}<div className="footer-note">GoodBoy · One dog. One shared method.</div></div></div>;
}
function useStoreState() {
  const [store, setStore] = useState<Store>(loadStore);
  useEffect(() => {
    try {
      const persistent = { ...store, skills: store.skills.map(({ videoUrl: _temporary, ...skill }) => skill) };
      localStorage.setItem(storageKey, JSON.stringify(persistent));
    } catch { /* A local photo can exceed storage limits; current edits remain in memory. */ }
  }, [store]);
  return [store, setStore] as const;
}
function Toast({ message }: { message: string }) {
  return message ? <div role="status" className="toast">{message}</div> : null;
}

function HomePage({ store, setStore, toast }: { store: Store; setStore: React.Dispatch<React.SetStateAction<Store>>; toast: (m: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(store.profile);
  const [location, setLocation] = useLocation();
  const path = store.paths.find((item) => item.id === store.profile.pathId);
  const photoChange = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('Choose an image file for the profile photo.');
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => toast('This image could not be opened. Try another photo.');
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => toast('This image could not be opened. Try another photo.');
      image.onload = () => {
        const maxDimension = 1400;
        const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext('2d');
        if (!context) {
          toast('This browser could not prepare the image. Try another photo.');
          return;
        }
        context.fillStyle = '#f6f2e8';
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
  return <main className="main page-enter">
    <section className="hero-grid">
      <div className="hero-copy">
        <Label>A shared training notebook</Label>
        <h1>One dog.<br />One way forward.</h1>
        <p>Good training feels consistent, wherever the day takes you. Keep Raya’s cues and practice notes in one thoughtful place.</p>
        <button className="btn" onClick={() => path ? setLocation(`/journey/${path.id}`) : setLocation('/paths')}>
          Open Raya’s journey <ArrowRight size={15} />
        </button>
      </div>
      <div className="hero-image-wrap">
        <img className="hero-image" src={store.profile.photo} alt={`${store.profile.name}, ${store.profile.breed} portrait`} />
        <span className="photo-caption">{store.profile.photo === rayaPortrait ? 'Sample portrait · replace with Raya’s photo' : 'Uploaded portrait · saved on this device'}</span>
      </div>
    </section>
    <section className="profile-strip" aria-label="Raya's profile">
      <div className="profile-facts">
        <div><span className="fact-label">Dog</span><span className="fact-value">{store.profile.name}</span></div>
        <div><span className="fact-label">Breed</span><span className="fact-value">{store.profile.breed}</span></div>
        <div><span className="fact-label">Training type</span><span className="fact-value">{store.profile.trainingType}</span></div>
        <div><span className="fact-label">Assigned path</span><span className="fact-value">{path?.name ?? 'Choose a path'}</span></div>
      </div>
      <button className="btn btn-quiet btn-small" onClick={() => { setDraft(store.profile); setEditing(!editing); }}><Pencil size={13} /> Edit profile</button>
    </section>
    {editing && <form className="form-panel" style={{ marginTop: 20 }} onSubmit={saveProfile}>
      <div className="form-top"><div><Label>Profile details</Label><h1>Edit {store.profile.name}</h1></div><button type="button" className="icon-btn" aria-label="Close profile editor" onClick={() => setEditing(false)}><X size={17} /></button></div>
      <div className="field"><label htmlFor="profile-name">Dog’s name</label><input id="profile-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required /></div>
      <div className="field"><label htmlFor="profile-breed">Breed</label><input id="profile-breed" value={draft.breed} onChange={(e) => setDraft({ ...draft, breed: e.target.value })} required /></div>
      <div className="field"><label htmlFor="profile-type">Training type</label><input id="profile-type" value={draft.trainingType} onChange={(e) => setDraft({ ...draft, trainingType: e.target.value })} required /></div>
      <div className="field"><label htmlFor="profile-path">Assigned path</label><select id="profile-path" value={draft.pathId} onChange={(e) => setDraft({ ...draft, pathId: e.target.value })}><option value="">No path assigned</option>{store.paths.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      <div className="field"><label htmlFor="profile-photo">Profile photo</label><input id="profile-photo" type="file" accept="image/*" onChange={(e) => photoChange(e.target.files?.[0])} /><p className="field-hint">Upload a local image. Stored in this browser with this profile.</p></div>
      <div className="form-actions"><span className="field-hint">Your profile is saved only on this device.</span><button className="btn" type="submit"><Save size={14} /> Save profile</button></div>
    </form>}
    <section className="path-feature">
      <div><Label>Raya’s current path</Label><h2>A little progress,<br />one cue at a time.</h2></div>
      {path ? <Link href={`/journey/${path.id}`} className="path-card">
        <div><span className="path-card-count">{path.skillIds.length} foundation milestones</span><div className="path-card-title">{path.name}</div><p>{path.description || 'A training path for your shared practice.'}</p></div>
        <span className="icon-btn" aria-label={`Open ${path.name}`}><ChevronRight size={18} /></span>
      </Link> : <Link href="/paths" className="path-card"><div><span className="path-card-count">No path selected</span><div className="path-card-title">Choose Raya’s path</div><p>Assign a training path to continue your shared notebook.</p></div><ChevronRight size={18} /></Link>}
    </section>
    <Toast message="" />
  </main>;
}

function PathsPage({ store, setStore, toast }: { store: Store; setStore: React.Dispatch<React.SetStateAction<Store>>; toast: (m: string) => void }) {
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
  return <main className="main page-enter">
    <div className="page-heading"><div><Label>Build a shared method</Label><h1>Training paths</h1><p>Give your work a clear sequence. Each path holds the cues and instructions handlers can return to.</p></div><button className="btn" onClick={() => { setForm({ name: '', description: '' }); setError(''); }}><Plus size={15} /> Create a path</button></div>
    {store.paths.length ? <div className="path-list">{store.paths.map((path) => {
      const done = path.skillIds.map((id) => store.skills.find((s) => s.id === id)).filter((s) => s?.status === 'completed').length;
      return <article className="path-item" key={path.id}>
        <div className="path-item-top"><div><Label>{path.id === store.profile.pathId ? 'Assigned to Raya' : 'Training path'}</Label><h2 style={{ marginTop: 10 }}>{path.name}</h2><p>{path.description || 'Add a short description to describe this training path.'}</p></div><button className="icon-btn" aria-label={`Edit ${path.name}`} onClick={() => { setForm({ id: path.id, name: path.name, description: path.description }); setError(''); }}><Pencil size={15} /></button></div>
        <div className="path-meta"><span>{path.skillIds.length} {path.skillIds.length === 1 ? 'skill' : 'skills'} · {done} marked complete</span><div className="actions-row"><button className="btn btn-quiet btn-small" onClick={() => setStore((old) => ({ ...old, profile: { ...old.profile, pathId: path.id } }))}>{path.id === store.profile.pathId ? 'Assigned' : 'Assign to Raya'}</button><button className="btn btn-small" onClick={() => setLocation(`/journey/${path.id}`)}>Open path <ArrowRight size={13} /></button></div></div>
      </article>;
    })}</div> : <div className="empty-state"><BookOpen size={24} /><h2>Your next path starts here.</h2><p>Create a path to collect the exact skills, cues, and instructions your handlers need.</p><button className="btn" onClick={() => setForm({ name: '', description: '' })}><Plus size={15} /> Create a path</button></div>}
    {form && <div className="form-panel" style={{ marginTop: 22 }}>
      <div className="form-top"><div><Label>{form.id ? 'Path settings' : 'New training path'}</Label><h1>{form.id ? 'Edit path' : 'A new path'}</h1></div><button className="icon-btn" type="button" aria-label="Close path form" onClick={() => setForm(null)}><X size={17} /></button></div>
      <form onSubmit={save}>
        <div className="field"><label htmlFor="path-name">Path name</label><input id="path-name" placeholder="e.g. Foundation Skills" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
        <div className="field"><label htmlFor="path-description">Description or goal</label><textarea id="path-description" placeholder="What should this path help handlers practice together?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
        {error && <p role="alert" className="error-text">{error}</p>}
        <div className="form-actions"><span className="field-hint">Saved locally in this browser.</span><div className="form-actions-right"><button type="button" className="btn btn-quiet" onClick={() => setForm(null)}>Cancel</button><button className="btn" type="submit"><Save size={14} /> Save path</button></div></div>
      </form>
    </div>}
  </main>;
}

function JourneyPage({ store, setStore, toast }: { store: Store; setStore: React.Dispatch<React.SetStateAction<Store>>; toast: (m: string) => void }) {
  const params = useParams<{ pathId: string }>();
  const [, setLocation] = useLocation();
  const path = store.paths.find((p) => p.id === params.pathId);
  if (!path) return <main className="main"><div className="empty-state"><h2>Path not found</h2><p>This path may have been removed or its link may be out of date.</p><Link href="/paths" className="btn">Back to paths</Link></div></main>;
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
    setStore((old) => ({ ...old, paths: old.paths.map((p) => p.id === path.id ? { ...p, skillIds: p.skillIds.filter((skillId) => skillId !== id) } : p), skills: old.skills.filter((skill) => skill.id !== id) }));
    toast('Skill removed from this path.');
  };
  const skills = path.skillIds.map((id) => store.skills.find((skill) => skill.id === id)).filter((skill): skill is Skill => Boolean(skill));
  const completed = skills.filter((s) => s.status === 'completed').length;
  return <main className="main page-enter">
    <div className="page-heading" style={{ paddingBottom: 18 }}><div><Link href="/paths" className="eyebrow" style={{ textDecoration: 'none' }}><ArrowLeft size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} /> All paths</Link></div><button className="btn btn-quiet btn-small" onClick={addSkill}><Plus size={14} /> Add skill</button></div>
    <section className="journey-banner"><div><Label>Raya’s training journey</Label><h1>{path.name}</h1><p>{path.description || 'A calm, consistent way to practice together.'}</p></div><div className="journey-count">{String(completed).padStart(2, '0')}<small>of {String(skills.length).padStart(2, '0')} complete</small></div></section>
    {skills.length ? <section className="journey-list" aria-label="Ordered skill progression">
      {skills.map((skill, i) => <article className={`skill-row status-${skill.status}`} key={skill.id}>
        <div className="step-index" aria-label={`Step ${i + 1}`}>{skill.status === 'completed' ? <Check size={19} /> : String(i + 1).padStart(2, '0')}</div>
        <div><h3>{skill.name || 'Untitled skill'}</h3><div className="skill-hint">{skill.command ? `Verbal cue · ${skill.command}` : 'Details to be added by trainer'}</div></div>
        <div className="row-actions">
          <select aria-label={`Status for ${skill.name || 'untitled skill'}`} className={`status-select status-${skill.status}`} value={skill.status} onChange={(e) => moveStatus(skill.id, e.target.value as Status)} data-testid={`status-skill-${skill.id}`}>
            <option value="not-started">Not started</option><option value="in-progress">In progress</option><option value="completed">Completed</option>
          </select>
          <button className="icon-btn" aria-label={`Edit ${skill.name || 'skill'}`} onClick={() => setLocation(`/skill/${skill.id}`)}><Pencil size={14} /></button>
          <button className="icon-btn" aria-label={`Remove ${skill.name || 'skill'}`} onClick={() => remove(skill.id, skill.name)}><X size={14} /></button>
        </div>
      </article>)}
    </section> : <div className="empty-state"><Circle size={22} /><h2>A path with room to grow.</h2><p>Add the first skill to make this journey useful to every handler.</p><button className="btn" onClick={addSkill}><Plus size={15} /> Add the first skill</button></div>}
  </main>;
}

const example = {
  name: 'Retrieve', command: 'Fetch', handSignal: 'Extend an open hand toward the object, then bring your hand back toward your body.',
  instructions: 'Begin with a familiar object in a quiet space. Invite the dog to take the object, then reward a calm return and release. Keep each practice short and end while the dog is still engaged.',
};
function SkillPage({ store, setStore, toast }: { store: Store; setStore: React.Dispatch<React.SetStateAction<Store>>; toast: (m: string) => void }) {
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
    const next = [];
    if (!draft.name.trim()) next.push('Add a skill name.');
    if (!draft.command.trim()) next.push('Add a verbal command.');
    if (!draft.instructions.trim()) next.push('Add training instructions.');
    setErrors(next);
    return next.length === 0;
  };
  const saveSkill = (event?: FormEvent, toHandler = false) => {
    event?.preventDefault();
    if (!validate()) return;
    setStore((old) => ({ ...old, skills: old.skills.map((s) => s.id === skill.id ? { ...s, ...draft, name: draft.name.trim(), command: draft.command.trim(), handSignal: draft.handSignal.trim(), instructions: draft.instructions.trim() } : s) }));
    toast('Skill saved on this device.');
    if (toHandler) setLocation(`/handler/${skill.id}`);
    else setLocation(`/journey/${skill.pathId}`);
  };
  const useExample = () => { setDraft(example); setExampleUsed(true); setErrors([]); };
  const fileSelected = (file?: File) => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setStore((old) => ({ ...old, skills: old.skills.map((s) => s.id === skill.id ? { ...s, videoUrl: url } : s) }));
  };
  const path = store.paths.find((p) => p.id === skill.pathId);
  const video = skill.videoUrl;
  return <main className="main page-enter">
    <div className="page-heading" style={{ paddingBottom: 21 }}><Link href={`/journey/${skill.pathId}`} className="eyebrow" style={{ textDecoration: 'none' }}><ArrowLeft size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} /> {path?.name || 'Training path'}</Link></div>
    <section className="form-panel">
      <div className="form-top"><div><Label>Trainer’s skill card</Label><h1>{skill.name ? 'Edit this skill' : 'Add a skill'}</h1><p>Write it the way you want every handler to practice it.</p></div><div className="brand-symbol"><Dog size={18} /></div></div>
      {exampleUsed && <div className="assist-box" role="status"><Sparkles size={15} /><span><strong>Simulated AI example — no live AI model is connected.</strong><br />Example content is editable. Review it and make it your own before saving.</span></div>}
      <form onSubmit={(e) => saveSkill(e)}>
        <div className="field"><label htmlFor="skill-name">Skill name <span aria-hidden="true">*</span></label><input id="skill-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Retrieve" aria-invalid={errors.some((e) => e.includes('skill name'))} /><div className="field-hint">Required</div></div>
        <div className="field"><label htmlFor="skill-command">Verbal command <span aria-hidden="true">*</span></label><input id="skill-command" value={draft.command} onChange={(e) => setDraft({ ...draft, command: e.target.value })} placeholder="The exact word or phrase handlers should use" aria-invalid={errors.some((e) => e.includes('verbal command'))} /><div className="field-hint">Required · keep the spoken cue consistent</div></div>
        <div className="field"><label htmlFor="skill-signal">Hand signal</label><textarea id="skill-signal" value={draft.handSignal} onChange={(e) => setDraft({ ...draft, handSignal: e.target.value })} placeholder="Describe the gesture clearly for another handler" /></div>
        <div className="field"><label htmlFor="skill-instructions">Training instructions <span aria-hidden="true">*</span></label><textarea id="skill-instructions" value={draft.instructions} onChange={(e) => setDraft({ ...draft, instructions: e.target.value })} placeholder="What should the handler do, and what should they look for?" aria-invalid={errors.some((e) => e.includes('training instructions'))} /><div className="field-hint">Required · longer notes are welcome</div></div>
        {errors.length > 0 && <div className="error-text" role="alert">{errors.map((error) => <div key={error}>{error}</div>)}</div>}
        <div className="field"><label htmlFor="skill-video">Demonstration video</label><div className="video-box">
          <label className="btn btn-quiet btn-small file-label" htmlFor="skill-video"><Upload size={14} /> Choose a video</label>
          <input id="skill-video" className="hidden-file" type="file" accept="video/*" onChange={(e) => fileSelected(e.target.files?.[0])} aria-label="Choose a local demonstration video" />
          <p className="field-hint">Local preview only. This video is temporary and disappears after refresh.</p>
          {video ? <video controls src={video} aria-label="Temporary training video preview" /> : <div className="field-hint" style={{ marginTop: 12 }}><FileVideo size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />No video selected</div>}
        </div></div>
        <div className="form-actions"><button type="button" className="btn btn-soft btn-small" onClick={useExample}><Sparkles size={14} /> AI Assist — Example</button><div className="form-actions-right"><button type="button" className="btn btn-quiet" onClick={() => saveSkill(undefined, true)}>Preview as handler <ArrowRight size={14} /></button><button className="btn" type="submit"><Save size={14} /> Save skill</button></div></div>
      </form>
    </section>
  </main>;
}

function HandlerPage({ store }: { store: Store }) {
  const params = useParams<{ skillId: string }>();
  const skill = store.skills.find((item) => item.id === params.skillId);
  if (!skill) return <main className="main"><div className="empty-state"><h2>Skill not found</h2><p>This skill may have been removed from the journey.</p><Link href="/" className="btn">Return to Raya</Link></div></main>;
  return <main className="main page-enter">
    <div className="page-heading" style={{ paddingBottom: 22 }}><Link href={`/skill/${skill.id}`} className="eyebrow" style={{ textDecoration: 'none' }}><ArrowLeft size={12} style={{ verticalAlign: 'middle', marginRight: 6 }} /> Return to trainer view</Link></div>
    <article className="handler-card">
      <Label>Handler’s reference · {store.profile.name}</Label>
      <h1>{skill.name || 'Untitled skill'}</h1>
      <section className="handler-detail"><h2>Say</h2><p>{skill.command || 'No verbal command has been added yet.'}</p></section>
      <section className="handler-detail"><h2>Signal</h2><p>{skill.handSignal || 'No hand signal has been added yet.'}</p></section>
      <section className="handler-detail"><h2>Practice this way</h2><p>{skill.instructions || 'Training instructions have not been added yet.'}</p></section>
      {skill.videoUrl && <section className="handler-detail"><h2>Demonstration</h2><video controls src={skill.videoUrl} aria-label="Temporary training video" style={{ width: '100%', borderRadius: 4, background: '#292821' }} /><p className="field-hint" style={{ marginTop: 8 }}>Temporary local preview · disappears after refresh</p></section>}
      <div className="form-actions"><span className="field-hint">This read-only view uses the trainer’s saved skill details.</span><Link href={`/skill/${skill.id}`} className="btn btn-quiet"><Pencil size={14} /> Trainer view</Link></div>
    </article>
  </main>;
}

export default function Current() {
  const [store, setStore] = useState<Store>(seeded);
  return <AppShell><HomePage store={store} setStore={setStore} toast={() => {}} /></AppShell>;
}
