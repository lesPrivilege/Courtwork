import type {
  GenerationNotice,
  ProviderFailureKind,
  ProviderUsage,
} from '@courtwork/provider/types';
import type { ResolvedSourceAnchor } from '@courtwork/schemas';

/** 模型生成内容而非证据、系统事实或锚点权威；absent 分支禁止调用方伪造占位思考。 */
export type TurnReasoning =
  | { status: 'absent' }
  | { status: 'present'; content: string };

export interface TurnFailure {
  kind: ProviderFailureKind;
  message: string;
  retryable: boolean;
}

/** ADR-007：唯一公共身份只有 turnId/core seq/time；请求身份由各事件族自行声明。 */
interface TurnEventBase {
  turnId: string;
  seq: number;
  emittedAt: string;
}

type ProviderTurnEvent =
  | (TurnEventBase & {
      type: 'turn_started';
      providerRequestId: string;
      providerId: string;
      modelId: string;
    })
  | (TurnEventBase & { type: 'assistant_message_started'; providerRequestId: string })
  | (TurnEventBase & { type: 'assistant_message_delta'; providerRequestId: string; delta: string })
  | (TurnEventBase & { type: 'assistant_message_completed'; providerRequestId: string; content: string })
  | (TurnEventBase & { type: 'reasoning_started'; providerRequestId: string })
  | (TurnEventBase & { type: 'reasoning_delta'; providerRequestId: string; delta: string })
  | (TurnEventBase & { type: 'reasoning_completed'; providerRequestId: string; content: string })
  | (TurnEventBase & { type: 'provider_notice'; providerRequestId: string; notice: GenerationNotice })
  | (TurnEventBase & {
      type: 'turn_completed';
      providerRequestId: string;
      assistantMessage: string;
      reasoning: TurnReasoning;
      usage?: ProviderUsage;
      notices?: GenerationNotice[];
      finishReason: 'stop' | 'length' | 'content_filter' | 'unknown';
    })
  | (TurnEventBase & {
      type: 'turn_failed';
      providerRequestId: string;
      failure: TurnFailure;
      partialAssistantMessage?: string;
      reasoning: TurnReasoning;
      usage?: ProviderUsage;
      notices?: GenerationNotice[];
    });

export interface InteractionOptionSnapshot {
  id: string;
  label: string;
  description?: string;
}

export type InteractionAnswer =
  | { kind: 'option'; optionId: string }
  | { kind: 'skip' };

export interface InteractionActor {
  channelId: string;
  actorId: string;
  role?: string;
}

export type InteractionRequestedEvent = TurnEventBase & {
  type: 'interaction_requested';
  requestId: string;
  packageId: string;
  templateId: string;
  kind: 'single_choice' | 'confirmation';
  question: string;
  options: readonly InteractionOptionSnapshot[];
  skippable: boolean;
  anchorPolicy: 'none' | 'optional' | 'required';
  uiTemplateId: 'question-card';
  sourceAnchors: readonly ResolvedSourceAnchor[];
};

export type InteractionResolvedEvent = TurnEventBase & {
  type: 'interaction_resolved';
  requestId: string;
  actor: InteractionActor;
  answer: InteractionAnswer;
};

export type InteractionEvent = InteractionRequestedEvent | InteractionResolvedEvent;
export type TurnEvent = ProviderTurnEvent | InteractionEvent;

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, Extract<K, keyof T>> : never;

/** 通用发布输入仍保留各事件族自己的 providerRequestId/requestId。 */
export type TurnEventInput = DistributiveOmit<TurnEvent, 'seq' | 'emittedAt' | 'turnId'>;
export type ProviderTurnEventInput = DistributiveOmit<
  ProviderTurnEvent,
  'seq' | 'emittedAt' | 'turnId' | 'providerRequestId'
>;
export type InteractionRequestedEventInput = Omit<InteractionRequestedEvent, 'seq' | 'emittedAt'>;

export interface ResolveInteractionInput {
  requestId: string;
  actor: InteractionActor;
  answer: InteractionAnswer;
}

interface PersistedTurnBase {
  turnId: string;
  providerRequestId: string;
  providerId: string;
  modelId: string;
  reasoning: TurnReasoning;
  usage?: ProviderUsage;
  notices?: GenerationNotice[];
}

export type PersistedTurn =
  | (PersistedTurnBase & {
      status: 'completed';
      assistantMessage: string;
      finishReason: 'stop' | 'length' | 'content_filter' | 'unknown';
      completedAt: string;
    })
  | (PersistedTurnBase & {
      status: 'failed';
      assistantMessage?: string;
      failure: TurnFailure;
      failedAt: string;
    });

export type TurnReplayState =
  | 'idle'
  | 'pending_interaction'
  | 'resolved_waiting_resume'
  | 'completed'
  | 'failed';

export interface TurnReplay {
  turnId: string;
  state: TurnReplayState;
  events: readonly InteractionEvent[];
  pendingInteraction?: InteractionRequestedEvent;
  resolvedInteraction?: InteractionResolvedEvent;
  terminal?: PersistedTurn;
}

/** Browser-safe backend port：CAS append 让 store 层独占校验与原子 resolve 算法。 */
export type TurnJournalEntry = PersistedTurn | InteractionEvent;

export interface TurnJournalBackend {
  read(): readonly TurnJournalEntry[];
  /** backend 必须原子比较 expectedLength 并 append；不匹配时返回 false，调用方重读重验。 */
  append(entry: TurnJournalEntry, expectedLength: number): boolean;
}
