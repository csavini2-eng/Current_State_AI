import { useId, useState } from 'react';
import { Upload, Video } from 'lucide-react';
import type { PracticeEntry, MilestoneContent } from '@workspace/api-client-react';
import { PracticeEntryCard } from './practice-entry';

export type PracticeApi = {
  entries: PracticeEntry[];
  /** Must create a NEW entry. Throw (or return false) on failure. */
  onAddVideo: (file: File) => Promise<boolean | void>;
  onSaveEntry: (entry: PracticeEntry) => Promise<boolean>;
  token?: string; disabled?: boolean; storageHint?: string;
};

export function dedupeEntries(list: PracticeEntry[]): PracticeEntry[] {
  const map = new Map<string, PracticeEntry>();
  for (const e of list) map.set(e.id, e);
  return [...map.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

/** Uploads append history; never replaces earlier attempts. mode=practice lists attempts awaiting feedback, mode=history lists saved notes. */
export function PracticePanel({ api, skill, dogName, mode }: { api: PracticeApi; skill: MilestoneContent; dogName: string; mode: 'practice' | 'history' }) {
  const inputId = useId();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  const all = dedupeEntries(api.entries);
  const numbered = all.map((e, i) => ({ e, n: i + 1 }));
  const shown = numbered.filter(({ e }) => mode === 'history' ? !!e.feedback : !e.feedback).reverse();
  const add = async (file?: File) => {
    if (!file) return;
    setError('');
    if (!file.type.startsWith('video/')) { setError('Choose a video file (for example MP4, WebM or MOV). Nothing was added.'); return; }
    setWorking(true);
    try {
      const r = await api.onAddVideo(file);
      if (r === false) setError('The practice video could not be added. Earlier attempts are unchanged; try again.');
    } catch (e) { setError(`${e instanceof Error ? e.message : 'The practice video could not be added.'} Earlier attempts are unchanged.`); }
    finally { setWorking(false); }
  };
  const lock = working || api.disabled;
  return <div className="practice">
    {mode === 'practice' && <div className="add-practice">
      <h3>Add a practice video</h3>
      <p className="hint" style={{ marginTop: 0 }}>Each video starts a new attempt for {dogName}. Earlier attempts stay in the history. Progress is not changed.</p>
      <label className="btn btn-small file-trigger" htmlFor={inputId} aria-disabled={lock} data-testid="button-add-practice-video"><Upload size={15} /> {working ? 'Adding…' : 'Choose practice video'}</label>
      <input id={inputId} className="hidden-file" type="file" accept="video/mp4,video/webm,video/quicktime,video/*" disabled={lock} onChange={e => { void add(e.target.files?.[0]); e.target.value = ''; }} />
      {api.storageHint && <p className="hint" style={{ marginBottom: 0 }}>{api.storageHint}</p>}
      {error && <p className="error-text" role="alert" style={{ marginTop: 8 }}>{error}</p>}
    </div>}
    {shown.length === 0 && <p className="video-msg quiet"><Video size={14} style={{ verticalAlign: '-2px' }} /> {mode === 'history' ? `No saved feedback for ${dogName} on this skill yet. Notes appear here after you save them from Videos & practice.` : all.length ? 'Every attempt has a saved note. See Feedback & history.' : 'No practice attempts yet.'}</p>}
    {shown.map(({ e, n }) => <PracticeEntryCard key={e.id} entry={e} index={n} skill={skill} dogName={dogName} token={api.token} disabled={api.disabled} onSave={api.onSaveEntry} />)}
  </div>;
}
