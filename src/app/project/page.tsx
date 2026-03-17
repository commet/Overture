'use client';

import { useEffect, useState } from 'react';
import { useProjectStore } from '@/stores/useProjectStore';
import { useDecomposeStore } from '@/stores/useDecomposeStore';
import { useOrchestrateStore } from '@/stores/useOrchestrateStore';
import { useSynthesizeStore } from '@/stores/useSynthesizeStore';
import { usePersonaStore } from '@/stores/usePersonaStore';
import { useRefinementStore } from '@/stores/useRefinementStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CopyButton } from '@/components/ui/CopyButton';
import { generateProjectBrief } from '@/lib/project-brief';
import { OutputSelector } from '@/components/ui/OutputSelector';
import type { Project, DecomposeItem, OrchestrateItem, SynthesizeItem, FeedbackRecord } from '@/stores/types';
import Link from 'next/link';
import { Layers, Map, GitMerge, Users, FileText, RefreshCw, Check, Circle, ArrowRight, Download } from 'lucide-react';

interface StepStatus {
  tool: string;
  label: string;
  icon: React.ReactNode;
  href: string;
  status: 'done' | 'in-progress' | 'not-started';
  summary?: string;
  color: string;
  bgColor: string;
}

export default function ProjectPage() {
  const { projects, currentProjectId, loadProjects, setCurrentProjectId } = useProjectStore();
  const { items: decomposeItems, loadItems: loadDecompose } = useDecomposeStore();
  const { items: orchestrateItems, loadItems: loadOrchestrate } = useOrchestrateStore();
  const { items: synthesizeItems, loadItems: loadSynthesize } = useSynthesizeStore();
  const { feedbackHistory, loadData: loadPersona } = usePersonaStore();
  const { loops, loadLoops } = useRefinementStore();

  useEffect(() => {
    loadProjects();
    loadDecompose();
    loadOrchestrate();
    loadSynthesize();
    loadPersona();
    loadLoops();
  }, [loadProjects, loadDecompose, loadOrchestrate, loadSynthesize, loadPersona, loadLoops]);

  const currentProject = currentProjectId ? projects.find((p) => p.id === currentProjectId) : null;

  // Get items for current project
  const projectDecompositions = decomposeItems.filter((d) => d.project_id === currentProjectId);
  const projectOrchestrations = orchestrateItems.filter((o) => o.project_id === currentProjectId);
  const projectSyntheses = synthesizeItems.filter((s) => s.project_id === currentProjectId);
  const projectFeedbacks = feedbackHistory.filter((f) => f.project_id === currentProjectId);
  const projectLoops = loops.filter((l) => l.project_id === currentProjectId);

  const getSteps = (): StepStatus[] => {
    const latestDecompose = projectDecompositions[projectDecompositions.length - 1];
    const latestOrchestrate = projectOrchestrations[projectOrchestrations.length - 1];
    const latestSynthesize = projectSyntheses[projectSyntheses.length - 1];
    const latestFeedback = projectFeedbacks[projectFeedbacks.length - 1];

    return [
      {
        tool: 'decompose',
        label: '질문',
        icon: <Layers size={18} />,
        href: '/tools/decompose',
        status: latestDecompose?.status === 'done' ? 'done' : latestDecompose ? 'in-progress' : 'not-started',
        summary: latestDecompose?.selected_question || latestDecompose?.analysis?.surface_task,
        color: 'text-[#2d4a7c]',
        bgColor: 'bg-[var(--ai)]',
      },
      {
        tool: 'orchestrate',
        label: '설계',
        icon: <Map size={18} />,
        href: '/tools/orchestrate',
        status: latestOrchestrate?.status === 'done' ? 'done' : latestOrchestrate ? 'in-progress' : 'not-started',
        summary: latestOrchestrate?.analysis ? `${latestOrchestrate.steps.length}단계 워크플로우` : undefined,
        color: 'text-[#8b6914]',
        bgColor: 'bg-[var(--human)]',
      },
      {
        tool: 'synthesize',
        label: '판단',
        icon: <GitMerge size={18} />,
        href: '/tools/synthesize',
        status: latestSynthesize?.status === 'done' ? 'done' : latestSynthesize ? 'in-progress' : 'not-started',
        summary: latestSynthesize?.final_synthesis?.slice(0, 60),
        color: 'text-[#2d6b2d]',
        bgColor: 'bg-[var(--collab)]',
      },
      {
        tool: 'persona-feedback',
        label: '검증',
        icon: <Users size={18} />,
        href: '/tools/persona-feedback',
        status: latestFeedback ? 'done' : 'not-started',
        summary: latestFeedback ? `${latestFeedback.results.length}명 피드백 완료` : undefined,
        color: 'text-purple-700',
        bgColor: 'bg-purple-50',
      },
    ];
  };

  const steps = currentProject ? getSteps() : [];
  const completedSteps = steps.filter((s) => s.status === 'done').length;
  const nextStep = steps.find((s) => s.status !== 'done');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-bold text-[var(--text-primary)]">프로젝트 오버뷰</h1>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1">
          사고 프로세스의 전체 여정을 한눈에 확인합니다.
        </p>
      </div>

      {/* Project selector */}
      {!currentProject && (
        <div className="space-y-3">
          {projects.length === 0 ? (
            <Card className="text-center py-12">
              <FileText size={24} className="mx-auto text-[var(--text-secondary)] mb-3" />
              <p className="text-[14px] text-[var(--text-secondary)]">아직 프로젝트가 없습니다.</p>
              <p className="text-[12px] text-[var(--text-secondary)] mt-1">도구를 사용하고 &ldquo;보내기&rdquo;를 하면 자동으로 프로젝트가 생성됩니다.</p>
            </Card>
          ) : (
            <>
              <p className="text-[13px] font-semibold text-[var(--text-secondary)]">프로젝트 선택</p>
              {projects.map((project) => {
                const itemCount = project.refs.length;
                return (
                  <Card
                    key={project.id}
                    hoverable
                    onClick={() => setCurrentProjectId(project.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-[15px] font-bold text-[var(--text-primary)]">{project.name}</h3>
                        <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                          {itemCount}개 항목 · {new Date(project.updated_at).toLocaleDateString('ko-KR')}
                        </p>
                      </div>
                      <ArrowRight size={16} className="text-[var(--text-secondary)]" />
                    </div>
                  </Card>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* Project detail */}
      {currentProject && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <button onClick={() => setCurrentProjectId(null)} className="text-[12px] text-[var(--accent)] hover:underline cursor-pointer">
              ← 프로젝트 목록
            </button>
            <div className="flex gap-2">
              <CopyButton getText={() => generateProjectBrief(currentProject)} label="브리프 복사" />
              <Button variant="secondary" size="sm" onClick={() => {
                const brief = generateProjectBrief(currentProject);
                const blob = new Blob([brief], { type: 'text/markdown' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${currentProject.name}-brief.md`;
                a.click();
                URL.revokeObjectURL(url);
              }}>
                <Download size={14} /> 다운로드
              </Button>
            </div>
          </div>

          {/* Project header */}
          <Card>
            <h2 className="text-[18px] font-bold text-[var(--text-primary)]">{currentProject.name}</h2>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[12px] text-[var(--text-secondary)]">진행률</span>
              <div className="flex-1 h-2 bg-[var(--border)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] rounded-full transition-all"
                  style={{ width: `${(completedSteps / 4) * 100}%` }}
                />
              </div>
              <span className="text-[12px] font-semibold text-[var(--accent)]">{completedSteps}/4</span>
            </div>
          </Card>

          {/* Steps journey */}
          <div className="space-y-0">
            {steps.map((step, i) => (
              <div key={step.tool}>
                {/* Connector */}
                {i > 0 && (
                  <div className="flex justify-start ml-[19px]">
                    <div className={`w-0.5 h-4 ${step.status !== 'not-started' || steps[i - 1].status !== 'not-started' ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`} />
                  </div>
                )}

                <Link href={step.href}>
                  <div className={`flex items-start gap-4 p-4 rounded-xl border transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${
                    step.status === 'done'
                      ? 'border-[var(--success)] bg-white'
                      : step.status === 'in-progress'
                      ? 'border-[var(--accent)] bg-[var(--ai)]'
                      : 'border-[var(--border)] bg-white'
                  }`}>
                    {/* Status icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      step.status === 'done'
                        ? 'bg-[var(--collab)] text-[var(--success)]'
                        : step.status === 'in-progress'
                        ? `${step.bgColor} ${step.color}`
                        : 'bg-[var(--bg)] text-[var(--text-secondary)]'
                    }`}>
                      {step.status === 'done' ? <Check size={18} /> : step.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-[var(--text-secondary)]">STEP {i + 1}</span>
                        <h3 className="text-[15px] font-bold text-[var(--text-primary)]">{step.label}</h3>
                        {step.status === 'done' && <Badge variant="both">완료</Badge>}
                        {step.status === 'in-progress' && <Badge variant="ai">진행 중</Badge>}
                      </div>
                      {step.summary ? (
                        <p className="text-[13px] text-[var(--text-secondary)] mt-1 truncate">{step.summary}</p>
                      ) : step.status === 'not-started' ? (
                        <p className="text-[13px] text-[var(--text-secondary)] mt-1 italic">아직 시작하지 않음</p>
                      ) : null}
                    </div>

                    <ArrowRight size={14} className="text-[var(--text-secondary)] mt-3 shrink-0" />
                  </div>
                </Link>
              </div>
            ))}
          </div>

          {/* Refinement loops */}
          {projectLoops.length > 0 && (
            <div>
              <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                <RefreshCw size={14} className="text-[var(--accent)]" /> 정제 루프
              </h3>
              {projectLoops.map((loop) => (
                <Link key={loop.id} href="/tools/refinement-loop">
                  <Card hoverable className="!p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[13px] font-semibold">{loop.name}</span>
                        <span className="text-[11px] text-[var(--text-secondary)] ml-2">
                          {loop.iterations.length}회 반복 · 수렴률 {Math.round((loop.iterations[loop.iterations.length - 1]?.convergence_score || 0) * 100)}%
                        </span>
                      </div>
                      <Badge variant={loop.status === 'converged' ? 'both' : loop.status === 'active' ? 'ai' : 'default'}>
                        {loop.status === 'converged' ? '수렴' : loop.status === 'active' ? '진행' : '중단'}
                      </Badge>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {/* Output formats */}
          <OutputSelector project={currentProject} />

          {/* Next step guide */}
          {nextStep && (
            <Card className="!bg-[var(--checkpoint)] !border-amber-200">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <ArrowRight size={14} className="text-amber-700" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-bold text-[var(--text-primary)]">다음 단계: {nextStep.label}</p>
                  <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                    {nextStep.tool === 'decompose' && '과제의 진짜 질문을 찾아보세요.'}
                    {nextStep.tool === 'orchestrate' && '발견한 질문을 해결할 워크플로우를 설계하세요.'}
                    {nextStep.tool === 'synthesize' && '여러 결과를 비교하고 하나의 판단을 내리세요.'}
                    {nextStep.tool === 'persona-feedback' && '이해관계자 시점에서 결과물을 검증하세요.'}
                  </p>
                  <Link href={nextStep.href}>
                    <Button size="sm" className="mt-2">
                      {nextStep.label} 시작 <ArrowRight size={12} />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          )}

          {/* All done */}
          {completedSteps === 4 && (
            <Card className="!bg-[var(--collab)] !border-green-200 text-center py-6">
              <Check size={24} className="mx-auto text-[var(--success)] mb-2" />
              <p className="text-[15px] font-bold text-[var(--success)]">모든 단계를 완료했습니다</p>
              <p className="text-[12px] text-[#2d6b2d] mt-1">프로젝트 브리프를 복사하거나 다운로드하세요.</p>
              <div className="flex justify-center gap-2 mt-3">
                <CopyButton getText={() => generateProjectBrief(currentProject)} label="브리프 복사" />
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
