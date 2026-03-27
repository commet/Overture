'use client';

import React, { useEffect, useState } from 'react';
import { track, trackError } from '@/lib/analytics';
import Link from 'next/link';
import { useReframeStore } from '@/stores/useReframeStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ShareBar } from '@/components/ui/ShareBar';
import { reframeToMarkdown } from '@/lib/export';
import { callLLMJson, callLLMStream, parseJSON } from '@/lib/llm';
import type { ReframeAnalysis, ReframeItem, ReframeHiddenQuestion, HiddenAssumption } from '@/stores/types';
import { StepEntry } from '@/components/ui/StepEntry';
import { LoadingSteps } from '@/components/ui/LoadingSteps';
import { useHandoffStore } from '@/stores/useHandoffStore';
import { useProjectStore } from '@/stores/useProjectStore';
import { useJudgmentStore } from '@/stores/useJudgmentStore';
import { buildEnhancedSystemPrompt } from '@/lib/context-builder';
import { findSimilarItems } from '@/lib/similarity';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { playSuccessTone, resumeAudioContext } from '@/lib/audio';
import { NextStepGuide } from '@/components/ui/NextStepGuide';
import { FileText, Trash2, Check, Pencil, Brain, AlertTriangle, ArrowRight, RotateCcw, Send, Loader2 } from 'lucide-react';
import { StaffLines, BarLine } from '@/components/ui/MusicalElements';
import { buildReframeContext, extractInterviewSignals } from '@/lib/context-chain';
import { selectReframingStrategy, applyReframingStrategy, STRATEGY_LABELS, type ReframingStrategy } from '@/lib/reframing-strategy';
import type { InterviewSignals } from '@/stores/types';
import type { EntryStep } from '@/components/ui/StepEntry';
import { recordReframeEval, getBestStrategy } from '@/lib/eval-engine';
import { applyPromptMutations } from '@/lib/prompt-mutation';
import { ConcertmasterInline } from '@/components/workspace/ConcertmasterInline';
import { t } from '@/lib/i18n';
import { recordSignal } from '@/lib/signal-recorder';

/* ───────────────────────────────────────────
   System Prompt
   ─────────────────────────────────────────── */

/* ── Stage 1: 전제 도출 프롬프트 (가설 기반 사고) ── */
const ASSUMPTION_PROMPT = `당신은 전략기획 전문가입니다. 주어진 과제의 숨겨진 전제를 찾으세요.

[사고 방식: 가설 기반 사고 + 4축 전제 점검]
- 이 과제가 나온 진짜 이유는 무엇인가? 가설을 세우세요.
- 이 과제가 의미 있으려면 참이어야 하는 전제를 찾으세요.
- 네 가지 축으로 점검: (1) 고객 가치 (2) 실행 가능성 (3) 사업성 (4) 조직 역량

[다양성 원칙]
- 전제 3-4개는 반드시 서로 다른 축에서 나와야 합니다. 같은 축에서 2개 이상 나오면 안 됩니다.
- 각 전제에 axis 필드로 어떤 축인지 표시하세요.

아래 JSON 구조로 응답하세요.
1. surface_task: 사용자가 말한 과제를 한 문장으로 정리
2. hidden_assumptions: 이 과제가 성립하려면 맞아야 하는 전제 3-4개. 각 전제에 대해:
   - assumption: 전제 내용 (한 문장, 명확하게)
   - risk_if_false: 이 전제가 틀리면 구체적으로 어떤 위험이 생기는지
   - axis: 이 전제가 속하는 축 ("customer_value" | "feasibility" | "business" | "org_capacity")
3. reasoning_narrative: 왜 이 전제들이 중요한지 2-3문장으로 설명

반드시 JSON만 응답하세요.`;

/* ── Stage 2: 리프레이밍 프롬프트 (전제 평가 패턴별 분기) ── */

// ── 공통 사고 프레임 (모든 패턴에 내장) ──
const STRATEGIC_THINKING_FRAME = `
[재정의 전 내적 검토 — 다음을 순서대로 고려한 뒤 종합하세요]
1. 전제 패턴: 확인/의심/불확실의 조합이 이 과제에 대해 무엇을 말해주는가?
2. 진짜 목적: 이 과제를 시킨 사람이 정말 원하는 결과는? 표면 목표와 다를 수 있다.
3. 시간축: 이걸 안 하면 6개월 후 무슨 일이 벌어지는가? 이것이 시사하는 우선순위는?
4. 빠진 경계: 이 과제가 의도적으로 다루지 않는 영역 중, 핵심인 것이 있는가?
5. 문제의 성격: 이것은 기술 문제인가, 조직 문제인가, 정치 문제인가, 타이밍 문제인가?

[범위 원칙]
- 재정의된 질문의 범위는 원래 과제와 같거나 넓어야 합니다. 좁아지면 안 됩니다.
- 전제 하나에 천착하지 말고, 위 5가지를 종합한 통찰을 담으세요.`;

// 패턴 A: 전제 대부분 확인됨 → 실행 구체화 모드
const REFRAMING_PROMPT_CONFIRMED = `당신은 20년 이상 경험한 전략기획 전문가입니다. 사용자가 이 과제의 핵심 전제를 대부분 확인했습니다.

전제가 확인되었으므로 방향은 맞습니다. 질문을 부정하지 말고 더 날카롭게 만드세요.
"해야 하는가?"가 아니라 "어떻게 가장 효과적으로 할 것인가?"로 발전시키세요.
${STRATEGIC_THINKING_FRAME}

아래 JSON 구조로 응답하세요.
1. reframed_question: 원래 과제와 같은 범위에서, 위 5가지 관점을 종합한 핵심 질문
2. why_reframing_matters: 이렇게 구체화하면 실행에서 무엇이 달라지는지 1-2문장
3. hidden_questions: 실행 시 고려해야 할 핵심 갈림길 2-3개. 각각:
   - question: 질문 텍스트 (짧고 판단 가능한 형태)
   - reasoning: 이 갈림길에서의 선택이 결과에 어떤 차이를 만드는지 (1문장)
   - source_assumption: 어떤 확인된 전제 또는 검토 관점에서 이 갈림길이 나왔는지
4. ai_limitations: AI가 이 과제에서 잘 못할 부분 1-2개

반드시 JSON만 응답하세요.`;

// 패턴 B: 일부 전제 의심/불확실 → 방향 유지 + 각도 전환 모드
const REFRAMING_PROMPT_MIXED = `당신은 20년 이상 경험한 전략기획 전문가입니다. 사용자의 전제 평가를 바탕으로 질문을 재정의하세요.

[핵심 원칙]
- "맞음" 전제는 과제의 방향을 지지합니다. 이 방향을 유지하세요.
- "의심됨" 전제는 방향을 뒤집는 근거가 아니라, 실행 시 해결할 조건입니다.
- "불확실" 전제는 검증이 필요한 변수입니다.
- 사용자가 의심/불확실 이유를 적었다면, 그 맥락을 반드시 재정의에 반영하세요. 이유는 사용자의 현장 경험에서 나온 것입니다.
${STRATEGIC_THINKING_FRAME}

[절대 하지 말 것]
- 확인된 전제를 무시하고 의심된 전제만으로 과제 전체를 뒤집지 마세요.
- "~대신 ~부터 해야 하는가?" 형태로 원래 과제를 포기하는 방향을 제안하지 마세요.
- 의심된 전제 하나에 천착하지 마세요.

[예시]
원래 과제: "AI 업무 효율화"
확인됨: "비효율 존재" + "경영진이 실질 개선 원함" / 의심됨: "팀원 수용성" / 불확실: "측정 가능성"

잘못: "AI 대신 업무 장벽 제거부터?" ← 방향 뒤집힘
잘못: "팀원 수용성을 어떻게?" ← 한 전제에 천착, 범위 축소
올바름: "AI 효율화의 성패는 기술이 아니라 조직 설계에 달려 있다 — 기술 도입과 변화관리를 어떻게 동시에 설계할 것인가?" ← 범위 유지, 전제+목적+경계 종합

아래 JSON 구조로 응답하세요.
1. reframed_question: 원래 과제와 같은 범위에서, 위 5가지 관점과 전제 평가를 종합한 핵심 질문
2. why_reframing_matters: 이 각도 전환이 실행에서 무엇을 바꾸는지 1-2문장
3. hidden_questions: 이 각도 안에서 추구할 수 있는 방향 2-3개. 각각:
   - question: 질문 텍스트 (짧고 판단 가능한 형태)
   - reasoning: 이 방향을 택하면 무엇이 달라지는지 (1문장)
   - source_assumption: 어떤 전제 또는 검토 관점에서 이 질문이 도출되었는지
4. ai_limitations: AI가 이 과제에서 잘 못할 부분 1-2개

반드시 JSON만 응답하세요.`;

