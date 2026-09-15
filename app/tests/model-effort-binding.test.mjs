/* RD-Models 05 · Host binding test for the effort quick-select path.
 *
 * Follows the precedent in `tests/model-capability-adaptation.test.mjs`
 * ("editing a connection invalidates selected effort, and each Run freezes a
 * capability binding across reopen"): boot a real server, save a compatible
 * connection on the fake provider's loopback, drive `/provider-config`
 * through the SAME projection the composer's quick-select uses
 * (`projectProviderConfig` from `web/provider-config.mjs`), start a Run, and
 * inspect both the frozen `run.provider` binding and the literal request
 * body the fake provider received on the wire. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { FAKE_MODEL_ID } from "../runtime/pi-session-runtime.mjs";
import { projectProviderConfig } from "../web/provider-config.mjs";
import { boot } from "./helpers.mjs";

/** Save a compatible connection on the fake provider's loopback with an
 * explicit ["low", "high"] effort ladder, then point `/provider-config` at
 * it (no effort yet) so a subsequent `projectProviderConfig` change only has
 * to say what it is actually changing -- exactly what the composer's
 * quick-select does with the config it already has open. */
async function connectAndSelect(h, { apiKey, reasoningEffort } = {}) {
  const created = await h.api("POST", "/provider-connections", {
    api: "openai-completions",
    baseUrl: h.runtime.fakeProvider.baseUrl,
    apiKey: apiKey ?? "effort-binding-key",
    models: [{ id: FAKE_MODEL_ID, reasoning: true, reasoningEfforts: ["low", "high"] }],
  });
  assert.equal(created.status, 200, JSON.stringify(created.json));
  const connection = created.json.connection;
  const selected = await h.api("PUT", "/provider-config", {
    provider: connection.providerIdentity,
    model: FAKE_MODEL_ID,
    api: connection.api,
    baseUrl: connection.baseUrl,
    ...(reasoningEffort !== undefined ? { reasoningEffort } : {}),
  });
  assert.equal(selected.status, 200, JSON.stringify(selected.json));
  return connection;
}

test("05 · the effort saved from the composer projection is what the next Run binds and encodes", async () => {
  const h = await boot();
  try {
    await connectAndSelect(h);

    const before = await h.api("GET", "/provider-config");
    const catalog = (await h.api("GET", "/provider-models")).json;
    const projected = projectProviderConfig(before.json.config, { reasoningEffort: "high" }, catalog);
    const saved = await h.api("PUT", "/provider-config", { ...projected, expectedVersion: before.json.version });
    assert.equal(saved.status, 200, JSON.stringify(saved.json));

    const after = await h.api("GET", "/provider-config");
    assert.equal(after.json.config.reasoningEffort, "high");
    assert.deepEqual(after.json.reasoningCapability.values, ["low", "high"]);
    assert.equal(after.json.reasoningCapability.source, "user-declared");

    const session = await h.createSession();
    const made = await h.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "effort-binding-run", input: "hello",
    });
    assert.equal(made.status, 200, JSON.stringify(made.json));
    const run = await h.pollRun(made.json.run.id);
    assert.equal(run.status, "completed", JSON.stringify(run.error ?? null));
    assert.equal(run.provider.reasoningEffort, "high");
    assert.deepEqual(run.provider.reasoningBinding.values, ["low", "high"]);
    assert.equal(run.provider.reasoningBinding.configVersion, saved.json.version);

    // openai-completions with the generic (non-DeepSeek) compat format encodes
    // the selected effort as `reasoning_effort` (see `createReasoningPayloadHook`
    // in runtime/pi-session-runtime.mjs, thinkingFormat "openai" branch).
    const requestBody = h.runtime.fakeProvider.requests.at(-1).body;
    assert.equal(requestBody.reasoning_effort, "high", "the fake provider received the effort as reasoning_effort on the wire");
    assert.equal(requestBody.reasoning, undefined);
    assert.equal(requestBody.thinking, undefined);
  } finally {
    await h.runtime.close();
  }
});

test("05 · Provider default omits the parameter: no reasoning field reaches the provider", async () => {
  const h = await boot();
  try {
    await connectAndSelect(h, { apiKey: "effort-binding-default-key" });

    const before = await h.api("GET", "/provider-config");
    const catalog = (await h.api("GET", "/provider-models")).json;
    const projected = projectProviderConfig(before.json.config, { reasoningEffort: undefined }, catalog);
    const saved = await h.api("PUT", "/provider-config", { ...projected, expectedVersion: before.json.version });
    assert.equal(saved.status, 200, JSON.stringify(saved.json));
    assert.equal(saved.json.config.reasoningEffort, undefined);

    const session = await h.createSession();
    const made = await h.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "effort-binding-default-run", input: "hello",
    });
    assert.equal(made.status, 200, JSON.stringify(made.json));
    const run = await h.pollRun(made.json.run.id);
    assert.equal(run.status, "completed", JSON.stringify(run.error ?? null));
    assert.equal(run.provider.reasoningEffort, undefined);

    const requestBody = h.runtime.fakeProvider.requests.at(-1).body;
    assert.equal(requestBody.reasoning_effort, undefined);
    assert.equal(requestBody.reasoning, undefined);
    assert.equal(requestBody.thinking, undefined);
  } finally {
    await h.runtime.close();
  }
});

test("05 · a save during an active Run is refused with active_run and leaves the stored value unchanged", async () => {
  const h = await boot();
  try {
    await connectAndSelect(h, { apiKey: "effort-binding-active-run-key", reasoningEffort: "low" });

    // T-PERM-1's pattern: "ask" mode holds a Run in `waiting_user` -- an
    // ACTIVE_STATUSES member (server/store.mjs) -- on a real, deterministic
    // permission wait rather than a timing-based sleep fixture.
    const session = await h.createSession({ permissionMode: "ask" });
    const calls = [{ name: "ws_write", arguments: { path: "out/hold.md", text: "hold" } }];
    const started = await h.api("POST", `/sessions/${session.id}/runs`, {
      input: h.scriptInput(calls), commandId: "hold-during-effort-save",
    });
    assert.equal(started.status, 200, JSON.stringify(started.json));
    const waiting = await h.pollRun(started.json.run.id, { until: (status) => status === "waiting_user" });
    assert.equal(waiting.status, "waiting_user");

    const before = await h.api("GET", "/provider-config");
    assert.equal(before.json.config.reasoningEffort, "low");
    const catalog = (await h.api("GET", "/provider-models")).json;
    const projected = projectProviderConfig(before.json.config, { reasoningEffort: "high" }, catalog);
    const refused = await h.api("PUT", "/provider-config", { ...projected, expectedVersion: before.json.version });
    assert.equal(refused.status, 409, JSON.stringify(refused.json));
    assert.equal(refused.json.error.code, "active_run");

    const events = (await h.api("GET", `/sessions/${session.id}/events`)).json.events;
    const openEvent = events.find((event) => event.type === "permission.open");
    assert.ok(openEvent, "the held run opened a permission question");
    await h.api("POST", `/runs/${started.json.run.id}/questions/${openEvent.data.id}`, { decision: "allow" });
    await h.pollRun(started.json.run.id);

    const after = await h.api("GET", "/provider-config");
    assert.equal(after.json.config.reasoningEffort, "low", "the refused write left the stored effort unchanged");
  } finally {
    await h.runtime.close();
  }
});
