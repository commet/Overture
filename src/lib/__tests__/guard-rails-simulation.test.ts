/**
 * Guard Rails Simulation — 프레임워크별 검증기 + 구체성 검증 테스트
 *
 * 시나리오:
 * 1. 각 프레임워크 검증기가 구조적 요건을 제대로 체크하는지
 * 2. 제네릭한 결과물이 탈락하는지
 * 3. 구체적인 결과물이 통과하는지
 * 4. 미등록 프레임워크가 패스스루되는지
 * 5. checkSpecificity가 제네릭/구체적 텍스트를 구분하는지
 */

import { describe, it, expect } from 'vitest';
import { validateByFramework } from '@/lib/guard-rails';
import { checkSpecificity } from '@/lib/worker-quality';

// ── 1. Pre-mortem 검증 ──

describe('Pre-mortem validator', () => {
  it('실패 시나리오 + 원인 + 확률이 있으면 통과', () => {
    const output = `이 프로젝트가 실패했다면 가장 큰 이유는 시장 타이밍입니다.
원인: 경쟁사가 6개월 먼저 출시하여 시장을 선점.
가능성: 약 40%. B2B SaaS 시장에서 후발주자의 실패 확률은 높습니다.`;
    const result = validateByFramework('Pre-mortem', output);
    expect(result.passed).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(60);
  });

  it('실패 키워드 없으면 탈락', () => {
    const output = `이 프로젝트는 잘 진행될 것으로 보입니다. 시장 상황이 좋고 팀이 우수합니다.`;
    const result = validateByFramework('Pre-mortem', output);
    expect(result.passed).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});

// ── 2. Unit Economics 검증 ──

describe('Unit Economics validator', () => {
  it('숫자 3개 + 가정 + 지표가 있으면 통과', () => {
    const output = `CAC: 50,000원 (가정: 네이버 광고 CPC 500원, 전환율 1%)
LTV: 600,000원 (구독 12개월 × 50,000원/월)
Payback Period: 1개월
마진율: 약 70%`;
    const result = validateByFramework('Unit Economics', output);
    expect(result.passed).toBe(true);
  });

  it('숫자가 부족하면 탈락', () => {
    const output = `The business model looks promising. We will acquire customers organically.`;
    const result = validateByFramework('Unit Economics', output);
    expect(result.passed).toBe(false);
    expect(result.issues.some(i => i.includes('number') || i.includes('숫자'))).toBe(true);
  });
});

// ── 3. SWOT 검증 ──

describe('SWOT validator', () => {
  it('4사분면 모두 있으면 통과', () => {
    const output = `강점: 기술 우위, 팀 역량
약점: 자금 부족
기회: 시장 성장
위협: 대기업 진출`;
    const result = validateByFramework('SWOT', output);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
  });

  it('2개만 있으면 탈락', () => {
    const output = `강점: 기술 우위
약점: 자금 부족`;
    const result = validateByFramework('SWOT', output);
    expect(result.passed).toBe(false);
  });
});

// ── 4. Pyramid Principle 검증 ──

describe('Pyramid Principle validator', () => {
  it('첫 줄이 결론 + 하위 근거면 통과', () => {
    const output = `이 제품은 B2B SaaS로 출시해야 합니다.
- 근거 1: 기업 고객의 지불 의사가 높음
- 근거 2: 셀프서브 모델로 영업 비용 절감
- 근거 3: 경쟁사 대비 기술 우위`;
    const result = validateByFramework('Pyramid Principle', output);
    expect(result.passed).toBe(true);
  });

  it('질문으로 시작하면 탈락', () => {
    const output = `이 제품을 어떻게 출시해야 할까요?
여러 방법이 있습니다.`;
    const result = validateByFramework('Pyramid Principle', output);
    expect(result.passed).toBe(false);
    expect(result.issues.some(i => i.includes('conclusion') || i.includes('결론'))).toBe(true);
  });
});

// ── 5. MECE 검증 ──

describe('MECE validator', () => {
  it('구조화된 카테고리 3개 이상이면 통과', () => {
    const output = `1. 제품 측면: 기능 개선, 안정성 강화
2. 마케팅 측면: 리드 제너레이션, 브랜딩
3. 운영 측면: 프로세스 자동화, 인력 확보
4. 재무 측면: 비용 절감, 수익 다각화`;
    const result = validateByFramework('MECE', output);
    expect(result.passed).toBe(true);
  });

  it('카테고리 없으면 탈락', () => {
    const output = `전반적으로 잘 되고 있습니다. 앞으로도 잘 될 것입니다.`;
    const result = validateByFramework('MECE 분류', output);
    expect(result.passed).toBe(false);
  });
});

// ── 6. Jobs-to-be-Done 검증 ──

describe('Jobs-to-be-Done validator', () => {
  it('상황 + 동기 + 결과 중 2개 이상이면 통과', () => {
    const output = `사용자 상황: 팀장이 주간 보고서를 매주 수동으로 만드는 상황
동기: 반복 작업 시간을 줄이고 핵심 업무에 집중하고 싶어함
기대 결과: 보고서 작성 시간 80% 절감`;
    const result = validateByFramework('Jobs-to-be-Done', output);
    expect(result.passed).toBe(true);
  });
});

// ── 7. Sensitivity Analysis 검증 ──

describe('Sensitivity Analysis validator', () => {
  it('변수 + 범위 + 수치 있으면 통과', () => {
    const output = `핵심 변수: 고객 이탈율
시나리오: 낙관(5%) → 기본(10%) → 비관(20%)
이탈율 10%일 때 연 매출 12억원, 20%면 7.2억원으로 감소`;
    const result = validateByFramework('Sensitivity Analysis', output);
    expect(result.passed).toBe(true);
  });
});

// ── 8. TAM/SAM/SOM 검증 ──

describe('TAM validator', () => {
  it('TAM + 수치가 있으면 통과', () => {
    const output = `TAM (전체 시장): 국내 SaaS 시장 약 3조원 (2025)
SAM (유효 시장): B2B 협업 도구 시장 약 5,000억원
SOM (목표 시장): 50인 이하 스타트업 대상 약 200억원`;
    const result = validateByFramework('TAM/SAM/SOM', output);
    expect(result.passed).toBe(true);
  });

  it('TAM 없으면 탈락', () => {
    const output = `시장이 크고 성장 중입니다. 많은 기회가 있습니다.`;
    const result = validateByFramework('TAM/SAM/SOM', output);
    expect(result.passed).toBe(false);
  });
});

// ── 9. 미등록 프레임워크 패스스루 ──

describe('미등록 프레임워크', () => {
  it('알 수 없는 프레임워크는 passed: true', () => {
    const result = validateByFramework('Unknown Framework XYZ', '아무 결과물');
    expect(result.passed).toBe(true);
    expect(result.score).toBe(70);
  });
});

// ── 10. checkSpecificity ──

describe('checkSpecificity', () => {
  it('사용자 입력을 구체적으로 참조하면 점수 높음', () => {
    const userInput = '우리 회사 MarketFit의 B2B SaaS 구독 모델에 대한 경쟁 분석';
    const output = `MarketFit의 B2B SaaS 모델은 경쟁사 대비 구독 가격이 20% 저렴합니다.
구독 모델의 월간 이탈율은 5%로 업계 평균 8%보다 낮습니다.
MarketFit의 핵심 차별점은 AI 기반 자동 분석 기능입니다.`;

    const result = checkSpecificity(output, userInput);
    expect(result.score).toBeGreaterThanOrEqual(50);
  });

  it('제네릭한 결과물은 점수 낮음', () => {
    const userInput = '우리 회사 신규 서비스 기획';
    const output = `일반적으로 시장 상황에 따라 다양한 요인을 종합적으로 고려해야 합니다.
추가 분석이 필요하며, 면밀한 검토가 필요합니다.
상황을 주시하면서 모니터링하겠습니다.`;

    const result = checkSpecificity(output, userInput);
    expect(result.score).toBeLessThan(40);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('숫자가 많으면 구체성 보너스', () => {
    const userInput = '매출 분석';
    const output = `월 매출 5,000만원, 객단가 25,000원, 고객 수 2,000명.
성장률 15%, 마진율 35%, CAC 12,000원.`;

    const result = checkSpecificity(output, userInput);
    expect(result.score).toBeGreaterThanOrEqual(60);
  });
});
