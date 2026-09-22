/* Synthetic owners for the Agent profile journey. No network, no credential, no
 * disk, no product state. Every name, version, availability and permission
 * effect below is invented for this specimen: the cast is a labelled example,
 * not a reading of anything installed on this machine, and a save here confirms
 * a revision in this module's own memory and nowhere else.
 *
 * It is deliberately shaped like the reply a backend would give (one detail call
 * returns the record plus the catalogues it must be read against), so the same
 * controller and view can be pointed at a production adapter later without
 * either of them learning a new shape.
 */

export const VARIANTS = [
  "normal",
  "empty",
  "save-error",
  "stale-revision",
  "runtime-unavailable",
  /* Two states a production adapter will really have and a happy fixture never
     produces: an owner that cannot accept a write at all, and a supported
     action the permission owner has not reported an effect for. */
  "read-only",
  "grant-unreported",
];

const copy = (value) => structuredClone(value);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function fail(code, message) {
  throw Object.assign(new Error(message), { code });
}

const ROLES = [
  {
    id: "role-work",
    name: "General work",
    purpose: "Reads the materials you connect, drafts, and revises. No repository access.",
  },
  {
    id: "role-coding",
    name: "Coding",
    purpose: "Reads a connected repository, proposes edits for approval, and runs the fixed check.",
  },
  {
    id: "role-attention",
    name: "Attention",
    purpose: "Sorts what needs a person, keeps follow-ups moving, and proposes triggers.",
  },
];

const KITS = [
  {
    id: "kit-coding",
    name: "Coding review",
    version: "0.2",
    purpose: "Read a repository, propose an exact edit, and run the project's own check on it.",
    requests: [
      { action: "repository.read", label: "Read the connected repository" },
      { action: "candidate.write", label: "Write a private candidate edit" },
      { action: "check.run", label: "Run the project's fixed check" },
    ],
    supportedRuntimeIds: ["rt-pi"],
    compatibility: [
      { runtimeId: "rt-pi", runtimeRevision: "synthetic-pi-r1", kitVersion: "0.2", result: "supported", evidenceRef: "synthetic check · Coding review 0.2 on Pi" },
      { runtimeId: "rt-hermes", runtimeRevision: "synthetic-hermes-r1", kitVersion: "0.2", result: "unsupported", evidenceRef: "synthetic check · Coding review 0.2 on Hermes" },
    ],
  },
  {
    id: "kit-praxis",
    name: "Praxis",
    version: "0.4",
    purpose: "Field work and organisational collaboration: align, discover, decide, hand off.",
    requests: [
      { action: "reference.read", label: "Read connected reference material" },
      { action: "artifact.write", label: "Produce a decision material" },
    ],
    supportedRuntimeIds: ["rt-pi", "rt-hermes"],
    compatibility: [
      { runtimeId: "rt-pi", runtimeRevision: "synthetic-pi-r1", kitVersion: "0.4", result: "supported", evidenceRef: "synthetic check · Praxis 0.4 on Pi" },
      { runtimeId: "rt-hermes", runtimeRevision: "synthetic-hermes-r1", kitVersion: "0.4", result: "supported", evidenceRef: "synthetic check · Praxis 0.4 on Hermes" },
    ],
  },
  {
    id: "kit-attention",
    name: "Attention triage",
    version: "0.9",
    purpose: "Group what is waiting on a person and propose the next follow-up.",
    requests: [{ action: "attention.read", label: "Read the Attention queue" }],
    supportedRuntimeIds: ["rt-pi", "rt-hermes"],
    compatibility: [
      { runtimeId: "rt-pi", runtimeRevision: "synthetic-pi-r1", kitVersion: "0.9", result: "supported", evidenceRef: "synthetic check · Attention triage 0.9 on Pi" },
      { runtimeId: "rt-hermes", runtimeRevision: "synthetic-hermes-r1", kitVersion: "0.9", result: "supported", evidenceRef: "synthetic check · Attention triage 0.9 on Hermes" },
    ],
  },
];

/* Kit compatibility records above are explicitly synthetic owner evidence
 * (06E-R1): a Kit's `supportedRuntimeIds` is only its declaration, and the
 * projection reads it as such. Each runtime states the revision a record must
 * match; a runtime with no stated revision can match only records without one.
 *
 * The three execution choices differ in exactly the ways this journey has to
 * explain: who owns the model, what the executor can do at all, and whether it
 * can take new work right now. */
