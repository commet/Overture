import { getStorage, setStorage } from '@/lib/storage';
import { generateId } from '@/lib/uuid';
import { upsertToSupabase, softDeleteFromSupabase, loadAndMerge } from '@/lib/db';

/**
 * Shared store helpers.
 *
 * Each store keeps its own state shape and key names, but delegates
 * the common load/update/delete/add logic to these functions.
 * This eliminates ~200 lines of duplicated CRUD boilerplate.
 */

type Timestamped = { id: string; created_at: string; updated_at: string };

type TableName = 'projects' | 'reframe_items' | 'recast_items' | 'synthesize_items';

/** Load from localStorage immediately, then merge with Supabase in background. */
export function loadItems<T extends Timestamped>(
  storageKey: string,
  tableName: TableName,
  getItems: () => T[],
  setItems: (items: T[]) => void,
): void {
  const local = getStorage<T[]>(storageKey, []);
  setItems(local);
  loadAndMerge<T>(tableName, storageKey).then((merged) => {
    const current = getItems();
    const newLocal = current.filter((c) => !merged.find((m) => m.id === c.id));
    setItems([...merged, ...newLocal]);
  });
}

/** Add a new item, persist to localStorage + Supabase, return its id. */
export function addNewItem<T extends Timestamped>(
  storageKey: string,
  tableName: TableName,
  getItems: () => T[],
  setItemsAndId: (items: T[], id: string) => void,
  newItem: T,
): string {
  const items = [...getItems(), newItem];
  setItemsAndId(items, newItem.id);
  setStorage(storageKey, items);
  upsertToSupabase(tableName, newItem);
  return newItem.id;
}

/** Update an existing item by id with partial data. */
export function updateItem<T extends Timestamped>(
  storageKey: string,
  tableName: TableName,
  getItems: () => T[],
  setItems: (items: T[]) => void,
  id: string,
  data: Partial<T>,
): void {
  // Strip immutable fields to prevent local/remote divergence
  const { id: _id, created_at: _ca, ...safeData } = data as Record<string, unknown>;
  const items = getItems().map((item) =>
    item.id === id ? { ...item, ...safeData, updated_at: new Date().toISOString() } : item,
  );
  setItems(items);
  setStorage(storageKey, items);
  const updated = items.find((i) => i.id === id);
  if (updated) upsertToSupabase(tableName, updated);
}

/** Delete an item by id (soft delete in Supabase). */
export function deleteItem<T extends Timestamped>(
  storageKey: string,
  tableName: TableName,
  getItems: () => T[],
  setItems: (items: T[]) => void,
  getCurrentId: () => string | null,
  setCurrentId: (id: string | null) => void,
  id: string,
): void {
  const items = getItems().filter((item) => item.id !== id);
  setItems(items);
  if (getCurrentId() === id) setCurrentId(null);
  setStorage(storageKey, items);
  softDeleteFromSupabase(tableName, id);
}

/** Add an item if it doesn't already exist. */
export function addItemIfNew<T extends Timestamped>(
  storageKey: string,
  tableName: TableName,
  getItems: () => T[],
  setItemsAndId: (items: T[], id: string) => void,
  item: T,
): void {
  if (getItems().some((i) => i.id === item.id)) return;
  const items = [...getItems(), item];
  setItemsAndId(items, item.id);
  setStorage(storageKey, items);
  upsertToSupabase(tableName, item);
}

/** Update a nested field on an item (steps, iterations, refs). */
export function updateNestedField<T extends Timestamped>(
  storageKey: string,
  tableName: TableName,
  getItems: () => T[],
  setItems: (items: T[]) => void,
  id: string,
  updater: (item: T) => T,
): void {
  const original = getItems().find((item) => item.id === id);
  if (!original) return;
  const changed = updater(original);
  // Skip write if updater returned same reference (no-op)
  if (changed === original) return;
  const items = getItems().map((item) =>
    item.id === id ? { ...changed, updated_at: new Date().toISOString() } : item,
  );
  setItems(items);
  setStorage(storageKey, items);
  const updated = items.find((i) => i.id === id);
  if (updated) upsertToSupabase(tableName, updated);
}

export { generateId };
