import * as z from 'zod';
import { RiskListSchema, RevisionInstructionSetSchema } from '@courtwork/legal/schemas';
import type { RuleResult } from './types.js';

/** 用具体产出 schemas 的 zod 定义本身做校验，不额外维护一份 JSON Schema 副本。 */
const SCHEMA_REGISTRY: Record<string, z.ZodType> = {
  RiskList: RiskListSchema,
  RevisionInstructionSet: RevisionInstructionSetSchema,
};

export function schemaValid(candidateOutput: unknown, schemaName: string): RuleResult {
  const schema = SCHEMA_REGISTRY[schemaName];
  if (!schema) {
    return { pass: false, score: 0, reason: `未知的 schemaName："${schemaName}"（评测集配置错误）` };
  }
  const result = schema.safeParse(candidateOutput);
  if (result.success) {
    return { pass: true, score: 1, reason: `候选输出通过 ${schemaName} schema 校验` };
  }
  return {
    pass: false,
    score: 0,
    reason: `候选输出未通过 ${schemaName} schema 校验：${result.error.message}`,
  };
}
