/**
 * Auto-Persona Simulation — 페르소나 자동 생성 + 맹점 추천 시뮬레이션
 *
 * 아키타입:
 * 1. extractPersonasFromContext — LLM 호출 시나리오 (mock)
 *    - analysis null → 빈 배열
 *    - 정상 컨텍스트 → 2-3명 추출
 *    - LLM 에러 → 빈 배열 (graceful)
 *    - LLM이 배열 아닌 값 반환 → 빈 배열
 *    - 4명 이상 반환 → 3명으로 slice
 * 2. recommendBlindSpotPersona — 축 분포 기반 맹점 추천
 *    - 데이터 부족 (< 3 items) → null
 *    - 가정 부족 (< 8 total) → null
 *    - 균형 분포 → null (맹점 없음)
 *    - customer_value 갭 → CX 추천
 *    - feasibility 갭 → 기술 리드 추천
 *    - business 갭 → 전략가 추천
 *    - org_capacity 갭 → 인사 추천
 *    - 기존 페르소나와 겹침 → 대안 선택
 *    - 모든 축이 0 → null (total < 8)
 * 3. autoPersonaToFull — 변환 정확성
 *    - AutoPersona → Persona
 *    - SuggestedReviewer → Persona (추가 필드 포함)
 * 4. sanitizeForPrompt — 프롬프트 인젝션 방어
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ReframeItem, RecastItem, SuggestedReviewer } from '@/stores/types';

// ── Mocks ──

vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })) } },
  getCurrentUserId: vi.fn(() => Promise.resolve(null)),
  clearUserCache: vi.fn(),
}));

vi.mock('@/lib/llm', () => ({
  callLLMJson: vi.fn(),
}));

vi.mock('@/lib/storage', () => ({
  getStorage: vi.fn(() => []),
  setStorage: vi.fn(),
  STORAGE_KEYS: {
    REFRAME_LIST: 'sot_reframe_list',
  },
}));

vi.mock('@/lib/uuid', () => ({
  generateId: vi.fn(() => `persona-test-${Math.random().toString(36).slice(2)}`),
}));

import {
  extractPersonasFromContext,
  recommendBlindSpotPersona,
  autoPersonaToFull,
  type AutoPersona,
} from '@/lib/auto-persona';
import { callLLMJson } from '@/lib/llm';
import { getStorage } from '@/lib/storage';

const mockCallLLMJson = vi.mocked(callLLMJson);
const mockGetStorage = vi.mocked(getStorage);

// ── Helpers ──

function makeReframe(overrides: Partial<ReframeItem> = {}): ReframeItem {
  return {
    id: `rf-${Math.random().toString(36).slice(2)}`,
    input_text: '신규 서비스 런칭 전략을 세우고 싶습니다',
    selected_question: 'selected',
    status: 'done',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    analysis: {
      surface_task: '서비스 런칭 전략 수립',
      reframed_question: '어떤 조건에서 이 서비스가 시장에서 살아남을 수 있는가?',
      why_reframing_matters: '런칭 전략이 아니라 생존 조건을 먼저 정의해야',
      reasoning_narrative: '',
      hidden_assumptions: [
        { assumption: '시장 수요가 있다', risk_if_false: '런칭 실패', evaluation: 'uncertain', axis: 'customer_value' },
        { assumption: '기술팀이 충분하다', risk_if_false: '일정 지연', evaluation: 'likely_true', axis: 'feasibility' },
      ],
      hidden_questions: [{ question: 'q1', reasoning: 'r1' }],
      ai_limitations: ['market research'],
    },
    ...overrides,
  };
}

function makeRecast(overrides: Partial<RecastItem> = {}): RecastItem {
  return {
    id: `rc-${Math.random().toString(36).slice(2)}`,
    input_text: '서비스 런칭 계획을 실행 가능한 스토리로 만들어주세요',
    steps: [],
    status: 'done',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    analysis: {
      governing_idea: '고객 검증 우선 → 점진적 확장',
      storyline: { situation: '시장 진입', complication: '경쟁 심화', resolution: '차별화 전략' },
      goal_summary: '3개월 내 PMF 달성',
      steps: [
        { task: '고객 인터뷰 50명', actor: 'human', actor_reasoning: '', expected_output: '인사이트 정리', checkpoint: true, checkpoint_reason: 'PMF 검증' },
        { task: 'MVP 개발', actor: 'ai', actor_reasoning: '', expected_output: '프로토타입', checkpoint: false, checkpoint_reason: '' },
        { task: '파일럿 런칭', actor: 'both', actor_reasoning: '', expected_output: '성과 데이터', checkpoint: true, checkpoint_reason: '투자 결정', judgment: '실행 vs 피벗' },
      ],
      key_assumptions: [
        { assumption: '고객 50명 확보 가능', importance: 'high', certainty: 'medium', if_wrong: '검증 불가' },
        { assumption: '3개월 일정 현실적', importance: 'medium', certainty: 'low', if_wrong: '예산 초과' },
      ],
      critical_path: [0, 2],
      total_estimated_time: '3개월',
      ai_ratio: 0.3,
      human_ratio: 0.7,
      design_rationale: '고객 검증 없이 개발하면 리스크가 너무 크다',
    },
    ...overrides,
  };
}

function makeAutoPersona(overrides: Partial<AutoPersona> = {}): AutoPersona {
  return {
    name: '김 부장',
    role: '영업본부장',
    influence: 'high',
    priorities: '매출 성장, 고객 확보',
    communication_style: '숫자 중심, 결론부터',
    known_concerns: '신규 서비스의 수익성',
    why_relevant: '영업 채널을 통한 고객 확보가 핵심이므로',
    ...overrides,
  };
}

function makeSuggestedReviewer(overrides: Partial<SuggestedReviewer> = {}): SuggestedReviewer {
  return {
    name: '박 대표',
    role: 'CEO',
    influence: 'high',
    priorities: '회사 성장, 투자 유치',
    communication_style: '큰 그림 중심',
    known_concerns: '리스크 관리',
    why_relevant: '최종 의사결정자',
    decision_style: 'analytical',
    risk_tolerance: 'medium',
    success_metric: 'ROI 200% 달성',
    ...overrides,
  };
}

/** Build reframe items with specific axis distributions for blind spot testing */
function buildReframeItems(
  count: number,
  axisDistribution: Record<string, number>,
): ReframeItem[] {
  const items: ReframeItem[] = [];
  for (let i = 0; i < count; i++) {
    const assumptions = Object.entries(axisDistribution).flatMap(([axis, axisCount]) =>
      Array.from({ length: axisCount }, (_, j) => ({
        assumption: `${axis}-assumption-${j}`,
        risk_if_false: 'some risk',
        evaluation: 'uncertain' as const,
        axis: axis as 'customer_value' | 'feasibility' | 'business' | 'org_capacity',
      }))
    );
    items.push(makeReframe({
      id: `rf-blind-${i}`,
      status: 'done',
      analysis: {
        surface_task: 'task',
        reframed_question: 'question?',
        why_reframing_matters: 'because',
        reasoning_narrative: '',
        hidden_assumptions: assumptions,
        hidden_questions: [],
        ai_limitations: [],
      },
    }));
  }
  return items;
}

