// RL-1 (RD-009 2026-09-27): missing runtime_load IDs must recover with bounded,
// truthful hints drawn only from the Run's frozen binding. These are
// synthetic bindings and the existing loopback fake provider; no real
// provider, network or credential is used.
import assert from "node:assert/strict";
import { test } from "node:test";
import { boot } from "./helpers.mjs";
import { createRuntimeLoadTool } from "../runtime/control-tools.mjs";

const body = id => `RL1 body for ${id}`;
const entry = (id, kind = "reference", text = body(id)) => ({ id, kind, title: `RL1 title ${id}`, scope: { type: "user", id: "local" }, content: text });
const row = (id, kind = "reference", extra = {}) => ({ id, kind, title: `RL1 title ${id}`, scope: { type: "user", id: "local" }, source: { type: "local-config", hash: `hash:${id}` }, exposed: true, ...extra });
const binding = ({ content = [], resources = [], revision = 23 } = {}) => ({ revision, content: structuredClone(content), resources: structuredClone(resources) });
const extractQuoted = message => message.match(/"(?:[^"\\]|\\.)*"/g) ?? [];

async function captureError(tool, params) {
  try { await tool.execute("call", params); }
  catch (error) { return error.message; }
  assert.fail("expected runtime_load to throw");
}

async function control(h, session) {
  const suffix = "?sessionId=" + session.id;
  const get = async () => (await h.api("GET", "/runtime-control" + suffix)).json;
  const change = async body => h.api("PUT", "/runtime-control" + suffix, { revision: (await get()).revision, ...body });
  return { get, change, scope: { type: "session", id: session.id } };
}

test("RL-1 runtime_load advertises exact-ID loading, not a catalog", () => {
  const tool = createRuntimeLoadTool(binding(), async () => {});
  assert.equal(tool.name, "runtime_load");
  assert.match(tool.description, /exact ID/i);
  assert.match(tool.description, /not a catalog/i);
  assert.match(tool.description, /cannot discover/i);
  const id = tool.parameters.properties.id;
  assert.equal(id.type, "string");
  assert.equal(id.maxLength, 200);
  assert.equal(typeof id.description, "string");
  assert.match(id.description, /exact admitted skill or reference ID/i);
});

test("RL-1 a missing ID keeps the original sentence and names admitted IDs", async () => {
  const b = binding({ content: [entry("local:alpha"), entry("local:beta")], resources: [row("local:alpha"), row("local:beta")] });
  const tool = createRuntimeLoadTool(b, async () => { assert.fail("onLoad must not run for a missing ID"); });
  await assert.rejects(() => tool.execute("call-1", { id: "local:absent" }), error => {
    assert.ok(error instanceof Error);
    assert.ok(error.message.startsWith("Context resource is not exposed to this run"), error.message);
    assert.match(error.message, /Admitted IDs in this Run:/);
    assert.ok(error.message.includes(JSON.stringify("local:alpha")));
    assert.ok(error.message.includes(JSON.stringify("local:beta")));
    assert.ok(!error.message.includes("local:absent"));
    return true;
  });
});

test("RL-1 an empty or non-loadable catalog says so and cannot discover check recipes", async () => {
  const cases = [
    binding(),
    binding({ content: [entry("local:note", "instruction", "INSTRUCTION BODY")], resources: [row("local:note", "instruction")] }),
  ];
  for (const b of cases) {
    const tool = createRuntimeLoadTool(b, async () => { assert.fail("onLoad must not run for a missing ID"); });
    await assert.rejects(() => tool.execute("call-2", { id: "local:note" }), error => {
      assert.ok(error.message.startsWith("Context resource is not exposed to this run"));
      assert.match(error.message, /No admitted skill or reference is loadable in this Run/);
      assert.match(error.message, /cannot .*discover check recipes/);
      return true;
    });
  }
});

test("RL-1 hints never disclose hidden, wrong-kind or non-ID resource fields", async () => {
  const b = binding({
    content: [
      entry("local:shown", "reference", "SHOWN BODY"),
      entry("local:hidden", "reference", "HIDDEN BODY"),
      entry("local:instruction", "instruction", "INSTRUCTION BODY"),
      entry("local:mismatch", "skill", "MISMATCH BODY"),
    ],
    resources: [
      row("local:shown", "reference", { title: "TITLE-SENTINEL", source: { type: "local-config", hash: "h", uri: "URI-SENTINEL" } }),
      row("local:hidden", "reference", { exposed: false }),
      row("local:instruction", "instruction"),
      row("local:mismatch", "reference"),
      row("local:bodyless", "skill"),
    ],
  });
  const tool = createRuntimeLoadTool(b, async () => { assert.fail("onLoad must not run for a missing ID"); });
  const message = await captureError(tool, { id: "INPUT-SENTINEL" });
  assert.ok(message.includes(JSON.stringify("local:shown")));
  for (const absent of ["local:hidden", "local:instruction", "local:mismatch", "local:bodyless",
    "SHOWN BODY", "HIDDEN BODY", "INSTRUCTION BODY", "MISMATCH BODY", "URI-SENTINEL", "INPUT-SENTINEL"]) {
    assert.ok(!message.includes(absent), `must not disclose ${absent}`);
  }
});

