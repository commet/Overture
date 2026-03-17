import { Hero } from '@/components/landing/Hero';
import { ProcessFlow } from '@/components/landing/ProcessFlow';
import { UseCaseFlow } from '@/components/landing/UseCaseFlow';
import { ClosingCTA } from '@/components/landing/ClosingCTA';

export default function HomePage() {
  return (
    <div className="-mx-4 md:-mx-6 lg:-mx-8 -mt-4 md:-mt-6 lg:-mt-8">
      <Hero />
      <ProcessFlow />
      <UseCaseFlow />
      <ClosingCTA />
    </div>
  );
}
