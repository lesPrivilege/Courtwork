import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import { test } from "node:test";
import { boot } from "./helpers.mjs";
import { createAgentsLoopback } from "./fixtures/agents-api-loopback.mjs";
import { agentsPort } from "./fixtures/agents-host-harness.mjs";
import { startServer } from "../server/index.mjs";
import { FAKE_CREDENTIAL_KEY } from "../runtime/pi-session-runtime.mjs";
import { PI_EXECUTOR_ID } from "../server/executor-choice-state.mjs";
import { seal, sha256 } from "./fixtures/kit-context.mjs";

const runBody = (input, commandId, choice) => ({
  input, commandId,
  ...(choice ? { executorExpectation: { revision: choice.revision, adapterId: choice.adapterId } } : {}),
});

async function withDual(run) {
  const loopback = await createAgentsLoopback({ plan: () => [{ text: "Managed answer." }] });
  const h = await boot({ managedRuntimePort: agentsPort(loopback) });
  try { await run(h, loopback); }
  finally {
    await h.runtime.close();
    await loopback.close();
    await rm(h.dataDir, { recursive: true, force: true });
  }
}

function client(runtime) {
  return async (method, route, body) => {
    const res = await fetch(runtime.url + "/api/v5" + route, {
      method, headers: { "content-type": "application/json", "x-work-token": runtime.token },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: res.status, json: await res.json() };
  };
}

test("R1 public choice defaults to Pi; an unconfigured managed option cannot be enabled by a client flag", async () => {
  const h = await boot();
  try {
    const session = await h.createSession();
    const read = await h.api("GET", `/sessions/${session.id}/executor-choice`);
    assert.deepEqual([read.status, read.json.choice.adapterId, read.json.choice.revision], [200, PI_EXECUTOR_ID, 0]);
    assert.equal(read.json.options.find(option => option.adapterId === "agents-api").availability.status, "unavailable");
    const unsupported = await h.api("PUT", `/sessions/${session.id}/executor-choice`, { expectedRevision: 0, adapterId: "agents-api" });
    assert.deepEqual([unsupported.status, unsupported.json.error.code], [409, "executor_unavailable"]);
    const invented = await h.api("PUT", `/sessions/${session.id}/executor-choice`, {
      expectedRevision: 0, adapterId: "agents-api", verified: true,
    });
    assert.deepEqual([invented.status, invented.json.error.code], [400, "unknown_field"]);
    const created = await h.api("POST", `/sessions/${session.id}/runs`, runBody("Pi default", "r1-default", read.json.choice));
    assert.equal((await h.pollRun(created.json.run.id)).adapterId, PI_EXECUTOR_ID);
    assert.equal(h.runtime.store.getSession(session.id).executorChoice.configurationRef, read.json.choice.configurationRef);
  } finally { await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
});

test("R1 one Host serves separate Pi and managed Sessions with frozen native shapes", () => withDual(async h => {
  const pi = await h.createSession({ title: "Pi" });
  const managed = await h.createSession({ title: "Managed" });
  const piChoice = (await h.api("GET", `/sessions/${pi.id}/executor-choice`)).json.choice;
  const selected = await h.api("PUT", `/sessions/${managed.id}/executor-choice`, { expectedRevision: 0, adapterId: "agents-api" });
  assert.equal(selected.status, 200, JSON.stringify(selected.json));
  assert.equal(selected.json.choice.revision, 1);
  const piCreated = await h.api("POST", `/sessions/${pi.id}/runs`, runBody("Pi work", "r1-pi", piChoice));
  const piRun = await h.pollRun(piCreated.json.run.id);
  const remoteCreated = await h.api("POST", `/sessions/${managed.id}/runs`, runBody("Managed work", "r1-managed", selected.json.choice));
  assert.equal(remoteCreated.status, 200, JSON.stringify(remoteCreated.json));
  const remoteRun = await h.pollRun(remoteCreated.json.run.id);
  assert.deepEqual([piRun.status, remoteRun.status], ["completed", "completed"]);
  assert.deepEqual([piRun.adapterId, remoteRun.adapterId], [PI_EXECUTOR_ID, "agents-api"]);
  assert.equal(piRun.executorBinding.choiceRevision, 0);
  assert.equal(remoteRun.executorBinding.choiceRevision, 1);
  assert.ok(h.runtime.store.getSession(pi.id).hostSession);
  assert.equal(h.runtime.store.getSession(pi.id).remoteBinding, null);
  assert.equal(h.runtime.store.getSession(managed.id).hostSession, null);
  assert.ok(h.runtime.store.getSession(managed.id).remoteBinding);
  assert.equal(remoteRun.hostSession, null);
  assert.equal(piRun.remoteBinding, null);
}));

test("R1 stale choice and stale Run expectation refuse before provider/native requests", () => withDual(async (h, loopback) => {
  const session = await h.createSession();
  const before = (await h.api("GET", `/sessions/${session.id}/executor-choice`)).json.choice;
  const chosen = await h.api("PUT", `/sessions/${session.id}/executor-choice`, { expectedRevision: 0, adapterId: "agents-api" });
  assert.equal(chosen.status, 200);
  const stalePut = await h.api("PUT", `/sessions/${session.id}/executor-choice`, { expectedRevision: 0, adapterId: PI_EXECUTOR_ID });
  assert.deepEqual([stalePut.status, stalePut.json.error.code], [409, "executor_selection_conflict"]);
  const staleRun = await h.api("POST", `/sessions/${session.id}/runs`, runBody("stale", "r1-stale", before));
  assert.deepEqual([staleRun.status, staleRun.json.error.code], [409, "executor_selection_conflict"]);
  assert.equal(h.runtime.store.listRuns(session.id).length, 0);
  assert.equal(h.runtime.fakeProvider.requests.length, 0);
  assert.equal(loopback.posts("/v1/agents/sessions").length, 0);
}));

test("R1 first-choice PUT and first Run serialize; the loser cannot switch native lineage", () => withDual(async h => {
  const session = await h.createSession();
  const initial = (await h.api("GET", `/sessions/${session.id}/executor-choice`)).json.choice;
  const [put, post] = await Promise.all([
    h.api("PUT", `/sessions/${session.id}/executor-choice`, { expectedRevision: 0, adapterId: "agents-api" }),
    h.api("POST", `/sessions/${session.id}/runs`, runBody("race", "r1-race", initial)),
  ]);
  assert.ok([200, 409].includes(put.status));
  assert.ok([200, 409].includes(post.status));
  assert.equal(Number(put.status === 200) + Number(post.status === 200), 1);
  if (post.status === 200) assert.equal((await h.pollRun(post.json.run.id)).adapterId, PI_EXECUTOR_ID);
  else assert.equal(h.runtime.store.listRuns(session.id).length, 0);
  const state = h.runtime.store.getSession(session.id);
  assert.equal(state.executorChoice.adapterId, put.status === 200 ? "agents-api" : PI_EXECUTOR_ID);
}));

test("R1 a saved managed Run replays after restart without its factory; new work refuses without Pi fallback", () => withDual(async (h, loopback) => {
  const session = await h.createSession();
  const chosen = (await h.api("PUT", `/sessions/${session.id}/executor-choice`, { expectedRevision: 0, adapterId: "agents-api" })).json.choice;
  const body = runBody("managed before restart", "r1-replay", chosen);
  const created = await h.api("POST", `/sessions/${session.id}/runs`, body);
  assert.equal(created.status, 200, JSON.stringify(created.json));
  const settled = await h.pollRun(created.json.run.id);
  assert.equal(settled.status, "completed");
  const attempts = loopback.posts("/v1/agents/sessions").length;
  await h.runtime.close();
  const reopened = await startServer({ dataDir: h.dataDir, port: 0, logger: () => {} });
  try {
    const api = client(reopened);
    assert.equal((await api("GET", `/runs/${settled.id}`)).json.run.adapterId, "agents-api");
    const replay = await api("POST", `/sessions/${session.id}/runs`, body);
    assert.deepEqual([replay.status, replay.json.run.id], [200, settled.id]);
    const refused = await api("POST", `/sessions/${session.id}/runs`, runBody("new work", "r1-new", chosen));
    assert.deepEqual([refused.status, refused.json.error.code], [409, "executor_unavailable"]);
    assert.equal(loopback.posts("/v1/agents/sessions").length, attempts);
  } finally { await reopened.close(); }
}));

test("R1 changed managed endpoint after restart leaves the saved choice readable and refuses execution", () => withDual(async h => {
  const session = await h.createSession();
  const chosen = (await h.api("PUT", `/sessions/${session.id}/executor-choice`, { expectedRevision: 0, adapterId: "agents-api" })).json.choice;
  await h.runtime.close();
  const other = await createAgentsLoopback({ plan: () => [{ text: "Wrong endpoint." }] });
  const reopened = await startServer({ dataDir: h.dataDir, port: 0, managedRuntimePort: agentsPort(other), logger: () => {} });
  try {
    const api = client(reopened);
    const read = await api("GET", `/sessions/${session.id}/executor-choice`);
    assert.deepEqual(read.json.choice, chosen);
    const refused = await api("POST", `/sessions/${session.id}/runs`, runBody("new on changed endpoint", "r1-changed", chosen));
    assert.deepEqual([refused.status, refused.json.error.code], [409, "executor_configuration_changed"]);
    assert.equal(reopened.store.listRuns(session.id).length, 0);
    assert.equal(other.posts("/v1/agents/sessions").length, 0);
  } finally { await reopened.close(); await other.close(); }
}));

test("R1 a v2 Kit remains Pi-only and refuses managed execution before provider/native requests", () => withDual(async (h, loopback) => {
  const session = await h.createSession();
  const scope = { type: "session", id: session.id };
  const change = async body => {
    const revision = (await h.api("GET", `/runtime-control?sessionId=${session.id}`)).json.revision;
    return h.api("PUT", `/runtime-control?sessionId=${session.id}`, { revision, ...body });
  };
  const source = { id: "local:r1-core", kind: "instruction", title: "R1 core", content: "Use retained evidence." };
  assert.equal((await change({ operation: "put", resource: { ...source, scope } })).status, 200);
  const ref = { resourceId: source.id, contentSha256: sha256(source.content),
    artifactSha256: sha256(JSON.stringify({ kind: source.kind, title: source.title, content: source.content })) };
  const kit = seal({ schemaVersion: 1, id: "kit:r1", version: "1", core: [ref],
    deferred: [], requirements: [], conflicts: [] });
  const profile = { schemaVersion: 2, version: "r1", resourceIds: [source.id], rules: [], uiSlots: [], kits: [kit] };
  assert.equal((await change({ operation: "put", resource: { id: "local:r1-profile", kind: "agent_profile",
    title: "R1 profile", content: JSON.stringify(profile), scope } })).status, 200);
  assert.equal((await change({ operation: "profile", scope, id: "local:r1-profile" })).status, 200);
  const chosen = (await h.api("PUT", `/sessions/${session.id}/executor-choice`, { expectedRevision: 0, adapterId: "agents-api" })).json.choice;
  const refused = await h.api("POST", `/sessions/${session.id}/runs`, runBody("Kit on managed", "r1-kit", chosen));
  assert.deepEqual([refused.status, refused.json.error.code], [409, "kit_runtime_unsupported"]);
  assert.equal(h.runtime.store.listRuns(session.id).length, 0);
  assert.equal(h.runtime.fakeProvider.requests.length, 0);
  assert.equal(loopback.posts("/v1/agents/sessions").length, 0);
}));

test("R1 Pi credential rotation does not change executor identity; managed credential fences stay separate", async () => {
  const h = await boot();
  try {
    const session = await h.createSession();
    const choice = (await h.api("GET", `/sessions/${session.id}/executor-choice`)).json.choice;
    const first = await h.api("POST", `/sessions/${session.id}/runs`, runBody("before rotation", "r1-key-1", choice));
    assert.equal((await h.pollRun(first.json.run.id)).status, "completed");
    await h.api("PUT", "/provider-credential", { connectionId: "catalog-fake-openai-loopback", apiKey: "synthetic-rotated-key" });
    await h.api("PUT", "/provider-credential", { connectionId: "catalog-fake-openai-loopback", apiKey: FAKE_CREDENTIAL_KEY });
    const second = await h.api("POST", `/sessions/${session.id}/runs`, runBody("after rotation", "r1-key-2", choice));
    const settled = await h.pollRun(second.json.run.id);
    assert.equal(settled.status, "completed");
    assert.equal(settled.executorBinding.configurationRef, first.json.run.executorBinding.configurationRef);
    assert.equal(h.runtime.store.getSession(session.id).executorChoice.configurationRef, choice.configurationRef);
    assert.ok(settled.credentialGeneration > first.json.run.credentialGeneration);
  } finally { await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
});

test("R1 global Attention choice is read-only and its Run keeps the default Pi port", async () => {
  const h = await boot();
  try {
    const made = await h.api("POST", "/attention/conversations", { conversationId: randomUUID() });
    assert.equal(made.status, 200);
    const id = made.json.session.id;
    const read = await h.api("GET", `/sessions/${id}/executor-choice`);
    assert.deepEqual([read.json.locked, read.json.lockReason], [true, "not_ordinary_chat"]);
    const refused = await h.api("PUT", `/sessions/${id}/executor-choice`, { expectedRevision: 0, adapterId: PI_EXECUTOR_ID });
    assert.deepEqual([refused.status, refused.json.error.code], [409, "executor_ineligible"]);
    const created = await h.api("POST", `/sessions/${id}/runs`, runBody("attention fixture", "r1-global"));
    assert.equal((await h.pollRun(created.json.run.id)).adapterId, PI_EXECUTOR_ID);
  } finally { await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
});
