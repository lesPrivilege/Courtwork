import type { VerticalPackageBindings } from '@courtwork/registry';
import {
  FileOpsPlanSchema,
  RevisionInstructionSetDraftSchema,
  RevisionInstructionSetSchema,
} from '@courtwork/schemas';
import type { ZodType } from 'zod';
import { CaseFileSchema } from '../schemas/case-file.js';
import { PartyGraphDraftSchema, PartyGraphSchema } from '../schemas/party-graph.js';
import { ReviewMatrixDraftSchema, ReviewMatrixSchema } from '../schemas/review-matrix.js';
import { RiskListDraftSchema, RiskListSchema } from '../schemas/risk-list.js';
import { TimelineDraftSchema, TimelineSchema } from '../schemas/timeline.js';

/** runtime plane：final/draft 使用各自逻辑 schema id，绝不以 typeId 隐式猜 binding。 */
export const LEGAL_PACKAGE_BINDINGS: VerticalPackageBindings = {
  schemas: new Map<string, ZodType>([
    ['legal.CaseFile', CaseFileSchema],
    ['legal.Timeline', TimelineSchema],
    ['legal.TimelineDraft', TimelineDraftSchema],
    ['legal.PartyGraph', PartyGraphSchema],
    ['legal.PartyGraphDraft', PartyGraphDraftSchema],
    ['legal.RiskList', RiskListSchema],
    ['legal.RiskListDraft', RiskListDraftSchema],
    ['legal.ReviewMatrix', ReviewMatrixSchema],
    ['legal.ReviewMatrixDraft', ReviewMatrixDraftSchema],
    ['legal.RevisionInstructionSet', RevisionInstructionSetSchema],
    ['legal.RevisionInstructionSetDraft', RevisionInstructionSetDraftSchema],
    ['legal.FileOpsPlan', FileOpsPlanSchema],
  ]),
};
