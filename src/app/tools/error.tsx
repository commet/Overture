'use client';

import { Button } from '@/components/ui/Button';
import { useLocale } from '@/hooks/useLocale';

export default function ToolsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const locale = useLocale();
  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <h2 className="text-[18px] font-bold text-[var(--text-primary)]">{L('문제가 발생했습니다', 'Something went wrong')}</h2>
      <p className="text-[14px] text-[var(--text-secondary)] text-center max-w-md">
        {error.message || L('알 수 없는 오류가 발생했습니다. 다시 시도해주세요.', 'An unknown error occurred. Please try again.')}
      </p>
      <Button variant="primary" onClick={reset}>{L('다시 시도', 'Try again')}</Button>
    </div>
  );
}
