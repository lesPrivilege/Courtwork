interface AssertionContext {
  vars: Record<string, string>;
}

/**
 * 模拟"强模型"：直接给出标准答案，模拟高 token 用量/高延迟/高成本——
 * 只用于本机没有真实 provider key 时验证跑分脚本与对比报告机制本身能跑通，
 * 不代表任何真实模型的表现。真实跑分时把 promptfoo 配置里的 providers 换成
 * 真实 provider id（如 anthropic:messages:claude-opus-4-8）即可，本文件不参与。
 */
export default class MockThoroughProvider {
  id = () => 'mock-thorough';

  async callApi(_prompt: string, context: AssertionContext) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    const expectedAnswer: unknown = JSON.parse(context.vars.expectedAnswerJson);
    return {
      output: JSON.stringify(expectedAnswer),
      tokenUsage: { total: 2000, prompt: 1500, completion: 500 },
      cost: 0.02,
    };
  }
}
