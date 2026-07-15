/**
 * 模糊锚点定位：文档被用户轻改后，指令集里记录的原文片段（quote）可能不再精确匹配。
 * 策略：先试精确子串匹配（最常见、最快、零歧义）；失败再试模糊匹配——在每个候选位置用
 * 编辑距离算出相似度，只有最佳匹配显著超过阈值、且明显优于次佳匹配时才采信，否则宁可
 * 报错跳过也不猜——SPEC 硬性要求"定位失败时报错并跳过（不错插）"。
 */

const DEFAULT_THRESHOLD = 0.82;
/** 次佳匹配的相似度必须比最佳匹配低至少这么多，否则判定为有歧义，拒绝自动选择。 */
const AMBIGUITY_MARGIN = 0.05;
/** 窗口长度相对 quote 长度的浮动范围，覆盖"匹配区域被轻微增删字符"的情况。 */
const WINDOW_LENGTH_RATIOS = [0.85, 0.92, 1.0, 1.08, 1.15];

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = new Array<number>(n + 1);
  let curr = new Array<number>(n + 1);
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function similarity(a: string, b: string): number {
  if (a.length === 0 && b.length === 0) return 1;
  const distance = levenshtein(a, b);
  return 1 - distance / Math.max(a.length, b.length);
}

export interface FuzzyCandidate {
  paragraphIndex: number;
  start: number;
  end: number;
  score: number;
  matchedText: string;
}

/** 在单个段落文本里找 quote 的最佳模糊匹配窗口（多个窗口长度变体里取分最高的）。 */
function bestWindowInParagraph(paragraphText: string, quote: string): FuzzyCandidate | null {
  let best: FuzzyCandidate | null = null;
  for (const ratio of WINDOW_LENGTH_RATIOS) {
    const windowLen = Math.max(1, Math.round(quote.length * ratio));
    if (windowLen > paragraphText.length) continue;
    for (let start = 0; start + windowLen <= paragraphText.length; start++) {
      const window = paragraphText.slice(start, start + windowLen);
      const score = similarity(window, quote);
      if (!best || score > best.score) {
        best = { paragraphIndex: -1, start, end: start + windowLen, score, matchedText: window };
      }
    }
  }
  return best;
}

export type LocateResult =
  | { status: 'exact'; paragraphIndex: number }
  | { status: 'fuzzy'; paragraphIndex: number; score: number; matchedText: string }
  | { status: 'not_found' }
  | { status: 'ambiguous'; candidates: number };

export interface LocateOptions {
  threshold?: number;
  /**
   * 消歧上下文（schema InstructionLocator.text.paragraphHint）：quote 多处命中时，用于择一。
   * 语义：在候选段落之上（含自身）最近的、文本包含 hint 的段落（通常是条款标题）governs 该候选；
   * 取"到最近 hint 段落距离最小"的唯一候选。若最小距离出现并列、或没有候选能对上 hint，
   * 则不猜——维持 ambiguous，交回上层报错跳过。
   */
  paragraphHint?: string;
}

/**
 * 在多个候选段落里用 paragraphHint 择一：返回唯一最小距离候选的 index；并列或无匹配返回 null。
 * 距离 = 候选段落 index 减去其之上（含自身）最近的、包含 hint 的段落 index。
 */
function disambiguateByHint(paragraphTexts: string[], candidateIndices: number[], hint: string): number | null {
  const distances = candidateIndices.map((index) => {
    for (let j = index; j >= 0; j--) {
      if (paragraphTexts[j]!.includes(hint)) return { index, dist: index - j };
    }
    return { index, dist: Number.POSITIVE_INFINITY };
  });
  const reachable = distances.filter((d) => Number.isFinite(d.dist));
  if (reachable.length === 0) return null;
  const min = Math.min(...reachable.map((d) => d.dist));
  const winners = reachable.filter((d) => d.dist === min);
  return winners.length === 1 ? winners[0]!.index : null;
}

/**
 * paragraphTexts：按文档顺序排列的段落纯文本。先找精确包含匹配：唯一命中直接采信；多处命中
 * 时用 paragraphHint 消歧（能唯一定位则视为精确命中，否则报 ambiguous）；都没有才降级模糊匹配。
 */
export function locateQuote(paragraphTexts: string[], quote: string, options: LocateOptions = {}): LocateResult {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const hint = options.paragraphHint;

  const exactMatches = paragraphTexts
    .map((text, index) => ({ index, hit: text.includes(quote) }))
    .filter((entry) => entry.hit)
    .map((entry) => entry.index);
  if (exactMatches.length === 1) {
    return { status: 'exact', paragraphIndex: exactMatches[0]! };
  }
  if (exactMatches.length > 1) {
    const chosen = hint ? disambiguateByHint(paragraphTexts, exactMatches, hint) : null;
    if (chosen !== null) return { status: 'exact', paragraphIndex: chosen };
    return { status: 'ambiguous', candidates: exactMatches.length };
  }

  const scored: FuzzyCandidate[] = [];
  paragraphTexts.forEach((text, index) => {
    const best = bestWindowInParagraph(text, quote);
    if (best) scored.push({ ...best, paragraphIndex: index });
  });
  scored.sort((a, b) => b.score - a.score);

  const top = scored[0];
  if (!top || top.score < threshold) {
    return { status: 'not_found' };
  }
  const runnerUp = scored[1];
  if (runnerUp && top.score - runnerUp.score < AMBIGUITY_MARGIN) {
    const tied = scored.filter((c) => top.score - c.score < AMBIGUITY_MARGIN);
    const chosen = hint ? disambiguateByHint(paragraphTexts, tied.map((c) => c.paragraphIndex), hint) : null;
    if (chosen !== null) {
      const winner = tied.find((c) => c.paragraphIndex === chosen)!;
      return { status: 'fuzzy', paragraphIndex: winner.paragraphIndex, score: winner.score, matchedText: winner.matchedText };
    }
    return { status: 'ambiguous', candidates: tied.length };
  }
  return { status: 'fuzzy', paragraphIndex: top.paragraphIndex, score: top.score, matchedText: top.matchedText };
}
