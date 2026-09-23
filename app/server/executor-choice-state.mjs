import { createHash } from "node:crypto";

// These two IDs are the frozen schema-21 native lineages. The factory allowlist
// lives in runtime.mjs; Store never discovers executables or credentials.
export const PI_EXECUTOR_ID = "pi-coding-agent@0.85.1/agent-session";
export const MANAGED_EXECUTOR_ID = "agents-api";
export const EXECUTOR_OPERATIONS = Object.freeze([
  "start", "continue", "steer", "cancel", "compact", "recover", "submitToolResult",
]);
const REF = /^sha256:[0-9a-f]{64}$/;
const record = value => value !== null && typeof value === "object" && !Array.isArray(value);
const fail = message => { const error = new Error("invalid runtime state: " + message); error.code = "INVALID_STATE"; throw error; };
const requireTrue = (condition, message) => { if (!condition) fail(message); };
const exact = (value, keys, label) => requireTrue(record(value) &&
  Object.keys(value).sort().join(",") === [...keys].sort().join(","), label + " has unsupported or missing fields");
const revisionNumber = value => Number.isSafeInteger(value) && value >= 0;
const boundedId = value => typeof value === "string" && value.length > 0 && value.length <= 200;

export function executorConfigurationRef({ adapterId, revision, protocol, endpointIdentity = null }) {
  requireTrue(boundedId(adapterId) && boundedId(revision) && boundedId(protocol), "executor factory identity is invalid");
  requireTrue(endpointIdentity === null || boundedId(endpointIdentity), "executor endpoint identity is invalid");
  return "sha256:" + createHash("sha256").update(JSON.stringify([adapterId, revision, protocol, endpointIdentity])).digest("hex");
}

export function validateExecutorChoice(value) {
  exact(value, ["revision", "adapterId", "configurationRef"], "executorChoice");
  requireTrue(revisionNumber(value.revision), "executorChoice.revision is invalid");
  requireTrue(value.adapterId === null || boundedId(value.adapterId), "executorChoice.adapterId is invalid");
  requireTrue(value.configurationRef === null || REF.test(value.configurationRef), "executorChoice.configurationRef is invalid");
  requireTrue(value.adapterId !== null || value.configurationRef === null, "null executor choice has a configuration ref");
  return value;
}

export function validateExecutorDescriptor(value) {
  exact(value, ["adapterId", "revision", "configurationRef", "capabilities"], "executorDescriptor");
  requireTrue(boundedId(value.adapterId) && boundedId(value.revision) && REF.test(value.configurationRef), "executorDescriptor identity is invalid");
  validateCapabilities(value.capabilities);
  return value;
}

function validateCapabilities(value) {
  exact(value, EXECUTOR_OPERATIONS, "executor capabilities");
  for (const operation of EXECUTOR_OPERATIONS) {
    const row = value[operation];
    requireTrue(record(row) && typeof row.supported === "boolean" &&
      Object.keys(row).every(key => key === "supported" || key === "reason") &&
      (row.supported ? row.reason === undefined : typeof row.reason === "string" && row.reason.length > 0 && row.reason.length <= 4000),
    "executor capabilities." + operation + " is invalid");
  }
}

export function validateExecutorBinding(value, { child = false } = {}) {
  if (value === null) {
    requireTrue(child, "executorBinding null without Spark child owner");
    return value;
  }
  requireTrue(!child, "Spark child has an ordinary executorBinding");
  requireTrue(record(value), "executorBinding must be an object");
  if (value.recording === "legacy") {
    exact(value, ["recording", "revision", "configurationRef", "capabilities", "choiceRevision"], "legacy executorBinding");
    requireTrue(value.revision === null && value.configurationRef === null && value.capabilities === null &&
      value.choiceRevision === null, "legacy executorBinding invents a fact");
    return value;
  }
  exact(value, ["recording", "revision", "configurationRef", "capabilities", "choiceRevision"], "bound executorBinding");
  requireTrue(value.recording === "bound" && revisionNumber(value.choiceRevision) &&
    boundedId(value.revision) && REF.test(value.configurationRef), "bound executorBinding identity is invalid");
  validateCapabilities(value.capabilities);
  return value;
}

export function sparkAssignmentForSession(state, sessionId) {
  return state.subagents?.assignments?.find(assignment =>
    assignment.attempts.some(attempt => attempt.sessionId === sessionId)) ?? null;
}

