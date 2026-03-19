import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Get the current user ID by verifying the JWT with Supabase.
 * Uses getUser() which validates the token server-side,
 * unlike getSession() which only reads from local storage.
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user.id;
  } catch {
    return null;
  }
}

/**
 * Helper for safe DB operations with user context.
 */
export async function withUser<T>(fn: (userId: string) => Promise<T>): Promise<T | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  return fn(userId);
}
