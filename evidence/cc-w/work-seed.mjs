// FE-03 · copied verbatim from evidence/wk10b2-main-integration-20260908/seed.mjs, port only.
/* WO-WK10b 第二段 · every work state this round is checked against is produced
 * by the product's own HTTP routes against a running server: the extension is
 * loaded through its lifecycle route, the binding is created through the
 * binding route, and the candidate is proposed by an actual Run whose tool call
 * goes through Pi and the work adapter. Nothing is written into Core behind the
 * API, and no packet is pasted in from the fixture file.
 *
 * The host reports capabilities.mode = "local-fake": the loopback fake provider
 * answers, no real provider is configured and no credential file is read.
 *
 *   WK10B2_BASE=http://127.0.0.1:8901 node seed.mjs
 */
import { writeFile } from "node:fs/promises";
import { buildReview } from "../../app/domains/inbound-nda/index.mjs";
import { SYNTHETIC_SOURCES, NORMAL_FACTS } from "../../app/domains/inbound-nda/fixtures.mjs";
import { FAKE_CREDENTIAL_KEY } from "../../app/runtime/pi-session-runtime.mjs";

const BASE = process.env.WK10B2_BASE ?? "http://127.0.0.1:8901";
const token = (await (await fetch(`${BASE}/api/v5/bootstrap`)).json()).sessionToken;

async function api(method, path, body) {
  const res = await fetch(`${BASE}/api/v5${path}`, {
    method,
    headers: { "content-type": "application/json", "x-work-token": token },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return { status: res.status, json: text ? JSON.parse(text) : null };
}
const ok = (result, what) => {
  if (result.status !== 200) throw new Error(`${what}: ${result.status} ${JSON.stringify(result.json)}`);
  return result.json;
};
const scriptInput = (calls) => `/fixture script ${JSON.stringify(calls)}`;

async function pollRun(runId) {
  const terminal = new Set(["completed", "failed", "cancelled", "unknown"]);
  for (let i = 0; i < 400; i++) {
    const run = ok(await api("GET", `/runs/${runId}`), "run").run;
    if (terminal.has(run.status)) return run;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error("run did not settle");
}

async function propose(sessionId, commandId) {
  const projection = ok(await api("GET", `/sessions/${sessionId}/surface`), "surface").projection;
  const review = buildReview({ sources: projection.sources, facts: projection.domain.facts });
  const created = ok(
    await api("POST", `/sessions/${sessionId}/runs`, {
      commandId,
      input: scriptInput([{ name: "se_submit_candidate", arguments: { domain: review } }]),
    }),
    "run create",
  );
  const run = await pollRun(created.run.id);
  if (run.status !== "completed") throw new Error(`proposal run ${run.status}`);
  return run;
}

async function bind(projectId, title, facts) {
  const session = ok(await api("POST", "/sessions", { projectId, title }), "session").session;
  ok(
    await api("POST", `/sessions/${session.id}/extension`, {
      extensionId: "inbound-nda",
      input: { title, sourceText: SYNTHETIC_SOURCES[0].text, facts },
    }),
    "binding",
  );
  return session;
}

ok(await api("PUT", "/provider-credential", { provider: "fake-openai-loopback", apiKey: FAKE_CREDENTIAL_KEY }), "credential");
ok(await api("POST", "/extensions/inbound-nda/lifecycle", { action: "load" }), "lifecycle");
const project = ok(await api("POST", "/projects", { name: "NDA review" }), "project").project;
const other = ok(await api("POST", "/projects", { name: "Other project" }), "other project").project;

// A · a complete synthetic review: every rule resolved, so the packet
// advertises accept alongside reject and request evidence.
const complete = await bind(project.id, "Complete NDA review", NORMAL_FACTS);
const completeRun = await propose(complete.id, "review");

// B · the same playbook against facts whose term is unknown: one rule stays
// unresolved, so the packet advertises only reject and request evidence.
const unresolvedFacts = structuredClone(NORMAL_FACTS);
unresolvedFacts.term = { years: "unknown" };
const unresolved = await bind(project.id, "Unresolved NDA review", unresolvedFacts);
const unresolvedRun = await propose(unresolved.id, "review");

// C · a synthetic conflicting fact, which the playbook resolves to the one
// status word this product is allowed to colour.
const conflictFacts = structuredClone(NORMAL_FACTS);
conflictFacts.use = { purpose: { state: "conflict" } };
const conflicting = await bind(project.id, "Conflicting NDA review", conflictFacts);
const conflictingRun = await propose(conflicting.id, "review");

// D · an unbound Session in the same project, for «Continue existing».
const continuation = ok(
  await api("POST", "/sessions", { projectId: project.id, title: "Continue this work" }),
  "continuation session",
).session;
// E · an unbound Session in another project, which must never see this
// project's work in its own binding panel.
const outside = ok(
  await api("POST", "/sessions", { projectId: other.id, title: "Other project session" }),
  "outside session",
).session;

const completePacket = ok(await api("GET", `/sessions/${complete.id}/surface`), "surface A").projection;
const unresolvedPacket = ok(await api("GET", `/sessions/${unresolved.id}/surface`), "surface B").projection;
const conflictingPacket = ok(await api("GET", `/sessions/${conflicting.id}/surface`), "surface C").projection;

const seed = {
  base: BASE,
  capabilities: (await (await fetch(`${BASE}/api/v5/bootstrap`)).json()).capabilities,
  projectId: project.id,
  otherProjectId: other.id,
  sessions: {
    complete: complete.id,
    unresolved: unresolved.id,
    conflicting: conflicting.id,
    continuation: continuation.id,
    outside: outside.id,
  },
  runs: { complete: completeRun.id, unresolved: unresolvedRun.id, conflicting: conflictingRun.id },
  matterId: completePacket.matter.id,
  candidates: {
    complete: completePacket.candidates[0].id,
    unresolved: unresolvedPacket.candidates[0].id,
    conflicting: conflictingPacket.candidates[0].id,
  },
  sources: {
    complete: completePacket.sources.map(({ id, version, digest }) => ({ id, version, digest })),
  },
  enums: {
    complete: completePacket.humanActions.find((a) => a.action === "decide").payloadSchema.properties.action.enum,
    unresolved: unresolvedPacket.humanActions.find((a) => a.action === "decide").payloadSchema.properties.action.enum,
  },
  statuses: {
    complete: completePacket.candidates[0].domain.findings.map((f) => [f.ruleId, f.status]),
    unresolved: unresolvedPacket.candidates[0].domain.findings.map((f) => [f.ruleId, f.status]),
    conflicting: conflictingPacket.candidates[0].domain.findings.map((f) => [f.ruleId, f.status]),
  },
};
await writeFile(new URL("./work-seed.json", import.meta.url), JSON.stringify(seed, null, 2));
console.log(JSON.stringify(seed, null, 2));
