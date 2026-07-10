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

function isAbortError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'name' in error && (error as { name: unknown }).name === 'AbortError';
}

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

async function attemptOnce(
  profile: ProviderQuirkProfile,
  body: ChatCompletionRequestBody,
  config: HttpClientConfig,
): Promise<ChatCompletionResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    let response: Response;
    try {
      response = await config.fetchImpl(`${profile.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      if (isAbortError(error)) throw new ProviderTimeoutError(profile.providerId, config.timeoutMs);
      throw error;
    }

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
  } finally {
    clearTimeout(timer);
  }
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
