import type { RevisionInstruction, RevisionInstructionSet, RiskList } from '@courtwork/schemas';
import { assertCitationAdmissible, type EvidenceLedger } from '../evidence/grade.js';

export class MissingLocatorQuoteError extends Error {
  constructor(riskId: string) {
    super(`风险 ${riskId} 的首个依据缺少可用于定位的 sourceAnchor.quote，无法编译为修订指令`);
    this.name = 'MissingLocatorQuoteError';
  }
}

/**
 * 验收脚本自己的 demo glue：把已确认的风险清单编译成修订指令集。
 * 领域判断不属于通用层——docs/40（S5 设计）先例：即便产出也是
 * RevisionInstructionSet，编译逻辑仍归场景/演示自己，不进 core 通用库。
 */
export function compileConfirmedRiskListToRevisionInstructions(
  riskList: RiskList,
  targetFileId: string,
  ledger: EvidenceLedger,
): RevisionInstructionSet {
  const instructions: RevisionInstruction[] = [];
  for (const risk of riskList.risks) {
    if (risk.dispositionStatus === 'rejected') continue;
    const primaryBasis = risk.basis[0];
    const quote = primaryBasis.sourceAnchors[0]?.quote;
    if (!quote) throw new MissingLocatorQuoteError(risk.id);

    const citations = risk.basis.map((basis) => {
      assertCitationAdmissible(ledger, basis.citation);
      return { citation: basis.citation, sourceAnchors: basis.sourceAnchors };
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
