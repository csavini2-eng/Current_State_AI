import { useState } from 'react';
import { Check, Pencil, Sparkles, Trash2 } from 'lucide-react';
import type { AssignedMilestone } from '@/lib/training';
import { SAMPLE_FEEDBACK_DISCLOSURE, SAMPLE_FEEDBACK_SOURCE, SAMPLE_FEEDBACK_TEXT, SAMPLE_OBSERVATIONS, SAMPLE_SIT_VIDEO_PATH } from '@/lib/sample-sit';

export type SampleNoteApi = { dogName: string; value?: AssignedMilestone['sampleFeedbackNote']; onSave: (text: string) => Promise<boolean>; onRemove: () => Promise<boolean> };

/** The bundled Sit example: prepared observations about the supplied clip only, separate from personal practice feedback. */
export function SampleSit({ note, previewReason }: { note?: SampleNoteApi; previewReason?: string }) {
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
