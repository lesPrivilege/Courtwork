import { findStatuteCitation, findCaseCitation } from '@courtwork/demo-data';
import type { RuleResult } from './types.js';

function parseStatuteCitation(citation: string): { law: string; article: string } | undefined {
  const match = /^《(.+?)》(.+)$/.exec(citation.trim());
  if (!match) return undefined;
  return { law: match[1].trim(), article: match[2].trim() };
}

function resolves(citation: string): boolean {
  const statute = parseStatuteCitation(citation);
  if (statute && findStatuteCitation(statute.law, statute.article)) return true;
  return findCaseCitation(citation.trim()) !== undefined;
}

/** 递归收集 JSON 里所有 key 为 "citation" 的字符串值——不管出现在 RiskList 的 basis 里
 * 还是 RevisionInstructionSet 的 annotation.citations 里，这条规则都通用。 */
function extractCitations(value: unknown): string[] {
  if (value === null || typeof value !== 'object') return [];
  if (Array.isArray(value)) return value.flatMap(extractCitations);
  return Object.entries(value as Record<string, unknown>).flatMap(([key, val]) => {
    if (key === 'citation' && typeof val === 'string') return [val];
    return extractCitations(val);
  });
}

/** 用 registries/cite-check.json 核验候选输出里出现的每条法条/判例引用是否真实存在。 */
export function citationExists(candidateOutput: unknown): RuleResult {
  const citations = extractCitations(candidateOutput);
  if (citations.length === 0) {
    return { pass: false, score: 0, reason: '候选输出未包含任何 citation 字段，无法核验引用真实性' };
  }

  const unresolved = citations.filter((c) => !resolves(c));
  const score = (citations.length - unresolved.length) / citations.length;
  return {
    pass: unresolved.length === 0,
    score,
    reason:
      unresolved.length === 0
        ? `全部 ${citations.length} 条引用均在 cite-check 库中可核验`
        : `${unresolved.length}/${citations.length} 条引用无法在 cite-check 库核验：[${unresolved.join('; ')}]`,
  };
}
