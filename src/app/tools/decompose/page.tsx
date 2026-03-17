'use client';

import { DecomposeStep } from '@/components/workspace/DecomposeStep';
import { useRouter } from 'next/navigation';

export default function DecomposePage() {
  const router = useRouter();
  return <DecomposeStep onNavigate={(step) => router.push(`/tools/${step}`)} />;
}
