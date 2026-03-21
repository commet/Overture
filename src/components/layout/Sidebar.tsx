'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useProjectStore } from '@/stores/useProjectStore';
import { usePersonaStore } from '@/stores/usePersonaStore';
import { Layers, Map, Users, Settings, BookOpen, FolderOpen, RefreshCw, User } from 'lucide-react';

const processSteps = [
  { step: 'decompose', label: '악보 해석', subtitle: '문제 재정의', icon: Layers, color: '#2d4a7c' },
  { step: 'orchestrate', label: '편곡', subtitle: '실행 설계', icon: Map, color: '#8b6914' },
  { step: 'persona-feedback', label: '리허설', subtitle: '사전 검증', icon: Users, color: '#6b4c9a' },
  { step: 'refinement-loop', label: '합주 연습', subtitle: '피드백 반영', icon: RefreshCw, color: '#2d6b2d' },
];

const utilityItems = [
  { href: '/project', label: '프로젝트', icon: FolderOpen },
  { href: '/teams', label: '팀', icon: Users },
  { href: '/guide', label: '사용 가이드', icon: BookOpen },
  { href: '/settings', label: '설정', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { projects, currentProjectId, loadProjects } = useProjectStore();
  const { personas, loadData: loadPersonas } = usePersonaStore();

  useEffect(() => {
    loadProjects();
    loadPersonas();
  }, [loadProjects, loadPersonas]);

  const currentProject = currentProjectId ? projects.find(p => p.id === currentProjectId) : null;

  // Hide on landing, demo, login
  if (pathname === '/' || pathname === '/demo' || pathname === '/login' || pathname.startsWith('/auth')) return null;

  // Determine which step is active (from workspace URL or tool page path)
  const activeStep = pathname.startsWith('/tools/')
    ? pathname.replace('/tools/', '')
    : null;

  return (
    <aside className="hidden lg:flex flex-col w-56 bg-[var(--surface)]/60 backdrop-blur-sm border-r border-[var(--border-subtle)] shrink-0 overflow-y-auto">
      {/* Current project */}
      {currentProject && (
        <div className="px-3 pt-4 pb-2">
          <div className="flex items-center gap-2 text-[var(--accent)]">
            <FolderOpen size={12} />
            <span className="text-[10px] font-bold uppercase tracking-wider">프로젝트</span>
          </div>
          <p className="text-[13px] font-semibold text-[var(--text-primary)] mt-1 truncate">
            {currentProject.name}
          </p>
        </div>
      )}

      {/* Process steps — primary navigation */}
      <nav className="px-2 py-3 space-y-0.5">
        <p className="px-2 text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
          프로세스
        </p>
        {processSteps.map((item) => {
          const Icon = item.icon;
          const isActive = activeStep === item.step;
          return (
            <Link
              key={item.step}
              href={`/workspace?step=${item.step}`}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-200 ${
                isActive
                  ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border-subtle)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg)]'
              }`}
              style={isActive ? { borderLeft: `2px solid ${item.color}` } : undefined}
            >
              <Icon size={16} strokeWidth={isActive ? 2 : 1.5} style={isActive ? { color: item.color } : undefined} />
              <div className="flex items-baseline gap-1.5">
                <span className="font-medium">{item.label}</span>
                <span className={`text-[10px] ${isActive ? 'text-[var(--text-tertiary)]' : 'text-[var(--text-tertiary)]'}`}>
                  {item.subtitle}
                </span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Personas */}
      {personas.length > 0 && (
        <div className="px-3 py-2 border-t border-[var(--border-subtle)]">
          <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-2">
            페르소나
          </p>
          <div className="space-y-0.5">
            {personas.slice(0, 4).map((p) => (
              <Link
                key={p.id}
                href="/workspace?step=persona-feedback"
                className="flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg)] transition-colors"
              >
                <div className="w-5 h-5 rounded-full bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center shrink-0">
                  <User size={10} />
                </div>
                <span className="truncate">{p.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Utility links */}
      <div className="mt-auto px-2 py-3 border-t border-[var(--border-subtle)]">
        {utilityItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-[var(--surface)] text-[var(--text-primary)] shadow-sm border border-[var(--border-subtle)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg)]'
              }`}
            >
              <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
