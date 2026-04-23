/**
 * Single source of truth for LLM proxy rate limits.
 *
 * Keep these in sync with the Supabase rate_limit RPCs if you change them
 * (but the RPC takes `p_limit` as a param, so we don't hardcode on the DB side).
 */

/** Daily limit for signed-in users (per user). */
export const DAILY_LIMIT = 20;

/** Daily limit for anonymous visitors (per hashed IP). */
export const ANON_LIMIT = 12;
