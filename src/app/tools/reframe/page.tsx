'use client';

import { ReframeStep } from '@/components/workspace/ReframeStep';
import { useRouter } from 'next/navigation';

export default function ReframePage() {
  const router = useRouter();
  return <ReframeStep onNavigate={(step) => router.push(`/tools/${step}`)} />;
}
