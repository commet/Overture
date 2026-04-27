/**
 * HorizonGlow — gold gradient glow rising from the horizon line.
 *
 * Used only in Act 3 (On Deck). The 5% rule for gold lives here, in the
 * Synthesis waypoint, the CTA, and this dawn-light wash. Transparent at
 * top so it blends into cream paper above.
 */

export function HorizonGlow({
  className = 'absolute inset-x-0 pointer-events-none',
  intensity = 0.22,
  bottom = 0,
  height = '52%',
}: {
  className?: string;
  /** 0..1 — peak alpha at the horizon. Default tuned to the 5% rule. */
  intensity?: number;
  bottom?: number | string;
  height?: number | string;
}) {
  return (
    <div
      className={className}
      aria-hidden="true"
      style={{
        bottom,
        height,
        background: `linear-gradient(to top, rgba(150, 120, 46, ${intensity}) 0%, rgba(150, 120, 46, ${intensity * 0.5}) 30%, transparent 70%)`,
      }}
    />
  );
}
