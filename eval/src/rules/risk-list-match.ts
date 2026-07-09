import { RiskListSchema } from '@courtwork/schemas';
import type { RuleResult } from './types.js';

function normalizeCitation(citation: string): string {
  return citation.replace(/[《》\s]/g, '');
}

/**
 * 用"依据引用重叠"而非"id 相同"做风险点匹配：标准答案的每个风险点对应一条不同的
 * 主法条引用（见 case-bible 第三节"预埋风险条款"），这是可程序化比对的 ground truth，
 * 不需要也不应该要求模型输出与标准答案相同的 id——那是在评测里泄漏答案格式。
 */
export function riskListMatch(candidateOutput: unknown, expectedAnswer: unknown): RuleResult {
  const expected = RiskListSchema.safeParse(expectedAnswer);
  if (!expected.success) {
    return { pass: false, score: 0, reason: '标准答案本身不是合法 RiskList，无法比对（数据集缺陷）' };
  }
  const candidate = RiskListSchema.safeParse(candidateOutput);
  if (!candidate.success) {
    return {
      pass: false,
      score: 0,
      reason: `候选输出不是合法 RiskList，无法比对：${candidate.error.message}`,
    };
  }

  const candidateCitations = new Set(
    candidate.data.risks.flatMap((risk) => risk.basis.map((b) => normalizeCitation(b.citation))),
  );

  const total = expected.data.risks.length;

  // 标准答案判定"该条款无风险"是一个真负例：正确答案是候选输出也不虚构风险点，
  // 而不是"没有标准风险点所以自动满分"——后者对误报（假阳性）没有任何约束力。
  if (total === 0) {
    const candidateRiskCount = candidate.data.risks.length;
    return {
      pass: candidateRiskCount === 0,
      score: candidateRiskCount === 0 ? 1 : 0,
      reason:
        candidateRiskCount === 0
          ? '标准答案判定该条款无风险，候选输出也未虚构风险点'
          : `标准答案判定该条款无风险，但候选输出虚构了 ${candidateRiskCount} 个风险点（误报）`,
    };
  }

  const matched: string[] = [];
  const missed: string[] = [];
  for (const risk of expected.data.risks) {
    const hit = risk.basis.some((b) => candidateCitations.has(normalizeCitation(b.citation)));
    (hit ? matched : missed).push(risk.id);
  }

  const score = matched.length / total;
  return {
    pass: missed.length === 0,
    score,
    reason: `依据引用命中 ${matched.length}/${total} 个标准风险点；命中: [${matched.join(', ')}]；未命中: [${missed.join(', ')}]`,
  };
}
