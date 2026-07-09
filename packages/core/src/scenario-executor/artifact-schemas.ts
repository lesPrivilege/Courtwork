import * as z from 'zod';
import {
  CaseFileSchema,
  TimelineSchema,
  PartyGraphSchema,
  RiskListSchema,
  ReviewMatrixSchema,
  RevisionInstructionSetSchema,
  type ArtifactType,
} from '@courtwork/schemas';

export const ARTIFACT_SCHEMAS: Record<ArtifactType, z.ZodTypeAny> = {
  CaseFile: CaseFileSchema,
  Timeline: TimelineSchema,
  PartyGraph: PartyGraphSchema,
  RiskList: RiskListSchema,
  ReviewMatrix: ReviewMatrixSchema,
  RevisionInstructionSet: RevisionInstructionSetSchema,
};
