export interface FuzzyMatchResult {
  matched: boolean;
  score: number;
}

export function fuzzyMatch(query: string, target: string): FuzzyMatchResult {
  const q = query.trim().toLowerCase();
  const t = target.toLowerCase();
  if (q.length === 0) return { matched: true, score: 0 };

  let score = 0;
  let cursor = 0;
  let consecutive = 0;

  for (const char of q) {
    const foundAt = t.indexOf(char, cursor);
    if (foundAt === -1) return { matched: false, score: 0 };
    consecutive = foundAt === cursor ? consecutive + 1 : 1;
    score += consecutive * 2 - (foundAt - cursor);
    cursor = foundAt + 1;
  }

  return { matched: true, score };
}

export function filterCommands<T>(query: string, items: T[], getLabel: (item: T) => string): T[] {
  const scored = items
    .map((item) => ({ item, result: fuzzyMatch(query, getLabel(item)) }))
    .filter((entry) => entry.result.matched);
  if (query.trim().length === 0) return scored.map((entry) => entry.item);
  scored.sort((a, b) => b.result.score - a.result.score);
  return scored.map((entry) => entry.item);
}
