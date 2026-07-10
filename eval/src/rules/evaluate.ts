import {
  schemaValid,
  riskListMatch,
  citationExists,
  factConsistency,
  revisionSetMatch,
  type RuleResult,
} from './index.js';
import type { ScoringRule } from '../dataset-schema.js';

export interface EvaluateCaseInput {
  scoringRules: ScoringRule[];
  expectedAnswer: unknown;
  input: unknown;
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
      // llmJudge 不在本函数的职责内——它由跑分器适配层直接翻译成跑分器原生的 judge
      // 断言，走跑分器自己的评分链路，不经过这个规则聚合器。
      return { pass: true, score: 1, reason: '(llmJudge 由跑分器适配层原生处理，此处跳过)' };
  }
}

/** 剥掉 ```json ... ``` / ``` ... ``` 代码围栏——模型经常这样包裹 JSON 输出。 */
function stripMarkdownFence(text: string): string {
  const fenced = /^```(?:json)?\s*\n([\s\S]*?)\n```\s*$/.exec(text.trim());
  return fenced ? fenced[1] : text;
}

/**
 * 候选输出经常以字符串形式到达（不同跑分器/provider 的返回形状不一样，也不会替
 * 调用方 JSON.parse）——这一步在这里统一做一次，规则函数内部就不用重复处理
 * "候选输出到底是不是字符串"。
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
 * 规则评分聚合入口：把一个 case 的全部规则评分项聚合成一次 pass/score/reason。
 * llmJudge 类型的规则在这里被跳过（见上），只处理"能走规则评分的"那部分，呼应
 * "能走规则评分的绝不上 judge"的评测方法论。与任何具体跑分器无关，是纯函数——
 * 跑分器适配层负责把外部传入的参数还原成这里需要的形状后调用本函数。
 */
export function evaluateCase(
  candidateOutput: unknown,
  { scoringRules, expectedAnswer, input }: EvaluateCaseInput,
): RuleResult {
  const ruleBasedRules = scoringRules.filter((rule) => rule.type !== 'llmJudge');
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
