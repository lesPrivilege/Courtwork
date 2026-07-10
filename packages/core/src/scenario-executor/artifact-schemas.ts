import * as z from 'zod';
import {
  CaseFileSchema,
  TimelineSchema,
  PartyGraphSchema,
  RiskListSchema,
  ReviewMatrixSchema,
  RevisionInstructionSetSchema,
  FileOpsPlanSchema,
  type ArtifactType,
} from '@courtwork/schemas';

export const ARTIFACT_SCHEMAS: Record<ArtifactType, z.ZodTypeAny> = {
  CaseFile: CaseFileSchema,
  Timeline: TimelineSchema,
  PartyGraph: PartyGraphSchema,
  RiskList: RiskListSchema,
  ReviewMatrix: ReviewMatrixSchema,
  RevisionInstructionSet: RevisionInstructionSetSchema,
  // F-4：schemas 增补 ArtifactTypeEnum 'FileOpsPlan' 后，本校验注册表须同步补全，
  // 否则 Record<ArtifactType> 非穷尽、core 无法编译（验收补漏，fix-by-acceptance）。
  FileOpsPlan: FileOpsPlanSchema,
};
