import type {
  CitationStats,
  EvidenceGradeAnnotation,
  GenerationNotice,
  RevisionInput,
  SessionEvent,
} from '@courtwork/core';

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

export interface WorkSessionRef {
  caseId: string;
  sessionId: string;
}

export interface WorkModelRoute {
  providerId: string;
  modelId: string;
  reasoning: 'standard' | 'deep';
}

export interface StartWorkCommand {
  commandId: string;
  caseId: string;
  scenarioId: string;
  materialRefs: string[];
  modelRoute: WorkModelRoute;
}

export interface ResumeWorkCommand extends WorkSessionRef {
  commandId: string;
  requestId: string;
  decision: 'confirm' | 'reject';
  revisions?: RevisionInput[];
}

export interface CancelWorkCommand extends WorkSessionRef {
  commandId: string;
}

export type WorkProjectionPhase =
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'canceled'
  | 'interrupted';

export type WorkCommandOutcome =
  | { status: 'completed'; ref: WorkSessionRef }
  | { status: 'paused'; ref: WorkSessionRef; requestId: string }
  | {
      status: 'failed';
      ref: WorkSessionRef;
      reason: 'provider' | 'invalid_output' | 'runtime_limit' | 'configuration' | 'internal';
      message: string;
      retryable: boolean;
    }
  | { status: 'canceled'; ref: WorkSessionRef };

export interface WorkProjectionPort {
  replay(query: WorkSessionRef & { afterSeq?: number }): Promise<{
    ref: WorkSessionRef;
    phase: WorkProjectionPhase;
    events: SessionEvent[];
  }>;
}

/**
 * Production command boundary. WORK-PORT-1 deliberately declares this port without
 * constructing or wiring an implementation into React.
 */
export interface WorkCommandPort {
  start(
    command: StartWorkCommand,
    publish: (event: SessionEvent) => void,
  ): { sessionId: string; done: Promise<WorkCommandOutcome> };
  resume(
    command: ResumeWorkCommand,
    publish: (event: SessionEvent) => void,
  ): Promise<WorkCommandOutcome>;
  cancel(command: CancelWorkCommand): Promise<
    | { accepted: true }
    | { accepted: false; reason: 'not_running' | 'already_requested' }
  >;
}

export interface SessionProjection {
  artifacts: Partial<Record<string, unknown>>;
  evidenceGrades: EvidenceGradeAnnotation[];
  providerNotices: GenerationNotice[];
  /** 引用闭环公证观测（LEGAL-DEMO-RUN ③：观测字段随 artifact_produced 机械透传，不解读）。 */
  citationStats?: CitationStats;
  progress: string[];
  todo: Array<{ stepId: string; artifactType?: string; status: string }>;
  confirmation?: Extract<SessionEvent, { type: 'confirmation_requested' }>;
  failures: Extract<SessionEvent, { type: 'step_failed' }>[];
  completed: boolean;
  lastSeq: number;
}

export const EMPTY_SESSION: SessionProjection = {
  artifacts: {},
  evidenceGrades: [],
  providerNotices: [],
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
        providerNotices: event.providerNotices ?? state.providerNotices,
        // 续行重发的 artifact_produced 不携观测字段（executor 语义）——保留最近一次公证观测。
        citationStats: event.citationStats ?? state.citationStats,
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
