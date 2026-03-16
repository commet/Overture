'use client';

import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { Persona } from '@/stores/types';
import { User, MessageSquare } from 'lucide-react';

interface PersonaCardProps {
  persona: Persona;
  onClick: () => void;
  selected?: boolean;
  selectable?: boolean;
  onSelect?: (selected: boolean) => void;
}

export function PersonaCard({ persona, onClick, selected, selectable, onSelect }: PersonaCardProps) {
  return (
    <Card
      hoverable
      className={`relative ${selected ? '!border-[var(--accent)] !bg-[var(--ai)]' : ''}`}
      onClick={selectable ? () => onSelect?.(!selected) : onClick}
    >
      {selectable && (
        <div className="absolute top-3 right-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={(e) => onSelect?.(e.target.checked)}
            onClick={(e) => e.stopPropagation()}
            className="w-4 h-4 accent-[var(--accent)]"
          />
        </div>
      )}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-[var(--bg)] flex items-center justify-center shrink-0">
          <User size={18} className="text-[var(--text-secondary)]" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-bold text-[var(--text-primary)] truncate">{persona.name || '이름 없음'}</h3>
          <p className="text-[13px] text-[var(--text-secondary)] truncate">{persona.role}</p>
          {persona.organization && (
            <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">{persona.organization}</p>
          )}
          <p className="text-[12px] text-[var(--text-secondary)] mt-2 line-clamp-2">
            {persona.priorities || '우선순위 미설정'}
          </p>
          {persona.feedback_logs.length > 0 && (
            <Badge variant="default">
              <MessageSquare size={10} /> {persona.feedback_logs.length}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
