'use client';

import { SynthesizeStep } from '@/components/workspace/SynthesizeStep';
import { StepIntro } from '@/components/workspace/StepIntro';
import { useRouter } from 'next/navigation';

export default function SynthesizePage() {
  const router = useRouter();
  return (
    <>
      <StepIntro stepKey="synthesize" />
      <SynthesizeStep onNavigate={(step) => router.push(`/tools/${step}`)} />
    </>
  );
}
