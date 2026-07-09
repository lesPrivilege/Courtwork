import { RevisionInstructionSetSchema, type RevisionInstruction } from '@courtwork/schemas';
import type { RuleResult } from './types.js';

/** text/tableCell 策略带 quote 字段，tableRow 不带——按需要抽出 {id, quote}，不核验 tableRow。 */
function checkableQuoteOf(ins: RevisionInstruction): { id: string; quote: string } | undefined {
  if (ins.locator.strategy === 'text' || ins.locator.strategy === 'tableCell') {
    return { id: ins.id, quote: ins.locator.quote };
  }
  return undefined;
}

/**
 * 核对 RevisionInstructionSet 里每条 text/tableCell 定位指令的 quote 是否能在源文档
 * 原文里逐字找到——这是检测"幻觉锚点"（模型编造了一句源文档里根本不存在的原文）
 * 最直接的规则化手段。tableRow 策略没有 quote 字段，不参与本项核验。
 */
export function revisionSetMatch(candidateOutput: unknown, sourceDocumentText: string): RuleResult {
  const parsed = RevisionInstructionSetSchema.safeParse(candidateOutput);
  if (!parsed.success) {
    return {
      pass: false,
      score: 0,
      reason: `候选输出不是合法 RevisionInstructionSet：${parsed.error.message}`,
    };
  }

  const checkable = parsed.data.instructions.map(checkableQuoteOf).filter((x): x is { id: string; quote: string } => x !== undefined);
  const unanchored = checkable.filter((x) => !sourceDocumentText.includes(x.quote)).map((x) => x.id);

  const score = checkable.length === 0 ? 1 : (checkable.length - unanchored.length) / checkable.length;
  return {
    pass: unanchored.length === 0,
    score,
    reason:
      unanchored.length === 0
        ? `全部 ${checkable.length} 条可核验定位指令的 quote 均能在源文档中找到`
        : `以下指令的 locator.quote 在源文档中找不到（疑似幻觉锚点）：[${unanchored.join(', ')}]`,
  };
}
