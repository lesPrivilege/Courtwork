import * as z from 'zod';

/**
 * 评分规则的判别联合。每种规则类型对应一个可独立运行、与跑分器无关的纯函数
 * （见 src/rules/），本 schema 只约束"要跑哪些规则、参数是什么"这份声明本身。
 */
export const ScoringRuleSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('schemaValid'),
    schemaName: z.string().min(1),
  }),
  z.object({
    type: z.literal('riskListMatch'),
  }),
  z.object({
    type: z.literal('citationExists'),
  }),
  z.object({
    type: z.literal('factConsistency'),
    checkFields: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    type: z.literal('revisionSetMatch'),
  }),
  z.object({
    type: z.literal('llmJudge'),
    judgePromptFile: z.string().min(1),
    weight: z.number().positive().default(1),
  }),
]);
export type ScoringRule = z.infer<typeof ScoringRuleSchema>;

/**
 * 评测例的中性形状：任务输入 + 专业标准答案 + 评分规则 + 溯源，不含任何跑分器
 * 专有词汇（如 promptfoo 的 vars/assert）——跑分器绑定层（src/promptfoo/）单向依赖
 * 本 schema，本 schema 不知道任何跑分器的存在。
 */
export const EvalCaseSchema = z.object({
  id: z.string().min(1),
  scenario: z.enum(['S3', 'S4']),
  caseType: z.enum(['core', 'holistic', 'negative', 'variant', 'draft']),
  task: z.object({
    instruction: z.string().min(1),
    input: z.record(z.string(), z.unknown()),
  }),
  expectedAnswer: z.record(z.string(), z.unknown()),
  scoringRules: z.array(ScoringRuleSchema).min(1),
  /** 溯源：本例衍生自哪些 demo-data 源文件，供人工核对与"不编平行素材"纪律的可审计性。 */
  sourceRefs: z.array(z.string().min(1)).min(1),
});
export type EvalCase = z.infer<typeof EvalCaseSchema>;
