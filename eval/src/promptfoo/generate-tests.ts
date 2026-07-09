import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { EvalCase } from '../dataset-schema.js';

/**
 * 这是仓库里唯一允许出现 promptfoo 专有词汇（vars/assert/type: javascript/
 * type: llm-rubric）的文件。中性数据集（datasets/、EvalCaseSchema）完全不知道
 * 这些形状的存在——换跑分器时只需要重写本文件，数据资产原样可用。
 */
export interface PromptfooTestCase {
  vars: {
    /** 原样透传 EvalCase.id，供跑分结果按 case 匹配（如回归对比按 case 找基线）。 */
    caseId: string;
    instruction: string;
    input: string;
    expectedAnswerJson: string;
    scoringRulesJson: string;
  };
  assert: Array<{ type: 'javascript'; value: string } | { type: 'llm-rubric'; value: string }>;
}

export interface GenerateTestsOptions {
  /** eval/ 包根目录的绝对路径，用于解析 judgePromptFile 相对路径与规则派发器模块路径。 */
  evalRoot: string;
}

export function generateTests(cases: EvalCase[], options: GenerateTestsOptions): PromptfooTestCase[] {
  const rulesModulePath = join(options.evalRoot, 'src', 'promptfoo', 'run-rules.ts');

  return cases.map((evalCase) => {
    const assert: PromptfooTestCase['assert'] = [];

    const hasRuleBasedRules = evalCase.scoringRules.some((rule) => rule.type !== 'llmJudge');
    if (hasRuleBasedRules) {
      assert.push({ type: 'javascript', value: `file://${rulesModulePath}:runRules` });
    }

    for (const rule of evalCase.scoringRules) {
      if (rule.type !== 'llmJudge') continue;
      const judgePromptText = readFileSync(join(options.evalRoot, rule.judgePromptFile), 'utf-8');
      assert.push({ type: 'llm-rubric', value: judgePromptText });
    }

    return {
      vars: {
        caseId: evalCase.id,
        instruction: evalCase.task.instruction,
        input: JSON.stringify(evalCase.task.input),
        expectedAnswerJson: JSON.stringify(evalCase.expectedAnswer),
        scoringRulesJson: JSON.stringify(evalCase.scoringRules),
      },
      assert,
    };
  });
}
