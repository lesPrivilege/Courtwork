/** Settings → Agents → Runtimes · consumer projection and intents (06c).
 *
 * The *minimum* the Runtime management journey reads and asks for. It is a
 * frontend consumption contract, not a registry, a persistence schema or a
 * secret store, and it adds no owner: **every fact below already has one.**
 * Some of those owners do not yet expose the fact to this consumer. That is a
 * missing implementation, recorded field by field, not missing ownership. The
 * frontend never synthesizes an absent value.
 *
 * Owners (local-runtime ruling 2026-09-20; control-plane disposition 2026-09-21):
 *   - runtime identity, capability, lifecycle and connection → Runtime Adapter / RD-001;
 *   - admission of new work, configuration revision, the binding a Run records → Runtime Control;
 *   - the credential a CourtWork-managed runtime uses → Provider credentials, reached through Models;
 *   - hooks and extensions → Tools / RD-009 (not consumed by this journey).
 *
 * Exposed today: the adapter id is the runtime identity (`service.mjs`
 * `adapterId`), and a Run records it when it is created (`store.mjs`
 * `createRun`). Runtime Control exposes a configuration-wide `revision`, an
 * `activeRuns` count and `mcpLifecycle({ action, revision })`. Provider
 * credentials are connection-id keyed with status-only read-back.
 *
 * **Proposed** (not agreed, not implemented): everything else on this page — a
 * per-runtime projection, per-runtime revision, admission for new work,
 * connection identity and history, bound-run references, action support with
 * reasons, the command shape and the status lookup by operation id.
 */

/** Who configures this runtime and holds its sign-in. `native` means the
 * runtime's own settings; CourtWork reads what it reports and writes nothing
 * there. Owner: Runtime Adapter / RD-001. **Proposed** field. */
export type ConfigurationOwner = 'courtwork' | 'native';

/** `disconnected` has an earlier connection in `history`; `not-connected`
 * never had one. Owner: Runtime Adapter / RD-001. **Proposed.** */
export type ConnectionState = 'connected' | 'disconnected' | 'not-connected';

/** The saved setting for new admissions. Owner: Runtime Control. **Proposed.** */
export type AdmissionSetting = 'enabled' | 'disabled';

export type CommandKind = 'connect' | 'reconnect' | 'disable' | 'enable' | 'disconnect';

/** An action the owner offers for this runtime now, or its reason for not
 * offering it. A kind absent from `actions` does not apply in this state. */
export interface ActionSupport {
  supported: boolean;
  /** Required when `supported` is false: the user-facing reason. */
  reason: string | null;
}

/** Availability of the engine itself. `unavailable` is a fact about the
 * device or installation, never a permission decision. Owner: RD-001. */
export interface Availability {
  status: 'available' | 'unavailable';
  reason: string | null;
}

/** What a connect or reconnect asks for, and the only thing a draft holds. */
export interface ConnectionConfiguration {
  /** The person's name for this connection. */
  label: string;
  /** `courtwork` runtimes only: which Models credential reference to use.
   * Always null for a `native` runtime. */
  credentialRefId: string | null;
}

/** A reference to a credential held by its Models connection. Never a key,
 * never key material, and not proof that authentication works. Owner:
 * Provider credentials. **Exposed** as connection status; the reference
 * projection here is **proposed**. */
export interface CredentialReference {
  id: string;
  label: string;
  status: 'configured' | 'missing';
}

export interface RuntimeRow {
  id: string;
  name: string;
  /** True for every runtime a synthetic adapter reports: a labelled example,
   * not a discovered installation. */
  example: boolean;
  location: string;
  availability: Availability;
  configurationOwner: ConfigurationOwner;
  connection: ConnectionState;
  admission: { saved: AdmissionSetting; effective: boolean };
  /** Agent profile names that choose this runtime. Owner: Runtime Control. */
  usedBy: string[];
  boundRunCount: number;
  revision: number;
  /** The one action this row offers; it always opens this runtime. */
  nextAction: { label: string; targetId: string };
}

