// RL-1 (RD-009 2026-09-27): the Host-level half of the runtime_load recovery
// tests. It boots the real Host, which listens on loopback, so it runs in the
// developer/CI suite and not in the sandboxed check recipe. The offline half is
// runtime-load-recovery.test.mjs.
import assert from "node:assert/strict";
import { test } from "node:test";
import { boot } from "./helpers.mjs";

async function control(h, session) {
  const suffix = "?sessionId=" + session.id;
  const get = async () => (await h.api("GET", "/runtime-control" + suffix)).json;
  const change = async body => h.api("PUT", "/runtime-control" + suffix, { revision: (await get()).revision, ...body });
  return { get, change, scope: { type: "session", id: session.id } };
}

test("RL-1 integration: invalid ID errors, then an admitted ID loads with exactly one context.loaded event", async () => {
  const h = await boot();
  try {
    const session = await h.createSession();
    const c = await control(h, session);
    const content = "RL1 INTEGRATION BODY";
    const put = await c.change({ operation: "put", resource: { id: "local:recovery-integration", kind: "reference", title: "Recovery integration reference", scope: c.scope, content } });
    assert.equal(put.status, 200, JSON.stringify(put.json));
    const created = await h.api("POST", `/sessions/${session.id}/runs`, { commandId: "rl1-recovery", input: h.scriptInput([
      { name: "runtime_load", arguments: { id: "local:not-admitted" } },
      { name: "runtime_load", arguments: { id: "local:recovery-integration" } },
    ]) });
    const done = await h.pollRun(created.json.run.id);
    assert.equal(done.status, "completed", JSON.stringify(done.error ?? null));
    const events = (await h.api("GET", `/sessions/${session.id}/events`)).json.events.filter(event => event.runId === created.json.run.id);
    const results = events.filter(event => event.type === "tool.result" && event.data.name === "runtime_load");
    assert.equal(results.length, 2);
    assert.equal(results[0].data.isError, true);
    assert.ok(results[0].data.text.startsWith("Context resource is not exposed to this run"));
    assert.ok(results[0].data.text.includes(JSON.stringify("local:recovery-integration")));
    assert.ok(!results[0].data.text.includes(content));
    assert.equal(results[1].data.isError, false);
    assert.equal(results[1].data.text, content);
    const loaded = events.filter(event => event.type === "runtime.context.loaded");
    assert.equal(loaded.length, 1);
    assert.equal(loaded[0].data.id, "local:recovery-integration");
    assert.equal(loaded[0].data.characters, content.length);
  } finally {
    await h.runtime.close();
  }
});
