'use client';

import { OrchestrateStep } from '@/components/workspace/OrchestrateStep';
import { useRouter } from 'next/navigation';

export default function OrchestratePage() {
  const router = useRouter();
  return <OrchestrateStep onNavigate={(step) => router.push(`/tools/${step}`)} />;
}
