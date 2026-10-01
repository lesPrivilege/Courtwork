import assert from "node:assert/strict";
import { test } from "node:test";
import { boot } from "./helpers.mjs";

/* Formal-work input integrity (2026-09-30 convergence loop, S14, from a Sonnet
 * audit of the work path):
 * - replace_sources skipped the rules create_matter applies, so it stored a
 *   source nothing could read back (NUL, blank, beyond the adapter's limit);
 * - a candidate with duplicate obligation ids was stored and then could never
 *   be accepted, rejected or sent back;
 * - a human action checked for an idle Host but was not serialized with Run
 *   admission, so a Run could be admitted between that check and the commit. */
const SOURCE_TEXT = "Alpha beta gamma delta epsilon.";

async function memoSession(h) {
  await h.api("POST", "/extensions/evidence-memo/lifecycle", { action: "load" });
  const session = await h.createSession();
  const bound = await h.api("POST", `/sessions/${session.id}/extension`, { extensionId: "evidence-memo", input: { title: "integrity", sourceText: SOURCE_TEXT } });
  assert.equal(bound.status, 200, JSON.stringify(bound.json));
  const surface = (await h.api("GET", `/sessions/${session.id}/surface`)).json;
  return { session, surface };
}
const action = (h, session, surface, body) => h.api("POST", `/sessions/${session.id}/actions`, { extensionId: "evidence-memo", generation: surface.extension.generation, ...body });

test("replace_sources refuses a source that could not be read back, and the Matter stays usable", async () => {
  const h = await boot();
  try {
    const { session, surface } = await memoSession(h);
    const { createHash } = await import("node:crypto");
    const digest = (text) => createHash("sha256").update(text, "utf8").digest("hex");
    for (const text of ["bad\u0000text", "", "x".repeat(100_001)]) {
      const refused = await action(h, session, surface, { action: "replace_sources", payload: { revision: 2, sources: [{ id: "src-bad", version: 1, text, digest: digest(text) }] } });
      assert.equal(refused.status >= 400 && refused.status < 500, true, `refused: ${JSON.stringify(refused.json).slice(0, 200)}`);
    }
    const notList = await action(h, session, surface, { action: "replace_sources", payload: { revision: 2, sources: "not a list" } });
    assert.equal(notList.status, 409, JSON.stringify(notList.json));
    const after = await h.api("GET", `/sessions/${session.id}/surface`);
    assert.equal(after.status, 200);
    assert.equal(after.json.projection.matter.source_version, surface.projection.matter.source_version, "nothing was committed");
  } finally { await h.runtime.close(); }
});

test("a candidate proposing duplicate obligation ids is refused at submission, not stored undecidable", async () => {
  const h = await boot();
  try {
    const { session, surface } = await memoSession(h);
    const source = surface.projection.sources[0];
    const quote = SOURCE_TEXT.slice(0, 5);
    const evidence = [{ source_id: source.id, source_version: source.version, start: 0, end: 5, quote, digest: source.digest }];
    const obligation = { id: "ob-1", text: "check", status: "open", blocking: false, evidence_refs: [] };
    const created = await h.api("POST", `/sessions/${session.id}/runs`, { commandId: "dup", input: h.scriptInput([{ name: "se_submit_candidate", arguments: { artifact_text: quote, evidence, obligations: [obligation, { ...obligation, text: "second" }] } }]) });
    await h.pollRun(created.json.run.id);
    const result = h.runtime.store.listEvents({ sessionId: session.id, runId: created.json.run.id }).find((e) => e.type === "tool.result" && e.data.name === "se_submit_candidate");
    assert.equal(result.data.isError, true, "the model is told the proposal is invalid");
    const projection = (await h.api("GET", `/sessions/${session.id}/surface`)).json.projection;
    assert.equal(projection.candidates.length, 0, "no undecidable candidate was stored");
  } finally { await h.runtime.close(); }
});

test("a Run requested while a human action is committing is admitted only after it, on the new version", async () => {
  const h = await boot();
  let release;
  try {
    const { session, surface } = await memoSession(h);
    const source = surface.projection.sources[0];
    const quote = SOURCE_TEXT.slice(0, 5);
    const evidence = [{ source_id: source.id, source_version: source.version, start: 0, end: 5, quote, digest: source.digest }];
    const made = await h.api("POST", `/sessions/${session.id}/runs`, { commandId: "propose", input: h.scriptInput([{ name: "se_submit_candidate", arguments: { artifact_text: quote, evidence, obligations: [] } }]) });
    await h.pollRun(made.json.run.id);
    const current = (await h.api("GET", `/sessions/${session.id}/surface`)).json;
    const candidate = current.projection.candidates[0];
    const registry = h.runtime.registry, original = registry.humanAction.bind(registry);
    let reached; const gate = new Promise((r) => { release = r; }); const inside = new Promise((r) => { reached = r; });
    registry.humanAction = async (input) => { reached(); await gate; return original(input); };
    const accepting = action(h, session, current, { action: "decide", payload: { request_id: "accept-1", candidate_id: candidate.id, base_version: candidate.base_version, action: "accept", reason: "ok" } });
    await inside;
    const running = h.api("POST", `/sessions/${session.id}/runs`, { commandId: "after", input: "continue" });
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(h.runtime.store.listRuns(session.id).some((run) => run.commandId === "after"), false, "no Run is admitted while the action commits");
    release();
    assert.equal((await accepting).status, 200);
    const admitted = await running;
    assert.equal(admitted.status, 200, JSON.stringify(admitted.json));
    await h.pollRun(admitted.json.run.id);
    const core = await h.runtime.service.workCore.snapshot(current.projection.matter.id);
    assert.equal(core.matter.version, 1, "the accept committed");
    assert.ok(core.runs.some((run) => run.base_version === 1), "the later Run worked against the accepted version");
  } finally { release?.(); await h.runtime.close(); }
});
