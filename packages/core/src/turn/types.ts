import type {
  GenerationUsage,
  ProviderFailureKind,
} from '@courtwork/provider/types';

/** 模型生成内容而非证据、系统事实或锚点权威；absent 分支禁止调用方伪造占位思考。 */
export type TurnReasoning =
  | { status: 'absent' }
  | { status: 'present'; content: string };

export interface TurnFailure {
  kind: ProviderFailureKind;
  message: string;
  retryable: boolean;
}

interface TurnEventBase {
  requestId: string;
  turnId: string;
  seq: number;
  emittedAt: string;
}

export type TurnEvent =
  | (TurnEventBase & {
      type: 'turn_started';
      providerId: string;
      modelId: string;
    })
  | (TurnEventBase & { type: 'assistant_message_started' })
  | (TurnEventBase & { type: 'assistant_message_delta'; delta: string })
  | (TurnEventBase & { type: 'assistant_message_completed'; content: string })
  | (TurnEventBase & { type: 'reasoning_started' })
  | (TurnEventBase & { type: 'reasoning_delta'; delta: string })
  | (TurnEventBase & { type: 'reasoning_completed'; content: string })
  | (TurnEventBase & {
      type: 'turn_completed';
      assistantMessage: string;
      reasoning: TurnReasoning;
      usage?: GenerationUsage;
      finishReason: 'stop' | 'length' | 'content_filter' | 'unknown';
    })
  | (TurnEventBase & {
      type: 'turn_failed';
      failure: TurnFailure;
      partialAssistantMessage?: string;
      reasoning: TurnReasoning;
      usage?: GenerationUsage;
    });

type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never;

export type TurnEventInput = DistributiveOmit<TurnEvent, 'seq' | 'emittedAt' | 'requestId' | 'turnId'>;

interface PersistedTurnBase {
  turnId: string;
  requestId: string;
  providerId: string;
  modelId: string;
  reasoning: TurnReasoning;
  usage?: GenerationUsage;
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
