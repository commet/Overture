/**
 * Lightweight event tracking for Overture.
 *
 * - Fire-and-forget: never blocks UI
 * - Works for anonymous + logged-in users
 * - Session-based grouping via sessionStorage
 * - Silently fails if Supabase isn't configured
 *
 * Usage:
 *   import { track } from '@/lib/analytics';
 *   track('decompose_complete', { question_count: 3 });
 *
 * Query examples (run in Supabase SQL Editor):
 *
 *   -- 일별 이벤트 수
 *   select date(created_at) as day, event_name, count(*)
 *   from user_events group by day, event_name order by day desc;
 *
 *   -- 데모 완주율
 *   select
 *     count(*) filter (where properties->>'step' = '0') as demo_start,
 *     count(*) filter (where properties->>'step' = '5') as demo_finish,
 *     round(count(*) filter (where properties->>'step' = '5')::numeric /
 *           nullif(count(*) filter (where properties->>'step' = '0'), 0) * 100) as completion_pct
 *   from user_events where event_name = 'demo_step';
 *
 *   -- 단계별 완료 퍼널
 *   select event_name, count(distinct session_id)
 *   from user_events
 *   where event_name in ('decompose_complete','recast_complete','feedback_complete','loop_converged')
 *   group by event_name;
 *
 *   -- 산출물 사용 빈도
 *   select properties->>'format' as format, count(*)
 *   from user_events where event_name = 'output_generated'
 *   group by format order by count desc;
 *
 *   -- 일별 활성 세션 수
 *   select date(created_at) as day, count(distinct session_id) as sessions
 *   from user_events group by day order by day desc;
 *
 *   -- 전제 평가 패턴 분포 (모두확인 vs 일부의심 vs 대부분의심)
 *   select properties->>'eval_pattern' as pattern, count(*)
 *   from user_events where event_name = 'decompose_complete'
 *   group by pattern;
 *
 *   -- 리프레이밍 전략별 사용 빈도
 *   select properties->>'strategy' as strategy, count(*)
 *   from user_events where event_name = 'decompose_complete'
 *   group by strategy order by count desc;
 *
 *   -- LLM 호출 평균 응답시간 (단계별)
 *   select properties->>'step' as step,
 *     round(avg((properties->>'duration_ms')::int)) as avg_ms,
 *     count(*) as calls
 *   from user_events where event_name = 'llm_call'
 *   group by step;
 *
 *   -- actor 변경 빈도 (AI→사람 vs 사람→AI)
 *   select properties->>'from' as from_actor, properties->>'to' as to_actor, count(*)
 *   from user_events where event_name = 'actor_changed'
 *   group by from_actor, to_actor;
 *
 *   -- 에러 빈도
 *   select properties->>'context' as ctx, count(*)
 *   from user_events where event_name = 'error'
 *   group by ctx order by count desc;
 *
 *   -- 단계 간 전환 퍼널 (세션별)
 *   select properties->>'from' as from_step, properties->>'to' as to_step, count(*)
 *   from user_events where event_name = 'step_transition'
 *   group by from_step, to_step order by count desc;
 */

import { supabase } from './supabase';

let _sessionId: string | null = null;

function getSessionId(): string {
  if (_sessionId) return _sessionId;
  if (typeof window === 'undefined') return 'ssr';
  _sessionId = sessionStorage.getItem('ov_sid') || crypto.randomUUID();
  sessionStorage.setItem('ov_sid', _sessionId);
  return _sessionId;
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;

  try {
    supabase.from('user_events').insert({
      event_name: event,
      properties: properties || {},
      session_id: getSessionId(),
      page_path: window.location.pathname + window.location.search,
      referrer: document.referrer || null,
    }).then(() => { /* fire and forget */ });
  } catch {
    // silently fail — analytics should never break the app
  }
}

/**
 * Track page view. Call once per route change.
 */
export function trackPageView(path?: string) {
  track('page_view', { path: path || window.location.pathname });
}

/**
 * Track LLM call timing. Wraps an async LLM call and records duration.
 */
export async function trackLLMCall<T>(
  step: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    track('llm_call', { step, duration_ms: Date.now() - start, success: true });
    return result;
  } catch (err) {
    track('llm_call', { step, duration_ms: Date.now() - start, success: false, error: err instanceof Error ? err.message : 'unknown' });
    throw err;
  }
}

/**
 * Track errors (non-fatal, for monitoring).
 */
export function trackError(context: string, error: unknown) {
  track('error', {
    context,
    message: error instanceof Error ? error.message : String(error),
  });
}
