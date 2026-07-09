import type { RuleResult } from './types.js';

interface ExpectedAnswerWithFacts {
  facts?: Record<string, string>;
}

/**
 * 核对候选输出（序列化为文本后）里是否出现标准答案 facts 里登记的关键事实原文
 * （案号/合同编号/金额等）——这些事实在 case-bible.md 里是唯一事实来源，可精确
 * 字符串比对，不需要也不该上 LLM judge。
 */
export function factConsistency(
  candidateOutput: unknown,
  expectedAnswer: unknown,
  checkFields: string[],
): RuleResult {
  const facts = (expectedAnswer as ExpectedAnswerWithFacts | null)?.facts;
  if (!facts) {
    return { pass: false, score: 0, reason: '标准答案未提供 facts 字段，无法做事实一致性核对（数据集缺陷）' };
  }

  const candidateText = JSON.stringify(candidateOutput);
  const missing: string[] = [];
  for (const field of checkFields) {
    const expectedValue = facts[field];
    if (expectedValue === undefined) {
      missing.push(`${field}（标准答案未定义该事实字段，数据集缺陷）`);
      continue;
    }
    if (!candidateText.includes(expectedValue)) {
      missing.push(field);
    }
  }

  const score = checkFields.length === 0 ? 1 : (checkFields.length - missing.length) / checkFields.length;
  return {
    pass: missing.length === 0,
    score,
    reason:
      missing.length === 0
        ? `全部 ${checkFields.length} 项关键事实（${checkFields.join(', ')}）均在候选输出中一致出现`
        : `候选输出遗漏或偏离以下关键事实：[${missing.join(', ')}]`,
  };
}
