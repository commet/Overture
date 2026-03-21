import { HTMLAttributes, forwardRef } from 'react';

type CardVariant = 'default' | 'ai' | 'human' | 'checkpoint' | 'success' | 'danger' | 'muted' | 'elevated';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
  variant?: CardVariant;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-[var(--surface)] border-[var(--border-subtle)]',
  ai: 'bg-[var(--ai)] border-[var(--accent-light)]/15',
  human: 'bg-[var(--human)] border-[#8b6914]/10',
  checkpoint: 'bg-[var(--checkpoint)] border-amber-200',
  success: 'bg-[var(--collab)] border-green-200',
  danger: 'bg-red-50/50 border-red-200/50',
  muted: 'bg-[var(--bg)] border-[var(--border-subtle)]',
  elevated: 'bg-[var(--surface)] border-[var(--border-subtle)] border-t-[var(--accent-light)] border-t-2 shadow-[var(--shadow-md)]',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hoverable = false, variant = 'default', className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          border rounded-2xl p-4 md:p-6 shadow-xs
          ${variantStyles[variant]}
          ${hoverable ? 'transition-all duration-200 hover:border-[var(--border)] hover:-translate-y-1 hover:shadow-[var(--shadow-md)] cursor-pointer' : ''}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';