const RUNTIMES = [
  {
    id: "rt-pi",
    revision: "synthetic-pi-r1",
    name: "Pi",
    location: "Local process",
    availability: "available",
    unavailableReason: null,
    modelOwner: "courtwork",
    model: {
      effective: "Synthetic model · synthetic connection",
      source: "Models · All chats · future runs",
      requested: null,
      note: "This agent has no model choice of its own yet. Every chat uses the one saved in Models.",
    },
    supportedActions: [
      "repository.read",
      "candidate.write",
      "check.run",
      "reference.read",
      "artifact.write",
      "attention.read",
    ],
    grants: {
      "repository.read": "allow",
      "candidate.write": "ask",
      "check.run": "allow",
      "reference.read": "allow",
      "artifact.write": "ask",
      "attention.read": "allow",
    },
  },
  {
    id: "rt-hermes",
    revision: "synthetic-hermes-r1",
    name: "Hermes",
    location: "Local process",
    availability: "available",
    unavailableReason: null,
    modelOwner: "runtime-native",
    model: {
      effective: "Synthetic native model, as Hermes reports it",
      source: "Hermes' own settings",
      requested: null,
      note: "Hermes chooses its own model. CourtWork reads that choice and does not set it.",
    },
    supportedActions: ["reference.read", "artifact.write", "attention.read"],
    grants: {
      "reference.read": "allow",
      "artifact.write": "ask",
      "attention.read": "allow",
    },
  },
  {
    id: "rt-codex",
    revision: null,
    name: "Codex",
    location: "Local process",
    availability: "unavailable",
    unavailableReason: "It is not connected on this device.",
    modelOwner: "runtime-native",
    model: {
      effective: "Unknown",
      source: "Not connected",
      requested: null,
      note: "A runtime that is not connected reports no model.",
    },
    supportedActions: [],
    grants: {},
  },
];

const RUNTIME_DETAILS = {
  "rt-pi": {
    observedVersion: "0.85.1 (synthetic)",
    protocol: "Synthetic JSONL session",
    authenticationOwner: "CourtWork, through a Models connection",
  },
  "rt-hermes": {
    observedVersion: "Synthetic build",
    protocol: "Synthetic one-shot job",
    authenticationOwner: "Hermes, in its own configuration",
  },
  "rt-codex": {
    observedVersion: null,
    protocol: null,
    authenticationOwner: "Unknown while it is not connected",
  },
};

const SEED = [
  {
    id: "ap-work",
    name: "Work",
    responsibility: "Ordinary work: read what you connect, draft it, revise it.",
    roleId: "role-work",
    kitIds: [],
    runtimeId: "rt-pi",
    revision: 4,
    savedAt: "2026-09-18T09:20:00.000Z",
    activeRun: null,
  },
  {
    id: "ap-coding",
    name: "Coding",
    responsibility: "Fix a defect in a connected repository, with approval before each edit.",
    roleId: "role-coding",
    kitIds: ["kit-coding"],
    runtimeId: "rt-pi",
    revision: 7,
    savedAt: "2026-09-19T14:05:00.000Z",
    activeRun: { runId: "synthetic-run-311", revision: 7 },
  },
  {
    id: "ap-attention",
    name: "Attention",
    responsibility: "Triage what is waiting on you and prepare the material for the decision.",
    roleId: "role-attention",
    kitIds: ["kit-attention", "kit-praxis"],
    runtimeId: "rt-hermes",
    revision: 2,
    savedAt: "2026-09-17T18:40:00.000Z",
    activeRun: null,
  },
];

