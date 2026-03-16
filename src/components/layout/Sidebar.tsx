'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useProjectStore } from '@/stores/useProjectStore';
import { Layers, GitMerge, Map, Users, Settings, BookOpen, FolderOpen, RefreshCw } from 'lucide-react';

const sidebarItems = [
  { href: '/project', label: '프로젝트', icon: FolderOpen },
  { href: '/tools/decompose', label: '과제 분해', icon: Layers },
  { href: '/tools/synthesize', label: '산출물 합성', icon: GitMerge },
  { href: '/tools/orchestrate', label: '오케스트레이션 맵', icon: Map },
  { href: '/tools/persona-feedback', label: '페르소나 피드백', icon: Users },
  { href: '/tools/refinement-loop', label: '정제 루프', icon: RefreshCw },
  { href: '/guide', label: '사용 가이드', icon: BookOpen },
  { href: '/settings', label: '설정', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { projects, currentProjectId, loadProjects } = useProjectStore();

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const currentProject = currentProjectId ? projects.find(p => p.id === currentProjectId) : null;

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

      {currentProject && (
        <div className="mt-auto pt-4 border-t border-[var(--border)]">
          <div className="flex items-center gap-2 px-3 mb-2">
            <FolderOpen size={13} className="text-[var(--accent)]" />
            <span className="text-[11px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">프로젝트</span>
          </div>
          <p className="px-3 text-[13px] font-semibold text-[var(--text-primary)] mb-2 truncate">
            {currentProject.name}
          </p>
          <div className="space-y-0.5 px-1">
            {currentProject.refs.map((ref) => {
              const toolLabels: Record<string, string> = {
                'decompose': '과제 분해',
                'synthesize': '산출물 합성',
                'orchestrate': '오케스트레이션',
                'persona-feedback': '페르소나 피드백',
              };
              const toolHrefs: Record<string, string> = {
                'decompose': '/tools/decompose',
                'synthesize': '/tools/synthesize',
                'orchestrate': '/tools/orchestrate',
                'persona-feedback': '/tools/persona-feedback',
              };
              return (
                <Link
                  key={ref.itemId}
                  href={toolHrefs[ref.tool]}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[12px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg)] transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                  <span className="truncate">{toolLabels[ref.tool]}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}
