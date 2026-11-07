// Only opaque references go into the workspace JSON. Video bytes stay in IndexedDB.
export const LOCAL_VIDEO_PREFIX = 'local-video:';
const DATABASE = 'goodboy-local-videos';
const STORE = 'videos';
type VideoRecord = { id: string; file: Blob; name: string };

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) { reject(new Error('This browser does not support local video storage.')); return; }
    let settled = false;
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onblocked = () => {
      settled = true;
      reject(new Error('Another tab is blocking video storage. Close other GoodBoy tabs and try again.'));
    };
    request.onerror = () => { settled = true; reject(request.error || new Error('Local video storage could not be opened.')); };
    request.onsuccess = () => {
      if (settled) request.result.close();
      else { settled = true; resolve(request.result); }
    };
  });
}
export async function saveLocalVideo(file: File): Promise<string> {
  const id = crypto.randomUUID();
  const database = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).add({ id, file, name: file.name } satisfies VideoRecord);
      // A request success is not a saved video: wait until the transaction commits.
      transaction.oncomplete = () => resolve();
      transaction.onabort = () => reject(transaction.error || new Error('The browser did not save the video. Storage may be full.'));
      transaction.onerror = () => reject(transaction.error || new Error('The browser could not save the video.'));
    });
    return `${LOCAL_VIDEO_PREFIX}${id}`;
  } finally { database.close(); }
}
export async function readLocalVideo(reference: string): Promise<VideoRecord | null> {
  if (!reference.startsWith(LOCAL_VIDEO_PREFIX)) throw new Error('Invalid local video reference.');
  const database = await openDatabase();
  try {
    return await new Promise<VideoRecord | null>((resolve, reject) => {
      const transaction = database.transaction(STORE, 'readonly');
      const request = transaction.objectStore(STORE).get(reference.slice(LOCAL_VIDEO_PREFIX.length));
      let record: VideoRecord | null = null;
      request.onsuccess = () => { record = request.result || null; };
      transaction.oncomplete = () => resolve(record);
      transaction.onabort = () => reject(transaction.error || new Error('Local video storage could not be read.'));
      transaction.onerror = () => reject(transaction.error || new Error('Local video storage could not be read.'));
    });
  } finally { database.close(); }
}
