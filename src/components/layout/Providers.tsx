'use client';

import { AuthProvider } from '@/lib/auth';
import { UnlockToast } from '@/components/agents/UnlockToast';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <UnlockToast />
    </AuthProvider>
  );
}
