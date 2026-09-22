/* Synthetic Runtime Control owner for the E1 Agent choice. Explicitly opt-in:
 * tests and the preview script import it; the product never falls back to it.
 * Shapes follow the candidate K3 contract (evidence/e1-backend-contract-
 * 20260922): one whole-configuration `revision`, session-scope
 * `profileSelections`, an effective `composition`, and exact profile JSON from
 * the resource endpoint. Every title, hash and Kit here is invented. */

export const SCENARIOS = ["normal", "conflict", "active-run", "lost-reply", "read-error", "missing-resource", "refused"];
const copy = (value) => structuredClone(value);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const hash = (n) => String(n).repeat(64).slice(0, 64);
const fail = (status, code, message) => { throw Object.assign(new Error(message), { status, body: { error: { code, message } } }); };

const CODING_SOURCE = {
  schemaVersion: 2,
  version: "1.0.0",
  resourceIds: ["local:coding-rules", "local:review-reference"],
  rules: [],
  uiSlots: [],
  kits: [{ descriptor: { schemaVersion: 1, id: "coding-review", version: "0.2.0", core: [], deferred: [], requirements: [], conflicts: [] }, descriptorSha256: hash(7) }],
};
const NOTES_SOURCE = { version: "1.0.0", resourceIds: ["local:notes-style"], rules: [], uiSlots: [] };

export function createAgentChoiceFixture({ pause = wait, delay = 120, sessionId = "session-synthetic" } = {}) {
  let scenario = "normal";
  let revision = 12;
  let selections = [];
  let conflictPending = false;
  let readFailures = 0;
  const calls = [];
  const resources = () => [
    { id: "agent:general", kind: "agent_profile", title: "General", source: { type: "builtin" }, scope: { type: "user", id: "local" }, health: "healthy" },
    { id: "local:coding", kind: "agent_profile", title: "Coding", description: "Fix a defect in the connected folder with approval before each edit.", source: { type: "local-config", hash: hash(3) }, scope: { type: "user", id: "local" }, health: "healthy" },
    { id: "local:notes", kind: "agent_profile", title: "Notes", description: "Draft and revise notes from connected material.", source: { type: "local-config", hash: hash(5) }, scope: { type: "user", id: "local" }, health: "healthy" },
    { id: "local:coding-rules", kind: "instruction", title: "Coding rules", source: { type: "local-config", hash: hash(8) }, scope: { type: "user", id: "local" } },
    { id: "local:review-reference", kind: "reference", title: "Review checklist", source: { type: "local-config", hash: hash(9) }, scope: { type: "user", id: "local" } },
    ...(scenario === "missing-resource" ? [] : [{ id: "local:notes-style", kind: "instruction", title: "Notes style", source: { type: "local-config", hash: hash(4) }, scope: { type: "user", id: "local" } }]),
  ];
  function composition() {
    const selected = selections.find((entry) => entry.scope.type === "session" && entry.scope.id === sessionId)?.id ?? "agent:general";
    if (selected === "agent:general") return { id: "agent:general", version: null, hash: null, status: "compatible", resourceIds: null, uiSlots: [], missing: [] };
    if (selected === "local:coding") return { id: "local:coding", version: "1.0.0", hash: hash(3), status: "compatible", resourceIds: CODING_SOURCE.resourceIds, uiSlots: [], missing: [], schemaVersion: 2, kits: copy(CODING_SOURCE.kits), selectionScope: { type: "session", id: sessionId } };
    const missing = scenario === "missing-resource" ? ["local:notes-style"] : [];
    return { id: "local:notes", version: "1.0.0", hash: hash(5), status: missing.length ? "unavailable" : "compatible", resourceIds: NOTES_SOURCE.resourceIds, uiSlots: [], missing };
  }
  const snapshot = () => ({
    protocolVersion: 1, revision, sessionId, scopes: [{ type: "user", id: "local" }, { type: "session", id: sessionId }],
    activeRuns: scenario === "active-run" ? 1 : 0, adapterId: "pi", resources: resources(), composition: composition(),
    profileSelections: copy(selections), policies: [], context: [], audit: [], kinds: [], compatibility: { hotSwap: "between-runs" },
  });
  const apply = (id) => {
    selections = selections.filter((entry) => !(entry.scope.type === "session" && entry.scope.id === sessionId));
    if (id !== null) selections.push({ scope: { type: "session", id: sessionId }, id });
    revision += 1;
  };

  const adapter = {
    async read(id) {
      calls.push({ kind: "read", id });
      await pause(delay);
      if (readFailures > 0) { readFailures -= 1; throw new Error("The Host did not answer."); }
      return snapshot();
    },
    async source(id, resourceId) {
      calls.push({ kind: "source", id: resourceId });
      await pause(delay);
      const resource = resources().find((entry) => entry.id === resourceId);
      if (!resource) fail(404, "resource_not_found", "Resource not found");
      const content = resourceId === "local:coding" ? JSON.stringify(CODING_SOURCE) : resourceId === "local:notes" ? JSON.stringify(NOTES_SOURCE) : null;
      return { resource, content };
    },
    async select(id, body) {
      calls.push({ kind: "select", ...copy(body) });
      await pause(delay * 2);
      if (conflictPending) { conflictPending = false; apply("local:notes"); }
      if (scenario === "active-run") fail(409, "active_run", "A run is active; configuration is frozen until it ends.");
      if (body.revision !== revision) fail(409, "runtime_conflict", "Runtime configuration changed; reload and retry.");
      if (scenario === "refused") fail(400, "invalid_runtime_change", "Profile is unavailable in this scope");
      apply(body.id);
      if (scenario === "lost-reply") throw new Error("Network connection lost.");
      return snapshot();
    },
  };
  return {
    adapter,
    calls: () => copy(calls),
    configure(next) {
      if (!SCENARIOS.includes(next)) throw new Error("Unknown scenario");
      scenario = next;
      conflictPending = next === "conflict";
      readFailures = next === "read-error" ? 1 : 0;
    },
    /** Another writer changes the whole configuration (not this chat's selection). */
    otherWrite() { revision += 1; },
    select(id) { apply(id); },
    get revision() { return revision; },
  };
}
