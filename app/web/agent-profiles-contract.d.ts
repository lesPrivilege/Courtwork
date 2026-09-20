/** Agent profile journey · consumer projection and intents (slice 1).
 *
 * This is the *minimum* the Settings → Agents → Agent profiles journey reads and
 * asks for. It is a frontend consumption contract, not a second ledger: every
 * field below names a fact that an existing backend owner either holds today or
 * is recorded as missing in the delivery record beside this file. The frontend
 * never synthesizes a value that is absent here — a missing fact stays missing.
 *
 * Ownership, per the 2026-09-20 local-runtime ruling and the runtime control
 * plane index:
 *   - profile identity / composition / revision → runtime control plane
 *     (`agent_profile` resource kind, `AgentCompositionSource`, snapshot
 *     `revision`, `RuntimeChange{operation:'profile'}`);
 *   - Kit identity, version and per-runtime support → **no owner today**;
 *   - Runtime registration, availability and model ownership → **no owner
 *     today** (target `Settings → Agents → Runtimes`);
 *   - effective model → existing provider configuration owner (`/provider-config`),
 *     whose scope is still global future-runs;
 *   - permission effect per requested action → runtime control plane
 *     (`PermissionExplanation`, `evaluatePermission`);
 *   - active-Run freeze → runtime snapshot `activeRuns`.
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
  /** The revision the owner confirmed for these exact values. */
  revision: number;
  /** Owner-supplied instant of that confirmation; never a client clock. */
  savedAt: string;
  /** Present only while a Run holds this profile. `revision` is what that Run
   * is bound to, which can be older than `revision` above. */
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
  /** The one action this row offers. `intent` selects an in-product
   * destination; the adapter decides which one is useful for this row. */
  nextAction: { intent: 'open' | 'runtime'; label: string; targetId: string };
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
   * mismatch must fail with `code: 'profile_conflict'`; it must never merge. */
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
