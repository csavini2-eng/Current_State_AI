import { useState } from 'react';
import { Check, Pencil, Sparkles, Trash2 } from 'lucide-react';
import type { PracticeEntry, MilestoneContent } from '@workspace/api-client-react';
import { simulatePractice, outcomeLabels, PRACTICE_DISCLOSURE, PRACTICE_SOURCE, type ReportedOutcome } from '@workspace/api-zod/simulation';
import { AuthorizedVideo } from './authorized-video';

const OUTCOMES = Object.keys(outcomeLabels) as ReportedOutcome[];
const when = (iso: string) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? 'Date not recorded' : d.toLocaleString(); };

export function PracticeEntryCard({ entry, skill, dogName, index, token, onSave, disabled }: {
  entry: PracticeEntry; skill: MilestoneContent; dogName: string; index: number; token?: string;
  onSave: (entry: PracticeEntry) => Promise<boolean>; disabled?: boolean;
}) {
  const fb = entry.feedback;
  const [description, setDescription] = useState(entry.description);
  const [outcome, setOutcome] = useState<ReportedOutcome>(entry.outcome);
  const [draft, setDraft] = useState<{ text: string; clarify: boolean } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const idp = `entry-${entry.id}`;

  const run = async (next: PracticeEntry, fail: string) => {
    setBusy(true); setError('');
    let ok = false;
    try { ok = await onSave(next); } catch (e) { setError(e instanceof Error ? e.message : fail); setBusy(false); return false; }
    setBusy(false);
    if (!ok) setError(fail);
    return ok;
  };
  const generate = () => {
    setError('');
    const r = simulatePractice(skill, description, outcome);
    setDraft({ text: r.text, clarify: r.needsClarification });
  };
  const saveDraft = async () => {
    if (!draft) return;
    if (!draft.text.trim()) { setError('Add some text before saving the note.'); return; }
    const report = description.trim();
    const ok = await run({ ...entry, description: report, outcome, feedback: { source: PRACTICE_SOURCE, originalDescription: report, outcome, text: draft.text.trim() } }, 'The note could not be saved. Your draft is still here; try again.');
    if (ok) setDraft(null);
  };
  const saveEdit = async (text: string) => {
    if (!fb) return;
    const ok = await run({ ...entry, feedback: { ...fb, text: text.trim() } }, 'The note could not be saved. Your edit is still here; try again.');
    if (ok) setEditing(null);
  };
  const removeNote = async () => {
    if (!fb || !window.confirm('Remove the note text? The original report is kept and progress is not changed.')) return;
    await run({ ...entry, feedback: { ...fb, text: '' } }, 'The note could not be removed. It is unchanged.');
  };
  const lock = busy || disabled;

  return <article className="entry" data-testid={`card-practice-entry-${entry.id}`}>
    <div className="entry-head"><b>Attempt {index} · {dogName}</b><span className="hint" style={{ margin: 0 }}>{when(entry.createdAt)}</span></div>
    <AuthorizedVideo value={entry.videoPath} token={token} label={`Practice attempt ${index} for ${dogName}`} />
    {fb ? <>
      <div className="report"><span className="source-tag">Report at time of feedback</span>
        <p>{fb.originalDescription || 'No description was provided.'}</p>
        <p className="hint" style={{ margin: '4px 0 0' }}>{outcomeLabels[fb.outcome as ReportedOutcome]}</p></div>
      {editing === null ? <>
        <span className="source-tag">{fb.source}</span>
        {fb.text ? <div className="feedback-note" data-testid={`text-feedback-${entry.id}`}>{fb.text}</div> : <p className="hint" style={{ margin: 0 }}>Note text removed. The report above is kept.</p>}
        <div className="actions-row" style={{ marginTop: 0 }}>
          <button type="button" className="btn btn-quiet btn-small" disabled={lock} onClick={() => setEditing(fb.text)} data-testid={`button-edit-note-${entry.id}`}><Pencil size={14} /> {fb.text ? 'Edit note' : 'Add note text'}</button>
          {fb.text && <button type="button" className="btn btn-quiet btn-small" disabled={lock} onClick={() => void removeNote()}><Trash2 size={14} /> Remove note text</button>}
        </div>
        <p className="hint" style={{ margin: 0 }}>The report is fixed once feedback is saved. To describe a different attempt, add a new practice video.</p>
      </> : <>
        <div className="field" style={{ marginBottom: 8 }}><label htmlFor={`${idp}-edit`}>Note ({fb.source})</label>
          <textarea id={`${idp}-edit`} value={editing} maxLength={10000} onChange={e => setEditing(e.target.value)} /></div>
        <div className="actions-row" style={{ marginTop: 0 }}>
          <button type="button" className="btn btn-small" disabled={lock} onClick={() => void saveEdit(editing)}><Check size={14} /> {busy ? 'Saving…' : 'Save note'}</button>
          <button type="button" className="btn btn-quiet btn-small" disabled={busy} onClick={() => { setEditing(null); setError(''); }}>Cancel</button>
        </div>
      </>}
    </> : <>
      <div className="field" style={{ marginBottom: 10 }}><label htmlFor={`${idp}-desc`}>What happened during this attempt?</label>
        <textarea id={`${idp}-desc`} value={description} maxLength={4000} disabled={!!draft || lock} placeholder="For example: I gave the cue once, waited, then rewarded when…" onChange={e => setDescription(e.target.value)} data-testid={`input-description-${entry.id}`} /></div>
      <fieldset className="outcomes" disabled={!!draft || lock}><legend>Which describes it best? (optional)</legend>
        {OUTCOMES.map(o => <label className="outcome" key={o}><input type="radio" name={`${idp}-outcome`} checked={outcome === o} onChange={() => setOutcome(o)} /> {outcomeLabels[o]}</label>)}
      </fieldset>
      <p className="disclosure" role="note">{PRACTICE_DISCLOSURE}</p>
      {!draft && <div><button type="button" className="btn btn-small" disabled={lock} onClick={generate} data-testid={`button-simulate-${entry.id}`}><Sparkles size={15} /> Get simulated feedback</button></div>}
      {draft && <div className="practice" data-testid={`panel-feedback-${entry.id}`}>
        {draft.clarify && <p className="clarify">More detail is needed before suggestions can be given. You can save this question for the trainer, or dismiss it and add more detail.</p>}
        <div className="field" style={{ marginBottom: 0 }}><label htmlFor={`${idp}-note`}>Simulated note (editable)</label>
          <textarea id={`${idp}-note`} value={draft.text} maxLength={10000} style={{ minHeight: 180 }} onChange={e => setDraft({ ...draft, text: e.target.value })} /></div>
        <div className="actions-row" style={{ marginTop: 0 }}>
          <button type="button" className="btn btn-small" disabled={lock} onClick={() => void saveDraft()} data-testid={`button-save-feedback-${entry.id}`}><Check size={14} /> {busy ? 'Saving…' : 'Save note'}</button>
          <button type="button" className="btn btn-quiet btn-small" disabled={busy} onClick={() => { setDraft(null); setError(''); }}>Dismiss</button>
        </div>
        <p className="hint" style={{ margin: 0 }}>Saving keeps your report with the note. Progress does not change.</p>
      </div>}
    </>}
    {error && <p className="error-text" role="alert">{error}</p>}
  </article>;
}
