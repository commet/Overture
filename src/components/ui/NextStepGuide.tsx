'use client';

import Link from 'next/link';
import { Card } from './Card';
import { ArrowRight, Layers, Map, Users, RefreshCw, FileText } from 'lucide-react';

interface NextStepOption {
  href: string;
  icon: React.ReactNode;
  label: string;
  reason: string;
  primary?: boolean;
}

interface NextStepGuideProps {
  currentTool: 'decompose' | 'orchestrate' | 'persona-feedback' | 'refinement-loop';
  projectId?: string;
  onSendTo?: (tool: string) => void;
}

export function NextStepGuide({
  currentTool,
  projectId,
  onSendTo,
}: NextStepGuideProps) {
  const options: NextStepOption[] = [];

  // 악보 해석 → 편곡
  if (currentTool === 'decompose') {
    options.push({
      href: '/tools/orchestrate',
      icon: <Map size={16} />,
      label: '편곡으로',
      reason: '발견한 질문을 해결할 AI/사람 역할 분배와 워크플로우를 설계하세요.',
      primary: true,
    });
  }

  // 편곡 → 리허설
  if (currentTool === 'orchestrate') {
    options.push({
      href: '/tools/persona-feedback',
      icon: <Users size={16} />,
      label: '리허설로',
      reason: '설계한 워크플로우를 이해관계자 시점에서 검증하세요.',
      primary: true,
    });
  }

  // 리허설 → 합주 연습
  if (currentTool === 'persona-feedback') {
    options.push({
      href: '/tools/refinement-loop',
      icon: <RefreshCw size={16} />,
      label: '합주 연습으로',
      reason: '피드백의 우려사항을 반영하고, 수렴할 때까지 반복하세요.',
      primary: true,
    });
  }

  // 합주 연습 → 공연(산출물) 또는 다시 리허설
  if (currentTool === 'refinement-loop') {
    options.push({
      href: '/project',
      icon: <FileText size={16} />,
      label: '공연 — 산출물 생성',
      reason: '수렴이 완료되었다면 최종 산출물을 생성하세요.',
      primary: true,
    });
    options.push({
      href: '/tools/persona-feedback',
      icon: <Users size={16} />,
      label: '리허설 다시',
      reason: '수정한 내용을 이해관계자에게 다시 검증받으세요.',
    });
  }

  // 항상 프로젝트 오버뷰 표시 (현재 도구가 refinement-loop이 아닐 때만)
  if (projectId && currentTool !== 'refinement-loop') {
    options.push({
      href: '/project',
      icon: <FileText size={16} />,
      label: '프로젝트 오버뷰',
      reason: '전체 사고 과정을 한눈에 확인하고 산출물을 생성하세요.',
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
