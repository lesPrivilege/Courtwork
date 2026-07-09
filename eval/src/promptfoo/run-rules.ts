import {
  schemaValid,
  riskListMatch,
  citationExists,
  factConsistency,
  revisionSetMatch,
  type RuleResult,
} from '../rules/index.js';
import type { ScoringRule } from '../dataset-schema.js';

/**
 * promptfoo 侧看到的 assertion context 的最小切片：只取本文件用得到的 vars。
 * 真正的 promptfoo context 字段更多，但本文件刻意只依赖这一个约定——
 * 这是"跑分器专有词汇只允许出现在 src/promptfoo/ 内"这条硬边界唯一被突破一次的
 * 地方，且只突破到"读一个 vars 记录"的程度，不引入 promptfoo 的类型。
 */
export interface RuleAssertionContext {
  vars: Record<string, string>;
}

function dispatch(rule: ScoringRule, candidateOutput: unknown, expectedAnswer: unknown, input: unknown): RuleResult {
  switch (rule.type) {
    case 'schemaValid':
      return schemaValid(candidateOutput, rule.schemaName);
    case 'riskListMatch':
      return riskListMatch(candidateOutput, expectedAnswer);
    case 'citationExists':
      return citationExists(candidateOutput);
    case 'factConsistency':
      return factConsistency(candidateOutput, expectedAnswer, rule.checkFields);
    case 'revisionSetMatch': {
      const sourceDocumentText = (input as { sourceDocumentText?: string } | null)?.sourceDocumentText ?? '';
      return revisionSetMatch(candidateOutput, sourceDocumentText);
    }
    case 'llmJudge':
      // llmJudge 不在本函数的职责内——它由 generate-tests.ts 直接翻译成 promptfoo 原生的
      // llm-rubric 断言，走 promptfoo 自己的评分链路，不经过这个规则聚合器。
      return { pass: true, score: 1, reason: '(llmJudge 由 promptfoo 原生 llm-rubric 断言处理，此处跳过)' };
  }
}

/** 剥掉 ```json ... ``` / ``` ... ``` 代码围栏——模型经常这样包裹 JSON 输出。 */
function stripMarkdownFence(text: string): string {
  const fenced = /^```(?:json)?\s*\n([\s\S]*?)\n```\s*$/.exec(text.trim());
  return fenced ? fenced[1] : text;
}

/**
 * promptfoo 的 javascript 断言把 provider 输出永远当字符串传（ProviderResponse.output
 * 就是 string 类型），不会替调用方 JSON.parse——这一步在这里做一次，规则函数内部
 * 就不用重复处理"候选输出到底是不是字符串"。
 */
function parseCandidateOutput(candidateOutput: unknown): { ok: true; value: unknown } | { ok: false; reason: string } {
  if (typeof candidateOutput !== 'string') {
    return { ok: true, value: candidateOutput };
  }
  try {
    return { ok: true, value: JSON.parse(stripMarkdownFence(candidateOutput)) };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, reason: `候选输出不是合法 JSON，无法解析后交给规则评分：${message}` };
  }
}

/**
 * promptfoo 的 `type: javascript` 断言入口：把一个 case 的全部规则评分项聚合成
 * 一次 pass/score/reason。llmJudge 类型的规则在这里被跳过（见上），只由本函数
 * 处理"能走规则评分的"那部分，呼应"能走规则评分的绝不上 judge"的评测方法论。
 */
export function runRules(candidateOutput: unknown, context: RuleAssertionContext): RuleResult {
  const allRules = JSON.parse(context.vars.scoringRulesJson) as ScoringRule[];
  const expectedAnswer: unknown = JSON.parse(context.vars.expectedAnswerJson);
  const input: unknown = JSON.parse(context.vars.input);

  const ruleBasedRules = allRules.filter((rule) => rule.type !== 'llmJudge');
  if (ruleBasedRules.length === 0) {
    return { pass: true, score: 1, reason: '本例无规则评分项（全部为 llmJudge）' };
  }

  const parsed = parseCandidateOutput(candidateOutput);
  if (!parsed.ok) {
    return { pass: false, score: 0, reason: parsed.reason };
  }

  const results = ruleBasedRules.map((rule) => ({
    rule,
    result: dispatch(rule, parsed.value, expectedAnswer, input),
  }));

  const pass = results.every((r) => r.result.pass);
  const score = results.reduce((sum, r) => sum + r.result.score, 0) / results.length;
  const reason = results.map((r) => `[${r.rule.type}] ${r.result.reason}`).join(' | ');
  return { pass, score, reason };
}
