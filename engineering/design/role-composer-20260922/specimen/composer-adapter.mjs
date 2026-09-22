/* Synthetic owners for the Role-first Composer specimen. No network, no
 * credential, no disk, no product state.
 *
 * It does not introduce a second Agent cast. Profiles, Roles, Kits, runtimes,
 * models and permission effects come from the accepted 06a synthetic fixture
 * (`app/tests/fixtures/agent-profiles/adapter.mjs`), imported unchanged, so the
 * Composer and the Settings page it links to read and save *the same* synthetic
 * records. This wrapper adds only what a Composer needs and 06a never modelled:
 *
 *   - the chat's facts (title, Work location, a Run in flight and the profile
 *     revision it is bound to, the default Agent for the chat) — gap G1/G2;
 *   - the global model snapshot the product's model card reads (Models, All
 *     chats · future runs), held in memory here;
 *   - scenario transforms on the 06a replies (a Kit whose declared support
 *     moved, long names, a failing list read). Each is applied to the reply,
 *     never to the 06a module's own records.
 */

import { createAgentProfilesFixture } from "../../../../app/tests/fixtures/agent-profiles/adapter.mjs";

export const SCENARIOS = [
  ["normal", "Normal"],
  ["bound-run", "Run in progress (Coding · rev 7)"],
  ["runtime-unavailable", "Pi unavailable"],
  ["kit-undeclared", "Kit 0.5 undeclared for Hermes · unchecked"],
  ["kit-stale-evidence", "Kit 0.5 with 0.4 evidence · unchecked"],
  ["kit-unsupported", "Kit verified unsupported on Hermes"],
  ["long-names", "Long names"],
  ["list-error", "Agent list read fails once"],
];

const copy = (value) => structuredClone(value);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const LONG = {
  "ap-work": {
    name: "General work for drafting, revising and summarising connected materials",
    responsibility: "Ordinary work across everything you connect: read it, draft from it, revise the draft with you, and keep the sources attached.",
  },
  "ap-coding": {
    name: "Coding · repository defect repair with approval before every edit",
    responsibility: "Fix a defect in the connected repository: read, propose one exact edit, wait for your approval, then run the project's own check.",
  },
  "ap-attention": {
    name: "Attention triage and follow-up coordination for field-work handoffs",
    responsibility: "Triage what is waiting on you, group the follow-ups, and prepare the decision material each one needs.",
  },
};

export function createComposerFixture({ pause = wait } = {}) {
  const profiles = createAgentProfilesFixture({ pause });
  let scenario = "normal";
  let listFailures = 0;
  const log = [];
  let model = {
    version: 3,
    config: { provider: "synthetic-provider", model: "Synthetic model", api: "openai-completions", reasoningEffort: "medium" },
    connection: { id: "conn-synthetic", kind: "compatible", providerIdentity: "synthetic-provider", baseUrl: "https://models.synthetic.invalid/v1", api: "openai-completions" },
    credentialStatus: "configured",
    reasoningCapability: { kind: "enum", values: ["low", "medium", "high"], source: "runtime-catalog" },
  };

  function rename(id, record) {
    if (scenario !== "long-names" || !LONG[id]) return record;
    return { ...record, ...LONG[id] };
  }
  function detailOf(detail) {
    const out = copy(detail);
    out.profile = rename(out.profile.id, out.profile);
    if (scenario === "long-names")
      out.kits = out.kits.map((kit) => kit.id === "kit-praxis" ? { ...kit, name: "Praxis field-work collaboration and decision material" } : kit);
    /* Three compatibility cases on the same pair, each with one cause
       (06E-R1). Evidence records are explicitly synthetic owner records. */
    const praxis = (patch) => { out.kits = out.kits.map((kit) => kit.id === "kit-praxis" ? { ...kit, ...patch(kit) } : kit); };
    if (scenario === "kit-undeclared")
      /* Praxis 0.5 declares Pi only and no owner has checked it on Hermes:
         unchecked, not unsupported. */
      praxis((kit) => ({ version: "0.5", supportedRuntimeIds: ["rt-pi"], compatibility: kit.compatibility.filter((r) => r.runtimeId !== "rt-hermes").map((r) => ({ ...r, kitVersion: "0.5" })) }));
    if (scenario === "kit-stale-evidence")
      /* The only Hermes record was made for 0.4; it does not speak for 0.5. */
      praxis(() => ({ version: "0.5" }));
    if (scenario === "kit-unsupported")
      /* An owner record for exactly this Kit version and runtime revision. */
      praxis((kit) => ({ compatibility: kit.compatibility.map((r) => r.runtimeId === "rt-hermes" ? { ...r, result: "unsupported", evidenceRef: "synthetic check · Praxis 0.4 on Hermes · refused" } : r) }));
    return out;
  }

  const adapter = {
    /* ── 06a's five calls, passed through the scenario transform ───────── */
    async list() {
      if (listFailures > 0) {
        listFailures -= 1;
        await pause(200);
        log.push({ kind: "list", ok: false });
        throw Object.assign(new Error("The host did not answer the agent list."), { code: "list_failed" });
      }
      const result = await profiles.list();
      log.push({ kind: "list", ok: true });
      return { rows: result.rows.map((row) => rename(row.id, row)) };
    },
    async open(id) {
      const detail = await profiles.open(id);
      log.push({ kind: "open", id, revision: detail.profile.revision });
      return detailOf(detail);
    },
    async save(id, draft, expectedRevision) {
      const detail = await profiles.save(id, draft, expectedRevision);
      log.push({ kind: "save", id, revision: detail.profile.revision });
      return detailOf(detail);
    },
    runtimeDetail: (id) => profiles.runtimeDetail(id),
    capabilities: () => profiles.capabilities(),

    /* ── Composer-only facts (proposed; no owner implements them yet) ──── */
    chat() {
      return {
        id: "chat-synthetic",
        title: "Checkout retries twice after a timeout",
        workLocation: { projectName: "Checkout service", rootPath: "/synthetic/checkout-service" },
        /* A chat continues with the Agent its last run used. */
        defaultProfileId: scenario === "bound-run" ? "ap-coding" : "ap-work",
        activeRun: scenario === "bound-run"
          ? { runId: "synthetic-run-311", profileId: "ap-coding", profileRevision: 7 }
          : null,
      };
    },
    modelSnapshot: () => copy(model),
    /** The product card's effort save, in memory: same scope words, same
     * active-Run refusal. It changes every chat's future runs, not the Agent. */
    async saveEffort(effort, expectedVersion) {
      await pause(300);
      if (scenario === "bound-run") throw Object.assign(new Error("Available after this run ends."), { code: "active_run" });
      if (expectedVersion !== model.version) throw Object.assign(new Error("Saved settings changed elsewhere."), { code: "config_conflict" });
      model = { ...model, version: model.version + 1, config: { ...model.config, reasoningEffort: effort ?? null } };
      log.push({ kind: "model-effort", effort: effort ?? null, version: model.version });
      return copy(model);
    },
  };

  return {
    adapter,
    scenarios: SCENARIOS.map(([id]) => id),
    get scenario() {
      return scenario;
    },
    configure(next) {
      if (!SCENARIOS.some(([id]) => id === next)) throw new Error("Unknown specimen scenario.");
      scenario = next;
      profiles.configure(next === "runtime-unavailable" ? "runtime-unavailable" : "normal");
      listFailures = next === "list-error" ? 1 : 0;
    },
    log: () => copy(log),
  };
}
