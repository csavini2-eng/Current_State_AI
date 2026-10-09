import { type ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useClerk } from '@clerk/react';
import { CheckCircle2, Circle, Dog as DogIcon, Layers, LogIn, LogOut, PawPrint, Play, Route as RouteIcon, Trash2, Upload, X } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace';
import { mediaUrl, resolveStep, statusLabel, type DogProfile, type MilestoneContent, type MilestoneTemplate, type Status, type TrainingProgram, type TrainingWorkspace, type DogAssignment } from '@/lib/training';
import rayaPortrait from '../assets/raya-sample.jpg';

export const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

export function Label({ children }: { children: ReactNode }) { return <span className="eyebrow">{children}</span>; }
export function StatusPill({ status }: { status: Status }) {
  const Icon = status === 'completed' ? CheckCircle2 : status === 'in-progress' ? Play : Circle;
  return <span className={`pill pill-${status}`}><Icon size={12} /> {statusLabel[status]}</span>;
}
export function ProgressBar({ done, total }: { done: number; total: number }) {
  return <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}><span style={{ width: total ? `${(done / total) * 100}%` : '0%' }} /></div>;
}
export function DogPhoto({ dog, size }: { dog: Pick<DogProfile, 'id' | 'name' | 'photo'>; size?: number }) {
  const src = dog.photo ? mediaUrl(dog.photo) : dog.id === 'raya' ? rayaPortrait : '';
  if (!src) return <div className="photo-empty" role="img" aria-label={`${dog.name} has no photo yet`}><PawPrint size={size ?? 64} /></div>;
  return <img src={src} alt={`${dog.name} portrait`} />;
}
export function contentOf(m: MilestoneContent): MilestoneContent {
  return { name: m.name, description: m.description, command: m.command, handSignal: m.handSignal, instructions: m.instructions, category: m.category, difficulty: m.difficulty, videoPath: m.videoPath };
}
export function stepItems(state: TrainingWorkspace, path: TrainingProgram) {
  return path.steps.flatMap((step) => { const content = resolveStep(state, step); return content ? [{ step, content }] : []; });
}
export function assignmentStats(state: TrainingWorkspace, a: DogAssignment) {
  const path = state.paths.find((p) => p.id === a.pathId);
  const items = path ? stepItems(state, path) : [];
  const get = (id: string): Status => a.progress[id] ?? 'not-started';
  return { path, items, total: items.length, done: items.filter((i) => get(i.step.id) === 'completed').length, active: items.filter((i) => get(i.step.id) === 'in-progress').length };
}
export function templateById(state: TrainingWorkspace, id: string): MilestoneTemplate | undefined { return state.milestones.find((m) => m.id === id); }

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  return <div className="modal-back" role="dialog" aria-modal="true" aria-label={title}><div className={`card modal ${wide ? 'wide' : ''}`}>
    <div className="form-top"><h2>{title}</h2><button type="button" className="icon-btn" aria-label="Close" onClick={onClose}><X size={18} /></button></div>
    {children}
  </div></div>;
}

export function UploadField({ id, label, kind, value, onChange }: { id: string; label: string; kind: 'image' | 'video'; value: string; onChange: (path: string) => void }) {
  const { upload, isUploading, isSaving, isSignedIn } = useWorkspace();
  const [err, setErr] = useState('');
  const locked = kind === 'video' && !isSignedIn;
  const pick = async (file?: File) => {
    if (!file) return;
    setErr('');
    if (kind === 'image' && !file.type.startsWith('image/')) { setErr('Choose an image file.'); return; }
    if (kind === 'video' && !file.type.startsWith('video/')) { setErr('Choose a video file.'); return; }
    try { onChange(await upload(file)); } catch (e) { setErr(e instanceof Error ? e.message : 'Upload failed.'); }
  };
  return <div className="field"><label htmlFor={id}>{label}</label>
    {value && kind === 'image' && <img src={mediaUrl(value)} alt="" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 16, marginBottom: 10, display: 'block' }} />}
    {value && kind === 'video' && <video controls src={mediaUrl(value)} style={{ width: '100%', borderRadius: 14, marginBottom: 10 }} aria-label="Demonstration video" />}
    <div className="actions-row" style={{ marginTop: 0 }}>
      <label className="btn btn-quiet btn-small" htmlFor={id} aria-disabled={locked || isUploading || isSaving}><Upload size={15} /> {isUploading ? 'Uploading…' : value ? 'Replace' : `Choose ${kind}`}</label>
      <input id={id} className="hidden-file" type="file" accept={kind === 'image' ? 'image/*' : 'video/*'} disabled={locked || isUploading || isSaving} onChange={(e) => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
      {value && <button type="button" className="btn btn-quiet btn-small" disabled={isUploading} onClick={() => onChange('')}><Trash2 size={15} /> Remove</button>}
    </div>
    {locked && <p className="hint">Sign in to upload videos that persist and can be shared.</p>}
    {kind === 'image' && !isSignedIn && <p className="hint">Photos stay in this browser until you sign in and save.</p>}
    {isUploading && <p className="hint" role="status">Uploading, please wait before saving.</p>}
    {err && <p className="error-text" role="alert">{err}</p>}
  </div>;
}

export function Shell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { isSignedIn, error, message, setError, refresh } = useWorkspace();
  const act = (a: boolean) => (a ? 'active' : '');
  return <div className="app">
    <aside className="side">
      <Link href="/" className="brand"><span className="brand-symbol"><PawPrint size={20} /></span><span className="brand-name">GoodBoy</span></Link>
      <nav className="side-nav" aria-label="Main navigation">
        <Link href="/dogs" className={act(location === '/' || location.startsWith('/dogs'))}><DogIcon size={19} /> My Dogs</Link>
        <Link href="/paths" className={act(location.startsWith('/paths') || location.startsWith('/journey'))}><RouteIcon size={19} /> Training Paths</Link>
        <Link href="/milestones" className={act(location.startsWith('/milestones'))}><Layers size={19} /> Milestone Gallery</Link>
      </nav>
      <div className="side-auth" style={{ marginTop: 'auto' }}>
        {isSignedIn
          ? <button className="btn btn-quiet btn-small" onClick={() => void signOut({ redirectUrl: basePath || '/' })}><LogOut size={15} /> Sign out</button>
          : <Link href="/sign-in" className="btn btn-quiet btn-small"><LogIn size={15} /> Sign in</Link>}
        <span className="side-note" style={{ marginTop: 0 }}>{isSignedIn ? 'Private trainer workspace' : 'Prototype on this browser'}</span>
      </div>
    </aside>
    <div className="content">
      {error && <div className="main" style={{ paddingBottom: 0, paddingTop: 20 }}><div className="banner bad" role="alert">{error}<button className="btn btn-small" onClick={() => void refresh()}>Reload records</button><button className="icon-btn" aria-label="Dismiss" onClick={() => setError('')}><X size={16} /></button></div></div>}
      {children}
    </div>
    {message && <div role="status" className="toast"><CheckCircle2 size={17} /> {message}</div>}
  </div>;
}
export function Loading() { return <main className="main" aria-busy="true"><div className="skeleton" /><div className="skeleton" /></main>; }
export function NotFoundCard({ title, text, href, cta }: { title: string; text: string; href: string; cta: string }) {
  return <main className="main"><div className="empty-state"><h2>{title}</h2><p>{text}</p><Link href={href} className="btn">{cta}</Link></div></main>;
}
