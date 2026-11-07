import { useState } from 'react';
import { Check, Pencil, Sparkles, Trash2 } from 'lucide-react';
import type { MilestoneContent, AssignedMilestone } from '@/lib/training';
import { isSampleSit, SAMPLE_FEEDBACK_DISCLOSURE, SAMPLE_FEEDBACK_SOURCE, SAMPLE_FEEDBACK_TEXT, SAMPLE_OBSERVATIONS, SAMPLE_SIT_CUE, SAMPLE_SIT_INSTRUCTIONS, SAMPLE_SIT_OBJECTIVE, SAMPLE_SIT_VIDEO_PATH } from '@/lib/sample-sit';
import { isExampleObjective } from '@/lib/training';
import { Modal } from './shared';
import { LocalVideoField } from './local-video-field';

export type SampleNoteApi = { dogName: string; value?: AssignedMilestone['sampleFeedbackNote']; onSave: (text: string) => Promise<boolean>; onRemove: () => Promise<boolean> };

export function MilestoneInstructions({ content, templateId, onClose, scopeNote, onDemoChange, practice, note }: {
  content: MilestoneContent; templateId?: string; note?: SampleNoteApi; onClose: () => void; scopeNote?: string;
  onDemoChange?: (ref: string) => Promise<boolean>;
  practice?: { dogName: string; value: string; onChange: (ref: string) => Promise<boolean> };
}) {
  const sit = !!templateId && isSampleSit(templateId, content);
  const usesSample = sit && (content.command === SAMPLE_SIT_CUE || content.description === SAMPLE_SIT_OBJECTIVE || content.instructions === SAMPLE_SIT_INSTRUCTIONS);
  return <Modal title={`${content.name} instructions`} onClose={onClose} wide>
    <div className="modal-scroll instructions-content">
      {usesSample && <p className="scope-note sample-label" role="note" data-testid="text-sample-content">Editable sample content. This written plan is example text, not taken from the sample clip. The clip has no audio and does not establish the spoken cue or release word.</p>}
      <section><h3>What completion looks like</h3>
        <p>{content.description.trim() || 'Add a completion objective in the milestone editor.'}</p>
        {isExampleObjective(content.description) && <p className="hint">Example objective — trainers should tailor this to each dog.</p>}
      </section>
      <section><h3>Verbal cue</h3><p>{content.command.trim() || 'Not added by the trainer yet.'}</p></section>
      {content.handSignal.trim() && <section><h3>Hand signal</h3><p>{content.handSignal}</p></section>}
      <section><h3>Training instructions</h3><p>{content.instructions.trim() || 'The trainer has not added practice instructions yet.'}</p></section>
      {sit && <SampleSit note={note} />}
      <section className="video-sections">
        {scopeNote && (onDemoChange || practice) && <div className="assist-box" role="note"><span>{scopeNote} Viewing or changing videos does not change progress.</span></div>}
        {onDemoChange
          ? <LocalVideoField label="Demonstration video" kind="demonstration" hint="How the trainer shows the skill should be practiced." value={content.videoPath} onChange={onDemoChange} />
          : <ReadOnlyDemo value={content.videoPath} />}
        {practice && <LocalVideoField label={`Practice video for ${practice.dogName}`} kind="practice" hint={`A recording of ${practice.dogName} practicing this milestone, kept for reference.`} value={practice.value} onChange={practice.onChange} />}
        {practice && !sit && <details className="sample-details" data-testid="details-sample-sit"><summary>Try the separate Sit sample experience</summary>
          <p className="hint">Automated analysis is not available for {practice.dogName}'s recording. This panel uses a supplied Sit clip and prepared observations about that clip only, never about your video. Preview here; notes save only from {practice.dogName}'s Sit milestone.</p>
          <SampleSit previewReason={`Preview only. Prepared observations describe the sample clip, not ${content.name || 'this milestone'}, so they are not saved here.`} />
        </details>}
        {practice && sit && <p className="hint">Automated analysis is not available for videos you choose. To see how feedback could look, use Try sample feedback with the separate Sample Sit video above; it is not about your recording.</p>}
      </section>
    </div>
    <div className="form-actions"><button type="button" className="btn" onClick={onClose}>Close</button></div>
  </Modal>;
}

function ReadOnlyDemo({ value }: { value: string }) {
  if (!value) return <div className="video-field video-demonstration"><div className="video-field-head"><h3>Demonstration video</h3><span className="video-kind">Trainer reference</span></div><p className="video-msg quiet">No demonstration video yet.</p></div>;
  return <LocalVideoFieldReadOnly value={value} />;
}

