'use client';

import Link from 'next/link';
import { Button } from './Button';
import { Card } from './Card';
import { ArrowRight, Layers, Map, GitMerge, Users, RefreshCw, FileText } from 'lucide-react';

interface NextStepOption {
  href: string;
  icon: React.ReactNode;
  label: string;
  reason: string;
  primary?: boolean;
}

interface NextStepGuideProps {
  currentTool: 'decompose' | 'synthesize' | 'orchestrate' | 'persona-feedback';
  projectId?: string;
  hasDecompose?: boolean;
  hasOrchestrate?: boolean;
  hasSynthesize?: boolean;
  hasPersonaFeedback?: boolean;
  onSendTo?: (tool: string) => void;
}

export function NextStepGuide({
  currentTool,
  projectId,
  hasDecompose,
  hasOrchestrate,
  hasSynthesize,
  hasPersonaFeedback,
  onSendTo,
}: NextStepGuideProps) {
  const options: NextStepOption[] = [];

  if (currentTool === 'decompose') {
    options.push({
      href: '/tools/orchestrate',
      icon: <Map size={16} />,
      label: '워크플로우 설계',
      reason: '발견한 질문을 해결할 AI/사람 역할 분배와 단계별 계획을 세우세요.',
      primary: true,
    });
    if (!hasPersonaFeedback) {
      options.push({
        href: '/tools/persona-feedback',
        icon: <Users size={16} />,
        label: '이해관계자 검증',
        reason: '과제 방향이 맞는지 주요 이해관계자 시점에서 먼저 확인해보세요.',
      });
    }
  }

  if (currentTool === 'orchestrate') {
    options.push({
      href: '/tools/persona-feedback',
      icon: <Users size={16} />,
      label: '이해관계자 검증',
      reason: '워크플로우를 실행하기 전에, 주요 이해관계자가 이 계획에 동의할지 확인하세요.',
      primary: true,
    });
    if (!hasSynthesize) {
      options.push({
        href: '/tools/synthesize',
        icon: <GitMerge size={16} />,
        label: '결과물 합성',
        reason: '여러 소스의 결과를 비교하고 하나의 판단을 내려야 한다면.',
      });
    }
  }

  if (currentTool === 'synthesize') {
    options.push({
      href: '/tools/persona-feedback',
      icon: <Users size={16} />,
      label: '이해관계자 검증',
      reason: '합성된 판단을 보고하기 전에, 이해관계자 반응을 미리 확인하세요.',
      primary: true,
    });
    if (!hasOrchestrate) {
      options.push({
        href: '/tools/orchestrate',
        icon: <Map size={16} />,
        label: '실행 계획 설계',
        reason: '판단이 내려졌으니, 이를 실행할 워크플로우를 설계하세요.',
      });
    }
  }

  if (currentTool === 'persona-feedback') {
    options.push({
      href: '/tools/refinement-loop',
      icon: <RefreshCw size={16} />,
      label: '정제 루프 시작',
      reason: '피드백의 우려사항을 반영하여 반복 개선하세요. 수렴할 때까지.',
      primary: true,
    });
    if (!hasDecompose) {
      options.push({
        href: '/tools/decompose',
        icon: <Layers size={16} />,
        label: '과제 재분해',
        reason: '피드백을 바탕으로 과제의 방향을 재검토하세요.',
      });
    }
  }

  // Always show project overview if project exists
  if (projectId) {
    options.push({
      href: '/project',
      icon: <FileText size={16} />,
      label: '프로젝트 오버뷰',
      reason: '전체 사고 과정을 한눈에 확인하고 프로젝트 브리프를 생성하세요.',
    });
  }

  if (options.length === 0) return null;

  return (
    <Card className="!bg-[var(--bg)] !border-[var(--border)]">
      <p className="text-[12px] font-bold text-[var(--text-secondary)] mb-3">다음 단계</p>
      <div className="space-y-2">
        {options.map((option, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:border-[var(--accent)] hover:bg-white ${
              option.primary ? 'border-[var(--accent)] bg-white shadow-sm' : 'border-[var(--border)]'
            }`}
            onClick={() => {
              if (onSendTo && option.primary) {
                onSendTo(option.href);
              }
            }}
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
              option.primary ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg)] text-[var(--text-secondary)]'
            }`}>
              {option.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-[var(--text-primary)]">{option.label}</span>
                {option.primary && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent)] text-white font-semibold">추천</span>
                )}
              </div>
              <p className="text-[12px] text-[var(--text-secondary)] mt-0.5 leading-relaxed">{option.reason}</p>
            </div>
            <Link href={option.href} className="shrink-0 mt-1">
              <ArrowRight size={14} className="text-[var(--text-secondary)] hover:text-[var(--accent)]" />
            </Link>
          </div>
        ))}
      </div>
    </Card>
  );
}
