import type { VerticalPackageBindings } from '@courtwork/registry';
import { FileOpsPlanSchema, RevisionInstructionSetSchema } from '@courtwork/schemas';
import type { ZodType } from 'zod';
import { CaseFileSchema } from '../schemas/case-file.js';
import { PartyGraphSchema } from '../schemas/party-graph.js';
import { ReviewMatrixSchema } from '../schemas/review-matrix.js';
import { RiskListDraftSchema, RiskListSchema } from '../schemas/risk-list.js';
import { TimelineSchema } from '../schemas/timeline.js';

/** runtime plane：final/draft 使用各自逻辑 schema id，绝不以 typeId 隐式猜 binding。 */
export const LEGAL_PACKAGE_BINDINGS: VerticalPackageBindings = {
  schemas: new Map<string, ZodType>([
    ['legal.CaseFile', CaseFileSchema],
    ['legal.Timeline', TimelineSchema],
    ['legal.PartyGraph', PartyGraphSchema],
    ['legal.RiskList', RiskListSchema],
    ['legal.RiskListDraft', RiskListDraftSchema],
    ['legal.ReviewMatrix', ReviewMatrixSchema],
    ['legal.RevisionInstructionSet', RevisionInstructionSetSchema],
    ['legal.FileOpsPlan', FileOpsPlanSchema],
  ]),
};
