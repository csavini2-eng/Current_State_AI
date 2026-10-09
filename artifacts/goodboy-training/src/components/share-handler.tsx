import { type FormEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { useAuth } from '@clerk/react';
import { useQueryClient } from '@tanstack/react-query';
import { Copy, Share2, Trash2 } from 'lucide-react';
import { useCreateHandlerShare, useRevokeHandlerShare, useGetHandlerShares, getGetHandlerSharesQueryKey, type HandlerShare } from '@workspace/api-client-react';
import { useWorkspace } from '@/lib/workspace';
import type { DogAssignment, DogProfile } from '@/lib/training';
import { Modal, basePath } from './shared';

export function ShareHandlerButton({ dog, assignment, pathName, small }: { dog: DogProfile; assignment: DogAssignment; pathName: string; small?: boolean }) {
  const { state, save, isSaving, isUploading, isSignedIn, notify } = useWorkspace();
  const create = useCreateHandlerShare({ request: { credentials: 'include' } });
  const revoke = useRevokeHandlerShare({ request: { credentials: 'include' } });
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(dog.handlerName);
  const [shareId, setShareId] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const { userId } = useAuth();
  const cache = useQueryClient();
  const shareKey = [...getGetHandlerSharesQueryKey(), userId];
  const shares = useGetHandlerShares({ query: { enabled: isSignedIn && open, queryKey: shareKey, retry: false }, request: { credentials: 'include' } });
  useEffect(() => {
    if (open && shares.data) setShareId(shares.data.find(s => s.assignmentId === assignment.id)?.id || '');
  }, [shares.data, assignment.id, open]);
  const linkRef = useRef<HTMLInputElement>(null);
  const link = shareId ? `${window.location.origin}${basePath}/handler/${shareId}` : '';
  const names = Array.from(new Set(state.dogs.map((d) => d.handlerName).filter(Boolean)));
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const handler = name.trim();
    if (!handler) { setErr('Enter or choose the handler’s name.'); return; }
    setErr(''); setBusy(true);
    try {
      const ok = await save({ ...state, dogs: state.dogs.map((d) => d.id === dog.id ? { ...d, handlerName: handler } : d) });
      if (!ok) return;
      const share = await create.mutateAsync({ data: { assignmentId: assignment.id, handlerName: handler } });
      cache.setQueryData<HandlerShare[]>(shareKey, previous => [...(previous || []).filter(s => s.assignmentId !== assignment.id), share]);
      setShareId(share.id);
    } catch { setErr('The link could not be created. Please try again.'); } finally { setBusy(false); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(link); notify('Link copied.'); }
    catch { linkRef.current?.focus(); linkRef.current?.select(); setErr('Copy is unavailable here. The link is selected, press Ctrl+C.'); }
  };
  const stop = async () => {
    if (!window.confirm('Revoke this link? The handler will immediately lose access.')) return;
    setBusy(true);
    try {
      await revoke.mutateAsync({ id: shareId });
      cache.setQueryData<HandlerShare[]>(shareKey, previous => (previous || []).filter(s => s.id !== shareId));
      setShareId(''); notify('Link revoked.');
    } catch { setErr('The link could not be revoked. Try again.'); } finally { setBusy(false); }
  };
  return <>
    <button className={`btn btn-soft ${small ? 'btn-small' : ''}`} onClick={() => { setName(dog.handlerName); setErr(''); setOpen(true); }}><Share2 size={15} /> Share With Handler</button>
    {open && <Modal title="Share with handler" onClose={() => setOpen(false)}>
      {!isSignedIn ? <>
        <p className="hint">Sign in to share. Shared guides are live links, so they need your private saved workspace.</p>
        <div className="form-actions"><Link href="/sign-in" className="btn">Sign in</Link></div>
      </> : <form onSubmit={submit}>
        <p className="hint">{dog.name} · {pathName}. Anyone with the link can view this one path, live and read only. Handlers cannot change anything. You can revoke the link at any time.</p>
        {shares.isFetching && <p className="hint" role="status">Checking existing links…</p>}
        {shares.isError && <p className="error-text" role="alert">Existing links could not be loaded. <button type="button" className="btn btn-quiet btn-small" onClick={() => void shares.refetch()}>Try again</button></p>}
        <div className="field"><label htmlFor="handler-name">Handler name</label>
          <input id="handler-name" list="handler-names" value={name} onChange={(e) => setName(e.target.value)} placeholder="Who will practice with this dog?" />
          <datalist id="handler-names">{names.map((n) => <option key={n} value={n} />)}</datalist></div>
        {link && <div><div className="copy-row"><input ref={linkRef} readOnly value={link} aria-label="Handler link" onFocus={(e) => e.currentTarget.select()} /><button type="button" className="btn btn-small" onClick={() => void copy()}><Copy size={15} /> Copy</button></div>
          <a className="hint" href={link} target="_blank" rel="noreferrer">Open the handler guide</a></div>}
        {err && <p className="error-text" role="alert">{err}</p>}
        <div className="form-actions">
          {link && <button type="button" className="btn btn-quiet" disabled={busy || shares.isFetching} onClick={() => void stop()}><Trash2 size={15} /> Revoke link</button>}
          <button className="btn" type="submit" disabled={busy || isSaving || isUploading || shares.isFetching || shares.isError}>{busy ? 'Working…' : link ? 'Update handler' : 'Create link'}</button>
        </div>
      </form>}
    </Modal>}
  </>;
}