export function isSparkChildRun(state, run) {
  const assignment = sparkAssignmentForSession(state, run.sessionId);
  return Boolean(assignment?.attempts.some(attempt => attempt.sessionId === run.sessionId && attempt.runId === run.id));
}

export function hasExecutorHistory(state, session) {
  return state.runs.some(run => run.sessionId === session.id) || session.hostSession !== null ||
    session.remoteBinding !== null || (session.remoteActions?.length ?? 0) > 0 ||
    Boolean(sparkAssignmentForSession(state, session.id));
}

/** Returns the provable nonchild adapter, null on contradiction, or undefined
 * when there is no Run/native evidence. Absence of a lost remote locator never
 * turns a recorded Agents Run into Pi. */
export function historicalExecutor(state, session) {
  const identities = new Set();
  for (const run of state.runs.filter(run => run.sessionId === session.id)) {
    if (isSparkChildRun(state, run)) continue;
    identities.add(run.adapterId);
    if (run.hostSession !== null) identities.add(PI_EXECUTOR_ID);
    if (run.remoteBinding !== null) identities.add(MANAGED_EXECUTOR_ID);
  }
  if (session.hostSession !== null) identities.add(PI_EXECUTOR_ID);
  if (session.remoteBinding !== null || session.remoteActions.length > 0) identities.add(session.remoteBinding?.runtimeId ?? MANAGED_EXECUTOR_ID);
  return identities.size > 1 ? null : identities.size === 1 ? [...identities][0] : undefined;
}

export function migrateExecutorState(state) {
  for (const session of state.sessions) {
    const child = Boolean(sparkAssignmentForSession(state, session.id));
    const adapterId = child ? PI_EXECUTOR_ID : historicalExecutor(state, session);
    session.executorChoice = { revision: 0, adapterId: adapterId === undefined ? PI_EXECUTOR_ID : adapterId, configurationRef: null };
  }
  for (const run of state.runs) run.executorBinding = isSparkChildRun(state, run) ? null : {
    recording: "legacy", revision: null, configurationRef: null, capabilities: null, choiceRevision: null,
  };
  return state;
}

export function validateExecutorState(state, previous = null) {
  const previousSessions = new Map(previous?.sessions?.map(session => [session.id, session]) ?? []);
  const previousRuns = new Map(previous?.runs?.map(run => [run.id, run]) ?? []);
  for (const session of state.sessions) {
    validateExecutorChoice(session.executorChoice);
    const child = Boolean(sparkAssignmentForSession(state, session.id));
    if (!child) {
      const historical = historicalExecutor(state, session);
      if (historical !== undefined) requireTrue(session.executorChoice.adapterId === historical,
        "Session executor choice contradicts Run/native history");
      if (historical === undefined) requireTrue(session.executorChoice.adapterId !== null,
        "empty Session has null executor choice");
    }
    const before = previousSessions.get(session.id);
    if (before && JSON.stringify(before.executorChoice) !== JSON.stringify(session.executorChoice)) {
      const priorRuns = previous.runs.filter(run => run.sessionId === session.id);
      if (priorRuns.length || before.hostSession !== null || before.remoteBinding !== null || before.remoteActions.length) {
        requireTrue(before.executorChoice.adapterId === session.executorChoice.adapterId &&
          before.executorChoice.configurationRef === null &&
          session.executorChoice.configurationRef !== null &&
          session.executorChoice.revision === before.executorChoice.revision + 1 &&
          state.runs.some(run => run.sessionId === session.id && !previousRuns.has(run.id) &&
            run.executorBinding?.recording === "bound" && run.executorBinding.choiceRevision === session.executorChoice.revision),
        "historical Session executor choice changed outside first pin");
      }
    }
  }
  for (const run of state.runs) {
    const child = isSparkChildRun(state, run);
    validateExecutorBinding(run.executorBinding, { child });
    const prior = previousRuns.get(run.id);
    if (prior) requireTrue(JSON.stringify(prior.executorBinding) === JSON.stringify(run.executorBinding),
      "Run executor binding changed");
    if (child) continue;
    const choice = state.sessions.find(session => session.id === run.sessionId)?.executorChoice;
    if (run.executorBinding?.recording === "bound") {
      requireTrue(choice?.adapterId === run.adapterId &&
        choice.configurationRef === run.executorBinding.configurationRef &&
        choice.revision === run.executorBinding.choiceRevision, "bound Run executor choice mismatch");
    } else if (!prior && previous) fail("new nonchild Run lacks a bound executor");
  }
}
