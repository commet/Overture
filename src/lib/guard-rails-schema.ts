/**
 * Guard Rails Schema — 프레임워크 검증 규칙의 데이터 정의.
 *
 * 기존 guard-rails.ts의 하드코딩된 VALIDATORS를 선언적 규칙으로 변환.
 * 새 프레임워크 추가 시 코드 변경 없이 규칙만 추가하면 됨.
 */

// ─── Types ───

export interface ValidationSignal {
  id: string;
  type: 'keywords' | 'numeric' | 'bullets' | 'first_line_conclusion';
  /** keywords 타입일 때 매칭할 패턴 (string = includes, RegExp = test) */
  patterns?: (string | RegExp)[];
  /** 최소 매칭 수 (keywords) 또는 최소 개수 (numeric, bullets) */
  minCount?: number;
  /** 점수 가중치 (0-100 범위 내 기여분) */
  weight: number;
  /** 실패 시 표시할 메시지 */
  failMessage: string;
  /** 개별 매칭마다 보너스 점수 (keyword 개수에 비례) */
  perMatchBonus?: number;
}

export interface FrameworkValidationRule {
  /** 프레임워크 이름 매칭 패턴 (lowercase partial match) */
  frameworkPattern: string;
  /** 검증 시그널 목록 */
  signals: ValidationSignal[];
  /** 통과 임계 점수 (기본 60) */
  passThreshold?: number;
}

// ─── 규칙 정의 ───

