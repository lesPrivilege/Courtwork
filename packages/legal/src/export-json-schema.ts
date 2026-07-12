import * as z from 'zod';
import { CaseFileSchema } from './schemas/case-file.js';
import { TimelineSchema } from './schemas/timeline.js';
import { PartyGraphSchema } from './schemas/party-graph.js';
import { RiskListSchema } from './schemas/risk-list.js';
import { ReviewMatrixSchema } from './schemas/review-matrix.js';

/** 法律包对外 JSON Schema 契约面（随包迁移，drift 门同纪律）。 */
export const LEGAL_SCHEMA_REGISTRY = [
  { name: 'CaseFile', schema: CaseFileSchema },
  { name: 'Timeline', schema: TimelineSchema },
  { name: 'PartyGraph', schema: PartyGraphSchema },
  { name: 'RiskList', schema: RiskListSchema },
  { name: 'ReviewMatrix', schema: ReviewMatrixSchema },
] as const;

export function toJSONSchemaRecord(): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const entry of LEGAL_SCHEMA_REGISTRY) {
    record[entry.name] = z.toJSONSchema(entry.schema);
  }
  return record;
}
