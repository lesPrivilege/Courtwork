import type { EvidenceGradeAnnotation, SessionEvent } from '@courtwork/core';

export type ScenarioFlow = 'S1' | 'S3';
export type ReviewDisposition = 'confirm' | 'reject' | 'revise';
export type ReviewDispositionState = 'confirmed' | 'rejected' | 'revision';

export interface ReviewGateItemProjection {
  itemRef: string;
  mode: 'batch' | 'individual';
  evidenceKeys: string[];
  reason?: 'high_risk' | 'unverified';
}

export interface ReviewGateProjection {
  requestId: string;
  items: ReviewGateItemProjection[];
}

export interface ReviewItemResolution {
  itemRef: string;
  disposition: ReviewDisposition;
}

export interface ReviewResolution {
  items: ReviewItemResolution[];
  instrumentation?: { dwellMs?: number; expandedEvidenceKeys?: string[] };
}

export type ReviewTelemetryEvent =
  | { type: 'review_item_opened'; sessionId: string; itemRef: string; emittedAt: string }
  | { type: 'review_evidence_expanded'; sessionId: string; itemRef: string; evidenceRef: string; emittedAt: string }
  | { type: 'review_disposition_submitted'; sessionId: string; itemRef: string; disposition: ReviewDisposition; emittedAt: string };

export interface ConfirmationClient {
  getGateProjection(requestId: string): Promise<ReviewGateProjection>;
  resolve(requestId: string, resolution: ReviewResolution): Promise<void>;
}

export interface ContinuationClient {
  continueSession(sessionId: string): Promise<void>;
}

export interface SessionEventClient {
  replay(flow: ScenarioFlow, publish: (event: SessionEvent) => void, options?: { paced?: boolean }): Promise<void>;
  confirmation: ConfirmationClient;
  continuation: ContinuationClient;
  emitReviewTelemetry(event: ReviewTelemetryEvent): void;
}

export interface SessionProjection {
  artifacts: Partial<Record<string, unknown>>;
  evidenceGrades: EvidenceGradeAnnotation[];
  progress: string[];
  todo: Array<{ artifactType: string; status: string }>;
  confirmation?: Extract<SessionEvent, { type: 'confirmation_requested' }>;
  failures: Extract<SessionEvent, { type: 'step_failed' }>[];
  completed: boolean;
  lastSeq: number;
}

export const EMPTY_SESSION: SessionProjection = {
  artifacts: {},
  evidenceGrades: [],
  progress: [],
  todo: [],
  failures: [],
  completed: false,
  lastSeq: 0,
};

/**
 * 事件投影只做协议字段到界面状态的机械映射，不解释风险、信源或门禁语义。
 */
export function projectSession(state: SessionProjection, event: SessionEvent): SessionProjection {
  const base = { ...state, lastSeq: event.seq };
  switch (event.type) {
    case 'progress':
      return { ...base, progress: [...state.progress, event.message] };
    case 'artifact_produced':
      return {
        ...base,
        artifacts: { ...state.artifacts, [event.artifactType]: event.artifact },
        evidenceGrades: event.evidenceGrades,
      };
    case 'todo_snapshot':
      return { ...base, todo: event.steps };
    case 'confirmation_requested':
      return { ...base, confirmation: event };
    case 'confirmation_resolved':
      return { ...base, confirmation: undefined };
    case 'step_failed':
      return { ...base, failures: [...state.failures, event] };
    case 'scenario_completed':
      return { ...base, completed: true, confirmation: undefined };
    default:
      return base;
  }
}
