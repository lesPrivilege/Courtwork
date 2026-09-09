import assert from "node:assert/strict";
import test from "node:test";
import { readFile, rm } from "node:fs/promises";
import { boot, reopen } from "./helpers.mjs";

const FIXTURE_PATH = new URL("./fixtures/work-core/attention-packets.json", import.meta.url);

function ok(response, label = "request") {
  assert.equal(response.status, 200, `${label}: ${JSON.stringify(response.json)}`);
  return response.json;
}

function errorCode(response, label = "request") {
  assert.notEqual(response.status, 200, `${label} unexpectedly succeeded`);
  assert.equal(typeof response.json?.error?.code, "string", `${label} did not return a structured error`);
  return response.json.error.code;
}

async function loadMemo(h) {
  ok(await h.api("POST", "/extensions/evidence-memo/lifecycle", { action: "load" }), "load evidence-memo");
}

async function bindMemo(h, title, sourceText) {
  const session = await h.createSession({ title });
  ok(await h.api("POST", `/sessions/${session.id}/extension`, {
    extensionId: "evidence-memo",
    input: { title, sourceText },
  }), `bind ${title}`);
  const surface = ok(await h.api("GET", `/sessions/${session.id}/surface`), `surface ${title}`);
  return { session, matter: surface.projection.matter, source: surface.projection.sources[0] };
}

async function completeRun(h, sessionId, commandId, input = "Synthetic Attention run") {
  const created = ok(await h.api("POST", `/sessions/${sessionId}/runs`, { commandId, input }), `create run ${commandId}`);
  const run = await h.pollRun(created.run.id, { timeoutMs: 15_000 });
  assert.equal(run.status, "completed", `${commandId}: ${JSON.stringify(run.error)}`);
  return run;
}

function coreSource(matter, source, locator) {
  return {
    kind: "core",
    matter_id: matter.id,
    source_id: source.id,
    version: source.version,
    locator,
    role: "supports",
    digest: source.digest,
  };
}

function createRequest({ attentionId, requestId, sources, relations }) {
  return {
    schema_version: 1,
    request_id: requestId,
    attention_id: attentionId,
    expected_revision: 0,
    action: "create",
    payload: {
      descriptor: { title: "Review two matters", summary: "Synthetic cross Matter Attention" },
      reason: "A human must compare the retained source records.",
      next_action: { kind: "inspect", label: "Inspect retained sources", trigger: "manual", due_at: null },
      source_refs: sources,
      relation_refs: relations,
    },
  };
}

function actionRequest(attentionId, requestId, expectedRevision, action, payload) {
  return { schema_version: 1, request_id: requestId, attention_id: attentionId, expected_revision: expectedRevision, action, payload };
}

async function attentionAction(h, attentionId, request) {
  const route = request.action === "create" ? "/attention" : `/attention/${encodeURIComponent(attentionId)}/actions`;
  return h.api("POST", route, { projectId: h.projectId, request });
}

