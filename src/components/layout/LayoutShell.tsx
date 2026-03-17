'use client';

import { usePathname } from 'next/navigation';

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLanding = pathname === '/';

  if (isLanding) {
    return (
      <main className="flex-1 w-full animate-fade-in">
        {children}
      </main>
    );
  }

  return (
    <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-5xl mx-auto w-full animate-fade-in">
      {children}
    </main>
  );
}
