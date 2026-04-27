'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useLocale } from '@/hooks/useLocale';
import { useSettingsStore } from '@/stores/useSettingsStore';

export function LandingHeader() {
  const locale = useLocale();
  const L = (ko: string, en: string) => (locale === 'ko' ? ko : en);
  const { user, loading } = useAuth();
  const { updateSettings } = useSettingsStore();

  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLocaleChange = (next: 'ko' | 'en') => {
    if (next === locale) return;
    updateSettings({ language: next });
    window.location.reload();
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(244, 237, 224, 0.78)' : 'transparent',
        backdropFilter: scrolled ? 'blur(10px) saturate(120%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(10px) saturate(120%)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(26, 42, 58, 0.08)' : '1px solid transparent',
      }}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-10">
        <div className="h-14 md:h-16 flex items-center justify-between">
          {/* Wordmark */}
          <Link href="/" className="flex items-baseline gap-2 group">
            <span
              style={{
                fontFamily: 'var(--font-display)',
                color: 'var(--bp-ink)',
                fontSize: 18,
                fontWeight: 700,
                letterSpacing: '-0.01em',
              }}
            >
              Overture
            </span>
            <span
              className="hidden md:inline bp-mono"
              style={{
                color: 'var(--bp-ink-soft)',
                fontSize: 10,
                letterSpacing: '0.32em',
                textTransform: 'uppercase',
              }}
            >
              · est. mmxxvi
            </span>
          </Link>

          <div className="flex items-center gap-3 md:gap-5">
            {/* Locale toggle (mono / ink) */}
            <div
              className="flex items-center"
              style={{
                border: '1px solid rgba(26, 42, 58, 0.18)',
                borderRadius: 999,
                overflow: 'hidden',
              }}
              role="group"
              aria-label="Language"
            >
              <button
                onClick={() => handleLocaleChange('ko')}
                className="bp-mono cursor-pointer transition-colors"
                style={{
                  padding: '4px 10px',
                  fontSize: 10.5,
                  letterSpacing: '0.18em',
                  background: locale === 'ko' ? 'var(--bp-ink)' : 'transparent',
                  color: locale === 'ko' ? 'var(--bp-paper)' : 'var(--bp-ink-soft)',
                }}
                aria-pressed={locale === 'ko'}
              >
                KO
              </button>
              <button
                onClick={() => handleLocaleChange('en')}
                className="bp-mono cursor-pointer transition-colors"
                style={{
                  padding: '4px 10px',
                  fontSize: 10.5,
                  letterSpacing: '0.18em',
                  background: locale === 'en' ? 'var(--bp-ink)' : 'transparent',
                  color: locale === 'en' ? 'var(--bp-paper)' : 'var(--bp-ink-soft)',
                }}
                aria-pressed={locale === 'en'}
              >
                EN
              </button>
            </div>

            {/* Auth area */}
            {!loading && (
              user ? (
                <Link
                  href="/workspace"
                  className="bp-mono transition-opacity hover:opacity-70"
                  style={{
                    color: 'var(--bp-ink)',
                    fontSize: 11,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                  }}
                >
                  {L('워크스페이스 →', 'Workspace →')}
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="bp-mono transition-opacity hover:opacity-70"
                  style={{
                    color: 'var(--bp-ink-soft)',
                    fontSize: 11,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                  }}
                >
                  {L('로그인', 'Sign In')}
                </Link>
              )
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
