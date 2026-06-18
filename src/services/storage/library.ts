// library.ts — IndexedDB store for up to 100 saved documents.
// Stores the full document, history, answers, and metadata so the user can
// resume an interview from any answered question.
import type { SavedDocument } from "../../types.ts";

const DB_NAME = "architectly";
const DB_VERSION = 1;
const STORE = "documents";
const MAX_DOCS = 100;

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (): void => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("by_updated", "updatedAt");
        store.createIndex("by_title", "title");
      }
    };
    req.onsuccess = (): void => resolve(req.result);
    req.onerror = (): void => reject(req.error ?? new Error("IndexedDB open failed"));
  });
  return dbPromise;
}

async function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const store = transaction.objectStore(STORE);
    const req = fn(store);
    req.onsuccess = (): void => resolve(req.result);
    req.onerror = (): void => reject(req.error ?? new Error("IndexedDB request failed"));
  });
}

export function newId(): string {
  return `doc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function listAll(): Promise<SavedDocument[]> {
  const all = await tx<SavedDocument[]>("readonly", (s) => s.getAll() as IDBRequest<SavedDocument[]>);
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getById(id: string): Promise<SavedDocument | null> {
  const item = await tx<SavedDocument | undefined>("readonly", (s) => s.get(id) as IDBRequest<SavedDocument | undefined>);
  return item ?? null;
}

export async function upsert(doc: SavedDocument): Promise<void> {
  await tx<IDBValidKey>("readwrite", (s) => s.put(doc));
  await enforceLimit();
}

export async function remove(id: string): Promise<void> {
  await tx<undefined>("readwrite", (s) => s.delete(id) as IDBRequest<undefined>);
}

export async function rename(id: string, newTitle: string): Promise<void> {
  const item = await getById(id);
  if (!item) return;
  await upsert({ ...item, title: newTitle, updatedAt: new Date().toISOString() });
}

async function enforceLimit(): Promise<void> {
  const all = await listAll();
  if (all.length <= MAX_DOCS) return;
  const overflow = all.slice(MAX_DOCS);
  for (const doc of overflow) await remove(doc.id);
}

export function searchLocal(items: SavedDocument[], q: string): SavedDocument[] {
  const needle = q.trim().toLocaleLowerCase();
  if (!needle) return items;
  return items.filter(
    (d) =>
      d.title.toLocaleLowerCase().includes(needle) ||
      d.docType.toLocaleLowerCase().includes(needle) ||
      d.document.toLocaleLowerCase().includes(needle),
  );
}