// 패턴 C: 대부분 의심됨 → 과제 재고 모드
const REFRAMING_PROMPT_CHALLENGED = `당신은 20년 이상 경험한 전략기획 전문가입니다. 사용자가 이 과제의 핵심 전제 대부분을 의심하고 있습니다.

전제 대부분이 의심되므로 이 과제를 그대로 진행하는 것이 맞는지부터 질문해야 합니다.
과제를 폐기하거나 근본적으로 재정의하는 것도 유효한 방향입니다.
사용자가 의심 이유를 적었다면, 그 맥락이 재정의의 핵심 근거입니다.
${STRATEGIC_THINKING_FRAME}

아래 JSON 구조로 응답하세요.
1. reframed_question: 위 5가지 관점을 종합하여, 전제가 무너진 상황에서 정말 답해야 할 근본 질문
2. why_reframing_matters: 왜 원래 질문을 그대로 추진하면 안 되는지 1-2문장
3. hidden_questions: 대안적 방향 2-3개. 각각:
   - question: 질문 텍스트 (짧고 판단 가능한 형태)
   - reasoning: 이 방향이 원래 과제와 어떻게 다른지 (1문장)
   - source_assumption: 어떤 전제 또는 검토 관점에서 이 대안이 나왔는지
4. ai_limitations: AI가 이 과제에서 잘 못할 부분 1-2개

반드시 JSON만 응답하세요.`;

/* ───────────────────────────────────────────
   Interview entry steps (v2 — Cynefin/Thompson-Tuden)
   ─────────────────────────────────────────── */

const CORE_STEPS: EntryStep[] = [
  {
    key: 'nature',
    question: '이 과제를 가장 잘 설명하는 것은?',
    options: [
      { value: 'known_path', emoji: '📋', label: '정해진 방법이 있다', description: '선례가 있고 절차가 알려져 있다' },
      { value: 'needs_analysis', emoji: '🔬', label: '분석하면 답이 나온다', description: '전문가나 데이터가 있으면 풀 수 있다' },
      { value: 'no_answer', emoji: '🌊', label: '아무도 답을 모른다', description: '시도해보면서 답을 찾아야 한다' },
      { value: 'on_fire', emoji: '🔥', label: '지금 당장 대응해야 한다', description: '생각할 시간이 부족한 긴급 상황' },
    ],
  },
  {
    key: 'goal',
    question: '이 과제의 목표는?',
    options: [
      { value: 'clear_goal', emoji: '🎯', label: '뚜렷하다', description: '달성 기준이 명확하다' },
      { value: 'direction_only', emoji: '🧭', label: '방향만 있다', description: '구체적 목표는 정해지지 않았다' },
      { value: 'competing', emoji: '⚔️', label: '여러 개가 충돌한다', description: '이해관계자마다 다른 것을 원한다' },
      { value: 'unclear', emoji: '❓', label: '아직 모르겠다', description: '무엇이 성공인지 모른다' },
    ],
  },
  {
    key: 'stakes',
    question: '이 결정의 무게는?',
    options: [
      { value: 'irreversible', emoji: '⚖️', label: '되돌리기 어려운 결정', description: '한번 결정하면 번복이 어렵다' },
      { value: 'important', emoji: '📌', label: '중요하지만 수정 가능', description: '방향을 잡되 조정할 수 있다' },
      { value: 'experiment', emoji: '🧪', label: '작은 시도', description: '실패해도 비용이 적다' },
      { value: 'unknown_stakes', emoji: '❓', label: '아직 가늠이 안 된다', description: '가볍진 않을 것 같지만 확신이 없다' },
    ],
  },
];

const ADAPTIVE_STEPS: Record<string, EntryStep> = {
  trigger: {
    key: 'trigger',
    question: '이 과제가 지금 중요해진 이유는?',
    adaptive: true,
    options: [
      { value: 'external_pressure', emoji: '🌊', label: '외부 압력', description: '경쟁사, 시장 변화, 규제 등' },
      { value: 'internal_request', emoji: '👔', label: '내부 요청', description: '상사, 경영진, 다른 팀의 요청' },
      { value: 'opportunity', emoji: '💡', label: '기회 발견', description: '새로운 가능성을 발견했다' },
      { value: 'recurring', emoji: '🔄', label: '반복되는 문제', description: '계속 나타나는 문제를 이번에 해결하려 한다' },
    ],
  },
  history: {
    key: 'history',
    question: '이전에 비슷한 시도가 있었나요?',
    adaptive: true,
    options: [
      { value: 'failed', emoji: '❌', label: '시도했지만 실패', description: '비슷한 접근이 있었지만 성과가 없었다' },
      { value: 'partial', emoji: '🔶', label: '부분적 성공', description: '일부 성과가 있었지만 완전하지 않았다' },
      { value: 'first', emoji: '🆕', label: '처음 시도', description: '이런 종류의 과제는 처음이다' },
      { value: 'unknown', emoji: '❓', label: '잘 모르겠음', description: '조직 내 이력을 모른다' },
    ],
  },
  stakeholder: {
    key: 'stakeholder',
    question: '이 과제에 가장 큰 영향을 주는 사람은?',
    adaptive: true,
    options: [
      { value: 'executive', emoji: '👔', label: '경영진/의사결정자', description: '최종 결정권자에게 보고한다' },
      { value: 'team', emoji: '👥', label: '팀원/동료', description: '함께 실행할 사람들과 공유한다' },
      { value: 'client', emoji: '🤝', label: '고객/외부', description: '외부 이해관계자에게 제안한다' },
      { value: 'self', emoji: '💡', label: '나 자신', description: '내 판단을 정리하는 것이 목적이다' },
    ],
  },
};

/** Compute the interview steps array based on current selections (adaptive branching) */
function computeInterviewSteps(selections: Record<string, string>): EntryStep[] {
  const steps = [...CORE_STEPS];
  const nature = selections['nature'];
  const goal = selections['goal'];

  // Mutually exclusive: trigger (for structured problems) vs history (for uncharted/crisis)
  if (nature === 'needs_analysis' || nature === 'known_path') {
    steps.push(ADAPTIVE_STEPS.trigger);
  } else if (nature === 'no_answer' || nature === 'on_fire') {
    steps.push(ADAPTIVE_STEPS.history);
  }

  if (goal === 'competing' || goal === 'unclear') {
    steps.push(ADAPTIVE_STEPS.stakeholder);
  }

  return steps;
}

