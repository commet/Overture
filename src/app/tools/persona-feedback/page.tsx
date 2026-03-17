'use client';

import { PersonaFeedbackStep } from '@/components/workspace/PersonaFeedbackStep';
import { useRouter } from 'next/navigation';

export default function PersonaFeedbackPage() {
  const router = useRouter();
  return <PersonaFeedbackStep onNavigate={(step) => router.push(`/tools/${step}`)} />;
}
