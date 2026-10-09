import { createContext, Fragment, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { useAuth } from '@clerk/react';
import { useQueryClient } from '@tanstack/react-query';
import { useGetTrainingWorkspace, useSaveTrainingWorkspace, requestUploadUrl, confirmUpload, type UploadInput, type TrainingWorkspace } from '@workspace/api-client-react';
import { loadPrototype, seedWorkspace } from './training';

async function prepareImage(file: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext('2d');
  if (!context) { bitmap.close(); throw new Error('This photograph could not be prepared. Try another file.'); }
  context.fillStyle = '#fff6ee'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('This photograph could not be prepared.')), 'image/jpeg', 0.82));
}
async function permanentUpload(file: Blob, name: string): Promise<string> {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'];
  if (!allowed.includes(file.type)) throw new Error('Use JPG, PNG, WebP, MP4, WebM, or MOV files.');
  if (file.size > 50 * 1024 * 1024) throw new Error('Choose a file smaller than 50 MB.');
  const ticket = await requestUploadUrl({ name, size: file.size, contentType: file.type as UploadInput['contentType'] }, { credentials: 'include' });
  const response = await fetch(ticket.uploadURL, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
  if (!response.ok) throw new Error('The upload failed. Try again before saving.');
  return (await confirmUpload({ objectPath: ticket.objectPath }, { credentials: 'include' })).objectPath;
}
type WorkspaceContextValue = {
  state: TrainingWorkspace; isLoading: boolean; isSaving: boolean; isUploading: boolean;
  isSignedIn: boolean; error: string; message: string;
  setError: (error: string) => void; notify: (message: string) => void;
  save: (state: TrainingWorkspace) => Promise<boolean>;
  upload: (file: File) => Promise<string>;
  refresh: () => Promise<void>;
};
const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [state, setState] = useState<TrainingWorkspace>(seedWorkspace);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSaving, setSaving] = useState(false);
  const [isUploading, setUploading] = useState(false);
  const busy = useRef(false);
  const revision = useRef(0);
  const identity = useRef<string | null | undefined>(undefined);
  const currentUser = useRef(userId); currentUser.current = userId;
  const cache = useQueryClient();
  const queryKey = ['training-workspace', userId || 'anonymous'];
  const query = useGetTrainingWorkspace({
    query: { enabled: Boolean(isLoaded && isSignedIn), queryKey, retry: false, refetchOnWindowFocus: false },
    request: { credentials: 'include' },
  });
  const mutation = useSaveTrainingWorkspace();
  useEffect(() => {
    if (!isLoaded || identity.current === userId) return;
    if (identity.current) cache.removeQueries({ queryKey: ['training-workspace', identity.current] });
    identity.current = userId; revision.current = 0; setError('');
    try { setState(loadPrototype()); } catch (error) { setError(error instanceof Error ? error.message : 'Browser storage is unavailable.'); setState(seedWorkspace()); }
  }, [isLoaded, userId, cache]);
  useEffect(() => {
    if (!isSignedIn || !query.data) return;
    revision.current = query.data.revision;
    if (query.data.state) setState(query.data.state);
  }, [isSignedIn, query.data, userId]);
  useEffect(() => {
    if (query.error) setError('Your saved workspace could not be loaded. Retry before making changes.');
  }, [query.error]);
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(''), 4000);
    return () => window.clearTimeout(timer);
  }, [message]);
  const save = async (nextState: TrainingWorkspace): Promise<boolean> => {
    if (!isLoaded || (isSignedIn && (!query.data || query.error))) { setError('Wait for your saved records to load, or retry loading them.'); return false; }
    if (busy.current) { setError('Another save is in progress. Please try again when it finishes.'); return false; }
    busy.current = true; setSaving(true); setError('');
    const savingUser = userId;
    try {
      const next = structuredClone(nextState);
      if (isSignedIn) {
        // Move imported local photographs into App Storage, never database blobs.
        for (const dog of next.dogs) if (dog.photo.startsWith('data:image/')) {
          const blob = await (await fetch(dog.photo)).blob();
          dog.photo = await permanentUpload(await prepareImage(blob), `${dog.name}.jpg`);
        }
        const response = await mutation.mutateAsync({ data: { state: next, revision: revision.current } });
        if (currentUser.current !== savingUser) return false;
        if (!response.state) throw new Error('The server did not confirm your saved records. Please retry.');
        revision.current = response.revision;
        cache.setQueryData(queryKey, response);
        setState(response.state);
      } else {
        localStorage.setItem('goodboy-prototype-v2', JSON.stringify(next));
        setState(next);
      }
      return true;
    } catch (error) {
      const status = error && typeof error === 'object' && 'status' in error ? error.status : null;
      setError(status === 409 ? 'Another tab saved newer records. Reload saved records, then try your changes again.' : error instanceof Error ? error.message : 'Your changes could not be saved. Please try again.');
      return false;
    } finally { busy.current = false; setSaving(false); }
  };
  const upload = async (file: File): Promise<string> => {
    setUploading(true); setError('');
    try {
      if (file.size > 50 * 1024 * 1024) throw new Error('Choose a file smaller than 50 MB.');
      const prepared = file.type.startsWith('image/') ? await prepareImage(file) : file;
      if (!isSignedIn) {
        if (!prepared.type.startsWith('image/')) throw new Error('Sign in to upload persistent videos and share them with handlers.');
        return await new Promise<string>((resolve, reject) => {
          const reader = new FileReader(); reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('Could not read this photograph.'));
          reader.readAsDataURL(prepared);
        });
      }
      return await permanentUpload(prepared, file.name);
    } catch (error) { const message = error instanceof Error ? error.message : 'Upload failed.'; setError(message); throw new Error(message); }
    finally { setUploading(false); }
  };
  const refresh = async () => {
    setError('');
    if (isSignedIn) { await query.refetch(); }
    else { try { setState(loadPrototype()); } catch (error) { setError(error instanceof Error ? error.message : 'Could not load saved records.'); } }
  };
  return <WorkspaceContext.Provider value={{ state, error, message, setError, notify: setMessage, save, upload, refresh, isSaving, isUploading, isSignedIn: Boolean(isSignedIn), isLoading: !isLoaded || identity.current !== userId || Boolean(isSignedIn && query.isLoading) }}><Fragment key={userId || 'anonymous'}>{children}</Fragment></WorkspaceContext.Provider>;
}
export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('WorkspaceProvider is missing.');
  return context;
}
