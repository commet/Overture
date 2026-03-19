import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Get the current user ID from the active session.
 * Returns null if the user is not authenticated.
 */
export async function getCurrentUserId(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
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
