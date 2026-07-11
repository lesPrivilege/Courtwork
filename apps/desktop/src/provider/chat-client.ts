/**
 * chat 面真 API 客户端（GOAL-1 链路批）。
 * 组装与解析全部复用 @courtwork/core（quirk 声明/SSE 缓冲解析/结构化降级链）；
 * 传输经 Rust 窄面代理 provider_chat_request——key 唯一注入点在 Rust 钥匙串侧，
 * JS 永不见明文（PRV-1 审计口径）。Authorization 头在桥内丢弃（core 侧为通过
 * 非空校验填占位符），真值由 Rust bearer_auth 注入。
 */

// 注意：禁止从 '@courtwork/core' 全家桶入口导入——index 含 Node-only 模块（events/event-log
// 顶层 node:fs），浏览器端即崩；此处只走浏览器安全的子路径导出（与 provider-quirks 同型）。
import { invoke } from '@tauri-apps/api/core';
import { createOpenAICompatibleProvider } from '@courtwork/core/provider-openai';
import { OPENAI_COMPATIBLE_REASONING_ROUTE, type ProviderQuirkProfile } from '@courtwork/core/provider-quirks';
import type { GenerationMessage, GenerationResponse } from '@courtwork/core/provider-types';
import { effectiveBaseUrl, PROVIDER_OPTIONS, type ModelConfig } from './model-config';

/** core 非空校验用占位；无敏感性——桥不向 Rust 传任何 header。 */
const KEYCHAIN_PLACEHOLDER = '__keychain__';

type ChatForwardOutput = { status: number; body: string };

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * 把 core 的 fetch 面收窄成 Rust 转发调用：
 * - 仅放行 POST …/chat/completions（与 Rust 侧 chat_forward_url_allowed 双侧同宽）；
 * - init.headers 整体丢弃（内含占位 Authorization）；
 * - invoke 不可中途取消——core 的 120s race 先行超时并丢弃结果，语义与分型出口不变。
 */
export function createKeychainChatFetch(): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    if (!url.endsWith('/chat/completions') || (init?.method ?? 'GET') !== 'POST') {
      throw new TypeError('keychain chat fetch 仅服务对话补全请求');
    }
    const result = await invoke<ChatForwardOutput>('provider_chat_request', {
      input: { url, body: typeof init?.body === 'string' ? init.body : '' },
    });
    return new Response(result.body, {
      status: result.status,
      headers: { 'content-type': 'text/event-stream' },
    });
  }) as typeof fetch;
}

/** custom 档没有预设 profile：按 OpenAI 兼容语义构造临时声明（baseUrl 来自用户配置）。 */
function profileFor(config: ModelConfig): ProviderQuirkProfile {
  const option = PROVIDER_OPTIONS.find((item) => item.id === config.providerId);
  if (option?.profile) return option.profile;
  return {
    providerId: 'custom',
    baseUrl: effectiveBaseUrl(config),
    responseFormat: { tier: 'json_object' },
    reasoningFieldCandidates: ['reasoning_content'],
    recommendedModels: [],
    reasoningRoute: OPENAI_COMPATIBLE_REASONING_ROUTE,
  };
}

export interface ChatTurnResult {
  content: string;
  reasoningContent?: string;
  usage?: { inputTokens: number; outputTokens: number };
}

/** e2e/浏览器态测试钩：注入脚本化响应，避免真网络。 */
type ChatOverride = (messages: GenerationMessage[]) => Promise<ChatTurnResult>;
let browserOverride: ChatOverride | null = null;

export function installChatTestHooks() {
  const hooks = {
    setResponder(responder: ChatOverride | null) {
      browserOverride = responder;
    },
  };
  (window as typeof window & { __courtworkChatHooks?: typeof hooks }).__courtworkChatHooks = hooks;
  return hooks;
}

/**
 * 发送一轮对话。fetchImpl 可注入供单测；生产走 keychain 桥。
 * 浏览器态（无 Tauri、无 override）诚实报"仅桌面可用"，不做假流。
 */
export async function sendChatTurn(
  config: ModelConfig,
  messages: GenerationMessage[],
  options?: { fetchImpl?: typeof fetch },
): Promise<ChatTurnResult> {
  if (browserOverride && !options?.fetchImpl) return browserOverride(messages);
  if (!isTauriRuntime() && !options?.fetchImpl) {
    throw new Error('对话请求仅在桌面应用内可用');
  }
  const provider = createOpenAICompatibleProvider(profileFor(config), {
    auth: { kind: 'api_key', apiKey: KEYCHAIN_PLACEHOLDER },
    billing: { kind: 'metered' },
    modelId: config.modelId,
    reasoningLevel: config.reasoning,
    fetchImpl: options?.fetchImpl ?? createKeychainChatFetch(),
  });
  const response: GenerationResponse = await provider.generate({ messages });
  return {
    content: response.content,
    reasoningContent: response.reasoningContent,
    usage: response.usage,
  };
}