export const FRAMEWORK_RULES: FrameworkValidationRule[] = [
  {
    frameworkPattern: 'pre-mortem',
    signals: [
      {
        id: 'failure_scenario',
        type: 'keywords',
        patterns: ['실패', '망', '붕괴', '위기', '무산', '좌절', '실패했다면', 'fail', 'collapse', 'crisis', 'derail', 'fall apart'],
        minCount: 1,
        weight: 30,
        perMatchBonus: 15,
        failMessage: 'No failure scenario specified',
      },
      {
        id: 'failure_cause',
        type: 'keywords',
        patterns: ['원인', '이유', '때문', '요인', '근본', '원인은', 'cause', 'reason', 'because', 'factor', 'root cause'],
        minCount: 1,
        weight: 30,
        perMatchBonus: 15,
        failMessage: 'No failure causes provided',
      },
      {
        id: 'likelihood',
        type: 'keywords',
        patterns: [/확률|가능성|\d+%|높[다음]|낮[다음]/, /probability|likelihood|likely|unlikely|chance/i],
        minCount: 1,
        weight: 20,
        perMatchBonus: 10,
        failMessage: 'No probability/likelihood estimation',
      },
    ],
    passThreshold: 60,
  },

  {
    frameworkPattern: 'unit economics',
    signals: [
      {
        id: 'numbers',
        type: 'numeric',
        minCount: 3,
        weight: 40,
        perMatchBonus: 10,
        failMessage: 'Only found insufficient numbers (minimum 3 required)',
      },
      {
        id: 'assumptions',
        type: 'keywords',
        patterns: ['가정', '전제', '기준', 'assumption'],
        minCount: 1,
        weight: 20,
        failMessage: 'No assumptions/premises stated',
      },
      {
        id: 'unit_metrics',
        type: 'keywords',
        patterns: ['CAC', 'LTV', 'ARPU', 'Payback', '고객획득비', '생애가치', '단가', '마진'],
        minCount: 1,
        weight: 20,
        failMessage: 'No key metrics (CAC, LTV, etc.) mentioned',
      },
    ],
    passThreshold: 60,
  },

  {
    frameworkPattern: 'tam',
    signals: [
      {
        id: 'tam',
        type: 'keywords',
        patterns: [/TAM|전체\s*시장|총\s*(시장|규모)/i],
        minCount: 1,
        weight: 30,
        failMessage: 'TAM (Total Addressable Market) missing',
      },
      {
        id: 'sam',
        type: 'keywords',
        patterns: [/SAM|유효\s*시장|접근\s*가능/i],
        minCount: 1,
        weight: 25,
        failMessage: 'SAM (Serviceable Available Market) missing',
      },
      {
        id: 'som',
        type: 'keywords',
        patterns: [/SOM|목표\s*시장|실제\s*점유/i],
        minCount: 1,
        weight: 20,
        failMessage: 'SOM (Serviceable Obtainable Market) missing',
      },
      {
        id: 'market_numbers',
        type: 'numeric',
        minCount: 2,
        weight: 25,
        perMatchBonus: 5,
        failMessage: 'Insufficient market size figures',
      },
    ],
    passThreshold: 55,
  },

  {
    frameworkPattern: 'sensitivity',
    signals: [
      {
        id: 'variables',
        type: 'keywords',
        patterns: ['변수', '파라미터', '항목', '요인', '가정', 'variable', 'parameter', 'factor', 'assumption'],
        minCount: 1,
        weight: 30,
        failMessage: 'No analysis variables specified',
      },
      {
        id: 'range',
        type: 'keywords',
        patterns: [/\d+.*[~\-→].*\d+/, /최선.*최악|낙관.*비관|베스트.*워스트/, /best.*worst|optimistic.*pessimistic|bull.*bear/i],
        minCount: 1,
        weight: 30,
        failMessage: 'No range/scenario provided',
      },
      {
        id: 'numbers',
        type: 'numeric',
        minCount: 3,
        weight: 40,
        perMatchBonus: 8,
        failMessage: 'Insufficient numbers',
      },
    ],
    passThreshold: 60,
  },

  {
    frameworkPattern: 'mece',
    signals: [
      {
        id: 'categories',
        type: 'bullets',
        minCount: 3,
        weight: 60,
        perMatchBonus: 12,
        failMessage: 'Fewer than 3 categories',
      },
      {
        id: 'mece_mention',
        type: 'keywords',
        patterns: ['빠짐없이', '겹침없이', 'MECE', '상호배제', '전체포괄', 'mutually exclusive', 'collectively exhaustive'],
        minCount: 1,
        weight: 20,
        failMessage: 'No MECE principle mentioned',
      },
    ],
    passThreshold: 40,
  },

  {
    frameworkPattern: 'pyramid',
    signals: [
      {
        id: 'conclusion_first',
        type: 'first_line_conclusion',
        weight: 50,
        failMessage: 'No conclusion in first line (Pyramid Principle violation)',
      },
      {
        id: 'supporting',
        type: 'bullets',
        minCount: 2,
        weight: 30,
        failMessage: 'Insufficient supporting evidence/sub-items',
      },
    ],
    passThreshold: 60,
  },

  {
    frameworkPattern: 'jobs-to-be-done',
    signals: [
      {
        id: 'situation',
        type: 'keywords',
        patterns: ['상황', '맥락', '환경', 'context', 'situation', '~할 때'],
        minCount: 1,
        weight: 30,
        failMessage: 'Situation/context element missing',
      },
      {
        id: 'motivation',
        type: 'keywords',
        patterns: ['동기', '이유', '필요', '원하', 'want', 'need', 'job'],
        minCount: 1,
        weight: 30,
        failMessage: 'Motivation/need element missing',
      },
      {
        id: 'outcome',
        type: 'keywords',
        patterns: ['결과', '기대', '성과', '효과', 'outcome', '달성'],
        minCount: 1,
        weight: 30,
        failMessage: 'Expected outcome element missing',
      },
    ],
    passThreshold: 55,
  },

  {
    frameworkPattern: 'swot',
    signals: [
      {
        id: 'strength',
        type: 'keywords',
        patterns: ['강점', 'Strength', 'S:', 'S)'],
        minCount: 1,
        weight: 25,
        failMessage: 'Strength quadrant missing',
      },
      {
        id: 'weakness',
        type: 'keywords',
        patterns: ['약점', 'Weakness', 'W:', 'W)'],
        minCount: 1,
        weight: 25,
        failMessage: 'Weakness quadrant missing',
      },
      {
        id: 'opportunity',
        type: 'keywords',
        patterns: ['기회', 'Opportunit', 'O:', 'O)'],
        minCount: 1,
        weight: 25,
        failMessage: 'Opportunity quadrant missing',
      },
      {
        id: 'threat',
        type: 'keywords',
        patterns: ['위협', 'Threat', 'T:', 'T)'],
        minCount: 1,
        weight: 25,
        failMessage: 'Threat quadrant missing',
      },
    ],
    passThreshold: 70,
  },
];
