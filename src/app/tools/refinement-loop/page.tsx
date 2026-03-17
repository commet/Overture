'use client';

import { RefinementLoopStep } from '@/components/workspace/RefinementLoopStep';
import { useRouter } from 'next/navigation';

export default function RefinementLoopPage() {
  const router = useRouter();
  return <RefinementLoopStep onNavigate={(step) => router.push(`/tools/${step}`)} />;
}
