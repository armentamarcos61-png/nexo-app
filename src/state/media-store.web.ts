export type StoredVideoRef = {
  id: string;
  name: string;
  type: string;
  duration: number;
};

const DB_NAME = 'nexo-media';
const STORE_NAME = 'videos';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error ?? new Error('No se pudo abrir el almacenamiento de videos.'));
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
  });
}

export async function saveVideoBlob(id: string, blob: Blob) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(blob, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('No se pudo guardar el video.'));
    tx.onabort = () => reject(tx.error ?? new Error('No se pudo guardar el video.'));
  });
  db.close();
}

export async function getVideoBlob(id: string) {
  const db = await openDb();
  const blob = await new Promise<Blob | null>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(id);
    request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : null);
    request.onerror = () => reject(request.error ?? new Error('No se pudo abrir el video.'));
  });
  db.close();
  return blob;
}

export async function deleteVideoBlob(id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('No se pudo eliminar el video.'));
    tx.onabort = () => reject(tx.error ?? new Error('No se pudo eliminar el video.'));
  });
  db.close();
}
