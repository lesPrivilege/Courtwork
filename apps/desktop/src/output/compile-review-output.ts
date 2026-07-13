import {
  compileConfirmedRiskListToRevisionInstructions,
  type RiskList,
} from '@courtwork/legal';
import {
  applyRevisionInstructionSet,
  compileDraftToDocx,
  type ApplyRevisionInstructionSetResult,
} from '@courtwork/output';
import type { ReviewDispositionState } from '../protocol/client';

interface EvidenceGradeRecord {
  key: string;
  grade: 'A' | 'B' | 'C';
  confirmed: boolean;
}

export interface CompileConfirmedReviewInput {
  riskList: RiskList;
  dispositions: Readonly<Record<string, ReviewDispositionState>>;
  sourceMarkdown: string;
  targetFileName: string;
  evidenceGrades: readonly EvidenceGradeRecord[];
  now?: Date;
}

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
 * desktop 的 S3 装配点：与 LEGAL-DEMO-RUN 共用
 * RiskList → RevisionInstructionSet → output.applyRevisionInstructionSet。
 */
export function compileConfirmedReviewToDocx(
  input: CompileConfirmedReviewInput,
): ApplyRevisionInstructionSetResult {
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
  return applyRevisionInstructionSet(originalDocx, revisionSet, { now: input.now });
}
