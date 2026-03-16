'use client';

import { Card } from './Card';

interface Scenario {
  emoji: string;
  label: string;
  template: string;
}

interface ScenarioCardsProps {
  title: string;
  scenarios: Scenario[];
  onSelect: (template: string) => void;
}

export function ScenarioCards({ title, scenarios, onSelect }: ScenarioCardsProps) {
  return (
    <div>
      <p className="text-[13px] font-semibold text-[var(--text-secondary)] mb-2">{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {scenarios.map((scenario) => (
          <button
            key={scenario.label}
            onClick={() => onSelect(scenario.template)}
            className="flex items-start gap-2.5 p-3 rounded-xl border border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--ai)]/30 transition-all text-left cursor-pointer group"
          >
            <span className="text-[18px] mt-0.5 shrink-0">{scenario.emoji}</span>
            <div>
              <p className="text-[13px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent)]">{scenario.label}</p>
              <p className="text-[11px] text-[var(--text-secondary)] mt-0.5 line-clamp-2">{scenario.template.slice(0, 60)}...</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
