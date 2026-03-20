'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { trackPageView } from '@/lib/analytics';
import { Suspense } from 'react';

function AnalyticsInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    trackPageView(pathname);
  }, [pathname, searchParams]);

  return null;
}

export function Analytics() {
  return (
    <Suspense>
      <AnalyticsInner />
    </Suspense>
  );
}
