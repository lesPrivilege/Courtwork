import { ProviderAuthError, ProviderHttpError, ProviderTimeoutError } from './errors.js';
import { normalizeProviderTransport } from './provider-stream.js';
import type { ProviderQuirkProfile } from './quirk-profile.js';
import type {
  ProviderFailureKind,
  ProviderStreamEvent,
  ProviderTransport,
  ProviderTransportEvent,
} from './types.js';

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
  fetchImpl: typeof fetch;
  delay: (ms: number) => Promise<void>;
  /** Desktop 注入 Rust Channel transport；缺省为仅供 Node/测试使用的 fetch transport。 */
  transport?: ProviderTransport;
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
let requestSequence = 0;

function nextRequestId(): string {
  requestSequence += 1;
  return `provider-${Date.now()}-${requestSequence}`;
}

function safeFailure(kind: ProviderFailureKind, message: string, retryable: boolean, requestId: string): ProviderTransportEvent {
  return { type: 'failed', requestId, kind, message, retryable };
}

/** Browser/Node 直连实现只用于测试和 CLI；桌面生产路径注入 Rust Channel transport。 */
export function createFetchTransport(profile: ProviderQuirkProfile, config: HttpClientConfig): ProviderTransport {
  return {
    async *stream(request): AsyncIterable<ProviderTransportEvent> {
      const controller = new AbortController();
      const abort = () => controller.abort();
      request.signal?.addEventListener('abort', abort, { once: true });
      let timer: ReturnType<typeof setTimeout> | undefined;
      let timedOut = false;
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          timedOut = true;
          controller.abort();
          reject(new Error('provider_timeout'));
        }, config.timeoutMs);
      });

      try {
        const response = await Promise.race([config.fetchImpl(`${profile.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${config.apiKey}`,
          },
          body: request.body,
          signal: controller.signal,
        }), timeout]);
        yield {
          type: 'response_started',
          requestId: request.requestId,
          status: response.status,
          contentType: response.headers.get('content-type')?.includes('text/event-stream')
            ? response.headers.get('content-type') ?? undefined
            : undefined,
        };
        if (!response.ok) return;
        if (!response.body) {
          yield safeFailure('invalid_response', '服务商返回了空响应体', false, request.requestId);
          return;
        }
        const reader = response.body.getReader();
        while (true) {
          const item = await Promise.race([reader.read(), timeout]);
          if (item.done) break;
          if (item.value.byteLength > 0) {
            yield { type: 'chunk', requestId: request.requestId, bytes: Array.from(item.value) };
          }
        }
        yield { type: 'end', requestId: request.requestId };
      } catch (error) {
        if (request.signal?.aborted) {
          yield safeFailure('canceled', '请求已取消', false, request.requestId);
        } else if (timedOut) {
          yield safeFailure('timeout', `服务商在 ${config.timeoutMs}ms 内未返回完整响应`, false, request.requestId);
        } else {
          const message = error instanceof Error
            ? error.message.replaceAll(config.apiKey, '[redacted]')
            : '服务商网络请求失败';
          yield safeFailure('network', message, false, request.requestId);
        }
      } finally {
        clearTimeout(timer);
        request.signal?.removeEventListener('abort', abort);
      }
    },
  };
}

export function streamChatCompletion(
  profile: ProviderQuirkProfile,
  body: ChatCompletionRequestBody,
  config: HttpClientConfig,
  options: { requestId?: string; signal?: AbortSignal } = {},
): AsyncIterable<ProviderStreamEvent> {
  const requestId = options.requestId ?? nextRequestId();
  const transport = config.transport ?? createFetchTransport(profile, config);
  return normalizeProviderTransport(
    transport.stream({
      requestId,
      providerId: profile.providerId,
      modelId: body.model,
      body: JSON.stringify(body),
      reasoningBody: {},
      signal: options.signal,
    }),
    {
      requestId,
      providerId: profile.providerId,
      modelId: body.model,
      reasoningFieldCandidates: profile.reasoningFieldCandidates,
      signal: options.signal,
    },
  );
}

function errorFromFailure(profile: ProviderQuirkProfile, event: Extract<ProviderStreamEvent, { type: 'failed' }>, timeoutMs: number): Error {
  if (event.kind === 'auth') return new ProviderAuthError(profile.providerId, 401);
  if (event.kind === 'timeout') return new ProviderTimeoutError(profile.providerId, timeoutMs);
  if (event.kind === 'rate_limit') return new ProviderHttpError(profile.providerId, 429, event.message);
  if (event.kind === 'endpoint') {
    const match = /HTTP (\d+)/.exec(event.message);
    return new ProviderHttpError(profile.providerId, match ? Number(match[1]) : 500, event.message);
  }
  if (event.kind === 'model' || event.kind === 'invalid_response') {
    const match = /HTTP (\d+)/.exec(event.message);
    if (match) return new ProviderHttpError(profile.providerId, Number(match[1]), event.message);
  }
  return new Error(event.message);
}

/** generate/结构化校验用聚合器；数据源与公开 stream() 完全相同。 */
export async function sendChatCompletion(
  profile: ProviderQuirkProfile,
  body: ChatCompletionRequestBody,
  config: HttpClientConfig,
): Promise<ChatCompletionResult> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= config.maxTransportRetries; attempt += 1) {
    if (attempt > 0) await config.delay(Math.min(500 * 2 ** (attempt - 1), 8_000));
    let content = '';
    let reasoningContent = '';
    let usage: ChatCompletionResult['usage'];
    let failure: Extract<ProviderStreamEvent, { type: 'failed' }> | undefined;
    for await (const event of streamChatCompletion(profile, body, config)) {
      if (event.type === 'content_delta') content += event.delta;
      else if (event.type === 'reasoning_delta') reasoningContent += event.delta;
      else if (event.type === 'usage') usage = { inputTokens: event.inputTokens, outputTokens: event.outputTokens };
      else if (event.type === 'failed') failure = event;
    }
    if (!failure) return { content, reasoningContent: reasoningContent || undefined, usage };
    const error = errorFromFailure(profile, failure, config.timeoutMs);
    lastError = error;
    if (error instanceof ProviderAuthError) throw error;
    if (error instanceof ProviderHttpError && RETRYABLE_STATUS.has(error.status)) continue;
    throw error;
  }
  throw lastError;
}
