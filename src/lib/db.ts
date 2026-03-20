import { supabase, getCurrentUserId } from './supabase';
import { getStorage, setStorage } from './storage';

/**
 * Database abstraction layer.
 *
 * Strategy: "localStorage first, Supabase merge"
 * - On load: localStorage (instant) → fetch Supabase → merge by updated_at
 * - On write: localStorage (instant) + Supabase (async)
 * - This ensures the app works offline AND syncs across devices.
 */

type TableName = 'projects' | 'personas' | 'decompose_items' | 'orchestrate_items'
  | 'feedback_records' | 'judgment_records' | 'accuracy_ratings' | 'refinement_loops';

// ─── Merge Logic ───

interface Timestamped {
  id: string;
  updated_at?: string;
  created_at?: string;
}

/**
 * Merge local and remote arrays by ID.
 * - Items only in local → keep (created offline)
 * - Items only in remote → keep (from another device)
 * - Items in both → pick the one with newer updated_at
 */
function mergeByTimestamp<T extends Timestamped>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>();

  for (const item of local) {
    map.set(item.id, item);
  }

  for (const item of remote) {
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, item);
    } else {
      const remoteTime = item.updated_at || item.created_at || '';
      const localTime = existing.updated_at || existing.created_at || '';
      if (remoteTime > localTime) {
        map.set(item.id, item);
      }
    }
  }

  return Array.from(map.values());
}

// ─── Core Operations ───

/**
 * Load + merge: localStorage first (instant), then merge with Supabase (async).
 * Returns merged data. Also saves merged result to both localStorage and Supabase.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadAndMerge<T extends Timestamped>(
  table: TableName,
  storageKey: string,
): Promise<T[]> {
  const local = getStorage<T[]>(storageKey, []);

  const userId = await getCurrentUserId();
  if (!userId) return local; // Not logged in — use local only

  try {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error || !data) return local;

    const remote = (data || []) as T[];
    const merged = mergeByTimestamp(local, remote);

    // Save merged back to localStorage
    setStorage(storageKey, merged);

    // Push any local-only items to Supabase
    const remoteIds = new Set(remote.map(r => r.id));
    const localOnly = merged.filter(m => !remoteIds.has(m.id));
    if (localOnly.length > 0) {
      await supabase
        .from(table)
        .upsert(localOnly.map(item => ({ ...item, user_id: userId })), { onConflict: 'id' })
        .then(({ error }) => { if (error) console.error(`[db] push local-only to ${table}:`, error.message); });
    }

    return merged;
  } catch {
    return local; // Network error — fall back to local
  }
}

/**
 * Sync all items from localStorage to Supabase table.
 * Called on write operations to push changes.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function syncToSupabase(table: TableName, localItems: any[]): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId || localItems.length === 0) return;

  try {
    const itemsWithUser = localItems.map((item) => ({
      ...item,
      user_id: userId,
    }));

    const { error } = await supabase
      .from(table)
      .upsert(itemsWithUser, { onConflict: 'id' });

    if (error) {
      console.error(`[db] sync to ${table} failed:`, error.message);
    }
  } catch (err) {
    console.error(`[db] sync to ${table} error:`, err);
  }
}

/**
 * Fetch all items for current user from Supabase.
 */
export async function fetchFromSupabase<T extends Record<string, unknown> | object>(
  table: TableName,
  orderBy: string = 'created_at'
): Promise<T[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  try {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .order(orderBy, { ascending: true });

    if (error) return [];
    return (data || []) as T[];
  } catch {
    return [];
  }
}

/**
 * Upsert a single item to Supabase (async, fire-and-forget).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function upsertToSupabase(table: TableName, item: any): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;

  try {
    const { error } = await supabase
      .from(table)
      .upsert({ ...item, user_id: userId }, { onConflict: 'id' });

    if (error) {
      console.error(`[db] upsert to ${table} failed:`, error.message);
    }
  } catch {}
}

/**
 * Delete an item from Supabase.
 */
export async function deleteFromSupabase(table: TableName, id: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;

  try {
    await supabase
      .from(table)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
  } catch {}
}

/**
 * Delete ALL user data from Supabase (for account reset).
 */
export async function deleteAllUserData(): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;

  const tables: TableName[] = [
    'accuracy_ratings', 'feedback_records', 'judgment_records',
    'refinement_loops', 'decompose_items', 'orchestrate_items',
    'personas', 'projects',
  ];

  for (const table of tables) {
    try {
      await supabase.from(table).delete().eq('user_id', userId);
    } catch {}
  }
}

/**
 * Insert a single item (no upsert). For append-only tables like judgments.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function insertToSupabase(table: TableName, item: any): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;

  try {
    const { error } = await supabase
      .from(table)
      .insert({ ...item, user_id: userId });

    if (error) {
      console.error(`[db] insert to ${table} failed:`, error.message);
    }
  } catch {}
}
