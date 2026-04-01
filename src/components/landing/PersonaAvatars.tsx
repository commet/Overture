/**
 * Minimal, tasteful persona avatars for the Hero section.
 *
 * Style: Soft, warm, slightly abstract portraits.
 * Each persona has ONE distinguishing visual detail.
 * Clipped to circle via CSS on the wrapper div.
 */

export type AvatarType = 'dev' | 'pm' | 'designer' | 'cto';

export function PersonaAvatar({ type, size = 48 }: { type: AvatarType; size?: number }) {
  return (
    <div
      style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 80 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={type}
      >
        {type === 'dev' && <DevAvatar />}
        {type === 'pm' && <PMAvatar />}
        {type === 'designer' && <DesignerAvatar />}
        {type === 'cto' && <CTOAvatar />}
      </svg>
    </div>
  );
}

/* ────────────────────────────────────────
   Developer — hoodie, rectangular glasses, messy hair
   Vibe: "새벽 3시에도 코딩하는 사람"
   ──────────────────────────────────────── */
function DevAvatar() {
  return (
    <>
      <rect width="80" height="80" fill="#E8EEF5" />
      {/* Hoodie body */}
      <path d="M6 80C6 66 18 56 40 56s34 10 34 24H6Z" fill="#697D90" />
      {/* Hood lining */}
      <path d="M22 60Q40 52 58 60" stroke="#5A6C7E" strokeWidth="1.5" fill="none" />
      {/* Drawstrings */}
      <line x1="37" y1="57" x2="36" y2="64" stroke="#fff" strokeWidth="0.6" opacity="0.3" />
      <line x1="43" y1="57" x2="44" y2="64" stroke="#fff" strokeWidth="0.6" opacity="0.3" />
      {/* Neck */}
      <path d="M36 49q4 3 8 0v7q-4-2-8 0Z" fill="#D4A574" />
      {/* Head */}
      <ellipse cx="40" cy="34" rx="14" ry="16" fill="#D4A574" />
      {/* Ears */}
      <ellipse cx="26.5" cy="36" rx="2" ry="3" fill="#C49862" />
      <ellipse cx="53.5" cy="36" rx="2" ry="3" fill="#C49862" />
      {/* Hair — messy, layered */}
      <path d="M26 30c0-12 6-18 14-18s14 6 14 18c-1-8-6-14-14-14S27 22 26 30Z" fill="#2D231A" />
      <path d="M28 26c1-6 5-10 12-11" stroke="#2D231A" strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M34 23c1-4 4-6 8-7" stroke="#2D231A" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Glasses — rectangular, nerdy */}
      <rect x="28.5" y="32.5" width="9" height="6" rx="1.5" stroke="#2D231A" strokeWidth="1.1" />
      <rect x="42.5" y="32.5" width="9" height="6" rx="1.5" stroke="#2D231A" strokeWidth="1.1" />
      <path d="M37.5 35.5h5" stroke="#2D231A" strokeWidth="0.8" />
      {/* Eyes */}
      <circle cx="33" cy="35.5" r="1.2" fill="#2D231A" />
      <circle cx="47" cy="35.5" r="1.2" fill="#2D231A" />
      {/* Mouth */}
      <path d="M37 43q3 2 6 0" stroke="#B5806A" strokeWidth="0.8" fill="none" strokeLinecap="round" />
    </>
  );
}

/* ────────────────────────────────────────
   PM — round glasses, side part, neat collar
   Vibe: "정리 잘 하는 사람"
   ──────────────────────────────────────── */
function PMAvatar() {
  return (
    <>
      <rect width="80" height="80" fill="#F0EAD8" />
      {/* Shirt body */}
      <path d="M6 80C6 66 18 56 40 56s34 10 34 24H6Z" fill="#E8E0D0" />
      {/* Blazer/cardigan */}
      <path d="M6 80C6 68 16 58 30 56l6 2v22H6Z" fill="#7B6E5C" />
      <path d="M74 80c0-12-10-22-24-24l-6 2v22h30Z" fill="#7B6E5C" />
      {/* Collar V */}
      <path d="M34 56l5 7 1-4 1 4 5-7" fill="#F5F0E8" stroke="#D8CFC0" strokeWidth="0.5" />
      {/* Neck */}
      <path d="M36 48q4 3 8 0v8q-4-2-8 0Z" fill="#CDA072" />
      {/* Head */}
      <ellipse cx="40" cy="33" rx="13.5" ry="15.5" fill="#CDA072" />
      {/* Ears */}
      <ellipse cx="27" cy="35" rx="2" ry="2.5" fill="#BD9060" />
      <ellipse cx="53" cy="35" rx="2" ry="2.5" fill="#BD9060" />
      {/* Hair — neat side part */}
      <path d="M27 28c0-12 5.5-17 13-17s13 5 13 17c-1-8-6-13-13-13s-12 5-13 13Z" fill="#1A1410" />
      <path d="M27 25c1-8 6-13 13-14l-9 8Z" fill="#1A1410" />
      {/* Glasses — round, intellectual */}
      <circle cx="33" cy="34" r="5.5" stroke="#3D3028" strokeWidth="1.1" />
      <circle cx="47" cy="34" r="5.5" stroke="#3D3028" strokeWidth="1.1" />
      <path d="M38.5 34h3" stroke="#3D3028" strokeWidth="0.8" />
      {/* Eyes */}
      <circle cx="33" cy="34.5" r="1.2" fill="#1A1410" />
      <circle cx="47" cy="34.5" r="1.2" fill="#1A1410" />
      {/* Mouth — slight confident smile */}
      <path d="M36 42q4 3 8 0" stroke="#A07058" strokeWidth="0.8" fill="none" strokeLinecap="round" />
    </>
  );
}

