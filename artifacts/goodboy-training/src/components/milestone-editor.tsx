import { type FormEvent, useState } from 'react';
import { Save } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace';
import { isExampleObjective, type MilestoneContent } from '@/lib/training';
import { Modal } from './shared';
import { fillBlankSitFields, isSampleSit, SAMPLE_SIT_CUE, SAMPLE_SIT_INSTRUCTIONS, SAMPLE_SIT_OBJECTIVE } from '@/lib/sample-sit';
import { LocalVideoField } from './local-video-field';

export function MilestoneEditor({ title, note, initial, objectiveExample, templateId, offerSample, onClose, onSave }: { title: string; note?: string; initial: MilestoneContent; objectiveExample?: string; templateId?: string; offerSample?: boolean; onClose: () => void; onSave: (c: MilestoneContent) => Promise<boolean> }) {
  const { isSaving, isUploading } = useWorkspace();
  const [d, setD] = useState<MilestoneContent>(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const set = (p: Partial<MilestoneContent>) => setD((o) => ({ ...o, ...p }));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const errs: string[] = [];
    if (!d.name.trim()) errs.push('Add a skill name.');
    setErrors(errs);
    if (errs.length) return;
    const ok = await onSave({ ...d, name: d.name.trim(), command: d.command.trim(), instructions: d.instructions.trim(), handSignal: d.handSignal.trim(), description: d.description.trim(), category: d.category.trim() || 'Foundation' });
    if (ok) onClose();
  };
  const sit = !!templateId && isSampleSit(templateId, d);
  const blankSample = sit && (!d.command.trim() || !d.description.trim() || !d.instructions.trim());
  const usesSample = sit && (d.command === SAMPLE_SIT_CUE || d.description === SAMPLE_SIT_OBJECTIVE || d.instructions === SAMPLE_SIT_INSTRUCTIONS);
  const bad = (t: string) => errors.some((x) => x.includes(t));
  return <Modal title={title} onClose={onClose} wide>
    <form onSubmit={submit}>
      <div className="modal-scroll">
        {note && <div className="assist-box" role="note"><span>{note}</span></div>}
        <div className="field"><label htmlFor="m-name">Skill name *</label><input id="m-name" value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Sit" aria-invalid={bad('skill name')} /></div>
        <div className="field"><label htmlFor="m-desc">Completion objective</label><textarea id="m-desc" value={d.description} onChange={(e) => set({ description: e.target.value })} placeholder="What does completion look like?" maxLength={1000} />
          {isExampleObjective(d.description) && <p className="hint">Example objective — tailor this to each dog before practice.</p>}
        </div>
        {offerSample && blankSample && <div className="assist-box" data-testid="box-use-sample"><div><strong>Editable sample content</strong><p>Fills only the blank cue, objective and instructions with the sample Sit plan. Fields you already wrote are kept. The sample clip does not establish a spoken cue or release word; agree them with the trainer.</p><p>Review the text, then Save to apply it to this dog only.</p><button type="button" className="btn btn-quiet btn-small" data-testid="button-use-sample-instructions" onClick={() => setD((o) => fillBlankSitFields(o))}>Use sample instructions</button></div></div>}
        {usesSample && !blankSample && <p className="scope-note sample-label" role="note">Editable sample content. This example text is written guidance, not taken from the sample clip, which has no audio and does not show the cue or release word. Edit it to match the trainer's plan.</p>}
        {!sit && !d.description.trim() && objectiveExample && <div className="assist-box"><div><strong>Example objective for review</strong><p>{objectiveExample}</p><p>Tailor this to each dog. Nothing changes until you save.</p><button type="button" className="btn btn-quiet btn-small" onClick={() => set({ description: objectiveExample })}>Use example objective</button></div></div>}
        <div className="field"><label htmlFor="m-cmd">Verbal cue</label><input id="m-cmd" value={d.command} onChange={(e) => set({ command: e.target.value })} placeholder="The exact word or phrase" /></div>
        <div className="field"><label htmlFor="m-sig">Hand signal</label><textarea id="m-sig" value={d.handSignal} onChange={(e) => set({ handSignal: e.target.value })} placeholder="Describe the gesture clearly" /></div>
        <div className="field"><label htmlFor="m-ins">Training instructions</label><textarea id="m-ins" value={d.instructions} onChange={(e) => set({ instructions: e.target.value })} placeholder="What to do, and what to look for" /></div>
        <div className="field"><label htmlFor="m-cat">Category</label><input id="m-cat" value={d.category} onChange={(e) => set({ category: e.target.value })} /></div>
        <div className="field"><label htmlFor="m-dif">Difficulty</label><select id="m-dif" value={d.difficulty} onChange={(e) => set({ difficulty: e.target.value as MilestoneContent['difficulty'] })}><option>Beginner</option><option>Intermediate</option><option>Advanced</option></select></div>
        <LocalVideoField label="Demonstration video (trainer reference)" kind="demonstration" value={d.videoPath} hint="Applies to this draft. Saved together with the other fields." onChange={(ref) => set({ videoPath: ref })} />
      </div>
      {errors.length > 0 && <div className="error-text" role="alert">{errors.map((x) => <div key={x}>{x}</div>)}</div>}
      <div className="form-actions" style={{ justifyContent: 'space-between' }}>
        <p className="hint">Add the trainer’s cue and practice instructions before using this milestone for practice.</p>
        <button className="btn" type="submit" disabled={isSaving || isUploading}><Save size={16} /> {isSaving ? 'Saving…' : 'Save'}</button>
      </div>
    </form>
  </Modal>;
}
