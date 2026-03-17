import { supabase, getCurrentUserId } from './supabase';

/**
 * Database abstraction layer.
 *
 * Strategy: "localStorage first, Supabase sync"
 * - Reads: localStorage (instant) → background Supabase sync
 * - Writes: localStorage (instant) + Supabase (async)
 * - This ensures the app works offline and feels instant,
 *   while data is durably stored in Supabase.
 */

type TableName = 'projects' | 'personas' | 'decompose_items' | 'orchestrate_items'
  | 'feedback_records' | 'judgment_records' | 'accuracy_ratings' | 'refinement_loops';

/**
 * Sync all items from a localStorage key to Supabase table.
 * Called on app init to push any offline-created data.
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

    // Upsert — insert or update on conflict
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

    if (error) {
      console.error(`[db] fetch from ${table} failed:`, error.message);
      return [];
    }

    return (data || []) as T[];
  } catch (err) {
    console.error(`[db] fetch from ${table} error:`, err);
    return [];
  }
}

/**
 * Upsert a single item to Supabase (async, fire-and-forget).
 */
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
  } catch (err) {
    console.error(`[db] upsert to ${table} error:`, err);
  }
}

/**
 * Delete an item from Supabase.
 */
export async function deleteFromSupabase(table: TableName, id: string): Promise<void> {
  const userId = await getCurrentUserId();
  if (!userId) return;

  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error(`[db] delete from ${table} failed:`, error.message);
    }
  } catch (err) {
    console.error(`[db] delete from ${table} error:`, err);
  }
}

/**
 * Insert a single item (no upsert). For append-only tables like judgments.
 */
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
  } catch (err) {
    console.error(`[db] insert to ${table} error:`, err);
  }
}