test("ATT-BE-01 HTTP round trip keeps multi-Matter/source/execution refs through typed CAS and producer loss", async () => {
  const h = await boot();
  let current = h;
  try {
    await loadMemo(h);
    const first = await bindMemo(h, "Attention Matter One", "First retained source for Attention.");
    const second = await bindMemo(h, "Attention Matter Two", "Second retained source for Attention.");
    const firstRun = await completeRun(h, first.session.id, "attention-matter-one-run");
    const secondRun = await completeRun(h, second.session.id, "attention-matter-two-run");
    const attentionId = "attention-multi-matter";
    const create = createRequest({
      attentionId,
      requestId: "attention-create-1",
      sources: [coreSource(first.matter, first.source, "fixture://matter-one"), coreSource(second.matter, second.source, "fixture://matter-two")],
      relations: [
        { kind: "matter", id: first.matter.id, relation: "about" },
        { kind: "matter", id: second.matter.id, relation: "about" },
        { kind: "session", id: first.session.id, relation: "origin" },
        { kind: "session", id: second.session.id, relation: "origin" },
        { kind: "run", id: firstRun.id, relation: "execution" },
        { kind: "run", id: secondRun.id, relation: "execution" },
      ],
    });
    const created = ok(await attentionAction(h, attentionId, create), "create Attention");
    assert.deepEqual(
      { attention_id: created.attention_id, revision: created.revision, status: created.status },
      { attention_id: attentionId, revision: 1, status: "investigating" },
    );

    const registry = ok(await h.api("GET", `/attention/registry?projectId=${encodeURIComponent(h.projectId)}`), "registry");
    assert.equal(registry.count, 1);
    assert.equal(registry.items[0].descriptor.title, "Review two matters");
    assert.equal(registry.items[0].descriptor.summary, undefined, "registry must not disclose details");

    const initial = ok(await h.api("GET", `/attention/${attentionId}?projectId=${encodeURIComponent(h.projectId)}`), "initial inspect");
    assert.equal(initial.revision, 1);
    assert.equal(initial.status, "investigating");
    assert.equal(initial.seen, false);
    assert.deepEqual(new Set(initial.source_refs.map((ref) => ref.matter_id)), new Set([first.matter.id, second.matter.id]));
    assert.deepEqual(new Set(initial.relation_refs.filter((ref) => ref.kind === "matter").map((ref) => ref.id)), new Set([first.matter.id, second.matter.id]));
    assert.deepEqual(new Set(initial.relation_refs.filter((ref) => ref.kind === "run").map((ref) => ref.id)), new Set([firstRun.id, secondRun.id]));
    assert.equal(initial.execution_provenance.filter((ref) => ref.kind === "session").length, 2);
    assert.equal(initial.execution_provenance.filter((ref) => ref.kind === "run").length, 2);

    const acknowledgedRequest = actionRequest(attentionId, "attention-ack-1", 1, "acknowledge", {});
    const acknowledged = ok(await attentionAction(h, attentionId, acknowledgedRequest), "acknowledge");
    assert.equal(acknowledged.revision, 2);
    assert.equal(acknowledged.status, "investigating");
    assert.deepEqual(ok(await attentionAction(h, attentionId, acknowledgedRequest)), acknowledged, "exact retry returns its old receipt");
    assert.equal(errorCode(await attentionAction(h, attentionId, { ...acknowledgedRequest, expected_revision: 2 }), "changed retry"), "IDEMPOTENCY_CONFLICT");
    assert.equal(errorCode(await attentionAction(h, attentionId, actionRequest(attentionId, "stale-cas", 1, "acknowledge", {})), "stale CAS"), "VERSION_CONFLICT");

    const typed = [
      ["snooze", 2, { reason: "Wait for the source owner", next_action: { kind: "wait", label: "Wait for source owner", trigger: "manual", due_at: null } }, "later"],
      ["set_waiting", 3, { reason: "Human comparison is pending", next_action: { kind: "decide", label: "Compare matters", trigger: "manual", due_at: null } }, "waiting"],
      ["resume", 4, { reason: "Comparison resumed" }, "investigating"],
      ["resolve", 5, { reason: "Human comparison completed" }, "resolved"],
      ["reopen", 6, { reason: "A retained source changed the question" }, "investigating"],
    ];
    for (const [action, expectedRevision, payload, expectedStatus] of typed) {
      const result = ok(await attentionAction(h, attentionId, actionRequest(attentionId, `attention-${action}`, expectedRevision, action, payload)), action);
      assert.equal(result.revision, expectedRevision + 1, `${action} revision`);
      assert.equal(result.status, expectedStatus, `${action} status`);
    }
    const finalBeforeDeletion = ok(await h.api("GET", `/attention/${attentionId}?projectId=${encodeURIComponent(h.projectId)}`), "post-transition inspect");
    assert.equal(finalBeforeDeletion.revision, 7);
    assert.equal(finalBeforeDeletion.status, "investigating");

    assert.equal((await h.api("DELETE", `/sessions/${first.session.id}`)).status, 200, "delete first execution session");
    assert.deepEqual(ok(await attentionAction(h,attentionId,create)),created,"create retry survives deleted origin");
    const replacement=await h.createSession({title:"Replacement Attention Session"});
    assert.notEqual(replacement.id,first.session.id);
    const afterDeletion = ok(await h.api("GET", `/attention/${attentionId}?projectId=${encodeURIComponent(h.projectId)}`), "inspect after session deletion");
    assert.equal(afterDeletion.status, "investigating");
    assert(afterDeletion.relation_refs.some((ref) => ref.id === first.session.id), "historical Session ref must remain explanatory");
    assert(afterDeletion.relation_refs.some((ref) => ref.id === firstRun.id), "historical Run ref must remain explanatory");
    assert(afterDeletion.execution_provenance.some((ref) => ref.id === firstRun.id && ref.availability === "observed"));

    const sourceBeforeRestart = ok(await h.api("POST", "/attention/query", {
      projectId: h.projectId,
      query: { schema_version: 1, kind: "source", attention_id: attentionId, source_index: 0, offset: 0, limit: 4000 },
    }), "source after deletion");
    assert.equal(sourceBeforeRestart.availability, "retained");
    assert.match(sourceBeforeRestart.text, /First retained source/);

    const unloaded = ok(await h.api("POST", "/extensions/evidence-memo/lifecycle", { action: "unload" }), "unload producer");
    assert.equal(unloaded.extension.status, "unloaded");
    const producerAbsent = ok(await h.api("GET", `/sessions/${second.session.id}/surface`), "producer absent surface");
    assert.equal(producerAbsent.projection.readOnly, true);
    assert.deepEqual(producerAbsent.projection.humanActions, []);

    await h.runtime.close();
    current = await reopen(h.dataDir, { extensionCatalog: [] });
    const recovered = ok(await current.api("GET", `/attention/${attentionId}?projectId=${encodeURIComponent(h.projectId)}`), "inspect after reopen");
    assert.equal(recovered.revision, 7);
    assert.equal(recovered.status, "investigating");
    assert.deepEqual(recovered.relation_refs, afterDeletion.relation_refs);
    assert.deepEqual(recovered.source_refs, afterDeletion.source_refs);
    const recoveredSource = ok(await current.api("POST", "/attention/query", {
      projectId: h.projectId,
      query: { schema_version: 1, kind: "source", attention_id: attentionId, source_index: 1, offset: 0, limit: 4000 },
    }), "source after producer restart");
    assert.match(recoveredSource.text, /Second retained source/);
  } finally {
    await current.runtime.close();
    if (current !== h) await h.runtime.close();
    await rm(h.dataDir, { recursive: true, force: true });
  }
});

