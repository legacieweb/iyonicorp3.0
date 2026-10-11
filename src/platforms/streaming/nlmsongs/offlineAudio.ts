import type { Track } from './types';

const DB_NAME = 'nlm-songs-offline';
const AUDIO_STORE = 'tracks';
const CATALOG_STORE = 'catalog';
const DB_VERSION = 2;

export interface OfflineAudioRecord {
  id: string;
  blob: Blob;
  title: string;
  savedAt: number;
  track?: Track;
}

const openDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  if (!('indexedDB' in window)) {
    reject(new Error('Offline storage is not available in this browser.'));
    return;
  }
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(AUDIO_STORE)) database.createObjectStore(AUDIO_STORE, { keyPath: 'id' });
    if (!database.objectStoreNames.contains(CATALOG_STORE)) database.createObjectStore(CATALOG_STORE, { keyPath: 'id' });
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error('Could not open offline storage.'));
});

export const readOfflineAudio = async (id: string): Promise<OfflineAudioRecord | null> => {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(AUDIO_STORE, 'readonly');
    const request = transaction.objectStore(AUDIO_STORE).get(id);
    request.onsuccess = () => resolve((request.result as OfflineAudioRecord | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error('Could not read the offline track.'));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => database.close();
    transaction.onabort = () => database.close();
  });
};

export const readAllOfflineAudio = async (): Promise<OfflineAudioRecord[]> => {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(AUDIO_STORE, 'readonly');
    const request = transaction.objectStore(AUDIO_STORE).getAll();
    request.onsuccess = () => resolve((request.result as OfflineAudioRecord[]).sort((a, b) => b.savedAt - a.savedAt));
    request.onerror = () => reject(request.error ?? new Error('Could not load saved tracks.'));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => database.close();
    transaction.onabort = () => database.close();
  });
};

export const deleteOfflineAudio = async (id: string): Promise<void> => {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(AUDIO_STORE, 'readwrite');
    transaction.objectStore(AUDIO_STORE).delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not remove the saved track.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Could not remove the saved track.'));
  }).finally(() => database.close());
};

export const storeOfflineAudio = async (id: string, title: string, blob: Blob, track?: Track): Promise<void> => {
  if (!blob.size) throw new Error('The audio service returned an empty track.');
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(AUDIO_STORE, 'readwrite');
    transaction.objectStore(AUDIO_STORE).put({ id, blob, title, savedAt: Date.now(), ...(track ? { track } : {}) } satisfies OfflineAudioRecord);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not save this track for offline listening.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Could not save this track for offline listening.'));
  }).finally(() => database.close());
};

export const storeOfflineCatalog = async (tracks: Track[]): Promise<void> => {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(CATALOG_STORE, 'readwrite');
    const store = transaction.objectStore(CATALOG_STORE);
    store.clear();
    tracks.forEach((track) => store.put(track));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error('Could not update the saved catalogue.'));
    transaction.onabort = () => reject(transaction.error ?? new Error('Could not update the saved catalogue.'));
  }).finally(() => database.close());
};

export const readOfflineCatalog = async (): Promise<Track[]> => {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(CATALOG_STORE, 'readonly');
    const request = transaction.objectStore(CATALOG_STORE).getAll();
    request.onsuccess = () => resolve(request.result as Track[]);
    request.onerror = () => reject(request.error ?? new Error('Could not read the saved catalogue.'));
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => database.close();
    transaction.onabort = () => database.close();
  });
};

export const supportsOfflineAudio = () => typeof window !== 'undefined' && 'indexedDB' in window;
