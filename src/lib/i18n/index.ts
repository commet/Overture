import { ko, type TranslationKey } from './ko';
import { en } from './en';
import { getStorage, STORAGE_KEYS } from '@/lib/storage';
import type { Settings } from '@/stores/types';

const translations = { ko, en } as const;

/**
 * Get translation for a key based on current language setting.
 * Supports simple interpolation: t('key', { remaining: 3, total: 5 })
 */
export function t(key: TranslationKey, params?: Record<string, string | number>): string {
  const settings = getStorage<Settings>(STORAGE_KEYS.SETTINGS, {
    anthropic_api_key: '', openai_api_key: '', llm_provider: 'anthropic',
    llm_mode: 'proxy', local_endpoint: '',
    language: 'ko', audio_enabled: false, audio_volume: 0.15,
  });

  const lang = settings.language || 'ko';
  const dict = translations[lang] || translations.ko;
  let text = dict[key] || ko[key] || key;

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, String(v));
    }
  }

  return text;
}

/**
 * Get current language.
 */
export function getCurrentLanguage(): 'ko' | 'en' {
  const settings = getStorage<Settings>(STORAGE_KEYS.SETTINGS, {
    anthropic_api_key: '', openai_api_key: '', llm_provider: 'anthropic',
    llm_mode: 'proxy', local_endpoint: '',
    language: 'ko', audio_enabled: false, audio_volume: 0.15,
  });
  return settings.language || 'ko';
}

export type { TranslationKey };
