/** HPRO-0004/0005/0006/0010/0013. DESIGN CONTRACT, not installed product API.
 * Existing /api/v5 DTOs, status codes, command receipts and Core validation
 * remain authoritative. Adapters translate at the application boundary.
 * No private chain-of-thought field, secret field or model-facing approve().
 */
export type CapabilityMode = 'native' | 'adapted' | 'unsupported' | 'untested';
export type Phase = 'admission' | 'prepare' | 'execute' | 'settle' | 'inspect';
export type RetryAction = 'query_receipt' | 'refresh' | 'explicit_new_command' | 'none';
export interface Failure {
  code: string;
  message: string; // controlled, not raw provider/credential payload
  phase: Phase;
  retry: RetryAction;
  runId?: string;
}
export interface NativeConversationRef {
  adapterId: string;
  adapterVersion: string;
  generation: number;
  locator: string; // host-owned opaque identifier, never a caller-selected path
}
export interface VersionedInputRef {
  id: string;
  sha256: string;
  bytes: number;
  scope: { type: 'user' | 'workspace' | 'agent' | 'session' | 'invocation'; id: string };
}
export interface InputPart {
  ref: VersionedInputRef;
  kind: 'host_instruction' | 'instruction' | 'memory_text' | 'skill_catalog' | 'work_context' | 'task';
  placement: 'system_section' | 'context_tail' | 'user_input' | 'deferred';
  authorityClass: 'host_rule' | 'user_instruction' | 'historical_or_background' | 'work_projection';
  order: number;
}
export interface RunInputSnapshot {
  schemaVersion: 1;
  runId: string;
  sessionId: string;
  adapterId: string;
  compilerVersion: string;
  controlRevision: number;
  nativeRef: NativeConversationRef;
  parts: InputPart[];
  systemPromptRef: VersionedInputRef;
  toolSchemaSetRef: VersionedInputRef;
  nativeHistoryPositionRef?: string; // native owner, not a copied transcript
  excluded: { id: string; reason: string }[];
  evidence: 'prepared' | 'submitted_observed' | 'partial';
}
export interface HostEvent {
  nativeRef?: string;
  type: string;
  data: unknown;
  textMode?: 'replace' | 'append';
}
export interface Settlement {
  outcome: 'completed' | 'cancelled' | 'failed' | 'unknown';
  effects: 'not_dispatched' | 'none_confirmed' | 'reported' | 'unknown';
  // "reported" is not a trusted formal decision or proof of rollback.
  error?: Failure;
}
export interface ExecutionHandle {
  nativeRef: NativeConversationRef;
  run(): Promise<Settlement>;
  interrupt(): Promise<{ requested: true }>; // NOT final cancellation/rollback
  settled: Promise<Settlement>;
  release(): Promise<void>; // idempotent; also releases a prepared-but-never-started handle
}
export interface RuntimeAdapter {
  id: string;
  version: string;
  capabilities: Record<string, { mode: CapabilityMode; evidenceRef?: string }>;
  openConversation(input: { nativeRef?: NativeConversationRef; workspaceRef: string; signal: AbortSignal }): Promise<NativeConversationRef>;
  prepareRun(input: { runId: string; nativeRef: NativeConversationRef; snapshot: RunInputSnapshot; tools: readonly ToolSpec[]; signal: AbortSignal; onEvent: (event: HostEvent) => Promise<void> }): Promise<ExecutionHandle>;
}
export interface ToolSpec {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  // Actual executor remains behind Host permission/admission enforcement.
}
export interface ApplicationContribution {
  opaqueWorkRef?: string;
  context: readonly InputPart[];
  tools: readonly ToolSpec[];
  closeAdmission(): Promise<void>;
  finish(settlement: Settlement): Promise<void>;
  reconcile(): Promise<{ state: 'settled' | 'recovery_required' }>;
}
export interface WorkRunPort {
  prepareContribution(input: { hostRunId: string; hostSessionId: string; authorizedBindingRef: string }): Promise<ApplicationContribution>;
}
// HumanDecisionPort is held by the authenticated application command handler,
// NOT passed to RuntimeAdapter or ToolSpec. It maps to existing Core request/CAS.
export interface HumanDecisionPort {
  decide(input: { request_id: string; candidate_id: string; base_version: number; action: 'accept' | 'reject' | 'request_evidence'; reason: string }): Promise<unknown>;
}
export interface ContextResetCommand {
  commandId: string;
  sessionId: string;
  expectedContextGeneration: number;
  acknowledgeContextReset: true;
}
