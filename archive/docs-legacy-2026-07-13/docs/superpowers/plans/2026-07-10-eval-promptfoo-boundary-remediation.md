# eval：收敛 promptfoo 专有边界（W7.1 整改）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修复 W7 验收报告（`eval/ACCEPTANCE.md` 第 2 节）标出的硬条件缺口：promptfoo 专有词汇（`vars`/`assert`/`llm-rubric`/`type: javascript`/`promptfoo` 本身）与输出结构目前散落在 `src/report.ts`、`src/regression.ts`、`src/runner.ts`、`src/mock-providers/**`、`scripts/**` 中。引入中性内部结果格式 `EvalRunResult`（`src/results.ts`），让 `src/promptfoo/` 成为全仓库唯一知道 promptfoo 输出结构与断言 DSL 的地方；`report.ts`/`regression.ts`/`scripts/**` 之后只消费中性格式。回归基线（`reports/*-baseline.json`）改为以中性格式落盘，成为跑分器无关的可移植数据资产。

**Architecture:** 新增 `src/results.ts` 定义中性结果格式（`EvalRunResult`/`EvalRunResultSet`/`ScoredCheck`），零运行时逻辑、零跑分器知识。规则评分聚合逻辑（原 `src/promptfoo/run-rules.ts` 里的 `dispatch`/`parseCandidateOutput`/聚合循环）下沉成中性纯函数 `evaluateCase`（`src/rules/evaluate.ts`），`run-rules.ts` 收窄成"把 promptfoo 断言 context 里的 JSON 字符串 vars 还原成中性参数后转call `evaluateCase`"的薄适配层。promptfoo 原始结果的类型形状（`PromptfooResultRow`/`PromptfooResultsFile`，现更名放进 `src/promptfoo/raw-results.ts`）与"原始结果 → 中性格式"的映射函数（`src/promptfoo/map-results.ts`）一并收进 `src/promptfoo/`；CLI runner（`src/promptfoo/runner.ts`，原 `src/runner.ts`）内部调用 promptfoo CLI 后直接完成解析+映射，对外只返回/落盘 `EvalRunResultSet`——调用方（`scripts/run-eval.ts`）不再自己解析 promptfoo JSON。三个 mock provider（`mock-thorough`/`mock-fast`/`mock-judge`）与 `degrade.ts` 整体迁入 `src/promptfoo/mock-providers/`（它们实现的是 promptfoo 的自定义 provider 插件接口 `{id, callApi}`，本就该被关在适配层里）。`verify-s3/s4-dataset.ts` 脚本不再手搭 promptfoo 的 `{vars: {...}}` 断言 context，直接调用中性 `evaluateCase`。

**Tech Stack:** 沿用现有 TS monorepo 基线（pnpm workspaces、TypeScript 6.0.3 strict、vitest 4.1.10、tsx）；不引入新依赖；`promptfoo` 仍是 `eval/package.json` 里唯一的跑分器依赖，只是被彻底关进 `src/promptfoo/`。

---

## File Structure

```
Courtwork/
  eval/
    src/
      results.ts                                    [新建] 中性结果格式：EvalRunResult / EvalRunResultSet / ScoredCheck
      report.ts                                      [修改] 消费 EvalRunResultSet，不再依赖 promptfoo 原始类型
      report.test.ts                                 [修改] fixture 改用中性格式
      regression.ts                                  [修改] 消费 EvalRunResultSet
      regression.test.ts                              [修改] fixture 改用中性格式
      runner.ts                                       [删除] 内容迁移到 src/promptfoo/runner.ts
      dataset-schema.ts                               [修改] 去掉注释里的 promptfoo 字面词
      mock-providers/                                 [删除目录] 整体迁到 src/promptfoo/mock-providers/
        mock-thorough-provider.ts                      [迁出]
        mock-fast-provider.ts                           [迁出]
        mock-judge-provider.ts                          [迁出]
        degrade.ts                                      [迁出]
        degrade.test.ts                                 [迁出]
      rules/
        types.ts                                        [修改] 去掉注释里的 promptfoo 字面词
        evaluate.ts                                      [新建] 中性规则聚合纯函数 evaluateCase
        evaluate.test.ts                                 [新建]
        index.ts                                          [不改]
      promptfoo/
        raw-results.ts                                   [新建] promptfoo -o results.json 原始形状（本层私有）
        map-results.ts                                    [新建] 原始结果 → EvalRunResult[] 的映射
        map-results.test.ts                               [新建]
        runner.ts                                          [新建] 原 src/runner.ts 内容 + 解析/映射/落盘中性格式
        run-rules.ts                                       [修改] 收窄为"vars JSON 字符串 → evaluateCase"薄适配层
        run-rules.test.ts                                  [修改] 只保留适配层测试
        generate-tests.ts                                  [不改]
        generate-tests.test.ts                             [不改]
        tests-entry.ts                                     [不改]
        mock-providers/                                    [新建目录，见上方迁入]
          mock-thorough-provider.ts                         [迁入]
          mock-fast-provider.ts                              [迁入]
          mock-judge-provider.ts                             [迁入]
          degrade.ts                                         [迁入]
          degrade.test.ts                                    [迁入]
    scripts/
      run-eval.ts                                       [修改] 只调用中性 API
      regression-check.ts                                [修改] 只消费中性格式
      verify-s3-dataset.ts                                [修改] 改调用 evaluateCase
      verify-s4-dataset.ts                                [修改] 同上
    promptfoo/
      S3.promptfooconfig.yaml                            [修改] provider 路径指向 src/promptfoo/mock-providers/
      S4.promptfooconfig.yaml                             [修改] 同上
    reports/                                             [不进 git，重建即可] baseline/results 改为中性格式落盘
    SPEC.md                                               [修改] 状态区追加 W7.1 整改记录
    ACCEPTANCE.md                                         [修改，只追加] 末尾追加"整改记录"节，不改 Codex 原文
```

---

## Task 1: 中性结果格式（src/results.ts）

**Files:**
- Create: `eval/src/results.ts`

无运行时逻辑（纯 TypeScript interface），不需要独立测试文件——正确性由 `pnpm -r run build` 的类型检查与下游消费方（Task 3/4 的测试）保证。

- [ ] **Step 1: 创建 `eval/src/results.ts`**

```typescript
/**
 * 跑分器无关的中性评测结果格式：任何消费方（报告、回归对比、脚本）都只应该依赖
 * 这份形状，不知道任何具体跑分器的存在。跑分器绑定层（src/promptfoo/）单向负责
 * 把它自己的原始输出翻译成这份形状；换跑分器只需要重写那一层的映射代码，本文件
 * 与所有消费方原样不变。
 */
export interface ScoredCheck {
  pass: boolean;
  score: number;
  reason: string;
}

export interface EvalTimings {
  latencyMs: number;
}

export interface EvalRunResult {
  /** 产出这条结果的那一次跑分的标识，同一次跑分产出的所有结果共享同一个 runId。 */
  runId: string;
  caseId: string;
  /** 产出候选输出的模型/provider 标识（不透明字符串），与任何具体跑分器的 provider
   *  对象形状无关。 */
  provider: string;
  pass: boolean;
  score: number;
  ruleResults: ScoredCheck[];
  judgeResults: ScoredCheck[];
  timings: EvalTimings;
  cost: number;
  tokensUsed: number;
}

export interface EvalRunResultSet {
  scenario: 'S3' | 'S4';
  runResults: EvalRunResult[];
}
```

- [ ] **Step 2: 类型检查确认无误**

Run: `cd /Users/lesprivilege/Projects/Courtwork && pnpm --filter @courtwork/eval run build`
Expected: 通过（新文件未被任何人引用，纯新增）

- [ ] **Step 3: Commit**

```bash
cd /Users/lesprivilege/Projects/Courtwork
git add eval/src/results.ts
git commit -m "$(cat <<'EOF'
feat(eval): add neutral EvalRunResult format

W7.1 整改第一步：定义与跑分器无关的中性结果格式（runId/caseId/provider/
score/ruleResults/judgeResults/timings/cost/tokensUsed），作为后续
report/regression/scripts 的唯一消费契约。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: 规则聚合下沉为中性纯函数 evaluateCase

**Files:**
- Create: `eval/src/rules/evaluate.ts`
- Create: `eval/src/rules/evaluate.test.ts`
- Modify: `eval/src/promptfoo/run-rules.ts`
- Modify: `eval/src/promptfoo/run-rules.test.ts`
- Modify: `eval/scripts/verify-s3-dataset.ts`
- Modify: `eval/scripts/verify-s4-dataset.ts`

`run-rules.ts` 现在的 `dispatch`/`parseCandidateOutput`/聚合循环其实与 promptfoo 无关（任何跑分器都需要"给定 scoringRules + expectedAnswer + input + candidateOutput，聚合出一个 pass/score/reason"），只是历史上和 promptfoo 断言签名耦合在一个文件里。下沉后 `scripts/verify-s3/s4-dataset.ts` 可以直接调用，不必再手搭 promptfoo 的 `{vars: {...}}` context、也不必 import `src/promptfoo/`。

- [ ] **Step 1: 写 `eval/src/rules/evaluate.test.ts`（失败态）**

```typescript
import { describe, it, expect } from 'vitest';
import { evaluateCase } from './evaluate.js';

