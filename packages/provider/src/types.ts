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
   * strict json_schema 优先 → 降级 json_object + zod 校验重试（docs/architecture/system.md provider 兼容边界，
   * packages/provider/SPEC.md "Provider wire format 基线"）。ScriptedProvider 与手写假
   * provider 可以完全忽略此字段（不做任何校验）——这是新增可选字段，不是破坏性变更。
   */
  responseSchema?: z.ZodTypeAny;
}

export type ProviderFailureKind =
  | 'auth'
  | 'rate_limit'
  | 'endpoint'
  | 'model'
  | 'timeout'
  | 'network'
  | 'protocol'
  | 'invalid_response'
  | 'canceled';

export type ProviderTransportEvent =
  | { type: 'response_started'; requestId: string; status: number; contentType?: string }
  | { type: 'chunk'; requestId: string; bytes: number[] }
  | { type: 'end'; requestId: string }
  | { type: 'failed'; requestId: string; kind: ProviderFailureKind; message: string; retryable: boolean };

export type ProviderStreamEvent =
  | { type: 'started'; requestId: string; seq: number; providerId: string; modelId: string }
  | { type: 'notice'; requestId: string; seq: number; notice: GenerationNotice }
  | { type: 'reasoning_delta'; requestId: string; seq: number; delta: string }
  | { type: 'content_delta'; requestId: string; seq: number; delta: string }
  | { type: 'usage'; requestId: string; seq: number; inputTokens: number; outputTokens: number }
  | { type: 'completed'; requestId: string; seq: number; finishReason: 'stop' | 'length' | 'content_filter' | 'unknown' }
  | { type: 'failed'; requestId: string; seq: number; kind: ProviderFailureKind; message: string; retryable: boolean };

export interface ProviderStreamOptions {
  signal?: AbortSignal;
  /** 测试、跨 IPC 关联与取消用；生产缺省生成 UUID。 */
  requestId?: string;
}

export interface ProviderTransportRequest {
  requestId: string;
  providerId: string;
  modelId: string;
  body: string;
  reasoningBody: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface ProviderTransport {
  stream(request: ProviderTransportRequest): AsyncIterable<ProviderTransportEvent>;
}

export interface GenerationUsage {
  inputTokens: number;
  outputTokens: number;
}

/** provider quirk 触发的可呈现调整：禁止兼容性逻辑静默改变用户所选档位。 */
export interface GenerationNotice {
  code: 'reasoning_downgraded_for_structured_output';
  message: string;
  requested: 'deep';
  applied: 'standard';
}

export interface GenerationResponse {
  content: string;
  /** 归一化后的思考/推理内容（docs/architecture/system.md quirk③：reasoning_content 等字段名归一）。 */
  reasoningContent?: string;
  /** 真实 provider 才会填充；ScriptedProvider 与假 provider 缺省不填，RuntimeGuard.checkUsd
   * 在 usage 缺失时不做任何计价判断（诚实跳过，不是当作零成本）。 */
  usage?: GenerationUsage;
  /** wire 兼容性调整，供 UI chip/事件层轻提示；缺省代表未调整。 */
  notices?: GenerationNotice[];
}

/**
 * Provider 抽象：模型 id/参数在构造具体 provider 实例时固定（配置驱动），
 * generate() 本身不接受运行时可变的模型选择——防止调用方在业务代码里写死切换逻辑。
 * 不含工具调用能力：依据 docs/decisions/ADR-002-schema-workflow.md，场景是声明式固定编排，工具调用由执行器编排，
 * 不是模型自主选择——不需要 ReAct 式的模型自主选工具循环。
 */
export interface Provider {
  readonly id: string;
  readonly modelId: string;
  stream(request: GenerationRequest, options?: ProviderStreamOptions): AsyncIterable<ProviderStreamEvent>;
  generate(request: GenerationRequest): Promise<GenerationResponse>;
}

/**
 * 鉴权形态判别联合（架构拍板 2026-07-10，packages/core/SPEC.md "凭证与计费形态正交建模"）：
 * 当期只实现 api_key，oauth_subscription 分支现在落入类型是为了未来接入订阅制 provider
 * 时不需要对这个类型做破坏性变更。合规红线：订阅制只接官方明示允许第三方工具接入的
 * （开放 OpenAI 兼容端点型）；模拟官方客户端/借用会话 token 的灰色桥接永不做——这条红线
 * 在 OAuth 分支真正实现时（T-provider.2 工单）必须原样带过去，不因为"能跑"就绕过。
 * 放在 types.ts 而非某个具体 wire format 的适配器文件里：这是 provider 无关的凭证/计费
 * 形态概念，任何未来适配器（含非 OpenAI 兼容的具名例外，如 Anthropic 原生 Messages API）
 * 都可能需要复用同一套判别联合，不应该绑死在某一种 wire format 的实现文件命名下。
 */
export interface ApiKeyAuth {
  readonly kind: 'api_key';
  /** 凭证注入接口：调用方负责产出这个字符串（MVP 环境变量、桌面端钥匙串对接归 polish、
   * SaaS 后端代理场景由代理层持有），本模块不关心 key 的来源，只保证拿到手后不落日志/
   * 不进错误消息（docs/decisions/ADR-005-data-security.md 红线）。 */
  readonly apiKey: string;
}
/** 占位判别分支：OAuth 设备流 + refresh token 钥匙串存储是 T-provider.2 增量工单，
 * 待首个官方开放的 plan 类 provider 需求拉动，字段形状本身留待那时再定——现在不编造。 */
export interface OAuthSubscriptionAuth {
  readonly kind: 'oauth_subscription';
}
export type ProviderAuth = ApiKeyAuth | OAuthSubscriptionAuth;

/**
 * 计费形态判别联合，与 ProviderAuth 正交（同一拍板）：metered 下 RuntimeGuard.maxUsd
 * 生效；plan 下护栏应切换为额度/次数而非美元（UI 用量圆盘显示套餐余量，UI 侧归
 * polish）——本工单不实现 plan 分支的护栏逻辑，字段现在落入类型防止未来破坏性变更。
 */
export interface MeteredBilling {
  readonly kind: 'metered';
}
export interface PlanBilling {
  readonly kind: 'plan';
}
export type ProviderBilling = MeteredBilling | PlanBilling;