test("Attention scope, actor ownership, unknown fields and schema versions fail closed over every query kind", async () => {
  const h = await boot();
  try {
    await loadMemo(h);
    const owner = await bindMemo(h, "Private Attention", "Private source must never cross project scope.");
    const attentionId = "attention-private";
    const create = createRequest({
      attentionId,
      requestId: "private-create",
      sources: [coreSource(owner.matter, owner.source, "fixture://private")],
      relations: [{ kind: "matter", id: owner.matter.id, relation: "about" }],
    });
    ok(await attentionAction(h, attentionId, create), "private create");
    const other = (await h.api("POST", "/projects", { name: "other-attention-project" })).json.project;

    for (const query of [
      { schema_version: 1, kind: "registry" },
      { schema_version: 1, kind: "exact", field: "title", value: "Review two matters" },
      { schema_version: 1, kind: "grep", text: "Private" },
      { schema_version: 1, kind: "relation", relation_kind: "matter", relation_id: owner.matter.id },
    ]) {
      const response = await h.api("POST", "/attention/query", { projectId: other.id, query });
      const result = ok(response, `cross-project ${query.kind}`);
      assert.equal(result.count, 0, `${query.kind} count must be scoped to visible project rows`);
      assert.deepEqual(result.items, [], `${query.kind} must not disclose the private Attention`);
      assert.doesNotMatch(JSON.stringify(result), /Private Attention/);
    }

    for (const query of [
      { schema_version: 1, kind: "inspect", attention_id: attentionId },
      { schema_version: 1, kind: "events", attention_id: attentionId },
      { schema_version: 1, kind: "source", attention_id: attentionId, source_index: 0, offset: 0, limit: 20 },
      { schema_version: 1, kind: "request", attention_id: attentionId, request_id: "private-create" },
    ]) {
      const response = await h.api("POST", "/attention/query", { projectId: other.id, query });
      assert.equal(errorCode(response, `cross-project ${query.kind}`), "NOT_FOUND");
      assert.doesNotMatch(JSON.stringify(response.json), /Private Attention/);
    }
    const crossInspect = await h.api("GET", `/attention/${attentionId}?projectId=${encodeURIComponent(other.id)}`);
    assert.equal(errorCode(crossInspect, "cross-project GET inspect"), "NOT_FOUND");
    const crossCreateResponse = await h.api("POST", "/attention", { projectId: other.id, request: { ...create, attention_id: "attention-cross-create", request_id: "cross-project-create" } });
    assert.equal(errorCode(crossCreateResponse, "cross-project create"), "NOT_FOUND");

    assert.equal(errorCode(await h.api("POST", "/attention", { projectId: h.projectId, actor: "runtime", request: { ...create, attention_id: "attention-spoof-top", request_id: "spoof-top" } }), "top-level actor spoof"), "unknown_field");
    assert.equal(errorCode(await h.api("POST", "/attention", { projectId: h.projectId, request: { ...create, attention_id: "attention-spoof-request", request_id: "spoof-request", actor: "runtime" } }), "request actor spoof"), "INVALID");
    assert.equal(errorCode(await h.api("POST", "/attention", { projectId: h.projectId, request: { ...create, attention_id: "attention-spoof-context", request_id: "spoof-context", context: { actor: "local-user" } } }), "request context spoof"), "INVALID");
    assert.equal(errorCode(await h.api("POST", "/attention/query", { projectId: h.projectId, query: { schema_version: 1, kind: "registry", actor: "runtime" } }), "query actor spoof"), "INVALID");
    assert.equal(errorCode(await h.api("POST", "/attention/query", { projectId: h.projectId, query: { schema_version: 1, kind: "registry", extra: true } }), "query unknown field"), "INVALID");
    assert.equal(errorCode(await h.api("POST", "/attention/query", { projectId: h.projectId, extra: true, query: { schema_version: 1, kind: "registry" } }), "query envelope unknown field"), "unknown_field");
    assert.equal(errorCode(await h.api("POST", `/attention/${attentionId}/actions`, { projectId: h.projectId, request: { ...actionRequest(attentionId, "unknown-payload-field", 1, "acknowledge", { forged: true }) } }), "action unknown field"), "INVALID");
    assert.equal(errorCode(await h.api("POST", "/attention", { projectId: h.projectId, request: { ...create, attention_id: "attention-schema-action", request_id: "schema-action", schema_version: 2 } }), "action schema"), "CONTRACT_UNSUPPORTED");
    assert.equal(errorCode(await h.api("POST", "/attention/query", { projectId: h.projectId, query: { schema_version: 2, kind: "registry" } }), "query schema"), "CONTRACT_UNSUPPORTED");
    assert.equal(errorCode(await h.api("POST", "/attention/query", { projectId: h.projectId, query: { schema_version: 1, kind: "semantic" } }), "unknown query schema kind"), "CONTRACT_UNSUPPORTED");
    assert.equal(errorCode(await h.api("POST", `/attention/${attentionId}/actions`, { projectId: h.projectId, request: actionRequest(attentionId, "unknown-action", 1, "resolve-by-model", {}) }), "unknown action"), "CONTRACT_UNSUPPORTED");
  } finally {
    await h.runtime.close();
    await rm(h.dataDir, { recursive: true, force: true });
  }
});

