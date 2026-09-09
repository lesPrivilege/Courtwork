/** Runtime Control Protocol v1. Independent of a renderer or Pi Session type.
 * The HTTP binding lives under /api/v5; protocolVersion describes this seam. */
export type ResourceKind = 'tool' | 'mcp_server' | 'skill' | 'plugin' | 'instruction'
  | 'prompt_template' | 'memory_provider' | 'reference' | 'agent_profile'
  | 'workflow' | 'hook' | 'provider' | 'model' | 'permission_policy' | 'secret'
  | 'sandbox' | 'registry' | 'session_context';
export type ScopeKind = 'org' | 'user' | 'workspace' | 'agent' | 'session' | 'invocation';
export interface Scope { type: ScopeKind; id: string }
export interface ConfigurableScope extends Scope { type: 'user' | 'workspace' | 'agent' | 'session' }
export type Effect = 'allow' | 'ask' | 'deny';
export interface PolicyRule { action: string; resource: string; effect: Effect }
export interface ScopedPolicy { scope: Scope; rules: PolicyRule[] }
export interface PermissionExplanation {
  effect: Effect;
  trace: Array<{ source: Scope | string; effect: Effect; action?: string; resource?: string }>;
  resourceSpecific?: boolean;
}
export interface ResourceSource {
  type: 'builtin' | 'local-config' | 'remote';
  uri?: string;
  version?: string;
  hash?: string;
}
export interface RuntimeResource {
  id: string;
  kind: ResourceKind;
  title: string;
  source: ResourceSource;
  scope: Scope;
  activation: 'always' | 'manual' | 'user-invoked';
  installed: boolean;
  /** null means not applicable, not disconnected. */
  running: boolean | null;
  exposed: boolean;
  health: 'healthy' | 'degraded' | 'error';
  /** Whether exposure is configurable; lifecycle stays with its kind service. */
  configurable: boolean;
  defaultExposed: boolean;
  provenance: Array<{ scope: Scope; value: boolean; reason: string; parentId?: string }>;
  action?: string;
  /** A model-compatible tool name, distinct from the readable policy action. */
  executionName?: string;
  permission?: PermissionExplanation;
  parent?: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  diagnostics?: string[];
  server?: { name: string; version: string; [key: string]: unknown } | null;
  protocol?: string;
  transport?: 'streamable-http';
  authentication?: 'unauthenticated-only';
  catalog?: { resources: Array<Record<string, unknown>>; prompts: Array<Record<string, unknown>> };
  capabilities?: string[] | { tools: number; resources: number; prompts: number };
  characters?: number;
  compatibility?: string | null;
  requestedTools?: unknown;
  mcp?: { serverId: string; name: string; configHash: string };
}
export interface ImportedResource {
  id: `local:${string}`;
  kind: 'instruction' | 'skill' | 'reference' | 'prompt_template' | 'agent_profile' | 'mcp_server';
  title: string;
  scope: ConfigurableScope;
  /** Markdown/plain text; agent_profile and mcp_server use JSON source text.
   * Kind-specific validation runs before persistence. */
  content: string;
}
export interface AgentCompositionSource {
  schemaVersion: 1;
  version: string;
  resourceIds: string[];
  rules: PolicyRule[];
  /** Declarations for future frontend composition; never executable code. */
  uiSlots: Array<'runtime.inspector' | 'work.surface'>;
}
export interface McpSource {
  transport: 'streamable-http';
  url: string;
  protocol: '2026-07-28' | 'legacy-2025';
}
export interface RuntimeComposition {
  id: string;
  version: string | null;
  hash?: string | null;
  status: 'compatible' | 'unavailable' | 'incompatible';
  resourceIds: string[] | null;
  uiSlots: string[];
  missing: string[];
}
export interface ContextItem {
  id: string;
  kind: ResourceKind;
  source: ResourceSource;
  scope: Scope;
  admission: 'instructions' | 'catalog-only' | 'user-invoked';
  /** Legacy source-body (instruction) or catalog description/title length.
   * Not a compiled-context total. Retained for historical bindings. */
  characters: number;
  /** UTF-16 code units contributed to compileControlContext, including headers
   * and separators allocated to the following item (catalog header: first item).
   * Absent on historical bindings. Never a token estimate or full model context. */
  admittedCharacters?: number;
  /** Source-body code units not automatically injected; templates remain draft-only. */
  deferredCharacters?: number;
}
export interface RuntimeSnapshot {
  protocolVersion: 1;
  revision: number;
  sessionId: string | null;
  scopes: ConfigurableScope[];
  activeRuns: number;
  adapterId: string;
  resources: RuntimeResource[];
  composition: RuntimeComposition;
  profileSelections: Array<{ scope: ConfigurableScope; id: string }>;
  policies: ScopedPolicy[];
  context: ContextItem[];
  audit: Array<{ revision: number; at: string; actor: 'local-user'; operation: string; id: string | null; scope: ConfigurableScope | null }>;
  kinds: Array<{ kind: ResourceKind; support: 'available' | 'adapter-required' }>;
  compatibility: Record<string, unknown>;
}
export type RuntimeChange = { revision: number } & (
  | { operation: 'put'; resource: ImportedResource }
  | { operation: 'remove'; id: string }
  | { operation: 'exposure'; id: string; scope: ConfigurableScope; exposed: boolean | null }
  | { operation: 'profile'; id: string | null; scope: ConfigurableScope }
  | { operation: 'policy'; scope: ConfigurableScope; rules: PolicyRule[] }
);
export interface RuntimeBinding {
  revision: number;
  hash: string;
  resources: RuntimeResource[];
  composition: RuntimeComposition;
  content: ImportedResource[];
  policies: ScopedPolicy[];
  context: ContextItem[];
}
/** Implementable by an HTTP client or an in-process host adapter. Mutations
 * return authoritative snapshots; the frontend must not synthesize authority. */
export interface RuntimeControlClient {
  inspect(sessionId?: string): Promise<RuntimeSnapshot>;
  listResources(kind?: ResourceKind, sessionId?: string): Promise<{ protocolVersion: 1; revision: number; resources: RuntimeResource[] }>;
  getContext(sessionId: string, runId?: string): Promise<
    | { mode: 'effective-next-run'; revision: number; composition: RuntimeComposition; context: ContextItem[]; tokenUsage: null }
    | { mode: 'recorded-run'; runId: string; binding: RuntimeBinding | null; loaded: Array<{ id: string; kind: ResourceKind; source: ResourceSource; characters: number; seq: number }>; tokenUsage: unknown; legacyWithoutControlSnapshot: boolean }
  >;
  configure(change: RuntimeChange, sessionId?: string): Promise<RuntimeSnapshot>;
  getResource(id: string, sessionId?: string): Promise<{ revision: number; resource: RuntimeResource; content: string | null }>;
  evaluatePermission(input: { resourceId: string; resource?: string }, sessionId?: string): Promise<PermissionExplanation & { revision: number; advisory: true }>;
  mcpLifecycle(id: string, input: { action: 'connect' | 'disconnect' | 'restart'; revision: number }, sessionId?: string): Promise<RuntimeSnapshot>;
  invokePrompt(id: string, sessionId?: string): Promise<{ resourceId: string; revision: number; source: ResourceSource; text: string; disposition: 'draft-only' }>;
}
