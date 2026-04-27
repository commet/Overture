'use client';

import { RecastStep } from '@/components/workspace/RecastStep';
import { StepIntro } from '@/components/workspace/StepIntro';
import { useRouter } from 'next/navigation';

export default function RecastPage() {
  const router = useRouter();
  return (
    <>
      <StepIntro stepKey="recast" />
      <RecastStep onNavigate={(step) => router.push(`/tools/${step}`)} />
    </>
  );
}
