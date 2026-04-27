'use client';

import { ReframeStep } from '@/components/workspace/ReframeStep';
import { StepIntro } from '@/components/workspace/StepIntro';
import { useRouter } from 'next/navigation';

export default function ReframePage() {
  const router = useRouter();
  return (
    <>
      <StepIntro stepKey="reframe" />
      <ReframeStep onNavigate={(step) => router.push(`/tools/${step}`)} />
    </>
  );
}
