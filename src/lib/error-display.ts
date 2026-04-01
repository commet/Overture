import { LLMError } from '@/lib/llm';

export interface DisplayError {
  message: string;
  category: string;
  actionLabel?: string;
  retryable: boolean;
}

/**
 * Convert any caught error to a user-friendly display format.
 * Uses LLMError categories for specific messaging.
 */
export function toDisplayError(err: unknown): DisplayError {
  if (err instanceof LLMError) {
    switch (err.category) {
      case 'rate_limit':
        return {
          message: '요청 한도에 도달했습니다. 잠시 후 다시 시도해주세요.',
          category: 'rate_limit',
          actionLabel: '다시 시도',
          retryable: true,
        };
      case 'overloaded':
        return {
          message: '서버가 일시적으로 바쁩니다. 잠시 후 자동 재시도됩니다.',
          category: 'overloaded',
          actionLabel: '다시 시도',
          retryable: true,
        };
      case 'context_too_long':
        return {
          message: '입력이 너무 깁니다. 내용을 줄여서 다시 시도해주세요.',
          category: 'context_too_long',
          retryable: false,
        };
      case 'auth':
        return {
          message: err.message.startsWith('LOGIN_REQUIRED') ? '로그인이 필요합니다.' : '인증에 실패했습니다. 다시 로그인해주세요.',
          category: 'auth',
          actionLabel: '로그인',
          retryable: false,
        };
      case 'parse_failure':
        return {
          message: 'AI 응답을 처리하지 못했습니다. 다시 시도하면 대부분 해결됩니다.',
          category: 'parse_failure',
          actionLabel: '다시 시도',
          retryable: true,
        };
      case 'network':
        return {
          message: '네트워크 연결을 확인해주세요.',
          category: 'network',
          actionLabel: '다시 시도',
          retryable: true,
        };
      case 'validation':
        return {
          message: 'AI 응답 형식이 올바르지 않습니다. 다시 시도해주세요.',
          category: 'validation',
          actionLabel: '다시 시도',
          retryable: true,
        };
      default:
        return {
          message: err.message || '알 수 없는 오류가 발생했습니다.',
          category: 'unknown',
          actionLabel: '다시 시도',
          retryable: true,
        };
    }
  }

  if (err instanceof Error) {
    if (err.message.startsWith('LOGIN_REQUIRED')) {
      return { message: '로그인이 필요합니다.', category: 'auth', actionLabel: '로그인', retryable: false };
    }
    return { message: err.message || '오류가 발생했습니다.', category: 'unknown', retryable: true };
  }

  return { message: '알 수 없는 오류가 발생했습니다.', category: 'unknown', retryable: true };
}

/** Check if error requires login redirect */
export function isAuthError(err: unknown): boolean {
  if (err instanceof LLMError) return err.category === 'auth';
  if (err instanceof Error) return err.message.startsWith('LOGIN_REQUIRED');
  return false;
}
