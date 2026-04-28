/**
 * Single source of truth for LLM proxy rate limits.
 *
 * Keep these in sync with the Supabase rate_limit RPCs if you change them
 * (but the RPC takes `p_limit` as a param, so we don't hardcode on the DB side).
 */

/**
 * Daily limit for signed-in users (per user).
 * Sized so a logged-in user can comfortably run multiple Boss sessions
 * (~6–9 LLM calls each) plus workspace exploration in one day.
 */
export const DAILY_LIMIT = 50;

/**
 * Daily limit for anonymous visitors (per hashed IP).
 * Sized for ~2–3 Boss sessions before the LOGIN_REQUIRED nudge fires —
 * generous enough that a viral share visitor experiences full value
 * before being asked to sign up.
 */
export const ANON_LIMIT = 30;
