import { Channel, invoke } from '@tauri-apps/api/core';
import { createOpenAICompatibleProvider } from '@courtwork/provider/openai';
import { getProviderDescriptor } from '@courtwork/provider/registry';
import type {
  GenerationMessage,
  GenerationResponse,
  ProviderTransport,
  ProviderTransportEvent,
  ProviderTransportRequest,
} from '@courtwork/provider/types';
import type { ModelConfig } from './model-config';
import { assembleChatSystemPrompt } from './chat-assembly';

const KEYCHAIN_PLACEHOLDER = '__keychain__';

function isTauriRuntime() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

class AsyncEventQueue implements AsyncIterable<ProviderTransportEvent> {
  private values: ProviderTransportEvent[] = [];
  private waiters: Array<(result: IteratorResult<ProviderTransportEvent>) => void> = [];
  private closed = false;

  push(value: ProviderTransportEvent) {
    const waiter = this.waiters.shift();
    if (waiter) waiter({ value, done: false });
    else this.values.push(value);
    if (value.type === 'end' || value.type === 'failed') this.close();
  }

  close() {
    this.closed = true;
    for (const waiter of this.waiters.splice(0)) waiter({ value: undefined, done: true });
  }

  [Symbol.asyncIterator](): AsyncIterator<ProviderTransportEvent> {
    return {
      next: () => {
        const value = this.values.shift();
        if (value) return Promise.resolve({ value, done: false });
        if (this.closed) return Promise.resolve({ value: undefined, done: true });
        return new Promise((resolve) => this.waiters.push(resolve));
      },
    };
  }
}

/** WebView 只提交 provider/model/body；endpoint、header 与 key 全由 Rust catalog/钥匙串决定。 */
export function createKeychainTransport(): ProviderTransport {
  return {
    stream(request: ProviderTransportRequest): AsyncIterable<ProviderTransportEvent> {
      const queue = new AsyncEventQueue();
      const channel = new Channel<ProviderTransportEvent>();
      channel.onmessage = (event) => queue.push(event);
      const abort = () => { void invoke('cancel_provider_request', { requestId: request.requestId }); };
      request.signal?.addEventListener('abort', abort, { once: true });
      void invoke('provider_chat_request', {
        input: buildChatInvokeInput(request),
        onEvent: channel,
      }).catch(() => queue.push({
        type: 'failed', requestId: request.requestId, kind: 'network',
        message: '暂时无法连接服务商', retryable: false,
      })).finally(() => request.signal?.removeEventListener('abort', abort));
      return queue;
    },
  };
}

export function buildChatInvokeInput(request: ProviderTransportRequest) {
  return {
    requestId: request.requestId,
    providerId: request.providerId,
    modelId: request.modelId,
    reasoningBody: request.reasoningBody,
    body: request.body,
  };
}

export interface ChatTurnResult {
  content: string;
  reasoningContent?: string;
  usage?: { inputTokens: number; outputTokens: number };
}

type ChatOverride = (messages: GenerationMessage[], systemPrompt?: string) => Promise<ChatTurnResult>;
let browserOverride: ChatOverride | null = null;

export function installChatTestHooks() {
  const hooks = { setResponder(responder: ChatOverride | null) { browserOverride = responder; } };
  (window as typeof window & { __courtworkChatHooks?: typeof hooks }).__courtworkChatHooks = hooks;
  return hooks;
}

export async function sendChatTurn(
  config: ModelConfig,
  messages: GenerationMessage[],
  options?: { fetchImpl?: typeof fetch; transport?: ProviderTransport },
): Promise<ChatTurnResult> {
  const systemPrompt = assembleChatSystemPrompt();
  if (browserOverride && !options?.fetchImpl && !options?.transport) return browserOverride(messages, systemPrompt);
  if (!isTauriRuntime() && !options?.fetchImpl && !options?.transport) throw new Error('对话请求仅在桌面应用内可用');
  const provider = createOpenAICompatibleProvider(getProviderDescriptor(config.providerId), {
    auth: { kind: 'api_key', apiKey: KEYCHAIN_PLACEHOLDER },
    billing: { kind: 'metered' },
    modelId: config.modelId,
    reasoningLevel: config.reasoning,
    ...(options?.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
    transport: options?.transport ?? (!options?.fetchImpl ? createKeychainTransport() : undefined),
  });
  const response: GenerationResponse = await provider.generate({ systemPrompt, messages });
  return { content: response.content, reasoningContent: response.reasoningContent, usage: response.usage };
}
