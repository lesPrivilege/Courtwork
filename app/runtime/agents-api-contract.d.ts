/** Agents API Runtime Adapter seam v1 — P03/DRT-03 first slice (2026-09-15).
 *
 * Types for the seam between the CourtWork Host and the OpenAI Agents API
 * (public beta, `OpenAI-Beta: agents=v1`). This is a protocol and binding
 * contract only: no SDK, no credentials, no network, and no Work Core import.
 *
 * Authority:
 * - The Host owns CW Session/Run identity, admission, command receipts and the
 *   final Run status write. Native session/turn/item/call ids are observations
 *   persisted next to CW identity, never instead of it.
 * - Work Core owns sources, candidates and Decisions. Nothing in this seam
 *   accepts, rejects or otherwise changes formal work state.
 *
 * Capability rule: a capability may only be shown or executed as available
 * after a live-service verification. Every documented-but-unverified entry is
 * `unavailable`; fixture-tested mappings prove the protocol, not the service.
 */

export type AgentsApiEnvironmentType = 'none' | 'openai_hosted' | 'self_hosted';

export type AgentsApiSettlementStatus = 'completed' | 'failed' | 'cancelled' | 'unknown';

/** Host-owned identity. This adapter never generates or replaces these ids. */
export interface RuntimeIdentity {
  sessionId: string;
  runId: string;
}

/** A Host-persisted binding: CW identity plus the observed native locator. */
export interface AgentsApiBinding {
  runtimeId: 'agents-api';
  internal: RuntimeIdentity;
  native: {
    sessionId: string;
    environmentId?: string;
    remoteUrl?: string;
  };
  protocol: {
    betaHeader: 'agents=v1';
    docsRevision: string;
  };
}

export interface PendingFunctionCall {
  turnId: string;
  callId: string;
  name: string;
  arguments: unknown;
}

export interface NativeRef {
  eventId: string | null;
  sessionId: string | null;
  turnId: string | null;
  itemId: string | null;
  subagentId: string | null;
}

/** Normalized observations. Kinds reuse the Host journal vocabulary where the
 * fact is the same (assistant text, notices, errors) and add explicit
 * runtime.* kinds for facts only the adapter can observe. */
export type AgentsApiObservation =
  | { kind: 'assistant.delta'; native: NativeRef;
      data: { text: string; itemId: string | null; outputIndex: number | null; contentIndex: number | null } }
  | { kind: 'assistant.message'; native: NativeRef;
      data: { text: string; itemId: string | null } }
  | { kind: 'runtime.function_call.pending'; native: NativeRef;
      data: { calls: PendingFunctionCall[]; environmentConnections: string[] } }
  | { kind: 'run.notice'; native: NativeRef;
      data: { notice: string; status?: string | null; turnId?: string | null;
              subagentId?: string | null; itemId?: string | null; itemType?: string | null } }
  | { kind: 'run.error'; native: NativeRef;
      data: { code: string | null; message: string } }
  | { kind: 'run.settlement'; native: NativeRef;
      data: { candidate: AgentsApiSettlementStatus; source: SettlementSource; reason: string;
              error?: { code: string | null; message: string } | null } }
  | { kind: 'coverage.gap'; native: NativeRef;
      data: { reason: string; missedIntermediateEvents: true } }
  | { kind: 'native.unknown'; native: NativeRef;
      data: { type: string; reason: 'unknown_event' | 'missing_event_id' } };

/** Where a settlement recommendation came from. The Host still decides and
 * writes the Run status; `host-condition` marks recommendations that depend on
 * Host state (cancel intent, unreconciled effects). */
export type SettlementSource = 'native-terminal' | 'native-session' | 'transport';

export interface SettlementConditions {
  /** The user asked to stop this Run. Intent is not confirmation. */
  cancelRequested: boolean;
  /** Host-known unreconciled side effects (dispatched tool without receipt). */
  effectsUnknown: boolean;
}

export interface SettlementDecision {
  status: AgentsApiSettlementStatus;
  source: SettlementSource;
  reason: string;
  turnId?: string | null;
  error?: { code: string | null; message: string } | null;
}

export interface AgentsApiCapability {
  id: string;
  environment: AgentsApiEnvironmentType;
  support: 'supported' | 'unsupported';
  /** `fixture` = the adapter mapping is covered by offline fixtures; `none` =
   * no local verification. Only `live` (not produced by this slice) may be
   * exposed as available. */
  verification: 'fixture' | 'none';
  documented: string[];
  note?: string;
}

/** Native wire subset this adapter consumes. Field names and unions follow the
 * official beta reference retrieved 2026-09-15; other fields are carried
 * opaquely and must not be inferred. */
export interface NativeTurn {
  id: string;
  status: 'queued' | 'in_progress' | 'waiting' | 'completed' | 'failed' | 'cancelled';
  subagent_id: string | null;
  error?: { code: string | null; message: string } | null;
}

