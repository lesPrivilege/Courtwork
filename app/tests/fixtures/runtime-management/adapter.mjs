/* Synthetic owners for the Runtime management journey. No network, no
 * credential, no disk, no process, no native configuration. Every runtime,
 * version, connection, credential reference and run below is invented for this
 * specimen: Pi, Hermes and Codex are labelled examples, not a reading of what
 * is installed on this machine, and a confirmed revision here is confirmed in
 * this module's own memory and nowhere else.
 *
 * It answers the way an owner has to, including the ways a happy fixture never
 * does: it honours an operation id (the same id twice is one effect), it can
 * commit a command and lose the reply, a second writer can move a runtime on
 * underneath a page, and it can answer "did operation X land?" afterwards.
 */

export const VARIANTS = [
  "normal",
  "empty",
  "read-error",
  "connect-refused",
  "lost-reply",
  "stale-revision",
  /* The next command lands, and the next reading of that runtime is still the
     one from before it — a lagging read. Only the reading after that is
     current. */
  "stale-read-back",
  "read-only",
];

const copy = (value) => structuredClone(value);
const possessive = (name) => (name.endsWith("s") ? `${name}'` : `${name}'s`);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function refuse(code, message) {
  throw Object.assign(new Error(message), { code });
}

/* Instants are owner-supplied facts, so the fixture supplies them from a fixed
 * sequence rather than the client clock. */
const INSTANTS = [
  "2026-09-21T09:10:00.000Z",
  "2026-09-21T09:24:00.000Z",
  "2026-09-21T09:41:00.000Z",
  "2026-09-21T10:02:00.000Z",
  "2026-09-21T10:15:00.000Z",
  "2026-09-21T10:33:00.000Z",
];

const PROFILES = {
  "ap-work": "Work",
  "ap-coding": "Coding",
  "ap-attention": "Attention",
};

const REFERENCES = [
  {
    id: "syn-ref-a",
    label: "Synthetic reference · Models › Synthetic connection A",
    status: "configured",
  },
  {
    id: "syn-ref-b",
    label: "Synthetic reference · Models › Synthetic connection B",
    status: "missing",
  },
];

const SEED = [
  {
    id: "rt-pi",
    name: "Pi",
    location: "Local process",
    configurationOwner: "courtwork",
    installed: true,
    revision: 3,
    savedAt: "2026-09-19T14:05:00.000Z",
    connection: {
      state: "connected",
      connectionId: "syn-pi-conn-1",
      configuration: { label: "Pi on this Mac", credentialRefId: "syn-ref-a" },
      since: "2026-09-19T14:05:00.000Z",
    },
    admission: "enabled",
    usedBy: ["ap-work", "ap-coding"],
    /* The run the Agent profiles preview shows holding Coding: it recorded
       Pi's revision 3 when it was admitted, and that is what it keeps. */
    boundRuns: [{ runId: "synthetic-run-311", agentName: "Coding", bindingRevision: 3 }],
    history: [],
    facts: {
      observedVersion: "0.85.1 (synthetic)",
      protocol: "Synthetic JSONL session",
      capabilities: ["Read a repository", "Write a private candidate", "Run a fixed check", "Read reference material"],
      process: [
        { label: "Process", value: "synthetic pid 41022" },
        { label: "Resident memory", value: "212 MB (synthetic)" },
      ],
    },
  },
  {
    id: "rt-hermes",
    name: "Hermes",
    location: "Local process",
    configurationOwner: "native",
    installed: true,
    revision: 6,
    savedAt: "2026-09-18T17:40:00.000Z",
    connection: { state: "disconnected", connectionId: null, configuration: null, since: null },
    admission: "enabled",
    usedBy: ["ap-attention"],
    boundRuns: [],
    history: [
      {
        connectionId: "syn-hermes-conn-1",
        label: "Hermes on this Mac",
        connectedAt: "2026-09-12T08:00:00.000Z",
        disconnectedAt: "2026-09-18T17:40:00.000Z",
        runsRecorded: 4,
      },
    ],
    facts: {
      observedVersion: "Synthetic build",
      protocol: "Synthetic one-shot job",
      capabilities: ["Read reference material", "Produce a decision material", "Read the Attention queue"],
      process: null,
    },
  },
  {
    id: "rt-codex",
    name: "Codex",
    location: "Local process",
    configurationOwner: "native",
    installed: false,
    revision: 1,
    savedAt: "2026-09-10T12:00:00.000Z",
    connection: { state: "not-connected", connectionId: null, configuration: null, since: null },
    admission: "enabled",
    usedBy: [],
    boundRuns: [],
    history: [],
    facts: { observedVersion: null, protocol: null, capabilities: [], process: null },
  },
];

