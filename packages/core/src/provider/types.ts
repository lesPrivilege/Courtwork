import type * as z from 'zod';

export interface GenerationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface GenerationRequest {
  systemPrompt?: string;
  messages: GenerationMessage[];
  /**
   * 若提供，provider 实现应尽力保证最终返回的 content 经 JSON.parse 后能通过该 schema 校验：
   * strict json_schema 优先 → 降级 json_object + zod 校验重试（docs/18 §6.2/§6.3，
   * packages/core/SPEC.md TODO "Provider wire format 基线"）。ScriptedProvider 与手写假
   * provider 可以完全忽略此字段（不做任何校验）——这是新增可选字段，不是破坏性变更。
   */
  responseSchema?: z.ZodTypeAny;
}

export interface GenerationUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface GenerationResponse {
  content: string;
  /** 归一化后的思考/推理内容（docs/18 quirk③：reasoning_content 等字段名归一）。 */
  reasoningContent?: string;
  /** 真实 provider 才会填充；ScriptedProvider 与假 provider 缺省不填，RuntimeGuard.checkUsd
   * 在 usage 缺失时不做任何计价判断（诚实跳过，不是当作零成本）。 */
  usage?: GenerationUsage;
}

/**
 * Provider 抽象：模型 id/参数在构造具体 provider 实例时固定（配置驱动），
 * generate() 本身不接受运行时可变的模型选择——防止调用方在业务代码里写死切换逻辑。
 * 不含工具调用能力：依据 docs/24，场景是声明式固定编排，工具调用由执行器编排，
 * 不是模型自主选择——不需要 ReAct 式的模型自主选工具循环。
 */
export interface Provider {
  readonly id: string;
  readonly modelId: string;
  generate(request: GenerationRequest): Promise<GenerationResponse>;
}
