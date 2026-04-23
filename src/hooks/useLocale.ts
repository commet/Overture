'use client';

import { useState, useEffect } from 'react';
import { getStorage, setStorage, STORAGE_KEYS } from '@/lib/storage';
import type { Settings } from '@/stores/types';

export type Locale = 'ko' | 'en';

function detectBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') return 'en';
  return (navigator.language || '').startsWith('ko') ? 'ko' : 'en';
}

function detectUrlLocale(): Locale | null {
  if (typeof window === 'undefined') return null;
  const param = new URLSearchParams(window.location.search).get('lang');
  return param === 'ko' || param === 'en' ? param : null;
}

/**
 * Resolves the user's locale.
 *
 * Priority (highest first):
 *   1. URL param (?lang=ko | ?lang=en) — transient; for shareable marketing links
 *   2. Explicit user setting — persisted in Settings (set via Settings UI)
 *   3. Browser Accept-Language on first visit — auto-persisted so next visit is stable
 *   4. Default: 'en' — matches SSR to avoid hydration flash for English-speaking users
 *
 * A Korean browser user will see English for ~1 frame on first visit before the
 * useEffect switches to Korean (acceptable, given the product's English-first focus).
 */
export function useLocale(): Locale {
  const [locale, setLocale] = useState<Locale>('en');

  useEffect(() => {
    // 1. URL param wins (does NOT persist — URL is the source of truth for that session)
    const urlLocale = detectUrlLocale();
    if (urlLocale) {
      setLocale(urlLocale);
      return;
    }

    // 2. Explicit user setting (previously chosen in Settings)
    const settings = getStorage<Settings>(STORAGE_KEYS.SETTINGS, {} as Settings);
    if (settings.language) {
      setLocale(settings.language as Locale);
      return;
    }

    // 3. First visit: detect from browser, persist so subsequent visits are stable
    const browserLocale = detectBrowserLocale();
    setStorage(STORAGE_KEYS.SETTINGS, { ...settings, language: browserLocale });
    setLocale(browserLocale);
  }, []);

  return locale;
}

/**
 * Dual-language text helper.
 * Usage: const L = useLandingText(locale); L('제목', 'Title')
 */
export function useLandingText(locale: Locale) {
  return (ko: string, en: string) => locale === 'ko' ? ko : en;
}
