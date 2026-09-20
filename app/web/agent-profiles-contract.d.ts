/** Agent profile journey · consumer projection and intents (slice 1).
 *
 * This is the *minimum* the Settings → Agents → Agent profiles journey reads and
 * asks for. It is a frontend consumption contract, not a second ledger, and it
 * is not an ownership ledger either: **every fact below already has an owner.**
 * What some of them do not yet have is an implementation exposed to this
 * consumer, which is a different thing and is recorded as such. The frontend
 * never synthesizes a value that is absent — a missing fact stays missing.
 *
 * Owners, per the 2026-09-20 local-runtime ruling and Astra's 06a disposition:
 *   - profile composition and its revision → Runtime Control;
 *   - Role semantics → the existing product / Host admission contract;
 *   - Kit identity, version, admission and context → Harness Extension / RD-009;
 *   - runtime registration, capability and lifecycle → Runtime Adapter / RD-001;
 *   - provider, model and authentication → their existing configuration owner;
 *   - cross-layer seams → adjudicated by Astra.
 *
 * What exists today versus what this consumer proposes. `app/runtime/control-
 * contract.d.ts` exposes a configuration-wide snapshot `revision`, a numeric
 * `activeRuns` count, and a scoped profile-selection mutation. It does **not**
 * expose the per-profile `revision`, the `{runId, revision}` binding or the
 * Role/Kit/Runtime save shape used below. Those are proposed consumer needs for
 * the owners named above, not implemented API fields, and nothing here may be
 * read as an agreed projection before those owners have agreed it.
 */

/** A saved-and-confirmed composition. Draft values never appear here. */
export interface AgentProfileRecord {
  id: string;
  name: string;
  /** One line: the work this agent is for. Not a model or runtime name. */
  responsibility: string;
  roleId: string;
  kitIds: string[];
  runtimeId: string;
  /** The revision the owner confirmed for these exact values. **Proposed**:
   * the control plane exposes a configuration-wide revision, not a per-profile
   * one. */
  revision: number;
  /** Owner-supplied instant of that confirmation; never a client clock. */
  savedAt: string;
  /** Present only while a Run holds this profile. `revision` is what that Run
   * is bound to, which can be older than `revision` above. **Proposed**: the
   * control plane exposes an `activeRuns` count, not this binding. */
  activeRun: { runId: string; revision: number } | null;
}

export interface AgentRole {
  id: string;
  name: string;
  /** What this role is responsible for, in the user's terms. */
  purpose: string;
}

/** A requested capability. A request is not a grant. */
export interface KitRequest {
  action: string;
  label: string;
}

export interface AgentKit {
  id: string;
  name: string;
  version: string;
  purpose: string;
  requests: KitRequest[];
  /** Runtime ids this Kit's own contract declares support for. A runtime absent
   * from this list is an incompatibility to explain, not a disabled control. */
  supportedRuntimeIds: string[];
}

export type RuntimeAvailability = 'available' | 'unavailable';
/** Who decides which model this runtime uses. `runtime-native` means CourtWork
 * reads it and does not set it. */
export type ModelOwner = 'courtwork' | 'runtime-native';
export type PermissionEffect = 'allow' | 'ask' | 'deny';

export interface AgentRuntime {
  id: string;
  name: string;
  /** Where it runs, in one short phrase ("Local process", "Local service"). */
  location: string;
  availability: RuntimeAvailability;
  /** Required when `availability` is `unavailable`; the user-facing reason. */
  unavailableReason: string | null;
  modelOwner: ModelOwner;
  model: {
    /** What will actually be used, as its owner reports it. */
    effective: string;
    /** Where that value comes from, including its scope. */
    source: string;
    /** What this profile asked for, or null when it asks for nothing. */
    requested: string | null;
    /** One sentence only when ownership affects this decision. */
    note: string | null;
  };
  /** Actions this runtime can carry out at all. Absent ⇒ unsupported. */
  supportedActions: string[];
  /** Effect the permission owner reports for each supported action. */
  grants: Record<string, PermissionEffect>;
}

/** Everything one profile page needs, in one reply. */
export interface AgentProfileDetail {
  profile: AgentProfileRecord;
  roles: AgentRole[];
  kits: AgentKit[];
  runtimes: AgentRuntime[];
}

export interface AgentProfileRow {
  id: string;
  name: string;
  responsibility: string;
  roleName: string;
  kitNames: string[];
  runtimeName: string;
  runtimeAvailability: RuntimeAvailability;
  revision: number;
  activeRun: { runId: string; revision: number } | null;
  /** The one action this row offers, and it always opens this profile: every
   * choice — including changing an unavailable runtime — is made there, so a
   * row must not route away from it. The adapter supplies the wording. */
  nextAction: { label: string; targetId: string };
}

/** A read-only runtime view reached from a profile. Slice 1 reads only. */
export interface RuntimeDetailRecord {
  id: string;
  name: string;
  location: string;
  availability: RuntimeAvailability;
  unavailableReason: string | null;
  /** Observed upstream version, or null when it has not been observed. */
  observedVersion: string | null;
  protocol: string | null;
  /** Who owns this runtime's authentication: upstream or CourtWork. */
  authenticationOwner: string;
  modelOwner: ModelOwner;
  /** What this slice deliberately does not offer here. */
  managementNote: string;
}

/** The whole seam. An adapter implements these five calls and nothing else. */
export interface AgentProfilesAdapter {
  list(): Promise<{ rows: AgentProfileRow[] }>;
  open(id: string): Promise<AgentProfileDetail>;
  /** `expectedRevision` is the revision the draft was composed against. A
   * mismatch must fail with `code: 'profile_conflict'`; it must never merge.
   * **Proposed**: `RuntimeChange` carries a revision for a scoped profile
   * *selection*, and has no shape for a Role/Kit/Runtime composition save. */
  save(
    id: string,
    draft: { roleId: string; kitIds: string[]; runtimeId: string },
    expectedRevision: number,
  ): Promise<AgentProfileDetail>;
  runtimeDetail(id: string): Promise<RuntimeDetailRecord>;
  /** Whether saving is offered at all, and why not when it is not. A production
   * adapter without the backend answers `{ canSave: false, reason }`. */
  capabilities(): { canSave: boolean; reason: string };
}
