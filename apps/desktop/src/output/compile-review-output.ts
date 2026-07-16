import {
  compileConfirmedRiskListToRevisionInstructions,
  type RiskList,
} from '@courtwork/legal';
import {
  applyRevisionInstructionSet,
  compileDraftToDocx,
  NonAppliedInstructionsError,
  type ApplyRevisionInstructionSetResult,
  type InstructionOutcome,
} from '@courtwork/output';
import type { ReviewDispositionState } from '../protocol/client';

interface EvidenceGradeRecord {
  key: string;
  grade: 'A' | 'B' | 'C';
  confirmed: boolean;
}

/**
 * 一处未能自动落点的修订的原因（产品语义枚举）。
 * 具体中文文案由审阅面按此映射，本层不出现 locator/instruction 等工程词。
 */
export type NonAppliedReason = 'not_located' | 'ambiguous' | 'text_changed' | 'unsupported';

/** 一条未能自动落点、等待用户逐条确认的修订。 */
export interface PendingRevisionConfirmation {
  /** 诊断层修订 id（instr-risk-XX）；仅用于回传门禁，不展示给用户。 */
  instructionId: string;
  /** 对应审阅项 id（risk-XX）。 */
  riskId: string;
  /** 产品语言：这处修订说明（风险描述）。 */
  summary: string;
  /** 未落点原因。 */
  reason: NonAppliedReason;
  /** 供用户核对的原文片段（管线尝试定位却未命中的引语）。 */
  quote: string;
}

/**
 * 审阅→docx 的编译结果：
 * - `compiled`：全部修订已落点（或未落点项均已获针对性确认），产出 docx；
 * - `needs_confirmation`：存在未落点修订且未获确认，逐条列出待用户处置，本次不产出任何 docx。
 */
export type CompileConfirmedReviewOutcome =
  | ({ status: 'compiled' } & ApplyRevisionInstructionSetResult)
  | { status: 'needs_confirmation'; pending: PendingRevisionConfirmation[] };

export interface CompileConfirmedReviewInput {
  riskList: RiskList;
  dispositions: Readonly<Record<string, ReviewDispositionState>>;
  sourceMarkdown: string;
  targetFileName: string;
  evidenceGrades: readonly EvidenceGradeRecord[];
  now?: Date;
  /**
   * 用户已逐条确认、允许在缺此落点的情况下继续交付的未应用修订 id。
   * 交给 output 的针对性确认门禁（onNonApplied:'confirm'）：仍需覆盖每一条未落点项，
   * 覆盖不全则整份继续阻断——不是笼统放行。
   */
  confirmedNonApplied?: readonly string[];
}

const REASON_BY_STATUS: Partial<Record<InstructionOutcome['status'], NonAppliedReason>> = {
  locator_not_found: 'not_located',
  locator_ambiguous: 'ambiguous',
  locator_text_mismatch: 'text_changed',
  unsupported_locator: 'unsupported',
};

function markdownToDocument(sourceMarkdown: string) {
  const lines = sourceMarkdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^#{1,6}\s*/, '').replace(/\*\*/g, ''));
  const [title = '合同', ...paragraphs] = lines;
  return { title, paragraphs };
}

/**
 * 把一条未落点 outcome 翻译为面向用户的待确认项。已确认风险清单是唯一事实源：
 * outcome 必须能对应其中一项，否则说明确认清单已与实际落盘门禁失真——直接暴露，
 * 绝不给出占位或残缺清单让用户在失真信息上确认。
 */
function describeNonApplied(
  outcome: InstructionOutcome,
  confirmedRiskList: RiskList,
): PendingRevisionConfirmation {
  const riskId = outcome.id.replace(/^instr-/, '');
  const risk = confirmedRiskList.risks.find((candidate) => candidate.id === riskId);
  if (!risk) {
    throw new Error(`未落点项 ${outcome.id} 无法对应任何已确认审阅项，确认清单可能失真`);
  }
  return {
    instructionId: outcome.id,
    riskId,
    summary: risk.description,
    reason: REASON_BY_STATUS[outcome.status] ?? 'not_located',
    quote: risk.basis[0]?.sourceAnchors[0]?.quote ?? '',
  };
}

/**
 * desktop 的 S3 装配点：与 LEGAL-DEMO-RUN 共用
 * RiskList → RevisionInstructionSet → output.applyRevisionInstructionSet。
 *
 * 落盘门禁（OUTPUT-CORRECTNESS #6）产品侧：未落点修订不再只是一句可见报错。首次编译遇未落点项
 * 返回 `needs_confirmation` 逐条交用户处置；用户逐条确认后经 `confirmedNonApplied` 重编译落盘，
 * 取消则本层从不产出 docx。不做「报错并跳过后照常交付」。
 */
export function compileConfirmedReviewToDocx(
  input: CompileConfirmedReviewInput,
): CompileConfirmedReviewOutcome {
  const confirmedRiskList: RiskList = {
    ...input.riskList,
    risks: input.riskList.risks
      .filter((risk) => input.dispositions[risk.id] === 'confirmed')
      .map((risk) => ({ ...risk, dispositionStatus: 'confirmed' as const })),
  };
  if (confirmedRiskList.risks.length === 0) {
    throw new Error('没有已确认的风险项，未生成 Word 产物');
  }

  const evidenceByKey = new Map(input.evidenceGrades.map((entry) => [entry.key, entry]));
  const gatekeeper = {
    issueKey: (citation: string) => (evidenceByKey.has(citation) ? citation : undefined),
    assertAdmissible: (key: string) => {
      const evidence = evidenceByKey.get(key);
      if (!evidence || (evidence.grade === 'C' && !evidence.confirmed)) {
        throw new Error('存在未经确认的 C 级信源，未生成 Word 产物');
      }
    },
  };

  const originalDocx = compileDraftToDocx(markdownToDocument(input.sourceMarkdown));
  const revisionSet = compileConfirmedRiskListToRevisionInstructions(
    confirmedRiskList,
    input.targetFileName,
    gatekeeper,
  );

  try {
    const result = applyRevisionInstructionSet(originalDocx, revisionSet, {
      now: input.now,
      onNonApplied: input.confirmedNonApplied ? 'confirm' : 'block',
      confirmNonApplied: input.confirmedNonApplied,
    });
    return { status: 'compiled', docx: result.docx, outcomes: result.outcomes };
  } catch (error) {
    if (!(error instanceof NonAppliedInstructionsError)) throw error;
    return {
      status: 'needs_confirmation',
      pending: error.nonApplied.map((outcome) => describeNonApplied(outcome, confirmedRiskList)),
    };
  }
}
