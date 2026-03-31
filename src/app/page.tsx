import { Hero } from '@/components/landing/Hero';
import { ProcessFlow } from '@/components/landing/ProcessFlow';
import { UseCaseFlow } from '@/components/landing/UseCaseFlow';
import { ClosingCTA } from '@/components/landing/ClosingCTA';
import { ScrollTracker } from '@/components/landing/ScrollTracker';

export default function HomePage() {
  return (
    <div>
      <ScrollTracker />
      <Hero />
      <UseCaseFlow />
      <ProcessFlow />
      <ClosingCTA />
    </div>
  );
}
