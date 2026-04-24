import { HelmSection } from '@/components/landing/blueprint/HelmSection';
import { CrewSection } from '@/components/landing/blueprint/CrewSection';
import { HeadingSection } from '@/components/landing/blueprint/HeadingSection';
import { ScrollTracker } from '@/components/landing/ScrollTracker';

export default function HomePage() {
  return (
    <div>
      <ScrollTracker />
      <HelmSection />
      <CrewSection />
      <HeadingSection />
    </div>
  );
}
