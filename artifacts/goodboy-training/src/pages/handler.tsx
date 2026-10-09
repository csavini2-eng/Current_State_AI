import { useParams } from 'wouter';
import { CircleDot, Lock, PawPrint, RefreshCw } from 'lucide-react';
import { getGetHandlerPathQueryKey, useGetHandlerPath } from '@workspace/api-client-react';
import { ageLabel, mediaUrl, statusLabel } from '@/lib/training';
import raya from '../assets/raya-sample.jpg';
import { StatusPill } from '@/components/shared';

export default function HandlerPage() {
  const { id = '' } = useParams<{ id: string }>();
  const q = useGetHandlerPath(id, { query: { refetchInterval: 15000, retry: false, queryKey: getGetHandlerPathQueryKey(id) } });
  const data = q.data;
  const status = (q.error as { status?: number } | null)?.status;
  const brand = <div className="brand" style={{ pointerEvents: 'none' }}><span className="brand-symbol"><PawPrint size={20} /></span><span className="brand-name">GoodBoy</span></div>;
  if (!data && q.isLoading) return <div className="handler-page" aria-busy="true">{brand}<div className="skeleton" style={{ marginTop: 20 }} /><div className="skeleton" /></div>;
  if (!data || status === 404 || status === 410 || status === 403) return <div className="handler-page">{brand}<div className="empty-state" style={{ marginTop: 24 }}>
    <Lock size={30} />
    <h2>{status === 404 || status === 410 || status === 403 ? 'This guide is no longer available' : 'We could not load this guide'}</h2>
    <p>{status === 404 || status === 410 || status === 403 ? 'The trainer may have turned this link off. Ask them for a new one.' : 'Check your connection and try again.'}</p>
    {!(status === 404 || status === 410 || status === 403) && <button className="btn" onClick={() => void q.refetch()}><RefreshCw size={16} /> Try again</button>}
  </div></div>;
  const photo = data.dog.photo ? mediaUrl(data.dog.photo, id) : data.dog.id === 'raya' ? raya : '';
  return <div className="handler-page">
    <div className="handler-bar">{brand}<span className="live-pill" role="status"><CircleDot size={14} /> Live, read only{q.isError ? ' (reconnecting)' : ''}</span></div>
    <section className="card handler-hero">
      <div className="avatar">{photo ? <img src={photo} alt={`${data.dog.name} portrait`} /> : <PawPrint size={44} />}</div>
      <div><span className="eyebrow">Handler guide{data.handlerName ? ` for ${data.handlerName}` : ''}</span><h1 style={{ margin: '4px 0' }}>{data.dog.name}</h1>
        <p className="hint" style={{ margin: 0 }}>{[data.dog.breed, ageLabel(data.dog.birthDate)].filter(Boolean).join(' · ')}</p>
        <h2 style={{ margin: '10px 0 0', fontSize: 22 }}>{data.pathName}</h2>{data.pathDescription && <p className="hint">{data.pathDescription}</p>}
        <p className="hint" style={{ margin: 0 }}>Approved by the trainer. Updated {new Date(data.updatedAt).toLocaleString()}. This page refreshes on its own.</p></div>
    </section>
    {data.milestones.length === 0 && <div className="empty-state" style={{ marginTop: 18 }}><h2>No skills yet</h2><p>The trainer has not added skills to this path.</p></div>}
    {data.milestones.map((m, i) => <article className="card guide-step" key={`${m.id}-${i}`}>
      <div className="path-head"><span className="eyebrow">Step {i + 1}</span><StatusPill status={m.status} /><span className="sr-only" style={{ position: 'absolute', left: -9999 }}>{statusLabel[m.status]}</span></div>
      <h2>{m.name}</h2>{m.description && <p className="hint">{m.description}</p>}
      <div className="kv"><b>Verbal command</b>{m.command}</div>
      {m.handSignal && <div className="kv"><b>Hand signal</b>{m.handSignal}</div>}
      <div className="kv"><b>Instructions</b>{m.instructions}</div>
      {m.videoPath && <video controls preload="metadata" src={mediaUrl(m.videoPath, id)} aria-label={`${m.name} demonstration`} />}
    </article>)}
  </div>;
}
