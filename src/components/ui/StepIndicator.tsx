interface StepIndicatorProps {
  number: number;
  title: string;
  description?: string;
  isLast?: boolean;
}

export function StepIndicator({ number, title, description, isLast = false }: StepIndicatorProps) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-[13px] font-bold shrink-0">
          {number}
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-[var(--border)] mt-2" />
        )}
      </div>
      <div className="pb-6">
        <h3 className="text-[16px] font-bold text-[var(--text-primary)]">{title}</h3>
        {description && (
          <p className="text-[13px] text-[var(--text-secondary)] mt-1">{description}</p>
        )}
      </div>
    </div>
  );
}
