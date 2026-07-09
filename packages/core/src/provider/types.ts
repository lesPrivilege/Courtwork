export interface GenerationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface GenerationRequest {
  systemPrompt?: string;
  messages: GenerationMessage[];
}

export interface GenerationResponse {
  content: string;
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
