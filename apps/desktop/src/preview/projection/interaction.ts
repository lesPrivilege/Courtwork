import type { InteractionRequestedEvent, InteractionResolvedEvent } from '@courtwork/core/turn-protocol';
import {
  freezeViewModel,
  type DecisionView,
  type EvidenceView,
  type PartialView,
} from './view-model.js';

export interface InteractionPrimitiveProjection {
  readonly evidence?: EvidenceView;
  readonly decision: DecisionView;
  readonly partial?: PartialView;
}

export function projectInteractionPrimitives(input: Readonly<{
  request: InteractionRequestedEvent;
  resolution?: InteractionResolvedEvent;
  submitting: boolean;
  error?: string;
  sourceReady: boolean;
}>): InteractionPrimitiveProjection {
  if (input.request.sourceAnchors.some((anchor) => !anchor.quote)) {
    throw new Error('Interaction evidence requires complete quotes');
  }
  const resolvedActionId = input.resolution?.answer.kind === 'option'
    ? input.resolution.answer.optionId
    : input.resolution?.answer.kind === 'skip' ? 'skipped' : undefined;
  const state: DecisionView['state'] = input.resolution
    ? 'resolved'
    : input.submitting ? 'submitting' : input.error ? 'failed' : 'pending';
  const actions = [
    ...input.request.options.map((option) => ({ id: option.id, label: option.label, ...(option.description ? { description: option.description } : {}) })),
    ...(input.request.skippable ? [{ id: 'skipped', label: 'Skip' }] : []),
  ];
  const evidence: EvidenceView | undefined = input.request.sourceAnchors.length === 0 ? undefined : {
    statement: input.request.question,
    verification: 'verified',
    anchors: input.request.sourceAnchors.map((anchor, index) => ({
      id: `interaction-source-${index}`,
      fileLabel: anchor.fileId.split(/[\\/]/).at(-1) ?? anchor.fileId,
      ...(anchor.page === undefined ? {} : { page: anchor.page }),
      quote: anchor.quote!,
      availability: input.sourceReady ? 'source_ready' : 'quote_only',
    })),
  };
  return freezeViewModel({
    ...(evidence ? { evidence } : {}),
    decision: { requestId: input.request.requestId, state, actions, ...(resolvedActionId ? { resolvedActionId } : {}) },
    ...(input.error ? { partial: { completed: 0, total: 1, failures: [input.error], pending: 1 } } : {}),
  });
}
