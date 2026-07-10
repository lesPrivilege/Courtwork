export type ResponseFormatTier = 'json_schema_strict' | 'json_schema' | 'json_object' | 'unsupported';

export interface ProviderQuirkProfile {
  /** provider 的展示/日志用标识（不是 wire 层字段，wire 层的 model 走 modelId 单独配置）。 */
  readonly providerId: string;
  /**
   * Chat Completions 端点的完整 base URL，含各家自己的路径前缀。客户端只做
   * `${baseUrl}/chat/completions` 拼接，不额外假设 /v1 前缀——docs/18 quirk①：
   * GLM 是 /api/paas/v4/、豆包是 /api/v3，"假设都是 /v1" 会直接拼错路径导致 404。
   */
  readonly baseUrl: string;
  /** 本 provider 对 response_format 的已知支持档位（docs/18 §6.3②）：静态声明，不是
   * 运行时探测——docs/18 本身就是逐家核对官方文档得出的结论，可信度高于臆测式探测。 */
  readonly responseFormat: { tier: ResponseFormatTier };
  /** 响应体 delta 里 reasoning 内容字段名候选，按数组顺序检查，命中第一个即归一化进
   * GenerationResponse.reasoningContent（docs/18 quirk③）。只收录有文档依据的字段名，
   * 未证实的字段名（如 Qwen 是否真的用 reasoning_content 尚待实测）不编造额外候选。 */
  readonly reasoningFieldCandidates: readonly string[];
}

export const DEEPSEEK_QUIRK_PROFILE: ProviderQuirkProfile = {
  providerId: 'deepseek',
  baseUrl: 'https://api.deepseek.com/v1',
  responseFormat: { tier: 'json_object' },
  reasoningFieldCandidates: ['reasoning_content'],
};

export const QWEN_QUIRK_PROFILE: ProviderQuirkProfile = {
  providerId: 'qwen',
  // 百炼"兼容模式"端点；strict json_schema 目前仅北京地域开放（docs/18 §1.2），
  // 这个 base URL 就是北京地域端点。
  baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  responseFormat: { tier: 'json_schema_strict' },
  // docs/18 §1.2 只提到 enable_thinking（请求侧开关），未指名响应字段——这里沿用
  // DeepSeek 已证实的字段名作为推测默认值，未经文档证实，实测后可能需要修正。
  reasoningFieldCandidates: ['reasoning_content'],
};

export const DOUBAO_QUIRK_PROFILE: ProviderQuirkProfile = {
  providerId: 'doubao',
  baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
  responseFormat: { tier: 'json_schema' },
  // docs/18 §1.6 未提及推理内容字段名——这里沿用 DeepSeek 已证实的字段名作为推测
  // 默认值，未经文档证实，实测后可能需要修正。
  reasoningFieldCandidates: ['reasoning_content'],
};
