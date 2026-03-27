'use client';

import { RefineStep } from '@/components/workspace/RefineStep';
import { useRouter } from 'next/navigation';

export default function RefinePage() {
  const router = useRouter();
  return <RefineStep onNavigate={(step) => router.push(`/tools/${step}`)} />;
}
