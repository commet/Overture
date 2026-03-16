type BadgeVariant = 'ai' | 'human' | 'both' | 'default' | 'checkpoint';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  ai: 'bg-[var(--ai)] text-[#2d4a7c]',
  human: 'bg-[var(--human)] text-[#8b6914]',
  both: 'bg-[var(--collab)] text-[#2d6b2d]',
  checkpoint: 'bg-[var(--checkpoint)] text-[#8b7114]',
  default: 'bg-[var(--bg)] text-[var(--text-secondary)]',
};

export function Badge({ variant = 'default', children }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-0.5 rounded-full
        text-[11px] font-semibold tracking-[0.06em] uppercase
        ${variantStyles[variant]}
      `}
    >
      {children}
    </span>
  );
}
