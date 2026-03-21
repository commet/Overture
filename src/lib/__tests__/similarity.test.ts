import { computeSimilarity, findSimilarItems } from '@/lib/similarity';

/* ────────────────────────────────────
   computeSimilarity
   ──────────────────────────────────── */

describe('computeSimilarity', () => {
  it('returns 1 for identical strings', () => {
    const text = '프로젝트 일정 관리 전략 수립';
    expect(computeSimilarity(text, text)).toBeCloseTo(1, 10);
  });

  it('returns ~0 for completely different strings', () => {
    const a = 'apple banana cherry';
    const b = '서울 부산 대전 광주';
    expect(computeSimilarity(a, b)).toBeCloseTo(0, 1);
  });

  it('returns 0 for empty strings', () => {
    expect(computeSimilarity('', 'hello')).toBe(0);
    expect(computeSimilarity('hello', '')).toBe(0);
    expect(computeSimilarity('', '')).toBe(0);
  });

  it('works with Korean text', () => {
    const a = '전략 기획 프로세스 개선';
    const b = '전략 기획 워크플로우 개선';
    const score = computeSimilarity(a, b);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  it('returns moderate score for similar text', () => {
    const a = 'project management strategy planning';
    const b = 'project planning and strategy review';
    const score = computeSimilarity(a, b);
    expect(score).toBeGreaterThan(0.3);
    expect(score).toBeLessThan(1);
  });

  it('is case-insensitive', () => {
    const a = 'Project Management';
    const b = 'project management';
    expect(computeSimilarity(a, b)).toBeCloseTo(1, 10);
  });
});

/* ────────────────────────────────────
   findSimilarItems
   ──────────────────────────────────── */

describe('findSimilarItems', () => {
  const items = [
    { input_text: '전략 기획 프로세스 개선 방안 작성' },
    { input_text: '마케팅 캠페인 예산 수립 계획' },
    { input_text: '전략 기획 워크플로우 자동화 제안' },
  ];

  it('returns empty for short query (< 5 chars)', () => {
    const result = findSimilarItems('짧은', items);
    expect(result).toEqual([]);
  });

  it('returns empty for empty query', () => {
    const result = findSimilarItems('', items);
    expect(result).toEqual([]);
  });

  it('respects threshold', () => {
    // High threshold → fewer results
    const highThreshold = findSimilarItems('전략 기획 프로세스 개선', items, 0.9);
    const lowThreshold = findSimilarItems('전략 기획 프로세스 개선', items, 0.1);
    expect(lowThreshold.length).toBeGreaterThanOrEqual(highThreshold.length);
  });

  it('respects maxResults', () => {
    const result = findSimilarItems('전략 기획 프로세스 개선', items, 0.1, 1);
    expect(result.length).toBeLessThanOrEqual(1);
  });

  it('attaches similarity score to results', () => {
    const result = findSimilarItems('전략 기획 프로세스 개선', items, 0.1);
    for (const item of result) {
      expect(item).toHaveProperty('similarity');
      expect(typeof item.similarity).toBe('number');
    }
  });

  it('results are sorted by similarity descending', () => {
    const result = findSimilarItems('전략 기획 프로세스 개선', items, 0.1);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].similarity).toBeGreaterThanOrEqual(result[i].similarity);
    }
  });

  it('works with raw_input field', () => {
    const rawItems = [
      { raw_input: '전략 기획 프로세스 개선 방안 작성' },
      { raw_input: '완전히 다른 주제의 문서' },
    ];
    const result = findSimilarItems('전략 기획 프로세스 개선', rawItems, 0.1);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].raw_input).toBe('전략 기획 프로세스 개선 방안 작성');
  });
});
