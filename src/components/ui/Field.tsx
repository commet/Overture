'use client';

import { TextareaHTMLAttributes, forwardRef } from 'react';

interface FieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
}

export const Field = forwardRef<HTMLTextAreaElement, FieldProps>(
  ({ label, hint, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-[14px] font-semibold text-[var(--text-primary)]">
            {label}
          </label>
        )}
        {hint && (
          <p className="text-[12px] text-[var(--text-secondary)]">{hint}</p>
        )}
        <textarea
          ref={ref}
          className={`
            w-full bg-[#fafbfc] border-[1.5px] border-[var(--border)] rounded-[10px]
            px-3.5 py-3 text-[15px] leading-[1.7] text-[var(--text-primary)]
            placeholder:text-[var(--text-secondary)] placeholder:text-[14px]
            focus:outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_rgba(74,111,165,0.08)]
            resize-none transition-all duration-200
            ${className}
          `}
          rows={3}
          {...props}
        />
      </div>
    );
  }
);

Field.displayName = 'Field';