export function createRuntimeManagementFixture({ pause = wait, readDelay = 160, commandDelay = 520 } = {}) {
  let variant = "normal";
  let records = SEED.map(copy);
  let instant = 0;
  /* Everything an owner remembers about a command, keyed by operation id. */
  let ledger = new Map();
  const trace = [];
  let otherWriterPending = false;
  let loseNextReply = false;
  let staleNextRead = false;
  let staleSnapshot = null;

  const nextInstant = () => INSTANTS[Math.min(instant++, INSTANTS.length - 1)];
  const recordOf = (id) => {
    const record = records.find((entry) => entry.id === id);
    if (!record) refuse("runtime_missing", "That runtime is not part of this preview.");
    return record;
  };

  function availabilityOf(record) {
    return record.installed
      ? { status: "available", reason: null }
      : {
          status: "unavailable",
          reason: `This example reports no ${record.name} installation on this device.`,
        };
  }

  function effective(record) {
    const availability = availabilityOf(record);
    if (availability.status === "unavailable")
      return { effective: false, reason: `Not taking new work: ${availability.reason}` };
    if (record.connection.state !== "connected")
      return { effective: false, reason: "Not taking new work: it is not connected." };
    if (record.admission === "disabled")
      return {
        effective: false,
        reason: `Not taking new work: disabled for new work at revision ${record.admissionRevision}.`,
      };
    return {
      effective: true,
      reason: `Takes new work. An agent that chooses ${record.name} can start its next run here.`,
    };
  }

  function actionsOf(record) {
    if (variant === "read-only") {
      const reason = "This host cannot change a runtime yet. You can read it here; nothing is sent.";
      const kinds = record.connection.state === "connected" ? ["reconnect", "disable", "disconnect"] : ["connect"];
      return Object.fromEntries(kinds.map((kind) => [kind, { supported: false, reason }]));
    }
    if (!record.installed)
      return {
        connect: {
          supported: false,
          reason: `Nothing to connect: this example reports no ${record.name} installation. That is a fact about this device, not a permission decision.`,
        },
      };
    if (record.connection.state !== "connected") return { connect: { supported: true, reason: null } };
    const actions = { reconnect: { supported: true, reason: null } };
    actions[record.admission === "enabled" ? "disable" : "enable"] = { supported: true, reason: null };
    actions.disconnect = record.boundRuns.length
      ? {
          supported: false,
          reason: `A run is bound to this connection, so it cannot be disconnected now. Disconnecting never stops a run; this becomes available when ${record.boundRuns.map((run) => run.runId).join(", ")} ends.`,
        }
      : { supported: true, reason: null };
    return actions;
  }

  function authenticationOf(record) {
    if (record.configurationOwner === "courtwork") {
      const chosen = REFERENCES.find((ref) => ref.id === record.connection.configuration?.credentialRefId);
      return {
        owner: "courtwork",
        status: chosen ? chosen.status : "missing",
        nativeNextStep: null,
        references: REFERENCES.map(copy),
      };
    }
    return {
      owner: "native",
      status: !record.installed ? "unknown" : record.connection.state === "connected" ? "reported-signed-in" : "not-reported",
      /* A next step only while there is one to take. */
      nativeNextStep: record.installed && record.connection.state !== "connected"
        ? `Sign in inside ${record.name}, with its own setup. CourtWork does not read, copy or store that sign-in; connecting only asks ${record.name} whether it reports one.`
        : null,
      references: [],
    };
  }

  function ownershipOf(record) {
    return record.configurationOwner === "courtwork"
      ? {
          configuration: `Configured by CourtWork. ${possessive(record.name)} own settings files are not written.`,
          authentication: "Uses a credential reference from Models. The key stays with its Models connection and is never shown here.",
          model: "Model choice belongs to Models.",
        }
      : {
          configuration: `Configured in ${record.name} itself. CourtWork keeps only its own connection record.`,
          authentication: `${record.name} holds its own sign-in. CourtWork reads whether it reports one.`,
          model: `${record.name} chooses its own model; CourtWork reads that choice.`,
        };
  }

  function proposalOf(record) {
    return record.configurationOwner === "courtwork"
      ? {
          defaultLabel: `${record.name} on this Mac`,
          writes: [
            `A CourtWork connection record for ${record.name}, with the name above.`,
            "Which Models credential reference it uses.",
          ],
          leaves: [
            `${possessive(record.name)} own settings files and installation.`,
            "The key itself, which stays with its Models connection.",
            "Runs already recorded and the bindings they hold.",
          ],
        }
      : {
          defaultLabel: `${record.name} on this Mac`,
          writes: [`A CourtWork connection record for ${record.name}, with the name above.`],
          leaves: [
            `${possessive(record.name)} own configuration, sign-in and installation.`,
            "Earlier connections and the runs they recorded.",
          ],
        };
  }

  function detailFor(record) {
    const admission = effective(record);
    return {
      id: record.id,
      name: record.name,
      example: true,
      location: record.location,
      revision: record.revision,
      savedAt: record.savedAt,
      availability: availabilityOf(record),
      configurationOwner: record.configurationOwner,
      ownership: ownershipOf(record),
      authentication: authenticationOf(record),
      connection: copy(record.connection),
      proposal: proposalOf(record),
      admission: { saved: record.admission, effective: admission.effective, effectiveReason: admission.reason },
      boundRuns: copy(record.boundRuns),
      usedBy: record.usedBy.map((id) => ({ id, name: PROFILES[id] })),
      history: copy(record.history),
      facts: {
        ...copy(record.facts),
        process: record.connection.state === "connected" ? copy(record.facts.process) : null,
      },
      actions: actionsOf(record),
    };
  }

  function rowFor(record) {
    const connected = record.connection.state === "connected";
    return {
      id: record.id,
      name: record.name,
      example: true,
      location: record.location,
      availability: availabilityOf(record),
      configurationOwner: record.configurationOwner,
      connection: record.connection.state,
      admission: { saved: record.admission, effective: effective(record).effective },
      usedBy: record.usedBy.map((id) => PROFILES[id]),
      boundRunCount: record.boundRuns.length,
      revision: record.revision,
      nextAction: {
        label: !record.installed ? "Details" : connected ? "Manage" : "Connect",
        targetId: record.id,
      },
    };
  }

  function apply(record, request) {
    const at = nextInstant();
    switch (request.kind) {
      case "connect": {
        const sequence = record.history.length + 1;
        record.connection = {
          state: "connected",
          connectionId: `syn-${record.id.slice(3)}-conn-${sequence}`,
          configuration: copy(request.configuration),
          since: at,
        };
        break;
      }
      case "reconnect":
        /* Same connection identity; its configuration is what the person asked
           for this time. */
        record.connection = { ...record.connection, configuration: copy(request.configuration), since: at };
        break;
      case "disable":
        record.admission = "disabled";
        record.admissionRevision = record.revision + 1;
        break;
      case "enable":
        record.admission = "enabled";
        record.admissionRevision = record.revision + 1;
        break;
      case "disconnect":
        /* Only the connection this command describes goes. The runtime, its
           identity and every run recorded under that connection stay. */
        record.history.push({
          connectionId: record.connection.connectionId,
          label: record.connection.configuration.label,
          connectedAt: record.connection.since,
          disconnectedAt: at,
          runsRecorded: 2,
        });
        record.connection = { state: "disconnected", connectionId: null, configuration: null, since: null };
        break;
    }
    record.revision += 1;
    record.savedAt = at;
  }

  return {
    trace: () => copy(trace),
    variants: VARIANTS,
    get variant() {
      return variant;
    },
    configure(next) {
      if (!VARIANTS.includes(next)) throw new Error("Unknown preview scenario.");
      variant = next;
      otherWriterPending = next === "stale-revision";
      loseNextReply = next === "lost-reply";
      staleNextRead = next === "stale-read-back";
      staleSnapshot = null;
    },
    reset() {
      records = SEED.map(copy);
      ledger = new Map();
      trace.length = 0;
      instant = 0;
      variant = "normal";
      otherWriterPending = false;
      loseNextReply = false;
      staleNextRead = false;
      staleSnapshot = null;
    },

    capabilities() {
      return variant === "read-only"
        ? { canManage: false, reason: "This host cannot change a runtime yet. You can read it here; nothing is sent." }
        : { canManage: true, reason: "" };
    },

    async list() {
      trace.push({ call: "list" });
      await pause(readDelay);
      if (variant === "read-error") throw new Error("The runtime list could not be read. Nothing on this page was changed.");
      if (variant === "empty") return { rows: [] };
      return { rows: records.map(rowFor) };
    },

    async open(id) {
      trace.push({ call: "open", id });
      await pause(readDelay);
      if (staleSnapshot?.id === id) {
        const stale = staleSnapshot;
        staleSnapshot = null;
        trace.push({ effect: "stale-read", id, revision: stale.revision });
        return stale;
      }
      return detailFor(recordOf(id));
    },

    async command(id, request) {
      trace.push({ call: "command", id, operationId: request.operationId, kind: request.kind, expectedRevision: request.expectedRevision });
      await pause(commandDelay);
      /* The same operation id is the same command. It is answered from the
         ledger and changes nothing a second time. */
      const known = ledger.get(request.operationId);
      if (known) {
        trace.push({ effect: "replayed", operationId: request.operationId });
        if (known.status === "confirmed") return copy(known.receipt);
        refuse(known.code, known.message);
      }
      const record = recordOf(id);
      const settle = (code, message) => {
        ledger.set(request.operationId, { status: "refused", code, message });
        refuse(code, message);
      };
      if (otherWriterPending) {
        /* A real second writer: another window renamed Pi's connection and saved
           first, so the revision this page holds no longer exists. */
        otherWriterPending = false;
        if (record.connection.configuration) record.connection.configuration.label = `${record.name} (renamed in another window)`;
        record.revision += 1;
        record.savedAt = nextInstant();
        trace.push({ effect: "other-writer", id, revision: record.revision });
      }
      if (record.revision !== request.expectedRevision)
        settle(
          "runtime_conflict",
          `${record.name} was changed elsewhere and is now at revision ${record.revision}. This command was composed against revision ${request.expectedRevision}; nothing was changed.`,
        );
      const support = actionsOf(record)[request.kind];
      if (!support?.supported)
        settle("action_unsupported", support?.reason || `${request.kind} does not apply to ${record.name} now. Nothing was changed.`);
      if (variant === "connect-refused" && request.kind === "connect")
        settle(
          "connect_refused",
          `${record.name} did not report a signed-in session, so nothing was connected. Your connection name is kept.`,
        );
      if (request.kind === "connect" || request.kind === "reconnect") {
        const ref = REFERENCES.find((entry) => entry.id === request.configuration?.credentialRefId);
        if (record.configurationOwner === "courtwork" && ref?.status !== "configured")
          settle("connect_refused", "That credential reference has no key in Models, so nothing was connected.");
      }
      if (staleNextRead) {
        staleNextRead = false;
        staleSnapshot = detailFor(record);
      }
      apply(record, request);
      const receipt = {
        operationId: request.operationId,
        runtimeId: id,
        kind: request.kind,
        revision: record.revision,
        connectionId: record.connection.connectionId,
      };
      ledger.set(request.operationId, { status: "confirmed", receipt });
      trace.push({ effect: request.kind, id, operationId: request.operationId, revision: record.revision });
      if (loseNextReply) {
        /* Committed, and then the answer never arrives. */
        loseNextReply = false;
        trace.push({ effect: "reply-lost", operationId: request.operationId });
        throw new Error("The connection closed before the host answered.");
      }
      return copy(receipt);
    },

    async operationStatus(id, operationId) {
      trace.push({ call: "status", id, operationId });
      await pause(readDelay);
      const known = ledger.get(operationId);
      /* `not-applied` is a promise that the operation can never apply, not
         "no record found". This owner can keep that promise, because every
         command passes through this ledger: it closes the id here, so a
         request that was only delayed and arrives later is refused. An owner
         that cannot close an id must answer `pending` or `inconclusive`. */
      if (!known) {
        ledger.set(operationId, {
          status: "refused",
          code: "operation_closed",
          message: "This command was reported as not applied and can no longer apply. Nothing was changed.",
        });
        trace.push({ effect: "operation-closed", operationId });
        return { status: "not-applied" };
      }
      if (known.status === "confirmed") return { status: "confirmed", receipt: copy(known.receipt) };
      return { status: "refused", code: known.code, message: known.message };
    },
  };
}
