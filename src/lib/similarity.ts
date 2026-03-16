/**
 * Lightweight text similarity using bag-of-words cosine similarity.
 * Works for Korean text by treating syllable blocks as tokens.
 */

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s가-힣]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function termFrequency(tokens: string[]): Map<string, number> {
  const freq = new Map<string, number>();
  for (const token of tokens) {
    freq.set(token, (freq.get(token) || 0) + 1);
  }
  return freq;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  const allTerms = new Set([...a.keys(), ...b.keys()]);
  for (const term of allTerms) {
    const va = a.get(term) || 0;
    const vb = b.get(term) || 0;
    dotProduct += va * vb;
    normA += va * va;
    normB += vb * vb;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function computeSimilarity(textA: string, textB: string): number {
  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  return cosineSimilarity(termFrequency(tokensA), termFrequency(tokensB));
}

export function findSimilarItems<T extends { input_text?: string; raw_input?: string }>(
  query: string,
  items: T[],
  threshold = 0.2,
  maxResults = 3
): Array<T & { similarity: number }> {
  if (!query || query.length < 5) return [];

  return items
    .map((item) => ({
      ...item,
      similarity: computeSimilarity(query, item.input_text || item.raw_input || ''),
    }))
    .filter((item) => item.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxResults);
}
