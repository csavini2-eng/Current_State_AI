import { type FormEvent, useState } from 'react';
import { Save, Sparkles } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace';
import type { MilestoneContent } from '@/lib/training';
import { Modal, UploadField } from './shared';

const example = {
  name: 'Retrieve', command: 'Fetch', handSignal: 'Extend an open hand toward the object, then bring your hand back toward your body.',
  instructions: 'Begin with a familiar object in a quiet space. Invite the dog to take the object, then reward a calm return and release. Keep each practice short and end while the dog is still engaged.',
};

export function MilestoneEditor({ title, note, initial, onClose, onSave }: { title: string; note?: string; initial: MilestoneContent; onClose: () => void; onSave: (c: MilestoneContent) => Promise<boolean> }) {
  const { isSaving, isUploading } = useWorkspace();
  const [d, setD] = useState<MilestoneContent>(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const [sim, setSim] = useState(false);
  const set = (p: Partial<MilestoneContent>) => setD((o) => ({ ...o, ...p }));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: string[] = [];
    if (!d.name.trim()) errs.push('Add a skill name.');
    if (!d.command.trim()) errs.push('Add a verbal command.');
    if (!d.instructions.trim()) errs.push('Add training instructions.');
    setErrors(errs);
    if (errs.length) return;
    const ok = await onSave({ ...d, name: d.name.trim(), command: d.command.trim(), instructions: d.instructions.trim(), handSignal: d.handSignal.trim(), description: d.description.trim(), category: d.category.trim() || 'Foundation' });
    if (ok) onClose();
  };
  const bad = (t: string) => errors.some((x) => x.includes(t));
  return <Modal title={title} onClose={onClose} wide>
    <form onSubmit={submit}>
      <div className="modal-scroll">
        {note && <div className="assist-box" role="note"><span>{note}</span></div>}
        {sim && <div className="assist-box" role="status"><Sparkles size={16} /><span><strong>Simulated example, no live AI model is connected.</strong><br />Review and edit before saving.</span></div>}
        <div className="field"><label htmlFor="m-name">Skill name *</label><input id="m-name" value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Sit" aria-invalid={bad('skill name')} /></div>
        <div className="field"><label htmlFor="m-desc">Short objective</label><input id="m-desc" value={d.description} onChange={(e) => set({ description: e.target.value })} placeholder="What does success look like?" /></div>
        <div className="field"><label htmlFor="m-cmd">Verbal command *</label><input id="m-cmd" value={d.command} onChange={(e) => set({ command: e.target.value })} placeholder="The exact word or phrase" aria-invalid={bad('verbal command')} /></div>
        <div className="field"><label htmlFor="m-sig">Hand signal</label><textarea id="m-sig" value={d.handSignal} onChange={(e) => set({ handSignal: e.target.value })} placeholder="Describe the gesture clearly" /></div>
        <div className="field"><label htmlFor="m-ins">Training instructions *</label><textarea id="m-ins" value={d.instructions} onChange={(e) => set({ instructions: e.target.value })} placeholder="What to do, and what to look for" aria-invalid={bad('training instructions')} /></div>
        <div className="field"><label htmlFor="m-cat">Category</label><input id="m-cat" value={d.category} onChange={(e) => set({ category: e.target.value })} /></div>
        <div className="field"><label htmlFor="m-dif">Difficulty</label><select id="m-dif" value={d.difficulty} onChange={(e) => set({ difficulty: e.target.value as MilestoneContent['difficulty'] })}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></div>
        <UploadField id="m-video" label="Demonstration video (optional)" kind="video" value={d.videoPath} onChange={(p) => set({ videoPath: p })} />
      </div>
      {errors.length > 0 && <div className="error-text" role="alert">{errors.map((x) => <div key={x}>{x}</div>)}</div>}
      <div className="form-actions" style={{ justifyContent: 'space-between' }}>
        <button type="button" className="btn btn-soft" onClick={() => { setD((o) => ({ ...o, ...example })); setSim(true); setErrors([]); }}><Sparkles size={16} /> Simulated example</button>
        <button className="btn" type="submit" disabled={isSaving || isUploading}><Save size={16} /> {isSaving ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  </Modal>;
}
