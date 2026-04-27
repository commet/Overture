'use client';

import { useLocale } from './useLocale';
import { useSettingsStore } from '@/stores/useSettingsStore';

/**
 * Locale switching for headers and language toggles.
 *
 * Persists via useSettingsStore (localStorage) and forces a full page reload
 * so SSR-injected text regenerates with the new locale. Don't replace the
 * reload with router.refresh() unless layout.tsx + i18n bundles are reworked
 * to react to a runtime locale change.
 */
export function useLocaleSwitch() {
  const locale = useLocale();
  const { updateSettings } = useSettingsStore();

  const switchTo = (next: 'ko' | 'en') => {
    if (next === locale) return;
    updateSettings({ language: next });
    window.location.reload();
  };

  return { locale, switchTo };
}
