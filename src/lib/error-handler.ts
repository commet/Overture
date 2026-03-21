/**
 * Global Error Handler — Phase 1C
 *
 * 에러를 분류하고 일관된 방식으로 처리한다.
 * withRetry()로 일시적 네트워크 오류에 대응.
 */

import { log } from './logger';

export type ErrorCategory = 'network' | 'llm' | 'storage' | 'auth' | 'unknown';

export interface ClassifiedError {
  category: ErrorCategory;
  message: string;
  original: unknown;
  retryable: boolean;
}

/**
 * Classify an error into a known category.
 */
export function classifyError(error: unknown): ClassifiedError {
  if (error instanceof TypeError && 'message' in error) {
    if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch')) {
      return { category: 'network', message: '네트워크 연결을 확인해주세요.', original: error, retryable: true };
    }
  }

  if (error instanceof Error) {
    const msg = error.message.toLowerCase();

    // LLM errors
    if (msg.includes('llm') || msg.includes('anthropic') || msg.includes('rate limit') || msg.includes('429')) {
      return { category: 'llm', message: error.message, original: error, retryable: msg.includes('429') || msg.includes('rate limit') };
    }

    // Auth errors
    if (msg.includes('auth') || msg.includes('unauthorized') || msg.includes('401') || msg.includes('session')) {
      return { category: 'auth', message: '인증이 필요합니다. 다시 로그인해주세요.', original: error, retryable: false };
    }

    // Storage errors
    if (msg.includes('storage') || msg.includes('localstorage') || msg.includes('quota')) {
      return { category: 'storage', message: '저장 공간에 문제가 있습니다.', original: error, retryable: false };
    }

    // Supabase / DB errors
    if (msg.includes('supabase') || msg.includes('postgres') || msg.includes('database')) {
      return { category: 'storage', message: '데이터 동기화에 실패했습니다.', original: error, retryable: true };
    }

    return { category: 'unknown', message: error.message, original: error, retryable: false };
  }

  return { category: 'unknown', message: String(error), original: error, retryable: false };
}

/**
 * Handle an error: classify, log, and optionally report.
 */
export function handleError(error: unknown, context?: string): ClassifiedError {
  const classified = classifyError(error);

  log.error(`${classified.category}: ${classified.message}`, {
    context: context || 'error',
    data: process.env.NODE_ENV === 'development' ? classified.original : undefined,
  });

  return classified;
}

/**
 * Retry a function with exponential backoff.
 * Only retries on retryable errors (network, rate-limit).
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelay?: number; context?: string } = {}
): Promise<T> {
  const { maxRetries = 2, baseDelay = 1000, context } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const classified = classifyError(error);

      if (!classified.retryable || attempt === maxRetries) {
        throw error;
      }

      const delay = baseDelay * Math.pow(2, attempt); // 1s, 2s, 4s
      if (context) {
        log.warn(`재시도 ${attempt + 1}/${maxRetries} (${delay}ms 후)`, { context });
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Unreachable but satisfies TypeScript
  throw new Error('withRetry: unexpected exit');
}