/** Map interview signals to premise extraction guidance for ASSUMPTION_PROMPT */
function getPremiseExtractionGuidance(signals: InterviewSignals): string | null {
  const parts: string[] = [];

  // Nature-based guidance (independent — not else-if)
  if (signals.nature === 'no_answer') {
    parts.push('- 탐색적 과제입니다. "이 방향이 가치가 있다", "이 문제가 실제로 존재한다" 같은 존재론적 전제를 찾으세요.');
  }
  if (signals.nature === 'needs_analysis') {
    parts.push('- 분석이 필요한 과제입니다. "이 데이터가 신뢰할 수 있다", "이 분석 방법이 적합하다" 같은 방법론적 전제를 찾으세요.');
  }
  if (signals.nature === 'on_fire') {
    parts.push('- 긴급 상황입니다. "이것이 근본 원인이다", "이 대응이 상황을 악화시키지 않는다" 같은 진단적 전제를 찾으세요.');
  }
  if (signals.nature === 'known_path') {
    parts.push('- 방법이 알려진 과제입니다. "이 방법이 우리 상황에도 적용된다", "필요한 자원이 확보되어 있다" 같은 적용 가능성 전제를 찾으세요.');
  }

  // Goal-based guidance (independent)
  if (signals.goal === 'competing') {
    parts.push('- 목표가 충돌합니다. "이 이해관계자의 목표가 더 중요하다", "두 목표를 동시에 달성할 수 있다" 같은 우선순위 전제를 찾으세요.');
  }
  if (signals.goal === 'unclear') {
    parts.push('- 목표가 불분명합니다. "이것이 진짜 해결할 문제다", "이 성공 기준이 올바르다" 같은 목표 타당성 전제를 찾으세요.');
  }
  if (signals.goal === 'direction_only') {
    parts.push('- 방향만 있고 구체 목표가 없습니다. "이 방향에서 가장 먼저 검증할 것"에 대한 전제를 찾으세요.');
  }

  // Stakes-based guidance (independent)
  if (signals.stakes === 'irreversible') {
    parts.push('- 되돌리기 어려운 결정입니다. 전제 중 하나는 반드시 "되돌릴 수 없는 결과"와 관련된 것이어야 합니다.');
  }
  if (signals.stakes === 'experiment') {
    parts.push('- 작은 시도입니다. "이 실험이 의미 있는 데이터를 준다", "이 범위가 검증하기에 충분하다" 같은 실험 설계 전제를 찾으세요.');
  }

  // Adaptive signal guidance — trigger
  if (signals.trigger === 'external_pressure') {
    parts.push('- 외부 압력이 계기입니다. "이 외부 변화가 우리에게 실제로 영향을 준다", "지금 대응하지 않으면 뒤처진다" 같은 긴급성 전제를 찾으세요.');
  }
  if (signals.trigger === 'recurring') {
    parts.push('- 반복되는 문제입니다. "이전에 해결이 안 된 근본 원인이 있다", "이번 접근이 구조적으로 다르다" 같은 근본 원인 전제를 찾으세요.');
  }
  if (signals.trigger === 'internal_request') {
    parts.push('- 내부 요청이 계기입니다. "요청자가 진짜 원하는 것"과 "표면적 요청" 사이의 차이에 대한 전제를 찾으세요.');
  }

  // Adaptive signal guidance — history
  if (signals.history === 'failed') {
    parts.push('- 과거에 비슷한 시도가 실패했습니다. "이번에는 다르다"의 근거가 되는 전제를 반드시 포함하세요.');
  }

  return parts.length > 0 ? `\n[인터뷰 기반 전제 탐색 지침]\n${parts.join('\n')}` : null;
}

/** Dynamic placeholder — nature × trigger/history 조합으로 구체적인 예시 제공 */
function getInterviewPlaceholder(selections: Record<string, string>): string {
  const nature = selections['nature'];
  const trigger = selections['trigger'];
  const history = selections['history'];

  // nature + trigger 조합 (needs_analysis / known_path 경로)
  if (nature === 'needs_analysis' && trigger === 'internal_request') {
    return '예: 대표가 AI 활용 계획을 다음 달까지 만들라고 지시. 팀원 50명 중 실무 경험자 2명, 예산은 미정.';
  }
  if (nature === 'needs_analysis' && trigger === 'external_pressure') {
    return '예: 경쟁사가 AI 도입으로 보고서 시간 50% 줄였다는 뉴스. 우리도 대응 전략을 2주 내 수립해야 함.';
  }
  if (nature === 'needs_analysis' && trigger === 'recurring') {
    return '예: 매 분기 반복되는 고객 이탈 문제. 지금까지 할인 위주 대응이었지만 근본 원인을 분석하고 싶음.';
  }
  if (nature === 'needs_analysis' && trigger === 'opportunity') {
    return '예: 기존 고객 데이터를 활용한 구독형 부가 서비스 가능성 발견. 사업성을 검증하고 싶음.';
  }
  if (nature === 'known_path' && trigger === 'internal_request') {
    return '예: 경영진에게 분기 실적 보고. 데이터는 있는데 스토리와 프레이밍을 잡아야 함.';
  }
  if (nature === 'known_path' && trigger === 'external_pressure') {
    return '예: 규제 변경에 맞춰 기존 프로세스 업데이트 필요. 기한은 다음 달, 범위 확인 중.';
  }
  if (nature === 'known_path') {
    return '예: 분기별 보고서 작성 / 프로젝트 킥오프 체크리스트 / 공급업체 평가 진행';
  }
  if (nature === 'needs_analysis') {
    return '예: 시장 진출 전략 수립 / AI 도입 ROI 분석 / 고객 이탈 원인 분석';
  }

  // nature + history 조합 (no_answer / on_fire 경로)
  if (nature === 'no_answer' && history === 'failed') {
    return '예: 작년에 신사업 제안했지만 탈락. 이번엔 다른 접근으로 재도전하려 함. 기존 실패 원인은 시장 검증 부족.';
  }
  if (nature === 'no_answer' && history === 'first') {
    return '예: 조직 내 처음으로 AI 기반 서비스 방향을 탐색. 어디서 시작할지부터 잡아야 함.';
  }
  if (nature === 'no_answer') {
    return '예: 신사업 방향 탐색 / 조직 혁신 방안 / 제품 피벗 검토. 배경과 제약 조건을 써주세요.';
  }
  if (nature === 'on_fire' && history === 'failed') {
    return '예: 주요 고객이 또 이탈 조짐. 지난번 대응(할인)이 효과 없었음. 2주 내 근본 대책 필요.';
  }
  if (nature === 'on_fire') {
    return '예: 경쟁사 가격 30% 인하로 영업팀 긴급 보고. 2주 내 대응 방안 필요. 현재 파악된 상황은...';
  }

  return '예: 중국 시장 진출 전략 / AI 도입 성과 보고서 / 경쟁사 대응 방안';
}

/* ───────────────────────────────────────────
   Normalize legacy data
   ─────────────────────────────────────────── */

function normalizeAnalysis(raw: ReframeAnalysis): ReframeAnalysis {
  return {
    surface_task: raw.surface_task || '',
    reframed_question: raw.reframed_question || raw.hypothesis || '',
    why_reframing_matters: raw.why_reframing_matters || '',
    reasoning_narrative: raw.reasoning_narrative || '',
    hidden_assumptions: Array.isArray(raw.hidden_assumptions)
      ? raw.hidden_assumptions.map((a: HiddenAssumption | string) =>
          typeof a === 'string' ? { assumption: a, risk_if_false: '' } : a
        )
      : [],
    hidden_questions: raw.hidden_questions || [],
    ai_limitations: raw.ai_limitations || [],
  };
}

/* ───────────────────────────────────────────
   Component
   ─────────────────────────────────────────── */

interface ReframeStepProps {
  onNavigate: (step: string) => void;
}

