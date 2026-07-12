import * as z from 'zod';
import { SourceAnchorSchema } from './source-anchor.js';
import { CaseFileSchema } from './case-file.js';
import { TimelineSchema } from './timeline.js';
import { PartyGraphSchema } from './party-graph.js';
import { RiskListSchema } from './risk-list.js';
import { ReviewMatrixSchema } from './review-matrix.js';
import { RevisionEventSchema } from './revision-event.js';
import { RevisionInstructionSetSchema } from './revision-instruction-set.js';
import { FileOpsPlanSchema } from './file-ops-plan.js';
import { ArtifactTypeIdSchema } from './artifact-type-id.js';
import { ConfirmationPolicySchema } from './confirmation-policy.js';
import { QuoteClaimSchema, CitationFailureSchema } from './citation.js';
import { RehydrationProjectionSchema } from './artifact-descriptor.js';
import { PackageIdentitySchema } from './package-identity.js';

export const SCHEMA_REGISTRY = [
  { name: 'SourceAnchor', schema: SourceAnchorSchema },
  { name: 'CaseFile', schema: CaseFileSchema },
  { name: 'Timeline', schema: TimelineSchema },
  { name: 'PartyGraph', schema: PartyGraphSchema },
  { name: 'RiskList', schema: RiskListSchema },
  { name: 'ReviewMatrix', schema: ReviewMatrixSchema },
  { name: 'RevisionEvent', schema: RevisionEventSchema },
  { name: 'RevisionInstructionSet', schema: RevisionInstructionSetSchema },
  { name: 'FileOpsPlan', schema: FileOpsPlanSchema },
  // SCHEMA-SPEC-1（2026-07-13）：namespaced/引用闭环/确认策略/投影/包身份五契约入对外契约面。
  { name: 'ArtifactTypeId', schema: ArtifactTypeIdSchema },
  { name: 'ConfirmationPolicy', schema: ConfirmationPolicySchema },
  { name: 'QuoteClaim', schema: QuoteClaimSchema },
  { name: 'CitationFailure', schema: CitationFailureSchema },
  { name: 'RehydrationProjection', schema: RehydrationProjectionSchema },
  { name: 'PackageIdentity', schema: PackageIdentitySchema },
] as const;

export function toJSONSchemaRecord(): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const entry of SCHEMA_REGISTRY) {
    record[entry.name] = z.toJSONSchema(entry.schema);
  }
  return record;
}
