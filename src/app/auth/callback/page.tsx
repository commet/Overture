'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);

      // OAuth provider returned an error (e.g., user denied access)
      const errorParam = params.get('error');
      if (errorParam) {
        router.replace('/login?error=oauth_denied');
        return;
      }

      const code = params.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          router.replace('/login?error=auth_failed');
          return;
        }
      }

      router.replace('/workspace');
    };

    handleCallback();
  }, [router]);

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-3">
        <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-[14px] text-[var(--text-secondary)]">로그인 중...</p>
      </div>
    </div>
  );
}