// ── Tests ──

describe('Auto-Persona Simulation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStorage.mockReturnValue([]);
  });

  // ═══════════════════════════════════════
  // 1. extractPersonasFromContext
  // ═══════════════════════════════════════
  describe('extractPersonasFromContext', () => {
    it('recast.analysis가 null이면 빈 배열', async () => {
      const recast = makeRecast({ analysis: null });
      const result = await extractPersonasFromContext(makeReframe(), recast);
      expect(result).toEqual([]);
      expect(mockCallLLMJson).not.toHaveBeenCalled();
    });

    it('정상 컨텍스트 → LLM에서 2-3명 추출', async () => {
      const personas = [
        makeAutoPersona({ name: '김 본부장', role: '영업본부장' }),
        makeAutoPersona({ name: '이 팀장', role: 'CTO' }),
      ];
      mockCallLLMJson.mockResolvedValue(personas);

      const result = await extractPersonasFromContext(makeReframe(), makeRecast());
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('김 본부장');
      expect(result[1].role).toBe('CTO');
    });

    it('reframe이 null이어도 recast 데이터만으로 동작', async () => {
      mockCallLLMJson.mockResolvedValue([makeAutoPersona()]);
      const result = await extractPersonasFromContext(null, makeRecast());
      expect(result).toHaveLength(1);

      // LLM 호출 시 context에 reframe 관련 내용 없음
      const callArgs = mockCallLLMJson.mock.calls[0];
      const userMessage = callArgs[0][0].content as string;
      expect(userMessage).not.toContain('[원래 과제]');
      expect(userMessage).toContain('[핵심 방향]');
    });

    it('reframe.analysis가 null이면 reframe 부분만 skip', async () => {
      mockCallLLMJson.mockResolvedValue([makeAutoPersona()]);
      const reframe = makeReframe({ analysis: null });
      const result = await extractPersonasFromContext(reframe, makeRecast());
      expect(result).toHaveLength(1);

      const userMessage = mockCallLLMJson.mock.calls[0][0][0].content as string;
      expect(userMessage).toContain('[원래 과제]'); // input_text는 있음
      expect(userMessage).not.toContain('[재정의된 질문]'); // analysis 없으므로
    });

    it('LLM이 4명 이상 반환 → 3명으로 잘림', async () => {
      mockCallLLMJson.mockResolvedValue([
        makeAutoPersona({ name: '1' }),
        makeAutoPersona({ name: '2' }),
        makeAutoPersona({ name: '3' }),
        makeAutoPersona({ name: '4' }),
      ]);
      const result = await extractPersonasFromContext(makeReframe(), makeRecast());
      expect(result).toHaveLength(3);
      expect(result.map(r => r.name)).toEqual(['1', '2', '3']);
    });

    it('LLM이 빈 배열 반환 → 빈 배열', async () => {
      mockCallLLMJson.mockResolvedValue([]);
      const result = await extractPersonasFromContext(makeReframe(), makeRecast());
      expect(result).toEqual([]);
    });

    it('LLM이 배열이 아닌 객체 반환 → 빈 배열', async () => {
      mockCallLLMJson.mockResolvedValue({ error: 'not an array' });
      const result = await extractPersonasFromContext(makeReframe(), makeRecast());
      expect(result).toEqual([]);
    });

    it('LLM이 문자열 반환 → 빈 배열', async () => {
      mockCallLLMJson.mockResolvedValue('invalid');
      const result = await extractPersonasFromContext(makeReframe(), makeRecast());
      expect(result).toEqual([]);
    });

    it('LLM이 null 반환 → 빈 배열', async () => {
      mockCallLLMJson.mockResolvedValue(null);
      const result = await extractPersonasFromContext(makeReframe(), makeRecast());
      expect(result).toEqual([]);
    });

    it('LLM 에러 → graceful fallback 빈 배열', async () => {
      mockCallLLMJson.mockRejectedValue(new Error('API error'));
      const result = await extractPersonasFromContext(makeReframe(), makeRecast());
      expect(result).toEqual([]);
    });

    it('system prompt에 조직 분석 전문가 역할이 포함', async () => {
      mockCallLLMJson.mockResolvedValue([]);
      await extractPersonasFromContext(makeReframe(), makeRecast());

      const callArgs = mockCallLLMJson.mock.calls[0];
      const options = callArgs[1];
      expect(options.system).toContain('조직 분석 전문가');
      expect(options.system).toContain('이해관계자 2-3명');
    });

    it('context에 실행 계획 단계들이 포함', async () => {
      mockCallLLMJson.mockResolvedValue([]);
      await extractPersonasFromContext(makeReframe(), makeRecast());

      const userMessage = mockCallLLMJson.mock.calls[0][0][0].content as string;
      expect(userMessage).toContain('[실행 계획]');
      expect(userMessage).toContain('고객 인터뷰 50명');
      expect(userMessage).toContain('(체크포인트)');
    });

    it('context에 핵심 가정이 포함', async () => {
      mockCallLLMJson.mockResolvedValue([]);
      await extractPersonasFromContext(makeReframe(), makeRecast());

      const userMessage = mockCallLLMJson.mock.calls[0][0][0].content as string;
      expect(userMessage).toContain('[핵심 가정]');
      expect(userMessage).toContain('고객 50명 확보 가능');
      expect(userMessage).toContain('중요도: high');
    });

    it('judgment가 있는 step은 판단 내용이 context에 포함', async () => {
      mockCallLLMJson.mockResolvedValue([]);
      await extractPersonasFromContext(makeReframe(), makeRecast());

      const userMessage = mockCallLLMJson.mock.calls[0][0][0].content as string;
      expect(userMessage).toContain('판단: 실행 vs 피벗');
    });

    it('steps가 없으면 실행 계획 섹션 없음', async () => {
      mockCallLLMJson.mockResolvedValue([]);
      const recast = makeRecast({
        analysis: { ...makeRecast().analysis!, steps: undefined as unknown as [] },
      });
      await extractPersonasFromContext(null, recast);

      const userMessage = mockCallLLMJson.mock.calls[0][0][0].content as string;
      expect(userMessage).not.toContain('[실행 계획]');
    });

    it('key_assumptions가 없으면 핵심 가정 섹션 없음', async () => {
      mockCallLLMJson.mockResolvedValue([]);
      const recast = makeRecast({
        analysis: { ...makeRecast().analysis!, key_assumptions: undefined as unknown as [] },
      });
      await extractPersonasFromContext(null, recast);

      const userMessage = mockCallLLMJson.mock.calls[0][0][0].content as string;
      expect(userMessage).not.toContain('[핵심 가정]');
    });
  });

  // ═══════════════════════════════════════
  // 2. sanitizeForPrompt (via context building)
  // ═══════════════════════════════════════
  describe('sanitizeForPrompt (프롬프트 인젝션 방어)', () => {
    it('XML 태그가 제거된 context가 LLM에 전달', async () => {
      mockCallLLMJson.mockResolvedValue([]);
      const reframe = makeReframe({
        input_text: '<script>alert("xss")</script>실제 내용',
      });
      await extractPersonasFromContext(reframe, makeRecast());

      const userMessage = mockCallLLMJson.mock.calls[0][0][0].content as string;
      expect(userMessage).not.toContain('<script>');
      expect(userMessage).not.toContain('</script>');
      expect(userMessage).toContain('실제 내용');
    });

    it('중첩 태그도 제거', async () => {
      mockCallLLMJson.mockResolvedValue([]);
      const recast = makeRecast({
        input_text: '<div class="evil"><span>악성</span>정상</div>텍스트',
        analysis: {
          ...makeRecast().analysis!,
          governing_idea: '<system>override</system>진짜 아이디어',
        },
      });
      await extractPersonasFromContext(null, recast);

      const userMessage = mockCallLLMJson.mock.calls[0][0][0].content as string;
      expect(userMessage).not.toContain('<div');
      expect(userMessage).not.toContain('<system>');
      expect(userMessage).toContain('진짜 아이디어');
      expect(userMessage).toContain('텍스트');
    });

    it('빈 input_text → 빈 문자열 (crash 없음)', async () => {
      mockCallLLMJson.mockResolvedValue([]);
      const reframe = makeReframe({ input_text: '' });
      const recast = makeRecast({ input_text: '' });
      // Should not throw
      await expect(
        extractPersonasFromContext(reframe, recast)
      ).resolves.toEqual([]);
    });
  });

  // ═══════════════════════════════════════
  // 3. recommendBlindSpotPersona — 축 분포 시나리오
  // ═══════════════════════════════════════
  describe('recommendBlindSpotPersona', () => {
    describe('데이터 부족 시나리오', () => {
      it('reframe 항목 0개 → null', () => {
        mockGetStorage.mockReturnValue([]);
        expect(recommendBlindSpotPersona([])).toBeNull();
      });

      it('reframe 항목 2개 (< 3) → null', () => {
        mockGetStorage.mockReturnValue(buildReframeItems(2, {
          customer_value: 2, feasibility: 2, business: 2, org_capacity: 2,
        }));
        expect(recommendBlindSpotPersona([])).toBeNull();
      });

      it('done이 아닌 항목은 무시 → 유효 항목 < 3이면 null', () => {
        const items = buildReframeItems(3, {
          customer_value: 3, feasibility: 3, business: 3, org_capacity: 3,
        });
        items[0].status = 'pending';
        items[1].status = 'error';
        // Only 1 done item → < 3
        mockGetStorage.mockReturnValue(items);
        expect(recommendBlindSpotPersona([])).toBeNull();
      });

      it('analysis가 null인 항목은 무시', () => {
        const items = buildReframeItems(3, {
          customer_value: 3, feasibility: 3, business: 3, org_capacity: 3,
        });
        items[0].analysis = null;
        items[1].analysis = null;
        mockGetStorage.mockReturnValue(items);
        expect(recommendBlindSpotPersona([])).toBeNull();
      });

      it('가정 총합 < 8 → null (과잉 해석 방지)', () => {
        // 3 items, each with 2 assumptions = 6 total (we need axis assumptions specifically)
        const items = buildReframeItems(3, {
          customer_value: 1, feasibility: 1,
        }); // 2 per item × 3 = 6 < 8
        mockGetStorage.mockReturnValue(items);
        expect(recommendBlindSpotPersona([])).toBeNull();
      });
    });

    describe('균형 분포 → null (맹점 없음)', () => {
      it('4축 균등 분포 → null', () => {
        // Each item: 3 customer, 3 feasibility, 3 business, 3 org = 12 per item
        // 3 items → 36 total, each axis 25%
        mockGetStorage.mockReturnValue(buildReframeItems(3, {
          customer_value: 3, feasibility: 3, business: 3, org_capacity: 3,
        }));
        expect(recommendBlindSpotPersona([])).toBeNull();
      });

      it('약간 불균형하지만 임계값(12.5%) 이상 → null', () => {
        // customer: 3, feasibility: 4, business: 3, org: 2 = 12 per item
        // org_capacity: 2/12 = 16.7% > 12.5% threshold
        mockGetStorage.mockReturnValue(buildReframeItems(3, {
          customer_value: 3, feasibility: 4, business: 3, org_capacity: 2,
        }));
        expect(recommendBlindSpotPersona([])).toBeNull();
      });
    });

    describe('축별 갭 감지', () => {
      it('customer_value 갭 → CX 담당자 추천', () => {
        // customer: 0, others: 4 each = 12 per item
        // customer: 0% < 12.5% threshold
        mockGetStorage.mockReturnValue(buildReframeItems(3, {
          customer_value: 0, feasibility: 4, business: 4, org_capacity: 4,
        }));
        const result = recommendBlindSpotPersona([]);
        expect(result).not.toBeNull();
        expect(result!.axis).toBe('customer_value');
        expect(result!.axis_label).toBe('고객 가치');
        expect(result!.name).toBe('고객 경험 담당자');
      });

      it('feasibility 갭 → 기술 리드 추천', () => {
        mockGetStorage.mockReturnValue(buildReframeItems(3, {
          customer_value: 4, feasibility: 0, business: 4, org_capacity: 4,
        }));
        const result = recommendBlindSpotPersona([]);
        expect(result).not.toBeNull();
        expect(result!.axis).toBe('feasibility');
        expect(result!.name).toBe('기술 리드');
      });

      it('business 갭 → 사업 전략가 추천', () => {
        mockGetStorage.mockReturnValue(buildReframeItems(3, {
          customer_value: 4, feasibility: 4, business: 0, org_capacity: 4,
        }));
        const result = recommendBlindSpotPersona([]);
        expect(result).not.toBeNull();
        expect(result!.axis).toBe('business');
        expect(result!.name).toBe('사업 전략가');
      });

      it('org_capacity 갭 → 조직문화 담당자 추천', () => {
        mockGetStorage.mockReturnValue(buildReframeItems(3, {
          customer_value: 4, feasibility: 4, business: 4, org_capacity: 0,
        }));
        const result = recommendBlindSpotPersona([]);
        expect(result).not.toBeNull();
        expect(result!.axis).toBe('org_capacity');
        expect(result!.name).toBe('조직문화 담당자');
      });

      it('가장 약한 축이 추천됨 (복수 갭 시)', () => {
        // customer: 0, business: 1, others: 5 = 11 per item
        // customer: 0% vs business: 1/11 = 9.1%
        // Both below 12.5%, but customer is weaker
        mockGetStorage.mockReturnValue(buildReframeItems(3, {
          customer_value: 0, feasibility: 5, business: 1, org_capacity: 5,
        }));
        const result = recommendBlindSpotPersona([]);
        expect(result).not.toBeNull();
        expect(result!.axis).toBe('customer_value'); // 0% < 9.1%
      });
    });

    describe('기존 페르소나 겹침 방지', () => {
      it('CX 팀장이 이미 있으면 대안(서비스 기획자) 선택', () => {
        mockGetStorage.mockReturnValue(buildReframeItems(3, {
          customer_value: 0, feasibility: 4, business: 4, org_capacity: 4,
        }));
        const result = recommendBlindSpotPersona(['CX 팀장']);
        expect(result).not.toBeNull();
        expect(result!.name).toBe('서비스 기획자');
      });

      it('CTO가 이미 있으면 운영 담당자 선택 (feasibility 축)', () => {
        mockGetStorage.mockReturnValue(buildReframeItems(3, {
          customer_value: 4, feasibility: 0, business: 4, org_capacity: 4,
        }));
        const result = recommendBlindSpotPersona(['CTO']);
        expect(result).not.toBeNull();
        expect(result!.name).toBe('운영 담당자');
      });

      it('두 후보 모두 겹치면 첫 번째 fallback', () => {
        mockGetStorage.mockReturnValue(buildReframeItems(3, {
          customer_value: 0, feasibility: 4, business: 4, org_capacity: 4,
        }));
        // Both 'CX 팀장' and '프로덕트 매니저' overlap
        const result = recommendBlindSpotPersona(['CX 팀장', '프로덕트 매니저']);
        expect(result).not.toBeNull();
        // Falls back to candidates[0]
        expect(result!.name).toBe('고객 경험 담당자');
      });

      it('대소문자 무시 매칭', () => {
        mockGetStorage.mockReturnValue(buildReframeItems(3, {
          customer_value: 0, feasibility: 4, business: 4, org_capacity: 4,
        }));
        const result = recommendBlindSpotPersona(['cx 팀장']); // lowercase
        expect(result).not.toBeNull();
        expect(result!.name).toBe('서비스 기획자'); // skipped first candidate
      });
    });

    describe('Sliding Window (최근 10개)', () => {
      it('11개 이상이면 최근 10개만 사용', () => {
        // First 5: heavy customer_value, no org_capacity
        const oldItems = buildReframeItems(5, {
          customer_value: 5, feasibility: 1, business: 1, org_capacity: 0,
        });
        // Last 6: balanced distribution
        const newItems = buildReframeItems(6, {
          customer_value: 3, feasibility: 3, business: 3, org_capacity: 3,
        });
        // Total 11, sliding window takes last 10 (5 old + 5 new? No, last 10 of 11)
        // Actually: items[1..10] — 4 old + 6 new
        // But since new items are balanced, the window is mostly balanced
        mockGetStorage.mockReturnValue([...oldItems, ...newItems]);
        const result = recommendBlindSpotPersona([]);
        // With balanced recent data, likely null (no significant gap)
        // The old org_capacity=0 items are partially excluded by window
        expect(result).toBeNull();
      });

      it('최근 10개에서만 갭이 있으면 감지', () => {
        // First 5: balanced (outside window if total > 10)
        const oldItems = buildReframeItems(5, {
          customer_value: 3, feasibility: 3, business: 3, org_capacity: 3,
        });
        // Last 6: business gap
        const newItems = buildReframeItems(6, {
          customer_value: 4, feasibility: 4, business: 0, org_capacity: 4,
        });
        mockGetStorage.mockReturnValue([...oldItems, ...newItems]);
        const result = recommendBlindSpotPersona([]);
        // Window: last 10 = old[4] + new[0..5] → new items dominate
        // business = 0 in new items → gap detected
        expect(result).not.toBeNull();
        expect(result!.axis).toBe('business');
      });
    });

    describe('축 없는 가정 무시', () => {
      it('axis가 undefined인 가정은 카운트 안됨', () => {
        const items = buildReframeItems(3, {});
        // Manually add assumptions without axis
        for (const item of items) {
          item.analysis!.hidden_assumptions = Array.from({ length: 5 }, () => ({
            assumption: 'no-axis',
            risk_if_false: 'risk',
            evaluation: 'uncertain' as const,
            // no axis field
          }));
        }
        mockGetStorage.mockReturnValue(items);
        expect(recommendBlindSpotPersona([])).toBeNull(); // total = 0 < 8
      });

      it('유효하지 않은 axis 값은 무시', () => {
        const items = buildReframeItems(3, {});
        for (const item of items) {
          item.analysis!.hidden_assumptions = Array.from({ length: 5 }, () => ({
            assumption: 'bad-axis',
            risk_if_false: 'risk',
            evaluation: 'uncertain' as const,
            axis: 'invalid_axis' as any,
          }));
        }
        mockGetStorage.mockReturnValue(items);
        expect(recommendBlindSpotPersona([])).toBeNull(); // total = 0 < 8
      });
    });
  });

  // ═══════════════════════════════════════
  // 4. autoPersonaToFull — 변환 정확성
  // ═══════════════════════════════════════
  describe('autoPersonaToFull', () => {
    describe('AutoPersona → Persona 변환', () => {
      it('기본 필드가 정확히 매핑', () => {
        const auto = makeAutoPersona();
        const full = autoPersonaToFull(auto);

        expect(full.name).toBe('김 부장');
        expect(full.role).toBe('영업본부장');
        expect(full.influence).toBe('high');
        expect(full.priorities).toBe('매출 성장, 고객 확보');
        expect(full.communication_style).toBe('숫자 중심, 결론부터');
        expect(full.known_concerns).toBe('신규 서비스의 수익성');
        expect(full.relationship_notes).toBe('영업 채널을 통한 고객 확보가 핵심이므로');
      });

      it('id가 자동 생성', () => {
        const full = autoPersonaToFull(makeAutoPersona());
        expect(full.id).toBeTruthy();
        expect(full.id.startsWith('persona-test-')).toBe(true);
      });

      it('organization은 빈 문자열', () => {
        expect(autoPersonaToFull(makeAutoPersona()).organization).toBe('');
      });

      it('feedback_logs는 빈 배열', () => {
        expect(autoPersonaToFull(makeAutoPersona()).feedback_logs).toEqual([]);
      });

      it('is_example은 false', () => {
        expect(autoPersonaToFull(makeAutoPersona()).is_example).toBe(false);
      });

      it('created_at, updated_at이 설정됨', () => {
        const full = autoPersonaToFull(makeAutoPersona());
        expect(full.created_at).toBeTruthy();
        expect(full.updated_at).toBeTruthy();
      });

      it('extracted_traits: priorities를 쉼표로 분리 (최대 3개)', () => {
        const auto = makeAutoPersona({ priorities: '매출, 고객, 브랜드, 기술' });
        const full = autoPersonaToFull(auto);
        expect(full.extracted_traits).toHaveLength(3);
        expect(full.extracted_traits).toEqual(['매출', '고객', '브랜드']);
      });

      it('extracted_traits: 다양한 구분자 (、·) 지원', () => {
        const auto1 = makeAutoPersona({ priorities: '매출、고객、브랜드' });
        expect(autoPersonaToFull(auto1).extracted_traits).toEqual(['매출', '고객', '브랜드']);

        const auto2 = makeAutoPersona({ priorities: '매출·고객·브랜드' });
        expect(autoPersonaToFull(auto2).extracted_traits).toEqual(['매출', '고객', '브랜드']);
      });

      it('priorities 빈 문자열 → extracted_traits 빈 배열', () => {
        const auto = makeAutoPersona({ priorities: '' });
        expect(autoPersonaToFull(auto).extracted_traits).toEqual([]);
      });

      it('SuggestedReviewer 전용 필드 없음 (AutoPersona일 때)', () => {
        const full = autoPersonaToFull(makeAutoPersona());
        expect(full.decision_style).toBeUndefined();
        expect(full.risk_tolerance).toBeUndefined();
        expect(full.success_metric).toBeUndefined();
      });
    });

    describe('SuggestedReviewer → Persona 변환', () => {
      it('추가 필드가 포함됨', () => {
        const reviewer = makeSuggestedReviewer({
          decision_style: 'analytical',
          risk_tolerance: 'medium',
          success_metric: 'ROI 200%',
        });
        const full = autoPersonaToFull(reviewer);

        expect(full.decision_style).toBe('analytical');
        expect(full.risk_tolerance).toBe('medium');
        expect(full.success_metric).toBe('ROI 200%');
      });

      it('extracted_traits: decision_style + risk_tolerance + priority 조합', () => {
        const reviewer = makeSuggestedReviewer({
          decision_style: 'analytical',
          risk_tolerance: 'medium',
          priorities: '성장, 안정',
        });
        const full = autoPersonaToFull(reviewer);

        // analytical → '데이터 중심', medium → '균형적', first priority → '성장'
        expect(full.extracted_traits).toContain('데이터 중심');
        expect(full.extracted_traits).toContain('균형적');
        expect(full.extracted_traits).toContain('성장');
      });

      it('decision_style 매핑: intuitive → 직관적', () => {
        const full = autoPersonaToFull(makeSuggestedReviewer({ decision_style: 'intuitive' }));
        expect(full.extracted_traits).toContain('직관적');
      });

      it('decision_style 매핑: consensus → 합의 중시', () => {
        const full = autoPersonaToFull(makeSuggestedReviewer({ decision_style: 'consensus' }));
        expect(full.extracted_traits).toContain('합의 중시');
      });

      it('decision_style 매핑: directive → 결단력', () => {
        const full = autoPersonaToFull(makeSuggestedReviewer({ decision_style: 'directive' }));
        expect(full.extracted_traits).toContain('결단력');
      });

      it('risk_tolerance 매핑: low → 리스크 회피', () => {
        const full = autoPersonaToFull(makeSuggestedReviewer({ risk_tolerance: 'low' }));
        expect(full.extracted_traits).toContain('리스크 회피');
      });

      it('risk_tolerance 매핑: high → 도전적', () => {
        const full = autoPersonaToFull(makeSuggestedReviewer({ risk_tolerance: 'high' }));
        expect(full.extracted_traits).toContain('도전적');
      });

      it('알 수 없는 decision_style → 빈 문자열 필터됨', () => {
        const reviewer = makeSuggestedReviewer({
          decision_style: 'unknown_style' as any,
          risk_tolerance: 'medium',
          priorities: '성장',
        });
        const full = autoPersonaToFull(reviewer);
        // 'unknown_style' maps to undefined → '' → filtered out
        expect(full.extracted_traits).not.toContain('');
        expect(full.extracted_traits).toContain('균형적');
        expect(full.extracted_traits).toContain('성장');
      });
    });
  });

  // ═══════════════════════════════════════
  // Cross-scenario 일관성
  // ═══════════════════════════════════════
  describe('Cross-scenario 일관성', () => {
    it('autoPersonaToFull 출력은 항상 유효한 Persona', () => {
      const inputs = [
        makeAutoPersona(),
        makeAutoPersona({ name: '', role: '', priorities: '', influence: 'low' }),
        makeSuggestedReviewer(),
        makeSuggestedReviewer({ priorities: '', decision_style: 'analytical', risk_tolerance: 'low' }),
      ];

      for (const input of inputs) {
        const full = autoPersonaToFull(input);
        expect(full.id).toBeTruthy();
        expect(typeof full.name).toBe('string');
        expect(typeof full.role).toBe('string');
        expect(Array.isArray(full.extracted_traits)).toBe(true);
        expect(Array.isArray(full.feedback_logs)).toBe(true);
        expect(full.is_example).toBe(false);
        expect(full.created_at).toBeTruthy();
        expect(full.updated_at).toBeTruthy();
      }
    });

    it('recommendBlindSpotPersona 출력 형식 일관성', () => {
      const distributions = [
        { customer_value: 0, feasibility: 4, business: 4, org_capacity: 4 },
        { customer_value: 4, feasibility: 0, business: 4, org_capacity: 4 },
        { customer_value: 4, feasibility: 4, business: 0, org_capacity: 4 },
        { customer_value: 4, feasibility: 4, business: 4, org_capacity: 0 },
      ];

      for (const dist of distributions) {
        mockGetStorage.mockReturnValue(buildReframeItems(3, dist));
        const result = recommendBlindSpotPersona([]);
        expect(result).not.toBeNull();
        expect(result!.name).toBeTruthy();
        expect(result!.role).toBeTruthy();
        expect(result!.why).toBeTruthy();
        expect(result!.axis).toBeTruthy();
        expect(result!.axis_label).toBeTruthy();
        expect(['customer_value', 'feasibility', 'business', 'org_capacity']).toContain(result!.axis);
      }
    });
  });
});
