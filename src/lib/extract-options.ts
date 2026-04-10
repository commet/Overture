/**
 * extract-options.ts — 판단 텍스트에서 선택지 추출
 *
 * "질문: A vs B vs C" 형태의 decision/judgment 텍스트를 파싱해서
 * 칩 버튼으로 표시할 수 있는 선택지 배열을 반환.
 *
 * WorkflowGraph (RecastStep)와 WorkerCard (ProgressiveFlow) 양쪽에서 사용.
 */

/** Strip Korean particles from end of option text */
export function stripParticles(text: string): string {
  return text
    .replace(/\s*(중에서|사이에서|으로|를|을|에서|로|이|가|은|는|와|과|도|만)\s*.*$/, '')
    .replace(/\s*(결정|선택|판단|비교|검토).*$/, '')
    .trim();
}

/** Extract selectable options from judgment/decision text */
export function extractOptions(text?: string): string[] {
  if (!text) return [];

  // Strategy 1: "vs" separated
  if (text.includes(' vs ')) {
    const sentences = text.split(/[.]\s*/);
    for (const sentence of sentences) {
      if (!sentence.includes(' vs ')) continue;
      const cleaned = sentence.replace(/^[^:]*:\s*/, '');
      const opts = cleaned
        .split(/\s+vs\.?\s+/)
        .map(o => stripParticles(o))
        .filter(o => o.length >= 2 && o.length <= 40);
      if (opts.length >= 2) return opts;
    }
  }

  // Strategy 2: "/" separated (but not dates like 2024/2025)
  if (text.includes('/') && !/\d{4}\/\d/.test(text)) {
    const clauses = text.split(/[,.]\s*/);
    for (const clause of clauses) {
      if (!clause.includes('/')) continue;
      const opts = clause.split('/').map(o => o.trim()).filter(o => o.length >= 2 && o.length <= 40);
      if (opts.length >= 2 && opts.length <= 5) return opts;
    }
  }

  // Strategy 3: "~할지 ~할지" pattern (Korean decision phrasing)
  const haljiMatch = text.match(/(.{2,20})할지[,\s]+(.{2,20})할지/);
  if (haljiMatch) {
    return [haljiMatch[1].trim() + '하기', haljiMatch[2].trim() + '하기'];
  }

  // Strategy 4: "~인지 ~인지" pattern
  const injiMatch = text.match(/(.{2,20})인지[,\s]+(.{2,20})인지/);
  if (injiMatch) {
    return [injiMatch[1].trim(), injiMatch[2].trim()];
  }

  // Strategy 5: numbered list "1) A 2) B" or "1. A 2. B"
  const numbered = text.match(/[1-5][.)]\s*([^1-5]{2,30})/g);
  if (numbered && numbered.length >= 2) {
    return numbered.map(n => n.replace(/^[1-5][.)]\s*/, '').trim()).filter(o => o.length >= 2);
  }

  return [];
}
