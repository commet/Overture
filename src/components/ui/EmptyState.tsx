import { Button } from './Button';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-14 h-14 rounded-2xl bg-[var(--bg)] flex items-center justify-center mx-auto mb-4">
        <Icon size={24} className="text-[var(--text-secondary)]" />
      </div>
      <h3 className="text-[16px] font-bold text-[var(--text-primary)] mb-1">{title}</h3>
      <p className="text-[13px] text-[var(--text-secondary)] max-w-sm mx-auto mb-4">{description}</p>
      {action && (
        <Button onClick={action.onClick} size="sm">
          {action.label}
        </Button>
      )}
    </div>
  );
}