test("RL-1 hints are sorted, deduplicated, capped at 8 and state omissions", async () => {
  const ids = ["local:zeta", "local:alpha", "local:kappa", "local:beta", "local:epsilon", "local:gamma", "local:delta", "local:eta", "local:theta", "local:iota"];
  const b = binding({ content: [...ids, "local:alpha"].map(id => entry(id)), resources: ids.map(id => row(id)) });
  const tool = createRuntimeLoadTool(b, async () => {});
  const first = await captureError(tool, { id: "local:none" });
  const second = await captureError(tool, { id: "local:none" });
  assert.equal(first, second, "the hint is deterministic");
  const unique = [...new Set(ids)].sort();
  const shown = extractQuoted(first);
  assert.deepEqual(shown.map(value => JSON.parse(value)), unique.slice(0, 8));
  assert.equal(shown.length, 8);
  assert.match(first, /2 more admitted IDs omitted/);
  assert.ok(first.length <= 1200);
});

test("RL-1 long or odd IDs stay whole and the complete hint stays bounded", async () => {
  // Eight ids near the parameter limit: the message cannot fit all of them.
  const longIds = Array.from({ length: 8 }, (_, i) => "local:" + String(i).padStart(2, "0") + ":" + "x".repeat(190));
  const longTool = createRuntimeLoadTool(binding({ content: longIds.map(id => entry(id)), resources: longIds.map(id => row(id)) }), async () => {});
  const longMessage = await captureError(longTool, { id: "local:none" });
  assert.ok(longMessage.length <= 1200, "the complete error stays within its limit");
  const shown = extractQuoted(longMessage);
  assert.ok(shown.length >= 1 && shown.length <= 8);
  for (const quoted of shown) assert.ok(longIds.includes(JSON.parse(quoted)), "no truncated ID is shown");
  assert.match(longMessage, /omitted/);

  // One id too long to quote at all: it is omitted whole, never cut.
  const huge = "local:" + "z".repeat(2500);
  const hugeTool = createRuntimeLoadTool(binding({ content: [entry(huge)], resources: [row(huge)] }), async () => {});
  const hugeMessage = await captureError(hugeTool, { id: "local:none" });
  assert.ok(hugeMessage.length <= 1200);
  assert.equal(extractQuoted(hugeMessage).length, 0);
  assert.match(hugeMessage, /omitted/);
  assert.ok(!hugeMessage.includes("z".repeat(50)));

  // Odd characters round-trip as one JSON-quoted ID.
  const odd = "local:\"quoted\\id\nnewline";
  const oddTool = createRuntimeLoadTool(binding({ content: [entry(odd)], resources: [row(odd)] }), async () => {});
  const oddMessage = await captureError(oddTool, { id: "local:none" });
  assert.ok(oddMessage.includes(JSON.stringify(odd)));
  assert.deepEqual(extractQuoted(oddMessage).map(value => JSON.parse(value)), [odd]);
});

test("RL-1 a failed lookup neither mutates the binding nor calls onLoad", async () => {
  const b = binding({ content: [entry("local:real")], resources: [row("local:real")] });
  const snapshot = structuredClone(b);
  let loads = 0;
  const tool = createRuntimeLoadTool(b, async () => { loads += 1; });
  await assert.rejects(() => tool.execute("call-4", { id: "local:missing" }));
  assert.equal(loads, 0);
  assert.deepEqual(b, snapshot);
});

test("RL-1 successful loading returns the exact body and receipt unchanged", async () => {
  const b = binding({ content: [entry("local:real", "reference", "EXACT BODY")], resources: [row("local:real", "reference")], revision: 41 });
  const loads = [];
  const tool = createRuntimeLoadTool(b, async value => { loads.push(value); });
  const result = await tool.execute("call-5", { id: "local:real" });
  assert.deepEqual(result.content, [{ type: "text", text: "EXACT BODY" }]);
  assert.deepEqual(result.details, { resourceId: "local:real", revision: 41 });
  assert.deepEqual(loads, [{ id: "local:real", kind: "reference", source: b.resources[0].source, characters: "EXACT BODY".length }]);
});

test("RL-1 the literal id 'catalog' is not special and stays loadable when admitted", async () => {
  const b = binding({ content: [entry("catalog", "skill", "CATALOG BODY")], resources: [row("catalog", "skill")] });
  const loads = [];
  const tool = createRuntimeLoadTool(b, async value => { loads.push(value); });
  const result = await tool.execute("call-6", { id: "catalog" });
  assert.equal(result.content[0].text, "CATALOG BODY");
  assert.equal(loads.length, 1);
});

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
