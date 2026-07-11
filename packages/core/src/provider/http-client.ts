import { ProviderAuthError, ProviderHttpError, ProviderTimeoutError } from './errors.js';
import { parseSseEvents } from './sse.js';
import type { ProviderQuirkProfile } from './quirk-profile.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export type ResponseFormat =
  | { type: 'json_object' }
  | { type: 'json_schema'; json_schema: { name: string; strict?: boolean; schema: unknown } };

export interface ChatCompletionRequestBody {
  model: string;
  messages: ChatMessage[];
  stream: true;
  stream_options: { include_usage: true };
  response_format?: ResponseFormat;
  [key: string]: unknown;
}

export interface ChatCompletionResult {
  content: string;
  reasoningContent?: string;
  usage?: { inputTokens: number; outputTokens: number };
}

export interface HttpClientConfig {
  apiKey: string;
  timeoutMs: number;
  maxTransportRetries: number;
  /** 测试用可注入 fetch 实现；生产由调用方传入全局 fetch。 */
  fetchImpl: typeof fetch;
  /** 测试用可注入退避延迟（零延迟假实现），避免真实等待。 */
  delay: (ms: number) => Promise<void>;
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

/** transport 级重试：网络错误/超时/429/5xx 重试，401/403 与其余 4xx 立即失败不重试。 */
export async function sendChatCompletion(
  profile: ProviderQuirkProfile,
  body: ChatCompletionRequestBody,
  config: HttpClientConfig,
): Promise<ChatCompletionResult> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= config.maxTransportRetries; attempt += 1) {
    if (attempt > 0) {
      const backoffMs = Math.min(500 * 2 ** (attempt - 1), 8_000);
      await config.delay(backoffMs);
    }
    try {
      return await attemptOnce(profile, body, config);
    } catch (error) {
      lastError = error;
      if (error instanceof ProviderAuthError) throw error;
      if (error instanceof ProviderHttpError && !RETRYABLE_STATUS.has(error.status)) throw error;
      // 超时 / 可重试状态码 / 通用网络错误：继续下一轮循环重试
    }
  }
  throw lastError;
}

/**
 * 用 Promise.race 对抗一个"到点即 reject(ProviderTimeoutError)"的计时器 promise，
 * 而不是在某个具体 await 点用 try/catch 转换 AbortError——后者只能覆盖它包住的那一个
 * await，fetch() 拿到响应头就 resolve、真正的流式读取发生在后续 response.text()，
 * 单点 try/catch 会漏掉"连接建立后、读流阶段才超时"这个最常见的真实场景。
 * 整条链路（fetchImpl + 两处 response.text()）都在 race 的左侧 promise 里，
 * 不管计时器在哪个 await 点触发，右侧 promise 先 settle 就直接拿到正确的错误类型。
 * 这是 packages/tools/src/contract.ts 的 runOnce 已经验证过的同一模式。
 */
async function attemptOnce(
  profile: ProviderQuirkProfile,
  body: ChatCompletionRequestBody,
  config: HttpClientConfig,
): Promise<ChatCompletionResult> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new ProviderTimeoutError(profile.providerId, config.timeoutMs));
    }, config.timeoutMs);
  });

  try {
    return await Promise.race([fetchAndAccumulate(profile, body, config, controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

async function fetchAndAccumulate(
  profile: ProviderQuirkProfile,
  body: ChatCompletionRequestBody,
  config: HttpClientConfig,
  signal: AbortSignal,
): Promise<ChatCompletionResult> {
  const response = await config.fetchImpl(`${profile.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
    signal,
  });

  if (response.status === 401 || response.status === 403) {
    throw new ProviderAuthError(profile.providerId, response.status);
  }
  if (!response.ok) {
    const text = await response.text();
    throw new ProviderHttpError(profile.providerId, response.status, text);
  }

  // 用 .text() 读完整个 SSE body 后一次性解析：应用层不需要增量消费（见 sse.ts 顶部说明），
  // 网络层依然是逐块到达，代理判定连接空闲的窗口不受影响。
  const text = await response.text();
  return accumulateSseEvents(parseSseEvents(text), profile);
}

function accumulateSseEvents(events: unknown[], profile: ProviderQuirkProfile): ChatCompletionResult {
  let content = '';
  let reasoningContent = '';
  let usage: { inputTokens: number; outputTokens: number } | undefined;

  for (const event of events) {
    const chunk = event as {
      choices?: Array<{ delta?: Record<string, unknown> }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const delta = chunk.choices?.[0]?.delta;
    if (delta) {
      if (typeof delta.content === 'string') content += delta.content;
      for (const field of profile.reasoningFieldCandidates) {
        const value = delta[field];
        if (typeof value === 'string') {
          reasoningContent += value;
          break;
        }
      }
    }
    if (chunk.usage) {
      usage = {
        inputTokens: chunk.usage.prompt_tokens ?? 0,
        outputTokens: chunk.usage.completion_tokens ?? 0,
      };
    }
  }

  return { content, reasoningContent: reasoningContent.length > 0 ? reasoningContent : undefined, usage };
}
