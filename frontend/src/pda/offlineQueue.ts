import { api } from '../lib/api';

const DB_NAME = 'wms-pda-outbox';
const STORE = 'requests';

export interface QueuedRequest {
  id?: number;
  method: 'post' | 'patch' | 'put';
  url: string;
  body: unknown;
  label: string;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * PDA scan confirmations (put-away, pick) are queued here first and synced
 * against the API when the connection is up — a dead zone on the floor
 * shouldn't stop an operator from continuing to scan. Read-only lookups
 * (product/location scan) go through the service worker's NetworkFirst
 * cache instead (see vite.config.ts); this queue is only for writes.
 */
export async function enqueue(request: Omit<QueuedRequest, 'id' | 'createdAt'>) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add({ ...request, createdAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function listQueued(): Promise<QueuedRequest[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueuedRequest[]);
    req.onerror = () => reject(req.error);
  });
}

async function remove(id: number) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Try the request live; if the network is down (or the request fails
 * because of it), fall back to the outbox instead of losing the scan.
 */
export async function submitOrQueue(request: Omit<QueuedRequest, 'id' | 'createdAt'>): Promise<'submitted' | 'queued'> {
  if (navigator.onLine) {
    try {
      await api[request.method](request.url, request.body);
      return 'submitted';
    } catch (err) {
      if (!navigator.onLine) {
        await enqueue(request);
        return 'queued';
      }
      throw err;
    }
  }
  await enqueue(request);
  return 'queued';
}

export async function syncQueue(onProgress?: (remaining: number) => void): Promise<number> {
  if (!navigator.onLine) return 0;
  const items = await listQueued();
  let synced = 0;
  for (const item of items) {
    try {
      await api[item.method](item.url, item.body);
      if (item.id !== undefined) await remove(item.id);
      synced++;
      onProgress?.(items.length - synced);
    } catch {
      break; // stop at the first failure, keep the rest queued for next attempt
    }
  }
  return synced;
}
