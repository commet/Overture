'use client';

import { Button } from '@/components/ui/Button';

export default function ToolsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <h2 className="text-[18px] font-bold text-[var(--text-primary)]">문제가 발생했습니다</h2>
      <p className="text-[14px] text-[var(--text-secondary)] text-center max-w-md">
        {error.message || '알 수 없는 오류가 발생했습니다. 다시 시도해주세요.'}
      </p>
      <Button variant="primary" onClick={reset}>다시 시도</Button>
    </div>
  );
}
