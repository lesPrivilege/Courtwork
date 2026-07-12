export type ResponseFormatTier = 'json_schema_strict' | 'json_schema' | 'json_object' | 'unsupported';
export type ReasoningLevel = 'standard' | 'deep';
export type ReasoningRoute =
  | { readonly kind: 'model_switch'; readonly models: Readonly<Record<ReasoningLevel, string>> }
  | { readonly kind: 'request_field'; readonly field: string; readonly values: Readonly<Record<ReasoningLevel, unknown>> };

export const OPENAI_COMPATIBLE_REASONING_ROUTE: ReasoningRoute = {
  kind: 'request_field', field: 'reasoning_effort', values: { standard: 'low', deep: 'high' },
};

export interface ProviderQuirkProfile {
  /** provider 的展示/日志用标识（不是 wire 层字段，wire 层的 model 走 modelId 单独配置）。 */
  readonly providerId: string;
  /**
   * Chat Completions 端点的完整 base URL，含各家自己的路径前缀。客户端只做
   * `${baseUrl}/chat/completions` 拼接，不额外假设 /v1 前缀。非 DeepSeek provider
   * 由后续插件/上游适配器提供完整 base URL，不在 core 猜测路径。
   */
  readonly baseUrl: string;
  /** 本 provider 对 response_format 的已知支持档位（docs/18 §6.3②）：静态声明，不是
   * 运行时探测——docs/18 本身就是逐家核对官方文档得出的结论，可信度高于臆测式探测。 */
  readonly responseFormat: { tier: ResponseFormatTier };
  /** 响应体 delta 里 reasoning 内容字段名候选，按数组顺序检查，命中第一个即归一化进
   * GenerationResponse.reasoningContent（docs/18 quirk③）。只收录有文档依据的字段名，
   * 未证实的 provider 不在 core 编造额外候选。 */
  readonly reasoningFieldCandidates: readonly string[];
  /** 用户自配所需元数据与标准/深思 wire 映射。调用方只解释 kind，不按 providerId 分支。 */
  readonly recommendedModels: readonly string[];
  readonly reasoningRoute: ReasoningRoute;
  /** 已知参数互斥表：结构化输出要求优先，需要时显式降为 standard。 */
  readonly parameterCompatibility: {
    readonly structuredOutputWithDeepReasoning: 'supported' | 'downgrade_to_standard';
  };
}

export function applyReasoningRoute(
  profile: ProviderQuirkProfile,
  model: string,
  level: ReasoningLevel,
): { model: string; extraBody: Record<string, unknown> } {
  return resolveReasoningRoute(profile.reasoningRoute, model, level);
}

export function resolveReasoningRoute(
  route: ReasoningRoute,
  model: string,
  level: ReasoningLevel,
): { model: string; extraBody: Record<string, unknown> } {
  if (route.kind === 'model_switch') return { model: route.models[level], extraBody: {} };
  const value = route.values[level];
  // undefined 声明为"该档不发此字段"（缺省即 provider 默认），不产生 wire 键
  if (value === undefined) return { model, extraBody: {} };
  return { model, extraBody: { [route.field]: value } };
}

export const DEEPSEEK_QUIRK_PROFILE: ProviderQuirkProfile = {
  providerId: 'deepseek',
  baseUrl: 'https://api.deepseek.com/v1',
  responseFormat: { tier: 'json_object' },
  reasoningFieldCandidates: ['reasoning_content'],
  recommendedModels: ['deepseek-v4-flash', 'deepseek-v4-pro'],
  // #41（docs/55 拍板 + 修正）：V4 思考模式经 thinking 请求字段控制，与 flash/pro 档位解耦；
  // V4 缺省即 enabled——standard 档必须显式 disabled，否则 UI 档位被 provider 默认静默升级。
  // 模型名由用户所选直通，路由不再覆盖（#40 路由侧保证）。
  reasoningRoute: { kind: 'request_field', field: 'thinking', values: { standard: { type: 'disabled' }, deep: { type: 'enabled' } } },
  parameterCompatibility: { structuredOutputWithDeepReasoning: 'supported' },
};
