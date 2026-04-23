import { LLMError } from '@/lib/llm';
import { t } from '@/lib/i18n';

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
  const retryLabel = t('errorDisplay.retry');
  const loginLabel = t('errorDisplay.login');

  if (err instanceof LLMError) {
    switch (err.category) {
      case 'rate_limit':
        return {
          message: t('errorDisplay.rateLimit'),
          category: 'rate_limit',
          actionLabel: retryLabel,
          retryable: true,
        };
      case 'overloaded':
        return {
          message: t('errorDisplay.overloaded'),
          category: 'overloaded',
          actionLabel: retryLabel,
          retryable: true,
        };
      case 'context_too_long':
        return {
          message: t('errorDisplay.contextTooLong'),
          category: 'context_too_long',
          retryable: false,
        };
      case 'auth':
        return {
          message: err.message.startsWith('LOGIN_REQUIRED') ? t('errorDisplay.loginRequired') : t('errorDisplay.authFailed'),
          category: 'auth',
          actionLabel: loginLabel,
          retryable: false,
        };
      case 'parse_failure':
        return {
          message: t('errorDisplay.parseFailure'),
          category: 'parse_failure',
          actionLabel: retryLabel,
          retryable: true,
        };
      case 'network':
        return {
          message: t('errorDisplay.network'),
          category: 'network',
          actionLabel: retryLabel,
          retryable: true,
        };
      case 'validation':
        return {
          message: t('errorDisplay.validation'),
          category: 'validation',
          actionLabel: retryLabel,
          retryable: true,
        };
      default:
        return {
          message: err.message || t('errorDisplay.unknown'),
          category: 'unknown',
          actionLabel: retryLabel,
          retryable: true,
        };
    }
  }

  if (err instanceof Error) {
    if (err.message.startsWith('LOGIN_REQUIRED')) {
      return { message: t('errorDisplay.loginRequired'), category: 'auth', actionLabel: loginLabel, retryable: false };
    }
    return { message: err.message || t('errorDisplay.generic'), category: 'unknown', retryable: true };
  }

  return { message: t('errorDisplay.unknown'), category: 'unknown', retryable: true };
}

/** Check if error requires login redirect */
export function isAuthError(err: unknown): boolean {
  if (err instanceof LLMError) return err.category === 'auth';
  if (err instanceof Error) return err.message.startsWith('LOGIN_REQUIRED');
  return false;
}
