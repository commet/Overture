'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { AuthGuard } from './AuthGuard';

const PUBLIC_PATHS = ['/', '/login', '/auth/callback', '/guide', '/demo'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
}

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isWorkspace = pathname.startsWith('/workspace');
  const isLanding = pathname === '/';
  const isLogin = pathname === '/login';
  const isCallback = pathname.startsWith('/auth/callback');
  const needsAuth = !isPublicPath(pathname);

  // Login & callback — no chrome, no auth guard
  if (isLogin || isCallback) {
    return <main className="flex-1 w-full">{children}</main>;
  }

  // Landing & demo — full width, no auth
  if (isLanding || pathname === '/demo') {
    return (
      <main className="flex-1 w-full animate-fade-in">
        {children}
      </main>
    );
  }

  // Protected routes
  const content = needsAuth ? <AuthGuard>{children}</AuthGuard> : children;

  if (isWorkspace) {
    return <div className="flex-1">{content}</div>;
  }

  return (
    <>
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-5xl mx-auto w-full animate-fade-in">
        {content}
      </main>
    </>
  );
}
