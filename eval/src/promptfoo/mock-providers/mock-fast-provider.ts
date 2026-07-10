import { degradeRiskList, degradeRevisionSet } from './degrade.js';

interface AssertionContext {
  vars: Record<string, string>;
}

interface DegradableAnswer {
  risks?: unknown[];
  instructions?: unknown[];
  [key: string]: unknown;
}

function degrade(expectedAnswer: DegradableAnswer): DegradableAnswer {
  if (Array.isArray(expectedAnswer.risks)) return degradeRiskList(expectedAnswer);
  if (Array.isArray(expectedAnswer.instructions)) return degradeRevisionSet(expectedAnswer);
  return expectedAnswer;
}

/**
 * 模拟"快但有瑕疵的模型"：在标准答案基础上刻意退化（漏掉一个风险点/去掉引用），
 * 模拟低 token 用量/低延迟/低成本、但质量有代价——同样只是本机验证用的假 provider，
 * 见 mock-thorough-provider.ts 顶部注释。
 */
export default class MockFastProvider {
  id = () => 'mock-fast';

  async callApi(_prompt: string, context: AssertionContext) {
    await new Promise((resolve) => setTimeout(resolve, 40));
    const expectedAnswer: DegradableAnswer = JSON.parse(context.vars.expectedAnswerJson);
    return {
      output: JSON.stringify(degrade(expectedAnswer)),
      tokenUsage: { total: 300, prompt: 250, completion: 50 },
      cost: 0.002,
    };
  }
}
