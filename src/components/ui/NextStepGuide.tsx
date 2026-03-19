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
      reason: '숨겨진 질문을 찾았습니다. 이제 이 질문에 답하는 실행 계획을 설계하세요. 발견한 전제와 가설이 편곡의 기초가 됩니다.',
      primary: true,
    });
  }

  // 편곡 → 리허설
  if (currentTool === 'orchestrate') {
    options.push({
      href: '/tools/persona-feedback',
      icon: <Users size={16} />,
      label: '리허설로',
      reason: '실행 설계가 완성되었습니다. 이제 이해관계자 앞에서 연주해보세요. 핵심 가정이 맞는지, 놓친 리스크가 없는지 검증합니다.',
      primary: true,
    });
  }

  // 리허설 → 합주 연습
  if (currentTool === 'persona-feedback') {
    options.push({
      href: '/tools/refinement-loop',
      icon: <RefreshCw size={16} />,
      label: '합주 연습으로',
      reason: '이해관계자의 반응을 확인했습니다. 지적 사항을 제약조건으로 변환하여, 하모니가 맞을 때까지 반복 개선하세요.',
      primary: true,
    });
  }

  // 합주 연습 → 공연(산출물) 또는 다시 리허설
  if (currentTool === 'refinement-loop') {
    options.push({
      href: '/project',
      icon: <FileText size={16} />,
      label: '공연 — 무대에 올리기',
      reason: '하모니가 맞았습니다. 사고의 궤적이 담긴 산출물을 생성하세요.',
      primary: true,
    });
    options.push({
      href: '/tools/persona-feedback',
      icon: <Users size={16} />,
      label: '리허설 다시',
      reason: '수정한 내용이 이해관계자의 우려를 해소했는지 다시 검증합니다.',
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
