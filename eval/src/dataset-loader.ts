import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { EvalCaseSchema, type EvalCase } from './dataset-schema.js';

/**
 * 读取 `<datasetsRoot>/<scenario>/<case-id>/case.json`，逐例校验并按 id 排序返回。
 * 目录名与 case.json 内的 id 字段必须一致——这是唯一的索引来源，避免两处名字漂移。
 */
export function loadDataset(datasetsRoot: string, scenario: 'S3' | 'S4'): EvalCase[] {
  const scenarioDir = join(datasetsRoot, scenario);
  const caseIds = readdirSync(scenarioDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  return caseIds.map((caseId) => {
    const casePath = join(scenarioDir, caseId, 'case.json');
    const raw: unknown = JSON.parse(readFileSync(casePath, 'utf-8'));
    const parsed = EvalCaseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`案例 ${scenario}/${caseId} 未通过 EvalCaseSchema 校验：${parsed.error.message}`);
    }
    if (parsed.data.id !== caseId) {
      throw new Error(
        `案例 ${scenario}/${caseId} 的 case.json 内 id 字段（"${parsed.data.id}"）与目录名不一致`,
      );
    }
    return parsed.data;
  });
}
