'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isWorkspace = pathname.startsWith('/workspace');
  const isLanding = pathname === '/';

  if (isWorkspace) {
    // Workspace has its own layout
    return <div className="flex-1">{children}</div>;
  }

  if (isLanding) {
    return (
      <main className="flex-1 w-full animate-fade-in">
        {children}
      </main>
    );
  }

  return (
    <>
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-5xl mx-auto w-full animate-fade-in">
        {children}
      </main>
    </>
  );
}