export function ReframeStep({ onNavigate }: ReframeStepProps) {
  const { items, currentId, loadItems, createItem, updateItem, deleteItem, setCurrentId, getCurrentItem } = useReframeStore();
  const { judgments, addJudgment, loadJudgments } = useJudgmentStore();
  const { setHandoff } = useHandoffStore();
  const { projects, loadProjects, getOrCreateProject, addRef } = useProjectStore();
  const { settings } = useSettingsStore();
  const [inputText, setInputText] = useState('');
  const [editingQuestion, setEditingQuestion] = useState(false);
  const [customQuestion, setCustomQuestion] = useState('');
  const [error, setError] = useState('');
  const [similarItems, setSimilarItems] = useState<Array<ReframeItem & { similarity: number }>>([]);
  const [currentStrategy, setCurrentStrategy] = useState<ReframingStrategy | null>(null);
  const [reviewStage, setReviewStage] = useState<'evaluate' | 'reframe'>('evaluate');
  const [reframing, setReframing] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [interviewSelections, setInterviewSelections] = useState<Record<string, string>>({});
  const dynamicSteps = computeInterviewSteps(interviewSelections);

  useEffect(() => {
    loadItems();
    loadJudgments();
    loadProjects();
  }, [loadItems, loadJudgments, loadProjects]);

  // Recover items stuck in 'analyzing' (e.g., page reload during LLM call)
  useEffect(() => {
    items.forEach((item) => {
      if (item.status === 'analyzing') {
        updateItem(item.id, { status: 'input' });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  const current = getCurrentItem();
  const hasLearning = judgments.length >= 3;

  useEffect(() => {
    if (!inputText || inputText.length < 8) {
      setSimilarItems([]);
      return;
    }
    const timer = setTimeout(() => {
      const doneItems = items.filter((i) => i.status === 'done' && i.analysis);
      const matches = findSimilarItems(inputText, doneItems.map(i => ({ ...i, input_text: i.input_text || '' })));
      setSimilarItems(matches as Array<ReframeItem & { similarity: number }>);
    }, 500);
    return () => clearTimeout(timer);
  }, [inputText, items]);

  /* ─── Handlers ─── */

  const handleAnalyze = async (prompt?: string, structuredSignals?: InterviewSignals) => {
    const finalPrompt = prompt || inputText;
    if (!finalPrompt.trim()) return;
    setError('');
    const id = createItem(finalPrompt);
    updateItem(id, { status: 'analyzing' });

    // Phase 1: Select reframing strategy — structured signals first, text extraction fallback
    const signals = structuredSignals || extractInterviewSignals(finalPrompt) as InterviewSignals | undefined;
    let strategy: ReframingStrategy | null = null;
    if (signals) {
      strategy = getBestStrategy(signals) || selectReframingStrategy(signals);
    }
    setCurrentStrategy(strategy);

    if (signals) {
      updateItem(id, { interview_signals: signals });
    }

    // Stage 1: Generate assumptions only (user evaluates before reframing)
    // Inject signal-specific premise extraction guidance for v2 interviews
    let baseAssumptionPrompt = ASSUMPTION_PROMPT;
    if (signals?.version === 2 || signals?.nature) {
      const guidance = getPremiseExtractionGuidance(signals);
      if (guidance) {
        baseAssumptionPrompt += guidance;
      }
    }

    const systemPrompt = applyPromptMutations(buildEnhancedSystemPrompt(baseAssumptionPrompt));

    // Start streaming for preview
    setIsStreaming(true);
    setStreamingText('');

    try {
      const fullText = await new Promise<string>((resolve, reject) => {
        callLLMStream(
          [{ role: 'user', content: finalPrompt }],
          { system: systemPrompt, maxTokens: 1200 },
          {
            onToken: (text) => setStreamingText(text),
            onComplete: (text) => resolve(text),
            onError: (err) => reject(err),
          }
        );
      });

      setIsStreaming(false);
      setStreamingText('');

      // Try to parse JSON from the streamed text
      let analysis: ReframeAnalysis;
      try {
        analysis = parseJSON<ReframeAnalysis>(fullText);
      } catch {
        // JSON parse failed — fall back to non-streaming call
        analysis = await callLLMJson<ReframeAnalysis>(
          [{ role: 'user', content: finalPrompt }],
          { system: systemPrompt, maxTokens: 1200 }
        );
      }

      // Initialize evaluations as 'uncertain' (default)
      if (analysis.hidden_assumptions) {
        analysis.hidden_assumptions = analysis.hidden_assumptions.map((a: HiddenAssumption | string) =>
          typeof a === 'string'
            ? { assumption: a, risk_if_false: '', evaluation: 'uncertain' as const }
            : { ...a, evaluation: a.evaluation || 'uncertain' }
        );
      }

      // Diversity check — log axis coverage for prompt mutation learning
      if (analysis.hidden_assumptions?.length >= 2) {
        const axes = analysis.hidden_assumptions
          .map(a => typeof a !== 'string' ? a.axis : undefined)
          .filter(Boolean);
        const uniqueAxes = new Set(axes);
        const diversityRatio = axes.length > 0 ? uniqueAxes.size / axes.length : 0;
        recordSignal({
          project_id: current?.project_id,
          tool: 'reframe',
          signal_type: 'axis_diversity',
          signal_data: {
            axes: Array.from(uniqueAxes),
            unique: uniqueAxes.size,
            total: axes.length,
            ratio: diversityRatio,
          },
        });
      }

      updateItem(id, { analysis, status: 'review' });
      setReviewStage('evaluate');
    } catch (err) {
      setIsStreaming(false);
      setStreamingText('');
      trackError('reframe_analyze', err);
      const msg = err instanceof Error ? err.message : '';
      if (msg.startsWith('LOGIN_REQUIRED:')) {
        setError('LOGIN_REQUIRED');
      } else {
        setError(msg || '악보를 읽을 수 없었습니다. 다시 시도하거나 더 구체적으로 입력해보세요.');
      }
      updateItem(id, { status: 'input' });
    }
  };

  // Debounced judgment recording ref
  const judgmentTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSelectQuestion = (question: string) => {
    if (!current || !currentId || !current.analysis) return;
    // Phase 2A: Track if user edited the question (vs selecting AI suggestion)
    const analysis = normalizeAnalysis(current.analysis);
    const isCustom = !analysis.hidden_questions.some(hq => hq.question === question);
    updateItem(currentId, {
      selected_question: question,
      user_edited_question: isCustom,
    });

    // Debounce judgment recording (prevents spam from custom question typing)
    if (judgmentTimerRef.current) clearTimeout(judgmentTimerRef.current);
    judgmentTimerRef.current = setTimeout(() => {
      const analysis = normalizeAnalysis(current.analysis!);
      const isCustom = !analysis.hidden_questions.some(hq => hq.question === question);
      addJudgment({
        type: 'hidden_question_selection',
        context: analysis.surface_task,
        decision: question,
        original_ai_suggestion: analysis.hidden_questions[0]?.question || '',
        user_changed: isCustom,
        project_id: current.project_id,
        tool: 'reframe',
      });
    }, 1000);
  };

  const handleReframe = async () => {
    if (!current || !currentId || !current.analysis) return;
    setReframing(true);
    setError('');

    try {
      // Build evaluation summary for Stage 2 prompt
      const assumptions = current.analysis.hidden_assumptions || [];
      const evalSummary = assumptions
        .map((a: HiddenAssumption, i: number) => {
          const label = a.evaluation === 'doubtful' ? '의심됨' : a.evaluation === 'likely_true' ? '맞을 가능성 높음' : '불확실';
          let line = `${i + 1}. [${label}] "${a.assumption}" → ${a.risk_if_false || ''}`;
          if (a.evaluation_reason?.trim()) {
            line += `\n   사용자 이유: ${a.evaluation_reason.trim()}`;
          }
          return line;
        })
        .join('\n');

      const confirmed = assumptions.filter((a: HiddenAssumption) => a.evaluation === 'likely_true');
      const doubtful = assumptions.filter((a: HiddenAssumption) => a.evaluation === 'doubtful');
      const uncertain = assumptions.filter((a: HiddenAssumption) => a.evaluation === 'uncertain');

      // Select reframing prompt based on evaluation pattern
      const total = assumptions.length;
      let baseReframingPrompt: string;
      let evalPattern: string;
      if (doubtful.length >= total * 0.5) {
        // 패턴 C: 전제 대부분 의심 → 과제 재고
        baseReframingPrompt = REFRAMING_PROMPT_CHALLENGED;
        evalPattern = `전제 ${total}건 중 ${doubtful.length}건 의심됨 — 과제의 전제 대부분이 흔들리고 있습니다.`;
      } else if (doubtful.length === 0 && uncertain.length === 0) {
        // 패턴 A: 전제 모두 확인 → 실행 구체화
        baseReframingPrompt = REFRAMING_PROMPT_CONFIRMED;
        evalPattern = `전제 ${total}건 모두 확인됨 — 과제의 방향은 맞습니다. 실행을 구체화해주세요.`;
      } else {
        // 패턴 B: 일부 의심/불확실 → 방향 유지 + 조건 통합
        baseReframingPrompt = REFRAMING_PROMPT_MIXED;
        evalPattern = `전제 ${total}건 중 ${confirmed.length}건 확인, ${doubtful.length}건 의심, ${uncertain.length}건 불확실. 확인된 전제가 방향을 잡고, 의심/불확실은 해결할 조건입니다.`;
      }

      let reframingPrompt = buildEnhancedSystemPrompt(baseReframingPrompt);
      if (currentStrategy) {
        reframingPrompt = applyReframingStrategy(reframingPrompt, currentStrategy);
      }

      const userMessage = `[원래 과제]\n${current.analysis.surface_task}\n\n[사용자의 전제 평가]\n${evalSummary}\n\n[평가 요약]\n${evalPattern}\n\n이 평가를 바탕으로 질문을 재정의해주세요.`;

      // Start streaming for preview
      setIsStreaming(true);
      setStreamingText('');

      const fullText = await new Promise<string>((resolve, reject) => {
        callLLMStream(
          [{ role: 'user', content: userMessage }],
          { system: reframingPrompt, maxTokens: 1500 },
          {
            onToken: (text) => setStreamingText(text),
            onComplete: (text) => resolve(text),
            onError: (err) => reject(err),
          }
        );
      });

      setIsStreaming(false);
      setStreamingText('');

      // Try to parse JSON from the streamed text
      let reframingResult: Partial<ReframeAnalysis>;
      try {
        reframingResult = parseJSON<Partial<ReframeAnalysis>>(fullText);
      } catch {
        // JSON parse failed — fall back to non-streaming call
        reframingResult = await callLLMJson<Partial<ReframeAnalysis>>(
          [{ role: 'user', content: userMessage }],
          { system: reframingPrompt, maxTokens: 1500 }
        );
      }

      // Merge Stage 2 results into existing analysis
      updateItem(currentId, {
        analysis: {
          ...current.analysis,
          reframed_question: reframingResult.reframed_question || '',
          why_reframing_matters: reframingResult.why_reframing_matters || '',
          hidden_questions: reframingResult.hidden_questions || [],
          ai_limitations: reframingResult.ai_limitations || current.analysis.ai_limitations || [],
        },
      });
      setReviewStage('reframe');
    } catch (err) {
      setIsStreaming(false);
      setStreamingText('');
      trackError('reframe_reframe', err);
      setError(err instanceof Error ? err.message : '질문을 재정의할 수 없었습니다.');
    } finally {
      setReframing(false);
    }
  };

  const handleConfirm = () => {
    if (!current || !currentId || !current.analysis) return;
    updateItem(currentId, { status: 'done' });

    // Rich tracking: eval pattern, strategy, user behavior
    const assumptions = current.analysis.hidden_assumptions || [];
    const dCount = assumptions.filter(a => a.evaluation === 'doubtful').length;
    const uCount = assumptions.filter(a => a.evaluation === 'uncertain').length;
    const cCount = assumptions.filter(a => a.evaluation === 'likely_true').length;
    const evalPattern = dCount === 0 && uCount === 0 ? 'all_confirmed'
      : dCount >= assumptions.length * 0.5 ? 'mostly_doubtful'
      : 'mixed';
    track('reframe_complete', {
      assumptions: assumptions.length,
      eval_pattern: evalPattern,
      confirmed: cCount,
      doubtful: dCount,
      uncertain: uCount,
      strategy: currentStrategy || 'none',
      user_edited_question: current.user_edited_question || false,
      reanalysis_count: current.reanalysis_count || 0,
    });

    // Phase 1: Record binary evals for strategy learning
    recordReframeEval(current, currentStrategy);

    if (current?.analysis?.hidden_assumptions) {
      const assumptions = current.analysis.hidden_assumptions;
      const evalCounts = { doubtful: 0, uncertain: 0, likely_true: 0, unevaluated: 0 };
      for (const a of assumptions) {
        const ev = typeof a === 'string' ? 'unevaluated' : (a.evaluation || 'unevaluated');
        if (ev in evalCounts) evalCounts[ev as keyof typeof evalCounts]++;
      }
      const uniqueEvals = new Set(assumptions.map(a => typeof a === 'string' ? 'unevaluated' : (a.evaluation || 'unevaluated')));
      recordSignal({
        project_id: current?.project_id,
        tool: 'reframe',
        signal_type: 'assumption_diversity',
        signal_data: { ...evalCounts, diversity: uniqueEvals.size, total: assumptions.length },
      });
    }

    if (settings.audio_enabled) {
      resumeAudioContext();
      playSuccessTone(settings.audio_volume);
    }
  };

  const handleReanalyze = async () => {
    if (!current || !currentId) return;
    setError('');
    // Phase 2A: Track reanalysis count for eval gaming prevention
    const newCount = (current.reanalysis_count || 0) + 1;
    updateItem(currentId, { status: 'analyzing', analysis: null, reanalysis_count: newCount });
    try {
      const prompt = current.selected_question
        ? `원래 과제: ${current.input_text}\n\n재정의된 질문으로 다시 분석해주세요: ${current.selected_question}`
        : current.input_text;
      const analysis = await callLLMJson<ReframeAnalysis>(
        [{ role: 'user', content: prompt }],
        { system: buildEnhancedSystemPrompt(ASSUMPTION_PROMPT, current?.project_id), maxTokens: 1200 }
      );
      updateItem(currentId, { analysis, status: 'review' });
    } catch (err) {
      setError(err instanceof Error ? err.message : '악보를 다시 읽을 수 없었습니다. 다시 시도해보세요.');
      updateItem(currentId, { status: 'review' });
    }
  };

  const handleEvaluateAssumption = (index: number, evaluation: 'likely_true' | 'uncertain' | 'doubtful') => {
    if (!current || !currentId || !current.analysis) return;
    const assumptions = [...current.analysis.hidden_assumptions];
    assumptions[index] = { ...assumptions[index], evaluation };
    // Clear reason when switching to likely_true
    if (evaluation === 'likely_true') {
      assumptions[index] = { ...assumptions[index], evaluation, evaluation_reason: undefined };
    }
    updateItem(currentId, { analysis: { ...current.analysis, hidden_assumptions: assumptions } });
  };

  const handleEvaluationReason = (index: number, reason: string) => {
    if (!current || !currentId || !current.analysis) return;
    const assumptions = [...current.analysis.hidden_assumptions];
    assumptions[index] = { ...assumptions[index], evaluation_reason: reason };
    updateItem(currentId, { analysis: { ...current.analysis, hidden_assumptions: assumptions } });
  };

  const handleToggleAssumption = (index: number) => {
    if (!current || !currentId || !current.analysis) return;
    const assumptions = [...current.analysis.hidden_assumptions];
    const a = assumptions[index];
    if (typeof a === 'string') {
      assumptions[index] = { assumption: a, risk_if_false: '', verified: true };
    } else {
      assumptions[index] = { ...a, verified: !a.verified };
    }
    updateItem(currentId, { analysis: { ...current.analysis, hidden_assumptions: assumptions } });
  };

  const getAnalysis = () => current?.analysis ? normalizeAnalysis(current.analysis) : null;

  /* ─── Render ─── */

  return (
    <div className="space-y-6">
      {/* ─── Header ─── */}
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-bold tracking-tight text-[var(--text-primary)]" style={{ fontFamily: 'var(--font-display)' }}>{t('tool.reframe')}</h1>
          <span className="text-[13px] text-[var(--text-tertiary)]">|</span>
          <span className="text-[14px] text-[var(--text-secondary)]">{t('tool.reframe.subtitle')}</span>
        </div>
        <p className="text-[13px] text-[var(--text-secondary)] mt-1">
          전략기획의 핵심 — 숨은 가정을 찾고, 진짜 질문을 재정의합니다.
        </p>
        {hasLearning && (
          <div className="flex items-center gap-1.5 text-[12px] text-[var(--text-tertiary)] mt-2">
            <Brain size={12} />
            <span>이전 {judgments.length}건의 판단이 반영되고 있습니다</span>
          </div>
        )}
      </div>

      {/* ─── History tabs ─── */}
      {items.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => { setCurrentId(item.id); setInputText(''); }}
              className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl text-[13px] border transition-all duration-300 cursor-pointer ${
                currentId === item.id
                  ? 'border-[var(--accent)] bg-[var(--ai)] text-[var(--text-primary)]'
                  : 'border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border)]'
              }`}
            >
              <FileText size={14} />
              {(item.analysis?.surface_task || item.input_text || '').slice(0, 25) || '분석 중...'}
              <span
                onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }}
                className="ml-1 p-0.5 hover:text-red-500 cursor-pointer"
              >
                <Trash2 size={12} />
              </span>
            </button>
          ))}
        </div>
      )}

      {/* ─── Concertmaster inline coaching ─── */}
      {(!current || current.status === 'input') && !currentId && (
        <ConcertmasterInline step="reframe" />
      )}

      {/* ═══════════════════════════════════════
          STEP 1: Input
         ═══════════════════════════════════════ */}
      {(!current || current.status === 'input') && !currentId && (
        <>
        {/* Example tasks */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-[12px] text-[var(--text-secondary)] shrink-0">예시 과제로 체험:</span>
          {[
            { label: '경영진 보고', nature: 'needs_analysis' as const, goal: 'clear_goal' as const, stakes: 'important' as const, text: '팀의 AI 도입 3개월 시범 운영 결과를 경영진에게 보고해야 합니다. 비용 절감 30%를 달성했지만 품질 이슈가 있었습니다. 다음 주 임원 회의에서 확대 도입 여부를 결정합니다.' },
            { label: '신규 사업 제안', nature: 'no_answer' as const, goal: 'direction_only' as const, stakes: 'experiment' as const, text: '사내 벤처 프로그램에 지원할 사업 아이디어를 정리해야 합니다. 기존 고객 데이터를 활용한 구독형 부가 서비스이고, 2주 안에 사업계획서를 제출해야 합니다.' },
            { label: '위기 대응', nature: 'on_fire' as const, goal: 'clear_goal' as const, stakes: 'irreversible' as const, text: '주요 경쟁사가 핵심 제품의 가격을 30% 인하했습니다. 영업팀에서 고객 이탈 조짐이 보고되고 있고, 2주 안에 대응 방안을 만들어야 합니다.' },
          ].map((ex) => {
            const natureOpt = CORE_STEPS[0].options.find(o => o.value === ex.nature);
            const goalOpt = CORE_STEPS[1].options.find(o => o.value === ex.goal);
            const stakesOpt = CORE_STEPS[2].options.find(o => o.value === ex.stakes);
            return (
              <button
                key={ex.label}
                onClick={() => handleAnalyze(
                  `[맥락]\n과제 성격: ${natureOpt?.label}\n목표: ${goalOpt?.label}\n결정의 무게: ${stakesOpt?.label}\n\n[과제]\n${ex.text}`,
                  { version: 2, nature: ex.nature, goal: ex.goal, stakes: ex.stakes }
                )}
                className="px-2.5 py-1 rounded-lg text-[11px] font-medium border border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] cursor-pointer transition-all"
              >
                {ex.label}
              </button>
            );
          })}
        </div>
        <Card>
          <StepEntry
            steps={dynamicSteps}
            onSelectionChange={(newSelections) => {
              // Clean up selections for steps that were removed by branching
              const validKeys = new Set(computeInterviewSteps(newSelections).map(s => s.key));
              const cleaned = Object.fromEntries(
                Object.entries(newSelections).filter(([k]) => validKeys.has(k))
              );
              setInterviewSelections(cleaned);
            }}
            textLabel="뭘 해야 하나요? (짧게도 OK)"
            textPlaceholder="예: 중국 시장 진출 전략 / AI 도입 성과 보고서 / 경쟁사 대응 방안"
            animatedPlaceholders={[
              '예: 중국 시장 진출 전략 수립',
              '예: AI 도입 ROI 분석 보고서',
              '예: 경쟁사 가격 인하 대응 방안',
              '예: 고객 이탈 원인 분석과 개선안',
              '예: 신사업 아이템 사업성 검증',
              '예: 분기 실적 프레젠테이션 준비',
            ]}
            dynamicPlaceholderFn={getInterviewPlaceholder}
            textHint="위에서 선택한 맥락이 반영됩니다. 구체적일수록 정확합니다."
            onSubmit={(selections, text) => {
              // Build v2 structured signals directly
              const signals: InterviewSignals = {
                version: 2,
                nature: selections.nature as InterviewSignals['nature'],
                goal: selections.goal as InterviewSignals['goal'],
                stakes: selections.stakes as InterviewSignals['stakes'],
                ...(selections.trigger && { trigger: selections.trigger as InterviewSignals['trigger'] }),
                ...(selections.history && { history: selections.history as InterviewSignals['history'] }),
                ...(selections.stakeholder && { stakeholder: selections.stakeholder as InterviewSignals['stakeholder'] }),
              };

              // Build readable context for LLM
              const allSteps = computeInterviewSteps(selections);
              const context = Object.entries(selections)
                .map(([k, v]) => {
                  const step = allSteps.find(s => s.key === k);
                  const opt = step?.options.find(o => o.value === v);
                  if (!opt) return '';
                  return `${step?.question.replace('?', '')}: ${opt.label}${opt.description ? ` (${opt.description})` : ''}`;
                })
                .filter(Boolean)
                .join('\n');
              const fullPrompt = context ? `[맥락]\n${context}\n\n[과제]\n${text}` : text;
              handleAnalyze(fullPrompt, signals);
            }}
          />
          {similarItems.length > 0 && (
            <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
              <p className="text-[12px] font-semibold text-[var(--text-secondary)] mb-2">유사한 이전 분석</p>
              <div className="space-y-1.5">
                {similarItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => { setCurrentId(item.id); setInputText(''); }}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--border)] cursor-pointer transition-all duration-300"
                  >
                    <div>
                      <p className="text-[13px] font-medium text-[var(--text-primary)]">
                        {item.analysis?.surface_task || item.input_text.slice(0, 40)}
                      </p>
                      <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
                        유사도 {Math.round(item.similarity * 100)}%
                      </p>
                    </div>
                    <ArrowRight size={12} className="text-[var(--text-tertiary)] shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}
          {error && (
            error === 'LOGIN_REQUIRED' ? (
              <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-4 py-4 mt-3">
                <p className="text-[14px] font-bold text-[var(--text-primary)] mb-1">무료 체험 3회를 모두 사용했어요</p>
                <p className="text-[13px] text-[var(--text-secondary)] mb-3">로그인하면 하루 5회까지 무료로 계속 사용할 수 있습니다.</p>
                <Link href="/login" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--bg)] text-[13px] font-semibold hover:shadow-[var(--shadow-sm)] hover:-translate-y-[1px] active:translate-y-0 transition-all">
                  로그인 / 회원가입
                </Link>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 text-red-600 text-[13px] bg-red-50 rounded-lg px-3 py-2 mt-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={14} /> <span>{error}</span>
                </div>
                <button onClick={() => { setError(''); handleAnalyze(); }} className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-red-200 text-red-600 hover:bg-red-100 cursor-pointer transition-colors">
                  다시 시도
                </button>
              </div>
            )
          )}
        </Card>
        </>
      )}

      {/* ═══════════════════════════════════════
          STEP 2: Analyzing (Loading / Streaming Preview)
         ═══════════════════════════════════════ */}
      {current?.status === 'analyzing' && (
        <Card>
          <LoadingSteps steps={[
            '과제의 가정을 점검하고 있습니다',
            '숨은 질문을 찾고 있습니다',
            '진짜 주제를 읽어내고 있습니다',
          ]} />
        </Card>
      )}

      {/* ═══════════════════════════════════════
          STEP 3: Review — The Score Reading
         ═══════════════════════════════════════ */}
      {current?.status === 'review' && current.analysis && (() => {
        const analysis = normalizeAnalysis(current.analysis!);
        return (
          <div className="phrase-entrance space-y-5">

            {/* ═══ Stage 1: 전제 점검 (사용자 판단) ═══ */}
            {reviewStage === 'evaluate' && (
              <>
                {/* 과제 요약 */}
                <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-5 py-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[11px] font-semibold text-[var(--text-tertiary)] tracking-wide">STEP 1 — 가정 점검</p>
                    {currentStrategy && (
                      <span className="text-[10px] text-[var(--text-tertiary)] bg-[var(--bg)] px-2 py-0.5 rounded-full">
                        {STRATEGY_LABELS[currentStrategy].label}
                      </span>
                    )}
                  </div>
                  <p className="text-[15px] font-semibold text-[var(--text-primary)] leading-snug">
                    {analysis.surface_task}
                  </p>
                  {analysis.reasoning_narrative && (
                    <p className="text-[12px] text-[var(--text-secondary)] mt-2 italic leading-relaxed">
                      {analysis.reasoning_narrative}
                    </p>
                  )}
                </div>

                {/* 전제 평가 */}
                <div>
                  <div className="mb-3">
                    <p className="text-[14px] font-bold text-[var(--text-primary)]">이 과제의 숨은 가정</p>
                    <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">
                      이것이 맞아야 과제가 성립합니다. 당신의 경험으로 판단해주세요.
                    </p>
                  </div>
                  <div className="space-y-2.5">
                    {analysis.hidden_assumptions.map((a, i) => {
                      const ev = a.evaluation || 'uncertain';
                      return (
                        <div key={i} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
                          <p className="text-[14px] font-semibold text-[var(--text-primary)] leading-snug mb-1.5">
                            {a.assumption}
                          </p>
                          {a.risk_if_false && (
                            <p className="text-[12px] text-[var(--text-secondary)] mb-3">
                              만약 아니라면 &rarr; {a.risk_if_false}
                            </p>
                          )}
                          {/* 3-way evaluation toggle */}
                          <div className="flex gap-1.5">
                            {([
                              { value: 'likely_true', label: '맞을 가능성 높음', color: 'emerald' },
                              { value: 'uncertain', label: '확실하지 않음', color: 'amber' },
                              { value: 'doubtful', label: '의심됨', color: 'red' },
                            ] as const).map(({ value, label, color }) => (
                              <button
                                key={value}
                                onClick={() => handleEvaluateAssumption(i, value)}
                                className={`
                                  flex-1 py-2 rounded-lg text-[12px] font-medium text-center
                                  transition-all duration-200 cursor-pointer border
                                  ${ev === value
                                    ? color === 'emerald' ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                      : color === 'amber' ? 'bg-amber-50 border-amber-300 text-amber-700'
                                      : 'bg-red-50 border-red-300 text-red-700'
                                    : 'border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:border-[var(--border)]'
                                  }
                                `}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                          {/* Reason input — appears for doubtful/uncertain */}
                          {(ev === 'doubtful' || ev === 'uncertain') && (
                            <input
                              type="text"
                              placeholder={ev === 'doubtful' ? '왜 의심하나요? (선택)' : '왜 불확실한가요? (선택)'}
                              value={a.evaluation_reason || ''}
                              onChange={(e) => handleEvaluationReason(i, e.target.value)}
                              className="mt-2 w-full px-3 py-1.5 rounded-lg text-[12px] border border-[var(--border-subtle)] bg-[var(--bg)] text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--accent)] transition-colors"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Stage 1 → Stage 2 버튼 */}
                {/* Reframing loading state / Streaming Preview */}
                {reframing && (
                  <Card>
                    <LoadingSteps steps={[
                      '당신의 가정 평가를 분석하고 있습니다',
                      '의심된 가정을 기반으로 질문을 재구성합니다',
                      '새로운 방향을 도출하고 있습니다',
                    ]} />
                  </Card>
                )}

                {!reframing && (
                  <div className="pt-2 space-y-2">
                    <p className="text-[11px] text-[var(--text-tertiary)] text-right">
                      당신의 평가를 바탕으로 질문을 재정의합니다
                    </p>
                    <div className="flex items-center justify-between">
                      <Button variant="secondary" onClick={handleReanalyze} size="sm">
                        <RotateCcw size={14} /> 가정 재분석
                      </Button>
                      <Button onClick={handleReframe}>
                        {t('reframe.reframe')} &rarr;
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ═══ Stage 2: 질문 재정의 (사용자 평가 기반) ═══ */}
            {reviewStage === 'reframe' && (() => {
              const dCount = analysis.hidden_assumptions.filter(a => a.evaluation === 'doubtful').length;
              const uCount = analysis.hidden_assumptions.filter(a => a.evaluation === 'uncertain').length;
              const allConfirmed = dCount === 0 && uCount === 0;
              const questionLabel = allConfirmed ? '구체화된 핵심 질문' : '재정의된 질문';
              const rationaleLabel = allConfirmed ? '왜 이렇게 구체화했는가' : '왜 이렇게 재정의했는가';
              const directionLabel = allConfirmed ? '실행의 핵심 갈림길' : t('reframe.direction');
              return (
              <>
                {/* 재정의된 질문 — 통합 카드 */}
                {analysis.reframed_question && (
                  <div className="rounded-[20px] overflow-hidden border border-[var(--border-subtle)]">
                    {/* 전제 평가 요약 — 상단 */}
                    <div className="px-5 py-3 bg-[var(--bg)] border-b border-[var(--border-subtle)]">
                      <p className="text-[12px] font-medium text-[var(--text-secondary)] mb-2">당신의 가정 평가 결과</p>
                      <div className="space-y-1">
                        {analysis.hidden_assumptions.map((a, i) => {
                          const ev = a.evaluation || 'uncertain';
                          const dotColor = ev === 'doubtful' ? 'bg-red-500' : ev === 'likely_true' ? 'bg-emerald-500' : 'bg-amber-500';
                          const textColor = ev === 'doubtful' ? 'text-red-700' : ev === 'likely_true' ? 'text-emerald-700' : 'text-amber-700';
                          const label = ev === 'doubtful' ? '의심' : ev === 'likely_true' ? '맞음' : '불확실';
                          return (
                            <div key={i} className="flex items-start gap-2">
                              <span className={`shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full ${dotColor}`} />
                              <p className="text-[12px] text-[var(--text-primary)] leading-relaxed">
                                <span className={`font-semibold ${textColor}`}>{label}</span> — {a.assumption}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 연결선 */}
                    <div className="flex items-center gap-2 px-5 py-1.5 bg-[var(--surface)]">
                      <div className="flex-1 h-px bg-[var(--border-subtle)]" />
                      <span className="text-[10px] text-[var(--text-tertiary)] font-medium">이 평가를 바탕으로</span>
                      <div className="flex-1 h-px bg-[var(--border-subtle)]" />
                    </div>

                    {/* 재정의된 질문 — 메인 */}
                    <div className="bg-[var(--primary)] text-[var(--bg)] px-5 py-5 md:px-6 md:py-6">
                      <p className="text-[11px] font-semibold text-white/50 mb-2">{questionLabel}</p>
                      <p className="text-[18px] md:text-[20px] font-bold leading-snug animate-crescendo" style={{ fontFamily: 'var(--font-display)' }}>
                        {analysis.reframed_question}
                      </p>
                    </div>

                    {/* 리프레이밍 근거 — 하단 */}
                    {analysis.why_reframing_matters && (
                      <div className="px-5 py-4 bg-[var(--surface)] border-t border-[var(--border-subtle)]">
                        <p className="text-[11px] font-semibold text-[var(--text-tertiary)] mb-0.5">분석 근거</p>
                        <p className="text-[10px] text-[var(--text-tertiary)] mb-2">가정 · 목적 · 시간 · 범위 · 문제 성격을 종합</p>
                        <p className="text-[13px] text-[var(--text-primary)] leading-relaxed">
                          {analysis.why_reframing_matters}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* 방향 선택 */}
                {analysis.hidden_questions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-3 mb-5">
                      <div className="h-px flex-1 bg-[var(--border-subtle)]" />
                      <p className="text-[15px] font-bold text-[var(--text-primary)]">{directionLabel}</p>
                      <div className="h-px flex-1 bg-[var(--border-subtle)]" />
                    </div>
                    <div className="space-y-3">
                      {analysis.hidden_questions.map((hq: ReframeHiddenQuestion, i: number) => (
                        <div
                          key={i}
                          onClick={() => handleSelectQuestion(hq.question)}
                          className={`rounded-xl border px-5 py-4 cursor-pointer transition-all duration-300 ${
                            current.selected_question === hq.question
                              ? 'border-[var(--accent)] bg-[var(--ai)] shadow-sm -translate-y-0.5'
                              : 'border-[var(--border-subtle)] hover:border-[var(--border)]'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                              current.selected_question === hq.question ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-[var(--border)]'
                            }`}>
                              {current.selected_question === hq.question && <Check size={10} className="text-white" />}
                            </div>
                            <div>
                              <p className="text-[15px] font-semibold text-[var(--text-primary)] leading-snug">{hq.question}</p>
                              <p className="text-[13px] text-[var(--text-secondary)] mt-2 leading-relaxed">{hq.reasoning}</p>
                              {hq.source_assumption && (
                                <span className="inline-flex items-center gap-1 mt-2.5 px-2.5 py-1 rounded-md text-[11px] text-[var(--accent)] font-medium" style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)' }}>
                                  <span className="opacity-50">&larr;</span> {hq.source_assumption}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                      {/* Custom question */}
                      <div
                        onClick={() => setEditingQuestion(true)}
                        className={`rounded-xl border p-4 cursor-pointer transition-all ${
                          editingQuestion ? 'border-[var(--accent)]' : 'border-dashed border-[var(--border)]'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                            editingQuestion && customQuestion ? 'border-[var(--accent)] bg-[var(--accent)]' : 'border-dashed border-[var(--border)]'
                          }`}>
                            {editingQuestion && customQuestion ? <Check size={10} className="text-white" /> : <Pencil size={8} className="text-[var(--text-tertiary)]" />}
                          </div>
                          <div className="flex-1">
                            {editingQuestion ? (
                              <input type="text" autoFocus value={customQuestion}
                                onChange={(e) => { setCustomQuestion(e.target.value); handleSelectQuestion(e.target.value); }}
                                placeholder="직접 질문을 작성하세요..."
                                className="w-full bg-transparent text-[14px] font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none"
                              />
                            ) : (
                              <p className="text-[14px] text-[var(--text-tertiary)]">직접 질문 작성하기...</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI limitations */}
                {analysis.ai_limitations?.length > 0 && (
                  <div className="text-[12px] text-[var(--text-tertiary)]">
                    <AlertTriangle size={12} className="inline mr-1.5 -mt-0.5" />
                    {t('reframe.aiLimitations')}: {analysis.ai_limitations.join(' · ')}
                  </div>
                )}
              </>
              );
            })()}

            {/* ─── Error ─── */}
            {error && (
              error === 'LOGIN_REQUIRED' ? (
                <div className="rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-4 py-4">
                  <p className="text-[14px] font-bold text-[var(--text-primary)] mb-1">무료 체험 3회를 모두 사용했어요</p>
                  <p className="text-[13px] text-[var(--text-secondary)] mb-3">로그인하면 하루 5회까지 무료로 계속 사용할 수 있습니다.</p>
                  <Link href="/login" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-[var(--bg)] text-[13px] font-semibold hover:shadow-[var(--shadow-sm)] hover:-translate-y-[1px] active:translate-y-0 transition-all">
                    로그인 / 회원가입
                  </Link>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2 text-red-600 text-[13px] bg-red-50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} /> <span>{error}</span>
                  </div>
                  <button onClick={() => { setError(''); handleAnalyze(); }} className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-red-200 text-red-600 hover:bg-red-100 cursor-pointer transition-colors">
                    다시 시도
                  </button>
                </div>
              )
            )}

            {/* ─── Actions (Stage 2 only) ─── */}
            {reviewStage === 'reframe' && (
              <div className="flex items-center justify-between pt-1">
                <Button variant="secondary" onClick={() => setReviewStage('evaluate')} size="sm">
                  <RotateCcw size={14} /> 가정 다시 평가
                </Button>
                <div className="flex gap-2">
                  <ShareBar getText={() => reframeToMarkdown(current)} getTitle={() => '악보 해석 | ' + (current.analysis?.surface_task || '')} />
                  <Button onClick={handleConfirm} disabled={!current.selected_question}>
                    <Check size={14} /> {t('common.confirm')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ═══════════════════════════════════════
          STEP 4: Done — Score Reading Complete
         ═══════════════════════════════════════ */}
      {current?.status === 'done' && current.analysis && (() => {
        const analysis = normalizeAnalysis(current.analysis!);
        return (
          <div className="space-y-4 animate-fade-in">
            <div className="relative rounded-[20px] bg-[var(--surface)] border-2 border-[var(--success)] shadow-sm overflow-hidden">
              <StaffLines opacity={0.04} spacing={11} />
              <div className="relative z-10 p-6">
                <div className="flex items-center gap-2 text-[var(--success)] text-[13px] font-bold mb-5">
                  <Check size={14} />
                  <span>악보 해석 완료</span>
                  <BarLine type="final" height={16} className="ml-2" />
                  <span className="text-[var(--text-tertiary)] font-normal ml-1">핵심 질문이 정의되었습니다</span>
                </div>

                <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-[var(--text-tertiary)] mb-1.5">
                  재정의된 질문
                </p>
                <p className="text-[17px] font-bold text-[var(--text-primary)] leading-snug tracking-tight">
                  {current.selected_question || analysis.reframed_question}
                </p>
                {analysis.why_reframing_matters && (
                  <p className="text-[13px] text-[var(--text-secondary)] mt-3 leading-relaxed">
                    {analysis.why_reframing_matters}
                  </p>
                )}

                {/* ── Reward: 질문의 변화 ── */}
                {analysis.surface_task && (current.selected_question || analysis.reframed_question) !== analysis.surface_task && (
                  <div className="mt-5 pt-4 border-t border-[var(--success)]/20 reward-entrance">
                    <p className="text-[11px] font-semibold text-[var(--text-secondary)] mb-2.5">당신의 질문이 바뀌었습니다</p>
                    <div className="space-y-2">
                      <p className="text-[13px] text-[var(--text-tertiary)] line-through decoration-[var(--text-tertiary)]/30">
                        {analysis.surface_task}
                      </p>
                      <p className="text-[13px] font-semibold text-[var(--accent)]">
                        {current.selected_question || analysis.reframed_question}
                      </p>
                    </div>
                    {(() => {
                      const assumptions = analysis.hidden_assumptions || [];
                      const doubtful = assumptions.filter(a => a.evaluation === 'doubtful').length;
                      const uncertain = assumptions.filter(a => a.evaluation === 'uncertain').length;
                      const risky = doubtful + uncertain;
                      if (risky === 0) return null;
                      return (
                        <p className="mt-2.5 text-[11px] text-[var(--accent)]">
                          숨은 가정 {assumptions.length}건 중 {risky}건이 불확실 — 다음 단계에서 검증됩니다
                        </p>
                      );
                    })()}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="secondary" size="sm" onClick={() => { setCurrentId(null); setInputText(''); }}>
                <ArrowRight size={14} /> 새 악보 해석
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    if (!current || !current.analysis) return;
                    const projectId = current.project_id || getOrCreateProject(analysis.surface_task.slice(0, 30));
                    updateItem(currentId!, { project_id: projectId });
                    addRef(projectId, { tool: 'reframe', itemId: current.id, label: analysis.surface_task });
                    const content = reframeToMarkdown(current);
                    const contextData = buildReframeContext(current);
                    setHandoff({ from: 'reframe', fromItemId: current.id, content, projectId, contextData });
                    onNavigate('recast');
                  }}
                >
                  <Send size={14} /> 편곡으로 보내기
                </Button>
                <ShareBar getText={() => reframeToMarkdown(current)} getTitle={() => '악보 해석 | ' + (current.analysis?.surface_task || '')} />
              </div>
            </div>

            <NextStepGuide
              currentTool="reframe"
              projectId={current.project_id}
              onSendTo={(href) => {
                if (!current.analysis) return;
                const projectId = current.project_id || getOrCreateProject(analysis.surface_task.slice(0, 30));
                if (!current.project_id) updateItem(currentId!, { project_id: projectId });
                addRef(projectId, { tool: 'reframe', itemId: current.id, label: analysis.surface_task });
                setHandoff({ from: 'reframe', fromItemId: current.id, content: reframeToMarkdown(current), projectId, contextData: buildReframeContext(current) });
                onNavigate(href.replace('/tools/', ''));
              }}
            />
          </div>
        );
      })()}
    </div>
  );
}
