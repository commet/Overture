import { BowSection } from '@/components/landing/blueprint/BowSection';
import { MidshipSection } from '@/components/landing/blueprint/MidshipSection';
import { SternSection } from '@/components/landing/blueprint/SternSection';
import { ScrollTracker } from '@/components/landing/ScrollTracker';

export default function HomePage() {
  return (
    <div>
      <ScrollTracker />
      <BowSection />
      <MidshipSection />
      <SternSection />
    </div>
  );
}
