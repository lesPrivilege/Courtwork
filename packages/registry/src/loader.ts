import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import * as z from 'zod';
import { ScenarioDefinitionSchema, type ScenarioDefinition } from './scenario.js';

export class ScenarioValidationError extends Error {
  constructor(sourceLabel: string, issues: string) {
    super(`场景声明校验失败 [${sourceLabel}]：\n${issues}`);
    this.name = 'ScenarioValidationError';
  }
}

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
    .join('\n');
}

export function parseScenarioYaml(content: string, sourceLabel = '(inline)'): ScenarioDefinition {
  let raw: unknown;
  try {
    raw = parseYaml(content);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new ScenarioValidationError(sourceLabel, `  - YAML 语法错误：${reason}`);
  }
  const result = ScenarioDefinitionSchema.safeParse(raw);
  if (!result.success) {
    throw new ScenarioValidationError(sourceLabel, formatIssues(result.error));
  }
  return result.data;
}

export function loadScenarioFile(filePath: string): ScenarioDefinition {
  const content = readFileSync(filePath, 'utf-8');
  return parseScenarioYaml(content, filePath);
}

export function loadScenariosFromDir(dirPath: string): ScenarioDefinition[] {
  const fileNames = readdirSync(dirPath)
    .filter((name) => name.endsWith('.yaml') || name.endsWith('.yml'))
    .sort();
  const scenarios = fileNames.map((name) => loadScenarioFile(join(dirPath, name)));
  const seenIds = new Set<string>();
  for (const scenario of scenarios) {
    if (seenIds.has(scenario.id)) {
      throw new ScenarioValidationError(
        dirPath,
        `  - id: 场景 id "${scenario.id}" 重复出现，每个场景 id 必须唯一`,
      );
    }
    seenIds.add(scenario.id);
  }
  return scenarios;
}
