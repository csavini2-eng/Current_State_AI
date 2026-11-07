import { useEffect, useState } from 'react';
import { readGuestMedia } from '@/lib/guest-sharing';
import { LOCAL_VIDEO_PREFIX, readLocalVideo } from '@/lib/local-videos';
import { mediaUrl } from '@/lib/training';

export const SHARED_VIDEO_PREFIX = 'shared-video:';
type Load = 'loading' | 'ready' | 'missing' | 'denied' | 'expired' | 'unplayable';

/** Plays local, shared (capability-authorized) or legacy media. Object URLs are always revoked on change/unmount. */
export function AuthorizedVideo({ value, token, label }: { value: string; token?: string; label: string }) {
  const [src, setSrc] = useState('');
  const [load, setLoad] = useState<Load>('loading');
  useEffect(() => {
    let alive = true; let created = '';
    setSrc(''); setLoad('loading');
    const fromBlob = (b: Blob | null | undefined) => {
      if (!alive) return;
      if (!b) { setLoad('missing'); return; }
      created = URL.createObjectURL(b); setSrc(created); setLoad('ready');
    };
    if (value.startsWith(SHARED_VIDEO_PREFIX)) readGuestMedia(value, token).then(fromBlob).catch(() => { if (alive) setLoad('denied'); });
    else if (value.startsWith(LOCAL_VIDEO_PREFIX)) {
      if (token) setLoad('missing');
      else readLocalVideo(value).then(r => fromBlob(r?.file)).catch(() => { if (alive) setLoad('missing'); });
    } else if (value.startsWith('blob:')) setLoad('expired');
    else if (token) setLoad('denied');
    else { setSrc(mediaUrl(value)); setLoad('ready'); }
    return () => { alive = false; if (created) URL.revokeObjectURL(created); };
  }, [value, token]);
  if (load === 'loading') return <div className="video-skeleton" aria-busy="true" aria-label={`Loading ${label}`} />;
  if (load === 'ready' && src) return <video controls preload="metadata" playsInline src={src} aria-label={label} onError={() => setLoad('unplayable')} />;
  const msg = load === 'missing' ? 'This video is not available on this device.'
    : load === 'denied' ? 'This shared video is unavailable. The link may have been revoked.'
    : load === 'expired' ? 'This older video link has expired and can no longer play.'
    : 'This browser cannot play the video format.';
  return <p className="video-msg">{msg}</p>;
}
