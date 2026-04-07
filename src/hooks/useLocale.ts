'use client';

import { useState, useEffect } from 'react';
import { getStorage, setStorage, STORAGE_KEYS } from '@/lib/storage';
import type { Settings } from '@/stores/types';

export type Locale = 'ko' | 'en';

/**
 * 브라우저 언어 자동 감지 + localStorage 캐시.
 * 첫 방문 시 navigator.language가 ko가 아니면 영어로 설정.
 * settings에서 수동 변경한 경우 그걸 우선.
 */
export function useLocale(): Locale {
  const [locale, setLocale] = useState<Locale>('ko');

  useEffect(() => {
    const settings = getStorage<Settings>(STORAGE_KEYS.SETTINGS, {} as Settings);

    // 사용자가 settings에서 명시적으로 설정한 적 있으면 그걸 우선
    if (settings.language) {
      setLocale(settings.language as Locale);
      return;
    }

    // 첫 방문: 브라우저 언어 감지
    const browserLang = navigator.language || '';
    const isKorean = browserLang.startsWith('ko');
    const detected: Locale = isKorean ? 'ko' : 'en';

    // localStorage에 저장하여 다음 방문 시 바로 적용
    setStorage(STORAGE_KEYS.SETTINGS, { ...settings, language: detected });
    setLocale(detected);
  }, []);

  return locale;
}

/**
 * 이중 언어 텍스트 헬퍼.
 * 사용법: const L = useLanding();  L('제목', 'Title')
 */
export function useLandingText(locale: Locale) {
  return (ko: string, en: string) => locale === 'ko' ? ko : en;
}
