'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-[var(--primary)] text-white shadow-sm hover:shadow-md hover:brightness-110',
  secondary:
    'bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] shadow-xs hover:border-[var(--border)]  hover:shadow-sm hover:bg-[var(--bg)]',
  ghost:
    'border border-dashed border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--ai)]/30',
  danger:
    'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 hover:shadow-sm',
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
          active:scale-[0.97] active:shadow-none
          disabled:opacity-40 disabled:pointer-events-none disabled:shadow-none
          cursor-pointer
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
