import { runTurn, type PersistedTurn, type TurnEvent } from '@courtwork/core/turn-protocol';
import { createOpenAICompatibleProvider } from '@courtwork/provider/openai';
import { getProviderDescriptor } from '@courtwork/provider/registry';
import type {
  GenerationMessage,
  GenerationRequest,
  Provider,
  ProviderStreamEvent,
  ProviderTransport,
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
  if (!fetchImpl && !transport) throw new Error('对话请求仅在桌面应用内可用');
  return createOpenAICompatibleProvider(getProviderDescriptor(config.providerId), {
    auth: { kind: 'api_key', apiKey: KEYCHAIN_PLACEHOLDER },
    billing: { kind: 'metered' },
    modelId: config.modelId,
    reasoningLevel: config.reasoning,
    ...(fetchImpl ? { fetchImpl } : {}),
    ...(transport ? { transport } : {}),
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
  /**
   * CHAT-MEMORY-1（ADR-013 §2）：宿主蒸馏产出的低频记忆前缀段（memorySegmentFor）。
   * 由 core 组装缝置于基身份之后、messages 之前；缺省即退回纯基身份（前缀不漂移）。
   */
  memorySegment?: string;
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
    request: { systemPrompt: assembleChatSystemPrompt(options.memorySegment), messages },
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
