'use client';

import { RecastStep } from '@/components/workspace/RecastStep';
import { useRouter } from 'next/navigation';

export default function RecastPage() {
  const router = useRouter();
  return <RecastStep onNavigate={(step) => router.push(`/tools/${step}`)} />;
}
