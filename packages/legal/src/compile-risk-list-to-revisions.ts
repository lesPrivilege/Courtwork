import type { RevisionInstruction, RevisionInstructionSet, RiskList } from './schemas/index.js';

export class MissingLocatorQuoteError extends Error {
  constructor(riskId: string) {
    super(`风险 ${riskId} 的首个依据缺少可用于定位的 sourceAnchor.quote，无法编译为修订指令`);
    this.name = 'MissingLocatorQuoteError';
  }
}

/**
 * 台账门禁的注入口（迁包解耦，2026-07-13）：legal 包零 core 依赖（包域律——包只出
 * 语义，机器住底座），信源门禁以函数注入。issueKey 命中即签发 evidenceKey；
 * assertAdmissible 对签发的 key 执行信源分级门禁（不合格即抛）。装配点绑定
 * core 的 EvidenceLedger 实现。
 */
export interface EvidenceGatekeeper {
  issueKey(citation: string): string | undefined;
  assertAdmissible(evidenceKey: string): void;
}

/**
 * 验收脚本自己的 demo glue：把已确认的风险清单编译成修订指令集。
 * 领域判断不属于通用层——docs/40（S5 设计）先例：即便产出也是
 * RevisionInstructionSet，编译逻辑仍归场景/演示自己，不进 core 通用库。
 */
export function compileConfirmedRiskListToRevisionInstructions(
  riskList: RiskList,
  targetFileId: string,
  ledger: EvidenceGatekeeper,
): RevisionInstructionSet {
  const instructions: RevisionInstruction[] = [];
  for (const risk of riskList.risks) {
    if (risk.dispositionStatus === 'rejected') continue;
    const primaryBasis = risk.basis[0];
    const quote = primaryBasis.sourceAnchors[0]?.quote;
    if (!quote) throw new MissingLocatorQuoteError(risk.id);

    const citations = risk.basis.map((basis) => {
      // 台账按 basis.citation 精确匹配签发 key：命中就是工具来源，交给门禁按
      // 等级判断；未命中视为非工具来源（如直接引用的法条原文，或本案 party-verify
      // 那样展示文本经过润色、不再与台账 key 字面相等的情形），不适用信源分级，
      // 历史行为不变——citation 是自由文本，这里不做模糊/包含匹配（那会产生
      // 误关联，见 W6 验收报告）。一旦签发成功，门禁此后只认这个 key，citation
      // 展示文本再怎么编辑都不能让门禁改判。
      const evidenceKey = ledger.issueKey(basis.citation);
      if (evidenceKey !== undefined) ledger.assertAdmissible(evidenceKey);
      return { citation: basis.citation, sourceAnchors: basis.sourceAnchors, evidenceKey };
    });

    instructions.push({
      id: `instr-${risk.id}`,
      kind: 'commentOnly',
      locator: { strategy: 'text', quote },
      annotation: { text: risk.description, citations },
    });
  }
  return {
    id: `revset-${riskList.caseId}`,
    caseId: riskList.caseId,
    targetDocument: { fileId: targetFileId },
    instructions,
  };
}
