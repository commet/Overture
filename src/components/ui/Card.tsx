import { HTMLAttributes, forwardRef } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ hoverable = false, className = '', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          bg-[var(--surface)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-6
          shadow-[var(--shadow-xs)]
          ${hoverable ? 'transition-all duration-300 ease-[var(--ease-spring)] hover:border-[var(--accent)]/40 hover:-translate-y-1 hover:shadow-[var(--shadow-md)] cursor-pointer' : ''}
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
