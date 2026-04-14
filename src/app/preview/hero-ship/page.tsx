import { HeroShip } from '@/components/landing/HeroShip';

export const metadata = {
  title: 'Ithaca — Hero Ship Preview',
  description: 'Preview of the new 3D ship hero',
};

export default function HeroShipPreviewPage() {
  return (
    <main className="min-h-screen bg-[#0a0e1f]">
      <HeroShip />
      <div className="px-8 py-12 text-white/70 text-[13px] max-w-2xl mx-auto">
        <p className="mb-2 text-white/50 uppercase tracking-[0.15em] text-[10px]">
          Preview · scaffold v0.1
        </p>
        <p className="leading-relaxed">
          This is the first scaffold of the Ithaca ship hero. The ship visible above
          is a placeholder built from primitives — drop a real GLB at{' '}
          <code className="text-[#ffb070]">/public/models/ship.glb</code> and it
          swaps in automatically. Next passes: hover sectors, crew stations,
          wake animation, postprocessing.
        </p>
      </div>
    </main>
  );
}
