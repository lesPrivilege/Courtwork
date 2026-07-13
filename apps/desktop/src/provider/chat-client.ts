import { Channel, invoke } from '@tauri-apps/api/core';
import { runTurn, type PersistedTurn, type TurnEvent } from '@courtwork/core/turn-protocol';
import { createOpenAICompatibleProvider } from '@courtwork/provider/openai';
import { getProviderDescriptor } from '@courtwork/provider/registry';
import type {
  GenerationMessage,
  GenerationRequest,
  Provider,
  ProviderStreamEvent,
  ProviderTransport,
  ProviderTransportEvent,
  ProviderTransportRequest,
} from '@courtwork/provider/types';
import type { ModelConfig } from './model-config';
import { assembleChatSystemPrompt } from './chat-assembly';
import {
  createEmptyTurnProjection,
  projectTurn,
  type TurnProjection,
  type TurnProtocolClient,
} from './turn-protocol-client';

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

/** WebView only submits provider/model/body; Rust owns endpoint, headers and keychain material. */
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

export interface ChatProviderFactoryContext {
  config: ModelConfig;
  fetchImpl?: typeof fetch;
  transport?: ProviderTransport;
}

export type ChatProviderFactory = (context: ChatProviderFactoryContext) => Provider;

export interface ChatStreamTestContext {
  request: GenerationRequest;
  requestId: string;
  providerId: string;
  modelId: string;
  signal?: AbortSignal;
}

export type ChatStreamTestFactory = (context: ChatStreamTestContext) => AsyncIterable<ProviderStreamEvent>;

let browserStreamFactory: ChatStreamTestFactory | null = null;

/** Installed only by main.tsx in explicit DEV+E2E mode. It injects provider events, never a final answer. */
export function installChatTestHooks() {
  const hooks = {
    setStreamFactory(factory: ChatStreamTestFactory | null) {
      browserStreamFactory = factory;
    },
  };
  (window as typeof window & { __courtworkChatHooks?: typeof hooks }).__courtworkChatHooks = hooks;
  return hooks;
}

function configuredProvider({ config, fetchImpl, transport }: ChatProviderFactoryContext): Provider {
  if (browserStreamFactory && !fetchImpl && !transport) {
    const streamFactory = browserStreamFactory;
    return {
      id: config.providerId,
      modelId: config.modelId,
      stream(request, options) {
        return streamFactory({
          request,
          requestId: options?.requestId ?? crypto.randomUUID(),
          providerId: config.providerId,
          modelId: config.modelId,
          ...(options?.signal ? { signal: options.signal } : {}),
        });
      },
      async generate() {
        throw new Error('E2E stream providers must run through core runTurn');
      },
    };
  }
  if (!isTauriRuntime() && !fetchImpl && !transport) throw new Error('对话请求仅在桌面应用内可用');
  return createOpenAICompatibleProvider(getProviderDescriptor(config.providerId), {
    auth: { kind: 'api_key', apiKey: KEYCHAIN_PLACEHOLDER },
    billing: { kind: 'metered' },
    modelId: config.modelId,
    reasoningLevel: config.reasoning,
    ...(fetchImpl ? { fetchImpl } : {}),
    transport: transport ?? (!fetchImpl ? createKeychainTransport() : undefined),
  });
}

export interface SendChatTurnOptions {
  fetchImpl?: typeof fetch;
  transport?: ProviderTransport;
  providerFactory?: ChatProviderFactory;
  signal?: AbortSignal;
  onEvent?: (event: TurnEvent) => void;
  onProjection?: (projection: TurnProjection, event: TurnEvent) => void;
  identityFactory?: () => { turnId: string; providerRequestId: string };
}

export interface ChatTurnRun {
  turnId: string;
  providerRequestId: string;
  terminal: PersistedTurn;
  projection: TurnProjection;
}

function nextIdentity(): { turnId: string; providerRequestId: string } {
  return {
    turnId: `chat-${crypto.randomUUID()}`,
    providerRequestId: `provider-${crypto.randomUUID()}`,
  };
}

/** Every visible delta and terminal state is projected from core TurnEvent. */
export async function sendChatTurn(
  client: TurnProtocolClient,
  config: ModelConfig,
  messages: GenerationMessage[],
  options: SendChatTurnOptions = {},
): Promise<ChatTurnRun> {
  const identity = (options.identityFactory ?? nextIdentity)();
  const provider = (options.providerFactory ?? configuredProvider)({
    config,
    ...(options.fetchImpl ? { fetchImpl: options.fetchImpl } : {}),
    ...(options.transport ? { transport: options.transport } : {}),
  });
  let projection = createEmptyTurnProjection(identity.turnId);
  const terminal = await runTurn({
    turnId: identity.turnId,
    providerRequestId: identity.providerRequestId,
    provider,
    request: { systemPrompt: assembleChatSystemPrompt(), messages },
    store: client.store,
    ...(options.signal ? { signal: options.signal } : {}),
    onEvent(event) {
      projection = projectTurn(projection, event);
      options.onEvent?.(event);
      options.onProjection?.(projection, event);
    },
  });
  return { ...identity, terminal, projection };
}
