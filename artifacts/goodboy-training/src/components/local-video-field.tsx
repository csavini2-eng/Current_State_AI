import { useEffect, useId, useRef, useState } from 'react';
import { Eye, Trash2, Upload } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace';
import { mediaUrl } from '@/lib/training';
import { LOCAL_VIDEO_PREFIX, readLocalVideo, saveLocalVideo } from '@/lib/local-videos';
import { readGuestMedia } from '@/lib/guest-sharing';
import { SHARED_VIDEO_PREFIX } from './authorized-video';

type Load = 'empty' | 'loading' | 'ready' | 'missing' | 'unavailable' | 'expired' | 'unsupported' | 'storage-error';

export function LocalVideoField({ label, value, scopeNote, onChange, kind = 'demonstration', hint }: {
  label: string; value: string; scopeNote?: string; kind?: 'demonstration' | 'practice'; hint?: string;
  onChange: (ref: string) => Promise<boolean> | void;
}) {
  const { isSaving } = useWorkspace();
  const inputId = useId();
  const [src, setSrc] = useState('');
  const [load, setLoad] = useState<Load>('empty');
  const [error, setError] = useState('');
  const [failedFile, setFailedFile] = useState<File | null>(null);
  const [tempUrl, setTempUrl] = useState('');
  const [working, setWorking] = useState(false);
  const tempRef = useRef('');

  useEffect(() => {
    let alive = true; let created = '';
    setError('');
    if (!value) { setSrc(''); setLoad('empty'); return; }
    if (value.startsWith(LOCAL_VIDEO_PREFIX)) {
      setLoad('loading'); setSrc('');
      readLocalVideo(value).then(rec => {
        if (!alive) return;
        if (!rec) { setLoad('missing'); return; }
        created = URL.createObjectURL(rec.file); setSrc(created); setLoad('ready');
      }).catch(() => { if (alive) setLoad('storage-error'); });
    } else if (value.startsWith(SHARED_VIDEO_PREFIX)) {
      // Shared media is read only through the guest-sharing service capability; never through private mediaUrl.
      setLoad('loading'); setSrc('');
      readGuestMedia(value).then(blob => {
        if (!alive) return;
        created = URL.createObjectURL(blob); setSrc(created); setLoad('ready');
      }).catch(() => { if (alive) setLoad('unavailable'); });
    } else if (value.startsWith('blob:')) { setSrc(value); setLoad('ready'); }
    else { setSrc(mediaUrl(value)); setLoad('ready'); }
    return () => { alive = false; if (created) URL.revokeObjectURL(created); };
  }, [value]);

  useEffect(() => () => { if (tempRef.current) URL.revokeObjectURL(tempRef.current); }, []);
  const clearTemp = () => { if (tempRef.current) URL.revokeObjectURL(tempRef.current); tempRef.current = ''; setTempUrl(''); };

  const pick = async (file?: File) => {
    if (!file) return;
    setError(''); setFailedFile(null); clearTemp();
    if (!file.type.startsWith('video/')) { setError('Choose a video file (for example MP4, WebM or MOV).'); return; }
    setWorking(true);
    let ref: string;
    try { ref = await saveLocalVideo(file); }
    catch (e) {
      setWorking(false);
      setError(`This browser could not store the video${e instanceof Error ? `: ${e.message}` : '.'} Nothing was saved.`);
      setFailedFile(file); return;
    }
    try {
      const result = await onChange(ref);
      if (result === false) {
        setError('The video was stored, but the record could not be updated. The previous video is still in place.');
        setFailedFile(file);
      }
    } catch {
      setError('The video was stored, but its record could not be updated. Your previous saved video is unchanged.');
      setFailedFile(file);
    }
    finally { setWorking(false); }
  };
  const remove = async () => {
    setError(''); clearTemp(); setWorking(true);
    try {
      const result = await onChange('');
      if (result === false) setError('The video could not be removed. Try again.');
    } catch { setError('The video could not be removed. Your saved reference is unchanged.'); }
    finally { setWorking(false); }
  };
  const useTemp = () => { if (!failedFile) return; clearTemp(); const u = URL.createObjectURL(failedFile); tempRef.current = u; setTempUrl(u); setFailedFile(null); };

  const busy = working || isSaving;
  const isLocal = value.startsWith(LOCAL_VIDEO_PREFIX);
  const isLegacy = value.startsWith('blob:');
  return <div className={`video-field video-${kind}`} data-testid={`video-field-${kind}`}>
    <div className="video-field-head"><h3>{label}</h3><span className="video-kind">{kind === 'practice' ? 'This dog' : 'Trainer reference'}</span></div>
    {hint && <p className="hint">{hint}</p>}
    {scopeNote && <p className="scope-note" role="note">{scopeNote}</p>}
    {load === 'loading' && <div className="video-skeleton" aria-busy="true" aria-label="Loading video" />}
    {load === 'ready' && src && !tempUrl && <video controls preload="metadata" src={src} aria-label={label} onError={() => setLoad(isLocal ? 'unsupported' : isLegacy ? 'expired' : 'unavailable')} />}
    {load === 'unsupported' && <p className="video-msg">The video is stored, but this browser cannot play its format. Try a supported MP4 or WebM file. Your saved reference is unchanged.</p>}
    {load === 'missing' && <p className="video-msg">This video is no longer stored in this browser. Choose a file to replace it.</p>}
    {load === 'storage-error' && <p className="video-msg">The browser could not read local video storage. Your saved reference is unchanged. Try reloading or select a file for a temporary preview.</p>}
    {load === 'unavailable' && <p className="video-msg">This video is unavailable here (it may be private or its shared link was revoked). The reference has not been changed.</p>}
    {load === 'expired' && <p className="video-msg">This older video link has expired and can no longer play. The reference is kept; choose a file to replace it.</p>}
    {load === 'empty' && !tempUrl && <p className="video-msg quiet">No video yet.</p>}
    {tempUrl && <div className="temp-preview">
      <video controls src={tempUrl} aria-label={`${label} temporary preview`} />
      <p className="video-msg">Temporary preview only. This selection is not saved to the milestone. {value ? 'The existing saved video is unchanged. ' : ''}This preview disappears after reload or closing this dialog.</p>
      <button type="button" className="btn btn-quiet btn-small" onClick={clearTemp}>Close preview</button>
    </div>}
    <div className="actions-row" style={{ marginTop: 10 }}>
      <label className="btn btn-quiet btn-small file-trigger" htmlFor={inputId} aria-disabled={busy}><Upload size={15} /> {working ? 'Saving…' : value ? 'Replace video' : 'Choose video'}</label>
      <input id={inputId} className="hidden-file file-focus" type="file" accept="video/*" disabled={busy} onChange={e => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
      {value && <button type="button" className="btn btn-quiet btn-small" disabled={busy} onClick={() => void remove()}><Trash2 size={15} /> Remove</button>}
    </div>
    {error && <div className="error-text" role="alert"><p style={{ margin: 0 }}>{error}</p>
      {failedFile && <button type="button" className="btn btn-quiet btn-small" style={{ marginTop: 8 }} onClick={useTemp}><Eye size={15} /> Use temporary preview</button>}</div>}
    <p className="hint">Videos selected here stay in this browser unless you share this assignment with a handler.</p>
  </div>;
}
