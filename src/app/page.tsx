import { Hero } from '@/components/landing/Hero';
import { ProcessFlow } from '@/components/landing/ProcessFlow';
import { UseCaseFlow } from '@/components/landing/UseCaseFlow';
import { ClosingCTA } from '@/components/landing/ClosingCTA';

export default function HomePage() {
  return (
    <div>
      <Hero />
      <UseCaseFlow />
      <ProcessFlow />
      <ClosingCTA />
    </div>
  );
}