describe('evaluateCase', () => {
  it('aggregates multiple rule-based scoring rules into one pass/score/reason', () => {
    const risk = {
      id: 'r',
      description: 'd',
      level: 'high',
      basis: [
        {
          citation: '《中华人民共和国民法典》第五百八十五条',
          sourceAnchors: [{ fileId: 'x', textRange: { start: 0, end: 1 } }],
        },
      ],
      dispositionStatus: 'pending',
    };
    const candidateOutput = { caseId: 'x', risks: [{ ...risk, id: 'candidate-id' }] };
    const expectedAnswer = { caseId: 'x', risks: [{ ...risk, id: 'risk-01' }] };
    const scoringRules = [
      { type: 'schemaValid' as const, schemaName: 'RiskList' },
      { type: 'riskListMatch' as const },
      { type: 'citationExists' as const },
    ];

    const result = evaluateCase(candidateOutput, { scoringRules, expectedAnswer, input: {} });

    expect(result.pass).toBe(true);
    expect(result.score).toBe(1);
  });

  it('passes vacuously when all scoring rules are llmJudge (handled natively by the scorer adapter, not this dispatcher)', () => {
    const scoringRules = [{ type: 'llmJudge' as const, judgePromptFile: 'x', weight: 1 }];

    const result = evaluateCase({}, { scoringRules, expectedAnswer: {}, input: {} });

    expect(result.pass).toBe(true);
    expect(result.reason).toMatch(/无规则评分项/);
  });

  it('fails and names the failing rule type when a rule-based check fails', () => {
    const scoringRules = [{ type: 'schemaValid' as const, schemaName: 'RiskList' }];

    const result = evaluateCase({ not: 'valid' }, { scoringRules, expectedAnswer: {}, input: {} });

    expect(result.pass).toBe(false);
    expect(result.reason).toMatch(/schemaValid/);
  });

  it('dispatches factConsistency using checkFields from the rule config', () => {
    const scoringRules = [{ type: 'factConsistency' as const, checkFields: ['caseNumber'] }];
    const expectedAnswer = { facts: { caseNumber: '(2025)云章03民初472号' } };

    const result = evaluateCase(
      { text: '案号(2025)云章03民初472号' },
      { scoringRules, expectedAnswer, input: {} },
    );

    expect(result.pass).toBe(true);
  });

  it('parses candidateOutput as JSON when the provider hands it over as a raw string', () => {
    const risk = {
      id: 'r',
      description: 'd',
      level: 'high',
      basis: [
        {
          citation: '《中华人民共和国民法典》第五百八十五条',
          sourceAnchors: [{ fileId: 'x', textRange: { start: 0, end: 1 } }],
        },
      ],
      dispositionStatus: 'pending',
    };
    const scoringRules = [{ type: 'schemaValid' as const, schemaName: 'RiskList' }];
    const expectedAnswer = { caseId: 'x', risks: [risk] };
    const rawStringOutput = JSON.stringify({ caseId: 'x', risks: [risk] });

    const result = evaluateCase(rawStringOutput, { scoringRules, expectedAnswer, input: {} });

    expect(result.pass).toBe(true);
  });

  it('fails with a clear reason (not a crash) when candidateOutput is a string that is not valid JSON', () => {
    const scoringRules = [{ type: 'schemaValid' as const, schemaName: 'RiskList' }];

    const result = evaluateCase('not json at all {{{', { scoringRules, expectedAnswer: {}, input: {} });

    expect(result.pass).toBe(false);
    expect(result.reason).toMatch(/JSON/);
  });

  it('dispatches revisionSetMatch using sourceDocumentText carried in the case input', () => {
    const scoringRules = [{ type: 'revisionSetMatch' as const }];
    const input = { sourceDocumentText: '乙方逾期支付违约金1%' };
    const candidate = {
      id: 'r',
      caseId: 'c',
      targetDocument: { fileId: 'x' },
      instructions: [
        {
          id: 'i1',
          kind: 'commentOnly',
          locator: { strategy: 'text', quote: '违约金1%' },
          annotation: { text: 'x', citations: [] },
        },
      ],
    };

    const result = evaluateCase(candidate, { scoringRules, expectedAnswer: {}, input });

    expect(result.pass).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `cd /Users/lesprivilege/Projects/Courtwork && pnpm exec vitest run eval/src/rules/evaluate.test.ts`
Expected: FAIL（`./evaluate.js` 模块不存在）

- [ ] **Step 3: 创建 `eval/src/rules/evaluate.ts`**

```typescript
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
 * 跑分器适配层（如 src/promptfoo/run-rules.ts）负责把外部传入的参数还原成这里
 * 需要的形状后调用本函数。
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
```

- [ ] **Step 4: 运行测试，确认通过**

Run: `cd /Users/lesprivilege/Projects/Courtwork && pnpm exec vitest run eval/src/rules/evaluate.test.ts`
Expected: PASS（7 个用例）

- [ ] **Step 5: 收窄 `eval/src/promptfoo/run-rules.ts` 为薄适配层**

```typescript
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
```

- [ ] **Step 6: 把 `eval/src/promptfoo/run-rules.test.ts` 收窄为适配层测试**

```typescript
import { describe, it, expect } from 'vitest';
import { runRules } from './run-rules.js';

describe('runRules', () => {
  it('unwraps context.vars JSON strings and delegates to evaluateCase', () => {
    const context = {
      vars: {
        scoringRulesJson: JSON.stringify([{ type: 'schemaValid', schemaName: 'RiskList' }]),
        expectedAnswerJson: JSON.stringify({}),
        input: JSON.stringify({}),
      },
    };

    const result = runRules({ not: 'valid' }, context);

    expect(result.pass).toBe(false);
    expect(result.reason).toMatch(/schemaValid/);
  });

  it('forwards a raw string candidateOutput through to evaluateCase unparsed', () => {
    const context = {
      vars: {
        scoringRulesJson: JSON.stringify([{ type: 'schemaValid', schemaName: 'RiskList' }]),
        expectedAnswerJson: JSON.stringify({}),
        input: JSON.stringify({}),
      },
    };

    const result = runRules('not json at all {{{', context);

    expect(result.pass).toBe(false);
    expect(result.reason).toMatch(/JSON/);
  });
});
```

- [ ] **Step 7: 运行 run-rules 测试，确认通过**

Run: `cd /Users/lesprivilege/Projects/Courtwork && pnpm exec vitest run eval/src/promptfoo/run-rules.test.ts`
Expected: PASS（2 个用例）

- [ ] **Step 8: 改 `eval/scripts/verify-s3-dataset.ts` 直接调用 evaluateCase**

```typescript
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDataset } from '../src/dataset-loader.js';
import { evaluateCase } from '../src/rules/evaluate.js';

const evalRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const datasetsRoot = join(evalRoot, 'datasets');

const cases = loadDataset(datasetsRoot, 'S3');
console.log(`已加载 ${cases.length} 个 S3 案例。`);

let failures = 0;
for (const c of cases) {
  // 健全性检查：把标准答案本身当作候选输出跑一遍规则评分——一个内部一致的数据集，
  // "完美模型"（=标准答案）在自己的规则上必须满分，否则数据集本身有缺陷。
  const result = evaluateCase(c.expectedAnswer, {
    scoringRules: c.scoringRules,
    expectedAnswer: c.expectedAnswer,
    input: c.task.input,
  });
  const mark = result.pass ? 'OK  ' : 'FAIL';
  if (!result.pass) failures += 1;
  console.log(`${mark} ${c.id.padEnd(32)} score=${result.score.toFixed(2)} ${result.pass ? '' : result.reason}`);
}

console.log(`\n${failures === 0 ? '全部通过' : `${failures} 个案例未通过健全性检查`}`);
process.exit(failures === 0 ? 0 : 1);
```

- [ ] **Step 9: 改 `eval/scripts/verify-s4-dataset.ts` 同样直接调用 evaluateCase**

```typescript
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadDataset } from '../src/dataset-loader.js';
import { evaluateCase } from '../src/rules/evaluate.js';

const evalRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const datasetsRoot = join(evalRoot, 'datasets');

const cases = loadDataset(datasetsRoot, 'S4');
console.log(`已加载 ${cases.length} 个 S4 案例。`);

let failures = 0;
for (const c of cases) {
  const result = evaluateCase(c.expectedAnswer, {
    scoringRules: c.scoringRules,
    expectedAnswer: c.expectedAnswer,
    input: c.task.input,
  });
  const mark = result.pass ? 'OK  ' : 'FAIL';
  if (!result.pass) failures += 1;
  console.log(`${mark} ${c.id.padEnd(36)} score=${result.score.toFixed(2)} ${result.pass ? '' : result.reason}`);
}

console.log(`\n${failures === 0 ? '全部通过' : `${failures} 个案例未通过健全性检查`}`);
process.exit(failures === 0 ? 0 : 1);
```

- [ ] **Step 10: 手动跑一次两个脚本，确认行为未变**

Run: `cd /Users/lesprivilege/Projects/Courtwork && pnpm --filter @courtwork/eval exec tsx scripts/verify-s3-dataset.ts`
Expected: `已加载 20 个 S3 案例。` ... `全部通过`，exit code 0

Run: `cd /Users/lesprivilege/Projects/Courtwork && pnpm --filter @courtwork/eval exec tsx scripts/verify-s4-dataset.ts`
Expected: `已加载 20 个 S4 案例。` ... `全部通过`，exit code 0

- [ ] **Step 11: 全量跑 eval 测试套件，确认无回归**

Run: `cd /Users/lesprivilege/Projects/Courtwork && pnpm exec vitest run eval/src`
Expected: 全部通过（测试文件数比之前多 1：新增 evaluate.test.ts）

- [ ] **Step 12: Commit**

```bash
cd /Users/lesprivilege/Projects/Courtwork
git add eval/src/rules/evaluate.ts eval/src/rules/evaluate.test.ts \
  eval/src/promptfoo/run-rules.ts eval/src/promptfoo/run-rules.test.ts \
  eval/scripts/verify-s3-dataset.ts eval/scripts/verify-s4-dataset.ts
git commit -m "$(cat <<'EOF'
refactor(eval): extract neutral rule dispatcher into src/rules/evaluate.ts

规则聚合逻辑（dispatch/parseCandidateOutput/聚合循环）与具体跑分器无关，
下沉成纯函数 evaluateCase。src/promptfoo/run-rules.ts 收窄为"JSON 字符串
vars → 中性参数"的薄适配层。verify-s3/s4-dataset.ts 脚本随之改为直接调用
evaluateCase，不再 import src/promptfoo/、不再手搭 promptfoo 的
{vars: {...}} 断言 context——W7.1 整改，消解 ACCEPTANCE.md 第 2 节缺口。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: report.ts / regression.ts / runner.ts 一体收敛到中性格式

promptfoo 原始结果类型（`PromptfooResultRow`/`PromptfooResultsFile`）搬进 `src/promptfoo/raw-results.ts`；新增映射函数 `src/promptfoo/map-results.ts`；CLI runner 搬进 `src/promptfoo/runner.ts` 并直接返回中性 `EvalRunResultSet`；`report.ts`/`regression.ts` 改为只消费中性格式；两个脚本随之更新。这五者在 TypeScript 静态类型层面互相耦合（runner 的返回形状必须和 report/regression 的入参形状同时对齐），拆成更小的提交会在中间态无法通过类型检查，因此作为一个任务、一次提交（对应本仓库既有先例：原 W7 实现的 `e60d550` 提交同样把 runner/report/regression 三者合并提交）。

**Files:**
- Create: `eval/src/promptfoo/raw-results.ts`
- Create: `eval/src/promptfoo/map-results.ts`
- Create: `eval/src/promptfoo/map-results.test.ts`
- Create: `eval/src/promptfoo/runner.ts`
- Delete: `eval/src/runner.ts`
- Modify: `eval/src/report.ts`
- Modify: `eval/src/report.test.ts`
- Modify: `eval/src/regression.ts`
- Modify: `eval/src/regression.test.ts`
- Modify: `eval/scripts/run-eval.ts`
- Modify: `eval/scripts/regression-check.ts`

- [ ] **Step 1: 写 `eval/src/promptfoo/map-results.test.ts`（失败态）**

```typescript
import { describe, it, expect } from 'vitest';
import { mapResultsFileToRunResults } from './map-results.js';
import type { PromptfooResultsFile } from './raw-results.js';

function fixture(): PromptfooResultsFile {
  return {
    evalId: 'eval-test-2026-07-10',
    results: {
      results: [
        {
          provider: { id: 'mock-thorough', label: 'mock-thorough' },
          success: true,
          score: 1,
          latencyMs: 300,
          cost: 0.02,
          tokenUsage: { total: 2000 },
          vars: { caseId: 'main-risk-01' },
          gradingResult: {
            pass: true,
            score: 1,
            reason: 'combined',
            componentResults: [
              { pass: true, score: 1, reason: 'rule ok', assertion: { type: 'javascript', value: 'x' } },
              { pass: true, score: 1, reason: 'judge ok', assertion: { type: 'llm-rubric', value: 'y' } },
            ],
          },
        },
        {
          provider: { id: 'mock-fast', label: 'mock-fast' },
          success: false,
          score: 0.5,
          latencyMs: 40,
          cost: 0.002,
          tokenUsage: { total: 300 },
          vars: { caseId: 'main-risk-02' },
          gradingResult: {
            pass: false,
            score: 0.5,
            reason: 'combined',
            componentResults: [
              { pass: false, score: 0.5, reason: 'rule half', assertion: { type: 'javascript', value: 'x' } },
            ],
          },
        },
      ],
    },
  };
}

describe('mapResultsFileToRunResults', () => {
  it('maps provider id, caseId, pass, score, cost, tokens, and latency to the neutral shape', () => {
    const [first] = mapResultsFileToRunResults(fixture());

    expect(first.runId).toBe('eval-test-2026-07-10');
    expect(first.caseId).toBe('main-risk-01');
    expect(first.provider).toBe('mock-thorough');
    expect(first.pass).toBe(true);
    expect(first.score).toBe(1);
    expect(first.cost).toBe(0.02);
    expect(first.tokensUsed).toBe(2000);
    expect(first.timings).toEqual({ latencyMs: 300 });
  });

  it('splits componentResults into ruleResults (javascript assertions) and judgeResults (llm-rubric assertions)', () => {
    const [first, second] = mapResultsFileToRunResults(fixture());

    expect(first.ruleResults).toEqual([{ pass: true, score: 1, reason: 'rule ok' }]);
    expect(first.judgeResults).toEqual([{ pass: true, score: 1, reason: 'judge ok' }]);
    expect(second.ruleResults).toEqual([{ pass: false, score: 0.5, reason: 'rule half' }]);
    expect(second.judgeResults).toEqual([]);
  });

  it('shares the same runId (evalId) across every row from one results file', () => {
    const results = mapResultsFileToRunResults(fixture());

    expect(results.every((r) => r.runId === 'eval-test-2026-07-10')).toBe(true);
  });

  it('throws a clear error when a row is missing vars.caseId', () => {
    const broken = fixture();
    broken.results.results[0].vars = {};

    expect(() => mapResultsFileToRunResults(broken)).toThrow(/caseId/);
  });

  it('defaults cost and tokensUsed to 0 when the row omits them', () => {
    const minimal = fixture();
    minimal.results.results[0].cost = undefined as unknown as number;
    minimal.results.results[0].tokenUsage = undefined;

    const [first] = mapResultsFileToRunResults(minimal);

    expect(first.cost).toBe(0);
    expect(first.tokensUsed).toBe(0);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run: `cd /Users/lesprivilege/Projects/Courtwork && pnpm exec vitest run eval/src/promptfoo/map-results.test.ts`
Expected: FAIL（`./map-results.js`、`./raw-results.js` 都不存在）

- [ ] **Step 3: 创建 `eval/src/promptfoo/raw-results.ts`**

```typescript
/**
 * promptfoo `-o results.json` 输出的原始形状（仅取本层用得到的字段的最小切片）。
 * 只有 map-results.ts 允许把这份形状翻译成中性的 EvalRunResult——其余任何文件
 * 都不应该直接依赖这个类型。
 */
export interface PromptfooAssertionResult {
  pass: boolean;
  score: number;
  reason: string;
  assertion?: { type: string; value?: string };
}

export interface PromptfooGradingResult {
  pass: boolean;
  score: number;
  reason: string;
  componentResults?: PromptfooAssertionResult[];
}

export interface PromptfooResultRow {
  provider: { id: string; label?: string };
  success: boolean;
  score: number;
  latencyMs: number;
  cost: number;
  tokenUsage?: { total: number };
  /** generate-tests.ts 里塞进去的 vars，按 vars.caseId 把结果行找回对应 case。 */
  vars?: { caseId?: string; [key: string]: unknown };
  gradingResult?: PromptfooGradingResult;
}

export interface PromptfooResultsFile {
  evalId: string;
  results: { results: PromptfooResultRow[] };
}
```

- [ ] **Step 4: 创建 `eval/src/promptfoo/map-results.ts`**

```typescript
import type { EvalRunResult, ScoredCheck } from '../results.js';
import type { PromptfooResultRow, PromptfooResultsFile } from './raw-results.js';

function mapComponentResults(row: PromptfooResultRow, assertionType: string): ScoredCheck[] {
  return (row.gradingResult?.componentResults ?? [])
    .filter((component) => component.assertion?.type === assertionType)
    .map((component) => ({ pass: component.pass, score: component.score, reason: component.reason }));
}

/**
 * 把 promptfoo `-o results.json` 的原始输出翻译成中性的 EvalRunResult[]——本文件是
 * 全仓库唯一知道 componentResults/assertion.type 这类 promptfoo 输出结构的地方，
 * 其余消费方（report.ts/regression.ts/scripts/**）只看得到映射后的中性形状。
 */
export function mapResultsFileToRunResults(resultsFile: PromptfooResultsFile): EvalRunResult[] {
  const runId = resultsFile.evalId;

  return resultsFile.results.results.map((row) => {
    const caseId = row.vars?.caseId;
    if (!caseId) {
      throw new Error(`结果行缺少 vars.caseId，无法映射为中性格式（provider=${row.provider.id}）`);
    }

    return {
      runId,
      caseId,
      provider: row.provider.id,
      pass: row.success,
      score: row.score,
      ruleResults: mapComponentResults(row, 'javascript'),
      judgeResults: mapComponentResults(row, 'llm-rubric'),
      timings: { latencyMs: row.latencyMs },
      cost: row.cost || 0,
      tokensUsed: row.tokenUsage?.total || 0,
    };
  });
}
```

- [ ] **Step 5: 运行测试，确认通过**

Run: `cd /Users/lesprivilege/Projects/Courtwork && pnpm exec vitest run eval/src/promptfoo/map-results.test.ts`
Expected: PASS（5 个用例）

- [ ] **Step 6: 创建 `eval/src/promptfoo/runner.ts`（原 src/runner.ts 内容迁入并改写）**

```typescript
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';
import { access, readFile, writeFile } from 'node:fs/promises';
import type { EvalRunResultSet } from '../results.js';
import { mapResultsFileToRunResults } from './map-results.js';
import type { PromptfooResultsFile } from './raw-results.js';

const execFileAsync = promisify(execFile);

export interface RunEvalOptions {
  /** eval/ 包根目录的绝对路径。 */
  evalRoot: string;
  scenario: 'S3' | 'S4';
  /** 中性结果 JSON（EvalRunResultSet）的输出路径（绝对路径）。 */
  outputPath: string;
}

/**
 * 跑分脚本本体：调用 promptfoo CLI 对指定场景跑一次评测，把它的原始输出翻译成
 * 中性的 EvalRunResultSet 后写到 outputPath——本文件之外的任何调用方都只看得到
 * 中性格式。provider 列表完全来自 `promptfoo/<scenario>.promptfooconfig.yaml`——
 * 本函数不接受、也不允许传入任何 provider 覆盖参数，换 provider 只能改配置文件，
 * 呼应"provider 一律走配置"。
 */
export async function runEval(options: RunEvalOptions): Promise<EvalRunResultSet> {
  const configPath = join(options.evalRoot, 'promptfoo', `${options.scenario}.promptfooconfig.yaml`);
  const rawOutputPath = `${options.outputPath}.raw.json`;
  try {
    await execFileAsync(
      'npx',
      ['promptfoo', 'eval', '-c', configPath, '--no-cache', '-o', rawOutputPath],
      { cwd: options.evalRoot, maxBuffer: 1024 * 1024 * 64 },
    );
  } catch (err) {
    // promptfoo eval 在有用例未通过时以非零码退出——这是正常的评测结果，不是跑分器崩溃。
    // 区分方式：结果文件是否真的写出来了。写出来了就说明本次跑分已完整完成，只是有
    // 用例没过；没写出来才是真的执行失败，需要把原始错误往上抛。
    const resultFileExists = await access(rawOutputPath).then(
      () => true,
      () => false,
    );
    if (!resultFileExists) throw err;
  }

  const raw = JSON.parse(await readFile(rawOutputPath, 'utf-8')) as PromptfooResultsFile;
  const runResultSet: EvalRunResultSet = {
    scenario: options.scenario,
    runResults: mapResultsFileToRunResults(raw),
  };
  await writeFile(options.outputPath, JSON.stringify(runResultSet, null, 2));
  return runResultSet;
}
```

- [ ] **Step 7: 删除 `eval/src/runner.ts`**

```bash
cd /Users/lesprivilege/Projects/Courtwork
git rm eval/src/runner.ts
```

- [ ] **Step 8: 改写 `eval/src/report.ts` 消费中性格式**

```typescript
import type { EvalRunResult, EvalRunResultSet } from './results.js';

export interface ProviderSummary {
  providerId: string;
  totalTests: number;
  passed: number;
  passRate: number;
  avgScore: number;
  totalCost: number;
  totalTokens: number;
  avgLatencyMs: number;
}

export function summarizeByProvider(resultSet: EvalRunResultSet): ProviderSummary[] {
  const byProvider = new Map<string, EvalRunResult[]>();
  for (const row of resultSet.runResults) {
    const rows = byProvider.get(row.provider) ?? [];
    rows.push(row);
    byProvider.set(row.provider, rows);
  }

  return Array.from(byProvider.entries()).map(([providerId, rows]) => {
    const totalTests = rows.length;
    const passed = rows.filter((r) => r.pass).length;
    return {
      providerId,
      totalTests,
      passed,
      passRate: passed / totalTests,
      avgScore: rows.reduce((sum, r) => sum + r.score, 0) / totalTests,
      totalCost: rows.reduce((sum, r) => sum + (r.cost || 0), 0),
      totalTokens: rows.reduce((sum, r) => sum + (r.tokensUsed || 0), 0),
      avgLatencyMs: rows.reduce((sum, r) => sum + r.timings.latencyMs, 0) / totalTests,
    };
  });
}

/** 质量 × 成本 × 延迟对比报告（Markdown），末尾给出按平均分排序的选型建议。 */
export function formatComparisonReportMarkdown(summaries: ProviderSummary[], scenario: string): string {
  const header = `# ${scenario} 多 Provider 对比报告\n\n`;
  const tableHeader =
    '| Provider | 用例数 | 通过率 | 平均分 | 总成本 (USD) | 总 tokens | 平均延迟 (ms) |\n' +
    '|---|---|---|---|---|---|---|\n';
  const rows = summaries
    .map(
      (s) =>
        `| ${s.providerId} | ${s.totalTests} | ${(s.passRate * 100).toFixed(1)}% | ${s.avgScore.toFixed(3)} | ` +
        `${s.totalCost.toFixed(4)} | ${s.totalTokens} | ${s.avgLatencyMs.toFixed(0)} |`,
    )
    .join('\n');

  const ranked = [...summaries].sort((a, b) => b.avgScore - a.avgScore);
  const recommendation =
    ranked.length === 0
      ? '（无可比较的 provider 结果）'
      : `平均分最高：**${ranked[0].providerId}**（${ranked[0].avgScore.toFixed(3)}）。` +
        (ranked.length > 1
          ? ` 如更看重成本/延迟，可对比 ${ranked
              .slice(1)
              .map((s) => s.providerId)
              .join('、')} 的质量降幅是否在可接受范围内。`
          : '');

  return `${header}${tableHeader}${rows}\n\n## 选型建议\n\n${recommendation}\n`;
}
```

- [ ] **Step 9: 改写 `eval/src/report.test.ts` fixture 为中性格式**

```typescript
import { describe, it, expect } from 'vitest';
import { summarizeByProvider, formatComparisonReportMarkdown } from './report.js';
import type { EvalRunResultSet } from './results.js';

function fixture(): EvalRunResultSet {
  return {
    scenario: 'S3',
    runResults: [
      { runId: 'r1', caseId: 'c1', provider: 'mock-thorough', pass: true, score: 1, ruleResults: [], judgeResults: [], timings: { latencyMs: 300 }, cost: 0.02, tokensUsed: 2000 },
      { runId: 'r1', caseId: 'c2', provider: 'mock-thorough', pass: true, score: 1, ruleResults: [], judgeResults: [], timings: { latencyMs: 320 }, cost: 0.02, tokensUsed: 2000 },
      { runId: 'r1', caseId: 'c1', provider: 'mock-fast', pass: true, score: 1, ruleResults: [], judgeResults: [], timings: { latencyMs: 40 }, cost: 0.002, tokensUsed: 300 },
      { runId: 'r1', caseId: 'c2', provider: 'mock-fast', pass: false, score: 0.5, ruleResults: [], judgeResults: [], timings: { latencyMs: 45 }, cost: 0.002, tokensUsed: 300 },
    ],
  };
}

describe('summarizeByProvider', () => {
  it('groups results by provider id and computes pass rate, average score, totals, and average latency', () => {
    const summaries = summarizeByProvider(fixture());

    const thorough = summaries.find((s) => s.providerId === 'mock-thorough')!;
    expect(thorough.totalTests).toBe(2);
    expect(thorough.passed).toBe(2);
    expect(thorough.passRate).toBe(1);
    expect(thorough.avgScore).toBe(1);
    expect(thorough.totalCost).toBeCloseTo(0.04);
    expect(thorough.totalTokens).toBe(4000);
    expect(thorough.avgLatencyMs).toBe(310);

    const fast = summaries.find((s) => s.providerId === 'mock-fast')!;
    expect(fast.totalTests).toBe(2);
    expect(fast.passed).toBe(1);
    expect(fast.passRate).toBe(0.5);
    expect(fast.avgScore).toBeCloseTo(0.75);
  });

  it('returns an empty array for an empty result set', () => {
    const summaries = summarizeByProvider({ scenario: 'S3', runResults: [] });

    expect(summaries).toEqual([]);
  });
});

describe('formatComparisonReportMarkdown', () => {
  it('renders one table row per provider with pass rate, score, cost, tokens, and latency', () => {
    const summaries = summarizeByProvider(fixture());

    const markdown = formatComparisonReportMarkdown(summaries, 'S3');

    expect(markdown).toMatch(/mock-thorough/);
    expect(markdown).toMatch(/mock-fast/);
    expect(markdown).toMatch(/S3/);
  });

  it('recommends the provider with the highest average score', () => {
    const summaries = summarizeByProvider(fixture());

    const markdown = formatComparisonReportMarkdown(summaries, 'S3');

    expect(markdown).toMatch(/mock-thorough/);
    const recommendationSection = markdown.slice(markdown.indexOf('选型建议'));
    expect(recommendationSection).toMatch(/mock-thorough/);
  });
});
```

- [ ] **Step 10: 改写 `eval/src/regression.ts` 消费中性格式**

```typescript
import type { EvalRunResult, EvalRunResultSet } from './results.js';

export interface RegressionFinding {
  caseId: string;
  providerId: string;
  baselineScore: number;
  currentScore: number;
  delta: number;
  regressed: boolean;
}

function keyOf(result: EvalRunResult): string {
  return `${result.provider}::${result.caseId}`;
}

/**
 * 回归模式：core / 提示词 / 场景定义变更后，把新跑分结果与之前存的基线结果对比，
 * 按 (provider, caseId) 匹配同一个用例——只有两边都存在的用例才有得比；新增用例
 * 没有基线可比，不计入回归发现（不是"通过"，是"跳过"）。
 */
export function findRegressions(
  baseline: EvalRunResultSet,
  current: EvalRunResultSet,
  threshold = 0.05,
): RegressionFinding[] {
  const baselineByKey = new Map<string, EvalRunResult>();
  for (const result of baseline.runResults) {
    baselineByKey.set(keyOf(result), result);
  }

  const findings: RegressionFinding[] = [];
  for (const result of current.runResults) {
    const baselineResult = baselineByKey.get(keyOf(result));
    if (!baselineResult) continue;

    const delta = result.score - baselineResult.score;
    findings.push({
      caseId: result.caseId,
      providerId: result.provider,
      baselineScore: baselineResult.score,
      currentScore: result.score,
      delta,
      regressed: delta <= -threshold,
    });
  }
  return findings;
}
```

- [ ] **Step 11: 改写 `eval/src/regression.test.ts` fixture 为中性格式**

```typescript
import { describe, it, expect } from 'vitest';
import { findRegressions } from './regression.js';
import type { EvalRunResult, EvalRunResultSet } from './results.js';

function result(caseId: string, providerId: string, score: number): EvalRunResult {
  return {
    runId: 'r1',
    caseId,
    provider: providerId,
    pass: score >= 0.7,
    score,
    ruleResults: [],
    judgeResults: [],
    timings: { latencyMs: 100 },
    cost: 0.01,
    tokensUsed: 100,
  };
}

function set(runResults: EvalRunResult[]): EvalRunResultSet {
  return { scenario: 'S3', runResults };
}

describe('findRegressions', () => {
  it('flags a case whose score dropped by more than the threshold', () => {
    const baseline = set([result('main-risk-01', 'anthropic:messages:claude-opus-4-8', 0.95)]);
    const current = set([result('main-risk-01', 'anthropic:messages:claude-opus-4-8', 0.6)]);

    const findings = findRegressions(baseline, current, 0.05);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      caseId: 'main-risk-01',
      providerId: 'anthropic:messages:claude-opus-4-8',
      regressed: true,
    });
    expect(findings[0].delta).toBeCloseTo(-0.35);
  });

  it('does not flag a case whose score moved within the threshold', () => {
    const baseline = set([result('main-risk-01', 'p', 0.9)]);
    const current = set([result('main-risk-01', 'p', 0.87)]);

    const findings = findRegressions(baseline, current, 0.05);

    expect(findings.filter((f) => f.regressed)).toHaveLength(0);
  });

  it('does not flag an improvement', () => {
    const baseline = set([result('main-risk-01', 'p', 0.6)]);
    const current = set([result('main-risk-01', 'p', 0.95)]);

    const findings = findRegressions(baseline, current, 0.05);

    expect(findings.filter((f) => f.regressed)).toHaveLength(0);
  });

  it('matches rows independently per provider, not just per case id', () => {
    const baseline = set([result('main-risk-01', 'provider-a', 0.9), result('main-risk-01', 'provider-b', 0.9)]);
    const current = set([result('main-risk-01', 'provider-a', 0.5), result('main-risk-01', 'provider-b', 0.9)]);

    const findings = findRegressions(baseline, current, 0.05);
    const regressed = findings.filter((f) => f.regressed);

    expect(regressed).toHaveLength(1);
    expect(regressed[0].providerId).toBe('provider-a');
  });

  it('skips a current case with no matching baseline row (new case, nothing to regress against)', () => {
    const baseline = set([]);
    const current = set([result('brand-new-case', 'p', 0.4)]);

    const findings = findRegressions(baseline, current, 0.05);

    expect(findings).toHaveLength(0);
  });
});
```

- [ ] **Step 12: 运行 report/regression 测试，确认通过**

Run: `cd /Users/lesprivilege/Projects/Courtwork && pnpm exec vitest run eval/src/report.test.ts eval/src/regression.test.ts`
Expected: PASS（全部用例）

- [ ] **Step 13: 改写 `eval/scripts/run-eval.ts` 只调用中性 API**

```typescript
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runEval } from '../src/promptfoo/runner.js';
import { summarizeByProvider, formatComparisonReportMarkdown } from '../src/report.js';

const evalRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function parseScenarioArg(): 'S3' | 'S4' {
  const idx = process.argv.indexOf('--scenario');
  const value = idx >= 0 ? process.argv[idx + 1] : undefined;
  if (value !== 'S3' && value !== 'S4') {
    throw new Error('用法: tsx scripts/run-eval.ts --scenario S3|S4');
  }
  return value;
}

async function main() {
  const scenario = parseScenarioArg();
  const reportsDir = join(evalRoot, 'reports');
  await mkdir(reportsDir, { recursive: true });
  const resultsPath = join(reportsDir, `${scenario}-results.json`);
  const reportPath = join(reportsDir, `${scenario}-comparison.md`);

  console.log(`跑 ${scenario} 评测（provider 列表见 promptfoo/${scenario}.promptfooconfig.yaml）...`);
  const resultSet = await runEval({ evalRoot, scenario, outputPath: resultsPath });

  const summaries = summarizeByProvider(resultSet);
  const markdown = formatComparisonReportMarkdown(summaries, scenario);

  await writeFile(reportPath, markdown);
  console.log(`\n对比报告已写入 ${reportPath}\n`);
  console.log(markdown);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
```

- [ ] **Step 14: 改写 `eval/scripts/regression-check.ts` 只消费中性格式**

```typescript
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findRegressions } from '../src/regression.js';
import type { EvalRunResultSet } from '../src/results.js';

/**
 * 回归模式：core / 提示词 / 场景定义变更后，跑一次 `run-eval.ts` 产出新的
 * `<scenario>-results.json`，再用本脚本与基线对比。建立/更新基线：
 *   cp reports/S3-results.json reports/S3-baseline.json
 */

const evalRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs() {
  const argAt = (flag: string) => {
    const idx = process.argv.indexOf(flag);
    return idx >= 0 ? process.argv[idx + 1] : undefined;
  };
  const scenario = argAt('--scenario');
  if (scenario !== 'S3' && scenario !== 'S4') {
    throw new Error('用法: tsx scripts/regression-check.ts --scenario S3|S4 [--baseline path] [--current path] [--threshold 0.05]');
  }
  const reportsDir = join(evalRoot, 'reports');
  return {
    scenario,
    baselinePath: argAt('--baseline') ?? join(reportsDir, `${scenario}-baseline.json`),
    currentPath: argAt('--current') ?? join(reportsDir, `${scenario}-results.json`),
    threshold: argAt('--threshold') ? Number(argAt('--threshold')) : 0.05,
  };
}

async function main() {
  const { scenario, baselinePath, currentPath, threshold } = parseArgs();
  const baseline = JSON.parse(await readFile(baselinePath, 'utf-8')) as EvalRunResultSet;
  const current = JSON.parse(await readFile(currentPath, 'utf-8')) as EvalRunResultSet;

  const findings = findRegressions(baseline, current, threshold);
  const regressed = findings.filter((f) => f.regressed);

  console.log(`${scenario}：对比了 ${findings.length} 个基线/当次均存在的用例（阈值 Δ${threshold}）。`);
  for (const f of regressed) {
    console.log(
      `  回归 [${f.providerId}] ${f.caseId}: ${f.baselineScore.toFixed(3)} -> ${f.currentScore.toFixed(3)} (Δ${f.delta.toFixed(3)})`,
    );
  }

  if (regressed.length > 0) {
    console.error(`\n发现 ${regressed.length} 处回归。`);
    process.exitCode = 1;
  } else {
    console.log('\n未发现回归。');
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
```

- [ ] **Step 15: 全量类型检查 + 测试**

Run: `cd /Users/lesprivilege/Projects/Courtwork && pnpm --filter @courtwork/eval run build && pnpm exec vitest run eval/src`
Expected: build 通过；测试全部通过

- [ ] **Step 16: Commit**

```bash
cd /Users/lesprivilege/Projects/Courtwork
git add eval/src/promptfoo/raw-results.ts eval/src/promptfoo/map-results.ts \
  eval/src/promptfoo/map-results.test.ts eval/src/promptfoo/runner.ts \
  eval/src/report.ts eval/src/report.test.ts \
  eval/src/regression.ts eval/src/regression.test.ts \
  eval/scripts/run-eval.ts eval/scripts/regression-check.ts
git commit -m "$(cat <<'EOF'
refactor(eval): converge promptfoo runner/report/regression on neutral EvalRunResult

src/runner.ts 迁入 src/promptfoo/runner.ts，内部完成 CLI 调用 + 原始 JSON
解析 + 映射（新增 src/promptfoo/raw-results.ts、map-results.ts），对外只
返回/落盘中性 EvalRunResultSet。report.ts/regression.ts 改为只消费中性
格式；run-eval.ts/regression-check.ts 随之更新，不再引用 promptfoo 的
PromptfooResultsFile 类型。回归基线自此以中性格式落盘，成为跑分器无关的
可移植数据资产——W7.1 整改核心产出。

runner/report/regression/两个脚本在类型层面互相耦合，中间态无法独立通过
类型检查，故合并为一次提交（同原 W7 实现 e60d550 提交先例）。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: mock providers 迁入 src/promptfoo/mock-providers/

mock provider 实现的是 promptfoo 的自定义 provider 插件接口（`{id(), callApi(prompt, context)}`），本就该被关在适配层里。这一步是纯移动，文件内容不改（这些文件里出现的"promptfoo"字面词，迁入 `src/promptfoo/` 后即合规）。

**Files:**
- Move: `eval/src/mock-providers/mock-thorough-provider.ts` → `eval/src/promptfoo/mock-providers/mock-thorough-provider.ts`
- Move: `eval/src/mock-providers/mock-fast-provider.ts` → `eval/src/promptfoo/mock-providers/mock-fast-provider.ts`
- Move: `eval/src/mock-providers/mock-judge-provider.ts` → `eval/src/promptfoo/mock-providers/mock-judge-provider.ts`
- Move: `eval/src/mock-providers/degrade.ts` → `eval/src/promptfoo/mock-providers/degrade.ts`
- Move: `eval/src/mock-providers/degrade.test.ts` → `eval/src/promptfoo/mock-providers/degrade.test.ts`
- Modify: `eval/promptfoo/S3.promptfooconfig.yaml`
- Modify: `eval/promptfoo/S4.promptfooconfig.yaml`

- [ ] **Step 1: git mv 五个文件**

```bash
cd /Users/lesprivilege/Projects/Courtwork
mkdir -p eval/src/promptfoo/mock-providers
git mv eval/src/mock-providers/mock-thorough-provider.ts eval/src/promptfoo/mock-providers/mock-thorough-provider.ts
git mv eval/src/mock-providers/mock-fast-provider.ts eval/src/promptfoo/mock-providers/mock-fast-provider.ts
git mv eval/src/mock-providers/mock-judge-provider.ts eval/src/promptfoo/mock-providers/mock-judge-provider.ts
git mv eval/src/mock-providers/degrade.ts eval/src/promptfoo/mock-providers/degrade.ts
git mv eval/src/mock-providers/degrade.test.ts eval/src/promptfoo/mock-providers/degrade.test.ts
```

`mock-fast-provider.ts` 内部 `import { degradeRiskList, degradeRevisionSet } from './degrade.js'` 是相对导入，两个文件一起搬动后路径依然有效，不需要改内容。

- [ ] **Step 2: 改 `eval/promptfoo/S3.promptfooconfig.yaml` provider 路径**

```yaml
# S3（合同审查）评测配置。
#
# provider 一律走配置，不写死在代码里：本机没有真实 provider 的 API key，下面默认接
# 两个 mock provider，只用来验证跑分脚本 + 对比报告机制本身能跑通。真实跑分时，把
# providers 列表换成真实 provider id，例如：
#   providers:
#     - anthropic:messages:claude-opus-4-8
#     - anthropic:messages:claude-sonnet-5
#     - openai:gpt-5.1
# defaultTest.options.provider 同理换成真实 provider（用于 llm-rubric judge 评分）。
# 不需要改任何 TypeScript 代码。

description: 'S3 合同审查评测（临江精铸诉起云智能设备采购合同纠纷案样板案）'

prompts:
  - |
    {{instruction}}

    案件相关输入（JSON）：
    {{input}}

providers:
  - id: file://../src/promptfoo/mock-providers/mock-thorough-provider.ts
    label: mock-thorough
  - id: file://../src/promptfoo/mock-providers/mock-fast-provider.ts
    label: mock-fast

tests: file://../src/promptfoo/tests-entry.ts:s3Tests

defaultTest:
  options:
    provider: file://../src/promptfoo/mock-providers/mock-judge-provider.ts
```

- [ ] **Step 3: 改 `eval/promptfoo/S4.promptfooconfig.yaml` provider 路径**

```yaml
# S4（文书起草）评测配置。provider 一律走配置——见 S3.promptfooconfig.yaml 顶部注释，
# 换成真实 provider 时同样不需要改任何 TypeScript 代码，只改这个文件。

description: 'S4 文书起草评测（临江精铸诉起云智能设备采购合同纠纷案样板案）'

prompts:
  - |
    {{instruction}}

    案件相关输入（JSON）：
    {{input}}

providers:
  - id: file://../src/promptfoo/mock-providers/mock-thorough-provider.ts
    label: mock-thorough
  - id: file://../src/promptfoo/mock-providers/mock-fast-provider.ts
    label: mock-fast

tests: file://../src/promptfoo/tests-entry.ts:s4Tests

defaultTest:
  options:
    provider: file://../src/promptfoo/mock-providers/mock-judge-provider.ts
```

- [ ] **Step 4: 确认 eval/src/mock-providers/ 目录已空并被 git 识别为移动**

Run: `cd /Users/lesprivilege/Projects/Courtwork && git status --short eval/src/mock-providers eval/src/promptfoo/mock-providers`
Expected: 五个文件都显示 `R  ` (renamed)，且 `eval/src/mock-providers/` 目录不再存在残留文件

- [ ] **Step 5: 运行 degrade 测试确认迁移后仍通过**

Run: `cd /Users/lesprivilege/Projects/Courtwork && pnpm exec vitest run eval/src/promptfoo/mock-providers/degrade.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
cd /Users/lesprivilege/Projects/Courtwork
git add eval/src/mock-providers eval/src/promptfoo/mock-providers \
  eval/promptfoo/S3.promptfooconfig.yaml eval/promptfoo/S4.promptfooconfig.yaml
git commit -m "$(cat <<'EOF'
refactor(eval): move mock providers into src/promptfoo/mock-providers/

mock provider 实现的是 promptfoo 的自定义 provider 插件接口（id/callApi），
本就该被关在适配层里。纯移动，不改内容；两个 promptfooconfig.yaml 的
provider 路径同步更新。W7.1 整改。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: 清理非适配层文件里残留的 promptfoo 字面词

`src/dataset-schema.ts` 与 `src/rules/types.ts` 的注释里各出现过 1-2 处字面 "promptfoo"，用于解释"本文件为什么不依赖跑分器"——但解释本身也落进了 rg 边界扫描的命中范围。改写措辞，去掉字面词，保留原意。

**Files:**
- Modify: `eval/src/dataset-schema.ts:33-37`
- Modify: `eval/src/rules/types.ts:1-4`

- [ ] **Step 1: 改 `eval/src/dataset-schema.ts` 注释**

把：

```typescript
/**
 * 评测例的中性形状：任务输入 + 专业标准答案 + 评分规则 + 溯源，不含任何跑分器
 * 专有词汇（如 promptfoo 的 vars/assert）——跑分器绑定层（src/promptfoo/）单向依赖
 * 本 schema，本 schema 不知道任何跑分器的存在。
 */
```

改为：

```typescript
/**
 * 评测例的中性形状：任务输入 + 专业标准答案 + 评分规则 + 溯源，不含任何特定跑分器
 * 专有的断言/变量字段——跑分器绑定层（src/promptfoo/）单向依赖本 schema，本 schema
 * 不知道任何跑分器的存在。
 */
```

- [ ] **Step 2: 改 `eval/src/rules/types.ts` 整份文件**

```typescript
/**
 * 所有规则评分函数的统一返回形状，与任何跑分器无关——跑分器适配层
 * （src/promptfoo/）负责把它翻译成跑分器原生的评分结果结构。
 */
export interface RuleResult {
  pass: boolean;
  /** 0..1，供跨规则加权聚合与对比报告使用。 */
  score: number;
  reason: string;
}
```

- [ ] **Step 3: 类型检查 + 全量测试确认无回归**

Run: `cd /Users/lesprivilege/Projects/Courtwork && pnpm --filter @courtwork/eval run build && pnpm exec vitest run eval/src`
Expected: 全部通过

- [ ] **Step 4: Commit**

```bash
cd /Users/lesprivilege/Projects/Courtwork
git add eval/src/dataset-schema.ts eval/src/rules/types.ts
git commit -m "$(cat <<'EOF'
docs(eval): remove promptfoo references from non-adapter comments

dataset-schema.ts 和 rules/types.ts 的注释此前各含 1-2 处字面 "promptfoo"
（用于解释"本文件为何与跑分器无关"），落进了边界扫描的命中范围。改写措辞
保留原意、去掉字面词。W7.1 整改，配合 rg 边界扫描收敛到零命中。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: 重建基线 + 复跑验收报告第 1、2、6 项自证

`eval/reports/*.json`、`*.md` 全部被 `.gitignore` 排除（不进 git），SPEC.md 也早已如实记录"该目录内容可重新生成，且当前只用 mock provider 验证过机制，不代表任何真实基线"。据此，既有基线文件的"迁移"选择**重建**而非编写一次性迁移脚本：内容对现有 mock-based baseline 无保留价值（gitignored、非真实评测基线、mock provider 确定性输出下重建即可得等价结果），编写迁移脚本反而是对一堆临时产物做不必要的工程投入。本任务不产生 git 提交（reports/ 不进 git）；命令与输出摘要记录进 Task 7 的 SPEC/ACCEPTANCE 更新。

**Files:** 无源码改动，仅执行命令并记录输出。

- [ ] **Step 1: 干净环境安装（对应验收报告第 1 项）**

Run:
```bash
cd /Users/lesprivilege/Projects/Courtwork
rm -rf node_modules
pnpm install
```
Expected: 安装成功，7 个 workspace projects

- [ ] **Step 2: 定向与全量测试（对应验收报告第 1 项）**

Run:
```bash
cd /Users/lesprivilege/Projects/Courtwork
pnpm --filter @courtwork/eval test -- --run
pnpm test -- --run
pnpm lint
pnpm -r run build
```
Expected: 全部通过；记录真实 Test Files / Tests 计数（预期 eval 定向从 W7 验收时的 12 个测试文件增至 14 个——新增 `rules/evaluate.test.ts`、`promptfoo/map-results.test.ts`，`run-rules.test.ts` 精简但未删除；用例数预期从 57 增至约 64（run-rules.test.ts 精简 -5，evaluate.test.ts +7，map-results.test.ts +5）。以实际输出为准，如与预期不符先核实是否有文件遗漏或重复，而非直接改预期凑数）

- [ ] **Step 3: rg 边界扫描——原始命令逐字复跑（对应验收报告第 2 项）**

Run:
```bash
cd /Users/lesprivilege/Projects/Courtwork
rg -ni "promptfoo|vars|assert|llm-rubric|javascript|provider" eval/datasets eval/src eval/scripts eval/promptfoo eval/judges --glob '!eval/src/promptfoo/**' --glob '!eval/promptfoo/**'
```
Expected: 如实记录输出。预期仅剩 `provider`/`providerId` 类中性词的合法命中（EvalRunResult.provider 字段本身、ProviderSummary.providerId、RegressionFinding.providerId 及其消费方）——这些词是本次整改方案明确指定的中性字段名，不是 promptfoo 专有词汇（SPEC.md 对硬边界的原始定义本就只列 `vars`/`assert`/`type: javascript`/`type: llm-rubric`，未列 `provider`）。

- [ ] **Step 4: rg 边界扫描——精确到真正专有词汇（补充验证）**

Run:
```bash
cd /Users/lesprivilege/Projects/Courtwork
rg -ni "promptfoo|llm-rubric" eval/datasets eval/src eval/scripts eval/promptfoo eval/judges --glob '!eval/src/promptfoo/**' --glob '!eval/promptfoo/**'
rg -ni '\bvars\b|\bassert\b' eval/datasets eval/src eval/scripts eval/promptfoo eval/judges --glob '!eval/src/promptfoo/**' --glob '!eval/promptfoo/**'
```
Expected: 两条命令均**零命中**——这是真正的硬边界判据（SPEC.md 原始定义的专有词汇集合）。如实记录输出；若非零命中，回到对应任务修正后重新执行本 Task。

- [ ] **Step 5: 重建 S3/S4 结果与基线，跑对比报告（对应验收报告第 6 项）**

Run:
```bash
cd /Users/lesprivilege/Projects/Courtwork
pnpm --filter @courtwork/eval exec tsx scripts/verify-s3-dataset.ts
pnpm --filter @courtwork/eval exec tsx scripts/verify-s4-dataset.ts
pnpm --filter @courtwork/eval exec tsx scripts/run-eval.ts --scenario S3
pnpm --filter @courtwork/eval exec tsx scripts/run-eval.ts --scenario S4
```
Expected: 20/20 健全性检查通过（两个场景）；`reports/S3-results.json`、`reports/S4-results.json`（中性格式）与对应 `-comparison.md` 生成；如实记录通过率/分数分布是否与 W7 报告描述的模式一致（S3 mock-thorough 20/20、mock-fast 19/20 唯一失败 main-holistic 缺 risk-06；S4 mock-thorough 20/20、mock-fast 5/20）

- [ ] **Step 6: 建立基线并验证零回归**

Run:
```bash
cd /Users/lesprivilege/Projects/Courtwork
cp eval/reports/S3-results.json eval/reports/S3-baseline.json
cp eval/reports/S4-results.json eval/reports/S4-baseline.json
pnpm --filter @courtwork/eval exec tsx scripts/regression-check.ts --scenario S3
pnpm --filter @courtwork/eval exec tsx scripts/regression-check.ts --scenario S4
```
Expected: 两个场景均 40/40 用例可比、零回归，exit code 0

- [ ] **Step 7: 人为注入一处回归，验证脚本能精确抓到（对应验收报告第 6 项"回归模式"）**

Run:
```bash
cd /Users/lesprivilege/Projects/Courtwork
node -e "
const fs = require('fs');
const path = 'eval/reports/S3-injected.json';
const data = JSON.parse(fs.readFileSync('eval/reports/S3-results.json', 'utf-8'));
const row = data.runResults.find(r => r.provider === 'mock-thorough' && r.caseId === 'main-risk-01');
if (!row) throw new Error('未找到 mock-thorough/main-risk-01，检查数据集/provider 命名是否变化');
console.log('注入前分数:', row.score);
row.score = Math.max(0, row.score - 0.5);
row.pass = false;
console.log('注入后分数:', row.score);
fs.writeFileSync(path, JSON.stringify(data, null, 2));
"
pnpm --filter @courtwork/eval exec tsx scripts/regression-check.ts --scenario S3 --current eval/reports/S3-injected.json
```
Expected: 非零 exit code；输出精确报告 1 处回归，`[mock-thorough] main-risk-01`

- [ ] **Step 8: 清理注入用的临时文件**

Run: `rm -f /Users/lesprivilege/Projects/Courtwork/eval/reports/S3-injected.json`

（`eval/reports/*.json` 整体不进 git，此步骤只是保持工作目录整洁，非必须但建议执行。）

- [ ] **Step 9: 汇总本任务全部命令的真实输出，供 Task 7 写入 SPEC/ACCEPTANCE**

把 Step 1-7 的真实终端输出（尤其 Step 3/4 的 rg 结果、Step 6/7 的回归检测结果、Step 2 的测试计数）留存，下一任务原样摘录，不得凭记忆转述或编造数字。

---

## Task 7: 更新 SPEC.md 状态区 + ACCEPTANCE.md 追加整改记录

**Files:**
- Modify: `eval/SPEC.md`（状态区/验收记录区）
- Modify: `eval/ACCEPTANCE.md`（**只追加**，末尾新增"整改记录"节，不改动 Codex 原文一字一句）

- [ ] **Step 1: 在 `eval/SPEC.md` 的"验收记录"节后追加 W7.1 整改小节**

在现有"## 验收记录"内容之后（文件末尾）追加，具体数字以 Task 6 的真实命令输出为准：

```markdown

## W7.1 整改记录（收敛 promptfoo 专有边界）

- 背景：W7 验收结论"不完全放行"，缺口见本目录 `ACCEPTANCE.md` 第 2 节——promptfoo
  专有词汇与输出结构散落在 `src/report.ts`/`src/regression.ts`/`src/runner.ts`/
  `src/mock-providers/**`/`scripts/**`。
- 整改：
  1. 新增中性内部结果格式 `EvalRunResult`/`EvalRunResultSet`（`src/results.ts`，
     `runId`/`caseId`/`provider`/`pass`/`score`/`ruleResults`/`judgeResults`/
     `timings`/`cost`/`tokensUsed`）。
  2. `src/promptfoo/` 成为唯一边界：新增 `raw-results.ts`（promptfoo 原始结果类型）、
     `map-results.ts`（原始结果 → 中性格式的映射）；`runner.ts`（原 `src/runner.ts`）
     内部完成 CLI 调用 + 解析 + 映射，对外只返回/落盘中性格式；三个 mock provider
     与 `degrade.ts` 迁入 `src/promptfoo/mock-providers/`。
  3. 规则聚合逻辑下沉为中性纯函数 `evaluateCase`（`src/rules/evaluate.ts`），
     `src/promptfoo/run-rules.ts` 收窄为"vars JSON 字符串 → 中性参数"薄适配层。
  4. `report.ts`/`regression.ts`/`scripts/**` 全部改为只消费中性格式；
     `verify-s3/s4-dataset.ts` 直接调用 `evaluateCase`，不再 import `src/promptfoo/`。
  5. 既有回归基线文件（`reports/*-baseline.json`）选择**重建**而非编写迁移脚本：
     该目录整体 `.gitignore`，此前内容仅为 mock provider 机制验证、非真实基线，
     重建即可得等价结果，迁移脚本对一次性、非真实、未纳入版本管理的产物没有
     保留价值。
- 自证（复跑 `ACCEPTANCE.md` 第 1、2、6 项对应命令，[执行日期]）：
  - 第 1 项：`rm -rf node_modules && pnpm install`、`pnpm --filter @courtwork/eval
    test -- --run`（[N] 个测试文件 / [M] 个用例）、`pnpm test -- --run`（[N] 个测试
    文件 / [M] 个用例）、`pnpm lint`、`pnpm -r run build` 均通过。
  - 第 2 项：`rg -ni "promptfoo|vars|assert|llm-rubric|javascript|provider" ...`
    （与验收报告完全相同的命令）剩余命中全部是 `provider`/`providerId` 类中性
    字段（`EvalRunResult.provider`/`ProviderSummary.providerId`/
    `RegressionFinding.providerId` 及其消费方）——SPEC 对硬边界的原始定义
    （`vars`/`assert`/`type: javascript`/`type: llm-rubric`）本就未把 `provider`
    列为专有词汇。精确到真正专有词汇集合的补充扫描
    （`rg -ni "promptfoo|llm-rubric" ...` + `rg -ni '\bvars\b|\bassert\b' ...`）
    **零命中**。
  - 第 6 项：`verify-s3/s4-dataset.ts` 健全性检查 20/20 通过（两场景）；
    `run-eval.ts --scenario S3|S4` 重建中性格式结果与对比报告；建立基线后
    `regression-check.ts` 40/40 用例可比、零回归（两场景）；人为注入一处退分
    （mock-thorough/main-risk-01）后脚本非零退出并精确报告 1 处回归。
- 结论：硬条件一（跑分器无关性）缺口已消解，`src/promptfoo/` 是全仓库唯一
  出现 promptfoo 专有词汇与输出结构的位置（配置文件除外）。真实 provider
  跑分仍按原 TODO 留给有凭证的会话。
```

- [ ] **Step 2: 在 `eval/ACCEPTANCE.md` 末尾追加"整改记录"节（不改动任何既有文字）**

用 Read 工具确认 `eval/ACCEPTANCE.md` 当前末尾行号后，在文件最后追加（不修改、不删除第 1-131 行任何一个字符）：

```markdown

---

## 整改记录（W7.1，[执行日期]）

本节由实施本次整改的会话追加，Codex 原文（以上全部内容）未做任何改动。

针对第 2 节"硬条件一：跑分器无关性"标出的缺口，已完成以下整改（详见
`eval/SPEC.md` "W7.1 整改记录"小节的完整清单）：

- 新增中性内部结果格式 `EvalRunResult`（`src/results.ts`）。
- `src/promptfoo/` 收拢为唯一边界：CLI runner、原始结果解析/映射、三个 mock
  provider 全部收进此目录；`report.ts`/`regression.ts`/`scripts/**` 只消费
  中性格式。
- 规则聚合逻辑下沉为中性纯函数 `evaluateCase`（`src/rules/evaluate.ts`）。
- 回归基线改为以中性格式落盘。

复跑本报告第 1、2、6 项对应的全部命令自证：

- 第 1 项：[通过/不通过]，[N] 个测试文件 / [M] 个用例（eval 定向），
  [N'] 个测试文件 / [M'] 个用例（全仓库）。
- 第 2 项：`rg -ni "promptfoo|vars|assert|llm-rubric|javascript|provider" eval/datasets
  eval/src eval/scripts eval/promptfoo eval/judges --glob '!eval/src/promptfoo/**'
  --glob '!eval/promptfoo/**'` 剩余命中均为中性 `provider`/`providerId` 字段
  （非 SPEC.md 原始定义的专有词汇）；精确到 `promptfoo|llm-rubric|\bvars\b|\bassert\b`
  的补充扫描零命中。
- 第 6 项：S3/S4 健全性检查、跑分、对比报告、回归模式（含人为注入回归的检测）
  均复跑通过，结果与 W7 报告描述的模式一致。

请 Codex 按原报告第 1、2、6 项标准补验。
```

- [ ] **Step 3: 确认 ACCEPTANCE.md 前 131 行未被改动**

Run: `cd /Users/lesprivilege/Projects/Courtwork && git diff eval/ACCEPTANCE.md | head -20`
Expected: diff 只显示文件末尾的新增行（全部是 `+` 行），不出现任何 `-` 行

- [ ] **Step 4: Commit**

```bash
cd /Users/lesprivilege/Projects/Courtwork
git add eval/SPEC.md eval/ACCEPTANCE.md
git commit -m "$(cat <<'EOF'
docs(eval): W7.1 remediation record

SPEC.md 状态区追加 W7.1 整改记录（方案、自证结果）；ACCEPTANCE.md 末尾
追加"整改记录"节（只追加，不改动 Codex 原文），供 Codex 按原报告第 1、
2、6 项补验。

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

## Self-Review Notes

- **Spec 覆盖**：整改方案 5 点 ——① 中性格式（Task 1）② src/promptfoo/ 收为唯一边界（Task 2/3/4）③ 基线迁移方式（Task 6，选择重建并说明理由）④ 复跑第 1/2/6 项自证（Task 6）⑤ TDD + 显式路径分层提交 + SPEC/ACCEPTANCE 更新（贯穿全部 Task + Task 7）——均有对应任务覆盖。
- **不改动范围**：`datasets/**`（本就已通过 W7 验收，本次缺口不涉及）、`judges/**`、`src/rules/*.ts`（除 `types.ts` 注释与新增 `evaluate.ts` 外）、`src/dataset-loader.ts`、`generate-tests.ts`/`tests-entry.ts`（未在 rg 命中列表中，无需改动）均不触碰。
- **已知的"不可能零命中"及其处理**：原始 rg 命令包含 `provider` 一词，而本次整改方案明确要求 `EvalRunResult` 携带 `provider` 字段（中性、非 promptfoo 专有）——Task 6 Step 3/4 对此给出双重扫描（逐字复跑原命令 + 精确到真正专有词汇的补充命令），如实记录而非静默通过，Task 7 的 SPEC/ACCEPTANCE 更新明确写出这一判断依据，留给 Codex 复核。
- **风险点**：Task 6 Step 1 的 `rm -rf node_modules && pnpm install` 是全仓库级操作，耗时/带宽成本较高，但 ACCEPTANCE.md 第 1 项本就要求这一命令、且可逆（`pnpm install` 可重新生成），按原计划执行。

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-10-eval-promptfoo-boundary-remediation.md`. Two execution options:

1. **Subagent-Driven (recommended for independent review)** — 每个 Task 派一个全新子代理执行，两阶段 review。
2. **Inline Execution** — 在当前会话内按 Task 顺序执行，配合 checkpoint 确认。

Which approach?