function LocalVideoFieldReadOnly({ value }: { value: string }) {
  // Without a writable scope, show the player but no change actions.
  return <div className="video-readonly"><LocalVideoField label="Demonstration video" kind="demonstration" value={value} onChange={() => undefined} /></div>;
}

function SampleSit({ note, previewReason }: { note?: SampleNoteApi; previewReason?: string }) {
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const saved = note?.value;
  const open = (text: string) => { setError(''); setDraft(text); };
  const save = async () => {
    if (!note || draft === null || busy) return;
    const t = draft.trim();
    if (!t) { setError('Add some text before saving the note.'); return; }
    if (t.length > 10000) { setError('Keep the note under 10,000 characters.'); return; }
    setBusy(true); setError('');
    const ok = await note.onSave(t).catch(() => false);
    setBusy(false);
    if (ok) setDraft(null); else setError('The note could not be saved. Your draft is still here; try again.');
  };
  const remove = async () => {
    if (!note || busy || !window.confirm(`Remove the saved sample note for ${note.dogName}? Progress is not changed.`)) return;
    setBusy(true); setError('');
    const ok = await note.onRemove().catch(() => false);
    setBusy(false);
    if (!ok) setError('The note could not be removed. It is unchanged.');
  };
  return <section className="sample-sit" aria-labelledby="sample-sit-h">
    <div className="sample-grid">
      <div className="sample-player">
        <div className="video-field-head"><h3 id="sample-sit-h">Sample Sit video</h3><span className="video-kind">Supplied sample</span></div>
        <video controls preload="metadata" playsInline src={import.meta.env.BASE_URL + SAMPLE_SIT_VIDEO_PATH} aria-label="Sample Sit video" data-testid="video-sample-sit" />
        <p className="hint">Supplied example footage, separate from this dog's videos. Silent, so it does not show the spoken cue or release word.</p>
      </div>
      <div className="sample-side">
        <button type="button" className="btn btn-soft btn-small" disabled={busy} data-testid="button-try-sample-feedback" onClick={() => open(saved?.text ?? SAMPLE_FEEDBACK_TEXT)}><Sparkles size={15} /> Try sample feedback</button>
        {saved && draft === null && <div className="sample-note" data-testid="card-sample-note">
          <span className="video-kind">{saved.source}</span>
          <p>{saved.text}</p>
          <div className="actions-row">
            <button type="button" className="btn btn-quiet btn-small" disabled={busy} onClick={() => open(saved.text)}><Pencil size={14} /> Edit note</button>
            <button type="button" className="btn btn-quiet btn-small" disabled={busy} onClick={() => void remove()}><Trash2 size={14} /> Remove note</button>
          </div>
        </div>}
        {draft !== null && <div className="sample-feedback" data-testid="panel-sample-feedback">
          <p className="sample-disclosure" role="note">{SAMPLE_FEEDBACK_DISCLOSURE}</p>
          <ul className="sample-obs">{SAMPLE_OBSERVATIONS.map((o) => <li key={o.title}><b>{o.title}</b> {o.text}</li>)}</ul>
          {note ? <>
            <div className="field"><label htmlFor="sample-note-text">Practice note for {note.dogName}, Sit milestone ({SAMPLE_FEEDBACK_SOURCE})</label>
              <textarea id="sample-note-text" value={draft} maxLength={10000} onChange={(e) => setDraft(e.target.value)} aria-invalid={!!error} /></div>
            {error && <p className="error-text" role="alert">{error}</p>}
            <div className="actions-row">
              <button type="button" className="btn btn-small" disabled={busy} data-testid="button-save-practice-note" onClick={() => void save()}><Check size={14} /> {busy ? 'Saving…' : 'Save practice note'}</button>
              <button type="button" className="btn btn-quiet btn-small" disabled={busy} data-testid="button-dismiss-feedback" onClick={() => { setDraft(null); setError(''); }}>Dismiss</button>
            </div>
            <p className="hint">Saving keeps one note for this dog and milestone only. It does not change progress.</p>
          </> : <>
            <p className="hint">{previewReason ?? "Preview only. Practice notes require an assigned dog; open a dog's journey to save one."}</p>
            <button type="button" className="btn btn-quiet btn-small" onClick={() => setDraft(null)}>Dismiss</button>
          </>}
        </div>}
      </div>
    </div>
  </section>;
}
