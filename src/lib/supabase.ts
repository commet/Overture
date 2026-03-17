import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Get the current user ID. Returns null if not authenticated.
 * For now, we use anonymous sessions. Later can add proper auth.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user?.id) return session.user.id;

  // Auto-create anonymous session if none exists
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) return null;
  return data.user.id;
}

/**
 * Helper for safe DB operations with user context.
 */
export async function withUser<T>(fn: (userId: string) => Promise<T>): Promise<T | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  return fn(userId);
}
