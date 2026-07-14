import type { InteractionTemplateRegistry } from '@courtwork/registry';
import {
  QuoteClaimSchema,
  ResolvedSourceAnchorSchema,
  type CitationFailure,
  type QuoteClaim,
  type ResolvedSourceAnchor,
} from '@courtwork/schemas';

import { resolveClaim, type MaterialTextLayer } from '../citation/resolver.js';
import type { TurnStore } from './turn-store.js';
import type { InteractionRequestedEvent } from './types.js';

export interface InteractionRequestInput {
  turnId: string;
  requestId: string;
  packageId: string;
  templateId: string;
  anchorRefs: QuoteClaim[];
}

export interface InteractionCoordinatorDeps {
  templateRegistry: InteractionTemplateRegistry;
  materials: readonly MaterialTextLayer[];
  store: TurnStore;
}

export class UnknownInteractionTemplateError extends Error {
  constructor(readonly packageId: string, readonly templateId: string) {
    super(`Unknown interaction template ${packageId}/${templateId}`);
    this.name = 'UnknownInteractionTemplateError';
  }
}

export class InvalidInteractionRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidInteractionRequestError';
  }
}

export class InteractionAnchorPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InteractionAnchorPolicyError';
  }
}

export class InteractionAnchorResolutionError extends Error {
  constructor(readonly failures: readonly CitationFailure[], message = 'Interaction anchors could not be resolved') {
    super(message);
    this.name = 'InteractionAnchorResolutionError';
  }
}

export function requestInteraction(
  input: InteractionRequestInput,
  deps: InteractionCoordinatorDeps,
): InteractionRequestedEvent {
  const rawInput: unknown = input;
  if (typeof rawInput !== 'object' || rawInput === null || Array.isArray(rawInput)) {
    throw new InvalidInteractionRequestError('Interaction request must be an object');
  }
  const inputKeys = Object.keys(rawInput).sort();
  const expectedKeys = ['anchorRefs', 'packageId', 'requestId', 'templateId', 'turnId'];
  if (inputKeys.length !== expectedKeys.length || inputKeys.some((key, index) => key !== expectedKeys[index])) {
    throw new InvalidInteractionRequestError('Interaction request contains unknown or missing fields');
  }
  if (
    typeof input.turnId !== 'string'
    || typeof input.requestId !== 'string'
    || typeof input.packageId !== 'string'
    || typeof input.templateId !== 'string'
    || input.turnId.trim().length === 0
    || input.requestId.trim().length === 0
    || input.packageId.trim().length === 0
    || input.templateId.trim().length === 0
  ) {
    throw new InvalidInteractionRequestError('Interaction request identifiers must be non-empty strings');
  }
  const template = deps.templateRegistry.get(input.packageId, input.templateId);
  if (!template) throw new UnknownInteractionTemplateError(input.packageId, input.templateId);
  if (!Array.isArray(input.anchorRefs)) {
    throw new InteractionAnchorResolutionError([], 'anchorRefs must be a QuoteClaim array');
  }
  if (template.anchorPolicy === 'none' && input.anchorRefs.length > 0) {
    throw new InteractionAnchorPolicyError('This interaction does not permit anchors');
  }
  if (template.anchorPolicy === 'required' && input.anchorRefs.length === 0) {
    throw new InteractionAnchorPolicyError('This interaction requires at least one anchor');
  }

  const anchors: ResolvedSourceAnchor[] = [];
  const failures: CitationFailure[] = [];
  for (const rawClaim of input.anchorRefs) {
    const parsed = QuoteClaimSchema.safeParse(rawClaim);
    if (!parsed.success) {
      throw new InteractionAnchorResolutionError([], 'anchorRefs contains an invalid strict QuoteClaim');
    }
    const resolution = resolveClaim(parsed.data, deps.materials);
    if (resolution.failure) failures.push(resolution.failure);
    if (resolution.anchor) anchors.push(ResolvedSourceAnchorSchema.parse(resolution.anchor));
  }
  if (failures.length > 0) throw new InteractionAnchorResolutionError(failures);

  return deps.store.appendInteractionRequested({
    type: 'interaction_requested',
    turnId: input.turnId,
    requestId: input.requestId,
    packageId: input.packageId,
    templateId: input.templateId,
    kind: template.kind,
    question: template.question,
    options: template.options.map((option) => ({
      id: option.id,
      label: option.label,
      ...(option.description === undefined ? {} : { description: option.description }),
    })),
    skippable: template.skippable,
    anchorPolicy: template.anchorPolicy,
    uiTemplateId: template.uiTemplateId,
    sourceAnchors: anchors,
  });
}
