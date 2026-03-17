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
          bg-[var(--surface)] border border-[#eceef4] rounded-2xl p-6
          shadow-xs
          ${hoverable ? 'transition-all duration-300  hover:border-[var(--accent)]/40 hover:-translate-y-1 hover:shadow-md cursor-pointer' : ''}
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