export interface BoundRun {
  runId: string;
  agentName: string;
  /** The runtime revision this Run recorded at admission. It does not move
   * when the runtime is changed later. Owner: Runtime Control. **Proposed**:
   * a Run records its adapter id today, not a per-runtime revision. */
  bindingRevision: number;
}

export interface ConnectionHistoryEntry {
  connectionId: string;
  label: string;
  connectedAt: string;
  disconnectedAt: string;
  /** Runs recorded under that connection. Their history is kept. */
  runsRecorded: number;
}

export interface RuntimeDetail {
  id: string;
  name: string;
  example: boolean;
  location: string;
  /** The revision the owner confirmed for this runtime's saved values.
   * **Proposed**: Runtime Control exposes a configuration-wide revision. */
  revision: number;
  /** Owner-supplied instant of that revision; never a client clock. */
  savedAt: string;
  availability: Availability;
  configurationOwner: ConfigurationOwner;
  /** One sentence each: where configuration, sign-in and model choice live. */
  ownership: { configuration: string; authentication: string; model: string };
  authentication: {
    owner: ConfigurationOwner;
    /** What the owner reports. `not-reported` is not a failure. */
    status: 'configured' | 'missing' | 'reported-signed-in' | 'not-reported' | 'unknown';
    /** `native` only: the step the person takes in the runtime itself. */
    nativeNextStep: string | null;
    /** `courtwork` only: references this runtime may use. */
    references: CredentialReference[];
  };
  connection: {
    state: ConnectionState;
    connectionId: string | null;
    /** Saved configuration of the current connection; null when none. */
    configuration: ConnectionConfiguration | null;
    since: string | null;
  };
  /** What a connect writes and what it leaves alone, read before the command. */
  proposal: { defaultLabel: string; writes: string[]; leaves: string[] };
  admission: {
    saved: AdmissionSetting;
    /** Whether the next admission can use this runtime at all. */
    effective: boolean;
    effectiveReason: string;
  };
  boundRuns: BoundRun[];
  usedBy: Array<{ id: string; name: string }>;
  history: ConnectionHistoryEntry[];
  /** Diagnostic facts, disclosed on demand. Null means not observed. */
  facts: {
    observedVersion: string | null;
    protocol: string | null;
    capabilities: string[];
    process: Array<{ label: string; value: string }> | null;
  };
  actions: Partial<Record<CommandKind, ActionSupport>>;
}

/** One command. `operationId` is minted once per press and never reused for
 * a different request; sending it again must not create a second effect.
 * `expectedRevision` is the revision the page showed; a mismatch refuses with
 * `code: 'runtime_conflict'` and never merges. **Proposed**, modelled on
 * `mcpLifecycle({ action, revision })`. */
export interface CommandRequest {
  operationId: string;
  kind: CommandKind;
  expectedRevision: number;
  /** `connect` and `reconnect` only. */
  configuration?: ConnectionConfiguration;
}

export interface CommandReceipt {
  operationId: string;
  runtimeId: string;
  kind: CommandKind;
  /** The revision this command produced. */
  revision: number;
  connectionId: string | null;
}

/** The answer to "did my command land?" after a reply was lost. **Proposed**:
 * no command-status lookup exists today. `not-applied` means the owner has no
 * record of the operation id, so nothing changed. */
export type OperationStatus =
  | { status: 'confirmed'; receipt: CommandReceipt }
  | { status: 'not-applied' }
  | { status: 'refused'; code: string; message: string }
  | { status: 'pending' };

/** Settled refusals. A thrown error carrying one of these codes means the
 * owner answered and nothing changed. Any other error — a lost reply, a
 * transport failure, an unknown code — leaves the outcome unknown. */
export type SettledRefusalCode =
  | 'runtime_conflict'
  | 'action_unsupported'
  | 'connect_refused'
  | 'runtime_missing';

/** The whole seam. */
export interface RuntimeManagementAdapter {
  /** Whether this host offers runtime management at all, and why not. */
  capabilities(): { canManage: boolean; reason: string };
  list(): Promise<{ rows: RuntimeRow[] }>;
  open(id: string): Promise<RuntimeDetail>;
  command(id: string, request: CommandRequest): Promise<CommandReceipt>;
  operationStatus(id: string, operationId: string): Promise<OperationStatus>;
}
