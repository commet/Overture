type BadgeVariant = 'ai' | 'human' | 'both' | 'default' | 'checkpoint';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, string> = {
  ai: 'bg-[var(--ai)] text-[#2d4a7c] ring-1 ring-[#2d4a7c]/10',
  human: 'bg-[var(--human)] text-[#8b6914] ring-1 ring-[#8b6914]/10',
  both: 'bg-[var(--collab)] text-[#2d6b2d] ring-1 ring-[#2d6b2d]/10',
  checkpoint: 'bg-[var(--checkpoint)] text-[#8b7114] ring-1 ring-[#8b7114]/10',
  default: 'bg-[var(--bg)] text-[var(--text-secondary)] ring-1 ring-[var(--border)]',
};

export function Badge({ variant = 'default', children }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full
        text-[11px] font-semibold tracking-[0.04em]
        ${variantStyles[variant]}
      `}
    >
      {children}
    </span>
  );
}
