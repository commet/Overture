'use client';

import { SynthesizeStep } from '@/components/workspace/SynthesizeStep';
import { useRouter } from 'next/navigation';

export default function SynthesizePage() {
  const router = useRouter();
  return <SynthesizeStep onNavigate={(step) => router.push(`/tools/${step}`)} />;
}
