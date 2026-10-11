const DB_NAME = 'nlm-songs-offline';
const STORE_NAME = 'tracks';
const DB_VERSION = 1;

export interface OfflineAudioRecord {
  id: string;
  blob: Blob;
  title: string;
  savedAt: number;
}

const openDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  if (!('indexedDB' in window)) {
    reject(new Error('Offline storage is not available in this browser.'));
    return;
  }
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME, { keyPath: 'id' });
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error('Could not open offline storage.'));
});

export const readOfflineAudio = async (id: string): Promise<OfflineAudioRecord | null> => {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve((request.result as OfflineAudioRecord | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error('Could not read the offline track.'));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => database.close();
    transaction.onabort = () => database.close();
  });
};

export const storeOfflineAudio = async (
  id: string,
  title: string,
  blob: Blob,
): Promise<void> => {
  if (!blob.size) throw new Error('The audio service returned an empty track.');
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put({ id, blob, title, savedAt: Date.now() } satisfies OfflineAudioRecord);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save this track for offline listening.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Could not save this track for offline listening.'));
  }).finally(() => database.close());
};

export const supportsOfflineAudio = () => typeof window !== 'undefined' && 'indexedDB' in window;
