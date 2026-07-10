/**
 * 本机没有真实 provider 的 API key（ANTHROPIC_API_KEY/OPENAI_API_KEY 均未配置），
 * 这两个函数支撑 mock provider 模拟"强模型 vs 弱模型"的质量差异，用于在本机验证
 * 多 provider 对比报告的机制确实能跑通、确实能体现分数差异——不是在冒充真实评测结果。
 */

interface RiskListLike {
  risks?: unknown[];
  [key: string]: unknown;
}

export function degradeRiskList(expected: RiskListLike): RiskListLike {
  const risks = expected.risks;
  if (Array.isArray(risks) && risks.length > 1) {
    return { ...expected, risks: risks.slice(0, -1) };
  }
  return expected;
}

interface RevisionSetLike {
  instructions?: unknown[];
  [key: string]: unknown;
}

function hasAnnotation(ins: unknown): ins is { annotation: Record<string, unknown>; [key: string]: unknown } {
  return typeof ins === 'object' && ins !== null && 'annotation' in ins && ins.annotation !== undefined;
}

export function degradeRevisionSet(expected: RevisionSetLike): RevisionSetLike {
  const instructions = expected.instructions;
  if (!Array.isArray(instructions)) return expected;
  return {
    ...expected,
    instructions: instructions.map((ins) =>
      hasAnnotation(ins) ? { ...ins, annotation: { ...ins.annotation, citations: [] } } : ins,
    ),
  };
}
