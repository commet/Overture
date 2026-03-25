'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-[var(--primary)] text-[var(--bg)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] hover:-translate-y-[1px]',
  accent:
    'text-white shadow-[var(--shadow-md)] hover:shadow-[var(--glow-gold-intense)] hover:-translate-y-[1px]',
  secondary:
    'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)] hover:border-[var(--accent-light)]/40 hover:bg-[var(--bg)]',
  ghost:
    'border border-dashed border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--gold-muted)] hover:shadow-[var(--glow-accent)]',
  danger:
    'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:shadow-[var(--shadow-sm)]',
};

const sizeStyles: Record<string, string> = {
  sm: 'px-3.5 py-1.5 text-[13px] rounded-lg',
  md: 'px-5 py-2.5 text-[14px] rounded-xl',
  lg: 'px-7 py-3 text-[15px] rounded-xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center gap-2 font-semibold
          transition-all duration-200
          active:scale-[0.97] active:shadow-none active:translate-y-0
          disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none
          cursor-pointer
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        style={variant === 'accent' ? { background: 'var(--gradient-gold)', ...props.style } : props.style}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
