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
  | { status: 'canceled'; ref: WorkSessionRef }
  // WORK-LIVE-1：命令级拒绝闭集（ADR-010 决定一逐字）。WORK-PORT-1 的 contract-only 声明遗漏了此变体；
  // 完成 WorkCommandPort 生产实现（本单明令「替换仅类型声明现状」）必须能返回 case_busy/command_conflict/
  // invalid_scope/not_configured 而非抛裸 Promise rejection（ADR-010 第 112 行）。纯增量并集成员，无既有消费方。
  //
  // WORK-LIVE-1-FIX 触发面登记（诚实优于凑数）：
  // - `not_configured`：production composition 未装配（无 provider transport/stub）→ start 返回，真实路径。
  // - `case_busy`：同 case 已有活跃 command 时再 start → 真实路径（port 级并发闸门）。
  // - `invalid_scope`：scope 非法（缺显式主体 / 材料 provider 前阻断 / 审阅项失真）→ 真实路径。
  // - `command_conflict`：同 commandId + 异 payload 的 first-wins 幂等冲突——port 契约级可达且单测覆盖，
  //   但**当前单写者单机架构下无生产触发面**（App 每次 run 铸新 commandId，不复用幂等键）；真实触发面
  //   属后续多写者/gateway 幂等阶段。不为其造假 UI 路径。
  | {
      status: 'rejected';
      reason: 'command_conflict' | 'case_busy' | 'invalid_scope' | 'not_configured';
      message: string;
    };

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
  /** 场景级终局失败（ADR-010 决定三）：与 completed 互斥的终态，镜像 core replaySession 的 scenarioFailure。 */
  scenarioFailure?: { reason: Extract<SessionEvent, { type: 'scenario_failed' }>['reason']; message: string };
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
    case 'scenario_failed':
      return { ...base, scenarioFailure: { reason: event.reason, message: event.message }, confirmation: undefined };
    default:
      return base;
  }
}
