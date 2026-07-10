import { evaluateCase } from '../rules/evaluate.js';
import type { ScoringRule } from '../dataset-schema.js';
import type { RuleResult } from '../rules/types.js';

/**
 * promptfoo 侧看到的 assertion context 的最小切片：只取本文件用得到的 vars。
 * 真正的 promptfoo context 字段更多，但本文件刻意只依赖这一个约定——
 * 这是"跑分器专有词汇只允许出现在 src/promptfoo/ 内"这条硬边界唯一被突破一次的
 * 地方，且只突破到"读一个 vars 记录"的程度，不引入 promptfoo 的类型。
 */
export interface RuleAssertionContext {
  vars: Record<string, string>;
}

/**
 * promptfoo 的 `type: javascript` 断言入口：把 context.vars 里以 JSON 字符串形式
 * 携带的 scoringRules/expectedAnswer/input 还原后，转交给中性规则聚合器
 * evaluateCase 求值。本文件只做"promptfoo 的 vars 字符串 ↔ 中性参数"这一层转换，
 * 不重复聚合逻辑本身。
 */
export function runRules(candidateOutput: unknown, context: RuleAssertionContext): RuleResult {
  const scoringRules = JSON.parse(context.vars.scoringRulesJson) as ScoringRule[];
  const expectedAnswer: unknown = JSON.parse(context.vars.expectedAnswerJson);
  const input: unknown = JSON.parse(context.vars.input);

  return evaluateCase(candidateOutput, { scoringRules, expectedAnswer, input });
}
