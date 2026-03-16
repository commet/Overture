'use client';

interface TabItem {
  key: string;
  label: string;
  count?: number;
}

interface TabProps {
  tabs: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
}

export function Tab({ tabs, activeKey, onChange }: TabProps) {
  return (
    <div className="flex gap-1 border-b border-[var(--border)] overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`
            px-4 py-2.5 text-[14px] font-medium whitespace-nowrap transition-all duration-200 cursor-pointer
            border-b-[2.5px] -mb-px
            ${
              activeKey === tab.key
                ? 'border-[var(--primary)] text-[var(--text-primary)] opacity-100'
                : 'border-transparent text-[var(--text-secondary)] opacity-60 hover:opacity-80'
            }
          `}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className="ml-1.5 text-[11px] bg-[var(--bg)] px-1.5 py-0.5 rounded-full">
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