/* ────────────────────────────────────────
   Designer — turtleneck, asymmetric hair, gold earring
   Vibe: "보는 눈이 있는 사람"
   ──────────────────────────────────────── */
function DesignerAvatar() {
  return (
    <>
      <rect width="80" height="80" fill="#F0E4E0" />
      {/* Turtleneck body */}
      <path d="M6 80C6 66 18 56 40 56s34 10 34 24H6Z" fill="#2A2A2A" />
      {/* Turtleneck collar */}
      <path d="M32 50q0 6 4 6h8q4 0 4-6" fill="#2A2A2A" />
      <path d="M33 52q7 3 14 0" stroke="#3A3A3A" strokeWidth="0.6" fill="none" />
      {/* Neck */}
      <path d="M35 46q5 3 10 0v6q-5-2-10 0Z" fill="#D4A574" />
      {/* Head */}
      <ellipse cx="40" cy="32" rx="13" ry="15" fill="#D4A574" />
      {/* Ears */}
      <ellipse cx="27.5" cy="34" rx="2" ry="2.5" fill="#C49862" />
      <ellipse cx="52.5" cy="34" rx="2" ry="2.5" fill="#C49862" />
      {/* Gold earring ✨ */}
      <circle cx="27" cy="37.5" r="1.5" fill="#B8963E" />
      <circle cx="27" cy="37.5" r="0.6" fill="#D4B04A" />
      {/* Hair — asymmetric, longer on left side */}
      <path d="M27 28c0-12 6-18 13-18s13 6 13 18c-1-8-6-14-13-14s-12 6-13 14Z" fill="#5C3A20" />
      {/* Long fringe sweeping left */}
      <path d="M24 32c-1-8 2-16 8-20l-6 12Z" fill="#5C3A20" />
      <path d="M23 30c0-6 3-14 9-18" stroke="#5C3A20" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      {/* Shorter right side */}
      <path d="M53 24c1-4 0-8-3-12l4 8Z" fill="#5C3A20" />
      {/* Eyebrows — expressive */}
      <path d="M30 29q4-2 7 0" stroke="#5C3A20" strokeWidth="0.9" fill="none" />
      <path d="M43 29q3-2 7 0" stroke="#5C3A20" strokeWidth="0.9" fill="none" />
      {/* Eyes — slightly larger, observant */}
      <ellipse cx="33.5" cy="33" rx="1.6" ry="1.4" fill="#2D231A" />
      <ellipse cx="46.5" cy="33" rx="1.6" ry="1.4" fill="#2D231A" />
      {/* Mouth */}
      <path d="M36 41q4 2.5 8 0" stroke="#B5806A" strokeWidth="0.8" fill="none" strokeLinecap="round" />
    </>
  );
}

/* ────────────────────────────────────────
   CTO — short hair, quarter-zip, gold zip pull, wide shoulders
   Vibe: "다 겪어본 사람"
   ──────────────────────────────────────── */
function CTOAvatar() {
  return (
    <>
      <rect width="80" height="80" fill="#E0ECE6" />
      {/* Quarter-zip body — wider shoulders */}
      <path d="M4 80C4 64 18 54 40 54s36 10 36 26H4Z" fill="#3D5A50" />
      {/* Zip line */}
      <line x1="40" y1="54" x2="40" y2="72" stroke="#2D4A40" strokeWidth="1.5" />
      {/* Gold zip pull */}
      <rect x="38.5" y="54" width="3" height="4" rx="0.5" fill="#B8963E" />
      {/* Collar flaps */}
      <path d="M35 54l4 4 1-3 1 3 4-4" fill="none" stroke="#2D4A40" strokeWidth="1" />
      {/* Neck */}
      <path d="M36 47q4 3 8 0v7q-4-2-8 0Z" fill="#CDA072" />
      {/* Head — slightly wider, confident */}
      <ellipse cx="40" cy="33" rx="14.5" ry="15" fill="#CDA072" />
      {/* Ears */}
      <ellipse cx="26" cy="35" rx="2" ry="2.5" fill="#BD9060" />
      <ellipse cx="54" cy="35" rx="2" ry="2.5" fill="#BD9060" />
      {/* Hair — short, clean cropped */}
      <path d="M26 30c0-12 6-18 14-18s14 6 14 18c-1-8-6-14-14-14S27 22 26 30Z" fill="#1A1410" />
      <path d="M28 26c1-6 6-10 12-10s11 4 12 10l-1-2c-1-5-5-8-11-8s-10 3-11 8Z" fill="#1A1410" />
      {/* Eyebrows — strong, defined */}
      <path d="M29 29.5q4.5-2.5 8 0" stroke="#1A1410" strokeWidth="1.1" fill="none" />
      <path d="M43 29.5q3.5-2.5 8 0" stroke="#1A1410" strokeWidth="1.1" fill="none" />
      {/* Eyes — direct, confident */}
      <ellipse cx="33.5" cy="33.5" rx="1.5" ry="1.3" fill="#1A1410" />
      <ellipse cx="46.5" cy="33.5" rx="1.5" ry="1.3" fill="#1A1410" />
      {/* Mouth — confident smile */}
      <path d="M35 42q5 3.5 10 0" stroke="#A07058" strokeWidth="1" fill="none" strokeLinecap="round" />
    </>
  );
}
