'use client';

import { RehearseStep } from '@/components/workspace/RehearseStep';
import { useRouter } from 'next/navigation';

export default function RehearsePage() {
  const router = useRouter();
  return <RehearseStep onNavigate={(step) => router.push(`/tools/${step}`)} />;
}
