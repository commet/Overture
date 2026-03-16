'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Layers, GitMerge, Map, Users, Settings, BookOpen } from 'lucide-react';

const sidebarItems = [
  { href: '/tools/decompose', label: '과제 분해', icon: Layers },
  { href: '/tools/synthesize', label: '산출물 합성', icon: GitMerge },
  { href: '/tools/orchestrate', label: '오케스트레이션 맵', icon: Map },
  { href: '/tools/persona-feedback', label: '페르소나 피드백', icon: Users },
  { href: '/guide', label: '사용 가이드', icon: BookOpen },
  { href: '/settings', label: '설정', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  if (pathname === '/') return null;

  return (
    <aside className="hidden lg:flex flex-col w-56 bg-[var(--surface)] border-r border-[var(--border)] p-3 shrink-0">
      <nav className="flex flex-col gap-0.5 mt-2">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors ${
                isActive
                  ? 'bg-[var(--primary)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg)]'
              }`}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