export interface NativeRequiredAction {
  type: 'function_call' | 'environment_connection';
  turn_id?: string;
  call_id?: string;
  name?: string;
  arguments?: unknown;
  environment_id?: string;
}

export interface NativeItem {
  id: string | null;
  type: string;
  role?: 'user' | 'assistant';
  status?: 'in_progress' | 'completed' | 'incomplete' | 'failed';
  turn_id?: string;
  content?: Array<{ type: string; text?: string }>;
}

export interface NativeItemPage {
  data: NativeItem[];
  has_more: boolean;
  first_id?: string | null;
  last_id?: string | null;
}

export interface NativeSession {
  id: string;
  status?: 'idle' | 'in_progress' | 'requires_action' | 'failed';
  required_actions?: NativeRequiredAction[];
  error?: { code?: string | null; message?: string } | null;
  environment?: { id?: string; type?: string; status?: string; remote_url?: string } | null;
}

/** Injected native transport. The Host (or an SDK-backed implementation) owns
 * credentials, base URL and retries; this adapter only sees results. */
export interface AgentsApiTransport {
  createSession(request: {
    agent: { model?: string; id?: string; instructions?: string };
    environment: { type: AgentsApiEnvironmentType };
    input: string;
  }): Promise<NativeSession>;
  sendEvents(sessionId: string, events: Array<Record<string, unknown>>): Promise<{ accepted?: boolean }>;
  streamEvents(sessionId: string): { events: AsyncIterable<unknown>; abort(): void };
  getSession(sessionId: string): Promise<NativeSession>;
  listItems(sessionId: string, params?: { order?: 'asc' | 'desc'; limit?: number; after?: string | null }): Promise<NativeItemPage>;
}

export interface AgentsApiObservationSubscription {
  stop(): void;
  done: Promise<void>;
}

/** Recovery result. `gap` records that intermediate events were not replayed
 * and were not reconstructed from final text. */
export interface AgentsApiReconciliation {
  items: Array<{ id: string; type: string; role: string | null; status: string | null; turnId: string | null; text: string | null }>;
  pendingActions: NativeRequiredAction[];
  applied: number;
  discarded: number;
  malformed: number;
  unclaimed: number;
  gap: { reason: string; missedIntermediateEvents: true } | null;
}

export interface AgentsApiRuntimeAdapter {
  createSession(input: {
    identity: RuntimeIdentity;
    agent: { model?: string; id?: string; instructions?: string };
    environment: { type: AgentsApiEnvironmentType };
    input: string;
    commandId: string;
  }): Promise<{ binding: AgentsApiBinding; native: NativeSession }>;
  submitInput(binding: AgentsApiBinding, input: { text: string }): Promise<void>;
  cancelTurn(binding: AgentsApiBinding): Promise<{ intent: 'sent' }>;
  submitToolResult(binding: AgentsApiBinding, result: {
    turnId: string;
    callId: string;
    success: boolean;
    output?: string;
    error?: string;
  }): Promise<{ clearedPendingCall: boolean }>;
  observe(binding: AgentsApiBinding, options: {
    onObservation: (observation: AgentsApiObservation) => void | Promise<void>;
  }): AgentsApiObservationSubscription;
  reconcile(binding: AgentsApiBinding, options: {
    onObservation: (observation: AgentsApiObservation) => void | Promise<void>;
    disconnected?: boolean;
  }): Promise<AgentsApiReconciliation>;
  settle(binding: AgentsApiBinding, conditions: SettlementConditions): SettlementDecision | null;
  close(binding: AgentsApiBinding): void;
}

/** Capability row display rule, frozen with this slice. */
export declare const AGENTS_API_EXPOSURE_RULE: 'unverified capabilities are unavailable; only live-verified capabilities may be exposed';

export declare const AGENTS_API_PROTOCOL: {
  id: 'openai-agents-api';
  betaHeader: 'agents=v1';
  docsRevision: string;
  baseUrl: string;
  endpoints: Record<string, string>;
  sdkPin: { package: string; version: string; verifiedAt: string; namespace: string; tarballSha256: string };
};

export declare function normalizeNativeEvent(event: unknown): AgentsApiObservation | null;
export declare function exposureOf(capability: AgentsApiCapability): 'available' | 'unavailable';
export declare function capabilityRows(): readonly AgentsApiCapability[];
export declare function mergeRecoveredItems(input: {
  items?: NativeItem[];
  buffered?: unknown[];
  disconnected?: boolean;
}): AgentsApiReconciliation & { decisions: Array<'applied' | 'discarded' | 'unclaimed'> };
export declare function settleRun(input: {
  observations?: AgentsApiObservation[];
  conditions?: SettlementConditions;
  streamEnded?: boolean;
}): SettlementDecision | null;
export declare function createAgentsApiRuntimeAdapter(options: {
  transport: AgentsApiTransport;
}): AgentsApiRuntimeAdapter;
