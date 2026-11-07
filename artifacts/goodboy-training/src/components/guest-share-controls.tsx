import { useRef, useState } from 'react';
import { Copy, ExternalLink, RefreshCw, Share2, Trash2, UploadCloud } from 'lucide-react';
import { useWorkspace } from '@/lib/workspace';
import { createOrUpdateGuestShare, getLocalGuestLink, handlerUrl, revokeLocalGuestShare, type GuestLink } from '@/lib/guest-sharing';
import { Modal } from './shared';

export function GuestShareControls({ assignmentId, dogName, pathName, small }: { assignmentId: string; dogName: string; pathName: string; small?: boolean }) {
  const { state, refresh } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState<GuestLink | null>(() => getLocalGuestLink(assignmentId));
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [showField, setShowField] = useState(false);
  const fieldRef = useRef<HTMLInputElement>(null);
  const active = link?.status === 'active';
  const url = active && link ? handlerUrl(link) : '';

  const openDialog = () => { setLink(getLocalGuestLink(assignmentId)); setError(''); setStatus(''); setShowField(false); setOpen(true); };
  const sync = async () => {
    setBusy(true); setError(''); setStatus(''); setProgress('Preparing…');
    try {
      const next = await createOrUpdateGuestShare(state, assignmentId, m => setProgress(m));
      setLink(next); setStatus(active ? 'Shared assignment updated.' : 'Handler link created.');
    } catch (e) {
      setLink(getLocalGuestLink(assignmentId));
      setError(`${e instanceof Error ? e.message : 'Sharing failed.'} No new link was created; your local records are unchanged.`);
    } finally { setBusy(false); setProgress(''); }
  };
  const copy = async () => {
    setStatus('');
    try { await navigator.clipboard.writeText(url); setStatus('Link copied.'); }
    catch { setShowField(true); setStatus('Copy is blocked in this browser. Select the link below and copy it.'); window.setTimeout(() => fieldRef.current?.select(), 0); }
  };
  const revoke = async () => {
    if (!window.confirm(`Revoke the handler link for ${dogName}’s ${pathName}? Anyone using it loses access immediately. Local records stay in this browser.`)) return;
    setBusy(true); setError(''); setStatus('');
    try { await revokeLocalGuestShare(assignmentId); setLink(getLocalGuestLink(assignmentId)); setShowField(false); setStatus('Link revoked. The handler view no longer opens.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'The link could not be revoked. It may still work; try again.'); }
    finally { setBusy(false); }
  };
  const pull = async () => {
    setBusy(true); setError(''); setStatus('');
    try { await refresh(); setStatus('Handler submissions refreshed.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Submissions could not be refreshed.'); }
    finally { setBusy(false); }
  };

  return <>
    <button type="button" className={`btn btn-quiet ${small ? 'btn-small' : ''}`} onClick={openDialog} data-testid={`button-share-${assignmentId}`}><Share2 size={15} /> Share with handler</button>
    {open && <Modal title="Share with handler" context={`${dogName} · ${pathName}`} onClose={() => setOpen(false)}
      footer={<button type="button" className="btn btn-quiet" onClick={() => setOpen(false)}>Done</button>}>
      <div className="share-explain">
        <p style={{ margin: 0 }}>Creating a link saves a copy of these to the server:</p>
        <ul>
          <li>{dogName}’s photo, name, breed, age and handler name</li>
          <li>The assigned {pathName} instructions and progress for {dogName}</li>
          <li>Demonstration videos and practice history for this assignment</li>
        </ul>
        <p className="scope-note" role="note" style={{ margin: 0 }}>Anyone with the handler link can view this assignment and submit practice videos and notes. They cannot edit instructions or change progress. The management key stays only in this browser; keep it to update or revoke the link.</p>
        <p className="hint" style={{ margin: 0 }}>Later edits are not sent automatically. Use Update shared assignment to send them.</p>
      </div>
      <div className="actions-row">
        <button type="button" className="btn" disabled={busy} onClick={() => void sync()} data-testid="button-sync-share"><UploadCloud size={16} /> {active ? 'Update shared assignment' : 'Create handler link'}</button>
      </div>
      {progress && <p className="hint" role="status">{progress}</p>}
      {error && <p className="error-text" role="alert" style={{ marginTop: 10 }}>{error}</p>}
      {active && <div className="share-live" style={{ marginTop: 14 }} data-testid="panel-share-live">
        <b>Handler link is active</b>
        <div className="actions-row" style={{ marginTop: 0 }}>
          <button type="button" className="btn btn-small" disabled={busy} onClick={() => void copy()} data-testid="button-copy-link"><Copy size={15} /> Copy link</button>
          <a className="btn btn-quiet btn-small" href={url} target="_blank" rel="noopener noreferrer" data-testid="link-open-handler"><ExternalLink size={15} /> Open handler view</a>
          <button type="button" className="btn btn-quiet btn-small" disabled={busy} onClick={() => void pull()} data-testid="button-refresh-submissions"><RefreshCw size={15} /> Refresh submissions</button>
          <button type="button" className="btn btn-quiet btn-small" disabled={busy} onClick={() => void revoke()} data-testid="button-revoke-link" style={{ color: '#b3261e' }}><Trash2 size={15} /> Revoke link</button>
        </div>
        {showField && <div className="copy-row"><input ref={fieldRef} readOnly value={url} aria-label="Handler link" onFocus={e => e.currentTarget.select()} /></div>}
      </div>}
      {status && <p className="hint" role="status" style={{ marginTop: 10 }}>{status}</p>}
    </Modal>}
  </>;
}