test("Runtime Attention adapter captures host execution context, records signals only, and closes with the Run", async () => {
  const h = await boot();
  try {
    await loadMemo(h);
    const owner = await bindMemo(h, "Runtime Attention", "Runtime signal source is synthetic and retained.");
    const attentionId = "attention-runtime";
    const create = createRequest({
      attentionId,
      requestId: "runtime-create",
      sources: [coreSource(owner.matter, owner.source, "fixture://runtime")],
      relations: [{ kind: "matter", id: owner.matter.id, relation: "about" }],
    });
    ok(await attentionAction(h, attentionId, create), "runtime Attention create");

    const runner = await h.createSession({ title: "Attention runtime host" });
    const made = ok(await h.api("POST", `/sessions/${runner.id}/runs`, {
      commandId: "attention-runtime-active-run",
      input: h.scriptInput([{name:"ask_user",arguments:{prompt:"Hold the synthetic Attention Run"}}]),
    }), "start active Run");
    assert.equal((await h.pollRun(made.run.id,{until:s=>s==="waiting_user"})).status,"waiting_user");
    const adapterId = made.run.adapterId;
    const grant = ok(await attentionAction(h, attentionId, actionRequest(attentionId, "runtime-grant", 1, "request_disclosure", {
      grant: {
        adapter_id: adapterId,
        purpose: "attention-runtime",
        fields: ["registry", "details", "sources", "relations", "events", "signal"],
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      },
    })), "runtime disclosure grant");
    assert.equal(grant.revision, 2);

    const adapter = h.runtime.service.attentionRuntimeAdapter(runner.id, made.run.id);
    assert.equal(adapter.schemaVersion, 1);
    const runtimeInspect = await adapter.query({ schema_version: 1, kind: "inspect", attention_id: attentionId });
    assert.equal(runtimeInspect.disclosure.purpose, "attention-runtime");
    assert.equal("policy" in runtimeInspect, false, "runtime inspection must not disclose human policy internals");
    assert.equal("human_actions" in runtimeInspect, false, "runtime inspection must not expose human actions");
    assert.equal(runtimeInspect.status, "investigating");
    const signalRequest = actionRequest(attentionId, "runtime-signal-1", 2, "record_signal", { text: "Synthetic runtime observation", source_refs: [] });
    const signal = await adapter.recordSignal(signalRequest);
    assert.equal(signal.revision, 3);
    assert.equal(signal.status, "investigating");
    assert.deepEqual(await adapter.recordSignal(signalRequest), signal, "runtime signal retry is idempotent");
    await assert.rejects(
      adapter.recordSignal(actionRequest(attentionId, "runtime-forged-status", 3, "record_signal", { text: "forged", source_refs: [], status: "resolved" })),
      (error) => error.code === "INVALID",
    );
    await assert.rejects(
      adapter.recordSignal(actionRequest(attentionId, "runtime-resolve", 3, "resolve", { reason: "model requested resolution" })),
      (error) => error.code === "DISCLOSURE_DENIED",
    );

    const question=(await h.api("GET",`/sessions/${runner.id}/events`)).json.events.find(e=>e.type==="question.open");
    ok(await h.api("POST",`/runs/${made.run.id}/questions/${question.data.id}`,{answer:"Continue"}));
    const finished = await h.pollRun(made.run.id, { timeoutMs: 15_000 });
    assert.equal(finished.status, "completed");
    const afterRun = ok(await h.api("GET", `/attention/${attentionId}?projectId=${encodeURIComponent(h.projectId)}`), "inspect after Run");
    assert.equal(afterRun.status, "investigating", "Run completion must not resolve Attention");
    await assert.rejects(
      adapter.query({ schema_version: 1, kind: "inspect", attention_id: attentionId }),
      (error) => error.code === "CANDIDATE_CLOSED",
    );
    await assert.rejects(
      adapter.recordSignal(actionRequest(attentionId, "runtime-late-signal", 3, "record_signal", { text: "late", source_refs: [] })),
      (error) => error.code === "CANDIDATE_CLOSED",
    );
  } finally {
    await h.runtime.close();
    await rm(h.dataDir, { recursive: true, force: true });
  }
});

test("generated Attention consumer packet records the HTTP/Pi/Core invariants", async () => {
  const packet = JSON.parse(await readFile(FIXTURE_PATH, "utf8"));
  assert.equal(packet.schemaVersion, 1);
  assert.equal(packet.fixtureVersion, 1);
  assert.match(packet.dataClass, /synthetic/);
  assert.match(packet.dataClass, /HTTP\/Pi loopback\/Core/);
  assert.equal(packet.requests.create.action, "create");
  assert.equal(packet.responses.created.revision, 1);
  assert.equal(packet.responses.runtimeSignal.status, "investigating");
  assert.equal(packet.responses.recovered.revision, packet.responses.afterRun.revision);
  assert.equal(packet.responses.recovered.status, packet.responses.afterRun.status);
  assert.equal(packet.responses.recoveredSource.availability, "retained");
  assert.match(packet.responses.recoveredSource.text, /retained/);
});
