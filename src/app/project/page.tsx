'use client';

import { useEffect } from 'react';
import { useProjectStore } from '@/stores/useProjectStore';
import { useReframeStore } from '@/stores/useReframeStore';
import { useRecastStore } from '@/stores/useRecastStore';
import { useSynthesizeStore } from '@/stores/useSynthesizeStore';
import { usePersonaStore } from '@/stores/usePersonaStore';
import { useJudgmentStore } from '@/stores/useJudgmentStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CopyButton } from '@/components/ui/CopyButton';
import { generateProjectBrief } from '@/lib/project-brief';
import { OutputSelector } from '@/components/ui/OutputSelector';
import { ExecutionReadiness } from '@/components/ui/ExecutionReadiness';
import Link from 'next/link';
import { Layers, Map, Users, FileText, RefreshCw, Check, Circle, ArrowRight, Download, Sparkles } from 'lucide-react';
import { useLocale } from '@/hooks/useLocale';

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
  const locale = useLocale();
  const L = (ko: string, en: string) => locale === 'ko' ? ko : en;
  const { projects, currentProjectId, loadProjects, setCurrentProjectId } = useProjectStore();
  const { items: reframeItems, loadItems: loadReframe } = useReframeStore();
  const { items: recastItems, loadItems: loadRecast } = useRecastStore();
  const { items: synthesizeItems, loadItems: loadSynthesize } = useSynthesizeStore();
  const { feedbackHistory, loadData: loadPersona } = usePersonaStore();
  const { judgments, loadJudgments, getUserPatterns } = useJudgmentStore();

  useEffect(() => {
    loadProjects();
    loadReframe();
    loadRecast();
    loadSynthesize();
    loadPersona();
    loadJudgments();
  }, [loadProjects, loadReframe, loadRecast, loadSynthesize, loadPersona, loadJudgments]);

  const currentProject = currentProjectId ? projects.find((p) => p.id === currentProjectId) : null;

  // Get items for current project
  const projectReframes = reframeItems.filter((d) => d.project_id === currentProjectId);
  const projectRecasts = recastItems.filter((o) => o.project_id === currentProjectId);
  const projectSyntheses = synthesizeItems.filter((s) => s.project_id === currentProjectId);
  const projectFeedbacks = feedbackHistory.filter((f) => f.project_id === currentProjectId);

  const getSteps = (): StepStatus[] => {
    const latestReframe = projectReframes[projectReframes.length - 1];
    const latestRecast = projectRecasts[projectRecasts.length - 1];
    const latestFeedback = projectFeedbacks[projectFeedbacks.length - 1];

    return [
      {
        tool: 'reframe',
        label: L('문제 재정의', 'Reframe'),
        icon: <Layers size={18} />,
        href: '/workspace?step=reframe',
        status: latestReframe?.status === 'done' ? 'done' : latestReframe ? 'in-progress' : 'not-started',
        summary: latestReframe?.selected_question || latestReframe?.analysis?.surface_task,
        color: 'text-[#2d4a7c]',
        bgColor: 'bg-[var(--ai)]',
      },
      {
        tool: 'recast',
        label: L('실행 설계', 'Recast'),
        icon: <Map size={18} />,
        href: '/workspace?step=recast',
        status: latestRecast?.status === 'done' ? 'done' : latestRecast ? 'in-progress' : 'not-started',
        summary: latestRecast?.analysis
          ? L(`${latestRecast.steps.length}단계 워크플로우`, `${latestRecast.steps.length}-step workflow`)
          : undefined,
        color: 'text-[#8b6914]',
        bgColor: 'bg-[var(--human)]',
      },
      {
        tool: 'rehearse',
        label: L('사전 검증', 'Rehearse'),
        icon: <Users size={18} />,
        href: '/workspace?step=rehearse',
        status: latestFeedback ? 'done' : 'not-started',
        summary: latestFeedback
          ? L(`${latestFeedback.results.length}명 피드백 완료`, `${latestFeedback.results.length} reviewer${latestFeedback.results.length === 1 ? '' : 's'} done`)
          : undefined,
        color: 'text-purple-700',
        bgColor: 'bg-purple-50',
      },
      {
        tool: 'synthesize',
        label: L('종합', 'Synthesize'),
        icon: <Sparkles size={18} />,
        href: '/workspace?step=synthesize',
        status: projectSyntheses.length > 0 ? 'done' : 'not-started',
        summary: projectSyntheses.length > 0
          ? L(`${projectSyntheses.length}건 종합 완료`, `${projectSyntheses.length} synthesis${projectSyntheses.length === 1 ? '' : 'es'} done`)
          : undefined,
        color: 'text-[#9b5de5]',
        bgColor: 'bg-[#f3ecff]',
      },
    ];
  };

  const steps = currentProject ? getSteps() : [];
  const completedSteps = steps.filter((s) => s.status === 'done').length;
  const nextStep = steps.find((s) => s.status !== 'done');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-[22px] font-bold text-[var(--text-primary)]">{L('프로젝트 오버뷰', 'Project Overview')}</h1>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1">
          {L('사고 프로세스의 전체 여정을 한눈에 확인합니다.', 'See your full thinking journey at a glance.')}
        </p>
      </div>

      {/* Project selector */}
      {!currentProject && (
        <div className="space-y-3">
          {projects.length === 0 ? (
            <Card className="text-center py-12">
              <FileText size={24} className="mx-auto text-[var(--text-secondary)] mb-3" />
              <p className="text-[14px] text-[var(--text-secondary)] font-medium">{L('아직 프로젝트가 없습니다', 'No projects yet')}</p>
              <p className="text-[12px] text-[var(--text-secondary)] mt-1 max-w-xs mx-auto">
                {L('워크스페이스에서 프로젝트를 만들면, 4단계 프로세스의 진행 상황을 여기서 한눈에 확인할 수 있습니다.', 'Create a project in your workspace and track the 4-stage process progress here at a glance.')}
              </p>
              <Link href="/workspace">
                <button className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-[var(--bg)] text-[13px] font-semibold hover:shadow-[var(--shadow-sm)] hover:-translate-y-[1px] active:translate-y-0 transition-all cursor-pointer">
                  {L('워크스페이스에서 시작하기', 'Start in workspace')} <ArrowRight size={14} />
                </button>
              </Link>
            </Card>
          ) : (
            <>
              <p className="text-[13px] font-semibold text-[var(--text-secondary)]">{L('프로젝트 선택', 'Select a project')}</p>
              {projects.map((project) => {
                const itemCount = project.refs.length;
                const dateStr = new Date(project.updated_at).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US');
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
                          {L(`${itemCount}개 항목`, `${itemCount} item${itemCount === 1 ? '' : 's'}`)} · {dateStr}
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
              {L('← 프로젝트 목록', '← Project list')}
            </button>
            <div className="flex gap-2">
              <CopyButton getText={() => generateProjectBrief(currentProject)} label={L('브리프 복사', 'Copy brief')} />
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
                <Download size={14} /> {L('다운로드', 'Download')}
              </Button>
            </div>
          </div>

          {/* Project header */}
          <Card>
            <h2 className="text-[18px] font-bold text-[var(--text-primary)]">{currentProject.name}</h2>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[12px] text-[var(--text-secondary)]">{L('진행률', 'Progress')}</span>
              <div className="flex-1 h-2 bg-[var(--border)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] rounded-full transition-all"
                  style={{ width: `${(completedSteps / steps.length) * 100}%` }}
                />
              </div>
              <span className="text-[12px] font-semibold text-[var(--accent)]">{completedSteps}/{steps.length}</span>
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
                      ? 'border-[var(--success)] bg-[var(--surface)]'
                      : step.status === 'in-progress'
                      ? 'border-[var(--accent)] bg-[var(--ai)]'
                      : 'border-[var(--border)] bg-[var(--surface)]'
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
                        {step.status === 'done' && <Badge variant="both">{L('완료', 'Done')}</Badge>}
                        {step.status === 'in-progress' && <Badge variant="ai">{L('진행 중', 'In progress')}</Badge>}
                      </div>
                      {step.summary ? (
                        <p className="text-[13px] text-[var(--text-secondary)] mt-1 truncate">{step.summary}</p>
                      ) : step.status === 'not-started' ? (
                        <p className="text-[13px] text-[var(--text-secondary)] mt-1 italic">{L('아직 시작 전', 'Not started')}</p>
                      ) : null}
                    </div>

                    <ArrowRight size={14} className="text-[var(--text-secondary)] mt-3 shrink-0" />
                  </div>
                </Link>
              </div>
            ))}
          </div>

          {/* Metacognition: 나의 판단 패턴 (Tier 1-E) */}
          {judgments.length > 0 && (() => {
            const patterns = getUserPatterns();
            const projectJudgments = judgments.filter(j => j.project_id === currentProjectId);
            const actorOverrides = projectJudgments.filter(j => j.type === 'actor_override');
            const toHuman = actorOverrides.filter(j => j.decision === 'human');
            const toAi = actorOverrides.filter(j => j.decision === 'ai');
            return (
              <Card className="!bg-[var(--bg)]">
                <h3 className="text-[14px] font-bold text-[var(--text-primary)] mb-3">{L('나의 판단 패턴', 'Your judgment patterns')}</h3>
                <div className="space-y-2 text-[12px] text-[var(--text-secondary)]">
                  <p>
                    {locale === 'ko' ? (
                      <>지금까지 <span className="font-bold text-[var(--text-primary)]">{patterns.totalJudgments}건</span>의 판단을 기록했습니다.</>
                    ) : (
                      <>You&apos;ve logged <span className="font-bold text-[var(--text-primary)]">{patterns.totalJudgments}</span> judgment{patterns.totalJudgments === 1 ? '' : 's'} so far.</>
                    )}
                  </p>
                  {patterns.overrideRate > 0 && (
                    <p>
                      {locale === 'ko' ? (
                        <>AI 제안을 <span className="font-bold text-[var(--text-primary)]">{Math.round(patterns.overrideRate * 100)}%</span> 수정했습니다
                          {toHuman.length > toAi.length ? ' — 주로 AI→사람으로 변경' : toAi.length > toHuman.length ? ' — 주로 사람→AI로 변경' : ''}.
                        </>
                      ) : (
                        <>You&apos;ve modified AI suggestions <span className="font-bold text-[var(--text-primary)]">{Math.round(patterns.overrideRate * 100)}%</span> of the time
                          {toHuman.length > toAi.length ? ' — mostly shifting AI→Human' : toAi.length > toHuman.length ? ' — mostly shifting Human→AI' : ''}.
                        </>
                      )}
                    </p>
                  )}
                  {projectJudgments.length > 0 && (
                    <p>
                      {locale === 'ko' ? (
                        <>이 프로젝트에서 <span className="font-bold text-[var(--text-primary)]">{projectJudgments.length}건</span>의 판단을 내렸습니다.</>
                      ) : (
                        <>You&apos;ve made <span className="font-bold text-[var(--text-primary)]">{projectJudgments.length}</span> judgment{projectJudgments.length === 1 ? '' : 's'} in this project.</>
                      )}
                    </p>
                  )}
                </div>
              </Card>
            );
          })()}

          {/* Similar project hint (Tier 1-E) */}
          {currentProject && (() => {
            const otherProjects = projects.filter(p => p.id !== currentProject.id && p.refs.length >= 2);
            if (otherProjects.length === 0) return null;
            const latestD = projectReframes[projectReframes.length - 1];
            if (!latestD?.analysis?.surface_task) return null;
            return (
              <div className="text-[12px] text-[var(--text-secondary)]">
                {otherProjects.length > 0 && (
                  <p>
                    {L(
                      `이전 프로젝트 ${otherProjects.length}건과 비교할 수 있습니다.`,
                      `You can compare against ${otherProjects.length} previous project${otherProjects.length === 1 ? '' : 's'}.`
                    )}
                  </p>
                )}
              </div>
            );
          })()}

          {/* Execution readiness */}
          <ExecutionReadiness projectId={currentProject.id} />

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
                  <p className="text-[13px] font-bold text-[var(--text-primary)]">{L(`다음 단계: ${nextStep.label}`, `Next step: ${nextStep.label}`)}</p>
                  <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                    {nextStep.tool === 'reframe' && L('숨겨진 전제를 찾고 진짜 질문을 정의합니다.', 'Find hidden assumptions and define the real question.')}
                    {nextStep.tool === 'recast' && L('AI와 사람의 역할을 설계합니다.', 'Design the split between AI and human roles.')}
                    {nextStep.tool === 'rehearse' && L('판단자의 예상 반응을 시뮬레이션합니다.', 'Simulate how decision-makers will react.')}
                    {nextStep.tool === 'refine' && L('피드백을 반영하여 최종본을 완성합니다.', 'Apply feedback and finalize the draft.')}
                  </p>
                  <Link href={nextStep.href}>
                    <Button size="sm" className="mt-2">
                      {L(`${nextStep.label} 시작`, `Start ${nextStep.label}`)} <ArrowRight size={12} />
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          )}

          {/* All done */}
          {completedSteps === steps.length && (
            <Card className="!bg-[var(--collab)] !border-green-200 text-center py-6">
              <Check size={24} className="mx-auto text-[var(--success)] mb-2" />
              <p className="text-[15px] font-bold text-[var(--success)]">{L('모든 단계를 완료했습니다', 'All steps complete')}</p>
              <p className="text-[12px] text-[#2d6b2d] mt-1">{L('프로젝트 브리프를 복사하거나 다운로드하세요.', 'Copy or download the project brief.')}</p>
              <div className="flex justify-center gap-2 mt-3">
                <CopyButton getText={() => generateProjectBrief(currentProject)} label={L('브리프 복사', 'Copy brief')} />
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
