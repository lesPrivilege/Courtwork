import type { Provider } from '@courtwork/provider/types';
import type { InteractionTemplateRegistry } from '@courtwork/registry';

import type { MaterialTextLayer } from '../citation/resolver.js';
import {
  requestInteraction,
  type InteractionRequestInput,
} from './interaction-coordinator.js';
import { createTurnRunner, type TurnRunnerPort } from './turn-runner.js';
import type { TurnStore } from './turn-store.js';
import type {
  InteractionRequestedEvent,
  InteractionResolvedEvent,
  ResolveInteractionInput,
  TurnReplay,
} from './types.js';

export interface InteractionRuntimePort {
  request(
    input: InteractionRequestInput,
    context: { materials: readonly MaterialTextLayer[] },
  ): InteractionRequestedEvent;
  resolve(input: ResolveInteractionInput): InteractionResolvedEvent;
  replay(turnId: string): TurnReplay;
}

export interface TurnHarnessRuntime {
  readonly turns: TurnRunnerPort;
  readonly interactions: InteractionRuntimePort;
}

export interface CreateTurnHarnessRuntimeOptions {
  readonly provider: Provider;
  readonly store: TurnStore;
  readonly templateRegistry: InteractionTemplateRegistry;
  readonly now?: () => string;
}

/**
 * 现有 Turn/interaction primitive 的窄装配面；只收口构造，不引入第二套 loop 或 journal。
 */
export function createTurnHarnessRuntime(
  options: CreateTurnHarnessRuntimeOptions,
): Readonly<TurnHarnessRuntime> {
  const { provider, store, templateRegistry, now } = options;
  const turns = Object.freeze(createTurnRunner(provider, store, now));
  const interactions = Object.freeze<InteractionRuntimePort>({
    request(input, context) {
      return requestInteraction(input, {
        templateRegistry,
        materials: context.materials,
        store,
      });
    },
    resolve(input) {
      return store.resolveInteraction(input);
    },
    replay(turnId) {
      return store.replayTurn(turnId);
    },
  });

  return Object.freeze({ turns, interactions });
}