export function createAgentProfilesFixture({ pause = wait, readDelay = 160, saveDelay = 420 } = {}) {
  let variant = "normal";
  let records = SEED.map(copy);
  const operations = [];
  /* The conflict case needs a *real* second writer, not a rejection message:
     someone else moved this profile on while you were composing a draft, so the
     revision you saved against no longer exists and their values are different
     from yours. This flag makes that happen once, on the next save. */
  let otherWriterPending = false;

  const runtimesFor = () =>
    RUNTIMES.map((runtime) => {
      if (variant === "runtime-unavailable" && runtime.id === "rt-pi")
        return {
          ...copy(runtime),
          availability: "unavailable",
          unavailableReason: "The Pi process is not running on this device.",
        };
      if (variant === "grant-unreported") {
        /* The action stays supported; only the permission owner's answer is
           absent. Supported-with-no-effect and unsupported are different
           readings and must not collapse into one another. */
        const grants = { ...copy(runtime.grants) };
        delete grants["reference.read"];
        return { ...copy(runtime), grants };
      }
      return copy(runtime);
    });

  const recordOf = (id) => {
    const record = records.find((entry) => entry.id === id);
    if (!record) fail("profile_missing", "That agent profile is not part of this specimen.");
    return record;
  };

  const detailFor = (record) => ({
    profile: copy(record),
    roles: ROLES.map(copy),
    kits: KITS.map(copy),
    runtimes: runtimesFor(),
  });

  function rowFor(record) {
    const runtime = runtimesFor().find((entry) => entry.id === record.runtimeId);
    return {
      id: record.id,
      name: record.name,
      responsibility: record.responsibility,
      roleName: ROLES.find((role) => role.id === record.roleId)?.name ?? "Unknown",
      kitNames: record.kitIds.map((id) => KITS.find((kit) => kit.id === id)?.name ?? id),
      runtimeName: runtime?.name ?? "Unknown",
      runtimeAvailability: runtime?.availability ?? "unavailable",
      revision: record.revision,
      activeRun: copy(record.activeRun),
      /* One action, and it opens the profile. A row whose executor is down
         still has to be openable — choosing another runtime is exactly what
         that person needs to do, and the reason is waiting inside. */
      nextAction: { label: "Open", targetId: record.id },
    };
  }

  return {
    operations: () => copy(operations),
    variants: VARIANTS,
    get variant() {
      return variant;
    },
    configure(next) {
      if (!VARIANTS.includes(next)) fail("invalid_variant", "Unknown specimen state.");
      variant = next;
      otherWriterPending = next === "stale-revision";
    },
    reset() {
      records = SEED.map(copy);
      operations.length = 0;
      variant = "normal";
      otherWriterPending = false;
    },

    capabilities() {
      /* What a production adapter answers before its backend exists: the
         operation is not offered, and it says why rather than leaving a dead
         control on screen. */
      return variant === "read-only"
        ? {
            canSave: false,
            reason:
              "This host cannot save an agent profile yet. You can read and compare the composition; the change is not kept.",
          }
        : { canSave: true, reason: "" };
    },

    async list() {
      await pause(readDelay);
      if (variant === "empty") return { rows: [] };
      return { rows: records.map(rowFor) };
    },

    async open(id) {
      await pause(readDelay);
      if (variant === "empty") fail("profile_missing", "That agent profile is not part of this specimen.");
      return detailFor(recordOf(id));
    },

    async save(id, draft, expectedRevision) {
      await pause(saveDelay);
      const record = recordOf(id);
      if (variant === "read-only")
        fail("save_unsupported", "This host cannot save an agent profile yet. Nothing was saved.");
      if (variant === "save-error")
        fail(
          "save_failed",
          "The host did not accept the change. Nothing was saved, and your draft is kept here.",
        );
      if (otherWriterPending) {
        /* Another window saved first. Its values are recorded, the revision
           moves, and only then is this save rejected — so a reload really does
           show someone else's profile rather than a refreshed copy of yours. */
        otherWriterPending = false;
        record.runtimeId = "rt-hermes";
        record.kitIds = ["kit-praxis"];
        record.revision += 1;
        record.savedAt = "2026-09-20T11:30:00.000Z";
        operations.push({ kind: "other-writer", id, revision: record.revision });
      }
      if (record.revision !== expectedRevision)
        fail(
          "profile_conflict",
          `This profile was saved elsewhere and is now at revision ${record.revision}. Your draft was composed against revision ${expectedRevision}; nothing was overwritten.`,
        );
      if (record.activeRun)
        fail(
          "profile_frozen",
          "A run is using this profile. Configuration is frozen until it ends; nothing was saved.",
        );
      record.roleId = draft.roleId;
      record.kitIds = [...draft.kitIds];
      record.runtimeId = draft.runtimeId;
      record.revision += 1;
      record.savedAt = "2026-09-20T12:00:00.000Z";
      operations.push({ kind: "save", id, revision: record.revision, draft: copy(draft) });
      return detailFor(record);
    },

    async runtimeDetail(id) {
      await pause(readDelay);
      const runtime = runtimesFor().find((entry) => entry.id === id);
      if (!runtime) fail("runtime_missing", "That runtime is not part of this specimen.");
      const extra = RUNTIME_DETAILS[id];
      return {
        id: runtime.id,
        name: runtime.name,
        location: runtime.location,
        availability: runtime.availability,
        unavailableReason: runtime.unavailableReason,
        observedVersion: extra.observedVersion,
        protocol: extra.protocol,
        authenticationOwner: extra.authenticationOwner,
        modelOwner: runtime.modelOwner,
        managementNote:
          "Reading only in this preview. Connecting, enabling, disconnecting and credential handling belong to the next slice and have no backend yet.",
      };
    },
  };
}
