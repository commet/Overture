'use client';

import { useEffect, useRef } from 'react';
import { track } from '@/lib/analytics';

/**
 * Tracks scroll depth milestones (25%, 50%, 75%, 100%)
 * and total time on the landing page.
 */
export function ScrollTracker() {
  const firedRef = useRef(new Set<number>());
  const entryRef = useRef(Date.now());

  useEffect(() => {
    const milestones = [25, 50, 75, 100];

    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const pct = Math.round((scrollTop / docHeight) * 100);

      for (const m of milestones) {
        if (pct >= m && !firedRef.current.has(m)) {
          firedRef.current.add(m);
          track('landing_scroll', { depth_pct: m, time_ms: Date.now() - entryRef.current });
        }
      }
    };

    const onUnload = () => {
      track('landing_exit', {
        max_scroll: Math.max(...firedRef.current, 0),
        time_ms: Date.now() - entryRef.current,
      });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('beforeunload', onUnload);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('beforeunload', onUnload);
    };
  }, []);

  return null;
}
