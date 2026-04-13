/**
 * attribution-heuristic.ts — LLM 귀속이 실패했을 때 쓰는 폴백 점수기.
 *
 * 섹션 content와 각 워커의 result 간 유사도를 계산해서, 가장 많이 겹치는
 * 워커 1-3명을 기여자로 추린다. LLM이 `contributors` 필드를 비워 보내거나
 * 이름을 잘못 써서 해석 불가일 때만 호출한다.
 *
 * 설계 원칙:
 * - 한/영 공통 작동 — 문자 단위 n-gram(바이그램)으로 토크나이저 의존성 제거.
 * - 단어가 아니라 문자 조각을 세기 때문에 언어·토큰화 가정이 없다.
 * - distinctive(한 워커에만 등장하는) 겹침에 가중치를 줘서 "너무 일반적인"
 *   표현으로 겹치는 오탐을 줄인다.
 * - 임계값 기본값은 보수적(0.12) — LLM 성공분을 건드리지 않고, 진짜로
 *   확실한 경우만 잡는다.
 * - 동점 시 등장 순서(워커 배열 순) 유지.
 */

export interface WorkerSource {
  workerId: string;
  name: string;
  result: string;
}

export interface HeuristicContributor {
  workerId: string;
  name: string;
  score: number;
}

export interface HeuristicOptions {
  maxContributors?: number;  // 최대 몇 명까지 반환할지 (default 3)
  minScore?: number;         // 이 점수 미만은 아예 무시 (default 0.12)
  ngramSize?: number;        // 바이그램=2, 트라이그램=3 (default 2)
}

// 공백 정규화 + 기호 제거 — 언어 중립적 전처리
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s\u200b-\u200f\u2028-\u202f]+/g, ' ')
    // keep letters/numbers/CJK, drop everything else
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// 문자 n-gram multiset (Map: gram → count)
function charNgrams(text: string, n: number): Map<string, number> {
  const out = new Map<string, number>();
  const cleaned = normalize(text);
  if (cleaned.length < n) return out;
  // 토큰 경계를 넘는 n-gram을 줄이기 위해 토큰 단위로 쪼개서 돌린다
  for (const tok of cleaned.split(' ')) {
    if (tok.length < n) continue;
    for (let i = 0; i <= tok.length - n; i++) {
      const gram = tok.slice(i, i + n);
      out.set(gram, (out.get(gram) || 0) + 1);
    }
  }
  return out;
}

// 두 multiset의 Jaccard + distinctive bonus
// — distinctiveMap: 해당 gram이 전체 워커 중 몇 명에게 나타났는지
function similarity(
  sectionGrams: Map<string, number>,
  workerGrams: Map<string, number>,
  distinctiveMap: Map<string, number>,
  totalWorkers: number,
): number {
  if (sectionGrams.size === 0 || workerGrams.size === 0) return 0;

  let intersection = 0;
  let weightedIntersection = 0;
  let union = 0;

  // multiset intersection = sum of min counts
  for (const [gram, sCount] of sectionGrams) {
    const wCount = workerGrams.get(gram) || 0;
    const inter = Math.min(sCount, wCount);
    intersection += inter;
    if (inter > 0) {
      // distinctive 가중치: 한 워커에만 있으면 x2, 절반 이하에 있으면 x1.5
      const presentIn = distinctiveMap.get(gram) || totalWorkers;
      const weight = presentIn <= 1 ? 2 : presentIn * 2 <= totalWorkers ? 1.5 : 1;
      weightedIntersection += inter * weight;
    }
  }

  for (const [, sCount] of sectionGrams) union += sCount;
  for (const [, wCount] of workerGrams) union += wCount;
  union -= intersection; // multiset union

  if (union === 0) return 0;

  // 기본 Jaccard를 distinctive 가중치로 스케일
  const base = intersection / union;
  const distinctiveScale = intersection > 0 ? weightedIntersection / intersection : 1;
  return base * distinctiveScale;
}

export function resolveContributorsHeuristic(
  sectionContent: string,
  workers: WorkerSource[],
  options: HeuristicOptions = {},
): HeuristicContributor[] {
  const maxContributors = options.maxContributors ?? 3;
  const minScore = options.minScore ?? 0.12;
  const n = options.ngramSize ?? 2;

  if (!sectionContent || sectionContent.trim().length < 10) return [];
  if (workers.length === 0) return [];

  const sectionGrams = charNgrams(sectionContent, n);
  if (sectionGrams.size === 0) return [];

  // 전체 워커에서 gram 등장 빈도 — distinctive 가중치 계산용
  const workerGramSets = workers.map(w => charNgrams(w.result, n));
  const distinctiveMap = new Map<string, number>();
  for (const wGrams of workerGramSets) {
    for (const gram of wGrams.keys()) {
      distinctiveMap.set(gram, (distinctiveMap.get(gram) || 0) + 1);
    }
  }

  // 점수 계산
  const scored = workers.map((w, i) => ({
    workerId: w.workerId,
    name: w.name,
    score: similarity(sectionGrams, workerGramSets[i], distinctiveMap, workers.length),
  }));

  // 임계값 필터 + 점수 내림차순 정렬 (동점이면 원래 순서 유지)
  return scored
    .map((s, i) => ({ ...s, origIndex: i }))
    .filter(s => s.score >= minScore)
    .sort((a, b) => b.score - a.score || a.origIndex - b.origIndex)
    .slice(0, maxContributors)
    .map(({ workerId, name, score }) => ({ workerId, name, score }));
}
