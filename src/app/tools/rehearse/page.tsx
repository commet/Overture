'use client';

import { RehearseStep } from '@/components/workspace/RehearseStep';
import { StepIntro } from '@/components/workspace/StepIntro';
import { useRouter } from 'next/navigation';

export default function RehearsePage() {
  const router = useRouter();
  return (
    <>
      <StepIntro stepKey="rehearse" />
      <RehearseStep onNavigate={(step) => router.push(`/tools/${step}`)} />
    </>
  );
}
