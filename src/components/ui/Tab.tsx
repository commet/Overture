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
    <div className="flex gap-0.5 bg-[var(--bg)]/60 p-1 rounded-xl overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onChange(tab.key)}
          className={`
            px-4 py-2 text-[13px] font-medium whitespace-nowrap rounded-lg
            transition-all duration-200  cursor-pointer
            ${
              activeKey === tab.key
                ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }
          `}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span className={`ml-1.5 text-[11px] px-1.5 py-0.5 rounded-full ${
              activeKey === tab.key ? 'bg-[var(--bg)]' : 'bg-[var(--surface)]'
            }`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
