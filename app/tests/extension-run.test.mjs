import assert from "node:assert/strict";
import { test } from "node:test";
import { boot } from "./helpers.mjs";

// R1-6: extension tools must survive the new execution chain, not just a hand
// smoke test. Both tests below drive the real path — service.createRun ->
// AgentSession tool loop -> extension tool -> V4 Core — with the fake provider
// scripting the model's tool calls. app/extensions/* is read-only here.

const SOURCE_TEXT = "Alpha beta gamma delta epsilon.";

async function bindEvidenceMemo(api, createSession) {
  const loaded = await api("POST", "/extensions/evidence-memo/lifecycle", { action: "load" });
  assert.equal(loaded.status, 200);
  assert.equal(loaded.json.extension.status, "loaded");
  const session = await createSession();
  const bound = await api("POST", `/sessions/${session.id}/extension`, {
    extensionId: "evidence-memo",
    input: { title: "C1 regression", sourceText: SOURCE_TEXT },
  });
  assert.equal(bound.status, 200);
  const surface = await api("GET", `/sessions/${session.id}/surface`);
  return { session, source: surface.json.projection.sources[0] };
}

// T-EXT-1: a session bound to evidence-memo runs through service.createRun on
// an AgentSession, and the model's scripted se_read_source call succeeds.
test("T-EXT-1: se_read_source succeeds through service.createRun on AgentSession", async () => {
  const { runtime, api, createSession, pollRun, scriptInput } = await boot();
  try {
    const { session, source } = await bindEvidenceMemo(api, createSession);
    const created = await api("POST", `/sessions/${session.id}/runs`, {
      input: scriptInput([{ name: "se_read_source", arguments: { sourceId: source.id } }]),
      commandId: "ext-1",
    });
    const run = await pollRun(created.json.run.id, { timeoutMs: 20_000 });
    assert.equal(run.status, "completed");
    assert.equal(run.extension.id, "evidence-memo");

    const events = (await api("GET", `/sessions/${session.id}/events`)).json.events;
    const start = events.find((e) => e.type === "tool.start" && e.data.name === "se_read_source");
    const result = events.find((e) => e.type === "tool.result" && e.data.name === "se_read_source");
    assert.ok(start, "the extension tool must run inside the AgentSession tool loop");
    assert.equal(result.data.isError, false);
    assert.match(result.data.text, /Alpha beta gamma delta epsilon\./);
  } finally {
    await runtime.close();
  }
});

// T-EXT-2: se_submit_candidate goes through once inside the run, and a late
// call on the same run handle after the run has ended is rejected by Core.
test("T-EXT-2: se_submit_candidate goes through once and Core rejects the late call", async () => {
  const { runtime, api, createSession, pollRun, scriptInput } = await boot();
  try {
    const { session, source } = await bindEvidenceMemo(api, createSession);

    // Hold on to the very run handle the service hands to the tool loop, so
    // the "late call" below is the same closure the model used, made after the
    // Run has terminated. Test-side spy only: the registry behaves normally.
    const registry = runtime.registry;
    const originalBegin = registry.begin.bind(registry);
    let begun = null;
    registry.begin = async (input) => {
      const result = await originalBegin(input);
      begun = result.run;
      return result;
    };

    const quote = SOURCE_TEXT.slice(0, 10);
    const submission = {
      artifact_text: quote,
      evidence: [{ source_id: source.id, source_version: source.version, start: 0, end: 10, quote, digest: source.digest }],
      obligations: [],
    };
    const created = await api("POST", `/sessions/${session.id}/runs`, {
      input: scriptInput([{ name: "se_submit_candidate", arguments: submission }]),
      commandId: "ext-2",
    });
    const run = await pollRun(created.json.run.id, { timeoutMs: 20_000 });
    assert.equal(run.status, "completed");

    const result = (await api("GET", `/sessions/${session.id}/events`)).json.events
      .find((e) => e.type === "tool.result" && e.data.name === "se_submit_candidate");
    assert.equal(result.data.isError, false);
    assert.match(result.data.text, /"status":"pending"/);

    const projection = (await api("GET", `/sessions/${session.id}/surface`)).json.projection;
    assert.equal(projection.candidates.length, 1);
    assert.equal(projection.candidates[0].status, "pending");
    assert.equal(projection.artifact, null, "a Candidate is never an accepted Artifact");

    assert.ok(begun, "the run handle must have been created by the service");
    await assert.rejects(() => begun.tools[1].execute(submission), { code: "CANDIDATE_CLOSED" });
    const after = (await api("GET", `/sessions/${session.id}/surface`)).json.projection;
    assert.equal(after.candidates.length, 1, "the late call must not add a Candidate");
  } finally {
    await runtime.close();
  }
});
